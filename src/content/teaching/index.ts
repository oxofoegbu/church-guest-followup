// Run 35 — the teaching registry. Combines sermons + articles, sorts newest
// first, and exposes the helpers the hub and detail pages read. Adding content
// never touches this file — only `sermons.ts` / `articles.ts`.
import type { Teaching, Sermon, Article, TopicSlug } from './types';
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

// The featured item on the hub: the latest sermon if any, otherwise the latest
// article — so the page always leads with real content.
export function featuredTeaching(): Teaching | undefined {
  return ALL_SERMONS[0] || ALL_ARTICLES[0];
}

export function youTubeThumb(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}
