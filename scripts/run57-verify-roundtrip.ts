// Run 57 — prove the editor cannot silently rewrite Pastor Okezie's published
// writing.
//
// The claim under test: for every teaching that exists, converting its stored
// `Block[]` into an editor document and straight back out again returns the
// SAME `Block[]` — deep-equal, key for key, including the difference between an
// absent `cite` and an empty one. If that holds, opening an article in the
// editor and saving it without touching a key is a no-op. If it does not hold,
// the editor corrupts prose on save and must not ship.
//
// This is deliberately run against the REAL Tiptap schema (`getSchema`), not a
// hand-rolled imitation: `Node.fromJSON` rejects anything the schema forbids
// and normalizes what it accepts (notably, it MERGES adjacent text nodes that
// carry identical marks — a real way a naive converter loses fidelity). So the
// document really does make the trip an editor would put it through.
//
// It also guards the contract itself: the renderer's regex is read out of
// TeachingBody.tsx and compared to the one the converter uses. Edit one without
// the other and this fails.
//
// Run: npx tsx scripts/run57-verify-roundtrip.ts
import { deepStrictEqual } from 'assert';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getSchema } from '@tiptap/core';
import { Node as PMNode } from '@tiptap/pm/model';
import { SERMONS } from '../src/content/teaching/sermons';
import { ARTICLES } from '../src/content/teaching/articles';
import type { Block, Teaching } from '../src/content/teaching/types';
import { blocksToDoc, docToBlocks, INLINE_RE_SOURCE } from '../src/lib/teaching-editor';
import { teachingExtensions } from '../src/lib/teaching-extensions';

let failures = 0;
const fail = (msg: string) => {
  failures++;
  console.error('  FAIL ' + msg);
};

// ---------------------------------------------------------------------------
// 1. The contract. TeachingBody.tsx's regex must still be the one we encode to.
// ---------------------------------------------------------------------------
console.log('1. renderer regex is still the contract');
{
  const src = readFileSync(join(__dirname, '..', 'src/components/site/TeachingBody.tsx'), 'utf8');
  const m = src.match(/const re = \/(.+)\/g;/);
  if (!m) fail('could not find the inline regex in TeachingBody.tsx — did it move?');
  else if (m[1] !== INLINE_RE_SOURCE) {
    fail('renderer regex has CHANGED.\n    renderer:  ' + m[1] + '\n    converter: ' + INLINE_RE_SOURCE);
  } else console.log('   ok — ' + INLINE_RE_SOURCE);
}

// ---------------------------------------------------------------------------
// 2. The schema is the one we think it is.
// ---------------------------------------------------------------------------
console.log('2. schema vocabulary is exactly what the renderer can draw');
const schema = getSchema(teachingExtensions(null));
{
  const nodes = Object.keys(schema.nodes).sort();
  const marks = Object.keys(schema.marks).sort();
  const wantNodes = ['bulletList', 'doc', 'heading', 'listItem', 'paragraph', 'teachingQuote', 'text'].sort();
  const wantMarks = ['bold', 'italic', 'link'].sort();
  try {
    deepStrictEqual(nodes, wantNodes);
    deepStrictEqual(marks, wantMarks);
    console.log('   ok — nodes: ' + nodes.join(', '));
    console.log('   ok — marks: ' + marks.join(', '));
  } catch {
    fail('unexpected vocabulary.\n    nodes: ' + nodes.join(', ') + '\n    marks: ' + marks.join(', '));
  }
  // No-nesting must be structural, not a convention.
  (['bold', 'italic', 'link'] as const).forEach((a) => {
    (['bold', 'italic', 'link'] as const).forEach((b) => {
      if (a !== b && !schema.marks[a].excludes(schema.marks[b])) {
        fail(a + ' does not exclude ' + b + ' — nested marks are constructible');
      }
    });
  });
  // A bullet may not contain a bullet.
  const li = schema.nodes.listItem;
  if (li.contentMatch.matchType(schema.nodes.bulletList)) fail('listItem still accepts a nested bulletList');
  else console.log('   ok — no nested marks, no nested lists');
}

// ---------------------------------------------------------------------------
// 3. The round trip, over every teaching that exists.
// ---------------------------------------------------------------------------
console.log('3. Block[] -> editor document -> Block[] for all 182 teachings');
const all: Teaching[] = [...SERMONS, ...ARTICLES];

const roundTrip = (blocks: Block[]): Block[] => {
  const json = blocksToDoc(blocks);
  const node = PMNode.fromJSON(schema, json); // throws if the schema forbids it
  node.check(); // asserts structural validity
  return docToBlocks(node.toJSON());
};

let checkedBodies = 0;
let checkedBlocks = 0;
let checkedStrings = 0;
const stats = { p: 0, h2: 0, quote: 0, list: 0, bold: 0, italic: 0, link: 0, citeAbsent: 0 };

