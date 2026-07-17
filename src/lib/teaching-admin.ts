// Run 57 — server-side helpers for the teaching admin. Kept out of the route
// files so the date arithmetic has one home, one set of comments, and one place
// to be got right.
import type { Block } from '@/content/teaching/types';
import { TOPICS } from '@/content/teaching/types';
import { hasForbiddenLiterals } from '@/lib/teaching-editor';

// ---------------------------------------------------------------------------
// DATES. Read this before touching anything below it.
//
// `date` and `publishAt` are @db.Date — a CALENDAR DATE in America/New_York.
// Not an instant. Not a timestamp. The drip is live and public: 132 articles,
// one per day, 2026-07-17 -> 2026-11-25. An off-by-one here publishes Pastor
// Okezie's writing on the wrong day, in public, and we would find out from a
// reader.
//
// The rules, matching src/lib/teaching.ts exactly:
//   read  — toISOString().slice(0, 10). Nothing else. Never getFullYear() /
//           getMonth() / getDate() / toLocaleDateString(): those read the
//           SERVER's zone (UTC on Vercel) and will shift the day.
//   write — parse 'yyyy-mm-dd' to UTC midnight. Prisma stores the date part.
//   math  — add days at UTC midnight. UTC has no DST, so +1 day is always
//           exactly 86,400,000 ms. Doing this in local time would silently
//           lose or repeat a day across the November DST boundary — and the
//           drip runs through November 25.
// ---------------------------------------------------------------------------
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDateStr(s: unknown): s is string {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  // Reject 2026-02-31: round-trip it and see if it survives.
  const d = new Date(s + 'T00:00:00.000Z');
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** DB value -> 'yyyy-mm-dd'. The ONLY way to read a date in this codebase. */
export function toDateStr(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  return typeof d === 'string' ? d.slice(0, 10) : d.toISOString().slice(0, 10);
}

/** 'yyyy-mm-dd' -> the Date Prisma should store for an @db.Date column. */
export function toDbDate(s: string): Date {
  return new Date(s + 'T00:00:00.000Z');
}

/** Calendar arithmetic at UTC midnight. DST-proof by construction. */
export function addDaysStr(s: string, days: number): string {
  return new Date(toDbDate(s).getTime() + days * 86400000).toISOString().slice(0, 10);
}

/** Today, in the church's timezone — identical to helpers.todayEastern(). */
export function todayEastern(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

// ---------------------------------------------------------------------------
// Block[] validation on the way IN. `src/lib/teaching.ts` validates on the way
// out (a bad block degrades, never 500s); this stops a bad block being stored
// in the first place. Belt and braces, deliberately.
// ---------------------------------------------------------------------------
export type BlockCheck = { ok: true; blocks: Block[] } | { ok: false; error: string };

export function validateBlocks(v: unknown): BlockCheck {
  if (!Array.isArray(v)) return { ok: false, error: 'Body must be a list of blocks.' };
  const out: Block[] = [];
  for (let i = 0; i < v.length; i++) {
    const b = v[i] as Record<string, unknown>;
    const at = 'Block ' + (i + 1);
    if (!b || typeof b !== 'object') return { ok: false, error: at + ' is not a block.' };

    if (b.type === 'p' || b.type === 'h2') {
      if (typeof b.text !== 'string') return { ok: false, error: at + ' has no text.' };
      const bad = literalCheck(b.text, at);
      if (bad) return { ok: false, error: bad };
      out.push({ type: b.type, text: b.text });
      continue;
    }
    if (b.type === 'quote') {
      if (typeof b.text !== 'string') return { ok: false, error: at + ' (quote) has no text.' };
      const bad = literalCheck(b.text, at);
      if (bad) return { ok: false, error: bad };
      if (b.cite === undefined) out.push({ type: 'quote', text: b.text });
      else if (typeof b.cite === 'string') out.push({ type: 'quote', text: b.text, cite: b.cite });
      else return { ok: false, error: at + ' (quote) has an invalid attribution.' };
      continue;
    }
    if (b.type === 'list') {
      if (!Array.isArray(b.items) || !b.items.every((x: unknown) => typeof x === 'string')) {
        return { ok: false, error: at + ' (list) has invalid items.' };
      }
      for (const it of b.items as string[]) {
        const bad = literalCheck(it, at + ' (list)');
        if (bad) return { ok: false, error: bad };
      }
      out.push({ type: 'list', items: b.items as string[] });
      continue;
    }
    return { ok: false, error: at + ' has an unknown type.' };
  }
  return { ok: true, blocks: out };
}

// The renderer's regex has no escaping, so a literal * [ ] in prose corrupts on
// render. The editor blocks these at the keyboard; this is the backstop for
// anything that reaches the API another way. `parseFormatting` here mirrors
// TeachingBody: text that PARSES as a mark is fine — a leftover is not.
function literalCheck(text: string, at: string): string | null {
  const stripped = text.replace(/\*\*(.+?)\*\*|\*(.+?)\*|\[([^\]]+?)\]\(([^)]+?)\)/g, '$1$2$3');
  if (hasForbiddenLiterals(stripped)) {
    return at + ' contains a stray * [ or ] outside of formatting. The site would misread it.';
  }
  // A link href containing ')' terminates the match early and mangles the link.
  const re = /\[([^\]]+?)\]\(([^)]+?)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m[2].indexOf(')') !== -1) return at + ' has a link address containing ")", which the site cannot read.';
  }
  return null;
}

