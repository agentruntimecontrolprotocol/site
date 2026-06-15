import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

// Reusable link shape, ported verbatim from www/content.config.ts.
const linkSchema = z.object({
  label: z.string(),
  to: z.string().optional(),
  href: z.string().optional(),
  icon: z.string().optional(),
  external: z.boolean().optional(),
});

// `docs` — synced SDK + spec markdown (Step 4 writes into src/content/docs/).
// No required frontmatter: titles come from each file's first `# H1`. `title`
// is optional so unmigrated files still validate if Step 4 injects one.
const docs = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdoc}', base: './src/content/docs' }),
  schema: z.object({
    title: z.string().optional(),
  }),
});

// `home` — single frontmatter-driven entry rendered as bespoke sections in
// Step 6. A data collection (not Markdoc). Schema ported verbatim from www.
// The four markdown-string fields (hero.lede, section body, item description,
// code source) stay plain z.string(); they're rendered to HTML in Step 6.
const home = defineCollection({
  loader: file('src/content/home.json'),
  schema: z.object({
    seo: z.object({
      title: z.string(),
      description: z.string(),
    }),
    header: z.object({
      name: z.string(),
      tags: z.array(z.string()),
    }),
    hero: z.object({
      eyebrow: z.string(),
      headline: z.string(),
      lede: z.string(),
    }),
    sections: z.array(
      z.object({
        id: z.string(),
        number: z.string(),
        kicker: z.string(),
        kind: z.enum(['prose', 'grid', 'list', 'columns', 'code']),
        body: z.string().optional(),
        items: z
          .array(
            z.object({
              title: z.string().optional(),
              description: z.string().optional(),
              label: z.string().optional(),
              index: z.string().optional(),
            }),
          )
          .optional(),
        columns: z
          .array(
            z.object({
              heading: z.string(),
              tone: z.enum(['positive', 'neutral']),
              items: z.array(
                z.object({
                  label: z.string(),
                  note: z.string().optional(),
                }),
              ),
            }),
          )
          .optional(),
        code: z
          .object({
            title: z.string(),
            lang: z.string(),
            caption: z.string().optional(),
            source: z.string(),
          })
          .optional(),
        diagram: z
          .object({
            outer: z.object({
              label: z.string(),
              tags: z.array(z.string()),
            }),
            inner: z.object({
              label: z.string(),
              tags: z.array(z.string()),
            }),
            aside: z.string(),
          })
          .optional(),
      }),
    ),
    cta: z.object({
      label: z.string(),
      to: z.string(),
    }),
    footer: z.object({
      line1: z.string(),
      line2: z.string(),
      contact: linkSchema,
    }),
  }),
});

export const collections = { docs, home };
