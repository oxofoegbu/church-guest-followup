// Run 43 — compose a weekly newsletter issue from the in-repo teaching library.
// Pure/selection logic only (no DB, no email) so it can be unit-reasoned and
// reused by both the cron drafter and the review page.

import { ALL_ARTICLES, searchTeachings } from '@/content/teaching';
import type { Article } from '@/content/teaching';
import { THEMES, type NewsletterTheme } from './themes';

// Eastern "today" (church timezone), rendered YYYY-MM-DD by the en-CA locale.
export function todayEastern(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

// ISO-week key like "2026-W29" computed on the Eastern civil date. Used both as
// the once-per-week idempotency key and as the rotation index.
export function weekKeyEastern(d?: Date): string {
  const base = d || new Date();
  // Re-read the instant as an Eastern civil date (drop the clock/zone).
  const eastern = new Date(base.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const date = new Date(Date.UTC(eastern.getFullYear(), eastern.getMonth(), eastern.getDate()));
  const dow = (date.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  date.setUTCDate(date.getUTCDate() - dow + 3); // move to the week's Thursday
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((date.getTime() - firstThursday.getTime()) / 86400000 -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7
    );
  return `${date.getUTCFullYear()}-W${week < 10 ? '0' + week : '' + week}`;
}

// Deterministic theme for a given ISO-week key — loops through THEMES in order.
export function themeForWeek(weekKey: string): NewsletterTheme {
  const m = weekKey.match(/W(\d+)/);
  const wk = m ? parseInt(m[1], 10) : 0;
  const yr = parseInt(weekKey.slice(0, 4), 10) || 0;
  const n = THEMES.length;
  const idx = (((yr * 53 + wk) % n) + n) % n;
  return THEMES[idx];
}

// Published article list, visibility-safe. Respects an optional `publishAt`
// (added in Run 42) WITHOUT a hard dependency on it: on Run 41 the field is
// absent so every article is visible; once Run 42 ships, a scheduled article
// stays out of the digest until its America/New_York date arrives.
export function publishedArticles(): Article[] {
  const today = todayEastern();
  return ALL_ARTICLES.filter((a: Article) => {
    const pa = (a as { publishAt?: string }).publishAt;
    return !pa || pa <= today;
  });
}

export interface IssueDraft {
  weekKey: string;
  theme: NewsletterTheme;
  subject: string;
  intro: string;
  articles: Article[];
}

// Select up to `count` articles for a theme: in-theme (by topic) newest-first,
// then supplement with keyword search hits, then fill from the newest remaining
// so the digest is never thin. Selection is limited to published articles.
export function selectForTheme(theme: NewsletterTheme, count = 4): Article[] {
  const pool = publishedArticles(); // already newest-first (registry sorts desc)
  const publishedSlugs: Record<string, boolean> = {};
  pool.forEach((a: Article) => {
    publishedSlugs[a.slug] = true;
  });

  const chosen: Article[] = [];
  const seen: Record<string, boolean> = {};
  const take = (a: Article) => {
    if (!seen[a.slug] && chosen.length < count) {
      seen[a.slug] = true;
      chosen.push(a);
    }
  };

  pool
    .filter((a: Article) => theme.topics.indexOf(a.topic) !== -1)
    .forEach(take);

  if (chosen.length < count && theme.keywords.length > 0) {
    searchTeachings(theme.keywords.join(' ')).forEach((t) => {
      if (t.kind === 'article' && publishedSlugs[t.slug]) take(t as Article);
    });
  }

  if (chosen.length < count) pool.forEach(take);

  return chosen;
}

export function composeIssue(d?: Date): IssueDraft {
  const weekKey = weekKeyEastern(d);
  const theme = themeForWeek(weekKey);
  const articles = selectForTheme(theme, 4);
  return {
    weekKey,
    theme,
    subject: `${theme.label} — from Grace Life Center`,
    intro: theme.blurb,
    articles,
  };
}

// Resolve an ordered slug list (as stored on an issue) back to Article objects.
export function articlesBySlugs(slugs: string[]): Article[] {
  const bySlug: Record<string, Article> = {};
  ALL_ARTICLES.forEach((a: Article) => {
    bySlug[a.slug] = a;
  });
  const out: Article[] = [];
  slugs.forEach((s: string) => {
    if (bySlug[s]) out.push(bySlug[s]);
  });
  return out;
}
