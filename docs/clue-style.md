# Clue Style Guide

## Purpose

This guide defines the original clue-writing style for Terraria Daily Guess.
It was informed by a small review of third-party short-form guessing videos,
but product copy must not reproduce their wording, pacing script, graphics, or
audio.

## Observed reference pattern

The reviewed Tool, Boss, and Enemy examples all use the same player journey:

1. Establish the entity class before the timed guessing sequence.
2. Deliver five increasingly discriminating facts.
3. Start with a fact that narrows the play experience without naming a source.
4. Move through environment, progression, combat behavior, acquisition,
   counterpart, or crafting relationships.
5. Finish with an actionable or highly distinctive fact, then reveal the
   answer after the attempt window.

The useful design insight is **progressive elimination**, rather than a fixed
metadata order. A player should be able to form and reject hypotheses at every
round.

## Visual direction observed in the supplied reference

The supplied Weapon reference uses a portrait-first composition: a soft,
defocused Terraria-like landscape, a centered pixel-art entity, a compact
series/part label, and a large entity-class label near the bottom. The project
may borrow these high-level communication patterns—clear hierarchy, category
context, and a recognizable entity silhouette—but must use its own branding,
typography, layout, and artwork treatment.

## Terraria Daily Guess format

The entity kind and broad category are visible as game context before Round 1.
They are not counted as one of the five meaningful clues.

| Round | Preferred fact | Quality rule |
| --- | --- | --- |
| 1 | Broad mechanical identity or player interaction | It should substantially narrow the field, but still leave plausible alternatives. |
| 2 | Progression, difficulty, biome, or encounter context | Use a verified condition, never vague flavour alone. |
| 3 | Counterpart, relationship, phase, or system interaction | Favor facts that teach Terraria knowledge while staying answer-safe. |
| 4 | Acquisition, crafting dependency, drop, or behavior consequence | Do not disclose the answer through a named unique source too early. |
| 5 | Distinctive purpose, summon condition, rare interaction, or sanitized tooltip fact | It should make a well-informed final guess possible without containing the answer or aliases. |

## Class playbooks

Use these as ordering preferences, not as a rigid script. A missing verified
fact means the entity is ineligible; do not replace it with a generic sentence.

| Entity class | Preferred five-fact progression |
| --- | --- |
| Boss | World/progression impact → encounter requirement → phase or attack behavior → biome/enrage rule → distinctive summon or world condition. |
| Enemy | Detection or rarity signal → spawn condition → spawn modifier or Bestiary rule → achievement/drop relation → distinctive behavior, location, or crafting consequence. |
| Town NPC | Discovery or move-in rule → biome preference → relationship/dialogue clue → service or defense behavior → exceptional move-in or rescue condition. |
| Weapon | Progression availability → unusual mechanic → activation/usage condition → combat effect or recipe relation → distinctive history, appearance, or late-game identity. |
| Accessory | Acquisition or recipe structure → progression tier → activation condition → exact defensive/offensive effect → counterpart, upgrade, or unusual location fact. |
| Tool | Usage behavior → acquisition environment → counterpart or alternative acquisition → crafting dependency → distinctive traversal or utility use. |
| Block | World-generation or availability rule → transmutation/alternative acquisition → physical or liquid interaction → hazard/actuator behavior → progression gate or transformation. |

### Avoidable weak clues

- A repeated statement of the entity's category after it is already shown.
- Unsourced superlatives such as "one of the best" or "very rare" without a
  measurable condition.
- A generic biome fact when a richer spawn, phase, or interaction fact is
  available.
- A direct item, NPC, or boss name that leaves only one possible answer before
  the final round.

## Authoring rules

- Use first-person clue text only when it improves clarity; the UI may instead
  present neutral clue cards.
- Write concise original English sentences. Do not copy a wiki, video script,
  or tooltip verbatim.
- Prefer objective game facts over subjective claims such as "very powerful"
  or "hard to find".
- Each clue must be independently useful and must add new information.
- Avoid direct names of a target's unique item, summon, drop, or counterpart
  until the final clue unless there are multiple plausible matches.
- Do not promise a one-minute time limit in the web product. The web game uses
  five submitted guesses instead of a passive countdown.
- The final answer is revealed only after a win or the fifth submitted guess.

## Data requirements

The base dataset can supply category, rarity, tooltip, and source-family facts.
Mechanic, phase, behavior, relationship, progression, and precise encounter
facts require entries in `data/enrichment/curated-clues.json`. Every enrichment
clue must meet the provenance and review requirements in
[`data/enrichment/README.md`](../data/enrichment/README.md).

If an entity cannot support this progression with five safe facts, it remains
in autocomplete but is not eligible as a daily answer.

At runtime, `src/lib/clue-sequence.ts` is the single server-side resolver for
the five rounds. Daily answers use only curated facts; the base catalog remains
available for autocomplete but never supplies a daily clue. The resolver favors
distinct fact families before repeating a clue source, so broad metadata cannot
crowd out a later progression or mechanic clue. A reviewed curated clue also
takes priority over a generic base candidate from the same fact family.

## Reviewed references

Seventeen distinct local transcripts were reviewed on 2026-08-20 as format
references only, covering Tool, Boss, Enemy, NPC, Block, Weapon, and Accessory
classes. Part 24 (Enemy) was supplied twice and counted once. They are not
product copy or game-data sources.
