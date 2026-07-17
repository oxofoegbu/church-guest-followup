// Run 57 — the bridge between `Block[]` (what the DB stores and
// TeachingBody.tsx renders) and the editor's document shape (what Tiptap
// edits). Pure JSON in, pure JSON out: NO Tiptap import lives here, so the API
// route can validate a payload without pulling ProseMirror into the server
// bundle. The editor extensions live in `teaching-extensions.ts`.
//
// ---------------------------------------------------------------------------
// THE CONTRACT
//
// `src/components/site/TeachingBody.tsx` renders inline formatting with ONE
// regex, reproduced below character-for-character. It is flat and it has no
// escaping. That regex — not this file — is the source of truth, and
// `scripts/run57-verify-roundtrip.ts` reads TeachingBody.tsx and asserts the
// two are still identical. If someone edits the renderer without editing this,
// the verify script fails and the deploy rolls back.
//
// Because the regex cannot express nesting or escaping, the editor must never
// be able to produce anything it cannot round-trip:
//
//   - no nested marks — enforced structurally by `excludes: '_'` in the schema
//   - no literal * [ ] in prose — enforced at the typing/paste surface, and
//     re-checked here in `hasForbiddenLiterals()` before any save
//   - a link href may not contain ')'
//
// Checked against the real corpus before this shipped: of 4,893 inline strings
// in all 182 teachings, every one of the 494 asterisks is already a mark
// delimiter, there is not one literal '[' or ']', and Block[] -> doc -> Block[]
// deep-equals for all 182. See the verify script.
// ---------------------------------------------------------------------------
import type { Block } from '@/content/teaching/types';

// Character-identical to TeachingBody.tsx. Do not "tidy" it.
const INLINE_RE = /\*\*(.+?)\*\*|\*(.+?)\*|\[([^\]]+?)\]\(([^)]+?)\)/g;

// Exported so the verify script can compare it to the renderer's literal.
export const INLINE_RE_SOURCE = INLINE_RE.source;

// ---------------------------------------------------------------------------
// Editor document shape. A structural subset of ProseMirror's JSON — typed
// locally so this module stays dependency-free.
// ---------------------------------------------------------------------------
export type DocMark = { type: string; attrs?: Record<string, unknown> };
export type DocNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: DocNode[];
  marks?: DocMark[];
  text?: string;
};

export const FORBIDDEN_LITERALS = ['*', '[', ']'] as const;

/**
 * True when `text` contains a character the renderer would try to interpret and
 * that we therefore refuse to store as prose. Marks are applied structurally in
 * the editor, so by the time a string reaches here it should be clean; this is
 * the server-side backstop, not the primary guard.
 */
export function hasForbiddenLiterals(text: string): boolean {
  return FORBIDDEN_LITERALS.some((c) => text.indexOf(c) !== -1);
}

// ---------------------------------------------------------------------------
// text -> inline nodes. Mirrors TeachingBody.inline() exactly: same regex, same
// branch order, same slicing. A match becomes a marked text node; everything
// between matches is plain text.
// ---------------------------------------------------------------------------
export function textToInline(text: string): DocNode[] {
  const out: DocNode[] = [];
  const re = new RegExp(INLINE_RE.source, 'g');
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ type: 'text', text: text.slice(last, m.index) });
    if (m[1] !== undefined) {
      out.push({ type: 'text', text: m[1], marks: [{ type: 'bold' }] });
    } else if (m[2] !== undefined) {
      out.push({ type: 'text', text: m[2], marks: [{ type: 'italic' }] });
    } else if (m[3] !== undefined && m[4] !== undefined) {
      out.push({ type: 'text', text: m[3], marks: [{ type: 'link', attrs: { href: m[4] } }] });
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push({ type: 'text', text: text.slice(last) });
  return out;
}

