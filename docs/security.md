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
- Add a Privacy Policy, Cookie Policy, Terms, Contact page, and fan-project
  disclaimer before analytics or ads are enabled.
- Review Terraria/Re-Logic trademark, asset, data, and commercial-use rules
  before launch.
- Run dependency updates and vulnerability review continuously.

## Ads and analytics

Google AdSense and analytics are not enabled by this repository. Before any
third-party script is introduced, document its domains and data purpose,
implement user consent where required, update CSP, reserve layout space to
avoid layout shift, and test the live policy in production.

## Incident rule

If a secret is committed or a security-sensitive defect is found, stop the
release, revoke/rotate the affected secret at its provider, remove exposure
from active deployments, and document the remediation. Rewriting Git history
requires explicit human authorization.
