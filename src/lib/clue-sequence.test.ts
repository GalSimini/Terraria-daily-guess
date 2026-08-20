import { describe, expect, it } from "vitest";

import { resolveDailyClues, type DailyClueEntity } from "./clue-sequence";

function entity(overrides: Partial<DailyClueEntity> = {}): DailyClueEntity {
  return {
    id: "npc:1",
    kind: "npc",
    category: "npc",
    clueCandidates: [],
    ...overrides,
  };
}

describe("resolveDailyClues", () => {
  it("uses the boss playbook instead of input order", () => {
    const clues = resolveDailyClues(
      entity({
        id: "npc:50",
        kind: "boss",
        category: "boss",
        clueCandidates: [
          { source: "sources", text: "Encounter clue." },
          { source: "biome", text: "Biome clue." },
          { source: "mechanic", text: "Attack clue." },
          { source: "behavior", text: "Phase clue." },
          { source: "progression", text: "World clue." },
        ],
      }),
    );

    expect(clues.map((clue) => clue.text)).toEqual([
      "World clue.",
      "Phase clue.",
      "Attack clue.",
      "Biome clue.",
      "Encounter clue.",
    ]);
  });

  it("uses legacy context candidates only after richer item facts", () => {
    const clues = resolveDailyClues(
      entity({
        id: "item:1",
        kind: "item",
        category: "weapons",
        clueCandidates: [
          { source: "kind", text: "This is an item." },
          { source: "category", text: "It belongs to weapons." },
          { source: "tooltip", text: "Tooltip clue." },
          { source: "sources", text: "Source clue." },
          { source: "rarity", text: "Rarity clue." },
        ],
      }),
    );

    expect(clues.map((clue) => clue.source)).toEqual([
      "sources",
      "tooltip",
      "rarity",
      "category",
      "kind",
    ]);
  });

  it("rejects an entity without five distinct clues", () => {
    expect(() =>
      resolveDailyClues(
        entity({
          clueCandidates: [
            { source: "mechanic", text: "One clue." },
            { source: "behavior", text: "One clue." },
            { source: "sources", text: "Two clues." },
          ],
        }),
      ),
    ).toThrow("npc:1 does not have 5 distinct clues.");
  });
});