// ---------------------------------------------------------------------------
// Everything else
// ---------------------------------------------------------------------------
export const STATUSES = ['PUBLISHED', 'DRAFT', 'ARCHIVED'] as const;
export type Status = (typeof STATUSES)[number];

export function isTopic(s: unknown): boolean {
  return typeof s === 'string' && TOPICS.some((t) => t.slug === s);
}

/**
 * Accepts what Pastor Okezie actually has in his hand: a YouTube URL in any of
 * its shapes, or a bare id. Stores the 11-char id, which is what the site uses.
 */
export function youTubeIdFrom(input: string): string | null {
  const s = (input || '').trim();
  if (!s) return null;
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  const patterns = [
    /[?&]v=([A-Za-z0-9_-]{11})/, // watch?v=
    /youtu\.be\/([A-Za-z0-9_-]{11})/, // short link
    /\/embed\/([A-Za-z0-9_-]{11})/, // embed
    /\/live\/([A-Za-z0-9_-]{11})/, // live
    /\/shorts\/([A-Za-z0-9_-]{11})/, // shorts
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m) return m[1];
  }
  return null;
}

/**
 * The row shape every teaching admin surface returns.
 *
 * Lives HERE, not in a route file: a Next.js route module may only export the
 * HTTP verbs plus a fixed set of config fields (`dynamic`, `revalidate`, …).
 * Exporting a helper from one and importing it into another compiles fine under
 * `tsc --noEmit` and then fails `next build` with "not a valid Route export
 * field". Run 57 v1 died exactly there.
 */
export function shapeRow(r: any, today: string) {
  const publishAt = toDateStr(r.publishAt);
  return {
    id: r.id, kind: r.kind, slug: r.slug, title: r.title, excerpt: r.excerpt,
    date: toDateStr(r.date), topic: r.topic, series: r.series, author: r.author,
    featured: r.featured, publishAt, status: r.status, seq: r.seq,
    youTubeId: r.youTubeId, durationMin: r.durationMin, readMin: r.readMin,
    updatedAt: r.updatedAt ? r.updatedAt.toISOString() : null,
    // What the public actually sees today — the single question the list page
    // exists to answer. `status` is intent; `publishAt` is scheduling; only
    // both together mean "live". Computed here so the UI can never disagree
    // with the site's own isVisible().
    live: r.status === 'PUBLISHED' && (!publishAt || publishAt <= today),
    scheduled: r.status === 'PUBLISHED' && !!publishAt && publishAt > today,
  };
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * The public surfaces that a write can change. `/teaching` itself reads
 * searchParams and is therefore already dynamic — it needs no revalidation.
 */
export function revalidateTargets(slug: string, topic: string): string[] {
  return ['/teaching/' + slug, '/teaching/topic/' + topic, '/home', '/sitemap.xml'];
}
