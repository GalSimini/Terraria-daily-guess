import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const manifestPath = path.join(projectRoot, "data", "source-manifest.json");
const generatedDirectory = path.join(projectRoot, "data", "generated");

const ManifestSchema = z.object({
  source: z.object({
    name: z.string().min(1),
    repository: z.string().url(),
    revision: z.string().regex(/^[a-f0-9]{40}$/),
    license: z.string().min(1),
    localPath: z.string().min(1),
    management: z.string().min(1),
  }),
});

const RecordSchema = z.record(z.string(), z.unknown());
const RecordArraySchema = z.array(RecordSchema);

const reasonCounts = new Map();

function countReason(reason) {
  reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
}

function normalizeForComparison(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getString(record, key) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function uniqueStrings(values) {
  return [...new Set(values.filter(Boolean))].sort((left, right) =>
    left.localeCompare(right, "en"),
  );
}

function hasMeaningfulValue(value) {
  if (typeof value === "string") {
    return Boolean(value.trim());
  }

  if (Array.isArray(value)) {
    return value.some(hasMeaningfulValue);
  }

  if (value && typeof value === "object") {
    return Object.values(value).some(hasMeaningfulValue);
  }

  return false;
}

function sourceFamilies(record) {
  const parsed = RecordSchema.safeParse(record.Sources);
  if (!parsed.success) {
    return [];
  }

  return uniqueStrings(
    Object.entries(parsed.data)
      .filter(([family, value]) => family !== "Other" && hasMeaningfulValue(value))
      .map(([family]) => family),
  );
}

function categoryFromFilename(filename) {
  return filename
    .replace(/^items_/, "")
    .replace(/\.json$/, "")
    .replaceAll("_", " ");
}

function itemKind(type) {
  const normalized = normalizeForComparison(type ?? "");
  if (normalized === "block") return "block";
  if (normalized === "wall") return "wall";
  if (normalized === "critter") return "critter";
  return "item";
}

function npcKind(type, isTownNpc) {
  if (isTownNpc) return "npc";

  const normalized = normalizeForComparison(type ?? "");
  if (normalized.includes("boss")) return "boss";
  if (normalized === "enemy") return "enemy";
  if (normalized === "critter") return "critter";
  if (normalized.includes("npc")) return "npc";
  return "other";
}

function clueCandidates(entity) {
  const candidates = [
    ["kind", `This entity is categorized as ${entity.kind}.`],
    ["category", `It belongs to the ${entity.category} group.`],
    entity.rarity ? ["rarity", `Its rarity is ${entity.rarity}.`] : undefined,
    entity.sources.length
      ? ["sources", `It can be encountered through ${entity.sources.join(" or ")}.`]
      : undefined,
    entity.biomes.length
      ? ["biome", `It is associated with ${entity.biomes.join(" or ")}.`]
      : undefined,
    entity.tooltip ? ["tooltip", entity.tooltip] : undefined,
  ].filter(Boolean);

  const answerTerms = uniqueStrings([entity.name, ...entity.aliases]).map(
    normalizeForComparison,
  );
  const seen = new Set();

  return candidates
    .map(([source, text]) => ({ source, text }))
    .filter(({ text }) => {
      const normalized = normalizeForComparison(text);
      if (!normalized || answerTerms.some((term) => term && normalized.includes(term))) {
        return false;
      }
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
}

function mergeEntity(existing, candidate) {
  const merged = {
    ...existing,
    name: existing.name || candidate.name,
    aliases: uniqueStrings([...existing.aliases, ...candidate.aliases]),
    kind: existing.kind === "other" ? candidate.kind : existing.kind,
    category: existing.category || candidate.category,
    rarity: existing.rarity || candidate.rarity,
    tooltip: existing.tooltip || candidate.tooltip,
    biomes: uniqueStrings([...existing.biomes, ...candidate.biomes]),
    sources: uniqueStrings([...existing.sources, ...candidate.sources]),
    tags: uniqueStrings([...existing.tags, ...candidate.tags]),
    sourceFiles: uniqueStrings([...existing.sourceFiles, ...candidate.sourceFiles]),
  };

  return merged;
}

async function readJson(filePath, schema) {
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);
  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `Schema validation failed for ${path.relative(projectRoot, filePath)}: ${result.error.message}`,
    );
  }
  return result.data;
}

