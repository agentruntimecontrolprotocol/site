# Migrate the ARCP website from Nuxt to Astro + Markdoc

> **Status:** planning. This document is the canonical migration spec. The GitHub
> issues in this repo (`Step 0`–`Step 9`, tracked by the `[Epic]` issue) are derived
> from it — each issue is self-contained, but this doc is the source of truth.

## Goal
Rebuild the ARCP website (currently Nuxt 4) as an **Astro + Markdoc** site in this
**new repo** (`agentruntimecontrolprotocol/site`, local `/Users/nficano/code/arpc/site`),
developed in parallel with the existing site at `/Users/nficano/code/arpc/www`.
The visual result must be **pixel-faithful** to the current site — same "Inkwell"
color palette, fonts, dark/light themes, code-highlighting, and layout. This is a
framework migration, NOT a redesign.

Read the existing repo at `/Users/nficano/code/arpc/www` as the source of truth for
look, behavior, and the docs-sync pipeline. Do not modify `www`; build everything in
`site`.

## Why Astro (context, already decided)
Markdoc is Stripe's React-oriented library with **no official Vue renderer**, so we
can't keep Nuxt/Vue cleanly. Astro has a **first-party `@astrojs/markdoc`** integration,
native Shiki highlighting (our custom themes drop straight in), static output (ideal for
a ~2,300-page spec/docs site), trivial Vercel deploys, and can mount Vue/React islands if
we ever need interactivity. The design layer is plain Tailwind v4 + CSS custom properties,
so it ports verbatim regardless of framework.

## Target stack
- **Astro 5.x**, `output: 'static'` (Vercel auto-detects; add `@astrojs/vercel` only if we
  later need SSR/ISR — we don't right now).
- **`@astrojs/markdoc`** for all content rendering.
- **Tailwind v4** via the `@tailwindcss/vite` plugin (NOT the legacy `@astrojs/tailwind`).
- **Shiki** via `@astrojs/markdoc/shiki`, configured with our existing `arcp-light` /
  `arcp-dark` themes.
- **`@astrojs/sitemap`** for the sitemap.
- Self-hosted fonts via Fontsource (`@fontsource/ibm-plex-mono`,
  `@fontsource-variable/newsreader`) — weights 400/500/600 only.
- OG images via a satori-based Astro endpoint (e.g. `astro-og-canvas`, or a custom
  endpoint using `satori` + `resvg`), reusing the existing card layout.
- Node 22+, pnpm 10.

## Hard constraints (preserve exactly)
1. **The "Inkwell" design system is sacred.** Every color, font, weight, spacing token,
   dark/light value, and Shiki token color must match the current site.
2. **Preserve all URLs.** Routes are `/<lang>/<page>` (no trailing slash), `/spec/...`,
   plus `/`. The synced docs contain thousands of internal links already rewritten to
   these absolute paths — if the route shape changes, every synced link 404s.
3. **Preserve the docs-sync pipeline's link/diagram rewriting** (see Step 4). This is the
   load-bearing, error-prone part.
4. **Drop FontAwesome entirely** — it's installed but 100% unused (every real icon is an
   inline hand-coded SVG). Removing it also removes the FontAwesome-Pro npm-token install
   dependency.
5. **No search** exists today — don't add one (out of scope; can be a follow-up with
   Pagefind).

---

## Steps

### Step 0 — Scaffold the `site` repo
- Astro minimal template, pnpm, in `/Users/nficano/code/arpc/site`.
- Add integrations: `@astrojs/markdoc`, `@astrojs/sitemap`, `@tailwindcss/vite`, Fontsource
  font packages. (Add `@astrojs/vue` only if you decide to reuse existing Vue components as
  islands during transition — otherwise port them to `.astro`.)
- Mirror the `site` config: `https://agentruntimecontrolprotocol.io`, name "ARCP",
  description from `www/nuxt.config.ts`.

