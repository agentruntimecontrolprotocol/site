// The code-panel language set — the VIEW toggle exposed inside a CodePanel.
//
// Distinct from the sidebar language chips, which NAVIGATE between /<lang>
// content artifacts. This toggle only reveals an already-rendered variant on
// the current page (see docs/docs-presentation.md → Code Panel).
//
// `LANG_ITEMS` already contains `spec`, so we do NOT prepend a separate `wire`
// pseudo-language: the `spec` view IS the language-neutral wire view (curl
// request + JSON envelope). 12 views total = 11 SDKs + spec.
import { LANG_ITEMS } from './docs-nav';

// `spec` renders curl/bash (request) + json (response); all others map 1:1.
const SHIKI: Record<string, string> = {
  spec: 'bash',
  typescript: 'typescript',
  python: 'python',
  rust: 'rust',
  go: 'go',
  java: 'java',
  kotlin: 'kotlin',
  php: 'php',
  ruby: 'ruby',
  swift: 'swift',
  csharp: 'csharp',
  fsharp: 'fsharp',
};

const LABEL_OVERRIDE: Record<string, string> = { spec: 'curl · HTTP' };

export const CODE_LANGS = LANG_ITEMS.map((l) => ({
  id: l.value,
  label: LABEL_OVERRIDE[l.value] ?? l.label,
  shiki: SHIKI[l.value] ?? 'text', // never undefined — `spec` is mapped above
}));

/** Language-neutral protocol view; the SSR default + no-JS fallback. */
export const DEFAULT_LANG = 'spec';
export const LS_KEY = 'arcp:code-lang';

export type CodeLang = (typeof CODE_LANGS)[number]['id'];
