# Terraria Daily Guess

Terraria Daily Guess is a daily browser guessing game for Terraria fans. Each
UTC day presents the same secret entity to every player, with five progressive
clues and spoiler-free result sharing.

## Status

Playable foundation stage. The daily game flow, validated data importer,
server-side clue and guess routes, local statistics, and CI are in place.
The next milestone is expanding and reviewing the eligible entity catalog.

## Development

```bash
npm ci
npm run dev
```

Run all currently configured quality checks with:

```bash
npm run ci
```

## Documentation

- [Project foundation](PROJECT_FOUNDATION.md)
- [Architecture](docs/architecture.md)
- [Dataset contract](docs/data-contract.md)
- [Data quality report](docs/data-quality.md)
- [Security baseline](docs/security.md)
- [Contribution guide](CONTRIBUTING.md)

## Dataset

The project uses a pinned local clone of the
[Terraria Information Dataset](https://github.com/natan-dot-com/Terraria-Dataset).
The source revision is recorded in `data/source-manifest.json`. Raw source data
is not served to browsers or committed. The normalized `catalog.json` is the
reviewable runtime artifact used by the application.

## Disclaimer

Terraria Daily Guess is an independent fan project and is not affiliated with
or endorsed by Re-Logic. Final branding, data-use, and monetization decisions
require a separate legal and policy review before launch.
