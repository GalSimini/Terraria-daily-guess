import catalogData from "../../data/generated/catalog.json";
import { describe, expect, it } from "vitest";

import { resolveDailyClues, type DailyClueEntity } from "./clue-sequence";

const expectedSequences: Readonly<Record<string, readonly string[]>> = {
  "item:4263": ["mechanic", "biome", "relationship", "sources", "progression"],
  "npc:456": ["progression", "behavior", "mechanic", "biome", "sources"],
  "npc:59": ["mechanic", "progression", "behavior", "sources", "biome"],
  "npc:429": ["progression", "biome", "relationship", "mechanic", "behavior"],
  "item:169": ["progression", "sources", "mechanic", "behavior", "tooltip"],
  "item:757": ["progression", "mechanic", "behavior", "sources", "relationship"],
  "item:785": ["sources", "progression", "mechanic", "behavior", "relationship"],
};

const curatedSourceClues: Readonly<Record<string, string>> = {
  "item:4263": "Oasis and Mirage Crates offer alternative routes to obtain this tool through fishing.",
  "item:757": "Its recipe joins upgraded blades associated with light and darkness plus a broken heroic component.",
  "item:785": "Crafting this accessory combines Souls of Flight with a rare feather drop.",
};

describe("initial curated clue pack", () => {
  it("keeps one reviewed five-round sequence for every supported class", () => {
    const entities = catalogData.entities as readonly DailyClueEntity[];

    for (const [id, expectedSources] of Object.entries(expectedSequences)) {
      const entity = entities.find((candidate) => candidate.id === id);
      expect(entity, `${id} should exist in the generated catalog`).toBeDefined();

      expect(entity!.eligibleForDaily).toBe(true);

      const clues = resolveDailyClues(entity!, { curatedOnly: true });
      expect(clues).toHaveLength(5);
      expect(clues.map((clue) => clue.source)).toEqual(expectedSources);

      if (id in curatedSourceClues) {
        expect(clues.map((clue) => clue.text)).toContain(curatedSourceClues[id]);
      }
    }
  });
});