all.forEach((t) => {
  const bodies: { label: string; blocks: Block[] }[] = [];
  if (t.kind === 'article') bodies.push({ label: t.slug + ' body', blocks: t.body });
  if (t.kind === 'sermon' && t.transcript) bodies.push({ label: t.slug + ' transcript', blocks: t.transcript });

  bodies.forEach(({ label, blocks }) => {
    checkedBodies++;
    checkedBlocks += blocks.length;
    blocks.forEach((b) => {
      stats[b.type]++;
      if (b.type === 'list') checkedStrings += b.items.length;
      else checkedStrings++;
      if (b.type === 'quote' && b.cite === undefined) stats.citeAbsent++;
      const text = b.type === 'list' ? b.items.join(' ') : b.text;
      const bold = text.match(/\*\*(.+?)\*\*/g);
      if (bold) stats.bold += bold.length;
    });
    try {
      deepStrictEqual(roundTrip(blocks), blocks);
    } catch (e: any) {
      fail(label + ' — ' + String(e.message).split('\n')[0]);
    }
  });
});

console.log('   bodies checked:  ' + checkedBodies);
console.log('   blocks checked:  ' + checkedBlocks + '  (' + JSON.stringify(stats) + ')');
console.log('   strings checked: ' + checkedStrings);

// ---------------------------------------------------------------------------
// 4. Edge cases the corpus does not happen to contain — the ones a future
//    article will. These must round-trip too.
// ---------------------------------------------------------------------------
console.log('4. edge cases the corpus does not contain yet');
const edges: { label: string; blocks: Block[] }[] = [
  { label: 'empty body', blocks: [] },
  { label: 'empty paragraph', blocks: [{ type: 'p', text: '' }, { type: 'p', text: 'after' }] },
  { label: 'quote without cite', blocks: [{ type: 'quote', text: 'no attribution' }] },
  { label: 'quote with cite', blocks: [{ type: 'quote', text: 'q', cite: 'John 1:1' }] },
  { label: 'a link (none exist today)', blocks: [{ type: 'p', text: 'see [the well](/journey) now' }] },
  { label: 'external link', blocks: [{ type: 'p', text: '[site](https://gracelifecenter.com)' }] },
  { label: 'bold then italic adjacent', blocks: [{ type: 'p', text: '**a***b*' }] },
  { label: 'bold at both ends', blocks: [{ type: 'p', text: '**a** mid **b**' }] },
  { label: 'quote with empty cite (2 exist)', blocks: [{ type: 'quote', text: 'q', cite: '' }] },
  { label: 'list with marks', blocks: [{ type: 'list', items: ['**one**', 'two', '*three*'] }] },
  { label: 'single-item list', blocks: [{ type: 'list', items: ['only'] }] },
  { label: 'h2 with a mark', blocks: [{ type: 'h2', text: 'The **Well**' }] },
  { label: 'parens in prose', blocks: [{ type: 'p', text: 'a (parenthetical) aside' }] },
  { label: 'unicode + curly quotes', blocks: [{ type: 'p', text: 'God\u2019s riches \u2014 here \u201Cnow\u201D' }] },
  { label: 'leading/trailing space', blocks: [{ type: 'p', text: ' padded ' }] },
];
edges.forEach(({ label, blocks }) => {
  try {
    deepStrictEqual(roundTrip(blocks), blocks);
    console.log('   ok — ' + label);
  } catch (e: any) {
    fail(label + ' — ' + String(e.message).split('\n')[0]);
  }
});

// ---------------------------------------------------------------------------
// 5. The ONE known non-identity, stated out loud rather than hidden.
//
// ProseMirror merges adjacent text nodes carrying identical marks, so
// `**a****b**` (two separate bold runs, touching) becomes `**ab**` (one). This
// is asserted, not tolerated by accident:
//   - it renders identically — <strong>a</strong><strong>b</strong> and
//     <strong>ab</strong> are the same pixels;
//   - it appears NOWHERE in the 182 (§3 passes without it);
//   - the editor cannot produce it — two touching bold runs ARE one bold run,
//     so it is unreachable from the UI;
//   - and it is stable: normalizing twice changes nothing more.
// If this ever stops being true, that is a real regression and this fails.
// ---------------------------------------------------------------------------
console.log('5. known normalization (adjacent identical marks merge)');
{
  const input: Block[] = [{ type: 'p', text: '**a****b**' }];
  const once = roundTrip(input);
  try {
    deepStrictEqual(once, [{ type: 'p', text: '**ab**' }]);
    deepStrictEqual(roundTrip(once), once); // idempotent — it settles, and stays
    console.log('   ok — **a****b** -> **ab** (same render, unreachable from the UI, stable)');
  } catch (e: any) {
    fail('adjacent-mark merging is not behaving as documented — ' + String(e.message).split('\n')[0]);
  }
}

// ---------------------------------------------------------------------------
console.log('');
if (failures > 0) {
  console.error('FAILED — ' + failures + ' problem(s). The editor is not safe to ship.');
  process.exit(1);
}
console.log('PASS — the editor round-trips every teaching exactly.');
