'use client';

// Run 57 — the teaching editor. A rich-text surface over `Block[]`.
//
// It looks like a word processor and behaves like one, but it can only ever
// contain the six things TeachingBody.tsx can draw. That is not enforced by
// this component's buttons — a toolbar is a suggestion — it is enforced by the
// schema in `teaching-extensions.ts`, where tables and images and coloured text
// do not exist. This file is the surface; that file is the law.
//
// `value` in, `value` out, both `Block[]`. The conversion is proven lossless
// against all 182 teachings by scripts/run57-verify-roundtrip.ts.
import { useCallback, useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { Block } from '@/content/teaching/types';
import { blocksToDoc, docToBlocks } from '@/lib/teaching-editor';
import { teachingExtensions } from '@/lib/teaching-extensions';

interface Props {
  value: Block[];
  onChange: (blocks: Block[]) => void;
  placeholder?: string;
}

const btn = (on: boolean) =>
  'px-2.5 py-1.5 rounded text-sm font-medium transition-colors ' +
  (on ? 'bg-church-700 text-white' : 'text-church-600 hover:bg-church-100');

export default function TeachingEditor({ value, onChange, placeholder }: Props) {
  const [blocked, setBlocked] = useState<string | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkHref, setLinkHref] = useState('');

  // The literal guard reports here so a swallowed keystroke is explained rather
  // than mysterious. Pastor Okezie has never typed one of these in 166
  // articles, but if he tries, he should be told why it did not appear.
  const onBlocked = useCallback((chars: string) => {
    setBlocked(chars);
    window.setTimeout(() => setBlocked(null), 4000);
  }, []);

  const editor = useEditor({
    extensions: teachingExtensions(onBlocked),
    content: blocksToDoc(value),
    // Next renders this on the server first; Tiptap must not render immediately
    // or the client hydration disagrees with it.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'teaching-editor-surface focus:outline-none min-h-[420px] px-4 py-3',
      },
    },
    onUpdate: ({ editor: e }) => {
      onChange(docToBlocks(e.getJSON() as any));
    },
  });

  // Keep the cite field in step with wherever the cursor is.
  const inQuote = editor?.isActive('teachingQuote') ?? false;
  const citeValue = (editor?.getAttributes('teachingQuote')?.cite as string | null) ?? '';

  useEffect(() => {
    if (!linkOpen || !editor) return;
    setLinkHref((editor.getAttributes('link')?.href as string) || '');
  }, [linkOpen, editor]);

  if (!editor) {
    return <div className="rounded-lg border border-church-200 bg-white min-h-[480px] animate-pulse" />;
  }

  const applyLink = () => {
    const href = linkHref.trim();
    if (!href) {
      editor.chain().focus().unsetLink().run();
      setLinkOpen(false);
      return;
    }
    // ')' would terminate the renderer's link pattern early and mangle the URL.
    if (href.indexOf(')') !== -1) {
      onBlocked(')');
      return;
    }
    editor.chain().focus().setLink({ href }).run();
    setLinkOpen(false);
  };

  return (
    <div className="rounded-lg border border-church-200 bg-white overflow-hidden">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-church-200 bg-church-50 px-2 py-1.5">
        <button type="button" title="Bold (⌘B)" className={btn(editor.isActive('bold'))}
          onClick={() => editor.chain().focus().toggleBold().run()}><strong>B</strong></button>
        <button type="button" title="Italic (⌘I)" className={btn(editor.isActive('italic'))}
          onClick={() => editor.chain().focus().toggleItalic().run()}><em>I</em></button>
        <button type="button" title="Link" className={btn(editor.isActive('link'))}
          onClick={() => setLinkOpen((o) => !o)}>🔗</button>

        <span className="mx-1.5 h-5 w-px bg-church-200" />

        <button type="button" className={btn(editor.isActive('paragraph') && !editor.isActive('teachingQuote'))}
          onClick={() => editor.chain().focus().setParagraph().run()}>Text</button>
        <button type="button" className={btn(editor.isActive('heading', { level: 2 }))}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>Heading</button>
        <button type="button" className={btn(editor.isActive('bulletList'))}
          onClick={() => editor.chain().focus().toggleBulletList().run()}>• List</button>
        <button type="button" className={btn(inQuote)}
          onClick={() => {
            if (inQuote) editor.chain().focus().setParagraph().run();
            else editor.chain().focus().setNode('teachingQuote').run();
          }}>❝ Quote</button>

        <span className="mx-1.5 h-5 w-px bg-church-200" />

        <button type="button" title="Undo (⌘Z)" className={btn(false)} disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}>↶</button>
        <button type="button" title="Redo (⇧⌘Z)" className={btn(false)} disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}>↷</button>
      </div>

      {/* link bar */}
      {linkOpen && (
        <div className="flex items-center gap-2 border-b border-church-200 bg-white px-3 py-2">
          <input
            autoFocus value={linkHref} onChange={(e) => setLinkHref(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyLink(); } if (e.key === 'Escape') setLinkOpen(false); }}
            placeholder="/journey  or  https://…"
            className="flex-1 rounded border border-church-200 px-2 py-1 text-sm focus:border-church-400 focus:outline-none"
          />
          <button type="button" onClick={applyLink} className="rounded bg-church-700 px-3 py-1 text-sm font-medium text-white">Apply</button>
          <button type="button" onClick={() => { editor.chain().focus().unsetLink().run(); setLinkOpen(false); }}
            className="rounded px-2 py-1 text-sm text-church-500 hover:bg-church-100">Remove</button>
        </div>
      )}

      {/* the quote's attribution — an attribute, not rich text, because the
          site renders `cite` as a plain string and never formats it */}
      {inQuote && (
        <div className="flex items-center gap-2 border-b border-church-200 bg-amber-50/60 px-3 py-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-church-500">Attribution</span>
          <input
            value={citeValue}
            onChange={(e) => {
              const v = e.target.value;
              // Empty means "no attribution" — null, not "". Only a deliberate
              // clear removes the key; see docToBlocks.
              editor.chain().focus().updateAttributes('teachingQuote', { cite: v === '' ? null : v }).run();
            }}
            placeholder="Ephesians 4:29  (optional)"
            className="flex-1 rounded border border-church-200 bg-white px-2 py-1 text-sm focus:border-church-400 focus:outline-none"
          />
        </div>
      )}

      {blocked && (
        <div className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <strong>{blocked}</strong> can’t be typed here — the website reads those characters as formatting
          instructions. Use the <strong>B</strong>, <em>I</em> and 🔗 buttons instead.
        </div>
      )}

      <EditorContent editor={editor} />

      {value.length === 0 && placeholder && (
        <div className="pointer-events-none -mt-[420px] px-4 py-3 text-church-300">{placeholder}</div>
      )}
    </div>
  );
}
