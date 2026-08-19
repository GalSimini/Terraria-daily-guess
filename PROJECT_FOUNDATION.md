# Terraria Daily Guess — Project Foundation

## 1. Product Definition

**Terraria Daily Guess** (also referred to as **Terrariadle**) is a daily, browser-based guessing game for Terraria fans. Every UTC day, every player receives the same secret Terraria entity. The entity can be an item, block, enemy, critter, NPC, boss, or other supported in-game entry.

Players use searchable autocomplete to submit a guess. They receive up to five progressively more specific clues, with each incorrect guess unlocking the next clue. A completed game produces a spoiler-free result that can be shared as an emoji grid.

All source code, technical documentation, product copy, tests, pull-request text, commits, and developer communication must be written in **English**. The public UI should be localized later, beginning with English and Brazilian Portuguese.

### MVP scope

- One globally synchronized daily puzzle.
- Five-round clue progression.
- Fuzzy-search autocomplete over a curated, normalized Terraria dataset.
- Local statistics: streak, wins, losses, win rate, and guess distribution.
- Spoiler-free sharing.
- Responsive and accessible web experience.
- Advertising-ready pages without letting ads interfere with gameplay.

### Explicitly out of scope for the MVP

- User accounts and cloud sync.
- Multiplayer or real-time features.
- User-generated content.
- Paid game advantages.
- Guessing entities with incomplete or low-quality source data.

## 2. Recommended Architecture

### Chosen stack

| Area | Choice | Why |
| --- | --- | --- |
| Web framework | Next.js (latest stable) with TypeScript | Mature SSR/SSG, strong security defaults, SEO, and excellent deployment support. |
| UI | React, Tailwind CSS, Radix primitives, Lucide icons | Fast development, accessible primitives, consistent design system. |
| Validation | Zod | Runtime validation for imported dataset data and API boundaries. |
| Search | Fuse.js in a Web Worker | High-quality local fuzzy matching without exposing an API or adding recurring cost. |
| State | React state + small Zustand stores only where useful | Keeps the game simple and testable. |
| Persistence | `localStorage`, versioned and validated with Zod | No account or personal-data backend is required for MVP. |
| Tests | Vitest + Testing Library + Playwright | Unit, component, and end-to-end coverage. |
| Formatting and quality | ESLint, Prettier, TypeScript strict mode, Husky/lint-staged | Consistent and safe contributions from people and agents. |
| Observability | Sentry (production only, privacy-configured) | Error visibility without collecting game content unnecessarily. |
| Analytics | Privacy-conscious analytics, consent-gated where legally required | Measure product health with minimum collection. |

### Hosting recommendation

Start with **Vercel** for the Next.js application, using a custom domain and its managed CDN, TLS, previews, image optimization, scheduled jobs, and edge protections. Put **Cloudflare DNS and WAF** in front when traffic or attack exposure warrants it. This gives an excellent portfolio-quality deployment path while keeping early operational work low.

Use a production environment and a preview environment. Store all secrets only in the host's encrypted environment-variable manager; never commit them to Git.

### Daily answer design

The daily target must be deterministic, auditable, and identical worldwide.

1. Normalize and version the eligible entity catalog.
2. Build a deterministic list sorted by stable `id`.
3. Use a UTC date key (`YYYY-MM-DD`) and a versioned, server-side secret seed to select an index.
4. Resolve the answer on the server for the daily route; do not send the answer, seed, or full clue payload before the player needs it.
5. If the catalog changes, introduce a new puzzle catalog version rather than changing historical answers.

For the MVP, guesses and progress are stored locally. The secret is not a high-security asset—browser clients can always be inspected—so the goal is fair play and avoiding casual spoilers, not impossible anti-cheat. A future server-side session can harden this if competitive leaderboards are introduced.

## 3. Data Pipeline and Dataset Inspection

