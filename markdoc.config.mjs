import { defineMarkdocConfig } from '@astrojs/markdoc/config';
import shiki from '@astrojs/markdoc/shiki';

import { arcpLight, arcpDark } from './shiki-arcp.mjs';

// Canonical 17-lang list + dual brand themes, mirrored from www/nuxt.config.ts.
// `themes` (not `theme`) emits dual-theme output: Shiki writes the light color
// inline and the dark color as a `--shiki-dark` CSS var. The class-based switch
// (`html.dark .astro-code …`) lives in src/styles/shiki.css so highlighting
// follows the in-app `.dark` toggle from Step 1, NOT prefers-color-scheme.
//
// Heading slugs: @astrojs/markdoc's default `heading` node already assigns ids
// via github-slugger (same as www's @nuxt/content / rehype-slug), so deep-link
// anchors match — no override needed.
const LANGS = [
  'json', 'bash', 'typescript', 'javascript', 'python', 'rust', 'go',
  'yaml', 'toml', 'http', 'csharp', 'fsharp', 'java', 'kotlin', 'php',
  'ruby', 'swift',
];

export default defineMarkdocConfig({
  extends: [
    await shiki({
      themes: { light: arcpLight, dark: arcpDark },
      langs: LANGS,
      wrap: false,
    }),
  ],
});
