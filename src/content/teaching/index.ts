// Run 35 — the teaching registry. Combines sermons + articles, sorts newest
// first, and exposes the helpers the hub and detail pages read.
//
// Run 56 — the algorithms moved to `helpers.ts` (unchanged, just parameterized
// by the array they operate on) because the content now lives in Postgres and
// the live read path is `src/lib/teaching.ts`. This file is now a thin BINDING
// of those same helpers to the in-repo registry, and its public API is
// byte-identical to what it was before Run 56.
//
// It is kept deliberately: it is the revert path. Point a consumer's import
// back at '@/content/teaching' and it works again, registry-backed, with no
// other edit (an `await` on a non-Promise simply returns the value). Run C
// deletes this file along with articles.ts + sermons.ts; helpers.ts and
// types.ts survive as the durable schema + algorithms.
import type { Teaching, Sermon, Article, TopicSlug } from './types';
import * as H from './helpers';
import { SERMONS } from './sermons';
import { ARTICLES } from './articles';

export type { Teaching, Sermon, Article, TopicSlug, Block } from './types';
export { TOPICS } from './types';

export const ALL_TEACHINGS: Teaching[] = [...SERMONS, ...ARTICLES].sort(H.byDateDesc);

export const ALL_SERMONS: Sermon[] = H.sermonsOf(ALL_TEACHINGS);

export const ALL_ARTICLES: Article[] = H.articlesOf(ALL_TEACHINGS);

export function getTeaching(slug: string): Teaching | undefined {
  return H.getTeaching(ALL_TEACHINGS, slug);
}

export function isVisible(t: Teaching): boolean {
  return H.isVisible(t);
}

export function visibleTeachings(): Teaching[] {
  return H.visibleTeachings(ALL_TEACHINGS);
}
export function visibleSermons(): Sermon[] {
  return H.visibleSermons(ALL_TEACHINGS);
}
export function visibleArticles(): Article[] {
  return H.visibleArticles(ALL_TEACHINGS);
}

export function topicLabel(slug: TopicSlug): string {
  return H.topicLabel(slug);
}

export function activeTopics(): { slug: TopicSlug; label: string }[] {
  return H.activeTopics(ALL_TEACHINGS);
}

export function teachingsByTopic(slug: TopicSlug): Teaching[] {
  return H.teachingsByTopic(ALL_TEACHINGS, slug);
}

export function searchTeachings(query: string): Teaching[] {
  return H.searchTeachings(ALL_TEACHINGS, query);
}

export function featuredTeaching(): Teaching | undefined {
  return H.featuredTeaching(ALL_TEACHINGS);
}

export function youTubeThumb(id: string): string {
  return H.youTubeThumb(id);
}

export function relatedTeachings(slug: string, topic: TopicSlug, limit = 3): Teaching[] {
  return H.relatedTeachings(ALL_TEACHINGS, slug, topic, limit);
}

export function adjacentTeachings(slug: string): { newer?: Teaching; older?: Teaching } {
  return H.adjacentTeachings(ALL_TEACHINGS, slug);
}
