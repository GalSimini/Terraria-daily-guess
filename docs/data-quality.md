# Data Quality Report

## Current import snapshot

The importer was run against source revision
`51d0b5f1e83c971d16d76e7cbb1364cb3f07d19e`.

| Metric | Value |
| --- | ---: |
| Normalized entities | 5,562 |
| Entities eligible for a daily puzzle | 936 |
| Eligible items | 921 |
| Eligible blocks | 15 |
| Eligible NPCs, enemies, bosses, and critters | 0 |
| Rejected NPC records without a stable identity | 154 |

The generated report contains the exact checksum, source revision, processed
files, eligibility breakdown, and rejection reasons. Run `npm run import:data`
to recreate it locally.

## Interpretation

The imported source has enough structured metadata for many items and blocks:
kind, category, rarity, source family, biome, and tooltip can produce five
non-spoiling clues. Its NPC/enemy records are mostly identity-only, so they do
not meet the same quality bar yet.

The importer deliberately excludes entries that cannot make five safe clues.
This prevents fabricated hints and ensures that the daily game starts with
reliable content rather than a misleadingly broad catalog.

## Next data work

1. Add an approved enrichment source for NPC biome, drop, and mechanic data.
2. Introduce review fixtures for the 154 unresolved NPC records.
3. Build a clue-quality review tool that samples each eligible entity.
4. Add versioned import tests covering malformed files, ID joins, duplicates,
   spoiler detection, and reproducible checksums.
