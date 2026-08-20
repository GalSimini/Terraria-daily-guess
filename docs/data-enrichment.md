# Data Enrichment Evaluation

## Goal

Increase clue quality and expand daily eligibility for NPCs, enemies, and
bosses without fabricating game facts or coupling the runtime application to
an unreviewed scraper.

## Evaluated sources

| Source | Best use | Limitation | Decision |
| --- | --- | --- | --- |
| Current Terraria Information Dataset | Item names, categories, rarities, tooltips, and source families | NPC records lack enough structured metadata for five clues | Keep as the base catalog. |
| Official Terraria Wiki (wiki.gg) | Manually reviewed NPC drops, acquisition details, biome and mechanic facts | Page content is CC BY-NC-SA 4.0 unless noted; attribution and ShareAlike obligations apply | Allowed as non-commercial research for original curated clues; no scraper, copied prose, table export, or media. |
| tModLoader 1.4.5 source patches | Versioned item/NPC IDs and selected runtime flags | It is modding-source material, not a complete player-facing encyclopedia or drop database | Use only for ID/version reconciliation and selected technical flags. |
| `downloadpizza/terraria-npc-data` | Town NPC living preferences | Narrow scope; does not cover enemies, bosses, or drops | Optional town-NPC enrichment only. |
| `cr0wst/terraria-info` | Legacy CSV/JSON reference material | Its README states that the data is CC BY-NC-SA 3.0 and mixes historical sources | Do not use in the current pipeline: its version and provenance are insufficient for a maintained clue catalog. |

## Recommended integration path

1. Preserve the current pinned dataset as the canonical base.
2. Add a reviewed, manually curated enrichment fixture for a small NPC/boss
   sample first; every field must include its source URL and game version.
3. Add importer joins by stable `npc:<id>` and `item:<id>` IDs, then run the
   same five-clue safety checks used by the base catalog.
4. Automate only after source terms, rate limits, attribution, and update
   ownership are documented in an ADR.
5. Pin every enrichment revision and reject conflicts with the base catalog
   rather than silently overwriting it.

The current release scope is non-commercial. See
[`docs/content-attribution.md`](content-attribution.md) for the wiki research
boundary, attribution requirements, and unresolved ShareAlike review.

Clue formulation must follow [`docs/clue-style.md`](clue-style.md). The
reference format puts entity class before the five-round sequence and reserves
the rounds for progressively more discriminating game facts. This does not
authorize copying any third-party video script or visual design.

## Implemented review boundary

The importer now reads only `data/enrichment/curated-clues.json`. The fixture
is empty until facts have been reviewed. Each clue must carry a source URL,
license or permission basis, access date, game version, and named approval.
The importer rejects unknown IDs, duplicate enrichment text, and any clue
containing the answer name or an alias. This preserves a reproducible audit
trail without automatically scraping or redistributing third-party content.

## Initial curated pack

The first pack covers one representative from each currently defined clue
profile: Tool, Boss, Enemy, Town NPC, Block, Weapon, and Accessory. Its seven
entries are a quality benchmark for source provenance, original wording,
five-round progression, and spoiler filtering. The exact source records are
stored beside each clue in `data/enrichment/curated-clues.json`; the generated
catalog contains only the validated clue text needed at runtime.

Only entries with five curated clues are eligible for the daily selection pool.
Catalog expansion is therefore the primary data priority: add reviewed facts
across complementary sources, resolve conflicts explicitly, and increase the
number of complete five-round sequences before widening the daily pool.

## Sources to review

- [Terraria Wiki.gg NPC drops](https://terraria.wiki.gg/wiki/NPC_drops)
- [tModLoader 1.4.5 ItemID patch](https://github.com/tModLoader/tModLoader/blob/1.4.5/patches/tModLoader/Terraria/ID/ItemID.cs.patch)
- [tModLoader 1.4.5 NPCID sets](https://github.com/tModLoader/tModLoader/blob/1.4.5/patches/tModLoader/Terraria/ID/NPCID.TML.cs)
- [Town NPC preference dataset](https://github.com/downloadpizza/terraria-npc-data)
- [Rejected: cr0wst/terraria-info license statement](https://github.com/cr0wst/terraria-info)
