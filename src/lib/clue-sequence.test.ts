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

  it("uses distinct clue families before repeating one", () => {
    const clues = resolveDailyClues(
      entity({
        kind: "item",
        category: "tool",
        clueCandidates: [
          { source: "mechanic", text: "Mechanic clue." },
          { source: "biome", text: "Biome clue." },
          { source: "relationship", text: "Relationship clue." },
          { source: "sources", text: "Generic source clue." },
          { source: "sources", text: "Specific source clue." },
          { source: "progression", text: "Progression clue." },
        ],
      }),
    );

    expect(clues.map((clue) => clue.text)).toEqual([
      "Mechanic clue.",
      "Biome clue.",
      "Relationship clue.",
      "Generic source clue.",
      "Progression clue.",
    ]);
  });

  it("prefers a curated fact over a generic base fact from the same family", () => {
    const clues = resolveDailyClues(
      entity({
        kind: "item",
        category: "tool",
        clueCandidates: [
          { source: "mechanic", text: "Mechanic clue." },
          { source: "biome", text: "Biome clue." },
          { source: "relationship", text: "Relationship clue." },
          { source: "sources", text: "Generic source clue.", origin: "base" },
          { source: "sources", text: "Curated source clue.", origin: "curated" },
          { source: "progression", text: "Progression clue." },
        ],
      }),
    );

    expect(clues.map((clue) => clue.text)).toContain("Curated source clue.");
    expect(clues.map((clue) => clue.text)).not.toContain("Generic source clue.");
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

  it("requires five curated clues when resolving a daily answer", () => {
    expect(() =>
      resolveDailyClues(
        entity({
          clueCandidates: [
            { source: "mechanic", text: "Curated clue.", origin: "curated" },
            { source: "biome", text: "Base clue." },
            { source: "relationship", text: "Base clue." },
            { source: "sources", text: "Base source clue." },
            { source: "progression", text: "Base progression clue." },
          ],
        }),
        { curatedOnly: true },
      ),
    ).toThrow("npc:1 does not have 5 distinct curated clues.");
  });
});
