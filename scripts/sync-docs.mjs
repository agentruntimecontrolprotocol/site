#!/usr/bin/env node
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(here, '..');
const arpcRoot = resolve(siteRoot, '..');

// In CI / Vercel the sibling SDK repos are not checked out, so pull docs
// straight from GitHub instead of the local filesystem.
const ORG = 'agentruntimecontrolprotocol';
const REMOTE = ["1", "true", "yes"].includes(
  String(process.env["SDK_DOCS_REMOTE"]).toLowerCase(),
);
const GITHUB_TOKEN =
  process.env["GITHUB_TOKEN"] || process.env["GH_TOKEN"] || "";

const SDKS = [
  'csharp',
  'fsharp',
  'go',
  'java',
  'kotlin',
  'php',
  'python',
  'ruby',
  'rust',
  'swift',
  'typescript',
];

const API_INDEX_TITLES = {
  csharp: 'C# API reference',
  fsharp: 'F# API reference',
  go: 'Go API reference',
  java: 'Java API reference',
  kotlin: 'Kotlin API reference',
  php: 'PHP API reference',
  python: 'Python API reference',
  ruby: 'Ruby API reference',
  rust: 'Rust API reference',
  swift: 'Swift API reference',
  typescript: 'TypeScript API reference',
};

const SOURCES = [
  ...SDKS.map((lang) => ({
    label: lang,
    repo: `${lang}-sdk`,
    docs: join(arpcRoot, `${lang}-sdk`, 'docs'),
    // Delta vs www: write into the Astro `docs` content collection dir.
    contentDest: join(siteRoot, 'src', 'content', 'docs', lang),
    publicDiagrams: `/diagrams/${lang}`,
    diagramsDest: join(siteRoot, 'public', 'diagrams', lang),
  })),
  {
    label: 'spec',
    repo: 'spec',
    docs: join(arpcRoot, 'spec', 'docs'),
    contentDest: join(siteRoot, 'src', 'content', 'docs', 'spec'),
    publicDiagrams: '/diagrams/spec',
    diagramsDest: join(siteRoot, 'public', 'diagrams', 'spec'),
  },
];

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

function rewriteDiagramRefs(markdown, publicDiagramsBase) {
  // Match any relative URL whose path includes a `diagrams/` segment and rewrite
  // it to the absolute /diagrams/<lang>/<rest>. Covers markdown links/images
  // and inline HTML src/href.
  const replaceUrl = (url) => {
    if (/^(https?:)?\/\//.test(url)) return url;
    if (url.startsWith('/')) return url;
    const m = url.match(/(?:^|[./])diagrams\/(.+)$/);
    if (!m) return url;
    return `${publicDiagramsBase}/${m[1]}`;
  };

  // markdown image / link: ![alt](url) and [text](url)
  let out = markdown.replace(/(!?\[[^\]]*\])\(([^)\s]+)(\s+"[^"]*")?\)/g, (full, label, url, title) => {
    return `${label}(${replaceUrl(url)}${title ?? ''})`;
  });

  // html src / href / srcset (srcset holds comma-separated "url [descriptor]" candidates)
  out = out.replace(/\b(src|href|srcset)=("([^"]+)"|'([^']+)')/g, (full, attr, _all, dq, sq) => {
    const value = dq ?? sq;
    if (attr !== 'srcset') return `${attr}="${replaceUrl(value)}"`;
    const rewritten = value
      .split(',')
      .map((candidate) => {
        const [url, ...descriptor] = candidate.trim().split(/\s+/);
        return url ? [replaceUrl(url), ...descriptor].join(' ') : candidate.trim();
      })
      .join(', ');
    return `${attr}="${rewritten}"`;
  });

  return out;
}

const GH_REF = 'main';