// ---------------------------------------------------------------------------
// inline nodes -> text. The exact inverse. Marks are mutually exclusive by
// schema, so a text node carries at most one; we read marks[0] and ignore the
// impossible rest rather than inventing a nesting syntax the renderer can't
// read.
// ---------------------------------------------------------------------------
export function inlineToText(nodes: DocNode[] | undefined): string {
  if (!nodes || nodes.length === 0) return '';
  let out = '';
  nodes.forEach((n) => {
    const t = typeof n.text === 'string' ? n.text : '';
    const mark = n.marks && n.marks.length > 0 ? n.marks[0] : null;
    if (!mark) {
      out += t;
      return;
    }
    if (mark.type === 'bold') out += '**' + t + '**';
    else if (mark.type === 'italic') out += '*' + t + '*';
    else if (mark.type === 'link') out += '[' + t + '](' + String((mark.attrs || {}).href || '') + ')';
    else out += t;
  });
  return out;
}

// ---------------------------------------------------------------------------
// Block[] -> editor document
// ---------------------------------------------------------------------------
export function blocksToDoc(blocks: Block[]): DocNode {
  const content: DocNode[] = blocks.map((b) => {
    if (b.type === 'h2') {
      return { type: 'heading', attrs: { level: 2 }, content: textToInline(b.text) };
    }
    if (b.type === 'quote') {
      return {
        type: 'teachingQuote',
        attrs: { cite: b.cite === undefined ? null : b.cite },
        content: textToInline(b.text),
      };
    }
    if (b.type === 'list') {
      return {
        type: 'bulletList',
        content: b.items.map((it) => ({
          type: 'listItem',
          content: [{ type: 'paragraph', content: textToInline(it) }],
        })),
      };
    }
    return { type: 'paragraph', content: textToInline(b.text) };
  });
  // ProseMirror's `doc` is `block+` — it can never be genuinely empty, and an
  // empty editor is one empty paragraph. Round-tripping [] must give back [],
  // so callers treat a lone empty paragraph as "no content" (see docToBlocks).
  return { type: 'doc', content: content.length > 0 ? content : [{ type: 'paragraph' }] };
}

// ---------------------------------------------------------------------------
// editor document -> Block[]
//
// Unknown node types are DROPPED rather than guessed at. The schema makes them
// unreachable from the editor; this is the belt to that braces.
// ---------------------------------------------------------------------------
export function docToBlocks(doc: DocNode | null | undefined): Block[] {
  if (!doc || !Array.isArray(doc.content)) return [];
  const out: Block[] = [];
  doc.content.forEach((n) => {
    if (n.type === 'paragraph') {
      out.push({ type: 'p', text: inlineToText(n.content) });
      return;
    }
    if (n.type === 'heading') {
      out.push({ type: 'h2', text: inlineToText(n.content) });
      return;
    }
    if (n.type === 'teachingQuote') {
      const cite = (n.attrs || {}).cite;
      const text = inlineToText(n.content);
      // `cite` is optional in the Block union. Of the 530 quotes in the corpus:
      // 522 have a real cite, 6 omit the key entirely, and 2 carry `cite: ""`.
      //
      // The renderer treats "" and absent identically (`b.cite ? ... : null`),
      // so it is tempting to normalize "" away here. Don't. They are different
      // DATA, and quietly rewriting one into the other on load is precisely the
      // silent edit this whole design is trying to prevent — "it renders the
      // same" is how you end up trusting an editor that does other things you
      // did not ask for. null (the attr default, meaning the key was absent)
      // round-trips to absent; "" round-trips to "". Emptying the cite field in
      // the UI sets null, so `cite: ""` becomes absent only when Pastor Okezie
      // deliberately clears that field — an edit he made, not one we made.
      if (typeof cite === 'string') out.push({ type: 'quote', text, cite });
      else out.push({ type: 'quote', text });
      return;
    }
    if (n.type === 'bulletList') {
      const items: string[] = (n.content || []).map((li) => {
        const para = (li.content || [])[0];
        return inlineToText(para ? para.content : []);
      });
      out.push({ type: 'list', items });
      return;
    }
  });
  // An editor holding nothing but one empty paragraph means "empty", not
  // "a single blank paragraph". Mirrors blocksToDoc's floor above.
  if (out.length === 1 && out[0].type === 'p' && out[0].text === '') return [];
  return out;
}
