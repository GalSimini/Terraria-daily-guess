# Interface and Security Test Plan

## Purpose

This plan defines the tests required to complete the playable MVP and to
prepare Terraria Daily Guess for a closed beta. It covers the browser
experience, accessible interaction, the daily-game API boundary, and
deployment controls. It does not approve a production release by itself.

The application is local-first and has no account system. Tests must therefore
protect against casual spoilers and malformed input, while acknowledging that a
determined player can inspect or alter their own browser state. A competitive
anti-cheat guarantee is out of scope until a server-side session architecture
has been designed.

## Scope and test layers

| Layer | Tooling | Purpose | CI gate |
| --- | --- | --- | --- |
| Domain and route integration | Vitest | Date rules, game state, schema validation, clue selection, and API responses | Every pull request |
| Browser journey | Playwright (planned) | A real player completing the daily game in Chromium and a mobile viewport | Every pull request after the suite is stable |
| Accessibility | Playwright plus `@axe-core/playwright` (planned) and manual checks | Keyboard, semantics, focus, announcements, contrast, and reduced motion | Every pull request for automated rules; manual before beta |
| Static security review | ESLint, TypeScript, repository scans | Unsafe rendering, secrets, raw source data, and insecure configuration | Every pull request |
| Dependency and supply-chain review | npm audit, Dependabot, and GitHub Actions review | Known vulnerable packages and unpinned workflow actions | Scheduled and before every release |
| Deployment smoke test | Playwright/API requests against preview and production | HTTPS, headers, routing, cache behavior, and public-page availability | Preview and release candidate |

Adding Playwright, Axe, CI jobs, monitoring, or a hosting integration is an
implementation change and requires a separately approved task. This document
only specifies the intended work.

## Test data and environment rules

- Use the generated, reviewed catalog only. Never copy raw source JSON into a
  browser fixture or a test artifact.
- Use a dedicated development seed and a known UTC test date. Do not expose a
  production `DAILY_PUZZLE_SEED` to test logs, screenshots, CI artifacts, or
  browser code.
- Keep browser tests deterministic by selecting an entity from the current
  eligible curated pool at setup time, rather than hard-coding a future answer.
- Mock network failure only in browser tests. Route integration tests must call
  the actual route handler with valid and invalid `Request` objects.
- Store screenshots, videos, traces, and coverage only as short-lived,
  access-controlled CI artifacts. They must not contain secrets.

## Interface acceptance scenarios

The following scenarios are product requirements. The implementation task must
give each scenario a stable test ID and automated coverage unless explicitly
marked manual.

| ID | Scenario | Expected result |
| --- | --- | --- |
| UI-01 | First load | The UTC date, public entity context, first clue, five attempt slots, and empty statistics render without exposing the entity name or later clues. |
| UI-02 | Search and selection | Typing a name or alias shows matching entities; pointer selection and keyboard selection choose one result without submitting a guess. Duplicate selection is clearly rejected. |
| UI-03 | Invalid submission | The Guess button remains unavailable with no selected entity; a malformed or rejected server response gives an understandable status message and preserves the current game. |
| UI-04 | Incorrect attempt | One wrong validated guess appears in Attempts, increments the round once, and unlocks exactly one additional clue. |
| UI-05 | Winning attempt | A correct validated guess ends the game, records stats once, prevents more submissions, centers the completion message in view, and displays a celebration. |
| UI-06 | Fifth incorrect attempt | The fifth wrong guess ends the game, displays the answer only after the loss, and records a loss once. |
| UI-07 | Persistence and reset | Reloading restores valid same-day progress and statistics. Corrupt local storage resets safely with a user-visible message. The reset confirmation clears only statistics after confirmation. |
| UI-08 | Daily rollover | A saved game from a previous UTC date does not affect the new puzzle. Countdown and date labels use UTC, including at the midnight boundary. |
| UI-09 | Network and clipboard failures | Failed clue/guess requests and a denied clipboard operation are recoverable, announced, and do not corrupt game or statistics state. |
| UI-10 | Mobile layout | At 320 px, 375 px, and 768 px widths, all controls remain visible, readable, and operable without horizontal scrolling. |
| UI-11 | Browser baseline | The critical journey passes in the current Chromium version and in a touch-sized viewport. Firefox and WebKit are release-candidate checks once the suite is stable. |

### Accessibility checks

Automated Axe checks are necessary but not sufficient. The release candidate
also needs manual keyboard and screen-reader testing for these requirements:

- Search results use an appropriate autocomplete/listbox pattern, expose the
  active option, and can be navigated with Arrow keys, Enter, and Escape.
- Every interactive control has a programmatic name, a visible focus state,
  and a focus order matching the visual flow.
- Guess results, clue-loading state, errors, and completed-game state are
  announced once through deliberate live regions; the one-second countdown is
  not repeatedly announced.
- Text, borders, disabled controls, and status colors meet WCAG 2.2 AA
  contrast expectations. Color is never the only signal.
- Reduced-motion preferences suppress nonessential animation, and 200% zoom
  preserves content and controls without loss.

## API and security acceptance scenarios

Tests must assert stable status codes and generic error bodies; they must never
assert an internal stack trace, catalog record, seed, or full clue sequence.

