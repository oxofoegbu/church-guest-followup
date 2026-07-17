// Run 56 — the teaching ALGORITHMS, extracted verbatim from index.ts and
// parameterized by the array they operate on. NOTHING here changed behaviour:
// every function body is the Run 35/40/41/42/50 logic exactly as it was, with
// the module-level `ALL_TEACHINGS` const replaced by an `all` argument.
//
// Why this file exists: Run 56 moved the content to Postgres. The array now
// comes from the DB (`src/lib/teaching.ts`) instead of from `articles.ts`, but
// the algorithms must not care where it came from. Run 41's search tuning in
// particular is load-bearing and is reproduced here unchanged.
//
// `index.ts` still binds these to the in-repo registry, so Run 56 is revertible
// by swapping an import path back. Run C deletes index.ts + articles.ts +
// sermons.ts; THIS file and types.ts survive.
import type { Teaching, Sermon, Article, TopicSlug, Block } from './types';
import { TOPICS } from './types';

export function byDateDesc(a: Teaching, b: Teaching): number {
  return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
}

// Run 56 — the tie-break that used to be implicit. `ALL_TEACHINGS` was
// `[...SERMONS, ...ARTICLES].sort(byDateDesc)`, and Array.sort is STABLE, so
// teachings sharing a `date` kept their concatenation order (sermons first,
// then articles in file order). Three dates are shared by seven teachings, so
// this is not hypothetical. The DB reproduces it with `ORDER BY date DESC,
// seq ASC` — see `Teaching.seq` and `getAllTeachings()`. Callers must hand
// these helpers an array already in that order.

export function sermonsOf(all: Teaching[]): Sermon[] {
  return all.filter((t): t is Sermon => t.kind === 'sermon' && t.youTubeId.length > 0);
}

export function articlesOf(all: Teaching[]): Article[] {
  return all.filter((t): t is Article => t.kind === 'article');
}

export function getTeaching(all: Teaching[], slug: string): Teaching | undefined {
  return all.find((t) => t.slug === slug);
}

