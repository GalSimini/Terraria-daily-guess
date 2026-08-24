# Security Controls and Applicability

## Scope

Terraria Daily Guess is currently a local-first game with no database, user
accounts, passwords, file uploads, payment flow, or administrative API. This
document records which controls are implemented now and which become mandatory
when a new capability is introduced. It is a technical control register, not a
claim of legal or compliance certification.

## Control register

| Requested control | Current status | Current implementation or required trigger |
| --- | --- | --- |
| Hide API keys | Implemented | Runtime secrets use non-`NEXT_PUBLIC_` environment variables only. Production rejects development fallback values. |
| Remove Git secrets | Implemented and verified | `npm run security:check` scans tracked files and reachable Git history without printing suspected values. The initial scan found no supported credential patterns. |
| Public database key | Not applicable | No database or public database client exists. A future browser key must be least-privilege and must never be an admin, service-role, or migration key. |
| Row-Level Security | Not applicable | No database exists. Any future user-scoped database must enable and test RLS before a browser-accessible key is issued. |
| Encryption of stored data | Not applicable | The MVP stores only non-sensitive local game state. Hosting TLS protects data in transit. A future database must use provider encryption at rest and document key management. |
| Server-side authentication | Not applicable | There are no accounts or protected user resources. Daily puzzle authorization is server-validated through a signed HTTP-only cookie, not a user login. |
| Access restriction | Implemented for current routes | The game routes are public by product design; mutation requires same-origin JSON, a valid signed game session, and server-side progression checks. |
| Mass-assignment prevention | Implemented | API Zod objects are strict and reject unrecognized query or JSON properties. |
| Cookie protection | Implemented | Daily-session cookies are signed, HTTP-only, `SameSite=Strict`, host-only, `Secure` in production, short-lived, and use the `__Host-` prefix in production. |
| Password hashing | Not applicable | The MVP never receives or stores passwords. An account feature must use an approved password-hashing implementation such as Argon2id and a server-side auth design. |
| Rate limiting | Partially implemented | A bounded process-local rate limiter protects current routes. Public multi-instance traffic requires a shared edge or managed rate limiter. |
| Bot protection | Deployment prerequisite | Origin checks and rate limits reduce trivial abuse. A public deployment must enable provider WAF/bot protection; CAPTCHA or challenge flows require a separate UX and privacy decision. |
| Parameterized queries | Not applicable | No SQL or database driver exists. Any future query layer must use parameter binding or a vetted ORM; string-built queries are prohibited. |
| Input validation | Implemented | Import data, query parameters, JSON request bodies, dates, rounds, IDs, body size, and content type are validated at their boundary. |
| Content leakage | Implemented for current API | Clues are released one authorized round at a time. The target ID, seed, raw source dataset, and future clues are not returned. API responses are no-store. |
| Upload restriction | Implemented | No route accepts multipart data or file uploads. The only mutation route accepts bounded `application/json` requests. |
| Minimal API responses | Implemented | The clue route returns one clue; the guess route returns correctness, server-derived attempt count, and the answer only after a verified loss. |
| Security headers | Implemented | CSP nonce, HSTS, content-type, framing, referrer, permissions, cross-origin isolation, DNS-prefetch, and cross-domain policy headers are covered by tests. |
| Force HTTPS | Deployment prerequisite | HSTS is sent by the application. The hosting provider must terminate TLS and redirect the first HTTP request to HTTPS; this cannot be safely verified before a production domain exists. |
| Dependency supply-chain review | Implemented | Lockfile-only install, `npm audit`, full-history secret scan, Dependabot, and commit-pinned GitHub Actions run in CI. |

## Production configuration

Set these values in the deployment provider's encrypted environment manager.
They must never use a `NEXT_PUBLIC_` prefix or be committed to the repository.

| Variable | Purpose |
| --- | --- |
| `DAILY_PUZZLE_SEED` | Selects the deterministic daily target. |
| `DAILY_SESSION_SECRET` | Signs daily-session cookies. |

Use independently generated, high-entropy values. Rotate either value after a
suspected disclosure; rotating the session secret invalidates active daily
sessions, while rotating the puzzle seed changes future selections.

## Mandatory decisions before new capabilities

- Database: select a provider, document data classification, configure private
  service credentials, enable RLS, use parameterized access, and add migration
  plus authorization tests before any public key is issued.
- Accounts: write an auth architecture decision, add server-side authorization
  at every protected boundary, use a vetted identity provider or Argon2id, and
  add password-reset, session-revocation, and abuse controls.
- Uploads: define allowed file types and size limits, store outside the app
  filesystem, virus-scan where appropriate, use signed upload URLs, and never
  serve uploaded content from the application origin without review.
- Public hosting: enforce HTTPS redirects and TLS at the host, configure shared
  rate limiting and bot/WAF protection, then run preview-domain header and
  browser security smoke tests.
