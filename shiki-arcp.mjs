// ARCP "durable envelope" syntax themes — derived from the Inkwell home palette
// (paper + ink, single vermilion accent, olive strings, burnt-amber constants).
// Two variants so code stays on-brand and AA-legible in both light and dark.
//
// Light tokens are checked against the #fcfaf4 paper panel (≥4.5:1 for text,
// ≥3:1 for punctuation); dark tokens against the #1a1813 panel.

const light = {
  fg: '#2a2620', // inkwell-800 — code body
  bg: '#fcfaf4', // --code-bg paper
  comment: '#6f685b', // muted, italic — ~5.2:1
  keyword: '#9f3416', // vermilion-700 — control/storage/operator
  string: '#4f6b3a', // olive (--str)
  number: '#9a4a1f', // burnt amber (--key) — numbers/constants
  func: '#7d2911', // vermilion-800 — function names
  type: '#6b4a2a', // coffee — types/classes
  property: '#9f3416', // vermilion — JSON keys / tags
  attr: '#9a4a1f', // attribute names
  variable: '#3c372f', // ink-soft
  punctuation: '#756e62', // faint
};

const dark = {
  fg: '#ece6da',
  bg: '#1a1813',
  comment: '#8c8576',
  keyword: '#f0612f', // dark accent
  string: '#9bbd76', // --str dark
  number: '#e0a06a',
  func: '#f3a866',
  type: '#d8b48a',
  property: '#f0612f',
  attr: '#e0a06a',
  variable: '#c9c2b4',
  punctuation: '#9a917f',
};

function build(name, c) {
  return {
    name,
    type: /** @type {'light' | 'dark'} */ (name.endsWith('dark') ? 'dark' : 'light'),
    fg: c.fg,
    bg: c.bg,
    colors: {
      'editor.background': c.bg,
      'editor.foreground': c.fg,
    },
    settings: [
      { settings: { background: c.bg, foreground: c.fg } },
      { scope: ['comment', 'punctuation.definition.comment', 'string.comment'], settings: { foreground: c.comment, fontStyle: 'italic' } },
      { scope: ['keyword', 'storage', 'storage.type', 'storage.modifier', 'keyword.control', 'keyword.other', 'keyword.operator.new', 'keyword.operator.expression'], settings: { foreground: c.keyword } },
      { scope: ['keyword.operator', 'punctuation.accessor'], settings: { foreground: c.keyword } },
      { scope: ['string', 'string.quoted', 'string.template', 'meta.string', 'punctuation.definition.string'], settings: { foreground: c.string } },
      { scope: ['constant.numeric', 'constant.language', 'constant.language.boolean', 'constant.language.null', 'constant.other'], settings: { foreground: c.number } },
      { scope: ['entity.name.function', 'support.function', 'meta.function-call.generic', 'variable.function'], settings: { foreground: c.func } },
      { scope: ['entity.name.type', 'entity.name.class', 'support.type', 'support.class', 'entity.other.inherited-class', 'storage.type.class'], settings: { foreground: c.type } },
      { scope: ['support.type.property-name', 'meta.object-literal.key', 'string.json support.type.property-name', 'entity.name.tag'], settings: { foreground: c.property } },
      { scope: ['entity.other.attribute-name', 'meta.attribute'], settings: { foreground: c.attr } },
      { scope: ['variable', 'variable.other', 'variable.parameter', 'meta.definition.variable'], settings: { foreground: c.variable } },
      { scope: ['punctuation', 'meta.brace', 'punctuation.separator', 'punctuation.terminator', 'punctuation.definition.parameters', 'punctuation.section'], settings: { foreground: c.punctuation } },
    ],
  };
}

export const arcpLight = build('arcp-light', light);
export const arcpDark = build('arcp-dark', dark);
