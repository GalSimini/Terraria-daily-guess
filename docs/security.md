# Security and Privacy Baseline

## Current controls

- TypeScript strict mode and ESLint are required in CI.
- `next.config.ts` disables `X-Powered-By` and sets baseline content-type,
  referrer, permissions, and framing headers.
- Raw upstream data is kept out of `public/` and ignored by Git. The reviewed,
  normalized catalog is the only versioned dataset artifact.
- The daily answer is resolved in server code. The browser receives only
  searchable metadata and the clue currently unlocked for the player.
- CI uses least-privilege read-only repository permissions.
- Secrets belong only in the deployment provider's encrypted environment
  configuration; `.env*` files are ignored.

## Required controls before production

- Enforce HTTPS and HSTS at the hosting/edge layer.
- Implement and test a Content Security Policy. The policy must allow only
  explicitly needed third-party origins. Do not add `unsafe-inline` or broad
  wildcards just to unblock an integration.
- Validate imported data with Zod and validate all browser/API input at its
  boundary.
- Render dataset and user values as text. Do not use `dangerouslySetInnerHTML`
  for game data.
- Add rate limits, body-size limits, and stable errors to every future API
  route.
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
