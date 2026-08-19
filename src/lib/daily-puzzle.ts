export type DailyPuzzleEntity = Readonly<{
  id: string;
  eligibleForDaily: boolean;
}>;

export type DailyPuzzleSelection = Readonly<{
  dateKey: string;
  entityId: string;
}>;

const UTC_DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export function getUtcDateKey(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    throw new Error("A valid date is required to create a daily puzzle key.");
  }

  return date.toISOString().slice(0, 10);
}

function hashToUint32(value: string): number {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash;
}

export function selectDailyPuzzle({
  catalogVersion,
  dateKey,
  entities,
  seed,
}: Readonly<{
  catalogVersion: number;
  dateKey: string;
  entities: readonly DailyPuzzleEntity[];
  seed: string;
}>): DailyPuzzleSelection {
  if (!UTC_DATE_KEY.test(dateKey)) {
    throw new Error("dateKey must use the UTC YYYY-MM-DD format.");
  }

  if (!Number.isInteger(catalogVersion) || catalogVersion < 1) {
    throw new Error("catalogVersion must be a positive integer.");
  }

  if (!seed.trim()) {
    throw new Error("A non-empty server-side seed is required.");
  }

  const eligibleIds = entities
    .filter((entity) => entity.eligibleForDaily)
    .map((entity) => entity.id)
    .sort((left, right) => left.localeCompare(right, "en"));

  if (eligibleIds.length === 0) {
    throw new Error("The catalog has no eligible daily puzzle entities.");
  }

  if (new Set(eligibleIds).size !== eligibleIds.length) {
    throw new Error("Eligible daily puzzle entity IDs must be unique.");
  }

  const selectionInput = `${catalogVersion}:${dateKey}:${seed}`;
  const entityId = eligibleIds[hashToUint32(selectionInput) % eligibleIds.length];

  return { dateKey, entityId };
}
