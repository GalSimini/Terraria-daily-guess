# Security and Privacy Baseline

## Current controls

- TypeScript strict mode and ESLint are required in CI.
- `next.config.ts` disables `X-Powered-By` and sets baseline content-type,
  referrer, permissions, framing, transport, and cross-origin headers.
- `proxy.ts` issues a fresh nonce for each page response and applies a strict
  Content Security Policy. No third-party scripts or origins are permitted.
- Raw upstream data is kept out of `public/` and ignored by Git. The reviewed,
  normalized catalog is the only versioned dataset artifact.
- The daily answer is resolved in server code. The browser receives only
  searchable metadata and the clue currently unlocked for the player.
- Daily API progression is stored in a signed, HTTP-only, `SameSite=Strict`
  cookie. The server derives attempts and authorized clue rounds; it does not
  trust a client request to decide when to reveal the answer.
- Daily API responses are `no-store`. Guess requests require same-origin JSON,
  use a 4 KiB body limit, validate their schema, and have a process-local
  request limit with stable `400`, `403`, `409`, `413`, and `429` responses.
- Production requires distinct `DAILY_PUZZLE_SEED` and
  `DAILY_SESSION_SECRET` values; development fallbacks are rejected.
- CI uses least-privilege read-only repository permissions.
- Secrets belong only in the deployment provider's encrypted environment
  configuration; `.env*` files are ignored.

## Required controls before production

- Verify HTTPS and HSTS at the deployed hosting/edge layer.
- Test the nonce-based Content Security Policy in preview and production. Do
  not add third-party origins, `unsafe-inline`, or broad wildcards without a
  documented review.
- Validate imported data with Zod and validate all browser/API input at its
  boundary.
- Render dataset and user values as text. Do not use `dangerouslySetInnerHTML`
  for game data.
- Replace the process-local daily API limiter with a shared edge or managed
  rate-limit service before multi-instance public traffic. Only deployment
  proxy headers controlled by the host may identify a client address.
- Replace the signed stateless daily-session cookie with durable server-side
  session storage before relying on replay resistance or multi-instance
  progression guarantees.
- Add a Privacy Policy, Terms, Contact page, attribution page, and fan-project
  disclaimer before a public release.
- Review Terraria/Re-Logic trademark, asset, and data-use rules before launch.
- Run dependency updates and vulnerability review continuously.

## Deferred monetization and analytics

Monetization and analytics are not enabled and are out of scope for the
current non-commercial product. Before any third-party script is proposed,
document its domains and data purpose, update CSP, assess consent requirements,
and obtain explicit human approval.

## Incident rule

If a secret is committed or a security-sensitive defect is found, stop the
release, revoke/rotate the affected secret at its provider, remove exposure
from active deployments, and document the remediation. Rewriting Git history
requires explicit human authorization.
