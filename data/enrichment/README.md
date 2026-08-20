# Curated Clue Enrichment

This directory contains the reviewed facts that supplement the pinned base
dataset. It is intentionally small and curated: do not place scraped wiki
exports, game assets, or unreviewed third-party data here.

`curated-clues.json` is the only accepted enrichment input for the importer.
Every clue requires a stable internal entity ID, a structured clue type, the
game version it was verified against, and its own source record. The importer
rejects malformed data and unknown entity IDs. It also applies the standard
answer-name/alias safety checks, so a source citation cannot be used to bypass
spoiler protection.

## Authoring rules

- Write original, concise English prose. Do not copy source text verbatim.
- Use facts that remain useful without revealing the answer's name, aliases,
  or a unique name fragment.
- Cite the exact page or primary source used for the specific fact; do not cite
  a search result or a repository home page.
- Record the applicable Terraria version and the access date.
- Add only records reviewed for accuracy, licensing, and commercial-use
  suitability. `approvedBy` identifies the reviewer responsible for that
  decision.
- Prefer mechanics, progression, biome, behavior, relationship, and source
  facts over trivia. Each entity still needs five safe, distinct clues.

## Fixture shape

```json
{
  "formatVersion": 1,
  "gameVersion": "1.4.4.9",
  "entries": [
    {
      "entityId": "npc:123",
      "review": {
        "approvedBy": "maintainer-name",
        "approvedAt": "2026-08-20"
      },
      "clues": [
        {
          "source": "mechanic",
          "text": "It is connected to a progression event.",
          "reference": {
            "title": "Exact source page title",
            "url": "https://example.com/exact-page",
            "license": "Reviewed license or permission basis",
            "accessedAt": "2026-08-20"
          }
        }
      ]
    }
  ]
}
```

The example is illustrative only and must not be imported as game data. See
[`docs/data-enrichment.md`](../../docs/data-enrichment.md) for source review
decisions.