function splitHash(url) {
  const i = url.search(/[#?]/);
  return i === -1 ? [url, ''] : [url.slice(0, i), url.slice(i)];
}

// Resolve a relative link against a source file's docs-relative location and
// return repo-root-relative path segments. A leading run of '..' means the link
// escaped the repo root (only the sibling spec repo does this in practice).
function resolveRepoPath(fileRel, link) {
  const dir = fileRel.includes('/') ? fileRel.slice(0, fileRel.lastIndexOf('/')) : '';
  const out = `docs/${dir}`.split('/').filter(Boolean);
  for (const seg of link.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') {
      if (out.length && out[out.length - 1] !== '..') out.pop();
      else out.push('..');
    } else {
      out.push(seg);
    }
  }
  return out;
}

// Turn content-tree segments into a clean page path: drop the .md/.mdc
// extension and collapse readme/index to the directory index.
function cleanPage(segs) {
  const parts = [...segs];
  if (parts.length) {
    const last = parts[parts.length - 1].replace(/\.(md|mdc)$/i, '');
    if (/^readme$/i.test(last) || last === 'index') parts.pop();
    else parts[parts.length - 1] = last;
  }
  return parts.join('/');
}

// Rewrite a single relative markdown/HTML link. In-tree links become absolute
// site paths (so they resolve regardless of trailing slashes); links into the
// sibling spec repo map onto the published /spec page; links that escape into
// repo files that the site does not publish (README, examples/, source code)
// become canonical GitHub URLs.
function transformLink(url, lang, repo, fileRel) {
  // CommonMark allows angle-bracketed destinations: [text](<url>). Unwrap, then
  // re-wrap so the inner URL is classified (and absolute URLs left untouched).
  if (url.startsWith('<') && url.endsWith('>')) {
    return `<${transformLink(url.slice(1, -1), lang, repo, fileRel)}>`;
  }
  if (/^(https?:)?\/\//i.test(url)) return url;
  if (/^(mailto:|tel:|data:)/i.test(url)) return url;
  if (url.startsWith('#') || url.startsWith('/')) return url;

  const [path, hash] = splitHash(url);
  if (path === '') return url;

  const trailingSlash = path.endsWith('/');
  const segs = resolveRepoPath(fileRel, path);

  let lead = 0;
  while (segs[lead] === '..') lead += 1;
  const rest = segs.slice(lead);

  // SDK doc -> sibling spec repo: ../../spec/docs/<x> resolves to spec/docs/<x>.
  if (rest[0] === 'spec' && rest[1] === 'docs') {
    return `/spec/${cleanPage(rest.slice(2))}${hash}`;
  }

  // Stays inside this repo's docs/ tree -> absolute on-site path. The diagrams/
  // directory is not published as pages (only its rendered SVGs, via the
  // diagram pass), so links to the Graphviz sources go to GitHub instead.
  if (lead === 0 && segs[0] === 'docs' && segs[1] !== 'diagrams') {
    const page = cleanPage(segs.slice(1));
    return `/${lang}${page ? `/${page}` : ''}${hash}`;
  }

  // Anything else points at repo files the site doesn't publish.
  const repoPath = segs.filter((s) => s !== '..').join('/');
  const kind = trailingSlash ? 'tree' : 'blob';
  return `https://github.com/${ORG}/${repo}/${kind}/${GH_REF}/${repoPath}${hash}`;
}

function rewriteContentLinks(markdown, lang, repo, fileRel) {
  const fix = (url) => transformLink(url, lang, repo, fileRel);

  // markdown links [text](url); leave images (![alt](url)) for the diagram pass.
  let out = markdown.replace(
    /(!?)\[([^\]]*)\]\(([^)\s]+)(\s+"[^"]*")?\)/g,
    (full, bang, text, url, title) => (bang ? full : `[${text}](${fix(url)}${title ?? ''})`),
  );

  // <a href="..."> in inline HTML
  out = out.replace(/(<a\b[^>]*?\bhref=)("([^"]+)"|'([^']+)')/gi, (full, head, _all, dq, sq) => {
    return `${head}"${fix(dq ?? sq)}"`;
  });

  return out;
}

// GitHub-style <picture> swaps diagram SVGs via prefers-color-scheme (the OS
// setting), which ignores the site's in-app theme toggle. Convert to two <img>s
// toggled by the `.dark` class (see app/assets/css/main.css) so diagrams follow
// the chosen theme.
function swapDiagramPictures(markdown) {
  return markdown.replace(
    /<picture>\s*<source[^>]*srcset="([^"]+)"[^>]*>\s*(<img[^>]*?>)\s*<\/picture>/g,
    (full, darkSrc, imgTag) => {
      const light = imgTag.replace(/\s*\/?>\s*$/, '') + ' class="diagram-light" />';
      const dark = `<img src="${darkSrc}" alt="" aria-hidden="true" class="diagram-dark" />`;
      return `${light}\n${dark}`;
    },
  );
}