| ID | Boundary or threat | Expected result |
| --- | --- | --- |
| SEC-01 | Malformed clue query | Missing, invalid-format, non-current-date, and out-of-range round values return `400` with the documented generic error. |
| SEC-02 | Malformed guess body | Invalid JSON, absent fields, non-string IDs, fractional/out-of-range attempts, non-current dates, and unknown IDs return `400` with a generic error. |
| SEC-03 | Correctness boundary | A valid guess receives only `correct`; the answer is returned only according to an authoritative, server-validated completion state. |
| SEC-04 | Clue disclosure | A player can receive only the clue currently authorized by their server-side progress. Direct requests for future rounds cannot reveal future clues. |
| SEC-05 | Guess tampering and enumeration | A client cannot claim attempt five, replay requests, or enumerate entity IDs to reveal the answer or bypass normal progression. Abuse protection returns a stable `429` response when a documented limit is exceeded. |
| SEC-06 | Output safety | Search text, local-storage values, and dataset text render as text, never HTML. A payload such as `<img src=x onerror=alert(1)>` cannot execute. |
| SEC-07 | Answer and catalog exposure | HTML, client JavaScript props, route errors, and API responses do not disclose the target ID, daily seed, raw upstream dataset, or unneeded future clues. Search exposes only approved metadata. |
| SEC-08 | Response behavior | Daily API responses are same-origin, JSON typed, non-cacheable where required, body-size-limited, and do not reveal framework or stack details. |
| SEC-09 | Security headers | Every page and API response retains `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and frame protection. Production additionally enforces HTTPS, HSTS, and a tested restrictive CSP. |
| SEC-10 | Configuration and secrets | `.env*`, tokens, private keys, and production identifiers are absent from Git, build artifacts, logs, browser bundles, and error pages. Production refuses to start without a non-default daily seed. |
| SEC-11 | Supply chain | `npm ci`, lockfile integrity, dependency vulnerability review, and GitHub Action pinning are verified before release. |
| SEC-12 | Mass assignment and upload boundary | Extra API properties are rejected; no route accepts multipart data or file uploads. |
| SEC-13 | Secret boundary | Tracked files and reachable Git history contain no supported credential patterns, and no secret is exposed through a `NEXT_PUBLIC_` variable. |

### Current security status and remaining public-beta gaps

The server now verifies clue rounds and attempts from a signed, HTTP-only
daily-session cookie. Direct requests cannot claim a fifth attempt or retrieve
a future clue merely by changing a request field. The API also has same-origin
checks, request-size validation, no-store responses, production seed checks,
and a process-local rate limiter.

A signed stateless cookie is not durable server-side state: a determined user
can discard or replay a previously issued cookie, and a process-local limiter
does not protect multiple server instances. Before public beta, replace both
with a shared session and rate-limit service, then extend SEC-05 with replay
and multi-instance tests. Preview testing must also verify the deployed CSP,
HTTPS, HSTS, and release legal pages.

## CI and release gates

### Pull request gate

1. `npm ci` installs the lockfile exactly.
2. Run lint, typecheck, Vitest, and the build.
3. Run browser and automated accessibility tests once added.
4. Run API security integration tests, including all invalid-input cases.
5. Fail on leaked secret patterns, raw dataset files outside their allowed
   location, unsafe HTML rendering, or modified security headers without a
   corresponding security review.
6. Use a lockfile-only install, scan dependency advisories, and pin CI actions
   to reviewed commit SHAs.

### Release-candidate gate

1. Deploy a preview using non-production configuration.
2. Run the critical browser journey, mobile viewport checks, and API/header
   smoke tests against the preview URL.
3. Run dependency review and resolve, mitigate, or explicitly document every
   high-severity finding.
4. Perform the manual accessibility checklist, UTC-midnight test, and a
   privacy/legal review.
5. Obtain human review for security-sensitive, deployment, data-pipeline, and
   licensing changes.

### Public-beta exit criteria

- All UI-01 through UI-11 and SEC-01 through SEC-11 pass, or a documented
  exception has explicit human approval and an expiry date.
- Signed-session protections are verified, and the shared session and
  rate-limit services required for multi-instance public traffic are live.
- The production domain enforces HTTPS, HSTS, CSP, and the documented headers.
- Privacy, terms, contact, attribution, and fan-project disclaimer pages are
  published and reviewed.
- No secrets, unsafe source data, or high-severity unmitigated dependency
  finding is present in the deployable artifact.

## Ownership and reporting

- `src/features/game/` owns browser interaction tests and accessibility fixes.
- `src/app/api/` owns route integration and API security tests.
- `src/lib/` owns deterministic date, selection, and validation tests.
- `next.config.ts`, deployment configuration, and security header changes
  require a security review against `docs/security.md`.
- Each test implementation task reports the test IDs covered, commands run,
  browser versions, results, skipped cases, and remaining risks in English.

## Implementation order

1. Add the Playwright harness, local test server lifecycle, and one smoke
   journey after explicit dependency approval.
2. Cover UI-01 through UI-09, then mobile and accessibility checks.
3. Add direct route integration coverage for SEC-01, SEC-02, SEC-06, and
   SEC-07.
4. Decide and implement the authoritative progression model, then enforce
   SEC-03 through SEC-05.
5. Add the deployment, dependency, header, and release-candidate gates.
