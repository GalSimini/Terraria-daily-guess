# Dataset Contract

## Source identity

| Property | Value |
| --- | --- |
| Source | Terraria Information Dataset |
| Repository | `https://github.com/natan-dot-com/Terraria-Dataset.git` |
| Pinned revision | `51d0b5f1e83c971d16d76e7cbb1364cb3f07d19e` |
| License declared upstream | MIT |
| Local source path | `data/source/terraria-dataset/` |

The dataset is a scraped, incomplete external input. It is not an application
contract and must not be consumed directly in the browser. The exact local
revision is recorded in `data/source-manifest.json`.

## Observed source layout

```text
json/
├── id_references/
│   ├── items.json
│   ├── npc.json
│   ├── rarity.json
│   ├── recipes.json
│   └── …
├── items_data/
│   ├── items_accessory.json
│   ├── items_weapon.json
│   ├── items_furniture.json
│   └── …
└── npc_data/
    ├── npc.json
    └── npc_town.json
```

The inspected revision contains 44 JSON files, alongside image assets.

## Observed fields

| Source | Identity fields | Useful clue fields | Notes |
| --- | --- | --- | --- |
| `id_references/items.json` | `ID`, `Name`, `Type` | `Type` | Canonical join table for item records missing a name. |
| `id_references/npc.json` | `NPC ID`, `Name`, `Type` | `Type` | Canonical name/type reference for NPCs. |
| Item category files | Usually `Item ID`; often `Name` | `Tooltip`, `Rarity`, `Sources`, category-specific fields | Schemas vary by category. |
| `npc_data/npc.json` | `NPC ID`, `Name`, `Type` | `Type` | Covers enemies and NPC identities. |
| `npc_data/npc_town.json` | `NPC ID` | `Description`, `Spawn Requirement`, `Selling List` | Must join to NPC references for a name. |
| `id_references/rarity.json` | `Rarity ID`, `Rarity Tier` | `Rarity Description` | Converts opaque rarity IDs to player-facing labels. |

The item `Sources` object was observed with source families including
`Crafting Recipes`, `NPC`, `Drop`, `Grab Bag`, and `Other`.

## Internal normalized contract

The importer will emit this contract only after Zod validation and field
normalization:

```ts
type EntityKind =
  | "item"
  | "block"
  | "wall"
  | "npc"
  | "enemy"
  | "boss"
  | "critter"
  | "other";

interface TerrariaEntity {
  id: string;
  sourceId: string;
  name: string;
  aliases: string[];
  kind: EntityKind;
  category?: string;
  rarity?: string;
  tooltip?: string;
  biomes: string[];
  sources: string[];
  tags: string[];
  clueCandidates: ClueCandidate[];
  eligibleForDaily: boolean;
}

interface ClueCandidate {
  source: "kind" | "category" | "rarity" | "sources" | "biome" | "tooltip";
  text: string;
}
```

`id` is a stable namespaced value such as `item:15` or `npc:410`. Never use
an array index as an identifier.

## Import rules

1. Read only the revision recorded in the manifest.
2. Parse every document as untrusted data and validate it with Zod.
3. Join missing item and town-NPC names through the corresponding reference
   tables.
4. Preserve the raw source ID and normalize strings only for comparison and
   search; retain display names separately.
5. Write a checksum, import timestamp, source revision, accepted count,
   rejected count, and rejection reasons to the generated report.
6. Fail the build when identity data is invalid or duplicated.

## Eligibility and clue requirements

An entity is eligible only when it has a canonical name, a stable ID, a known
kind, and five safe, distinct clues. The initial clue sequence should progress
from broad kind to narrower metadata, source information, a related mechanic,
and a sanitized tooltip/fact.

Before displaying a clue, normalize the answer name and all aliases, then
reject text containing any of them. Exclude entities whose source coverage
cannot support the sequence; do not fill gaps with guessed information.

See [the current data quality report](data-quality.md) for the measured
coverage of the pinned source revision.
