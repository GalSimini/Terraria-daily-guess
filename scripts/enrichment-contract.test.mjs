import { describe, expect, it } from "vitest";

import { createEnrichmentIndex } from "./enrichment-contract.mjs";

const approvedReference = {
  title: "Verified source page",
  url: "https://example.com/fact",
  license: "Reviewed for the intended use",
  accessedAt: "2026-08-20",
};

describe("curated clue enrichment contract", () => {
  it("indexes approved clues by stable entity ID", () => {
    const result = createEnrichmentIndex({
      formatVersion: 1,
      gameVersion: "1.4.4.9",
      entries: [
        {
          entityId: "npc:123",
          review: { approvedBy: "maintainer", approvedAt: "2026-08-20" },
          clues: [
            {
              source: "mechanic",
              text: "It is tied to a named game event.",
              reference: approvedReference,
            },
          ],
        },
      ],
    });

    expect(result.index.get("npc:123")).toHaveLength(1);
    expect(result.document.gameVersion).toBe("1.4.4.9");
  });

  it("rejects a clue without source provenance", () => {
    expect(() =>
      createEnrichmentIndex({
        formatVersion: 1,
        gameVersion: "1.4.4.9",
        entries: [
          {
            entityId: "npc:123",
            review: { approvedBy: "maintainer", approvedAt: "2026-08-20" },
            clues: [{ source: "mechanic", text: "An unsupported clue." }],
          },
        ],
      }),
    ).toThrow();
  });

  it("rejects duplicate clue text for one entity", () => {
    expect(() =>
      createEnrichmentIndex({
        formatVersion: 1,
        gameVersion: "1.4.4.9",
        entries: [
          {
            entityId: "npc:123",
            review: { approvedBy: "maintainer", approvedAt: "2026-08-20" },
            clues: [
              { source: "mechanic", text: "Duplicate clue.", reference: approvedReference },
              { source: "behavior", text: "Duplicate clue.", reference: approvedReference },
            ],
          },
        ],
      }),
    ).toThrow("Duplicate enrichment clue for npc:123.");
  });
});