// Run 42 — scheduled publishing. A teaching with a future `publishAt` (an
// America/New_York calendar date) is hidden from every public surface until
// that day; absent `publishAt` = always visible. Visibility is evaluated at
// REQUEST time. `getTeaching` and the raw lists stay unfiltered (the detail
// page and generateStaticParams gate explicitly); every LIST surface uses the
// `visible*` helpers below.
export function todayEastern(): string {
  // 'en-CA' locale renders as YYYY-MM-DD; timeZone pins it to the church's day.
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

export function isVisible(t: Teaching): boolean {
  return !t.publishAt || t.publishAt <= todayEastern();
}

export function visibleTeachings(all: Teaching[]): Teaching[] {
  return all.filter(isVisible);
}
export function visibleSermons(all: Teaching[]): Sermon[] {
  return sermonsOf(all).filter(isVisible);
}
export function visibleArticles(all: Teaching[]): Article[] {
  return articlesOf(all).filter(isVisible);
}

export function topicLabel(slug: TopicSlug): string {
  const t = TOPICS.find((x) => x.slug === slug);
  return t ? t.label : slug;
}

// Topics that actually have at least one VISIBLE teaching (for the chips) — a
// topic chip appears only once its first article has published.
export function activeTopics(all: Teaching[]): { slug: TopicSlug; label: string }[] {
  const present = new Set<string>();
  visibleTeachings(all).forEach((t) => present.add(t.topic));
  return TOPICS.filter((t) => present.has(t.slug));
}

export function teachingsByTopic(all: Teaching[], slug: TopicSlug): Teaching[] {
  return visibleTeachings(all).filter((t) => t.topic === slug);
}

// Run 40/41 — Watch & Read search. In-repo, dependency-free, and tuned to stay
// sharp as the library grows.
function blockText(b: Block): string {
  return b.type === 'list' ? b.items.join(' ') : b.text;
}

// The full searchable text of a teaching — curated headline fields plus the
// whole article body (or any sermon transcript).
function fullText(t: Teaching): string {
  const parts: string[] = [t.title, t.excerpt, t.author, topicLabel(t.topic)];
  if (t.series) parts.push(t.series);
  if (t.kind === 'article') {
    t.body.forEach((b) => parts.push(blockText(b)));
  } else if (t.transcript && t.transcript.length > 0) {
    t.transcript.forEach((b) => parts.push(blockText(b)));
  }
  return parts.join(' ').toLowerCase();
}

// Just the curated "headline" fields — title, summary, series, topic, author.
function headlineText(t: Teaching): string {
  const parts: string[] = [t.title, t.excerpt, t.author, topicLabel(t.topic)];
  if (t.series) parts.push(t.series);
  return parts.join(' ').toLowerCase();
}

// Common English words carry no search signal — drop them so a phrase like
// "God will make a way" isn't dominated by "will"/"a".
const STOPWORDS: Record<string, boolean> = {
  a: true, an: true, the: true, and: true, or: true, of: true, to: true, in: true,
  on: true, for: true, is: true, are: true, am: true, be: true, was: true, were: true,
  will: true, with: true, that: true, this: true, these: true, those: true, your: true,
  you: true, we: true, our: true, us: true, my: true, me: true, he: true, she: true,
  it: true, his: true, her: true, its: true, as: true, at: true, by: true, from: true,
  but: true, not: true, no: true, has: true, have: true, had: true, do: true, does: true,
  did: true, so: true, if: true, then: true, than: true, out: true, up: true, i: true,
  they: true, them: true, their: true, there: true, here: true, what: true, when: true,
  who: true, how: true, why: true, can: true, may: true,
};

// Punctuation-stripped, stopword-filtered, de-duplicated query terms.
function queryTerms(query: string): string[] {
  const raw = query.toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter((s) => s.length >= 2);
  const content = raw.filter((s) => !STOPWORDS[s]);
  const base = content.length > 0 ? content : raw; // all-stopword query: fall back to raw
  const seen: Record<string, boolean> = {};
  const out: string[] = [];
  base.forEach((s) => {
    if (!seen[s]) {
      seen[s] = true;
      out.push(s);
    }
  });
  return out;
}

// Run 41 — a sharper search. It (a) strips punctuation and common words from the
// query, (b) weights distinctive words far above ubiquitous ones (idf), (c)
// boosts title/summary hits over body hits, and (d) searches the FULL text only
// when the query has a distinctive word to anchor on — for an all-common query
// (e.g. "holy spirit") it searches just the curated headline fields, so results
// stay tight instead of matching half the library. Finally it keeps only
// results within half the top score, trimming the long tail.
export function searchTeachings(all: Teaching[], query: string): Teaching[] {
  const terms = queryTerms(query);
  if (terms.length === 0) return [];

  const docs = visibleTeachings(all).map((t) => ({
    t,
    title: t.title.toLowerCase(),
    excerpt: t.excerpt.toLowerCase(),
    head: headlineText(t),
    full: fullText(t),
  }));
  const N = docs.length;

  // Document frequency + idf per term (over the full text). A term is an
  // "anchor" if it's distinctive (appears in ≤30% of teachings).
  const idf: Record<string, number> = {};
  let hasAnchor = false;
  terms.forEach((term) => {
    let df = 0;
    docs.forEach((d) => {
      if (d.full.indexOf(term) !== -1) df += 1;
    });
    idf[term] = Math.log((N + 1) / (df + 1)) + 1;
    if (df <= 0.3 * N) hasAnchor = true;
  });
  const useFull = hasAnchor; // all-common queries search headline only
  let avgIdf = 0;
  terms.forEach((term) => {
    avgIdf += idf[term];
  });
  avgIdf = avgIdf / terms.length;
  const phrase = terms.join(' ');

  const scored: { t: Teaching; score: number }[] = [];
  docs.forEach((d) => {
    const text = useFull ? d.full : d.head;
    let score = 0;
    let matched = 0;
    let strong = false; // matched at least one above-average (distinctive) term
    terms.forEach((term) => {
      if (text.indexOf(term) === -1) return;
      matched += 1;
      const boost = d.title.indexOf(term) !== -1 ? 6 : d.excerpt.indexOf(term) !== -1 ? 3 : 1;
      score += idf[term] * boost;
      if (idf[term] >= avgIdf) strong = true;
    });
    if (matched === 0 || !strong) return;
    score *= 0.4 + 0.6 * (matched / terms.length); // reward matching more of the query
    if (terms.length > 1 && text.indexOf(phrase) !== -1) score += 40; // exact-phrase bonus
    scored.push({ t: d.t, score });
  });
  if (scored.length === 0) return [];

  let top = 0;
  scored.forEach((x) => {
    if (x.score > top) top = x.score;
  });
  const floor = top * 0.5;
  const kept = scored.filter((x) => x.score >= floor);
  kept.sort((a, b) => b.score - a.score || byDateDesc(a.t, b.t));
  return kept.map((x) => x.t);
}

// The featured item on the hub: an explicitly pinned entry (`featured: true`)
// wins; otherwise the latest sermon, otherwise the latest article — so the page
// always leads with real content.
export function featuredTeaching(all: Teaching[]): Teaching | undefined {
  const vis = visibleTeachings(all);
  return (
    vis.find((t) => t.featured === true) ||
    vis.find((t): t is Sermon => t.kind === 'sermon') ||
    vis.find((t): t is Article => t.kind === 'article')
  );
}

export function youTubeThumb(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

// Run 50 — internal linking helpers. `relatedTeachings`: other visible teachings
// on the same topic (newest first, excluding the current slug). `adjacentTeachings`:
// the neighbours in the full chronological (newest-first) visible list, for
// prev/next navigation on the detail page.
export function relatedTeachings(all: Teaching[], slug: string, topic: TopicSlug, limit = 3): Teaching[] {
  return teachingsByTopic(all, topic).filter((t) => t.slug !== slug).slice(0, limit);
}

export function adjacentTeachings(all: Teaching[], slug: string): { newer?: Teaching; older?: Teaching } {
  const vis = visibleTeachings(all);
  const i = vis.findIndex((t) => t.slug === slug);
  if (i < 0) return {};
  return {
    newer: i > 0 ? vis[i - 1] : undefined,
    older: i < vis.length - 1 ? vis[i + 1] : undefined,
  };
}
