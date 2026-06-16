// Per-page Markdown artifact — emits the raw source markdown of every doc page
// at `/<slug>.md`. Powers the "View as Markdown" / "Copy for LLM" affordances
// and gives agents/LLMs a clean, render-free fetch of any page (on-brand for an
// agent protocol; generalizes toward an llms.txt convention).
//
// Distinct route from `[...slug].astro` (the `.md` extension disambiguates), so
// `/python/getting-started` serves HTML and `/python/getting-started.md` the raw
// markdown — no collision.
import type { APIRoute, GetStaticPaths } from 'astro';
import { SITE } from '../consts';
import { getDocsEntries, entryToPath } from '../lib/docs-nav';

export const getStaticPaths: GetStaticPaths = async () => {
  const entries = await getDocsEntries();
  return entries.flatMap((entry) => {
    const path = entryToPath(entry.id);
    if (path === '/') return [];
    return [{ params: { slug: path.slice(1) }, props: { entry, path } }];
  });
};

export const GET: APIRoute = ({ props }) => {
  const { entry, path } = props as { entry: { body?: string }; path: string };
  const source = `<!-- ARCP docs · source: ${SITE.url}${path} -->\n\n${entry.body ?? ''}`;
  return new Response(source, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
