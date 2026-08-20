import catalogData from "../../data/generated/catalog.json";
import { z } from "zod";

import { resolveDailyClues } from "@/lib/clue-sequence";
import { selectDailyPuzzle } from "@/lib/daily-puzzle";

const EntitySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  aliases: z.array(z.string()),
  kind: z.string(),
  category: z.string(),
  clueCandidates: z.array(z.object({ source: z.string(), text: z.string().min(1) })),
  eligibleForDaily: z.boolean(),
});
const CatalogSchema = z.object({
  catalogVersion: z.number().int().positive(),
  sourceRevision: z.string(),
  entities: z.array(EntitySchema),
});
const catalog = CatalogSchema.parse(catalogData);

export type CatalogEntity = z.infer<typeof EntitySchema>;
export const searchEntities = catalog.entities.map(({ id, name, aliases, kind, category }) => ({
  id,
  name,
  aliases,
  kind,
  category,
}));

export function getDailyTarget(dateKey: string) {
  const selection = selectDailyPuzzle({
    catalogVersion: catalog.catalogVersion,
    dateKey,
    entities: catalog.entities,
    seed: process.env.DAILY_PUZZLE_SEED ?? "development-only-daily-seed",
  });
  const target = catalog.entities.find((entity) => entity.id === selection.entityId);
  if (!target) throw new Error("The selected daily target is missing from the catalog.");
  return target;
}

export function getDailyClues(dateKey: string) {
  return resolveDailyClues(getDailyTarget(dateKey));
}

export function getCatalogEntity(id: string) {
  return catalog.entities.find((entity) => entity.id === id);
}
