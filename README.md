# site

Marketing + docs site for the **Agent Runtime Control Protocol** (Astro + Markdoc).

This is the in-progress rebuild of [`agentruntimecontrolprotocol/www`](https://github.com/agentruntimecontrolprotocol/www)
(currently Nuxt 4) on **Astro + Markdoc**, preserving the existing "Inkwell" design
system, fonts, dark/light themes, and all URLs. It is developed in parallel with `www`;
the domain [agentruntimecontrolprotocol.io](https://agentruntimecontrolprotocol.io) stays
on `www` until this reaches visual + route parity, then cuts over.

## Status

🚧 **Planning / scaffolding.** The migration is tracked as GitHub issues:

- **[Epic] Migrate ARCP website from Nuxt to Astro + Markdoc** — the tracking issue.
- `Step 0`–`Step 9` — one issue per migration phase, each self-contained for an
  implementing agent.

The full, canonical spec lives in [`docs/markdoc-migration.md`](docs/markdoc-migration.md).
Every issue is derived from it.

## Target stack

- [Astro 5.x](https://astro.build) (`output: 'static'`)
- [`@astrojs/markdoc`](https://docs.astro.build/en/guides/integrations-guide/markdoc/) — content rendering
- [Tailwind CSS v4](https://tailwindcss.com) via `@tailwindcss/vite`
- [Shiki](https://shiki.style) with the custom `arcp-light` / `arcp-dark` themes
- `@astrojs/sitemap`, Fontsource (IBM Plex Mono + Newsreader)
- Deployed on Vercel via Git integration

## Source of truth

The existing site at `../www` (`agentruntimecontrolprotocol/www`) is the reference for
look, behavior, and the docs-sync pipeline. SDK + spec docs are synced in at build time
from the sibling `*-sdk` and `spec` repos by `scripts/sync-docs.mjs` (ported from `www`).

## Local development

> Once Step 0 lands, this becomes the standard Astro flow:

```sh
pnpm install
pnpm sync:docs   # pulls SDK + spec docs (set SDK_DOCS_REMOTE=1 for GitHub mode)
pnpm dev
```