function normalizeApiIndexTitle(markdown, lang) {
  const title = API_INDEX_TITLES[lang];
  if (!title) return markdown;
  return markdown.replace(/^# Documentation\s*$/m, `# ${title}`);
}

// TypeDoc/Dokka "Defined in" links must resolve on the deployed site.
function rewriteDefinedInLinks(markdown, lang, repo) {
  return markdown.replace(
    /Defined in: \[([^\]]+)\]\(([^)]+)\)/g,
    (full, text, url) => {
      if (/^(https?:)?\/\//i.test(url)) return full;
      const fixed = transformLink(url, lang, repo, 'api/index.md');
      return `Defined in: [${text}](${fixed})`;
    },
  );
}

async function copyMarkdownTree(src, dest, ctx, relPrefix = '') {
  if (!(await exists(src))) return 0;
  let copied = 0;
  const entries = await readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'diagrams') continue;
    const from = join(src, entry.name);
    if (entry.isDirectory()) {
      copied += await copyMarkdownTree(from, join(dest, entry.name), ctx, `${relPrefix}${entry.name}/`);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!/\.(md|mdc)$/i.test(entry.name)) continue;
    const targetName = /^readme\.mdc?$/i.test(entry.name) ? entry.name.replace(/^readme/i, 'index') : entry.name;
    const to = join(dest, targetName);
    const fileRel = `${relPrefix}${entry.name}`;
    const raw = await readFile(from, 'utf8');
    let rewritten = rewriteDiagramRefs(raw, ctx.publicDiagrams);
    rewritten = rewriteContentLinks(rewritten, ctx.lang, ctx.repo, fileRel);
    rewritten = rewriteDefinedInLinks(rewritten, ctx.lang, ctx.repo);
    if (/(^|\/)api\/(?:index|README)\.mdc?$/i.test(fileRel)) {
      rewritten = normalizeApiIndexTitle(rewritten, ctx.lang);
    }
    // Dokka (Kotlin) prefixes API breadcrumbs with a stray `//`
    // (e.g. `//[arcp](…)/[BearerAuth](…)`). Strip the leading slashes.
    if (ctx.lang === 'kotlin') {
      rewritten = rewritten.replace(/^\/\/(?=\[)/gm, '');
    }
    rewritten = swapDiagramPictures(rewritten);
    await mkdir(dirname(to), { recursive: true });
    await writeFile(to, rewritten);
    copied += 1;
  }
  return copied;
}

async function copyDiagramsTree(src, dest) {
  if (!(await exists(src))) return 0;
  let copied = 0;
  const entries = await readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const from = join(src, entry.name);
    const to = join(dest, entry.name);
    if (entry.isDirectory()) {
      copied += await copyDiagramsTree(from, to);
      continue;
    }
    if (!entry.isFile()) continue;
    await mkdir(dirname(to), { recursive: true });
    await cp(from, to);
    copied += 1;
  }
  return copied;
}

async function listMarkdown(dir, prefix = '') {
  if (!(await exists(dir))) return [];
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'diagrams') continue;
    if (entry.isDirectory()) {
      out.push(...(await listMarkdown(join(dir, entry.name), `${prefix}${entry.name}/`)));
      continue;
    }
    if (!entry.isFile()) continue;
    if (!/\.(md|mdc)$/i.test(entry.name)) continue;
    if (/^index\.mdc?$/i.test(entry.name)) continue;
    const base = entry.name.replace(/\.(md|mdc)$/i, '');
    out.push(`${prefix}${base}`);
  }
  return out.sort();
}

async function ensureIndex(label, contentDest) {
  const indexPath = join(contentDest, 'index.md');
  if (await exists(indexPath)) return;
  const slugs = await listMarkdown(contentDest);
  const lines = [
    `# ${label}`,
    '',
    ...slugs.map((s) => `- [${s}](/${label}/${s})`),
    '',
  ];
  await writeFile(indexPath, lines.join('\n'));
}

async function syncSourceLocal({ label, repo, docs, contentDest, publicDiagrams, diagramsDest }) {
  if (!(await exists(docs))) {
    console.warn(`sync-docs: ${label.padEnd(10)}  skipped (missing ${relative(arpcRoot, docs)})`);
    return;
  }

  await rm(contentDest, { recursive: true, force: true });
  await rm(diagramsDest, { recursive: true, force: true });

  const mdCount = await copyMarkdownTree(docs, contentDest, { publicDiagrams, lang: label, repo });
  // Most repos keep rendered diagrams at docs/diagrams; some (typescript-sdk)
  // keep them at the repo root instead.
  const docsDiagrams = join(docs, 'diagrams');
  const diagramsSrc = (await exists(docsDiagrams)) ? docsDiagrams : join(dirname(docs), 'diagrams');
  const diagramCount = await copyDiagramsTree(diagramsSrc, diagramsDest);
  await ensureIndex(label, contentDest);

  console.log(
    `sync-docs: ${label.padEnd(10)} <- ${relative(arpcRoot, docs)}  (${mdCount} docs, ${diagramCount} diagrams)`,
  );
}

