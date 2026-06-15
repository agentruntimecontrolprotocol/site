// @ts-check
import { defineConfig } from 'astro/config';

import markdoc from '@astrojs/markdoc';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

import { SITE } from './src/consts';
import { arcpLight, arcpDark } from './shiki-arcp.mjs';

// https://astro.build/config
//
// `site` is the canonical origin, mirrored verbatim from the existing Nuxt site
// (`www/nuxt.config.ts` -> `site.url`). It is required by `@astrojs/sitemap` and
// by SEO canonical-URL generation. No trailing slash — the deployed site serves
// URLs without one.
//
// Note: `@astrojs/vue` is intentionally NOT registered. The migration plan ports
// the existing Vue components to `.astro` rather than reusing them as islands.
export default defineConfig({
  site: SITE.url,
  output: 'static',
  integrations: [markdoc(), sitemap()],
  // The synced SDK docs are plain machine-generated GFM (.md), rendered by
  // Astro's built-in markdown (lenient — passes raw HTML through, so the
  // <picture>-derived diagram <img>s and inline <br>/<sub>/<a> render, and bare
  // generics like `Foo<Bar>` don't break the build). Markdoc (.mdoc) is too
  // strict for that machine-generated content, so docs use markdown; Markdoc
  // stays wired for any hand-authored .mdoc. Both paths share the brand Shiki
  // themes (here for .md; markdoc.config.mjs for .mdoc), class-swapped by
  // src/styles/shiki.css.
  markdown: {
    // Bundled languages (json, typescript, http, …) are auto-loaded on demand by
    // Astro's Shiki, so only the brand themes need configuring here.
    shikiConfig: {
      themes: { light: arcpLight, dark: arcpDark },
      wrap: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
