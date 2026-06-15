import { getCollection, type CollectionEntry } from 'astro:content';

// Language route keys. SDKS render an API reference + guides; `spec` is the
// specification. Order drives the language-chip row.
export const SDKS = [
  'csharp', 'fsharp', 'go', 'java', 'kotlin', 'php',
  'python', 'ruby', 'rust', 'swift', 'typescript',
] as const;
export const LANGS = [...SDKS, 'spec'] as const;

// Display labels for the language switcher (route keys stay lowercase).
// Complete 12-entry map — note www's [...slug].vue was missing `rust` (a bug).
export const LANG_LABELS: Record<string, string> = {
  csharp: 'C#',
  fsharp: 'F#',
  go: 'Go',
  java: 'Java',
  kotlin: 'Kotlin',
  php: 'PHP',
  python: 'Python',
  ruby: 'Ruby',
  rust: 'Rust',
  swift: 'Swift',
  typescript: 'TypeScript',
  spec: 'Spec',
};

export const LANG_ITEMS = LANGS.map((value) => ({
  label: LANG_LABELS[value] ?? value,
  value,
}));

export const API_ROOT_LABELS: Record<string, string> = {
  csharp: 'C# API reference',
  fsharp: 'F# API reference',
  go: 'Go API reference',
  java: 'Java API reference',
  kotlin: 'Kotlin API reference',
  php: 'PHP API reference',
  ruby: 'Ruby API reference',
  python: 'Python API reference',
  rust: 'Rust API reference',
  swift: 'Swift API reference',
  typescript: 'TypeScript API reference',
  spec: 'Specification',
};

export type NavItem = { path: string; title?: string; children?: NavItem[] };

/** Map a `docs` collection entry id to its URL path (no trailing slash). */
export function entryToPath(id: string): string {
  const trimmed = id.replace(/\.(md|mdoc)$/i, '').replace(/\/?index$/i, '');
  return trimmed ? `/${trimmed}` : '/';
}

/** First `# H1` of a raw markdown/markdoc body, used as the page title. */
export function firstH1(body?: string): string | undefined {
  if (!body) return undefined;
  const m = body.match(/^#\s+(.+?)\s*$/m);
  return m ? m[1].replace(/`/g, '').trim() : undefined;
}

function titleize(segment: string): string {
  return segment
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function lastSegment(path: string): string {
  const parts = path.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

function parentPath(path: string): string {
  const parts = path.split('/').filter(Boolean);
  parts.pop();
  return parts.length ? `/${parts.join('/')}` : '';
}

export function normalizeTitle(title: string | undefined, lang: string): string | undefined {
  if (!title) return title;
  if (title === 'Documentation') return API_ROOT_LABELS[lang] ?? `${LANG_LABELS[lang] ?? lang} API reference`;
  return title;
}

// Drop duplicate index children, collapse redundant single-child wrappers, and
// normalize generator-driven API root labels across SDKs. Ported verbatim from
// www/app/layouts/docs.vue.
export function dedupe(nodes: NavItem[] | undefined, parentPathArg?: string, lang?: string): NavItem[] {
  const seen = new Set<string>();
  const out: NavItem[] = [];

  for (const node of nodes ?? []) {
    if (parentPathArg && node.path === parentPathArg) continue;

    if (seen.has(node.path)) {
      const existing = out.find((n) => n.path === node.path);
      if (existing && node.children?.length && !existing.children?.length) {
        existing.children = dedupe(node.children, node.path, lang);
      }
      continue;
    }

    seen.add(node.path);
    let children = dedupe(node.children, node.path, lang);
    let title = normalizeTitle(node.title, lang ?? 'spec');

    // TypeDoc emits a redundant "Documentation" wrapper with one package child.
    if (children.length === 1 && children[0].children?.length && (title === 'Documentation' || /\/api$/.test(node.path))) {
      const child = children[0];
      children = child.children ?? [];
      if (child.title && !child.title.startsWith('@')) {
        title = child.title;
      }
    }

    out.push({ ...node, title, children });
  }

  return out;
}

/** Build the hierarchical nav tree from the flat docs collection. */
export function buildNavTree(entries: CollectionEntry<'docs'>[]): NavItem[] {
  const titleByPath = new Map<string, string | undefined>();
  for (const e of entries) {
    const path = entryToPath(e.id);
    if (path === '/') continue; // never produced as a doc route
    titleByPath.set(path, e.data.title ?? firstH1(e.body) ?? titleize(lastSegment(path)));
  }

  const nodeByPath = new Map<string, NavItem>();
  const roots: NavItem[] = [];

  function ensure(path: string): NavItem {
    let node = nodeByPath.get(path);
    if (node) return node;
    node = { path, title: titleByPath.get(path) ?? titleize(lastSegment(path)) };
    nodeByPath.set(path, node);
    const parent = parentPath(path);
    if (parent) {
      const pn = ensure(parent);
      (pn.children ??= []).push(node);
    } else {
      roots.push(node);
    }
    return node;
  }

  for (const path of [...titleByPath.keys()].sort()) ensure(path);
  return roots;
}

/** The per-language nav slice: children of `/${lang}`, deduped. */
export function langNavFor(tree: NavItem[], lang: string): NavItem[] {
  const root = tree.find((n) => n.path === `/${lang}`);
  return dedupe(root?.children, root?.path, lang);
}

/** Resolve the active language from a path's first segment (falls back to spec). */
export function currentLangFor(path: string): string {
  const seg = path.split('/').filter(Boolean)[0] ?? '';
  return (LANGS as readonly string[]).includes(seg) ? seg : 'spec';
}

/** SEO/section label (`Python · API`, `Specification`, …). Consumed in Step 7. */
export function sectionLabel(path: string): string {
  const segments = path.split('/').filter(Boolean);
  const lang = segments[0] ?? 'docs';
  const label = LANG_LABELS[lang] ?? lang;
  const rest = segments.slice(1);
  if (!rest.length) return label;
  if (rest[0] === 'guides') return `${label} · Guides`;
  if (rest[0] === 'api') return `${label} · API`;
  if (lang === 'spec') return 'Specification';
  return label;
}

export type TocLink = { id: string; text: string; depth?: number; children?: TocLink[] };

/** Convert Astro's heading list into the 2-level TOC tree DocsToc expects. */
export function buildToc(headings: { depth: number; slug: string; text: string }[]): TocLink[] {
  const links: TocLink[] = [];
  for (const h of headings) {
    if (h.depth === 2) {
      links.push({ id: h.slug, text: h.text, depth: 2, children: [] });
    } else if (h.depth === 3 && links.length) {
      links[links.length - 1].children!.push({ id: h.slug, text: h.text, depth: 3 });
    }
  }
  return links;
}

/** Load the docs collection sorted by id (stable nav ordering). */
export async function getDocsEntries(): Promise<CollectionEntry<'docs'>[]> {
  const entries = await getCollection('docs');
  return entries.sort((a, b) => a.id.localeCompare(b.id));
}
