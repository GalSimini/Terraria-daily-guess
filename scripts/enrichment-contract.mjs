import { z } from "zod";

const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const ClueSourceSchema = z.enum([
  "kind",
  "category",
  "rarity",
  "sources",
  "biome",
  "tooltip",
  "mechanic",
  "progression",
  "relationship",
  "behavior",
]);

const ReferenceSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  license: z.string().min(1),
  accessedAt: IsoDateSchema,
});

const EnrichmentClueSchema = z.object({
  source: ClueSourceSchema,
  text: z.string().min(1).max(280),
  reference: ReferenceSchema,
});

const EnrichmentEntrySchema = z.object({
  entityId: z.string().regex(/^(item|npc):\d+$/),
  review: z.object({
    approvedBy: z.string().min(1),
    approvedAt: IsoDateSchema,
  }),
  clues: z.array(EnrichmentClueSchema).min(1).max(5),
});

export const EnrichmentDocumentSchema = z.object({
  formatVersion: z.literal(1),
  gameVersion: z.string().min(1),
  entries: z.array(EnrichmentEntrySchema),
});

export function createEnrichmentIndex(input) {
  const document = EnrichmentDocumentSchema.parse(input);
  const index = new Map();

  for (const entry of document.entries) {
    const existing = index.get(entry.entityId) ?? [];
    const existingTexts = new Set(existing.map((clue) => clue.text));

    for (const clue of entry.clues) {
      if (existingTexts.has(clue.text)) {
        throw new Error(`Duplicate enrichment clue for ${entry.entityId}.`);
      }
      existing.push(clue);
      existingTexts.add(clue.text);
    }

    index.set(entry.entityId, existing);
  }

  return { document, index };
}
