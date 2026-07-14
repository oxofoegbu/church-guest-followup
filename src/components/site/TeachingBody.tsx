// Run 35 — renders a teaching Block[] (article body or sermon transcript) as
// styled JSX. No markdown dependency; supports inline **bold** and *italic*
// within paragraph/quote/list text. Server component.
import type { ReactNode } from 'react';
import type { Block } from '@/content/teaching';

// Inline formatter: **bold** and *italic*. Returns an array of nodes.
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      out.push(
        <strong key={`b${key++}`} className="font-semibold text-site-umber">
          {m[1]}
        </strong>
      );
    } else if (m[2] !== undefined) {
      out.push(
        <em key={`i${key++}`} className="font-fraunces italic">
          {m[2]}
        </em>
      );
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export default function TeachingBody({ blocks }: { blocks: Block[] }) {
  return (
    <div className="teaching-body">
      {blocks.map((b, i) => {
        if (b.type === 'h2') {
          return (
            <h2 key={i} className="mt-9 mb-3 font-fraunces text-[26px] font-semibold leading-[1.15] text-site-umber">
              {inline(b.text)}
            </h2>
          );
        }
        if (b.type === 'quote') {
          return (
            <blockquote key={i} className="my-7 border-l-[3px] border-site-brass pl-5">
              <p className="font-fraunces text-[21px] italic leading-[1.5] text-site-ink">{inline(b.text)}</p>
              {b.cite ? (
                <cite className="mt-2 block text-[13px] font-semibold uppercase not-italic tracking-[0.14em] text-site-brassdk">
                  {b.cite}
                </cite>
              ) : null}
            </blockquote>
          );
        }
        if (b.type === 'list') {
          return (
            <ul key={i} className="my-5 grid gap-2.5 pl-1">
              {b.items.map((it, j) => (
                <li key={j} className="flex gap-3 text-[17px] leading-[1.6] text-site-ink">
                  <span aria-hidden="true" className="mt-[10px] h-1.5 w-1.5 flex-none rounded-full bg-site-brass" />
                  <span>{inline(it)}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="my-4 text-[17.5px] leading-[1.7] text-site-ink">
            {inline(b.text)}
          </p>
        );
      })}
    </div>
  );
}
