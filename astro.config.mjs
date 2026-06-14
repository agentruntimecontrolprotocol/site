// @ts-check
import { defineConfig } from 'astro/config';

import markdoc from '@astrojs/markdoc';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

import { SITE } from './src/consts';

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
  vite: {
    plugins: [tailwindcss()],
  },
});