### Step 1 — Port the design system verbatim (the "keep the palette" requirement)
Source of truth: `www/app/assets/css/main.css` (405 lines, Tailwind-v4 `@theme` + CSS vars),
`www/app/app.config.ts`, `www/shiki-arcp.mjs`.
- Copy `main.css` into `src/styles/main.css` and import it globally. Keep **all** of it
  EXCEPT:
  - Delete the `@import "@nuxt/ui-pro";` line.
  - Delete Section 3 (the `--ui-*` remap block, ~L149-168) — that only existed to repaint
    Nuxt UI Pro components, which won't exist here.
  - In Section 7, the `.prose ...` overrides were written to counter Nuxt UI Pro's prose
    defaults; re-derive equivalents for Markdoc's prose markup but keep the **values**
    (`--code-bg` panel, `--line` border, the `color-mix(...)` row hover).
  - Keep verbatim: the `@theme static` vermilion + inkwell palettes; the semantic
    `--bg/--paper/--ink/--ink-soft/--muted/--faint/--line/--line-soft/--accent/--accent-dim/
    --code-bg/--str/--key` tokens for `:root,.light`, the `prefers-color-scheme: dark` block,
    and `.dark`; the `--arcp-*` back-compat aliases; the `@theme inline` Tailwind bridge
    (`bg-paper`, `text-ink`, `border-line`, etc.); all of Section 5 (base body, paper-grain
    `body::before`, selection, focus-visible); all of Section 6 component classes
    (`.label`, `.eyebrow`, `.section-marker`, `.term`, `.code-window`, `.chip`, `.envelope`,
    `.btn-arrow`, `.lang-chip`, `.spec-prose`, `.reveal`, `.arcp-caret`); keyframes; the
    custom scale tokens (`--text-*`, `--tracking-*`, `--radius-chip`, `--animate-*`); the
    `.diagram-light`/`.diagram-dark` theme-swap rules.
  - Replace the few `--ui-primary` / `bg-(--ui-bg-elevated)` reads in the old sidebar with
    the Inkwell equivalents (`text-accent`, `bg-paper`, etc.).
- Fonts: install IBM Plex Mono (400/500/600) and Newsreader (400/500/600) via Fontsource,
  import the needed weights. `--font-mono` and `--font-serif` already reference them by
  family name; there is intentionally **no sans family** (body is serif).
