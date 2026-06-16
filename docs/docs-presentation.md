# ARCP Docs — Stripe-Reference-Style Presentation Spec

> **TL;DR.** We adopt Stripe's API-reference docs **layout and organization** — a `100dvh` app shell with three independently-scrolling regions, a 280px sidebar that doubles as the per-page TOC, a per-section two-column grid, a sticky code panel, and a global SDK-language toggle — while keeping the **Inkwell visual system** (paper `--bg`, ink text, single vermilion `--accent`, serif body, mono signal) entirely intact. This is a transplant of *structure*, not *style*: every device pins to an existing token in `src/styles/main.css`, and **no new color is introduced anywhere**. We do not copy Stripe's white shell, blurple accent, dark-always code panel, sans typography, iconography, or secret-key affordances.

> **Reconciliation with `docs/markdoc-migration.md`.** That document declares the Nuxt→Astro migration "pixel-faithful, NOT a redesign," and the Inkwell design system "sacred." This spec is a **scoped, intentional redesign of the docs *reading shell*** — how the sacred tokens are *arranged* into a page — layered on top of (and sequenced after) the framework migration. The two are separable: the **visual system** (palette, fonts, weights, spacing, Shiki token colors, paper grain) is unchanged; the **reading shell** (three-column scrolling document → app-shell + section grid) is the part deliberately redesigned. **Existing shared *elements*** — the chip, the `.code-window`, the `.label`, the active nav row, the `.lang-chip` — are reused **verbatim** and remain pixel-faithful to `www`; only their *composition* changes. **Net-new elements** that `www` never had — the signature pill, the `ref-row` anatomy, the code-panel header bar, the `/`-search trigger — are *new*, but are assembled **only from existing tokens and component classes**, so they are visually *consistent with* `www` (not pixel-identical to a thing that never existed there). URLs (`/<lang>/<page>`, `/spec/...`, no trailing slash) and the 2,286 generated content files are preserved byte-for-byte. Where this plan supersedes a specific migration-doc assumption (the three-column layout; the mobile-only `<select>` language switcher), it is annotated as an explicit delta, not a silent override.

## Table of contents

