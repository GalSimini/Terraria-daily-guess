# Architecture

## Purpose

This document describes the initial architecture for Terraria Daily Guess. It
is deliberately local-first for the MVP: gameplay and statistics do not need
an account or a database.

## System overview

```text
Pinned Terraria Dataset
        │
        ▼
Import + Zod validation ──► versioned generated catalog ──► build-time checks
                                                            │
                                                            ▼
Browser UI ◄── Next.js App Router ◄── daily selector + clue engine
    │                         │
    └── versioned local state │
                              └── static pages, SEO, security headers
```

## Layers

| Layer | Location | Responsibilities |
| --- | --- | --- |
| Routes | `src/app/` | Pages, route-level metadata, legal pages, sitemap and robots policy. |
| UI | `src/components/` | Accessible presentational components; no daily-selection logic. |
| Game feature | `src/features/game/` | Guess reducer, clue display, autocomplete integration, stats and sharing. |
| Domain utilities | `src/lib/` | UTC date key, deterministic selection, schemas, clue safety and storage migration. |
| Data pipeline | `scripts/`, `data/` | Source validation, normalization, catalog reports and checksums. |

## Data flow

1. A source revision is pinned in `data/source-manifest.json`.
2. The importer validates source JSON, resolves ID references, and writes a
   reproducible generated catalog outside `public/`.
3. A catalog validator rejects incomplete, duplicated, or spoiler-prone
   entities before they become eligible for a puzzle.
4. The application creates the global date key using UTC and deterministically
   selects one entity from a stable ID-sorted catalog.
5. The server renders the first clue and exposes server routes for subsequent
   clues and final guess validation. A signed, HTTP-only daily-session cookie
   authorizes clue rounds and server-derived attempts.
6. The browser receives searchable entity metadata only. Local state mirrors
   progress for presentation and stores statistics plus a non-sensitive
   day/night theme preference with versioned schemas where applicable; it is
   not authoritative for API progression.

## Daily game boundary

`GET /api/daily/clue` validates the requested UTC date and checks the requested
round against the signed daily-session cookie before returning one clue.
`POST /api/daily/guess` validates same-origin JSON input, the date, entity ID,
and the client-visible attempt count against that signed state. It derives the
next attempt and any loss result on the server. The target ID and the full clue
sequence are not passed as client component properties.

The browser keeps its display state and statistics locally for the MVP. A
signed session prevents modifying a cookie to request a future clue or claim a
fifth attempt, but can still be discarded or replayed by a determined user.
A future competitive leaderboard or multi-instance deployment requires durable
server-side session storage and a separate abuse-prevention design.

## Daily puzzle invariants

- `YYYY-MM-DD` is always derived in UTC.
- Selection input is a versioned catalog, a date key, and a server-side seed.
- Entity ordering is stable and based on IDs, not array positions.
- A catalog version never changes historical selection behavior.
- Five clues must be non-empty, distinct, and sanitized against the answer's
  name and aliases.

## Deployment topology

The initial target is Vercel on a custom domain, behind HTTPS. Cloudflare DNS
and WAF may be added when operationally justified. Production and preview
environments must use separate environment configuration.

No database, account system, or public API is planned for MVP. If a future
leaderboard requires server state, it must be designed as a separate service
with authentication, rate limits, abuse controls, and a privacy review.

## Non-goals

- The raw upstream dataset is not public application content.
- The MVP does not attempt impossible client-side anti-cheat.
- Ads, analytics, user accounts, and leaderboard services are not part of this
  scaffold.
