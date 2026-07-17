/**
 * /api/cron/newsletter-digest  (Run 43)
 * ---------------------------------------------------------------------------
 * Weekly. Drafts the week's themed digest, stores it as a DRAFT NewsletterIssue,
 * and emails the pastor a preview + a review link. NOTHING is sent to
 * subscribers here — the pastor approves on the review page (POST). Approval-
 * first by design.
 *
 * Scheduled Saturdays ~07:30 ET via vercel.json. A same-day guard
 * (isSaturdayEastern) makes the job a no-op if the platform ever fires it on
 * another day, and a per-ISO-week idempotency key (weekKey @unique) prevents a
 * duplicate draft if it runs twice. Pass ?force=1 (with the CRON_SECRET bearer)
 * to draft/preview on demand for testing.
 *
 * Auth mirrors the other crons: header x-vercel-cron:1 OR
 * Authorization: Bearer ${CRON_SECRET}.
 * ---------------------------------------------------------------------------
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { composeIssue, weekKeyEastern, sermonsForTheme } from '@/lib/newsletter/compose';
import { renderDigestHtml, renderReviewEmail, reviewUrl, sendOne } from '@/lib/newsletter/email';

export const dynamic = 'force-dynamic';

function isSaturdayEastern(): boolean {
  const wd = new Date().toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
  });
  return wd === 'Sat';
}

export async function GET(request: NextRequest) {
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!isVercelCron && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const force = new URL(request.url).searchParams.get('force') === '1';
  if (!force && !isSaturdayEastern()) {
    return NextResponse.json({ skipped: 'not-saturday-eastern' });
  }

  const weekKey = weekKeyEastern();
  try {
    const existing = await (prisma as any).newsletterIssue.findUnique({ where: { weekKey } });
    if (existing && existing.status !== 'DRAFT' && !force) {
      return NextResponse.json({ skipped: 'already-decided', weekKey, status: existing.status });
    }
    if (existing && existing.status === 'DRAFT' && !force) {
      return NextResponse.json({ skipped: 'draft-exists', weekKey, token: existing.token });
    }

    const draft = await composeIssue();
    if (draft.articles.length === 0) {
      return NextResponse.json({ skipped: 'no-published-articles', weekKey });
    }
    const slugs = draft.articles.map((a) => a.slug);

    let issue: any;
    if (existing) {
      issue = await (prisma as any).newsletterIssue.update({
        where: { weekKey },
        data: {
          themeKey: draft.theme.key,
          themeLabel: draft.theme.label,
          subject: draft.subject,
          intro: draft.intro,
          slugsJson: JSON.stringify(slugs),
          status: 'DRAFT',
        },
      });
    } else {
      issue = await (prisma as any).newsletterIssue.create({
        data: {
          weekKey,
          themeKey: draft.theme.key,
          themeLabel: draft.theme.label,
          subject: draft.subject,
          intro: draft.intro,
          slugsJson: JSON.stringify(slugs),
        },
      });
    }

    const activeCount = await (prisma as any).newsletterSubscriber.count({
      where: { status: 'ACTIVE' },
    });

    const videos = (await sermonsForTheme(draft.theme, 1)).map((s) => ({
      slug: s.slug,
      title: s.title,
      excerpt: s.excerpt,
      youTubeId: s.youTubeId,
    }));
    const previewHtml = renderDigestHtml({
      themeLabel: draft.theme.label,
      intro: draft.intro,
      articles: draft.articles.map((a) => ({ slug: a.slug, title: a.title, excerpt: a.excerpt })),
      videos,
    });
    const reviewEmailHtml = renderReviewEmail({
      themeLabel: draft.theme.label,
      subject: draft.subject,
      articleCount: slugs.length,
      activeCount,
      reviewUrl: reviewUrl(issue.token),
      previewHtml,
    });

    const to =
      process.env.NEWSLETTER_REVIEW_EMAIL ||
      process.env.NEWSLETTER_EMAIL ||
      'hello@gracelifecenter.com';
    const send = await sendOne(
      to,
      `Review this week's digest — ${draft.theme.label}`,
      reviewEmailHtml
    );

    return NextResponse.json({
      ok: true,
      weekKey,
      theme: draft.theme.key,
      articles: slugs.length,
      activeSubscribers: activeCount,
      reviewEmailedTo: to,
      emailId: send.id || null,
      emailError: send.error || null,
    });
  } catch (err: any) {
    console.error('[newsletter-digest] fatal:', err?.message || err);
    return NextResponse.json(
      { error: 'Internal server error', message: err?.message },
      { status: 500 }
    );
  }
}

export { GET as POST };
