# ADR 0001: Use Next.js with Vercel as the initial deployment target

## Status

Accepted — 2026-08-19.

## Context

The product needs fast global delivery, SEO-ready informational pages, simple
preview deployments, and a maintainable portfolio-quality stack.

## Decision

Use Next.js App Router with TypeScript and Tailwind CSS. Deploy the initial
production application on Vercel with a custom domain. Consider Cloudflare DNS
and WAF as the public traffic layer when needed.

## Consequences

The MVP is optimized for static/local-first gameplay. Vercel handles TLS and
preview deployment well, while a future account or leaderboard backend will
require a separate architecture decision.
