<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project contract

Terraria Daily Guess is a global daily guessing game. All source code,
documentation, test names, commit messages, review notes, and user-facing
default copy are written in English. Product requirements are in
`PROJECT_FOUNDATION.md`; architecture and data rules are in `docs/`.

## Required workflow

1. Read this file and the relevant document in `docs/` before editing.
2. State the acceptance criteria and keep the change within its assigned file
   boundary.
3. Do not invent upstream data fields. Dataset work must use observed JSON
   fixtures and the mapping in `docs/data-contract.md`.
4. Run the relevant quality checks before handoff. Every non-trivial feature
   needs focused tests when the test harness is introduced.
5. Report changed files, commands run, outcomes, assumptions, and open risks.

## Commands

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
npm run ci
```

## Ownership and boundaries

- `src/app/` owns routes, metadata, and page composition.
- `src/components/` is for reusable accessible UI only.
- `src/features/` owns game feature logic and local state.
- `src/lib/` contains framework-independent pure utilities and validation.
- `scripts/` imports and validates external data; it does not contain UI code.
- `data/source/` is external input; `data/generated/` is reproducible output.
- `docs/` is the source of truth for decisions and contracts.

Do not change lockfiles, dependencies, deployment configuration, advertising,
analytics, authentication, or security headers unless the task explicitly
requires it and the consequences have been documented.

## Security and privacy rules

- Never commit secrets, tokens, `.env` files, or production identifiers.
- Validate untrusted input at every boundary; render data as text, never raw
  HTML.
- Do not expose the raw dataset in `public/` or send future daily-answer
  material to the browser before it is needed.
- Preserve the baseline headers in `next.config.ts`. Changes require a review
  against `docs/security.md`.
- Do not add third-party scripts or ad tags before consent, policy, and CSP
  requirements are implemented.

## Git and collaboration rules

- Work in small, reviewable changes. Never force-push, reset, or discard
  unrelated work.
- Do not alter `.git/` directly. The registered remote must not be pushed to
  without explicit user authorization.
- Parallel agents must own non-overlapping paths. When a boundary overlaps,
  stop and coordinate before editing.