function addEntity(entities, entity) {
  const existing = entities.get(entity.id);
  entities.set(entity.id, existing ? mergeEntity(existing, entity) : entity);
}

async function main() {
  const manifest = await readJson(manifestPath, ManifestSchema);
  const sourceDirectory = path.resolve(projectRoot, manifest.source.localPath);
  const jsonDirectory = path.join(sourceDirectory, "json");
  const itemReferenceRecords = await readJson(
    path.join(jsonDirectory, "id_references", "items.json"),
    RecordArraySchema,
  );
  const npcReferenceRecords = await readJson(
    path.join(jsonDirectory, "id_references", "npc.json"),
    RecordArraySchema,
  );
  const rarityRecords = await readJson(
    path.join(jsonDirectory, "id_references", "rarity.json"),
    RecordArraySchema,
  );
  const townNpcRecords = await readJson(
    path.join(jsonDirectory, "npc_data", "npc_town.json"),
    RecordArraySchema,
  );
  const npcRecords = await readJson(
    path.join(jsonDirectory, "npc_data", "npc.json"),
    RecordArraySchema,
  );

  const itemReferences = new Map();
  for (const record of itemReferenceRecords) {
    const id = getString(record, "ID");
    const name = getString(record, "Name");
    if (!id || !name) {
      countReason("invalid item reference");
      continue;
    }
    itemReferences.set(id, { name, type: getString(record, "Type") });
  }

  const npcReferences = new Map();
  for (const record of npcReferenceRecords) {
    const id = getString(record, "NPC ID");
    const name = getString(record, "Name");
    if (!id || !name) {
      countReason("invalid NPC reference");
      continue;
    }
    npcReferences.set(id, { name, type: getString(record, "Type") });
  }

  const rarityById = new Map();
  for (const record of rarityRecords) {
    const id = getString(record, "Rarity ID");
    const tier = getString(record, "Rarity Tier");
    if (id && tier) rarityById.set(id, tier);
  }

  const townNpcDetails = new Map();
  for (const record of townNpcRecords) {
    const id = getString(record, "NPC ID");
    if (!id) {
      countReason("invalid town NPC record");
      continue;
    }
    townNpcDetails.set(id, record);
  }

  const entities = new Map();
  const filesProcessed = [
    "id_references/items.json",
    "id_references/npc.json",
    "id_references/rarity.json",
    "npc_data/npc_town.json",
    "npc_data/npc.json",
  ];

  for (const [sourceId, reference] of itemReferences) {
    addEntity(entities, {
      id: `item:${sourceId}`,
      sourceId,
      name: reference.name,
      aliases: [],
      kind: itemKind(reference.type),
      category: reference.type ? normalizeForComparison(reference.type) : "item",
      rarity: undefined,
      tooltip: undefined,
      biomes: [],
      sources: [],
      tags: uniqueStrings([reference.type ?? "item"]),
      sourceFiles: ["id_references/items.json"],
    });
  }

  for (const [sourceId, reference] of npcReferences) {
    const townDetail = townNpcDetails.get(sourceId);
    addEntity(entities, {
      id: `npc:${sourceId}`,
      sourceId,
      name: reference.name,
      aliases: [],
      kind: npcKind(reference.type, Boolean(townDetail)),
      category: townDetail ? "town npc" : normalizeForComparison(reference.type ?? "npc"),
      rarity: undefined,
      tooltip: townDetail ? getString(townDetail, "Description") : undefined,
      biomes: [],
      sources: [],
      tags: uniqueStrings([reference.type ?? "npc", townDetail ? "town npc" : ""]),
      sourceFiles: townDetail
        ? ["id_references/npc.json", "npc_data/npc_town.json"]
        : ["id_references/npc.json"],
    });
  }

  for (const record of npcRecords) {
    const sourceId = getString(record, "NPC ID");
    const reference = sourceId ? npcReferences.get(sourceId) : undefined;
    const name = getString(record, "Name") ?? reference?.name;
    if (!sourceId || !name) {
      countReason("NPC record missing stable identity");
      continue;
    }
    addEntity(entities, {
      id: `npc:${sourceId}`,
      sourceId,
      name,
      aliases: [],
      kind: npcKind(getString(record, "Type") ?? reference?.type, Boolean(townNpcDetails.get(sourceId))),
      category: normalizeForComparison(getString(record, "Type") ?? reference?.type ?? "npc"),
      rarity: undefined,
      tooltip: townNpcDetails.get(sourceId)
        ? getString(townNpcDetails.get(sourceId), "Description")
        : undefined,
      biomes: [],
      sources: [],
      tags: uniqueStrings([getString(record, "Type") ?? reference?.type ?? "npc"]),
      sourceFiles: ["npc_data/npc.json"],
    });
  }

  const itemDataDirectory = path.join(jsonDirectory, "items_data");
  const itemFiles = (await import("node:fs/promises")).readdir(itemDataDirectory, {
    withFileTypes: true,
  });
  const itemDataFiles = (await itemFiles)
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, "en"));

  for (const filename of itemDataFiles) {
    const relativeFile = `items_data/${filename}`;
    const records = await readJson(path.join(itemDataDirectory, filename), RecordArraySchema);
    filesProcessed.push(relativeFile);
    const category = categoryFromFilename(filename);

    for (const record of records) {
      const sourceId = getString(record, "Item ID");
      if (!sourceId) {
        countReason(`${relativeFile}: missing Item ID`);
        continue;
      }

      const reference = itemReferences.get(sourceId);
      const name = getString(record, "Name") ?? reference?.name;
      if (!name) {
        countReason(`${relativeFile}: unresolved item name`);
        continue;
      }

      const rawRarity = getString(record, "Rarity");
      addEntity(entities, {
        id: `item:${sourceId}`,
        sourceId,
        name,
        aliases: [],
        kind: itemKind(reference?.type),
        category,
        rarity: rawRarity ? rarityById.get(rawRarity) ?? rawRarity : undefined,
        tooltip: getString(record, "Tooltip"),
        biomes: uniqueStrings([getString(record, "Biome") ?? ""]),
        sources: sourceFamilies(record),
        tags: uniqueStrings([category, reference?.type ?? "item"]),
        sourceFiles: [relativeFile],
      });
    }
  }

  const catalog = [...entities.values()]
    .map((entity) => {
      const clues = clueCandidates(entity);
      return {
        id: entity.id,
        sourceId: entity.sourceId,
        name: entity.name,
        aliases: entity.aliases,
        kind: entity.kind,
        category: entity.category,
        rarity: entity.rarity,
        tooltip: entity.tooltip,
        biomes: entity.biomes,
        sources: entity.sources,
        tags: entity.tags,
        clueCandidates: clues,
        eligibleForDaily: clues.length >= 5,
      };
    })
    .sort((left, right) => left.id.localeCompare(right.id, "en"));

  const catalogContent = `${JSON.stringify(
    {
      catalogVersion: 1,
      sourceRevision: manifest.source.revision,
      entities: catalog,
    },
    null,
    2,
  )}\n`;
  const checksum = createHash("sha256").update(catalogContent).digest("hex");
  const eligibleByKind = Object.fromEntries(
    [...new Set(catalog.map((entity) => entity.kind))]
      .sort((left, right) => left.localeCompare(right, "en"))
      .map((kind) => [
        kind,
        catalog.filter((entity) => entity.kind === kind && entity.eligibleForDaily).length,
      ]),
  );
  const report = {
    catalogVersion: 1,
    sourceRevision: manifest.source.revision,
    generatedAt: new Date().toISOString(),
    filesProcessed: filesProcessed.sort((left, right) => left.localeCompare(right, "en")),
    entities: {
      total: catalog.length,
      eligibleForDaily: catalog.filter((entity) => entity.eligibleForDaily).length,
      eligibleByKind,
    },
    rejections: Object.fromEntries(
      [...reasonCounts.entries()].sort(([left], [right]) => left.localeCompare(right, "en")),
    ),
    catalogSha256: checksum,
  };

  await mkdir(generatedDirectory, { recursive: true });
  await writeFile(path.join(generatedDirectory, "catalog.json"), catalogContent, "utf8");
  await writeFile(
    path.join(generatedDirectory, "import-report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );

  console.log(
    `Imported ${catalog.length} entities; ${report.entities.eligibleForDaily} can produce five safe clues.`,
  );
  console.log(`Catalog SHA-256: ${checksum}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
