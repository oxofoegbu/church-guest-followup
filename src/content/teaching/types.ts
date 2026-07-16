// Run 35 — the teaching content model (Watch & Read). A lightweight, typed,
// in-repo content layer: publishing a sermon or article = adding an entry to
// `sermons.ts` / `articles.ts` (no code change). Designed to grow: the
// per-sermon `youTubeId` can later be populated from a curated YouTube playlist
// feed, and `articles` can be appended by an automation (Fathom transcript →
// cleaned article) without touching the components.

export type TopicSlug =
  | 'the-well'
  | 'being-with-jesus'
  | 'sermon-on-the-mount'
  | 'following-jesus'
  | 'prayer-and-spirit'
  | 'church-without-fences'
  | 'the-kingdom'
  | 'formation';

export const TOPICS: { slug: TopicSlug; label: string }[] = [
  { slug: 'the-well', label: 'The Well' },
  { slug: 'being-with-jesus', label: 'Being with Jesus' },
  { slug: 'sermon-on-the-mount', label: 'The Sermon on the Mount' },
  { slug: 'following-jesus', label: 'Following Jesus' },
  { slug: 'prayer-and-spirit', label: 'Prayer & the Spirit' },
  { slug: 'church-without-fences', label: 'A church without fences' },
  { slug: 'the-kingdom', label: 'The Kingdom' },
  { slug: 'formation', label: 'Formation' },
];

// Article/transcript body is a small set of typed blocks — no markdown parser,
// no dependency, fully type-checked. Inline **bold** and *italic* are rendered
// within `text`/`items`. An automation can emit this shape directly.
export type Block =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'quote'; text: string; cite?: string }
  | { type: 'list'; items: string[] };

interface TeachingBase {
  slug: string;
  title: string;
  excerpt: string;
  date: string; // ISO yyyy-mm-dd
  topic: TopicSlug;
  series?: string;
  author: string;
  featured?: boolean; // pin as the hub's featured item, regardless of date
  // Run 42 — scheduled publishing. An ISO yyyy-mm-dd calendar date
  // (America/New_York). The teaching stays hidden everywhere until that day.
  // Absent = always visible. See `isVisible` / `visible*` in index.ts.
  publishAt?: string;
}

export interface Sermon extends TeachingBase {
  kind: 'sermon';
  youTubeId: string; // the 11-char YouTube video id
  durationMin?: number;
  transcript?: Block[];
}

export interface Article extends TeachingBase {
  kind: 'article';
  body: Block[];
  readMin?: number;
}

export type Teaching = Sermon | Article;