function ghHeaders(accept) {
  const headers = { Accept: accept, 'User-Agent': 'arcp-sync-docs' };
  if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  return headers;
}

async function fetchDocsTree(repo, ref) {
  const url = `https://api.github.com/repos/${ORG}/${repo}/git/trees/${ref}?recursive=1`;
  const res = await fetch(url, { headers: ghHeaders('application/vnd.github+json') });
  if (!res.ok) {
    throw new Error(`GitHub tree ${repo}@${ref}: ${res.status} ${res.statusText} ${await res.text()}`);
  }
  const body = await res.json();
  if (body.truncated) {
    throw new Error(`GitHub tree ${repo}@${ref} was truncated; docs/ too large for a single tree request`);
  }
  // diagrams/ at the repo root is included because some repos (typescript-sdk)
  // keep rendered diagrams there instead of under docs/.
  return (body.tree ?? []).filter(
    (e) => e.type === 'blob' && (e.path.startsWith('docs/') || e.path.startsWith('diagrams/')),
  );
}

async function fetchRaw(repo, ref, path, { binary = false } = {}) {
  const url = `https://raw.githubusercontent.com/${ORG}/${repo}/${ref}/${path}`;
  const res = await fetch(url, { headers: ghHeaders('*/*') });
  if (!res.ok) {
    throw new Error(`GitHub raw ${repo}/${path}: ${res.status} ${res.statusText}`);
  }
  return binary ? Buffer.from(await res.arrayBuffer()) : res.text();
}

async function syncSourceRemote({ label, repo, ref = 'main', contentDest, publicDiagrams, diagramsDest }) {
  const blobs = await fetchDocsTree(repo, ref);

  await rm(contentDest, { recursive: true, force: true });
  await rm(diagramsDest, { recursive: true, force: true });

  let mdCount = 0;
  let diagramCount = 0;

  for (const { path } of blobs) {
    const rel = path.slice('docs/'.length); // path under docs/
    const isDiagram = rel === 'diagrams' || rel.startsWith('diagrams/');

    if (isDiagram) {
      const sub = rel.slice('diagrams/'.length);
      if (!sub) continue;
      const data = await fetchRaw(repo, ref, path, { binary: true });
      const to = join(diagramsDest, sub);
      await mkdir(dirname(to), { recursive: true });
      await writeFile(to, data);
      diagramCount += 1;
      continue;
    }

    if (!/\.(md|mdc)$/i.test(rel)) continue;
    const segments = rel.split('/');
    const name = segments.pop();
    const targetName = /^readme\.mdc?$/i.test(name) ? name.replace(/^readme/i, 'index') : name;
    const raw = await fetchRaw(repo, ref, path);
    let rewritten = rewriteDiagramRefs(raw, publicDiagrams);
    rewritten = rewriteContentLinks(rewritten, label, repo, rel);
    rewritten = rewriteDefinedInLinks(rewritten, label, repo);
    if (/(^|\/)api\/(?:index|README)\.mdc?$/i.test(rel)) {
      rewritten = normalizeApiIndexTitle(rewritten, label);
    }
    const to = join(contentDest, ...segments, targetName);
    await mkdir(dirname(to), { recursive: true });
    await writeFile(to, rewritten);
    mdCount += 1;
  }

  await ensureIndex(label, contentDest);

  console.log(
    `sync-docs: ${label.padEnd(10)} <- github:${ORG}/${repo}@${ref}/docs  (${mdCount} docs, ${diagramCount} diagrams)`,
  );
}

async function syncSource(source) {
  if (REMOTE) {
    await syncSourceRemote(source);
  } else {
    await syncSourceLocal(source);
  }
}

async function main() {
  console.log(`sync-docs: mode=${REMOTE ? 'remote (GitHub)' : 'local (sibling repos)'}`);
  for (const source of SOURCES) {
    await syncSource(source);
  }
}

main().catch((err) => {
  console.error('sync-docs failed:', err);
  process.exit(1);
});
