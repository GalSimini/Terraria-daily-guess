# Contributing

## Prerequisites

- Node.js 20.9 or newer
- npm
- Git

## Local setup

```bash
npm ci
npm run dev
```

Before opening a pull request, run:

```bash
npm run ci
```

## Contribution rules

- Use English for all project artifacts.
- Keep changes small and connected to an acceptance criterion.
- Do not commit raw external source data, secrets, `.env` files, generated
  build output, or `node_modules`. The reviewed normalized
  `data/generated/catalog.json` is the sole generated-data exception.
- Update the relevant documentation when behavior, architecture, or data
  assumptions change.
- Follow the agent rules in `AGENTS.md`.
