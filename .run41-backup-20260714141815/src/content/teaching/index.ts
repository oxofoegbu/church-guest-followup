// Run 35 — the teaching registry. Combines sermons + articles, sorts newest
// first, and exposes the helpers the hub and detail pages read. Adding content
// never touches this file — only `sermons.ts` / `articles.ts`.
import type { Teaching, Sermon, Article, TopicSlug, Block } from './types';
import { TOPICS } from './types';
import { SERMONS } from './sermons';
import { ARTICLES } from './articles';

export type { Teaching, Sermon, Article, TopicSlug, Block } from './types';
export { TOPICS } from './types';

function byDateDesc(a: Teaching, b: Teaching): number {
  return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
}

export const ALL_TEACHINGS: Teaching[] = [...SERMONS, ...ARTICLES].sort(byDateDesc);

export const ALL_SERMONS: Sermon[] = ALL_TEACHINGS.filter(
  (t): t is Sermon => t.kind === 'sermon' && t.youTubeId.length > 0
);

export const ALL_ARTICLES: Article[] = ALL_TEACHINGS.filter(
  (t): t is Article => t.kind === 'article'
);

export function getTeaching(slug: string): Teaching | undefined {
  return ALL_TEACHINGS.find((t) => t.slug === slug);
}

export function topicLabel(slug: TopicSlug): string {
  const t = TOPICS.find((x) => x.slug === slug);
  return t ? t.label : slug;
}

// Topics that actually have at least one published teaching (for the chips).
export function activeTopics(): { slug: TopicSlug; label: string }[] {
  const present = new Set<string>();
  ALL_TEACHINGS.forEach((t) => present.add(t.topic));
  return TOPICS.filter((t) => present.has(t.slug));
}

export function teachingsByTopic(slug: TopicSlug): Teaching[] {
  return ALL_TEACHINGS.filter((t) => t.topic === slug);
}

// Run 40 — Watch & Read search. Full-text, in-repo, dependency-free: the whole
// body of every article (and any sermon transcript) is searchable, not just
// titles — so a hungry visitor can find a message by what it's about. All
// query terms must appear (AND); title/excerpt hits rank a result higher.
function blockText(b: Block): string {
  return b.type === 'list' ? b.items.join(' ') : b.text;
}

function searchableText(t: Teaching): string {
  const parts: string[] = [t.title, t.excerpt, t.author, topicLabel(t.topic)];
  if (t.series) parts.push(t.series);
  if (t.kind === 'article') {
    t.body.forEach((b) => parts.push(blockText(b)));
  } else if (t.transcript && t.transcript.length > 0) {
    t.transcript.forEach((b) => parts.push(blockText(b)));
  }
  return parts.join(' ').toLowerCase();
}

export function searchTeachings(query: string): Teaching[] {
  const terms = query.toLowerCase().split(/\s+/).filter((s) => s.length > 0);
  if (terms.length === 0) return [];
  const scored: { t: Teaching; score: number }[] = [];
  ALL_TEACHINGS.forEach((t) => {
    const hay = searchableText(t);
    const matchesAll = terms.every((term) => hay.indexOf(term) !== -1);
    if (!matchesAll) return;
    const title = t.title.toLowerCase();
    const excerpt = t.excerpt.toLowerCase();
    let score = 0;
    terms.forEach((term) => {
      if (title.indexOf(term) !== -1) score += 3;
      if (excerpt.indexOf(term) !== -1) score += 1;
    });
    scored.push({ t, score });
  });
  // Rank by score, then newest-first (deterministic regardless of sort stability).
  scored.sort((a, b) => b.score - a.score || byDateDesc(a.t, b.t));
  return scored.map((x) => x.t);
}

// The featured item on the hub: an explicitly pinned entry (`featured: true`)
// wins; otherwise the latest sermon, otherwise the latest article — so the page
// always leads with real content.
export function featuredTeaching(): Teaching | undefined {
  return ALL_TEACHINGS.find((t) => t.featured === true) || ALL_SERMONS[0] || ALL_ARTICLES[0];
}

export function youTubeThumb(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}
