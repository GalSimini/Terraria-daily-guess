# ADR 0002: Treat the Terraria dataset as a pinned external input

## Status

Accepted — 2026-08-19.

## Context

The source dataset is scraped, incomplete, and has heterogeneous JSON shapes.
Serving it directly would expose unstable data and couple user-facing behavior
to upstream changes.

## Decision

Record the upstream URL and exact commit in `data/source-manifest.json`. Import
the source through a validated normalization step and generate the catalog used
by the application. The local raw clone is ignored pending an explicit choice
between a Git submodule and an external clone workflow.

## Consequences

Updates are deliberate, reviewable, and reproducible. The importer has to
handle joins and incomplete records, and entities without five safe clues are
excluded.
