import { marked } from 'marked';
import { createHighlighter, type Highlighter } from 'shiki';
import { arcpLight, arcpDark } from '../../shiki-arcp.mjs';

// Build-time renderers for the four runtime <MDC> renders on the home page
// (hero.lede, section body, step descriptions, code sample). Replaces Nuxt's
// runtime <MDC> with static HTML generated at build.

/** Inline markdown (no wrapping <p>) — for hero lede and step descriptions. */
export function renderInline(md: string): string {
  return marked.parseInline(md) as string;
}

/** Block markdown (paragraphs, links) — for section bodies. */
export function renderBlock(md: string): string {
  return marked.parse(md) as string;
}

const LANGS = [
  'json', 'bash', 'typescript', 'javascript', 'python', 'rust', 'go',
  'yaml', 'toml', 'http', 'csharp', 'fsharp', 'java', 'kotlin', 'php',
  'ruby', 'swift',
];

let highlighter: Promise<Highlighter> | undefined;
function getHighlighter() {
  if (!highlighter) {
    highlighter = createHighlighter({ themes: [arcpLight, arcpDark], langs: LANGS });
  }
  return highlighter;
}

/**
 * Highlight a code sample with the arcp dual themes. Produces light colors
 * inline + `--shiki-dark` vars, class-swapped by src/styles/shiki.css (which
 * targets both `.astro-code` and `.shiki`).
 */
export async function highlightCode(source: string, lang: string): Promise<string> {
  const hl = await getHighlighter();
  return hl.codeToHtml(source.trimEnd(), {
    lang: LANGS.includes(lang) ? lang : 'text',
    themes: { light: 'arcp-light', dark: 'arcp-dark' },
  });
}