The candidate source is [`natan-dot-com/Terraria-Dataset`](https://github.com/natan-dot-com/Terraria-Dataset). It must be treated as an external, version-pinned input—not as application code.

### First implementation checkpoint

The dataset has been cloned locally at `data/source/terraria-dataset/` for inspection. The observed source revision is `51d0b5f1e83c971d16d76e7cbb1364cb3f07d19e`.

Before the first shared commit, choose one reproducible source-management approach:

```powershell
# Preferred: make the source an explicitly registered Git submodule.
git submodule add https://github.com/natan-dot-com/Terraria-Dataset.git data/source/terraria-dataset

# Alternative: keep the working clone outside Git and record its exact revision.
git -C data/source/terraria-dataset rev-parse HEAD
```

If the alternative is chosen, persist the source URL and commit SHA in `data/source-manifest.json`, and ignore the raw source directory. Do not copy the raw upstream JSON into `public/`.

### Observed dataset snapshot

The cloned revision contains 44 JSON files plus sprite/media assets. It is organized into `items_data/`, `npc_data/`, and `id_references/`.

- `id_references/items.json` provides item `ID`, `Name`, and broad `Type`.
- `id_references/npc.json` provides `NPC ID`, `Name`, and `Type` for enemies and town NPCs.
- Item category files are arrays with varying schemas. Frequently available fields include `Item ID`, `Name`, `Tooltip`, `Rarity`, `Research`, and a structured `Sources` object.
- `Sources` has source families such as `Crafting Recipes`, `NPC`, `Drop`, `Grab Bag`, and `Other`, which is promising for non-spoiling clue generation.
- Many specialized item records omit `Name`; those need to be joined through `id_references/items.json` using `Item ID`.
- `npc_data/npc.json` has `NPC ID`, `Name`, and `Type`; `npc_data/npc_town.json` has descriptions, spawn requirements, and selling lists but needs a join through `NPC ID` to recover the name.

This is an incomplete, scraped dataset with a stated future-work item for mob-drop support. The importer must measure field coverage and initially exclude entity types that cannot produce five safe clues.

### Import and normalization requirements

Create an explicit import script such as `scripts/import-terraria-dataset.ts`. It must:

- Read only the checked-in, pinned source revision.
- Validate every input document with Zod schemas.
- Log invalid records and fail when required fields are missing.
- Normalize fields into an internal `TerrariaEntity` contract.
- Create stable internal IDs that never depend on an array position.
- Create normalized aliases for search (case, punctuation, accents, and Terraria naming variants).
- Separate raw source data from generated application data.
- Emit a versioned, reproducible catalog with a checksum and import report.

Proposed internal contract (to be adjusted after inspecting the upstream JSON):

```ts
type EntityKind = "item" | "block" | "wall" | "npc" | "enemy" | "boss" | "critter" | "other";

interface TerrariaEntity {
  id: string;
  name: string;
  aliases: string[];
  kind: EntityKind;
  gameVersion?: string;
  rarity?: string | number;
  biomes: string[];
  sources: string[];
  tooltip?: string;
  tags: string[];
  eligibleForDaily: boolean;
}
```

### Clue policy

Clues must be generated from structured fields instead of being authored only as prose. This avoids contradictions and lets the game exclude incomplete records safely.

| Round | Typical clue | Rule |
| --- | --- | --- |
| 1 | Entity category and broad type | Must never reveal the exact name or unique synonym. |
| 2 | Rarity, size, or broad biome | Use only if the field is trustworthy. |
| 3 | Acquisition/drop/source family | Avoid exact source wording if it uniquely exposes the answer too early. |
| 4 | Narrower biome, related entity, or mechanic | Must be useful but not a direct copy of the name. |
| 5 | Sanitized tooltip fragment or distinctive fact | Remove the entity name and aliases before display. |

The clue generator should return a complete five-clue sequence during catalog build, then reject entities that cannot produce five non-spoiling, non-duplicated clues. Snapshot tests should cover every eligible entity.

## 4. Repository Layout

```text
terraria-daily-guess/
├── app/                    # Next.js routes, metadata, and pages
├── components/             # Presentational, accessible UI components
├── features/game/          # Game rules, local state, clue presentation
├── lib/                    # Pure utilities, validation, date/seed logic
├── data/
│   ├── source/             # Pinned upstream dataset (not public)
│   ├── generated/          # Normalized build artifacts
│   └── source-manifest.json
├── scripts/                # One-way dataset import/build scripts
├── public/                 # Only safe static assets
├── tests/                  # Unit/integration/e2e test support
├── docs/                   # Architecture decisions and runbooks
├── .github/workflows/      # CI, security checks, deploy gates
└── PROJECT_FOUNDATION.md
```

Use path aliases (`@/components`, `@/features`, `@/lib`) and keep domain logic independent from React components. Components should never choose the daily answer or transform raw source JSON.

## 5. Security, Privacy, and Reliability Baseline

Security requirements are part of the definition of done for every feature.

- Enable HTTPS only, HSTS, and secure redirect handling.
- Add a strict Content Security Policy. Configure Google AdSense domains deliberately; never use broad `unsafe-inline` or wildcard origins just to make ads work.
- Set `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and frame protections appropriate to the ad integration.
- Validate all external data at import time and every untrusted browser value at runtime.
- Render entity names and tooltips as plain text. Never inject dataset or user strings with `dangerouslySetInnerHTML`.
- Do not use user-provided URLs, redirects, HTML, or arbitrary file uploads in MVP.
- Rate-limit any future API route; set body-size limits and stable error responses.
- Use dependency lockfiles, Dependabot/Renovate, secret scanning, npm audit in CI, and pinned GitHub Actions versions.
- Keep production secrets in the hosting platform. Exclude `.env*` from commits except documented `.env.example` placeholders.
- Collect the minimum analytics data, publish a Privacy Policy and Cookie Policy before ads/analytics go live, and offer consent controls where required.
- Add a Terms of Use page and a clear fan-project disclaimer. Review Terraria/Re-Logic branding, asset, and data licensing before using names, logos, screenshots, or upstream data commercially.
- Build accessible UI: keyboard navigation, focus states, semantic labels, contrast, reduced-motion support, and screen-reader announcements for guesses/clues.

## 6. Google Ads Monetization Plan

Ads should be introduced only after the gameplay experience, legal pages, and content quality are ready for review.

1. Add durable content pages: About, How to Play, Privacy Policy, Cookie Policy, Terms, Contact, and a Terraria fan-project disclaimer.
2. Obtain approval for the production domain under Google AdSense policies.
3. Keep ad slots outside the guess input, buttons, and primary clue flow. Reserve layout space to prevent Cumulative Layout Shift.
4. Load ads after consent where needed and avoid ad refreshes, incentivized clicks, misleading labels, or traffic-buying schemes.
5. Measure Core Web Vitals and disable/reposition placements that harm usability.
6. Avoid ads on error pages, empty states, or pages with insufficient original content.

Do not commit the AdSense client ID as a secret—it is public configuration—but keep it environment-specific and make its rendering conditional on production plus a consent decision.

## 7. AI Harness Development Method

The project will use an **AI development harness**: small, verifiable tasks executed by agents against a shared contract and protected by automated gates. AI accelerates execution; tests, review rules, and explicit ownership preserve quality.

### Agent rules

- Every task begins from an issue-sized acceptance criterion and a named file boundary.
- Agents read `AGENTS.md`, this foundation document, and relevant architecture decisions before edits.
- One agent owns a file area at a time; parallel work must use non-overlapping paths.
- Agents may not modify dependencies, deployment configuration, secrets, authentication, ads, or security headers without explicit human approval.
- Agents must not fabricate data fields. Dataset work requires observed JSON fixtures and schema tests.
- Every change includes tests proportional to risk, plus `lint`, `typecheck`, and affected test suites.
- Agents report changed files, commands run, results, assumptions, and unresolved risks in English.
- Human review is required before merging security-sensitive, monetization, data-pipeline, or production-deployment changes.

### Required harness files

- `AGENTS.md`: repository instructions, commands, boundaries, and quality gates.
- `docs/architecture.md`: system diagram and data flow.
- `docs/adr/`: short Architecture Decision Records (ADRs).
- `docs/data-contract.md`: observed upstream schema and internal contract mapping.
- `docs/security.md`: headers, threat model, incident contacts, and secret policy.
- `CONTRIBUTING.md`: branch, commit, test, and review expectations.
- GitHub issue templates and pull request template with test/security checklists.

### Definition of done

A feature is complete only when its acceptance criteria pass, type checks/lint/tests pass, accessibility is considered, no secrets or raw unsafe data are exposed, documentation is updated if behavior changes, and a reviewer can reproduce the result from a clean checkout.

## 8. Delivery Roadmap

### Phase 0 — Foundation

- Initialize Next.js TypeScript repository and quality tooling.
- Add the harness files, architecture docs, and CI gates.
- Pin and inspect the dataset; document its license and exact schema.
- Build the first import report without any gameplay UI.

### Phase 1 — Data and game core

- Normalize catalog and build eligibility/clue validation.
- Implement deterministic UTC daily selection and test date-boundary behavior.
- Implement pure game reducer: guesses, attempts, win/loss, and share-grid generation.
- Add unit and snapshot coverage for all core rules.

### Phase 2 — Playable MVP

- Build the responsive game screen, accessible autocomplete, clue cards, and result modal.
- Add local stats/streak migration and reset controls.
- Add SEO metadata, sitemap, robots policy, and legal/informational pages.
- Add Playwright tests for core player journeys.

### Phase 3 — Production hardening

- Configure hosting, custom domain, headers, error monitoring, analytics consent, and CI preview deployments.
- Run security/dependency/accessibility/performance checks.
- Validate mobile experience and global UTC rollover.
- Launch a small closed beta and fix observed data/clue quality problems.

### Phase 4 — Monetization and iteration

- Apply for AdSense after legal/content readiness.
- Introduce restrained, layout-stable placements.
- Monitor performance, errors, and retention without collecting unnecessary personal data.
- Add new entity packs only through the validated dataset pipeline.

## 9. Immediate Next Actions

1. Repair/confirm the local workspace path so the dataset can be cloned and inspected.
2. Decide whether the dataset will be a Git submodule or an externally pinned import source.
3. Create `AGENTS.md`, the Next.js scaffold, and CI quality gates.
4. Inspect real JSON samples and write `docs/data-contract.md` before defining the final entity schema or clue mappings.
5. Create the dataset importer and report the actual category/field coverage.

## 10. Decisions Recorded Today

- The product language for development is English; future UI localization is allowed.
- The initial architecture is Next.js + TypeScript, deployed on Vercel, with Cloudflare as the likely DNS/WAF layer.
- The daily puzzle is UTC-based and deterministic from a versioned catalog.
- Raw external data is never served directly to users; the reviewed normalized
  catalog is the deployable runtime artifact.
- The game begins local-first, with no account system or personal-data backend.
- Ads are a post-readiness production phase and must respect privacy, security, performance, and platform policies.
- The Terraria dataset must be inspected and version-pinned before any clue implementation.
