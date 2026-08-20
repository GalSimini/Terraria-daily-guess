export const DAILY_CLUE_COUNT = 5;

export type DailyClue = Readonly<{
  source: string;
  text: string;
  origin?: "base" | "curated";
}>;

export type DailyClueEntity = Readonly<{
  id: string;
  kind: string;
  category: string;
  eligibleForDaily?: boolean;
  clueCandidates: readonly DailyClue[];
}>;

type ClueProfile =
  | "accessory"
  | "block"
  | "boss"
  | "enemy"
  | "npc"
  | "tool"
  | "weapon"
  | "default";

const sourcePriority: Record<ClueProfile, readonly string[]> = {
  accessory: ["sources", "progression", "mechanic", "behavior", "relationship", "tooltip", "rarity", "biome"],
  block: ["progression", "sources", "mechanic", "behavior", "biome", "tooltip", "rarity"],
  boss: ["progression", "behavior", "mechanic", "biome", "sources", "relationship", "tooltip", "rarity"],
  enemy: ["mechanic", "progression", "behavior", "sources", "biome", "relationship", "tooltip", "rarity"],
  npc: ["progression", "biome", "relationship", "mechanic", "behavior", "sources", "tooltip", "rarity"],
  tool: ["mechanic", "biome", "relationship", "sources", "progression", "tooltip", "rarity", "behavior"],
  weapon: ["progression", "mechanic", "behavior", "sources", "relationship", "tooltip", "rarity", "biome"],
  default: ["mechanic", "progression", "behavior", "relationship", "sources", "biome", "tooltip", "rarity"],
};

function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getProfile(entity: DailyClueEntity): ClueProfile {
  const category = normalize(entity.category);

  if (category.includes("accessor")) return "accessory";
  if (category.includes("weapon")) return "weapon";
  if (category.includes("tool")) return "tool";
  if (entity.kind === "block" || entity.kind === "wall") return "block";
  if (entity.kind === "boss") return "boss";
  if (entity.kind === "enemy") return "enemy";
  if (entity.kind === "npc") return "npc";
  return "default";
}

function rankClue(source: string, profile: ClueProfile) {
  const rank = sourcePriority[profile].indexOf(source);
  if (rank !== -1) return rank;
  if (source === "category") return 100;
  if (source === "kind") return 101;
  return 99;
}

function rankOrigin(clue: DailyClue) {
  return clue.origin === "curated" ? 0 : 1;
}

/**
 * Produces the server-side five-round order. Enrichment facts are prioritized
 * by entity class; legacy category/kind candidates remain as a temporary
 * fallback while the base catalog is being enriched.
 */
export function resolveDailyClues(
  entity: DailyClueEntity,
  options: Readonly<{ curatedOnly?: boolean }> = {},
): readonly DailyClue[] {
  const profile = getProfile(entity);
  const seen = new Set<string>();
  const candidates = options.curatedOnly
    ? entity.clueCandidates.filter((clue) => clue.origin === "curated")
    : entity.clueCandidates;
  const distinct = candidates.filter((clue) => {
    const normalized = normalize(clue.text);
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });

  if (distinct.length < DAILY_CLUE_COUNT) {
    const scope = options.curatedOnly ? "curated " : "";
    throw new Error(`${entity.id} does not have ${DAILY_CLUE_COUNT} distinct ${scope}clues.`);
  }

  const ordered = distinct
    .map((clue, index) => ({ clue, index }))
    .sort((left, right) => {
      const rankDifference = rankClue(left.clue.source, profile) - rankClue(right.clue.source, profile);
      const originDifference = rankOrigin(left.clue) - rankOrigin(right.clue);
      return rankDifference || originDifference || left.index - right.index;
    });
  const usedSources = new Set<string>();
  const sequence: DailyClue[] = [];

  for (const { clue } of ordered) {
    if (usedSources.has(clue.source)) continue;
    sequence.push(clue);
    usedSources.add(clue.source);
    if (sequence.length === DAILY_CLUE_COUNT) return sequence;
  }

  for (const { clue } of ordered) {
    if (sequence.includes(clue)) continue;
    sequence.push(clue);
    if (sequence.length === DAILY_CLUE_COUNT) return sequence;
  }

  throw new Error(`${entity.id} could not produce ${DAILY_CLUE_COUNT} ordered clues.`);
}
