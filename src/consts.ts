/**
 * Canonical site metadata, mirrored verbatim from the existing Nuxt 4 site
 * (`www/nuxt.config.ts` -> `site`). Single source of truth for layouts, SEO,
 * and `astro.config.mjs`'s `site` field.
 */
export const SITE = {
  /** Canonical origin. No trailing slash (deployed site serves URLs without one). */
  url: 'https://agentruntimecontrolprotocol.io',
  name: 'ARCP',
  description:
    'A transport-agnostic wire protocol for submitting, observing, and controlling long-running AI agent jobs.',
  defaultLocale: 'en',
} as const;

/** ARCP brand orange. Used for the `mask-icon` color (WCAG-deliberate palette). */
export const BRAND_COLOR = '#c2431c';
