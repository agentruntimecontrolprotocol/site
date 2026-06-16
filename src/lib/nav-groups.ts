// Curated navigation manifests — the hand-maintained layer that gives the
// machine-generated docs tree the Stripe-style two-tier IA (a top ungrouped
// "concepts" list, then uppercase domain groups). Members are keyed by the
// REAL generated leaf slug (the last path segment); a member that matches
// nothing in the deduped tree is silently dropped — never a fabricated row.
//
// See docs/docs-presentation.md → "Information architecture: concepts + domain
// groups". `groupLangNav()` in docs-nav.ts consumes these.

/** Concept/guide pages promoted to the top of the sidebar, in reading order. */
export const CONCEPTS: Record<string, { path: string; title?: string }[]> = {
  // Every ARCP SDK ships the same hand-authored concept pages alongside its
  // generated `api/` tree. `cli` is absent for a couple of SDKs (java, ruby) —
  // it drops out gracefully there.
  _default: [
    { path: 'getting-started' },
    { path: 'architecture' },
    { path: 'conformance' },
    { path: 'cli' },
    { path: 'transports' },
    { path: 'troubleshooting' },
  ],
};

/** Uppercase domain groups (after concepts). `label` is shown via `.label`
 *  styling, which uppercases + tracks it, so pass natural case here. */
export const GROUPS: Record<string, { id: string; label: string; members: string[] }[]> = {
  _default: [
    // Tutorials + cookbook, grouped away from the generated reference.
    { id: 'guides', label: 'Guides', members: ['guides', 'recipes'] },
  ],
};