- Dark mode is **class-based** (`.dark` / `.light` on `<html>`). Add a no-FOUC inline
  `<head>` script that reads `localStorage` + `prefers-color-scheme` and sets the class
  before paint, plus a toggle button in the header (replacing Nuxt UI's `useColorMode`).
  The existing CSS cascade already handles all three tiers (`:root,.light` →
  `@media (prefers-color-scheme:dark) :root:not(.light)` → `.dark`) — match it exactly.

### Step 2 — Markdoc + Shiki + content collections
- `markdoc.config.mjs`: register Shiki via `@astrojs/markdoc/shiki` using the **same two
  theme objects** from `www/shiki-arcp.mjs` (`arcpLight`, `arcpDark`) and the **same 17
  langs** (`json, bash, typescript, javascript, python, rust, go, yaml, toml, http, csharp,
  fsharp, java, kotlin, php, ruby, swift`). Configure **dual-theme, class-based** switching
  (`defaultColor: false` style) so highlighting follows the `.dark` class rather than the OS
  media query, matching today's behavior.
- `src/content.config.ts`: define two collections.
  - `docs` — Markdoc loader globbing the synced content dir (see Step 4 for the dir). No
    required schema (docs carry no frontmatter; titles come from the first `# H1`).
  - `home` — a **data** collection for the single `home.md` frontmatter. Port the Zod schema
    from `www/content.config.ts` exactly (`seo`, `header`, `hero`, `sections[]` with
    `kind: prose|grid|list|columns|code`, `cta`, `footer`, `linkSchema`).
- Markdoc must render: headings with **slugged anchor ids** (TOC + deep links depend on
  these — slug identically to today), paragraphs, lists, **GFM tables** (used in 474 files),
  blockquotes (764 files), links, inline code, and fenced code via Shiki. **No custom doc
  tags are authored anywhere in the docs prose** (verified — zero `::component` / MDC usage),
  so you do NOT need a callout/tabs/cards tag library for the docs. See Step 5 for the one
  HTML passthrough case (diagrams).

### Step 3 — Routing, nav, TOC (the @nuxt/content data layer to replace)
The old site derived these from `@nuxt/content` queries; reimplement against Astro
collections. Reference: `www/app/pages/[...slug].vue`, `www/app/layouts/docs.vue`,
`www/app/components/DocsToc.vue`, `www/app/components/DocsBreadcrumb.vue`.
- **Catch-all route** `src/pages/[...slug].astro` rendering a docs entry inside
  `<article class="prose ...">` within the docs layout.
- **Sidebar nav**: build a file-tree → nav-tree from the `docs` collection and **port the
  `dedupe()` / `normalizeTitle()` logic from `docs.vue`** (collapses TypeDoc's duplicate
  "Documentation" wrapper, relabels per-language API roots, collapses single-child
  wrappers). Per-language slice by the `/<lang>` root. Keep the collapsible groups,
  active-trail auto-open, and mobile drawer. Replace the one `<USelect>` (mobile language
  switcher) with a native `<select>`.
- **TOC ("On this page")**: generate from the page's headings (id/text/depth, 2 levels) —
  Markdoc/Astro can surface headings; match `DocsToc.vue`'s output.
- **Breadcrumb**: `DocsBreadcrumb.vue` derives purely from the path (PascalCase, 40-char
  SHA truncation, lang labels) — port as-is.
- Must scale to ~2,286 files (kotlin ≈ 1,049, typescript ≈ 793, via deep auto-generated
  `api/` trees). Prefer static generation via `getStaticPaths`.

### Step 4 — Port the docs-sync pipeline
Source: `www/scripts/sync-docs.mjs` (self-contained, zero deps, Node built-ins + fetch).
It pulls docs from 11 `<lang>-sdk` repos + the `spec` repo (org `agentruntimecontrolprotocol`),
in **local mode** (sibling checkouts) or **remote mode** (`SDK_DOCS_REMOTE=1`, GitHub API —
used in CI). Keep it as a pre-build script (`pnpm sync:docs && astro build`).
- **Preserve unchanged (load-bearing):** `transformLink` + its wrappers
  (`rewriteContentLinks`, `rewriteDiagramRefs`, `rewriteDefinedInLinks`) — the relative→absolute
  `/<lang>/<page>` rewriting, cross-repo `→ /spec/...` rewriting, and "escape to canonical
  GitHub URL" logic. Without this, synced links 404. Also keep `normalizeApiIndexTitle`,
  the README→index rename, `ensureIndex` (synthetic index generation), and the Kotlin
  breadcrumb fix.
- **Deltas to make for Astro:**
  - Change the destination dir from `content/<lang>` to wherever the `docs` collection reads
    (e.g. `src/content/docs/<lang>`). Single change to the `contentDest` builder.
  - Diagrams already copy to `public/diagrams/<lang>/...`; Astro serves `public/` identically,
    so `/diagrams/...` paths and `rewriteDiagramRefs` need **no change**.
  - If the route base stays `/<lang>/...` (recommended), `transformLink`'s output strings are
    unchanged. If you add a `/docs` prefix, update them — but prefer NOT to, to preserve URLs.
  - `.mdc` inputs (if any SDK emits them) must be renamed to `.md`/`.mdoc` on copy, or the
    `/\.(md|mdc)$/` regexes + collection glob updated. Verify whether the SDKs actually emit
    `.mdc`; if they only emit `.md`, this is moot.
  - Markdoc collections often want a `title`; consider injecting frontmatter `title` from the
    first `# H1` on copy (clean addition, optional).

### Step 5 — The one HTML gotcha: diagram `<img>` passthrough
`swapDiagramPictures` rewrites GitHub `<picture>` blocks into
`<img class="diagram-light">` + `<img class="diagram-dark">` pairs, toggled by the
`.diagram-*` CSS rules already in `main.css`. **Markdoc sanitizes raw HTML by default**, so
these won't render out of the box. Resolve by either (a) allowing this specific raw-HTML
case in the Markdoc config, or (b) changing `swapDiagramPictures` to emit a Markdoc tag
(e.g. `{% diagram light="..." dark="..." alt="..." /%}`) and implementing that tag in
`markdoc.config.mjs`. Prefer (b) — it's the cleaner Markdoc-native path. Other raw inline
HTML in prose (`<br>`, `<sub>`, `<a href>`) must also render; whitelist as needed.

### Step 6 — Rebuild the app shell + home page
Reference: `www/app/app.vue`, `www/app/layouts/{default,docs}.vue`, `www/app/error.vue`,
`www/app/components/AppHeader.vue`, and the `Home*` components.
- **Shell is almost entirely hand-rolled Tailwind** — very little Nuxt UI Pro to replace
  (only `<UApp>` root provider, one `<USelect>`, and `useColorMode`). Rebuild as `.astro`
  components: sticky blur header (ARCP wordmark + blinking caret, nav links Docs→`/python`,
  Spec, GitHub, theme toggle), the three-column docs layout (sticky left sidebar w-72 ·
  center · right TOC), and the error page.
- **Home page** (`src/pages/index.astro`): the home is **frontmatter-driven**, not prose.
  Read the `home` data entry and render the bespoke sections — port `HomeHeader`,
  `HomeDiagram`, `HomeConcernsGrid` (grid), `HomeSteps` (list), `HomeScopeColumns` (columns),
  `HomeCodeSample` (code), and the inlined footer. Four spots render small markdown strings
  at runtime via `<MDC>` today (hero `lede`, section `body`, step `description`, code
  sample) — render those with Markdoc/a small inline-markdown renderer at build time
  (the home code sample must be Shiki-highlighted with the arcp themes).

### Step 7 — SEO, OG images, sitemap, redirects
Reference: `www/app/composables/useArcpSeo.ts`, `www/app/components/OgImage/ArcpCard.satori.vue`,
`www/server/api/__sitemap__/urls.ts`, `www/server/middleware/lowercase-redirect.ts`.
- **SEO**: per-page title/description + OpenGraph + Twitter `summary_large_image`, canonical
  `site.url + path`. Reimplement `useArcpSeo` as an Astro layout/head partial.
- **OG images**: reproduce `ArcpCard.satori.vue` (paper bg `#f5f1e8`, ink `#1b1815`, accent
  `#c2431c`, subtitle `#5a5448`, serif title, vermilion rule) via a satori-based Astro
  endpoint, fonts loaded manually. Props: `title`, `description`, `section`. Prerender per
  route.
- **Sitemap**: enumerate all docs paths + home (don't rely on the default, which would only
  list `/`). `@astrojs/sitemap` + the collection list.
- **Lowercase redirect**: port `lowercase-redirect.ts` (301 miscased doc URLs →
  lowercase canonical, skipping `/_`, `/__`, `/api`, static assets). For a static build,
  implement as Vercel redirects in `vercel.json` or an Astro middleware.

### Step 8 — Deploy on Vercel (this also fixes the currently-broken deploy)
The old site deploys via GH-Actions + Vercel CLI prebuilt with a `VERCEL_TOKEN` that is
**expired** (deploy is currently broken), plus native deps (`better-sqlite3`, `resvg`,
`satori`) and a Node 22-vs-24 skew. The Astro rebuild removes all of that:
- New Vercel project (`arcp-site`), **Vercel Git integration** — push to `main` → production,
  PRs → preview. No `VERCEL_TOKEN`, no GH-Actions deploy workflow, no prebuilt dance.
- No `better-sqlite3`/SQLite content index, no native OG binary if using an edge/satori
  approach. The only carryover secret is the FontAwesome Pro token — and we're **dropping
  FontAwesome**, so it goes away too.
- Keep the domain on `www` until parity is verified; then repoint
  `agentruntimecontrolprotocol.io` to `arcp-site` and archive/rename `www` → `www-legacy`.

### Step 9 — Verify (regression gate before cutover)
- Port `www/scripts/audit-http.mjs` (HTTP-status crawl of all routes) and
  `www/scripts/audit-site.mjs` (Playwright: console errors, broken images, layout overflow
  at 375/768/1280/1920) — both are pipeline-agnostic. Run against the new dev/preview build.
- **Acceptance:** (1) every route from the old route list returns 2xx; (2) zero internal-link
  404s (link rewriting preserved); (3) visual parity — palette, fonts, dark/light, code
  colors, paper grain, layout — spot-checked against `www` in both themes; (4) nav tree, TOC,
  breadcrumbs, and OG images match; (5) home page renders identically.

## Deliverables
- This repo (`agentruntimecontrolprotocol/site`) building cleanly with `pnpm build`.
- Vercel preview deploy at parity with the current site.
- A short `MIGRATION.md` noting what changed, what was dropped (FontAwesome, SQLite,
  GH-Actions deploy), and the cutover steps.
