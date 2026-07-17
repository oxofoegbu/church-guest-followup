// Run 57 — the editor's rulebook.
//
// This is the whole vocabulary of the teaching editor: paragraph, h2, quote
// (with an optional cite), bullet list, and the marks bold / italic / link.
// There is no table, no image, no code block, no strikethrough, no colour, no
// nested list — not because they are switched off, but because they were never
// installed. StarterKit is deliberately NOT used for exactly this reason.
//
// Why it matters: TeachingBody.tsx can render six things. Anything else the
// editor could produce would be a published article the website cannot display.
// The schema is the guarantee, and structural guarantees survive refactors that
// good intentions do not.
import { Extension, Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Fragment, Slice } from '@tiptap/pm/model';
import type { Node as PMNode } from '@tiptap/pm/model';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Heading from '@tiptap/extension-heading';
import BulletList from '@tiptap/extension-bullet-list';
import ListItem from '@tiptap/extension-list-item';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Link from '@tiptap/extension-link';
import History from '@tiptap/extension-history';
import Dropcursor from '@tiptap/extension-dropcursor';
import Gapcursor from '@tiptap/extension-gapcursor';
import { FORBIDDEN_LITERALS } from '@/lib/teaching-editor';

// ---------------------------------------------------------------------------
// The quote block. `Block` models a quote as { text, cite? } where `cite` is a
// plain attribution string that the renderer does NOT run through inline() —
// so it is an attribute edited in its own little field, never rich text.
// `content: 'inline*'` keeps the quote a single run, exactly like `text`.
// ---------------------------------------------------------------------------
export const TeachingQuote = Node.create({
  name: 'teachingQuote',
  group: 'block',
  content: 'inline*',
  defining: true,
  addAttributes() {
    return {
      cite: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-cite'),
        renderHTML: (attrs) => (attrs.cite ? { 'data-cite': attrs.cite as string } : {}),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'blockquote' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['blockquote', mergeAttributes(HTMLAttributes), 0];
  },
});

// ---------------------------------------------------------------------------
// The literal guard. `*`, `[` and `]` are the renderer's formatting syntax and
// it has no escape hatch, so they may not enter prose as themselves. Typing one
// is refused; pasting one strips it. Both paths report back so the UI can say
// why rather than silently eating the keystroke.
//
// Checked before shipping: across all 182 teachings there is not one literal
// occurrence of any of these — every asterisk already delimits a mark. So this
// guard constrains only what is typed from now on.
// ---------------------------------------------------------------------------
const FORBIDDEN_RE = new RegExp('[' + FORBIDDEN_LITERALS.map((c) => '\\' + c).join('') + ']', 'g');

export interface LiteralGuardOptions {
  onBlocked: ((chars: string) => void) | null;
}

export const LiteralGuard = Extension.create<LiteralGuardOptions>({
  name: 'literalGuard',
  addOptions() {
    return { onBlocked: null };
  },
  addProseMirrorPlugins() {
    const notify = (chars: string) => {
      const cb = this.options.onBlocked;
      if (cb) cb(chars);
    };
    return [
      new Plugin({
        key: new PluginKey('literalGuard'),
        props: {
          // Typing. Returning true swallows the input.
          handleTextInput(_view, _from, _to, text) {
            const hit = text.match(FORBIDDEN_RE);
            if (!hit) return false;
            notify(Array.from(new Set(hit)).join(' '));
            return true;
          },
          // Pasting, dropping. Rebuild the slice without the offenders.
          transformPasted(slice) {
            let stripped: string[] = [];
            const clean = (fragment: Fragment): Fragment => {
              const nodes: PMNode[] = [];
              fragment.forEach((node) => {
                if (node.isText && typeof node.text === 'string') {
                  const hit = node.text.match(FORBIDDEN_RE);
                  if (!hit) {
                    nodes.push(node);
                    return;
                  }
                  stripped = stripped.concat(hit);
                  const t = node.text.replace(FORBIDDEN_RE, '');
                  if (t.length > 0) nodes.push(node.type.schema.text(t, node.marks));
                  return;
                }
                nodes.push(node.copy(clean(node.content)));
              });
              return Fragment.fromArray(nodes);
            };
            const content = clean(slice.content);
            if (stripped.length === 0) return slice;
            notify(Array.from(new Set(stripped)).join(' '));
            return new Slice(content, slice.openStart, slice.openEnd);
          },
        },
      }),
    ];
  },
});

// ---------------------------------------------------------------------------
// The extension list.
//
// `excludes: '_'` on every mark is the no-nesting guarantee: in ProseMirror it
// means "this mark excludes all others", so bold-inside-italic and
// link-inside-bold cannot be constructed at all. The renderer's regex is flat
// and would corrupt them on save; here they are simply unrepresentable.
//
// ListItem's content is narrowed from Tiptap's default `paragraph block*` to
// `paragraph`, which forbids a nested list inside a bullet — `Block`'s list is
// `items: string[]`, one flat string per bullet, and it cannot express depth.
// ---------------------------------------------------------------------------
export function teachingExtensions(onBlocked: ((chars: string) => void) | null) {
  return [
    Document,
    Paragraph,
    Text,
    Heading.configure({ levels: [2] }),
    BulletList,
    ListItem.extend({ content: 'paragraph' }),
    TeachingQuote,
    Bold.extend({ excludes: '_' }),
    Italic.extend({ excludes: '_' }),
    Link.extend({ excludes: '_' }).configure({
      openOnClick: false,
      autolink: false,
      linkOnPaste: false,
      protocols: ['http', 'https', 'mailto'],
      HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
    }),
    History,
    Dropcursor,
    Gapcursor,
    LiteralGuard.configure({ onBlocked }),
  ];
}