1. [At a glance](#at-a-glance)
2. [Architecture & App Shell](#architecture--app-shell)
3. [Navigation & Information Architecture](#navigation--information-architecture)
4. [Reference / Resource Page Content Model](#reference--resource-page-content-model)
5. [Code Panel & Global Language Toggle](#code-panel--global-language-toggle)
6. [The Docs Start Page](#the-docs-start-page)
7. [Responsive Behavior & Accessibility](#responsive-behavior--accessibility)
8. [Component Inventory, Tokens & Migration Plan](#component-inventory-tokens--migration-plan)
9. [Open questions & risks](#open-questions--risks)
10. [Build checklist](#build-checklist)

---

## At a glance

The current shell is a normal scrolling document: `DocsLayout.astro` = `AppHeader` (sticky blur) + `DocsSidebar` (`w-72`) + a center `<main class="prose">` that scrolls the body + a right-hand `DocsToc` rail. The target is a `100dvh` app shell with three independently-scrolling regions (Stripe's measured model: at desktop `window.scrollY` stays `0` and the body does not scroll), a 280px sidebar that *is* the per-page TOC (so the separate `DocsToc` rail is retired on reference pages), a 56px pinned navbar, and a per-section two-column grid whose right column is a sticky `--code-bg` panel.

```
┌──────────────────────────────────────────────────────────────────────────────────────┐ ◄─ 100dvh viewport
│ SIDEBAR (280px)         │ NAVBAR  height 56px  · pinned · does NOT scroll              │    (root grid;
│ position: full-height   ├─────────────────────────────────────────────────────────────┤     overflow:hidden
│ overflow hidden (outer) │ [lang ▾] [section ▾] · · · · · · ·   Docs   Spec   GitHub  ◐│     at wide: only;
│ ┌─────────────────────┐ ├─────────────────────────────────────────────────────────────┤     body never scrolls
│ │ BRAND ZONE (fixed)  │ │ CONTENT PANE  flex-1 · height = 100dvh − 56px · overflow-y:auto│     at wide: ≥1280)
│ │ ARCP▌ · search "/"  │ │ ┌──────────────────────────┬──────────────────────────────┐ │ ◄─ region #3 scrolls
│ │ · Ask AI            │ │ │ .ArcpSection-Main (1fr)   │ .ArcpSection-Aside (1fr)     │ │    here, internally
│ ├─────────────────────┤ │ │  prose, attr/param lists  │ ╔══════════════════════════╗ │ │
│ │ LANGUAGE ▾ (chips)  │ │ │                           │ ║ CODE PANEL  --code-bg    ║ │ │
│ ├─────────────────────┤ │ │  (this column drives      │ ║ (light paper in light,   ║ │ │
│ │ NAV TREE            │ │ │   the section's height)   │ ║  ink in dark; sticky)    ║ │ │
│ │ overflow-y:auto     │ │ │                           │ ║ top: 16px                ║ │ │
│ │ ↕ scrolls           │ │ │                           │ ║ method/sig pill · lang ▾ ║ │ │
│ │ independently       │ │ │                           │ ║ request → RESPONSE       ║ │ │
│ │  Overview           │ │ ├───────────────────────────┼──╚══════════════════════════╝─┤ │ ◄─ next section's
│ │  Authentication     │ │ │ .ArcpSection-Main         │ .ArcpSection-Aside (new panel │ │    aside takes over
│ │  ▸ Sessions  (open) │ │ │                           │  pins at top:16px)           │ │    the sticky slot
│ │      The Session…   │ │ │                           │ ╔══════════════════════════╗ │ │
│ │      Create …       │ │ │                           │ ║ CODE PANEL  --code-bg    ║ │ │
│ │ └─────────────────────┘ │ │                           │ ╚══════════════════════════╝ │ │
│ └─────────────────────┘ │                                                              │
└─────────────────────────┴──────────────────────────────────────────────────────────────┘
  ◄──── 280px ────►◄──────────────── flex-1  (viewport − 280px) ───────────────────────►
        per section:  grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 2.5rem
```

Load-bearing structural decisions:

- **No body scroll — at `wide:` (≥1280) only.** At desktop the root is a `grid` pinned to `100dvh` with `overflow:hidden`; only the inner panes (`nav-tree`, `content-pane`) scroll, so the navbar and sidebar stay put *for free* — no `position:fixed`, no scroll-coupled JS, no padding-offset bookkeeping, no `z-index` battles. **Below `wide:` the body scrolls normally** (single-column flow is a normal long document). This is the precondition that makes per-section `position:sticky` resolve against the content pane at desktop (see below).
- **Three independent scroll regions (desktop).** Sidebar nav tree (own `overflow-y:auto`), navbar (never scrolls), content pane (the only doc scroller). Measured against Stripe at 1440×900.
- **280px sidebar, 56px navbar.** The current navbar `h-14` (56px) already matches; the current sidebar `w-72` (288px) narrows one step to **`w-70` (280px)**.
- **Full-width content, ~50/50 columns.** Content fills the viewport minus 280px; each section splits that into `minmax(0,1fr) minmax(0,1fr)`. There is **no narrow centered `max-width` column**.
- **Per-section sticky, not one global panel.** Each `.ArcpSection-Aside` is its own `position:sticky; top:16px`. As you scroll a section, its code panel sticks; at the boundary the next panel takes over. Pure CSS, zero JS.
- **Sidebar doubles as TOC.** The active resource's nav entry expands in place to reveal its object + methods, eliminating the separate right-hand "On this page" rail.
- **Two distinct language controls, distinct jobs.** The **sidebar/rail language chips are NAVIGATION** — selecting Rust re-routes `/python → /rust`, swapping prose + reference content for a different static-per-language artifact. The **code-panel `LangTabs` is a VIEW toggle** — on a page that already carries multi-language samples, it CSS-reveals the already-rendered variant with no navigation. The two are reconciled by one persisted preference (see Code Panel).
- **Inkwell palette, zero new tokens.** Every structural device maps onto an existing token or component class in `main.css`. The code panel is the **`--code-bg` panel** — *light paper in light theme, ink in dark* — never a forced-dark surface.

---

## Architecture & App Shell

This section specifies the **global page architecture**: a `wide:`-gated fixed `100dvh` application shell with three independently-scrolling regions, full-width (non-centered) content, a pinned top navbar, and a per-section two-column grid whose right column is a sticky code panel. It maps Stripe's measured shell onto the existing `DocsLayout.astro` and names exactly what to add, change, and delete.

### The target: a `100dvh` app shell, not a scrolling document

Stripe's `/api` is **not** a document that scrolls the window. Measured at 1440×900: `window.scrollY` stays `0` when you `scrollTo`; `html`/`body` have `overflow:visible` but never actually scroll, because the panes consume the height. We achieve the same *result* with a stricter mechanism — root `overflow:hidden` + `100dvh` — chosen for predictability. Three regions scroll **independently**:

| Region | x-range @1440 | Scroll behavior (desktop) |
|---|---|---|
| Left sidebar | `0–280` | Top zone fixed (~91px); nav tree scrolls internally (`overflow-y:auto`) |
| Top navbar | `280–1440` | **Does not scroll** — pinned to top of the right region (height 56px) |
| Content pane | `280–1440` | Scrolls internally (`flex-1`, height `100dvh − 56px = 844px`, `overflow-y:auto`) |

The content is **full-width**: it fills the viewport minus the 280px sidebar (1160px on a 1440 viewport), with **no narrow centered `max-width` column**. The two per-section content columns split that remaining width ~50/50 (Stripe measured 503 + 503 + gap). We adopt this exact structure, in Inkwell colors.

```
ARCP sidebar width:  280px   (Stripe-measured; replaces the current w-72 = 288px)
ARCP navbar height:   56px   (Stripe-measured; matches the current h-14 = 56px ✓)
```

### Why body scroll is disabled (at desktop)

At `wide:` we disable document scroll so the navbar and sidebar stay put for free, with no scroll-coupled JavaScript and no `position:fixed` overlay hacks. The mechanism:

1. The root is a `grid` pinned to the viewport: `height:100dvh; overflow:hidden`. Nothing can scroll the window because the root is exactly viewport-tall and clips its overflow.
2. **Only the inner panes** (`nav-tree` and `content-pane`) declare `overflow-y:auto`. Scrolling happens inside them.
3. Because the window never scrolls, the navbar — the **first flex child of the right column** — never moves. It does not need `position:fixed`; it is simply *above* the scrolling pane in normal flow, a sibling with its own overflow.

This is strictly better than `position:fixed`:

- **No layout offset bookkeeping.** A `fixed` navbar is removed from flow, so you must pad the content by its height and keep that in sync. Here the navbar occupies real flex space; the content pane gets `100dvh − 56px` via `min-h-0` + `flex-1`.
- **No stacking/`z-index` battles** with the sidebar drawer or sticky code panels.
- **`position:sticky` for the code panel works correctly.** Sticky resolves against the **nearest scroll container** (the content pane), not the window. If the body scrolled, per-section sticky would compute against the window and the panels would not hand off cleanly section-to-section. Disabling body scroll is what makes the per-section sticky behavior possible at desktop.
- **Scroll restoration & deep-linking** are scoped to the content pane; the sidebar keeps its own scroll position across navigations (it can even be hoisted out of the page transition via Astro `transition:persist`).

The one constraint: at `wide:` the root must be exactly `100dvh` and clip overflow. We use `dvh` (dynamic viewport height) so mobile browser-chrome collapse does not create a phantom scrollbar. **Below `wide:`, the lock is lifted and the body scrolls** (see Responsive & A11y).

### Exact CSS / Tailwind structure

#### Root shell — replaces `DocsLayout.astro` lines 21–36

Current:

```astro
<div class="min-h-screen bg-bg text-ink">
  <div class="lg:flex">
    <DocsSidebar … />
    <main class="flex-1 min-w-0 px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
      <slot />
    </main>
  </div>
</div>
```

`min-h-screen` + plain `lg:flex` is a normal body-scroll document: the page grows past the viewport and the window scrolls; the sticky header works only because the *window* scrolls. That is exactly the model we replace at desktop.

Replacement root — a fixed-height grid shell, **locked only at `wide:`**:

```astro
<!-- height-locked app shell at desktop; normal flow below wide -->
<div class="grid grid-cols-1 bg-bg text-ink
            wide:h-[100dvh] wide:overflow-hidden
            wide:grid-cols-[280px_minmax(0,1fr)]
            wide:grid-rows-1">

  <!-- region 1: sidebar — grid track 1 at wide:, fixed drawer below -->
  <DocsSidebar navSections={navSections} pageToc={pageToc} currentLang={currentLang} path={path} />

  <!-- right region: navbar (56px) stacked over the scrolling content pane -->
  <div class="flex min-w-0 min-h-0 flex-col">
    <DocsNavbar currentLang={currentLang} path={path} />   <!-- region 2: 56px, no scroll -->

    <main id="content-pane"
          class="content-scroll min-h-0 flex-1 wide:overflow-y-auto overflow-x-hidden
                 scroll-pt-4 [scrollbar-gutter:stable]"
          tabindex="0" role="region" aria-label="Documentation content">
      <slot />                                              <!-- region 3: the only doc scroller at wide: -->
    </main>
  </div>
</div>
```

**Grid geometry — the brand-zone-above-navbar alignment.** The shell is a **single-row** grid (`wide:grid-rows-1`, `wide:grid-cols-[280px_minmax(0,1fr)]`): track 1 is the full-height **sidebar** (which internally renders its own brand zone at the top, *above* where the navbar's left edge falls), track 2 is the **right region** (navbar stacked over content via the inner flex column). The sidebar visually "spans the navbar's height" because it is a *full-height single column* whose top zone sits at the same Y as the navbar — **not** because it row-spans a two-row template. This is the only geometry expressible by a single-row two-column grid; we pick it explicitly.

Notes:

- `wide:grid-cols-[280px_minmax(0,1fr)]` — exact 280px sidebar + everything else. `minmax(0,1fr)` (not bare `1fr`) lets the content pane shrink so long code lines do not blow out the grid track. Below `wide:` the grid is `grid-cols-1` (single column; the sidebar overlays as a fixed drawer — see below).
- `wide:h-[100dvh] wide:overflow-hidden` on the root — the reason the window never scrolls **at desktop**. Both are `wide:`-gated so the body scrolls below 1280.
- `min-h-0` on both the right flex column and `<main>` — without it, `flex-1` children refuse to shrink below content size and `overflow-y:auto` never engages. This is the single most common bug in this layout; call it out in code review.
- `scroll-pt-4` (`scroll-padding-top:1rem`) — deep-link anchors land 16px below the navbar instead of flush under it.
- `[scrollbar-gutter:stable]` — reserves the scrollbar so the 50/50 grid does not reflow when the pane gains a scrollbar.
- `tabindex="0"` + `role="region"` + `aria-label` make the pane keyboard-scrollable (WCAG 2.1.1 — see Responsive & A11y).

`<main>` loses its old padding (`px-5 py-8 … lg:px-12`); content is now full-width and padding is applied per-section.

> **Note on the breakpoint:** the shell's three structural knobs flip at a custom **`wide:` (1280px)** screen, not Tailwind's default `lg:` (1024px) — see Responsive & A11y. The `100dvh`/`overflow-hidden` lock is **desktop-only**.

#### Sidebar — change `DocsSidebar.astro` root

The current sidebar sits *below* a 56px (`top-14`) sticky header and is `h-[calc(100vh-3.5rem)]`, scrolling as **one** unit (including the language picker). In the new shell the sidebar is a **full-height column** with its brand zone at the very top-left (above the navbar's left edge), split into a **fixed top zone** + a **scrolling nav tree**. It is `position:static` (grid track 1) at `wide:` and a `position:fixed` translate-drawer below `wide:`:

```astro
<aside id="docs-nav"
  class="fixed inset-y-0 left-0 z-40 w-70 -translate-x-full transition-transform duration-200
         flex h-[100dvh] flex-col overflow-hidden border-r border-line bg-bg
         wide:static wide:z-auto wide:translate-x-0 wide:h-auto">

  <!-- BRAND/SEARCH ZONE — fixed, does not scroll (Stripe ~91px) -->
  <div class="shrink-0 border-b border-line">
    <!-- ARCP wordmark + caret · "Find anything /" search trigger · Ask AI -->
  </div>

  <!-- LANGUAGE ZONE — fixed (the existing LANG_ITEMS chips + mobile <select>) -->
  <div class="shrink-0 border-b border-line">…</div>

  <!-- NAV TREE — the only part of the sidebar that scrolls -->
  <nav id="docs-nav-tree"
       class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4"
       tabindex="0" role="region" aria-label="Navigation">
    … grouped tree …
  </nav>
</aside>
```

**Position contract (explicit).** At `wide:` the sidebar is `position:static` and **occupies grid track 1** (the 280px column held open by the explicit `280px` track) — `wide:static wide:translate-x-0` re-enters flow, so the track does *not* collapse and the element does *not* double-render. Below `wide:` it is `position:fixed` + `-translate-x-full` (off-canvas drawer) and the **root grid collapses to `grid-cols-1`** (the fixed element is out of flow, so there is no empty 280px track to hold). The `wide:h-auto` lets the static cell take its grid-track height; the `h-[100dvh]` governs only the fixed drawer.

Changes vs. current:

- `w-72` → **`w-70`** (288px → 280px) for audit parity and the grid track.
- `fixed lg:sticky top-14` → `fixed … wide:static` + `h-[100dvh]` (drawer) / `wide:h-auto` (cell): the sidebar is now grid track 1, top-aligned (no `top-14`). The brand zone occupies the top-left corner *above* the navbar line.
- `overflow-y-auto` moves off the `<aside>` onto the inner `<nav id="docs-nav-tree">` — only the tree scrolls; brand/search/language are pinned (Stripe's ~91px fixed top zone). Add `overscroll-contain` so wheel/touch momentum doesn't chain to the content pane.
- `z-30` → `z-40` so the mobile drawer overlays the navbar.
- The existing active-row `scrollIntoView({block:'nearest'})` (DocsLayout script) must now target `#docs-nav-tree` (the scroller), not the window.

#### Navbar — new `DocsNavbar.astro`, replaces the docs role of `AppHeader.astro`

`AppHeader.astro` is a `sticky top-0 … max-w-[80rem] mx-auto h-14 backdrop-blur` header — centered to 80rem and dependent on window scroll. In the app shell it is **neither sticky nor centered**; it is a fixed-height flex row at the top of the right region:

```astro
<header class="flex h-14 shrink-0 items-center justify-between gap-4
               border-b border-line bg-bg px-4 md:px-6">
  <!-- LEFT: hamburger (mobile) · language selector · section switcher -->
  <div class="flex min-w-0 items-center gap-3">
    <button id="docs-menu-btn" aria-controls="docs-nav" aria-expanded="false"
            aria-label="Open navigation" class="… wide:hidden">☰</button>
    <LanguageSelector currentLang={currentLang} />   <!-- Stripe "version pill" → ARCP SDK lang -->
    <SectionSwitcher path={path} />                  <!-- Stripe "API Reference" product switcher -->
  </div>
  <!-- RIGHT: Docs · Spec · GitHub · ThemeToggle (Inkwell, kept) -->
  <nav class="flex items-center gap-1 font-mono text-small sm:gap-2"> … </nav>
</header>
```

- `h-14` (56px) — matches Stripe and the current header height; keep it.
- **No `sticky`, no `max-w-[80rem] mx-auto`, no `backdrop-blur`.** It is a flex child occupying the top 56px of the right column; it stays pinned because the *content pane below it* scrolls, not the window. Dropping `backdrop-blur` is fine — nothing scrolls under it. (Inkwell tokens only: `bg-bg border-b border-line`.)
- The hamburger event bridge (`toggle-nav` CustomEvent) carries over unchanged — keep the drawer mechanics.

`AppHeader.astro` itself stays for the home page and non-docs routes; only `DocsLayout` swaps it for `DocsNavbar`. ARCP has no API version (`2026-05-27.dahlia`) and no product catalog, so the navbar's left slot carries SDK-language context and the Docs/Spec switch — same position as Stripe's product-switcher/version-pill, different meaning. The **persisted code-lang preference seeds this navbar's `Docs` link** (and the bare-`/docs` redirect) — see Code Panel.

#### Per-section grid — `ArcpSection.astro` (new), rendered inside `<slot/>`

```astro
<section class="grid grid-cols-1 gap-10 border-b border-line px-6 py-10 lg:px-10
                wide:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
  <div class="ArcpSection-Main min-w-0">
    <slot name="main" />          <!-- prose + attribute/parameter lists -->
  </div>
  <aside class="ArcpSection-Aside min-w-0 wide:sticky wide:top-4 wide:self-start">
    <slot name="aside" />         <!-- the --code-bg code panel -->
  </aside>
</section>
```

- `wide:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]` — the ~50/50 split.
- **`wide:sticky wide:top-4 wide:self-start`** — `top-4` = `top:16px` (Stripe's measured value). `self-start` is mandatory: a grid item defaults to `stretch`, which makes it full-section-height and **kills sticky** (a sticky element only travels within space its own box does not already fill). With `self-start` the aside is content-height and free to stick.
- The sticky container resolves against `#content-pane` (the nearest scrollable ancestor) — which is why disabling body scroll at desktop is load-bearing.
- Below `wide`, `grid-cols-1` stacks: code panel drops under its prose, no sticky. DOM order is **prose-then-code** so single-column flow renders the panel below its prose naturally. **Never use CSS `order` to swap columns** — it desyncs visual sequence from tab/reading order and breaks keyboard nav and screen-reader flow when the layout collapses.

### Per-section sticky hand-off (why it's per-section, not one global panel)

Stripe's right rail is **not** a single global sticky panel. Each `.ApiSection-Aside` is its own `position:sticky; top:16px`. As you scroll a section's prose, that section's code panel sticks at 16px; when the next section scrolls up, the **previous panel scrolls away with its section** and the **next panel takes over** the sticky slot. This is pure CSS — N independent sticky elements, each bounded by its own section's box — with **zero JavaScript**.

We replicate exactly this. The hand-off is automatic because each aside can only stick within its own `<section>`'s height; once that section is fully scrolled past, its aside un-sticks and the next one's begins. The driving column is `.ArcpSection-Main` (left): it sets the section's height, so a long-prose section gives its code panel a long sticky travel and a short section hands off quickly. No min-heights needed.

Contrast with a naïve "one giant fixed code panel": that would require JS to swap contents on scroll (IntersectionObserver per section), would fight deep-linking, and would not animate the natural scroll-away.

### Acceptance checks (definition of done for the shell)

1. **(desktop, ≥1280 only)** `window.scrollY === 0` after `window.scrollTo(0, 5000)` on any docs page — the body does not scroll; the content pane does. Gate this assertion to `matchMedia('(min-width: 1280px)')`.
2. **(tablet/mobile, <1280)** the **body DOES scroll** the long single-column document, and **no inner pane traps the scroll** (the content pane is `static`/un-clipped below `wide:`; only the drawer-open lock applies).
3. Scrolling content does **not** move the navbar or the sidebar (desktop).
4. Sidebar nav tree scrolls independently; brand/search/language zone stays pinned (desktop).
5. Within a section, the code panel sticks at exactly `16px` from the top of `#content-pane`; at the section boundary the next section's panel takes over (no JS).
6. Content spans the full width minus 280px; the two columns are ~50/50; there is no centered narrow `max-width` wrapper.
7. Navbar is exactly 56px; sidebar exactly 280px.
8. Deep-link anchors land 16px below the navbar (`scroll-pt-4`), not under it.
9. No `position:fixed` on the navbar; it is pinned purely by the flow-based shell.

Relevant files: `/Users/nficano/code/arpc/site/src/layouts/DocsLayout.astro`, `/Users/nficano/code/arpc/site/src/components/DocsSidebar.astro`, `/Users/nficano/code/arpc/site/src/components/AppHeader.astro`, `/Users/nficano/code/arpc/site/src/styles/main.css`.

---

## Navigation & Information Architecture

This section specifies the left sidebar — the fixed brand/search/AskAI/language top zone and the scrollable grouped nav tree beneath it — and defines ARCP's information architecture by analogy to Stripe's groups. The central borrowed move: the sidebar **doubles as the per-page TOC**: the current resource's nav entry expands in place to reveal its object + methods, which eliminates the separate right-hand `DocsToc.astro` rail. Everything maps onto the existing `DocsSidebar.astro` + `src/lib/docs-nav.ts` machinery.

### Sidebar zones

The sidebar is a two-zone flex column (specified structurally in the App Shell section): a fixed top region (brand + search + Ask AI + language) that stays pinned, and the scrolling nav tree below it.

```
SIDEBAR — width 280px
┌─ aside#docs-nav ───────────────────────┐  full height; flex column; border-r; bg-bg
│ ┌─ TOP ZONE (fixed, shrink-0) ─ ~96px ─┐ │  h-14 brand row matches old header
│ │  brand row  (ARCP wordmark + caret)  │ │
│ │  [ Find anything…        /  ]  search│ │  trigger button (search → modal)
│ │  [ Ask AI ✦ ]                  AskAI │ │  future work (stub)
│ ├──────────────────────────────────────┤ │
│ │  LANGUAGE  ▾  (chips lg / select sm) │ │  the existing language switcher (NAVIGATION)
│ └──────────────────────────────────────┘ │
│ ┌─ NAV TREE (flex-1, overflow-y-auto)──┐ │  THE ONLY part that scrolls
│ │  Overview / Authentication / …       │ │  ungrouped concepts
│ │  CORE · CONTROL · CAPABILITIES …     │ │  uppercase group headers
│ │  active resource expands → in-page TOC│ │
│ └──────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

### Fixed top zone: brand + search + Ask AI

Stripe's top zone (~91px) holds the **wordmark + "API" badge**, a **"Find anything /" search trigger** (Algolia modal; `/` hotkey), and an **"Ask AI"** button. ARCP today has none of this in the sidebar — the wordmark + blinking caret live in the global `AppHeader.astro`. We relocate the brand into the sidebar top zone and add the search trigger + Ask AI:

```astro
<div class="shrink-0">
  <div class="flex h-14 items-center gap-3 border-b border-line px-4">
    <a href="/" class="inline-flex items-center font-mono text-[1.02rem] font-semibold tracking-[0.04em] text-ink no-underline">
      {SITE.name}<span class="arcp-caret"></span>
    </a>
  </div>

  <div class="px-3 pt-3">
    <button id="docs-search-trigger" type="button" aria-haspopup="dialog" aria-keyshortcuts="/"
      class="flex w-full items-center gap-2 rounded border border-line bg-paper px-3 py-2
             text-small text-muted transition-colors hover:border-accent-dim hover:text-ink">
      <svg width="14" height="14" …>{/* magnifier */}</svg>
      <span class="flex-1 text-left">Find anything</span>
      <kbd class="rounded border border-line px-1.5 py-0.5 font-mono text-mini text-faint">/</kbd>
    </button>
  </div>

  <div class="px-3 pt-2 pb-3">
    <button id="docs-askai-trigger" type="button"
      class="flex w-full items-center gap-2 rounded px-3 py-1.5 text-small text-ink-soft
             transition-colors hover:bg-paper hover:text-ink">
      <span class="text-accent" aria-hidden="true">✦</span>
      <span>Ask AI</span>
    </button>
  </div>
</div>
```

`SITE.name` + `.arcp-caret` are reused verbatim from `AppHeader` so the wordmark and blinking caret are identical — no brand redraw. The search trigger uses `bg-paper`/`border-line`/`text-muted`; the Ask AI glyph uses `--accent`. No Stripe blurple. (The search trigger and the kbd `/` are **net-new** elements built only from existing tokens — consistent with `www`, not pixel-fidelity to a thing `www` never had.)

> **Search & Ask AI are future work.** There is **no search in the site today** — no Algolia, no index. Ship the **trigger button + empty modal shell now** so the top-zone layout is stable; defer the backend. Recommended: **Pagefind** (the natural fit for a static Astro build — no hosted service, indexes the built `dist/` at postbuild, ships a self-contained UI). Use the native `<dialog>` element (`showModal()` gives focus-trap + Esc + backdrop for free); reserve the ids `docs-search-trigger` / `docs-search-modal` now. Add `pagefind --site dist` as a `postbuild` step; lazy-import `/pagefind/pagefind-ui.js` on first open. Constrain its UI to Inkwell via Pagefind CSS vars (`--pagefind-ui-background: var(--paper)`, `--pagefind-ui-primary: var(--accent)`, mono font). **Per-language scoping:** because the 11 SDKs are near-duplicate surfaces, index each page with `data-pagefind-filter="lang"` and default the modal to the current language with a "search all languages" toggle. Ask AI is likewise a stub (opens the same modal in an "ask" tab; no backend specified here). **Inert-affordance decision (apply consistently with Open questions):** because a dead control reads as broken, the trigger ships **disabled with a "soon" affordance** until the Pagefind follow-up lands, OR is omitted entirely — not shown as a live-looking control that does nothing.

```
SEARCH (future work — trigger ships now, index later)
┌─ #docs-search-trigger (in top zone) ──────┐
│  [ 🔍  Find anything…            /  ]      │  hotkey: '/' focuses+opens
└──────────────┬───────────────────────────┘
               ▼ opens
┌─ dialog#docs-search-modal (portal, z-50) ─┐  bg-bg/95 backdrop-blur; --paper card
│  ┌─ input  (autofocus) ─────────────  Esc┐ │
│  │ search the docs…                      │ │
│  └────────────────────────────────────────┘ │
│  ┌─ results (pagefind UI, grouped by lang)─┐ │
│  │  Python › Runtime › start()            │ │  ↑/↓ navigate, ↵ go, Esc close
│  │  Spec   › Wire Protocol › Frame        │ │
│  └────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

### Language zone (kept) — the primary mode selector, NAVIGATION

Stripe's "client libraries / curl" global toggle maps to ARCP's **SDK-language switcher across 11 SDKs + the spec view**. This is the reader's *primary* mode and it is **navigation**: picking a language re-slices the entire docs tree (prose + reference content), not just code panels — it re-routes `/python → /go` to a **different static-per-language artifact**. This block already exists in `DocsSidebar.astro` and is kept essentially verbatim — the `LANGUAGE` label, the `lg:flex` chip row driven by `LANG_ITEMS` (12 entries: 11 SDKs + `spec`), and the `lg:hidden` `<select>` fallback — as the second fixed zone below brand/search/AskAI. Two reconciliations:

- The sidebar chip is **navigation**; the code-panel `LangTabs` is a **view toggle** (Code Panel section). They are not the same writer of state: the chip changes the URL; the toggle flips CSS on the current page. They are linked only through one persisted preference (`arcp:code-lang`), which seeds the navbar `Docs` link and the default code-panel view but does **not** trigger navigation.
- Keep `rel="nofollow noreferrer"` on the chips: the 12 cross-language roots are near-duplicate API surfaces; we do not want crawlers treating each SDK slice as 11× the canonical content.

### Information architecture: concepts + domain groups

Map Stripe's two-tier IA onto ARCP. Stripe = a top **ungrouped concepts/guides list** followed by **uppercase domain GROUPS** of resources. ARCP's analogue, adapted from a REST API to a *protocol + SDK*:

```
LANGUAGE: ● Python  ○ Go  ○ Rust  …  ○ Spec        ← fixed zone (navigation)
─────────────────────────────────────────────────  ← scroll boundary
                                                       ungrouped concepts
  Overview                                             (Stripe "Introduction")
  Installation                                         (Stripe "BASE URL" → pkg one-liner)
  Authentication & Handshake                           (Stripe "Authentication")
  Sessions & Lifecycle                                 (protocol-specific)
  Errors                                               (Stripe "Errors")
  Streaming                                            (resumable event streams, NOT list pagination)
  Idempotency & Request IDs                            (Stripe "Idempotent requests")
  Versioning                                           (Stripe "Versioning")
                                                       ── uppercase group headers ──
  CORE                                                 (Stripe "Core Resources")
    Agent · Runtime · Session [v2] · Task · Channel      resource → object + methods
  CONTROL
    Command · Signal · Policy
  CAPABILITIES
    Tool · Resource · Memory
  TRANSPORT
    Frame · Envelope · Stream
  ─────────────────────────────────────
  SPECIFICATION  (only when lang === 'spec')
    Message Formats · Wire Protocol · State Machine
```

The REST→ARCP mapping (apply consistently): a Stripe **resource → object + endpoints** becomes an ARCP **SDK type/concept → its methods + fields**, OR (in the `spec` slice) a **protocol section → its messages + fields**. "Installation" replaces Stripe's "BASE URL" with a per-language package-manager one-liner; "Authentication & Handshake" replaces "Authentication" (ARCP has no secret keys — it's a connection handshake, not an API key).

**Streaming is NOT list pagination.** Stripe's "Pagination" is a list-envelope over a stateless GET (`{object:'list', has_more, data:[]}`). ARCP has no such offset/cursor list model; its streaming is **resumable, sequenced Event frames** with monotonic `seq` and resume-after-drop via `last_seq` (Start Page §5). We therefore name the concept **"Streaming"** (not "Streaming & Pagination") and **do not** import Stripe's `has_more` list envelope as its wire shape. If specific SDK list methods genuinely paginate, *those* methods — and only those — may use a list envelope; the streaming concept does not.

#### Where groups come from — reconciling with machine-generated content

This is the load-bearing reconciliation. ARCP docs are **not** authored with this clean two-tier shape. They are ~2,286 machine-generated files (kotlin ≈ 1,049, typescript ≈ 793) under `src/content/docs/<lang>/`, with **no frontmatter** — titles come from the first H1 (`firstH1`, `docs-nav.ts`) — built by `buildNavTree` into a deep `NavItem[]` tree and sliced per-language by `langNavFor`. There are no uppercase domain groups; "Core Resources" et al. do not exist in the file tree.

**Critical correction — the generated tree is TypeDoc-shaped, so the clean two-tier IA does NOT fall out of the existing files.** The audited generated leaves are PascalCase type names under `interfaces/`, `functions/`, `classes/` (e.g. `interfaces/ARCPClientOptions`, `functions/subscribeEnvelopes`) — **not** lowercase concept slugs like `agent`, `runtime`, `session`. `groupLangNav` resolves manifest members by leaf slug via `byLeaf = new Map(items.map(n => [lastSegment(n.path), n]))`; against the real tree, a manifest keyed `['agent','runtime',…]` matches **nothing**, and every node falls through to the `API REFERENCE` catch-all. State this plainly:

> **The `CORE`/`CONTROL`/`CAPABILITIES`/`TRANSPORT` grouping applies only to a curated concept layer that does not yet exist in the generated tree.** Until a curation pass adds hand-authored concept pages (with matching leaf slugs) or the manifest is keyed by the *real* generated paths/titles, the entire generated tree renders under a single `API REFERENCE` group. The two-tier IA is a *target*, populated incrementally — not an emergent property of the current files.

Two-layer strategy:

1. **Curated concept/guide ordering (top, ungrouped) + group manifests.** Add a small hand-maintained `src/lib/nav-groups.ts` keyed by lang, listing concept slugs in IA order (with display overrides) and ~4 group headers × ~5 promoted members. These are *small* lists. **Each member must be keyed by a real generated leaf path/title** (verified against the actual tree) **or** point at a curated concept page that has been authored; members that match nothing are simply dropped (graceful no-op), they do not fabricate rows.

   ```ts
   // src/lib/nav-groups.ts
   export const CONCEPTS: Record<string, { path: string; title?: string }[]> = {
     _default: [
       { path: 'overview' }, { path: 'installation' },
       { path: 'authentication', title: 'Authentication & Handshake' },
       { path: 'sessions' }, { path: 'errors' },
       { path: 'streaming' }, { path: 'idempotency' }, { path: 'versioning' },
     ],
   };
   // Members are real generated leaf slugs (verify against the tree) OR authored concept pages.
   export const GROUPS: Record<string, { id: string; label: string; members: string[] }[]> = {
     _default: [
       // e.g. { id:'core', label:'CORE', members:['ARCPClient','ARCPClientOptions',…] } once verified
     ],
   };
   ```

2. **Auto-grouped long tail (bottom).** After placing curated concepts and any verified grouped resources, all remaining `langNavFor` children fall through into a trailing **`API REFERENCE`** uppercase group (or, for huge SDKs, keep the generator's `api/` subtree intact under that header). This is the *default reality* today: with empty/unmatched `GROUPS`, an SDK renders as `[curated concepts that matched] + "API REFERENCE" (the raw deduped tree)`. The `spec` slice gets its own `SPECIFICATION` group.

A new pure function in `docs-nav.ts` performs the regroup, consuming the existing deduped output so all current invariants survive:

```ts
// src/lib/docs-nav.ts  (new; runs AFTER dedupe, at build time)
export type NavSection =
  | { kind: 'concepts'; items: NavItem[] }
  | { kind: 'group'; id: string; label: string; items: NavItem[] };

export function groupLangNav(items: NavItem[], lang: string): NavSection[] {
  const byLeaf = new Map(items.map((n) => [lastSegment(n.path), n]));
  const claimed = new Set<string>();
  const concepts = (CONCEPTS[lang] ?? CONCEPTS._default)
    .map((c) => { const n = byLeaf.get(c.path); if (n) { claimed.add(n.path);
                  return { ...n, title: c.title ?? n.title }; } })
    .filter(Boolean) as NavItem[];
  const groups = (GROUPS[lang] ?? GROUPS._default).map((g) => ({
    kind: 'group' as const, id: g.id, label: g.label,
    items: g.members.map((m) => byLeaf.get(m)).filter(Boolean)
      .map((n) => (claimed.add(n!.path), n!)) as NavItem[],
  })).filter((g) => g.items.length);   // empty/unmatched groups vanish — no fabricated rows
  const rest = items.filter((n) => !claimed.has(n.path));
  return [
    { kind: 'concepts', items: concepts },
    ...groups,
    ...(rest.length ? [{ kind: 'group' as const, id: 'api', label: 'API REFERENCE', items: rest }] : []),
  ];
}
```

Critically, **all existing `dedupe`/`normalizeTitle` logic stays upstream and unchanged**: drop duplicate index children, collapse redundant single-child `Documentation` / `…/api` wrappers, normalize generator-driven labels. `groupLangNav` only *re-buckets* the already-clean `NavItem[]` — it never re-parses files or fights the generator. The `DocsLayout` props gain `navSections: NavSection[]` (computed via `groupLangNav(langNavFor(tree, lang), lang)`), replacing the raw `langNav: NavItem[]` prop.

### The expand-into-TOC behavior (replaces `DocsToc`)

The single most important borrowed behavior. In the audit, **when a resource is the current page, its nav entry expands to reveal its sub-entries, which double as the page's table of contents** — so there is **no separate "On this page" rail**. ARCP today has exactly that separate rail: `DocsToc.astro`, built from `buildToc(headings)` and rendered as a third column. We **delete the third column** and fold its content into the active sidebar row.

The mechanism reuses the existing two-level expand machinery in `DocsSidebar` (parent `<a>` + `nav-toggle` chevron button + `nav-children <ul>`) and the active-trail-open default (`isOpen = isActive`). The change: for the **active resource only**, its `children` are not the generator's sub-pages but the **current page's H2/H3 headings** (the object section + one entry per method), as anchor links into the single-URL stacked-section page.

```astro
{/* inside the active resource's <li> */}
<ul class="nav-children ml-3 mt-0.5 mb-1 space-y-0.5 border-l border-line pl-3" data-group={item.path}>
  {pageToc.map((h) => (
    <li>
      <a href={`${item.path}#${h.id}`} data-toc-anchor={h.id} data-depth={h.depth}
         class:list={[tocLinkClass(h.id), h.depth === 3 && 'pl-3 text-faint']}>
        {h.text}
      </a>
    </li>
  ))}
</ul>
```

Wiring:

- The active page passes its `headings` (Astro `render()` output) → `buildToc` → into `DocsSidebar` as `pageToc: TocLink[]`. The component branches: render `pageToc` as children **for the active leaf**, render generator `item.children` for every other node. `buildToc` (unchanged) already produces the 2-level H2/H3 tree; only its consumer moves from `DocsToc` to `DocsSidebar`.
- **Scrollspy** replaces `DocsToc`'s highlight. Add an `IntersectionObserver` in the `DocsLayout` `<script>` that watches `<main>` section headings and toggles `data-active` on the matching `[data-toc-anchor]` row, reusing the existing `aria-current` + active classes (`bg-paper text-accent font-medium`) so the TOC row highlight is visually identical to a nav-active row. The "keep active row in view" `scrollIntoView({block:'nearest'})` now also fires on scrollspy changes, scoped to `#docs-nav-tree`.
- **Single-URL vs. one-file-per-method fallback.** This presupposes the resource page renders as one URL with a vertical stack of sections. For ARCP's machine-generated pages that are currently one file per method, the expand falls back to rendering child **routes** (the generator's existing behavior) — the sidebar still shows sub-page links, doubling as a section map. Pages migrated to the stacked single-URL model get true in-page TOC anchors. The component supports both: if `pageToc.length`, use anchors; else use `item.children` routes.

Net deletions: remove `DocsToc.astro` from `DocsLayout.astro` (the third column) and drop its import. `<main>` reverts from a 3-column grid to the scrolling pane (the per-section two-column prose+code grid lives *inside* `<main>`). `buildToc` survives; only its render site changes. (`DocsToc` may be **retained as a per-route option** for long-form narrative `/spec/...` prose where a true "On this page" rail reads better — a layout switch, not a global deletion.)

### Inline badges, active-trail, scroll-into-view

**Inline badges.** The audit shows a small "v2"-style pill appended to a resource name. ARCP's analogue: protocol-version/stability pills on resources whose method set changed across spec revisions, or `beta`/`deprecated` markers. Render as a token-styled `<span>` inline after the title:

```astro
{item.badge && (
  <span class="ml-1.5 inline-flex items-center rounded-full border border-line
               px-1.5 py-0 font-mono text-[0.625rem] leading-4 text-accent-dim align-middle">
    {item.badge}
  </span>
)}
```

`NavItem` gains an optional `badge?: string`, populated from the `GROUPS` manifest (e.g. `{ path:'session', badge:'v2' }`) — *not* parsed from machine content (the generator emits no such metadata). Pill colors use `--accent-dim` / `--line` only. The **same pill component is reused** on attribute/parameter rows — define it once as `src/components/NavBadge.astro` (shared with the reference-row `RefBadge`).

**Active-trail.** Keep the existing `isActive`/`isOpen` logic verbatim: the active row gets `bg-paper text-accent font-medium` + `aria-current="page"`, and its parent group auto-opens. Extend it to also open the **section group** (`CORE`, `CONTROL`, … / `API REFERENCE`) containing the active resource via a parallel `data-group-active` on the `NavSection` header. Group headers are non-link `<p>` labels (`.label` styling — `font-mono text-mini tracking-label uppercase text-muted`), optionally collapsible via a chevron mirroring the existing `nav-toggle` button.

**Active-row scroll-into-view.** Keep the `scrollIntoView({block:'nearest'})` — now scoped to the inner scrolling `#docs-nav-tree`. Extend it to also fire from the scrollspy `IntersectionObserver` so the active *TOC* row stays visible as the reader scrolls a long stacked-section page.

---

## Reference / Resource Page Content Model

This section specifies how a Stripe-style "object + endpoints" reference page is built **for ARCP's machine-generated SDK docs**, and where that ambition has to be cut. The governing fact: ARCP reference pages are **not hand-authored REST endpoints** — they are TypeDoc/sibling-tooling output already living at `src/content/docs/<lang>/api/**`. The good news, confirmed by reading the actual files: **the generated markdown already emits a Stripe-shaped skeleton**; most of this section is about *styling the skeleton that exists* and reserving the full split for curated pages. (These files are `.md` rendered by Astro's built-in markdown, **not** Markdoc, so the projection happens in a **rehype pass**, not Markdoc tags.)

### What the generated content actually is (ground truth)

Two representative files set the constraints. An **interface** (`api/.../interfaces/ARCPClientOptions.md`):

```
# Interface: ARCPClientOptions
## Properties
### authScheme
> **authScheme**: `"bearer"`
Auth scheme to use. v1.0 supports `"bearer"` only.
***
### autoAck?
> `optional` **autoAck?**: `boolean` \| [`ClientAutoAckOptions`](…)
v1.1 §6.5 — automatic `session.ack` emission…
#### agents?          ← nested child attribute (one extra heading level)
> `optional` **agents?**: `string`[] \| `object`[]
***
```

A **function** (`api/.../functions/subscribeEnvelopes.md`): `# Function: subscribeEnvelopes()` → a `>` signature blockquote → prose → `## Parameters` → `### type` → `## Returns`. (Returns here is a single ~4,000-char inlined union — a real failure mode, see below.)

Mapping onto Stripe's anatomy is almost one-to-one:

| Stripe construct | TypeDoc emission (already present) | Status |
|---|---|---|
| "The `<Resource>` object" section | `# Interface:`/`# Class:`/`# Type Alias:` + intro prose | **free** |
| "Attributes" (H3) list | `## Properties` → `### name` rows | **free** |
| Attribute **row name** (mono) | `### authScheme` heading text | **free**, needs styling |
| **type label** | the `` `"bearer"` `` / `` `boolean` `` in the `>` line | **free**, needs a parser |
| **Required/Optional** badge | `?` suffix + literal `` `optional` `` token in the `>` line | **free**, needs a parser |
| **Deprecated / readonly** badge | `` `readonly` `` token; `@deprecated` → TypeDoc callout | **free**, needs a parser |
| **description** `<p>` | prose paragraph after the `>` line | **free** |
| **nested child attributes** | `#### child` headings | **free**, needs grouping |
| **inline enum values** | `` `"a"` \| `"b"` `` union in the type label | **free**, needs styling |
| divider between rows | the literal `***` (`<hr>`) | **free**, restyle to `--line` |
| **Parameters** / **Returns** | `## Parameters` / `## Returns` | **free** |
| permalink anchor on hover | rehype slug IDs on `### name` | **free**, needs the hover icon |
| friendly "Returns a `<type>`." prose | **nothing** — `## Returns` emits a *type*, not a sentence | **needs curation** |
| "More attributes / Expand all" | **nothing** — TypeDoc emits one flat list | **needs generation/sync change** |
| common-vs-advanced ordering | **nothing** — alpha order only | **needs generation/sync change** |
| method+path / signature pill | the `>` blockquote is the signature, unstyled | **needs styling**, data is free |
| request + RESPONSE code panel | **nothing** in TypeDoc | **needs curation** |

**Conclusion that drives the rest:** the row/section *structure* is free; the *common-vs-advanced split*, the *friendly Returns prose*, and the *code panel* are not. We project styling onto generated prose now, and reserve the true object+endpoints split (and the prose niceties) for curated pages.

### The projection mechanism: a rehype pass, not new authoring

Because SDK docs are sync-imported and re-generated every build, we cannot hand-wrap rows in components. We add **one rehype plugin** (`rehype-arcp-reference.mjs`) to the markdown pipeline in `astro.config.mjs`, gated to `api/**` paths, that rewrites the already-parsed HAST into the row/section shape below. This keeps the generator untouched and survives re-syncs. Per page it:

1. Detects a **reference page**: first child is an `<h1>` starting `Interface:`/`Class:`/`Type Alias:`/`Function:`/`Variable:`. Tags `<article>` with `data-reference` and `data-kind`.
2. Wraps each `## Properties` / `## Parameters` / `## Methods` / `## Returns` + following siblings (up to the next H2) into `<section class="ref-section">`.
3. For each `### name`, swallows the following `> signature` blockquote, `Defined in:` line, description paragraph(s), any `####` children, and trailing `***`, into one `<li class="ref-row" data-testid="reference-element">`.
4. **Parses the signature line** into structured fields: `optional`/`readonly`/`required`, the type label, an enum-union flag. This is the only "intelligence" required and it is pure string work on a stable TypeDoc format.
5. Moves `Defined in:` into a small `<a>` at the row's right edge (the "source" link).

Curated-page authors get the *same* components as Astro components (`<RefSection>`, `<RefRow>`) so curated and generated pages render identically.

### Page content model (the section stack)

A reference page is a vertical stack of `ref-section` blocks, keyed to SDK kinds rather than REST verbs:

```
┌─ ref-page (data-reference, data-kind="interface") ──────────────────┐
│  H1   "Interface: ARCPClientOptions"   ← object/type title          │
│  ┌ SignaturePill (the import/construct line) ────────────────────┐  │
│  │ import { ARCPClientOptions } from "@arcp/client"      [copy]   │  │
│  └────────────────────────────────────────────────────────────────┘  │
│  intro prose (the type's summary paragraph)                          │
│                                                                      │
│  § Properties / Attributes ────────────────────────────── [Expand all]│
│    ref-row  authScheme   string · "bearer"        ‹Required›         │
│    ref-row  client       object                   ‹Required›  ▸      │
│    ref-row  token?       string                   ‹Optional›         │
│    ─── More attributes (collapsed long tail) ───────────────────────│
│    ref-row  logger?      Logger                   ‹Optional›         │
│                                                                      │
│  § Methods   (one ref-section per method, for classes) ─────────────│
│    H3  connect()    one-line description                             │
│    § Parameters … [Expand all]   |   § Returns: Promise<Session>     │
└──────────────────────────────────────────────────────────────────────┘
```

The **"object" section** = an interface/type-alias's `## Properties`; the **"one section per endpoint"** = a class's `## Methods`, each method getting its own `## Parameters` + `## Returns`. A **type-alias** page is object-only; a **function** page is endpoint-only.

**Empty-state and Returns normalization (what the pipeline can vs. cannot produce):**

- **`No parameters.`** IS derivable: the pass normalizes a missing/empty `## Parameters` to a single row reading `No parameters.` in `.ref-empty` (`font-mono text-small text-faint`). Keep this.
- **The friendly `Returns a <type>.` one-liner is NOT derivable** for generated pages. TypeDoc's `## Returns` emits a *type label* (often the 4,000-char megablob), not a prose sentence. So on generated pages the **Returns row is the (possibly collapsed) type label** — `Returns:` `<code>Promise<Session></code>` — **not** a hand-written "Returns a session object." sentence. The friendly prose form is **curated-only** (authors write it on `RefSection`/`RefRow` pages); do not imply the generated pipeline produces Stripe-style Returns prose.

### Attribute / Parameter ROW — the reusable component

The load-bearing component. Both the rehype pass (generated) and `RefRow.astro` (curated) emit **identical HTML**:

```html
<li class="ref-row group" id="autoAck" data-testid="reference-element" data-optional>
  <div class="ref-row__head">
    <a class="ref-row__anchor opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
       href="#autoAck" aria-label="Copy link to autoAck">#</a>
    <h4 class="ref-row__name">autoAck</h4>
    <span class="ref-row__type">boolean | ClientAutoAckOptions</span>
    <span class="ref-row__badge ref-row__badge--optional">Optional</span>
    <a class="ref-row__src" href="https://github.com/.../types.ts#L50" title="Source">↗</a>
  </div>
  <div class="ref-row__body">
    <p>v1.1 §6.5 — automatic <code>session.ack</code> emission…</p>
    <button class="ref-row__expand" aria-expanded="false" aria-controls="autoAck-children">
      Show child attributes
    </button>
    <ul id="autoAck-children" class="ref-row__children" hidden>
      <li class="ref-row ref-row--child"> … #### agents? … </li>
    </ul>
  </div>
</li>
```

(The `ref-row` anatomy — hover permalink anchor, source ↗, expand control — is **net-new**: `www` had no such element. It is assembled from existing tokens, so it is *consistent with* `www`, not pixel-identical to it.)

#### Anatomy → token mapping

| Part | Element | Inkwell styling |
|---|---|---|
| **name** (mono) | `.ref-row__name` (`<h4>`, keeps slug ID) | `font-mono text-ink font-medium text-[0.95rem]` |
| **hover permalink anchor** | `.ref-row__anchor` | `font-mono text-faint`, `opacity-0` → reveal on hover/`focus-within`; `hover:text-accent`. **Always in tab order** — never `display:none`. |
| **type label** | `.ref-row__type` | `font-mono text-small text-muted` |
| **enum value** in type | `.ref-row__type .enum` | `.tok-str`/`.tok-punc` (`text-str` literal, `text-faint` `\|`) |
| **link types** | `<a>` already in markdown | `text-ink-soft border-b border-line hover:border-accent hover:text-accent` |
| **badge** | `.ref-row__badge` | base `font-mono text-micro tracking-mono-wide uppercase` in a `--faint` pill (single contract — see below) |
| **description** | `.ref-row__body p` | `text-ink-soft text-[0.95rem]` |
| **source ↗** | `.ref-row__src` | `text-faint hover:text-accent`, reveal-on-hover |
| **expand control** | `.ref-row__expand` | `font-mono text-small text-accent-dim hover:text-accent`, chevron rotates |

#### Badges — ONE canonical color contract

There is exactly one badge color contract (this section is canonical; the Component Inventory table defers to it). All badges share one **quiet** base so they read as metadata, not buttons. **Accent (`--accent`) is reserved for at most one badge** so a page full of `Required` rows is never saturated with vermilion. `Required` ⇒ `--muted`, `Optional` ⇒ `--faint`, `Deprecated` ⇒ `--accent` + `line-through` (the *only* accent badge), `Can-expand` ⇒ `--accent-dim`, `read-only` ⇒ `--faint`:

```css
.ref-row__badge {
  font-family: var(--font-mono); font-size: var(--text-micro);
  letter-spacing: var(--tracking-mono-wide); text-transform: uppercase;
  padding: 0.05rem 0.4rem; border-radius: var(--radius-chip);
  border: 1px solid var(--line); color: var(--faint);
  background: color-mix(in srgb, var(--paper) 60%, transparent);
}
.ref-row__badge--required   { color: var(--muted); }                 /* quiet, NOT accent */
.ref-row__badge--optional   { color: var(--faint); }
.ref-row__badge--expand     { color: var(--accent-dim); border-color: color-mix(in srgb, var(--accent) 25%, var(--line)); }
.ref-row__badge--deprecated { color: var(--accent); border-color: var(--accent); text-decoration: line-through; }
.ref-row__badge--readonly   { color: var(--faint); }
```

ARCP badge derivation (all from the parsed signature, no new source data):

- **Required** ⇐ name has no `?` and signature has no `` `optional` ``.
- **Optional** ⇐ `?` suffix or `` `optional` `` token.
- **Can-expand** ⇐ type is `object`, an object-literal, or a link to another interface (row has `####` children or resolves to a documented type).
- **Deprecated** ⇐ TypeDoc emits a `**Deprecated**` callout / `~~name~~`; the pass lifts it to the badge (accent + strike) and dims the row (`color: var(--faint)`).
- **read-only** ⇐ `` `readonly` `` token (the natural ARCP fifth badge, replacing Stripe's "Connect only").

#### Row container — divider + hover

Reuse the **already-shipped** row-hover recipe (`.prose tbody tr:hover` in `main.css`) so reference rows feel native, and `--line` for dividers (replacing the generated `***`/`<hr>`):

```css
.ref-row { border-top: 1px solid var(--line); padding: 0.9rem 0.5rem; transition: background-color .15s ease; }
.ref-section > .ref-list > .ref-row:first-child { border-top: 0; }
.ref-row:hover { background-color: color-mix(in srgb, var(--paper) 55%, transparent); }
.ref-row__head { display: flex; align-items: baseline; gap: .5rem; flex-wrap: wrap; }
.ref-row__anchor, .ref-row__src { opacity: 0; transition: opacity .12s ease; margin-left: -1.1rem; } /* hangs in the gutter */
```

The pass deletes the generated `***`/`<hr>` and the per-row `Defined in:` paragraph (its URL becomes `.ref-row__src`).

#### Nested children & inline enums

- **Children** (TypeDoc `####`): nested as `.ref-row--child` inside `.ref-row__children[hidden]`, fronted by a `Show child attributes` disclosure. Child rows are the same component, indented (`padding-left:1rem; border-left:1px solid var(--line-soft)`). One nesting level renders inline; deeper object literals collapse to a `{ … }` type label linking to the dedicated type page.
- **Inline enums**: string-literal unions ≤6 members render inline as colored chips; longer unions collapse behind a `+N values` toggle expanding an inline `<ul class="ref-enum">`.

### Common-vs-advanced — the "More… / Expand all" collapse

Stripe shows a short primary list, then collapses the long tail under "More attributes" with "Expand all." **This is the one piece with no free analogue** — TypeDoc emits a single alpha-sorted list. Phasing:

**Phase 1 (free, ships now):** a pure-length heuristic in the rehype pass. If a section has > **8** rows, the first N stay visible and the remainder go into a collapsed `<details>`:

```html
<div class="ref-section__primary"> … first 8 ref-rows … </div>
<details class="ref-more">
  <summary>More attributes <span class="ref-more__count">+12</span></summary>
  <div class="ref-section__advanced"> … tail ref-rows … </div>
</details>
<button class="ref-expand-all" aria-pressed="false">Expand all</button>
```

`<details>` gives no-JS correctness; the **Expand all** button force-opens every `<details>` (collapsed tail *and* every row's `Show child attributes`). Required rows are always hoisted into the primary group regardless of count, so the visible-first list is meaningful.

```css
.ref-more > summary { font-family: var(--font-mono); font-size: var(--text-small);
  color: var(--accent-dim); cursor: pointer; list-style: none; padding: .6rem .5rem; border-top: 1px solid var(--line); }
.ref-more > summary:hover { color: var(--accent); }
.ref-more__count { color: var(--faint); }
.ref-expand-all { font-family: var(--font-mono); font-size: var(--text-mini);
  text-transform: uppercase; letter-spacing: var(--tracking-mono-wide); color: var(--faint); }
.ref-expand-all[aria-pressed="true"] { color: var(--accent); }
```

**Phase 2 (sync change, deferred):** real common-vs-advanced requires *intent* the type system doesn't carry. Add it at the generation/sync layer (`scripts/sync-docs.mjs`, which rewrites links already): (a) read `@category Common`/`@advanced` JSDoc tags if SDK authors add them; (b) fall back to a curated per-type allowlist (`reference-priority.json`) for the ~20 high-traffic types; (c) otherwise keep the Phase-1 heuristic. The HTML contract is unchanged — Phase 2 only changes *which* rows land in `--primary` vs `--advanced`.

### The method+path / signature pill

Stripe's `GET /v1/country_specs` pill has no literal ARCP equivalent (no HTTP, no base URL). The pill instead carries the **language-appropriate signature**, which *is* in the generated `>` blockquote. One `.signature-pill` component, two render modes:

```html
<!-- object/type page header: the construct/import line -->
<div class="signature-pill" data-kind="import">
  <span class="signature-pill__verb">import</span>
  <code class="signature-pill__sig">{ ARCPClientOptions } from "@arcp/client"</code>
  <button class="signature-pill__copy" aria-label="Copy">⧉</button>
</div>

<!-- method/function page: the call signature, lifted from the `>` line -->
<div class="signature-pill" data-kind="method">
  <span class="signature-pill__verb">async</span>
  <code class="signature-pill__sig">subscribeEnvelopes(type: string): Stream&lt;Envelope&gt;</code>
  <button class="signature-pill__copy">⧉</button>
</div>
```

The **verb** slot is the ARCP analogue of Stripe's HTTP method and is the *only* part with accent treatment (kept dim, not loud — borrow structure, not blurple):

```css
.signature-pill { display: inline-flex; align-items: center; gap: .5rem;
  background: var(--code-bg); border: 1px solid var(--line); border-radius: var(--radius-chip);
  padding: .3rem .6rem; font-family: var(--font-mono); font-size: var(--text-code); max-width: 100%; }
.signature-pill__verb { color: var(--accent-dim); text-transform: lowercase; font-weight: 500; }
.signature-pill__sig  { color: var(--ink-soft); overflow-x: auto; white-space: nowrap; }
.signature-pill__copy { color: var(--faint); margin-left: .25rem; }
.signature-pill__copy:hover { color: var(--accent); }
```

**Verb is fixed to the page's own language on generated pages.** A `/<lang>/api/**` page is a **single** language (its URL segment) and the rehype pass builds the pill from *that file's one* `>` signature — there is no other-language signature on the page to switch to. So on generated pages the verb (`import`/`async`/`def`/`fn`/`func`/`public`) is **fixed to the URL-segment language** and is **not** driven by the global toggle. Language-aware verb switching is reserved for **curated pages that actually carry multi-language samples** (where each language's signature genuinely exists). For generated pages the pill is built once by the pass; the long inlined union is **truncated** to the head type with a `▸` that scrolls to `## Returns`.

### The TypeDoc reality check — where the projection breaks, and the cut

Three places where richer-than-Stripe presentation fights machine-generated content:

1. **The megablob type label.** `subscribeEnvelopes`'s `## Returns` is one ~4,000-char inlined union (16-member discriminated union, fully expanded, repeated in the signature *and* Returns). **Ruling:** the pass detects type labels over a length threshold (~120 chars) or with >3 top-level `\|` members and renders them **collapsed** — a one-line head (`Stream<Envelope … >`) with a `Show full type` `<details>`. This is generation-independent and arguably better than Stripe, which never faces this because REST schemas are hand-curated.
2. **No request/RESPONSE examples exist.** TypeDoc has no runnable example or wire payload. **Ruling (#2):** generated pages render **single-column** with **NO `CodePanel`**. The two-column `1fr 1fr` grid with the code aside is applied **only** to curated `spec/**` pages and a curated quickstart, where a human writes the per-method SDK sample + equivalent wire JSON. Do not fabricate examples for 2,286 generated pages. **(This is why "render-all-12" does not apply on `api/**`: there is no `CodePanel` there at all — see Code Panel.)**
3. **No common-vs-advanced intent.** Phase 1 length heuristic now, sync-layer tags/allowlist later.

#### Phased plan

- **Phase 1 — style the skeleton (now).** Ship `rehype-arcp-reference.mjs` gated to `api/**`. It wraps sections, builds `.ref-row` components from existing `###`/`####` + `>` signatures, parses badges/types, restyles `***`→`--line` dividers, adds hover permalink anchors, applies the length-based "More…/Expand all" collapse and the megablob collapse, and renders the (single-language) signature pill. **Zero changes to the generators or sync.** Output: every one of the ~2,286 generated pages gets the Stripe-style *row and section* presentation, **single-column, no code panel**.
- **Phase 2 — enrich at the sync layer (later).** In `scripts/sync-docs.mjs`, add common-vs-advanced ordering (JSDoc `@category`/allowlist) and, if SDK authors add `@example` blocks, lift them into a right-rail code panel — promoting select generated pages to the two-column treatment. The Phase-1 HTML/component contract is unchanged.
- **Phase 3 — full object+endpoints split (curated only).** The complete Stripe model — object section + per-endpoint sections + sticky code panel + request/RESPONSE in the selected SDK language + wire JSON + friendly Returns prose + language-aware verb — is built **by hand** for the `spec/**` tree and the start/quickstart page, using `<RefSection>`/`<RefRow>`/`<SignaturePill>` so curated and generated pages are visually indistinguishable. Generated SDK pages are never force-fit into the endpoint split.

Phase 1 is the deliberate minimum that honors the migration-doc constraint most closely — it restyles existing generated structure rather than re-authoring content or changing URLs (`/<lang>/api/...` is preserved; the rehype pass is presentation-only). Phases 2–3 are the explicit, opt-in redesign.

---

## Code Panel & Global Language Toggle

This section specifies the **sticky `--code-bg` code panel** (`.ArcpSection-Aside`) and the **persisted language preference** that drives its default view — the right column of the per-section two-column grid **on curated pages only**. The mapping: Stripe's *client-library / curl* toggle becomes ARCP's **SDK-language view across the 11 SDKs plus a language-neutral wire view**. **Scope (critical):** a `CodePanel` exists **only on curated pages** that genuinely carry per-language samples — the start page, the curated `spec/**` quickstart, hand-authored examples. **Generated `api/**` reference pages have NO `CodePanel`** (Reference Ruling #2: single-column). So everything in this section — render-all variants, the per-page `codeLangs` allowlist, the no-JS render-all concern — applies to **curated pages only**.

### The ARCP language set — reconciling `wire` with the existing `spec` route

`LANG_ITEMS` (in `docs-nav.ts`) is `LANGS.map(...)` where `LANGS = [...SDKS, 'spec']` — so **`LANG_ITEMS` has 12 entries: the 11 SDKs PLUS `spec`**. A naïve `CODE_LANGS = [WIRE, ...LANG_ITEMS.map(...)]` would therefore yield **13** entries with a **duplicate `spec`** (and `shiki: undefined` for it). We fix this by deciding what the language-neutral fallback *is*:

> **Decision: the wire/`curl`/JSON fallback IS the existing `spec` route-language.** Both are the single language-neutral view (raw protocol). There is no separate parallel `wire` pseudo-language. The code-panel toggle therefore exposes **12 views = 11 SDKs + `spec`**, where the `spec` view renders the `curl`/HTTP request (`bash`) plus the JSON envelope (`json`). We do **not** invent a 13th `wire` entry.

| order | id | label | Shiki grammar | notes |
|---|---|---|---|---|
| 0 | `spec` | `curl · HTTP` | `bash` (request) + `json` (payload) | the language-neutral protocol view; the **default**; this IS the existing `spec` route-language |
| 1 | `typescript` | TypeScript | `typescript` | |
| 2 | `python` | Python | `python` | |
| 3 | `rust` | Rust | `rust` | |
| 4 | `go` | Go | `go` | |
| 5 | `java` | Java | `java` | |
| 6 | `kotlin` | Kotlin | `kotlin` | |
| 7 | `php` | PHP | `php` | |
| 8 | `ruby` | Ruby | `ruby` | |
| 9 | `swift` | Swift | `swift` | |
| 10 | `csharp` | C# | `csharp` | |
| 11 | `fsharp` | F# | `fsharp` | |

`spec` is single-sourced from `LANG_ITEMS` (no special-casing of its *identity*), but it is **presentation-special** in the panel: its body is the `curl` request + JSON envelope rather than an SDK snippet. The `SHIKI` map gains a `spec` key (→ `bash`, with the response block always `json`). Construction filters nothing out and double-counts nothing because we **do not** prepend a separate `WIRE`:

```ts
// src/lib/code-langs.ts
import { LANG_ITEMS } from './docs-nav';

// `spec` renders curl/bash (request) + json (response); all others map 1:1.
const SHIKI: Record<string, string> = {
  spec: 'bash',
  typescript: 'typescript', python: 'python', rust: 'rust', go: 'go',
  java: 'java', kotlin: 'kotlin', php: 'php', ruby: 'ruby',
  swift: 'swift', csharp: 'csharp', fsharp: 'fsharp',
};
const LABEL_OVERRIDE: Record<string, string> = { spec: 'curl · HTTP' };

// LANG_ITEMS already contains `spec`; do NOT prepend a separate WIRE entry.
export const CODE_LANGS = LANG_ITEMS.map((l) => ({
  id: l.value,
  label: LABEL_OVERRIDE[l.value] ?? l.label,
  shiki: SHIKI[l.value],          // never undefined — `spec` is mapped above
})) as const;

export const DEFAULT_LANG = 'spec';            // language-neutral protocol view
export const LS_KEY = 'arcp:code-lang';
export type CodeLang = (typeof CODE_LANGS)[number]['id'];
```

(If a future requirement needs the `spec` view *and* a distinct presentation-only pseudo-language, re-introduce `WIRE` explicitly **and** filter `spec` out of the spread: `[WIRE, ...LANG_ITEMS.filter((l) => l.value !== 'spec').map(...)]`. We deliberately do **not** do that here — `spec` already is the neutral view.)

### Panel anatomy

The panel maps Stripe's `.ApiSection-Aside` onto Inkwell — but **does not** copy Stripe's "dark even in light theme." It is the **`--code-bg` panel**: in Inkwell light it is a *light paper* surface (`#fcfaf4`, confirmed in `main.css`), in dark it is `#1a1813` (ink). The panel **tracks the theme**. We adopt the panel's *structural* role (sticky, bordered, header bar, request + response), never a forced-dark surface — **there is no "dark panel" in light theme**, so no description in this spec calls it dark.

```
ArcpSection-Aside (sticky wrapper, top:16px)  — CURATED PAGES ONLY
└─ CodePanel  ........................ --code-bg surface (light paper in light, ink in dark)
   ├─ CodePanel-Header  .............. method/signature pill · LangTabs · actions
   ├─ CodePanel-Request  ............. the selected-language sample (12 variants on curated pages)
   └─ CodePanel-Response  ............ "RESPONSE" label + JSON envelope (optional)
```

#### Header bar

Three zones, `flex items-center justify-between`, height ~44px, hairline bottom border.

- **Left — signature/method pill.** Stripe shows `GET /v1/country_specs`. ARCP has no HTTP verb+path, so the pill carries the **method signature or message name** of the section: an SDK method → mono pill `client.sessions.create()` (truncated); a protocol spec message → `MSG session.create`; when `lang === 'spec'`, it *may* show the transport line (`POST /rpc · session.create`). The pill content is a function of `(section, lang)`, supplied by the author as a prop (curated pages carry every language).
- **Center/left-of-actions — `<LangTabs>`.** Two presentations: a **dropdown** (default on dense pages) and a **tab row** (landing/start page, where horizontal room exists). The *same* `LangTabs` component switched by a `variant` prop; both write the **same** `data-code-lang` view state (no navigation).
- **Right — action icons** (`flex gap-1`, 28px hit targets, `text-muted hover:text-ink`): **Copy** (the currently visible request), **Copy-link** (anchor link to the section — a *link* glyph 🔗, **not** open-in-new; ARCP has no external playground, so the icon must not imply leaving the page), **LLM menu** (`⋯` popover).

```
┌──────────────────────────────────────────────────────────────┐
│ ⬢ client.sessions.create()      [ Python ▾ ]   ⧉  🔗  ⋯       │  ← header (44px)
├──────────────────────────────────────────────────────────────┤
```

#### Request & response areas

`CodePanel-Request` holds **all 12 language variants pre-rendered** (curated pages only — these are the pages where all 12 genuinely exist), exactly one visible. Each is a Shiki-highlighted `<pre>` tagged `data-lang`; `max-h-[480px] overflow-auto` so a long sample never blows out the sticky column.

Below it, an optional `CodePanel-Response`:

```
├──────────────────────────────────────────────────────────────┤
│ RESPONSE                                                       │  ← label: .label tint, --faint on --code-bg
│ {                                                              │
│   "type": "session.created",                                  │
│   "session": { "id": "ses_…", "state": "ready" }              │
│ }                                                              │
└──────────────────────────────────────────────────────────────┘
```

The "RESPONSE" body is a single Shiki `json` block — **shared across all 12 languages** (the wire payload is language-independent), so it lives *outside* the per-language switch and never duplicates. The `RESPONSE` label tint is defined by a **token that resolves in both themes**: `--faint` on the `--code-bg` surface (never "dark-panel tint", which is undefined in light theme).

**Streaming vs. pagination (consistency with the IA section).** ARCP streaming is **resumable sequenced Event frames** (`Event` frame with monotonic `seq`, resume via `last_seq`) — it is **NOT** offset/cursor list pagination. The `ResponseBlock` for a streaming section therefore shows an **`Event` frame** (with `seq`), **not** Stripe's `{ object:'list', has_more, data:[] }` envelope. The list envelope is reserved **only** for genuinely paginated SDK list methods (if any exist) and is never the default response shape.

### Per-page view state → reveal one variant (CSS-only)

On a curated page, one selection drives **every** `CodePanel` on that page simultaneously. This is pure DOM, no framework hydration, **no navigation**. Each panel renders all 12 variants; visibility is decided by a single attribute on `<html>`:

```css
.code-variant { display: none; }
:root[data-code-lang="spec"]   .code-variant[data-lang="spec"],
:root[data-code-lang="python"] .code-variant[data-lang="python"],
/* … one rule per language, generated from CODE_LANGS … */
:root[data-code-lang="fsharp"] .code-variant[data-lang="fsharp"] { display: block; }
```

Switching the view is **one attribute write** — `document.documentElement.dataset.codeLang = id` — and every panel on the page reflows instantly with zero per-panel JS (only `display` toggles). **This is a VIEW toggle, not navigation:** it changes which already-rendered variant shows on the *current* page; it never changes the URL or fetches a different artifact. (The sidebar/rail chips, by contrast, *navigate* — see Nav IA.)

```
[ click "Rust" in any panel ] ──► html[data-code-lang="rust"]   (CSS reveal; same page)
        ┌───────────────────────────────┼───────────────────────────────┐
        ▼                               ▼                               ▼
   panel #1 shows Rust            panel #2 shows Rust            panel #N shows Rust
   (CSS only, no per-panel JS, NO navigation)
```

### SSR / no-JS strategy (static Astro) — curated pages only

Astro ships zero JS by default and these pages are statically generated, so the panel must be correct with JS disabled and before hydration. **Strategy: render all 12, reveal one with CSS, hydrate the persisted choice — on curated pages only.** (Generated `api/**` pages have no panel, so they ship **zero** code variants; the ~12× markup concern simply does not arise there.)

1. **Render-all (curated only).** Every `CodePanel` *on a curated page* emits all 12 `.code-variant` blocks at build time (Shiki runs at build). Cost is ~12× the markup of one snippet, but it is static text, gzip-compresses well, and is the price of no-JS correctness. **If a curated page genuinely carries fewer languages, gate behind a per-page `codeLangs` allowlist** (the allowlist applies to curated pages only; generated pages have no panel and need no allowlist).
2. **SSR default.** The build sets `data-code-lang="spec"` on `<html>`, so with no JS the panel shows the `curl`/HTTP wire view — universally readable, install-free, copy-pasteable, exactly as Stripe defaults to curl. Right for a protocol-first audience.
3. **Hydration (FOUC guard).** An **inline, render-blocking** `<head>` script (sibling to the existing theme-init script) reads `localStorage` *before first paint* and rewrites the attribute:

```html
<script is:inline>
  try {
    const v = localStorage.getItem('arcp:code-lang');
    if (v) document.documentElement.dataset.codeLang = v;
  } catch {}
</script>
```

Because the attribute is set before the CSS paints, there is **no flash** of the wrong language.

4. **Per-language routes (navigation) vs. the view toggle.** The sidebar/rail chips **navigate** `/<lang>/<page>` and write nothing to localStorage (their job is content routing). The code-panel toggle is a **view** control writing `data-code-lang` + `localStorage`. Reconcile: landing on a `/<lang>/…` page **seeds** the view from the URL on first hydration *only if the user has no stored preference*; once the user touches `LangTabs`, the stored preference **wins** for the *view* and persists across navigation (a reader who picked Rust keeps seeing Rust samples on curated pages even while browsing `/python/...` content). The persisted preference also **seeds the navbar `Docs` link** and the bare-`/docs` redirect (Architecture). Persistence is plain `localStorage` (`arcp:code-lang`); no cookies, no SSR personalization.
5. **`<noscript>`.** The SSR default already shows a usable view; optionally add a hint near the first panel ("Showing curl · HTTP. Enable JavaScript to switch SDK languages.").

### Shiki integration & the panel token

The site already configures dual Shiki themes `arcp-light` / `arcp-dark` in `astro.config` + `markdoc.config`. The panel reuses the **existing `--code-bg`** token rather than introducing a new color:

```css
.CodePanel { background: var(--code-bg); }                  /* light paper in light, ink in dark */
.CodePanel :where(pre, code) { background: transparent; }   /* panel owns the bg */
```

- The existing unlayered `.prose pre` rule (`main.css` lines 366–373) styles *inline-prose* code blocks (left column) and must **not** leak into the panel — scope the panel's `<pre>` resets under `.CodePanel`. The left column keeps its `.code-window`.
- Reuse the existing `.code-window__bar` / `.label` chrome for the header and "RESPONSE" label, overriding their `text-muted` to the panel's `--faint`.
- The string/key tints (`--str`, `--key`) already track theme; no new color.

### Sticky behavior & the empty-section case

Per the audit, sticky is **per-section, not one global panel** (`position:sticky; top:16px`):

```css
.ArcpSection-Aside { position: sticky; top: 1rem; align-self: start;
  max-height: calc(100dvh - 1rem - 2rem); }
.CodePanel { overflow: hidden; border-radius: 0.5rem; }
.CodePanel-Request { max-height: 480px; overflow: auto; }
```

- `align-self: start` is **mandatory** — without it the grid stretches the aside to the row's full height and `sticky` never engages.
- The app shell scrolls the **content pane**, not `window`, so `top: 16px` is relative to the scrolling `<main>` — the natural sticky containing block (this depends on the App Shell section's content-pane scroll change).

**When a curated section has no code:**

- **Collapse to one column** (`grid-template-columns: 1fr`). Don't reserve an empty sticky gutter.
- **Concept sections that still want a right rail** (the landing "start" page) use the same aside slot for **callout cards** (install one-liner, the "BASE URL" → ARCP per-language install/quickstart) instead of a code panel. The *view toggle still lives here* on the landing, switching those install snippets per language.
- A section may be **request-only** (no `RESPONSE`).

### LLM affordances on a static site

Stripe shows **"Ask about this section", "Copy for LLM", "View as Markdown"** near the panel. All three are implementable statically, in the header's `⋯` popover. Apply the same "inert affordance reads as broken" judgment the Open-questions section raises for search: **`Copy for LLM` and `View as Markdown` ship live** (both are fully static and real); **`Ask about this section` ships only if a concrete external target is configured**, otherwise it is omitted (not shown as a dead control).

| affordance | static implementation |
|---|---|
| **Copy for LLM** | `navigator.clipboard.writeText()` of a pre-assembled markdown blob: the section's prose + the **currently selected** language's code + the response JSON, wrapped with a one-line context header (`# ARCP — <section> (Python)\nSource: <canonical-url>`). Build a hidden `<script type="text/markdown" data-section>` per section at build time so the client just reads `.textContent`. |
| **View as Markdown** | Emit a sibling **`.md` artifact per page** at build time (`getStaticPaths` route, e.g. `/<lang>/<page>.md`) containing the same blob. The action is a plain `<a href="…md">`. Free for LLMs/agents to fetch — on-brand for ARCP; generalizes to an `llms.txt` / per-page `.md` convention. |
| **Ask about this section** | No backend, so a **deep link to an external LLM** with the section URL + a prefilled prompt as query params. Concrete contract: the target lives at **`consts.ts` → `LLM_ASK_URL`** (a single configurable base, e.g. an external chat URL) and the prompt is built from **`consts.ts` → `LLM_ASK_PROMPT`** template (`Explain the ARCP "{section}" API from {url} for a {lang} developer.`). If `LLM_ASK_URL` is unset, **omit the item** — do not render a dead control. Do not build a chat widget. |

### Component breakdown

```
src/components/code/
├─ CodePanel.astro        # the sticky card: header + request + response slots (curated pages only)
├─ LangTabs.astro         # variant="tabs" | "dropdown"; reads CODE_LANGS; writes view state (data-code-lang)
├─ CodeVariant.astro      # one Shiki-highlighted <pre data-lang> (request OR response)
├─ ResponseBlock.astro    # "RESPONSE" label + single shared json CodeVariant (Event frame for streaming)
├─ LlmMenu.astro          # the ⋯ popover: Copy-for-LLM / View-as-Markdown / Ask (Ask gated on consts.ts)
└─ code-lang.ts           # the view-state client script (set/persist/seed; NO navigation)
src/lib/code-langs.ts     # CODE_LANGS (off LANG_ITEMS, spec mapped), DEFAULT_LANG, LS_KEY
src/pages/[...page].md.ts # build-time .md artifact route for "View as Markdown"
```

**`LangTabs.astro`** renders from `CODE_LANGS`; `variant="dropdown"` emits a `<details>`/native `<select>` (works with no JS — native disclosure — and upgrades to instant view switch with JS); `variant="tabs"` emits a scroll row reusing `.lang-chip` / `.is-active`. Both call `setCodeLang(id)` (view only — never navigation):

```ts
// src/components/code/code-lang.ts
import { LS_KEY } from '../../lib/code-langs';
export function setCodeLang(id: string) {
  document.documentElement.dataset.codeLang = id;        // CSS reveals the variant; NO navigation
  try { localStorage.setItem(LS_KEY, id); } catch {}
  document.querySelectorAll<HTMLElement>('[data-langtabs]').forEach((el) => (el.dataset.value = id));
}
(function init() {
  const stored = (() => { try { return localStorage.getItem(LS_KEY); } catch { return null; } })();
  if (!stored) {
    const urlLang = location.pathname.split('/')[1];      // seed view from /<lang>/… on first visit only
    if (urlLang) document.documentElement.dataset.codeLang = urlLang;
  }
  document.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest('[data-set-lang]');
    if (t) setCodeLang((t as HTMLElement).dataset.setLang!);
  });
})();
```

The render-blocking `<head>` snippet handles the persisted choice before paint; `code-lang.ts` handles URL-seeding, one delegated click handler (no per-panel listeners), and label sync. Changing the view wraps the request/response body in `aria-live="polite"` so a screen-reader user hears the example changed.

### ASCII mock (endpoint-style curated section, Python selected)

```
            LEFT (prose, scrolls)                    RIGHT (sticky, top:16px, --code-bg)
┌───────────────────────────────────┐   ┌───────────────────────────────────────────────┐
│ Create a session                  │   │┌─────────────────────────────────────────────┐│
│ Opens a control session against…  │   ││ ⬢ client.sessions.create()  [Python ▾] ⧉ 🔗 ⋯││ header
│                                   │   │├─────────────────────────────────────────────┤│
│ PARAMETERS                        │   ││  from arcp import Client                     ││
│  agent_id   string   Required     │   ││  client = Client(token="…")                  ││ request
│  timeout    integer  Optional     │   ││  session = client.sessions.create(           ││ (1 of 12,
│  ▸ More parameters   (Expand all) │   ││      agent_id="agt_7Q…", timeout=30000,      ││  CSS-revealed)
│                                   │   ││  )                                           ││
│ RETURNS                           │   │├─────────────────────────────────────────────┤│
│  (curated: "Returns a session     │   ││ RESPONSE   (--faint on --code-bg)            ││ response
│   object.")  / generated: type    │   ││  { "type": "session.created",                ││ (shared json,
│                                   │   ││    "session": { "id": "ses_3kP…",            ││  lang-agnostic)
│                                   │   ││      "state": "ready" } }                    ││
│                                   │   │└─────────────────────────────────────────────┘│
└───────────────────────────────────┘   └───────────────────────────────────────────────┘
  ≈503px (1fr)              gap          ≈503px (1fr)   ← per-section grid: 1fr 1fr (curated only)

  LangTabs dropdown open:                LLM menu (⋯) open:
  ┌──────────────┐                       ┌────────────────────────┐
  │ ✓ curl·HTTP  │  ← VIEW toggle        │  Copy for LLM          │
  │   Python  ✓  │    (CSS reveal,       │  View as Markdown  ↗   │
  │   Rust  Go … │     same page,        │  Ask about this …  ↗   │ (only if LLM_ASK_URL set)
  └──────────────┘     NO navigation)    └────────────────────────┘
```

---

## The Docs Start Page

A single, full-bleed protocol overview that maps Stripe's `/api` landing onto ARCP: a **vertical stack of two-column concept sections** — prose left, a **sticky `--code-bg` code panel** right rendered in the reader's **selected SDK language** — fronted by a right-rail "start kit" (install/quickstart + SDK-language list + global toggle). It is the reader's on-ramp: *what ARCP is → install → connect → message types → streaming → errors → versioning*, each concept paired with runnable code in the chosen language. The start page is **language-agnostic content** authored per language, so it is exactly the kind of curated page that DOES carry all 12 code variants and DOES use a `CodePanel`.

The Stripe audit is explicit that the `/api` landing "uses the SAME two-column section layout — not a bespoke template, just concept sections." We honor that: this page is the canonical instance of the reusable `ArcpSection` primitive that the curated reference pages reuse.

### Where it lives, and which control is navigation vs. view

| Route | Verdict | Reason |
|---|---|---|
| `/` (marketing home) | **Keep as-is** | `src/pages/index.astro` + `home.json` is the editorial *brand* page (hero, manifesto sections, diagram), centered (`max-w-[64rem]`), serif, scroll-revealed. A **landing**, not a **docs landing**. Do not overload it. |
| `/docs` | **Reject (or redirect)** | ARCP has no language-neutral docs root; routes are `/<lang>/…` and `/spec/…`. A `/docs` index forces a "pick a language first" interstitial. Bare `/docs` **redirects** to the persisted code-lang (default `spec`/typescript). |
| `/<lang>` (e.g. `/python`, `/rust`) | **This is the start page.** | It already exists (`src/content/docs/python/index.md`). The selected SDK language *is* the URL segment — `currentLangFor(path)` computes it. |

**Two controls, two jobs (explicit reconciliation).** On `/<lang>`:

- The **sidebar chip row** and the **right-rail CLIENT LIBRARIES** list are **NAVIGATION** — links to `/<lang>`. Selecting Rust re-routes `/python → /rust`, a **different static artifact** generated by `getStaticPaths`. There is **no** client-side "re-render every panel" for this; the page is statically generated per language.
- The **code-panel `LangTabs`** inside each section is a **VIEW toggle** — CSS-revealing the already-rendered variant on the *current* page (the start page carries all 12), **no navigation**.

These never collide because they write different things: the chips change the URL; the toggle writes `data-code-lang`. The persisted preference (`arcp:code-lang`) seeds the toggle's default and the navbar `Docs` link, but does not itself navigate.

#### New template, not an evolution of the home

`index.astro` is frontmatter-driven from `home.json` via `renderInline/renderBlock` and bespoke `Home*` components. That schema **cannot express the two-column concept+code grid** — no per-section code sample in a selected language, no right rail, no sticky aside. Forcing it in means inventing a new renderer anyway.

**Decision: a new template, `StartLayout.astro`, fed by a per-language `start.json`-style data module — reusing the chrome (`AppShell`/`DocsSidebar`/Inkwell tokens/`.code-window`) but its own page template.** Integration path (recommended **B**): add `src/pages/[lang]/index.astro` that `getStaticPaths()` over `SDKS` and renders `StartLayout`; the generic `[...slug].astro` keeps serving deep machine-generated reference pages untouched. The eleven `index.md` files migrate into the start data (URLs `/<lang>` preserved).

```
src/
  layouts/StartLayout.astro
  pages/[lang]/index.astro          ← getStaticPaths over SDKS
  components/start/
    StartRightRail.astro            ← sticky "start kit": Quickstart + Client Libraries (NAVIGATION links)
    StartCallout.astro              ← "New to ARCP?" / "Just integrating?" callouts
    LangToggle.astro                ← language navigation (links to /<lang>, not view state)
  content/start/
    concepts.ts                     ← language-neutral concept prose + per-lang code map (all 12 variants)
    quickstart.ts                   ← install one-liners + connect snippet per lang
```

The start sections reuse `ArcpSection` and `CodePanel` from the shared inventory — they are not new primitives.

### The concept section list (ARCP protocol overview)

Each concept = one `ArcpSection` (explanation left, selected-SDK code right):

| # | Section (left H2) | Left prose covers | Right code panel (selected SDK) | Wire view |
|---|---|---|---|---|
| 0 | **`<Lang> SDK`** (H1) + intro | "What ARCP is": the durable envelope around long-running agent jobs; the spec version it implements; what it is *not* (not MCP, not OTel). | Smallest end-to-end snippet: connect → submit → stream one event. | — |
| 1 | **Install** | Package-manager one-liner; runtime version; import line. (The **ARCP analog of Stripe's "BASE URL"**.) | `pip install arcp` / `cargo add arcp` / `npm i @arcp/client` + import. | — |
| 2 | **Connect & handshake** | Session establishment: transport-agnostic connect, auth/principal, capability negotiation, the `lease` bound. | `client = Client(url, token=…)` → `session = client.connect()`. | `Connect` / `ConnectAck` frames. |
| 3 | **Submitting a job** | The core action: submit a job under a lease; it outlives the connection. | `job = session.submit(input=…, lease=…)`. | `Submit` + `Submitted` ack. |
| 4 | **Core message types** | The "object model": the envelope, message kinds (`Submit`/`Event`/`Control`/`Ack`/`Error`), sequence numbers, common fields. | Typed enums/structs (`MessageKind`, `Event`, `Envelope`); pattern-match on kind. | The envelope schema JSON. |
| 5 | **Streaming events** | Resumable, **sequenced** streams; resume-after-drop via `last_seq`; observe from another machine. **Not list pagination.** | `for event in job.events(): …` / `.resume(after=last_seq)`. | `Event` frames with monotonic `seq` (NOT a `has_more` list envelope). |
| 6 | **Control & leases** | Mid-flight control (pause/cancel/steer); the lease as an enforceable bound; delegation. | `job.cancel()`, `job.send_control(…)`; a scoped `Lease`. | `Control` frame + `lease` object. |
| 7 | **Errors** | Error envelope shape, categories (protocol/runtime/lease-violation), retry semantics, idempotency of `submit`. | `try/except ArcpError as e: e.category, e.code`. | `Error` frame with `code` + `category`. |
| 8 | **Versioning** | Protocol version negotiation, the `v1.1` Internet-Draft, compatibility, SDK-vs-spec version. Link to `/spec`. | `arcp.PROTOCOL_VERSION`; pinning a negotiated version. | `ConnectAck` showing negotiated `version`. |

Each section is anchored (`id="connect"`, `id="streaming"`, …) so the **sidebar doubles as the page TOC**. On `/<lang>` the `DocsToc` right rail is removed; its slot is taken by `StartRightRail`.

### The "start kit" right rail (ARCP analog of BASE URL + CLIENT LIBRARIES)

Rides the first section's right column. Three stacked blocks, all in Inkwell `.envelope`/`.chip` classes:

```
┌─ StartCallout "New to ARCP?" ──────────────────┐   ← .envelope, accent tag
│ Read the protocol overview, then come back.    │
│ → Read the spec  (/spec/draft-arcp-1.1)        │
├────────────────────────────────────────────────┤
│ "Just integrating?"  → jump to the quickstart  │
└────────────────────────────────────────────────┘
┌─ QUICKSTART ───────────────────────────────────┐   ← ARCP analog of "BASE URL"
│  pip install arcp            [⧉]                │   install one-liner (selected lang)
│  from arcp import Client                        │   import + connect, 3 lines
│  client = Client("wss://…", token=…)            │
└────────────────────────────────────────────────┘
┌─ CLIENT LIBRARIES ─────────────────────────────┐   ← Stripe "CLIENT LIBRARIES" list (NAVIGATION)
│  ● TypeScript  Python  Rust  Go  Java          │   the 11 SDK langs (lang-chip row)
│    Kotlin  PHP  Ruby  Swift  C#  F#             │   active = current; click → /<lang>  (re-route)
│  Spec / wire-format view →  (/spec)             │   the "curl" analog: the spec route
└────────────────────────────────────────────────┘
```

| Stripe `/api` rail element | ARCP analog |
|---|---|
| "Just getting started?" callout | **"New to ARCP?"** → links `/spec` (`StartCallout`) |
| "Not a developer?" callout | **"Just integrating?"** → anchors to Install |
| **BASE URL** (`https://api.stripe.com`) | **QUICKSTART** — package-manager one-liner + import/connect for the selected language (ARCP has no base URL; install *is* the "where do I start") |
| **CLIENT LIBRARIES** list | **CLIENT LIBRARIES** — the 11 SDK languages, active highlighted; click → `/<lang>` **navigation** (reuse `.lang-chip`/`.is-active`) |
| "docs default to curl … select a library" | **"Spec / wire-format view"** → `/spec`; the `spec` route is **ARCP's curl** (language-neutral fallback) |
| Global, persisted language toggle | The language-chip row (sidebar + this rail) is **navigation**; persistence = `localStorage`/cookie seeds the navbar `Docs` link |

### Language navigation — three surfaces, one persisted preference

The language control appears in **(1)** the sidebar chip row, **(2)** the right-rail CLIENT LIBRARIES block, and **(3)** the `LangToggle`. On the start page **all three are NAVIGATION links to `/<lang>`** (optionally `#<anchor>` to preserve scroll), so the page stays a static-per-language artifact via `getStaticPaths` — there is **no** "re-render every panel for navigation" machinery. Persistence:

```js
// on click of any lang NAVIGATION link
localStorage.setItem('arcp-lang', lang);
document.cookie = `arcp-lang=${lang};path=/;max-age=31536000`;
// navbar "Docs" link + bare /docs redirect read this; default 'typescript'
```

**Boundary (restated for clarity):** *navigation* across `/<lang>` routes is the chips/rail/`LangToggle`; the *in-page code-panel view* is the separate `data-code-lang` toggle (Code Panel section), which CSS-reveals an already-rendered variant on the current curated page without navigating. The two are consistent because they write different state — the URL (navigation) vs. `data-code-lang` (view) — joined only by one persisted preference.

---

## Responsive Behavior & Accessibility

This section specifies how the app shell behaves across breakpoints and how it stays operable from the keyboard and assistive tech. The `overflow:hidden` body (at desktop) is the single biggest a11y risk here, so it is treated as a first-class constraint.

### Breakpoint system

The shell needs a **third** band so the two-column section grid can collapse independently of the drawer. Define one extra custom screen in the Tailwind v4 `@theme` block in `main.css`:

```css
@theme { --breakpoint-wide: 80rem; /* 1280px — the 3-pane threshold */ }
```

> **Build check (load-bearing — verify in Phase 1).** Tailwind v4 (this repo: `tailwindcss@^4.3.1`, confirmed) generates a screen variant from any `--breakpoint-*` `@theme` token, so `--breakpoint-wide: 80rem` **does** yield a usable `wide:` variant. `main.css` currently defines **no** custom breakpoints, so this is the first one — add a one-line Phase-1 assertion (e.g. a `wide:hidden` probe element that is hidden ≥1280 in the built CSS) to confirm the variant emits *before* every `wide:` class in this spec depends on it. Otherwise every `wide:` class is dead.
>
> **Coincidence note:** `80rem` (1280px) is reused for **both** the existing `AppHeader` `max-w-[80rem]` *and* this new shell breakpoint. The doubling is **coincidental, not causal** — they mean different things (header content cap vs. shell pane threshold). Keep them as separate declarations so a future edit to one does not silently desync the other.

| Band | Range | Prefix | Shell behavior |
|------|-------|--------|----------------|
| **DESKTOP** | ≥ 1280px | `wide:` | Full 3-pane: 280px sidebar · content · per-section sticky code panel; **body locked (`overflow:hidden`)** |
| **TABLET** | 768–1279px | `md:` (and `< wide:`) | Sidebar → drawer (reuse toggle-nav drawer + overlay); section grid → **single column**, code panel inline **below** each section's prose, **sticky disabled**; **body scrolls** |
| **MOBILE** | < 768px | base | Stacked; drawer nav; full-width inline code panels; language toggle compact; **body scrolls** |

Three knobs change across these bands at **two** thresholds, which is why a single breakpoint is insufficient: (1) **sidebar persistence** — rail `wide:` ↔ drawer below; (2) **section grid** — `1fr 1fr` `wide:` ↔ `1fr`; (3) **code-panel position** — `sticky` `wide:` ↔ `static`. Knobs 2–3 share `wide` (1280) because the two-column sticky panel and the side-by-side grid are the same device. Knob 1 also flips at `wide` (so tablet gets the drawer).

> **Changelog note:** the drawer breakpoint moves **1024 → 1280**, so 1024–1279px viewports that currently show a persistent rail will switch to the drawer. This is intentional: at 1024px there isn't room for a 280px sidebar + two readable columns. Keep existing `lg:` classes only where they still mean "≥1024 chrome" (e.g. header padding); for the shell's three structural knobs, use `wide:`.

### Tablet (768–1279) — drawer + single-column inline

Two transformations happen at once when dropping below `wide`:

**(a) Sidebar collapses to the existing drawer.** Reuse the mechanism already in `DocsLayout.astro` verbatim — do not invent a second drawer: the `#docs-overlay` element, the `toggle-nav` custom event fired by the navbar hamburger, the `setDrawer()` script that toggles `-translate-x-full` on `#docs-nav` and `hidden` on the overlay. The only change: the persistent-state guard moves from `lg:` to `wide:` (`wide:translate-x-0 wide:static wide:block`; overlay `wide:hidden`).

**(b) The two-column grid collapses; the code panel goes inline and loses sticky.** Because the grid is applied only at `wide:`, below 1280 each `ArcpSection` is normal block flow — prose, then aside, stacked in **source order**. This is exactly the audit's "code panel moving inline below each section's prose," and it falls out of source order **only if the aside is the second DOM child** — which is why the section is authored prose-then-code and **CSS `order` is banned**. `wide:sticky` means the aside is `position:static` below 1280 — it scrolls away with its prose; never leave a bare `sticky`/`top-*` on it.

```
TABLET (768–1279px)  — drawer closed
┌──────────────────────────────────────────────────────────┐
│ [≡] ARCP▌      Docs   Spec   GitHub   [py ▾]   [◐]        │ ← navbar (h-14), hamburger visible
├──────────────────────────────────────────────────────────┤
│  Authentication                                          ▲ │
│  Every ARCP client authenticates the session before…    │ │  body scrolls (normal long doc;
│                                                          │ │  no inner pane traps it below wide:)
│  ┌── connect() ───────────────────── [python ▾] [⧉] ──┐ │ │ ← code panel INLINE,
│  │ from arcp import Client                            │ │ │   static (not sticky),
│  │ client = Client(token=os.environ["ARCP_TOKEN"])    │ │ │   full content width, --code-bg
│  │ ── RESPONSE ──────────────────────────────────────│ │ │
│  │ { "session": "s_01H…", "protocol": "1.0" }         │ │ │
│  └────────────────────────────────────────────────────┘ │ │
│  Errors                                                  ▼ │
└──────────────────────────────────────────────────────────┘

TABLET — drawer OPEN (after [≡] / toggle-nav)
┌───────────────────────────┬──────────────────────────────┐
│ ┌ Find anything      / ┐  │░░░░░ overlay (bg-black/40) ░░░│ ← #docs-overlay,
│ │ Ask AI               │  │░░░ click or Esc to close ░░░░│   click/Esc closes
│ ├──────────────────────┤  │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│ │ Authentication   ◀── │  │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│ ← active row, focus moved here
│ │ API REFERENCE        │  │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│ │   Session · Channel  │  │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│ └ (nav tree scrolls) ──┘  │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
└───────────────────────────┴──────────────────────────────┘
```

Below `wide:` the body itself scrolls (no nested-scroll trap), which sidesteps the keyboard-scroll risk on touch entirely.

### Mobile (<768) — stacked, full-width, compact controls

Mobile is the tablet single-column flow taken to the edge: same drawer mechanism (`w-[88vw] max-w-[320px]` so the nav-as-TOC is usable); the code panel is `w-full` with a `flex flex-wrap` header (the method/path pill may `truncate`, but the language control must never be clipped). **Language toggle becomes a native `<select>`** to conserve width and get the OS picker for free — reusing the existing `#lang-select` change handler that navigates to `/<lang>`.

### Keyboard navigation & focus management

**Tab order follows DOM source order** (skip link → navbar → sidebar/drawer → content pane → each section's prose → that section's code panel). This is why source order is prose-then-code and why `order` is banned.

**Drawer focus trap & restore.** Extend `setDrawer()` (net-new behavior):

```js
let lastTrigger = null;
function setDrawer(open) {
  aside?.classList.toggle('-translate-x-full', !open);
  overlay?.classList.toggle('hidden', !open);
  aside?.setAttribute('aria-hidden', String(!open));
  document.body.classList.toggle('drawer-open', open);    // lock bg scroll (mobile/tablet)
  if (open) { lastTrigger = document.activeElement; aside?.querySelector('a,button,[tabindex]')?.focus(); }
  else { lastTrigger?.focus(); }
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !aside?.classList.contains('-translate-x-full')) setDrawer(false);
});
```

- The hamburger must be a real `<button>` with `aria-controls="docs-nav"`, `aria-expanded` kept in sync, and `aria-label="Open/Close navigation"`.
- The overlay is decorative (`aria-hidden="true"`); keyboard users close via Esc or the in-drawer close affordance, never by reaching the overlay.
- On desktop (`wide:`) the drawer is `static`/visible, so the trap and `aria-hidden` toggling must be **no-ops** — guard on `matchMedia('(max-width: 79.99rem)')` so focus is never trapped in a persistent rail.

**Collapsible nav groups** keep `<button class="nav-toggle">` with `aria-expanded`; ensure each has an accessible name (the group label) and `aria-controls` → the `.nav-children` id.

**Nav-as-TOC.** Activating a sub-entry must move focus to (or adjacent to) the target section heading — set `tabindex="-1"` on section headings and `.focus()` them after the scroll so keyboard context follows the jump.

### The language toggle as an accessible control — tabs vs. select

| Context | Pattern | Why |
|---------|---------|-----|
| Landing / start page (all languages visible) | **Tabs** (`role="tablist"`/`tab`, `aria-selected`, roving `tabindex`, Left/Right/Home/End) | Small finite visible set; WAI-ARIA tabs pattern |
| Per-section code-panel header & all of mobile | **Native `<select>`** | 11+ options is too many for a cramped horizontal tablist; native select is keyboard/AT-complete for free and gives the mobile OS picker |

Rules for **both**: a programmatic label (`<label for>` or `aria-label="Code language"`); the swap is announced (tablist → `role="tabpanel"` + `aria-labelledby`; per-panel selects → wrap the request/response region in `aria-live="polite"`); the **view** toggle is one global state synced via an `arcp:lang` `CustomEvent` on `document` (mirroring the `toggle-nav` bus). Below `wide:`, the landing tablist itself falls back to the select to avoid overflow.

### The no-body-scroll shell — a11y caveats

The `100dvh` shell means the body never scrolls **at `wide:`**; three regions scroll independently. This is the highest-risk a11y decision, because an `overflow:auto`/`hidden` region is **not keyboard-scrollable unless it can receive focus**. Mandatory mitigations:

1. **Every scroll region is keyboard-scrollable.** Each independently-scrolling pane — the nav tree and the content pane — has `tabindex="0"` + `role="region"` + an `aria-label` (already applied in the App Shell section). Without this, a keyboard-only user can tab through links but cannot scroll between them — a WCAG 2.1.1 failure.
2. **Don't kill the content scroll below desktop.** The body is `overflow-hidden` **only at `wide:`** (`wide:h-[100dvh] wide:overflow-hidden`). **Below `wide`, the body scrolls normally** — the single-column flow is a normal long document; forcing nested scroll on a phone is hostile. This sidesteps the nested-scroll problem entirely on touch.
3. **Drawer-open scroll lock (mobile/tablet only).** `.drawer-open { overflow:hidden }` on the body when the drawer is open; release on close. Must **not** apply at `wide:`.
4. **Visible focus is already covered.** `main.css` ships `:focus-visible { outline: 2px solid var(--accent) }` for `a/button/select/summary/[tabindex]`; the new `tabindex="0"` scroll regions inherit it. Do not add `outline:none` anywhere.

### Permalink-anchor buttons (attribute/parameter rows)

The audit's row anatomy reveals a permalink anchor on hover only — a pointer-only affordance. Make it accessible: a real `<button>`/`<a href="#id">` **always in the tab order**, merely visually hidden until hover/focus (`opacity-0 group-hover:opacity-100 focus-visible:opacity-100`; never `display:none`). Give it an accessible name (`aria-label="Copy link to <field>"`); on activation update the URL hash, copy the deep link, and reflect success in an `aria-live="polite"` status ("Link copied").

### Reduced motion

`main.css` already has a strong `prefers-reduced-motion: reduce` block. Extend the shell:

- The content pane is the scroll container, not `<html>`; add it to the smooth/auto rule:

```css
@media (prefers-reduced-motion: reduce) { html, .content-scroll { scroll-behavior: auto; } }
/* base: .content-scroll { scroll-behavior: smooth } */
```

- The drawer slide and overlay fade are already covered by the universal `transition: none !important`; class toggles still function (drawer snaps open/closed).
- `scrollIntoView` calls pass `behavior:'auto'` when `matchMedia('(prefers-reduced-motion: reduce)').matches`.

### Search trigger & skip links

**Search trigger ("/").** The sidebar top-zone "Find anything /" is a `<button>` (not an input), `aria-haspopup="dialog"`, `aria-keyshortcuts="/"`. Bind the shortcut defensively so it never hijacks typing:

```js
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName)
      && !document.activeElement?.isContentEditable) {
    e.preventDefault();
    openSearch();          // role="dialog" aria-modal="true"
  }
});
```

The opened dialog traps focus, closes on Esc, and restores focus to the trigger — same discipline as the drawer.

**Skip links.** With a fixed shell and a separate scroll pane, a skip link is essential as the **first focusable element** in the layout, visually hidden until focused:

```html
<a href="#content-pane"
   class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50
          focus:bg-paper focus:text-ink focus:border focus:border-accent focus:px-3 focus:py-2 focus:rounded">
  Skip to content
</a>
```

Point it at the content scroller's id (which is `tabindex="0"`, so the target is focusable and scrolls into view). Add a second "Skip to navigation" → `#docs-nav` on desktop.

---

## Component Inventory, Tokens & Migration Plan

This is the consolidated build plan. It names every Astro component to add/change and pins each structural device to an existing Inkwell token. **No new color is introduced anywhere.** All measurements are quoted from the Stripe audit (1440×900); all color/spacing references resolve to tokens already in `main.css`.

### Component inventory

| Component (new/rework) | Responsibility | Replaces / edits |
|---|---|---|
| `AppShell.astro` | The `100dvh` non-scrolling frame **at `wide:`**: `grid; grid-template-columns: 280px 1fr; wide:h-[100dvh] wide:overflow-hidden`. Owns the three scroll regions. | **New.** `DocsLayout` becomes a thin consumer. |
| `DocsLayout.astro` (rework) | Slots into `AppShell`: `<DocsSidebar/>` col 1, (`<DocsNavbar/>` + `<main>`) stacked col 2. Drops the old 3-column model; adds scrollspy, skip links, drawer focus-trap, `/`-key handler. | **Edits** `src/layouts/DocsLayout.astro`. |
| `DocsNavbar.astro` | The 56px pinned bar inside the right region. Language/section context left; `Docs`/`Spec`/`GitHub` + theme toggle right. Pinned via flow, not `position:fixed`. `Docs` link seeded by persisted code-lang. | **Extracted from / replaces** `AppHeader.astro`'s docs-mode markup. `AppHeader` remains for the marketing home. |
| `DocsSidebar.astro` (rework) | 280px full-height column; `static` grid cell at `wide:`, `fixed` drawer below. Fixed top zone (brand + search trigger + Ask AI + language) then an independently scrolling nav tree. Renders `NavSection[]`; active resource expands into the per-page TOC. | **Replaces** `DocsSidebar.astro` (`w-72`→`w-70`); folds in `DocsToc`. |
| `ArcpSection.astro` | The core grid wrapper: `wide:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]`. Slots `main` (left) and `aside` (right). One block per object/method/concept. | **New.** |
| `CodePanel.astro` (+ `LangTabs`, `CodeVariant`, `ResponseBlock`, `LlmMenu`, `code-lang.ts`) | The right `aside` **on curated pages only**: `position:sticky; top:1rem` (`wide:`). `--code-bg` surface (light paper in light, ink in dark). Header (`MethodPill` + `LangTabs` view toggle + actions) over request + `RESPONSE`. | **New.** Generalizes the home `.code-window`. |
| `RefSection.astro` / `RefRow.astro` / `RefBadge.astro` / `SignaturePill.astro` / `RefMore.astro` | The attribute/parameter row anatomy + section wrapper + status badge + signature pill + `<details>`-based "More/Expand all". Shared by the rehype pass (generated) and curated pages. | **New.** Plus `rehype-arcp-reference.mjs`. |
| `NavBadge.astro` | The `v2`/`beta`/`deprecated` pill, reused in nav and as `RefBadge`. | **New.** |
| `StartLayout.astro` + `StartRightRail.astro` + `StartCallout.astro` + `LangToggle.astro` | The `/api`-landing analog using the **same** `ArcpSection` grid; a curated page carrying all 12 code variants. | **New** docs entry; not the marketing `index.astro`. |
| `SearchModal.astro` | `<dialog>` shell + `/` hotkey + lazy Pagefind UI (future work; trigger ships disabled/"soon" or omitted). | **New.** |
| `code-langs.ts` / `docs-nav.ts` additions / `nav-groups.ts` | `CODE_LANGS` (off `LANG_ITEMS`, `spec` mapped — no separate `WIRE`); `NavSection`, `groupLangNav()`, `badge` on `NavItem`; curated `CONCEPTS`/`GROUPS` manifests (members keyed by real generated leaves or authored pages). | **New / extend.** |

Retired on reference pages: **`DocsToc.astro`** — folded into the sidebar's active-resource expansion. Kept as a per-route option for long-form `/spec/...` narrative.

### Inkwell token usage per structural device

Token quick-reference (light values; all swap under `.dark`):

```
--bg #f5f1e8   --paper #fbf8f1   --ink #1b1815   --ink-soft #3c372f
--muted #5a5448   --faint #6a6357   --line #ddd5c5   --line-soft #e8e1d3
--accent #c2431c (vermilion-600)   --accent-dim #8b5a2b
--code-bg #fcfaf4 (light) / #1a1813 (dark)   --str #4f6b3a   --key #9a4a1f
```

| Device | Token usage |
|---|---|
| **App shell frame** | `bg-bg` on `<body>`; the paper-grain `body::before` stays; `AppShell` transparent. |
| **Sidebar surface** | `bg-bg`; right edge `border-r border-line`; brand-zone bottom `border-b border-line-soft`. |
| **Nav — idle / hover / active** | idle `text-ink-soft font-mono text-small`; hover `text-accent` (+ optional `bg-paper`); active `text-accent font-medium` + 2px `border-l-2 border-accent`; active-trail ancestors `text-ink`. |
| **Group header (uppercase)** | `.label` verbatim — `font-mono text-mini tracking-label uppercase text-muted font-medium`. |
| **Navbar** | `bg-bg border-b border-line`; links `text-ink-soft` → hover `text-accent`; active section `text-accent`. |
| **Section divider** | `.rule` (`border-t border-line`); strong object/endpoint boundary uses `.section-marker` (`border-t-2 border-accent`). |
| **Section eyebrow** ("Attributes"/"Parameters"/"Returns") | `.section-title` (`font-mono text-small tracking-marker uppercase text-muted`). |
| **Code panel surface** | `--code-bg` (light paper in light, ink in dark) + `border border-line rounded-lg overflow-hidden`; body `pre` `font-mono text-code text-ink-soft`. |
| **Code panel header** | `.code-window__bar` verbatim. |
| **RESPONSE label tint** | `--faint` on the `--code-bg` surface (resolves in both themes; never "dark-panel tint"). |
| **Syntax tokens** | Shiki dual-theme `arcp-light`/`arcp-dark`; hand-built JSON uses `.tok-str`→`text-str`, `.tok-key`→`text-key`, `.tok-punc`→`text-faint`. |
| **`MethodPill` / `signature-pill`** | `.chip` (`bg-code-bg border border-line rounded-chip`); verb/opcode in `--accent-dim`. |
| **`LangTabs` (idle/hover/active)** | `.lang-chip` / `.lang-chip:hover` (`border-accent text-accent`) / `.lang-chip.is-active` (`border-accent bg-paper text-accent font-medium`) — these three states already exist and map 1:1 onto Stripe's selector states. |
| **`RefRow` name / type / description** | name `font-mono text-code text-ink`; type `font-mono text-mini text-muted`; description `text-ink-soft`. |
| **`RefBadge`/`BadgePill`** | **Single canonical contract (see Reference §Badges — that section is authoritative):** base `.chip` quiet; `Required`→`--muted`; `Optional`→`--faint`; `Can-expand`/`read-only`→`--accent-dim`/`--faint`; `Deprecated`→`--accent` + `line-through` (the **only** accent badge). Accent is reserved for at most one badge. **No new hues.** |
| **Reference-row hover** | the shipped `color-mix(in srgb, var(--paper) 55%, transparent)` (currently `.prose tbody tr:hover`), hoisted to a `.row-hover` utility. |
| **`MoreAttributes` collapse** | `<details>` summary as `.btn-arrow` (mono, `border-b-[1.5px] border-accent`); long-tail border `border-l border-line-soft`. |
| **Start-page callouts** | `.envelope` + `.envelope__tag`; `--dashed` variant (`border-dashed border-accent-dim`) for softer asides. |
| **Focus / keyboard** | the global `:focus-visible { outline: 2px solid var(--accent) }` covers every new focusable. |

Net new tokens required: **zero.** The only additive CSS is structural (grid/sticky/overflow declarations, the 12 generated `data-code-lang` reveal rules, and a hoisted `.row-hover` utility reusing an existing `color-mix`).

### What we deliberately do NOT copy

- **Stripe's colors.** No white app shell, no blurple (`#635bff`), no Stripe greens/purples in code. Paper `--bg`, ink `--ink`, single vermilion `--accent`.
- **A permanently-dark code panel in light theme.** We use `--code-bg`, which in Inkwell light is a *light paper* panel and in dark is ink — the panel **tracks the theme**. There is no "dark panel" in light mode anywhere in this design (labels and diagrams say `--code-bg`, never "dark"). We adopt the panel's structural role, not its forced darkness. This is the single largest deliberate departure.
- **Stripe iconography & wordmark.** No "API" badge, no Stripe glyphs, no Algolia-branded chrome. Icons are inline hand-coded SVGs. The brand zone shows the ARCP wordmark + blinking `.arcp-caret`.
- **Product-switcher / version-pill semantics.** ARCP has no API version and no product catalog; the navbar left slot carries SDK-language context + the Docs/Spec switch instead.
- **Secret-key / live-key affordances.** No `-u "<KEY>:"` idiom; ARCP is a protocol + SDKs, not a credentialed hosted API.
- **Sans-serif typography.** Inkwell has no sans family (body `--font-serif` Newsreader, signal `--font-mono` IBM Plex Mono). We do not introduce a sans face to mimic Stripe's chrome.
- **External API-explorer / playground links.** ARCP has none; the code-panel "copy link" is an in-page anchor (link glyph), never an open-in-new that implies leaving the page.

### Reconciliation with "pixel-faithful, NOT a redesign" (the boundary)

`docs/markdoc-migration.md` calls the Nuxt→Astro move a *framework migration* with a *pixel-faithful* result and a *sacred* Inkwell system. This work is a redesign of the docs *reading shell*; we scope it rather than deny it:

1. **Two separable layers.** The **visual system** (palette, fonts, weights, spacing tokens, dark/light values, Shiki colors, paper grain) is the sacred part — and this plan changes **none** of it (zero new tokens, zero new colors). The **reading shell** (three-column scrolling document → app-shell + section grid) is a layout concern the migration doc never froze; it only froze the *look*.
2. **Scoped, intentional, sequenced.** The framework migration must reach its parity gate **first** (every route 2xx, zero link 404s, token parity, OG/sitemap intact). This shell is a **follow-on epic** that consumes the migrated tokens; it does not block or weaken the parity gate.
3. **Annotate the two deltas, don't silently override.** This plan supersedes exactly two migration-doc assumptions, to be noted in `MIGRATION.md`: the three-column `sidebar · main · toc` layout → two-region app shell with the TOC folded into the sidebar (`DocsToc` retained only for `/spec` narrative); and the mobile-only `<select>` language switcher → the sidebar/rail navigation chips + the in-page `LangTabs` view toggle. Everything else (URL preservation, `transformLink` rewriting, Shiki dual-theme, content collections, the sync pipeline) is unchanged and still binding.
4. **What is and isn't pixel-faithful (precise claim).** **Existing shared elements** — the chip, the `.code-window`, the `.label`, the active nav row, the `.lang-chip` — are reused **verbatim** and remain **pixel-faithful** to `www`. **Net-new elements** that `www` never had — the `signature-pill`, the `ref-row` anatomy (hover permalink + source ↗), the code-panel header bar, the `/`-search trigger with kbd — are **new**, built **only from existing tokens/classes**, so they are **visually consistent with** `www`, not pixel-identical to a component that never existed there. We do not claim pixel-fidelity for components `www` never had.

---

## Open questions & risks

- **Machine-gen content fit (highest risk).** The two-column "object + endpoints" model is hand-authored at Stripe; ARCP's ~2,286 docs are TypeDoc trees (PascalCase leaves under `interfaces/`/`functions/`/`classes/`) with no notion of "attributes vs. parameters," no curated common/advanced split, no friendly Returns prose, and no left-column narrative. *Open question:* can `RefRow`/`MoreAttributes` be derived purely from the existing heading + `>`-signature structure, or does the sync pipeline need richer structure? *Mitigation:* generated `api/**` pages render **single-column with NO code panel** (progressive enhancement); the two-column code-panel split is curated-only. Do not require every page to look like Stripe.
- **IA grouping is curated, not emergent.** The `CORE`/`CONTROL`/… grouping does **not** fall out of the generated TypeDoc tree — its leaves are `ARCPClientOptions`/`subscribeEnvelopes`, not `agent`/`runtime`. Until a curation pass adds concept pages (or the manifest is keyed by real leaves), the whole generated tree renders under `API REFERENCE`. *Mitigation:* `groupLangNav` drops unmatched members silently (no fabricated rows); verify every manifest member against the actual tree before claiming a group works.
- **2,286-file performance.** Client-side weight per page — sticky panels, `LangTabs`, large `<details>` trees. *Mitigation:* generated pages ship **zero** code variants (no panel); keep `CodePanel`/`LangTabs` as zero/micro-island JS on curated pages (CSS-only reveal + one delegated listener); validate scroll/sticky perf on the largest kotlin page in Phase 1 **before** the grid lands. Confirm `position:sticky` resolves against the content pane (`overflow-y:auto`) — verified, not assumed.
- **`wide:` variant generation (load-bearing).** Every `wide:` class depends on Tailwind v4 emitting a `wide:` variant from `--breakpoint-wide`. Confirmed for `tailwindcss@^4.3.1`, but `main.css` has no custom breakpoint today, so add a Phase-1 build assertion (a `wide:hidden` probe) before relying on it. Note `80rem` coincidentally equals the existing `AppHeader` `max-w-[80rem]`; keep them separate so edits don't desync.
- **`min-h-0` / sticky-in-grid traps.** The shell silently fails if `min-h-0` is missing on the flex column/`<main>` (overflow never engages) or if the aside lacks `self-start` (grid `stretch` kills sticky). Call both out in code review.
- **Inert affordances (search / Ask AI / Ask-about-section).** A dead control reads as broken. *Decision (applied consistently):* the search trigger and Ask AI ship **disabled with a "soon" affordance** or omitted until Pagefind lands; `Ask about this section` renders **only** if `consts.ts → LLM_ASK_URL` is set, otherwise it is omitted. `Copy for LLM` and `View as Markdown` are fully static and ship live.
- **TOC regression on narrative pages.** Folding `DocsToc` into the sidebar suits resource pages but may hurt long `/spec` prose. *Mitigation:* keep `DocsToc` as a per-route layout option for `/spec/...`.
- **Sticky panel vs. short sections.** If a curated section's prose is shorter than its code panel, the panel has nowhere to travel. *Mitigation:* a min-height on `ArcpSection`, or let the panel scroll normally when prose height < panel height.
- **The megablob type label.** Real data has a ~4,000-char inlined union in one `## Returns`. The rehype pass must collapse type labels over ~120 chars / >3 top-level `\|` members behind a `Show full type` `<details>`, or the row is an unreadable wall.
- **Deep-link / anchor parity.** Migration constraint 2 (preserve URLs) and slugged anchor ids still bind; `RefRow` permalink anchors and `ArcpSection` ids must reuse the **same** slugging so existing cross-repo links keep resolving.
- **Body-scroll assertion is band-specific.** Acceptance check #1 (`window.scrollY === 0`) is **desktop-only** (`≥1280`); below `wide:` the body **does** scroll and check #2 asserts no inner pane traps it. The two are not contradictory — they are the two bands.
- **Drawer breakpoint shift (1024 → 1280).** Intentional, but a visible behavior change for 1024–1279px viewports; document it.
- **Render-all payload (curated only).** ~12× code markup applies **only** to curated pages with a panel; if a curated page bloats, gate behind a per-page `codeLangs` allowlist. Generated pages have no panel and no allowlist.

---

## Build checklist

Ship behind a route/layout flag so reference pages opt in while `/spec` narrative and the home stay on the current layout until each phase lands.

**Phase 0 — Migration parity (prerequisite)**
- [ ] The Astro+Markdoc migration (doc Steps 0–9) passes its acceptance gate (every route 2xx, zero link 404s, token parity, OG/sitemap intact). Nothing below starts until docs render at token-parity with `www`.
- [ ] Record in `docs/markdoc-migration.md` / epic #1 that the Stripe-style shell is an explicit, scoped redesign of the docs reading surface, with URL preservation and the Inkwell palette as the hard constraints, and annotate the two superseded assumptions (3-column layout; mobile-only `<select>`).

**Phase 1 — Shell + navigation**
- [ ] Add `--breakpoint-wide: 80rem` to the `@theme` block in `main.css`; **add a build assertion that the `wide:` variant emits** (a `wide:hidden` probe hidden ≥1280 in built CSS); add `.content-scroll { scroll-behavior }` + its reduced-motion target; add `.drawer-open { overflow:hidden }`.
- [ ] Add `AppShell.astro`; rework `DocsLayout.astro` root to `grid grid-cols-1 wide:grid-cols-[280px_minmax(0,1fr)] wide:grid-rows-1 wide:h-[100dvh] wide:overflow-hidden`; right column `flex flex-col min-h-0` with `DocsNavbar` + `<main id="content-pane" class="content-scroll flex-1 min-h-0 wide:overflow-y-auto" tabindex="0" role="region">`.
- [ ] Add `DocsNavbar.astro` (56px, no sticky/centering/blur; reuse `toggle-nav` bridge + `ThemeToggle`; `Docs` link seeded by persisted code-lang); render it instead of `AppHeader` in docs.
- [ ] Rework `DocsSidebar.astro`: `w-72`→`w-70`, `fixed wide:static wide:h-auto h-[100dvh] flex flex-col overflow-hidden`; pin brand/search/Ask AI/language top zone (`shrink-0`); scroll only `#docs-nav-tree` (`flex-1 min-h-0 overflow-y-auto overscroll-contain` + `tabindex="0" role="region"`); `z-30`→`z-40`.
- [ ] Add `nav-groups.ts` (`CONCEPTS`, `GROUPS` with members keyed by **real generated leaves or authored pages**) + `groupLangNav()` + `NavSection`/`badge` in `docs-nav.ts` (downstream of `dedupe`, unchanged); pass `navSections` + `pageToc` to the sidebar.
- [ ] Delete the `DocsToc` third column + import from `DocsLayout`; fold its `buildToc` output into the sidebar's active-resource expansion; add the scrollspy `IntersectionObserver` (scoped to `#content-pane` / `#docs-nav-tree`); keep `DocsToc` available for `/spec` routes only.
- [ ] Add `NavBadge.astro` (shared with `RefBadge`).
- [ ] Extend `setDrawer()` with focus trap/restore + `aria-hidden` + `.drawer-open` scroll lock + Esc (guarded on `matchMedia('(max-width: 79.99rem)')`); make the hamburger a real `<button>` with `aria-controls`/`aria-expanded`/`aria-label`.
- [ ] Add skip link(s) as the first focusable element; add the `/`-key search handler (defensive, ignores form fields); ship the `SearchModal.astro` `<dialog>` shell + **disabled/"soon" or omitted** trigger (Pagefind deferred).
- [ ] Gate all `scrollIntoView` on `prefers-reduced-motion`.
- [ ] **Validate** the band-specific no-body-scroll acceptance checks (#1 desktop-only `scrollY===0`; #2 tablet/mobile body-scrolls-no-trap) and scroll/sticky perf on the largest kotlin page before adding the grid.

**Phase 2 — Section grid + curated code panel + view toggle**
- [ ] Add `ArcpSection.astro` (`wide:grid wide:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-10`; aside `wide:sticky wide:top-4 wide:self-start`; DOM order prose-then-code; **no `order`**).
- [ ] Add `src/lib/code-langs.ts` — `CODE_LANGS = LANG_ITEMS.map(...)` with `spec` mapped to `bash`/`json` and a `curl · HTTP` label override; **no separate `WIRE` entry, no double-counted `spec`**; `DEFAULT_LANG='spec'`.
- [ ] Add `src/components/code/{CodePanel,LangTabs,CodeVariant,ResponseBlock,LlmMenu}.astro` + `code-lang.ts` — **`CodePanel` used on curated pages only**; `LangTabs` is a view toggle (writes `data-code-lang`, never navigates); `ResponseBlock` shows an `Event` frame for streaming (never a `has_more` list envelope).
- [ ] Add the render-blocking `<head>` code-lang init snippet to `BaseLayout.astro` beside the theme-init script.
- [ ] Add the 12 generated `:root[data-code-lang=…] .code-variant[data-lang=…]` reveal rules to `main.css` (unlayered), generated from `CODE_LANGS`; SSR default `data-code-lang="spec"`.
- [ ] Add `.CodePanel` token rules reusing `--code-bg` (light paper / ink, **no "dark"**); RESPONSE label `--faint` on `--code-bg`; **scope** them so `.prose pre` (lines 366–373) keeps governing left-column prose.
- [ ] Add the `/<lang>/<page>.md` build-time artifact route for "View as Markdown" / LLM fetch; wire `Copy for LLM` (live) and `Ask about this section` (only if `consts.ts → LLM_ASK_URL` set, using `LLM_ASK_PROMPT`).
- [ ] Language controls: tabs (landing) / native `<select>` (per-panel + mobile); `aria-live="polite"` on the request/response region; global `arcp:lang` `CustomEvent` sync; `flex-wrap` header on mobile.

**Phase 3 — Reference-row styling (single-column, no panel)**
- [ ] Add `rehype-arcp-reference.mjs`, registered in `astro.config.mjs` `markdown.rehypePlugins`, path-gated to `api/**`: wrap sections, build `.ref-row` from `###`/`####` + `>` signatures, parse badges/types, restyle `***`→`--line`, add hover permalink anchors, apply the length-based "More…/Expand all" + megablob collapse, render the **single-language** signature pill (verb fixed to the URL segment), normalize empty `## Parameters` → `No parameters.`, render `## Returns` as a (collapsible) **type label** (not friendly prose). **No `CodePanel`.**
- [ ] Add `RefSection`/`RefRow`/`RefBadge`/`SignaturePill`/`RefMore` Astro components (curated + shared) emitting identical HTML to the pass; curated pages may add friendly Returns prose + language-aware verb.
- [ ] Add the `@layer components` block in `main.css` for `.ref-row*` (single canonical badge contract: only `Deprecated` carries accent), `.ref-section*`, `.ref-more*`, `.ref-expand-all`, `.signature-pill*`, `.ref-enum` (all referencing existing tokens + the hoisted `.row-hover`).
- [ ] Add `ref-expand.ts` for the "Expand all" button + child disclosures (progressive enhancement). Permalink anchors always in tab order, `aria-label`'d, `aria-live` "Link copied".

**Phase 4 — Start page (curated, all 12 variants)**
- [ ] Add `StartLayout.astro` + `src/pages/[lang]/index.astro` (`getStaticPaths` over `SDKS`) reusing `AppShell`/`ArcpSection`/`CodePanel`.
- [ ] Add `StartRightRail.astro`, `StartCallout.astro`, `LangToggle.astro` (**navigation** links to `/<lang>`, not view state); add `content/start/concepts.ts` (8 sections: id, H2, prose, `code: Record<lang,highlightedHTML>`, optional `wire`, `op`) + `quickstart.ts` (per-lang install line + connect snippet + runtime requirement).
- [ ] Make `/<lang>`'s nav slice lead with a **Start** group whose children are the eight concept anchors (sidebar = page TOC); deep API-reference + Guides groups follow.
- [ ] Migrate the eleven hand-written `src/content/docs/<lang>/index.md` into the start data (URLs `/<lang>` preserved); add the `arcp-lang` persistence + bare-`/docs` redirect to the remembered language.

**Phase 5 — deferred (not scheduled)**
- [ ] Pagefind search backend (`pagefind --site dist` postbuild; lazy UI; `lang` filter); Ask AI backend; any additional LLM affordances beyond the static `.md`/clipboard/deep-link set.
