// Run 37 — pagination control for the teaching grids (server component). Given
// the current page and total pages, renders Prev / numbered pages (with ellipsis
// when there are many) / Next as real links, so each page is a crawlable URL and
// the archive scales as sermons/articles grow. `hrefFor(page)` builds the link
// (preserving topic + the other section's page); it is only ever called on the
// server here.
import Link from 'next/link';

function pageWindow(current: number, total: number): (number | 'gap')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | 'gap')[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) out.push('gap');
  for (let p = start; p <= end; p++) out.push(p);
  if (end < total - 1) out.push('gap');
  out.push(total);
  return out;
}

export default function Pager({
  current,
  totalPages,
  hrefFor,
  ariaLabel = 'Pagination',
}: {
  current: number;
  totalPages: number;
  hrefFor: (page: number) => string;
  ariaLabel?: string;
}) {
  if (totalPages <= 1) return null;
  const items = pageWindow(current, totalPages);
  const base = 'grid h-10 min-w-[40px] place-items-center rounded-full px-3 text-[14px] font-medium transition-colors';

  return (
    <nav aria-label={ariaLabel} className="mt-10 flex flex-wrap items-center justify-center gap-2">
      {current > 1 ? (
        <Link href={hrefFor(current - 1)} rel="prev" className={`${base} border border-site-claydk text-site-ink hover:border-site-brass`}>
          ← Prev
        </Link>
      ) : (
        <span className={`${base} border border-site-claydk/50 text-site-soft/50`} aria-hidden="true">← Prev</span>
      )}

      {items.map((it, i) =>
        it === 'gap' ? (
          <span key={`g${i}`} className="px-1 text-site-soft" aria-hidden="true">…</span>
        ) : it === current ? (
          <span key={it} aria-current="page" className={`${base} border border-site-umber bg-site-umber text-site-cream`}>
            {it}
          </span>
        ) : (
          <Link key={it} href={hrefFor(it)} className={`${base} border border-site-claydk text-site-ink hover:border-site-brass`}>
            {it}
          </Link>
        )
      )}

      {current < totalPages ? (
        <Link href={hrefFor(current + 1)} rel="next" className={`${base} border border-site-claydk text-site-ink hover:border-site-brass`}>
          Next →
        </Link>
      ) : (
        <span className={`${base} border border-site-claydk/50 text-site-soft/50`} aria-hidden="true">Next →</span>
      )}
    </nav>
  );
}
