import { describe, expect, it } from "vitest";

import { getUtcDateKey, resolveDailyPuzzleSeed, selectDailyPuzzle } from "./daily-puzzle";

const entities = [
  { id: "item:3", eligibleForDaily: true },
  { id: "item:1", eligibleForDaily: true },
  { id: "npc:1", eligibleForDaily: false },
] as const;

describe("getUtcDateKey", () => {
  it("uses the UTC calendar day at a date boundary", () => {
    expect(getUtcDateKey(new Date("2026-08-19T23:30:00-03:00"))).toBe(
      "2026-08-20",
    );
  });

  it("rejects invalid dates", () => {
    expect(() => getUtcDateKey(new Date("invalid"))).toThrow("valid date");
  });
});

describe("selectDailyPuzzle", () => {
  it("is deterministic and independent of catalog input order", () => {
    const input = {
      catalogVersion: 1,
      dateKey: "2026-08-19",
      seed: "test-only-seed",
    };

    expect(selectDailyPuzzle({ ...input, entities })).toEqual(
      selectDailyPuzzle({ ...input, entities: [...entities].reverse() }),
    );
  });

  it("excludes ineligible entities", () => {
    const selection = selectDailyPuzzle({
      catalogVersion: 1,
      dateKey: "2026-08-19",
      entities,
      seed: "test-only-seed",
    });

    expect(selection.entityId).not.toBe("npc:1");
  });

  it("rejects invalid daily-selection inputs", () => {
    expect(() =>
      selectDailyPuzzle({
        catalogVersion: 0,
        dateKey: "19-08-2026",
        entities: [],
        seed: "",
      }),
    ).toThrow("dateKey");
  });
});

describe("daily puzzle seed configuration", () => {
  it("requires a non-development seed in production", () => {
    expect(() => resolveDailyPuzzleSeed("production", undefined)).toThrow("DAILY_PUZZLE_SEED");
    expect(() => resolveDailyPuzzleSeed("production", "development-only-daily-seed")).toThrow("DAILY_PUZZLE_SEED");
    expect(resolveDailyPuzzleSeed("production", "production-only-seed")).toBe("production-only-seed");
  });
});
