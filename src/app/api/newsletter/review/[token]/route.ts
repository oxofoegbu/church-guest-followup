/**
 * /api/newsletter/review/[token]  (Run 43)
 * ---------------------------------------------------------------------------
 * The pastor's approval surface for a weekly digest. GET renders a preview page
 * with "Send" and "Skip" buttons; the actual send/skip happens on POST — so a
 * link-scanner following the emailed review URL can never trigger a send. The
 * unguessable per-issue token is the capability (no login), matching the
 * unsubscribe-token pattern.
 * ---------------------------------------------------------------------------
 */
import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { articlesBySlugs, themeByKey, sermonsForTheme } from '@/lib/newsletter/compose';
import { renderDigestHtml, unsubscribeUrl, sendNewsletterBatch, esc } from '@/lib/newsletter/email';
import type { OutMessage } from '@/lib/newsletter/email';
import { SITE } from '@/lib/site';

export const dynamic = 'force-dynamic';

function videosForThemeKey(themeKey: string) {
  const theme = themeByKey(themeKey);
  if (!theme) return [];
  return sermonsForTheme(theme, 1).map((s) => ({
    slug: s.slug,
    title: s.title,
    excerpt: s.excerpt,
    youTubeId: s.youTubeId,
  }));
}

function htmlResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

function shell(title: string, inner: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(title)} — Grace Life Center</title>
<style>
  body{margin:0;background:#f7f2e8;color:#2a2621;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;}
  .wrap{max-width:640px;margin:0 auto;padding:28px 18px 60px;}
  h1{font-family:Georgia,serif;color:#3a332a;font-size:26px;margin:0 0 6px;}
  p.sub{color:#6a6157;margin:0 0 22px;font-size:15px;}
  .row{display:flex;gap:12px;flex-wrap:wrap;margin:0 0 26px;}
  button{font-size:15px;font-weight:700;border:0;border-radius:9px;padding:13px 22px;cursor:pointer;}
  .send{background:#b7532b;color:#fff;}
  .skip{background:#efe7d6;color:#3a332a;}
  .note{background:#fff;border:1px solid #e7ddca;border-radius:10px;padding:14px 16px;color:#6a6157;font-size:13px;margin:0 0 22px;}
  iframe{width:100%;height:900px;border:1px solid #e7ddca;border-radius:12px;background:#fff;}
  form{display:inline;}
</style></head><body><div class="wrap">${inner}</div></body></html>`;
}

function previewFrame(previewHtml: string): string {
  // Isolate the email's inline styles inside an iframe so nothing bleeds.
  return `<iframe title="Digest preview" srcdoc="${esc(previewHtml)}"></iframe>`;
}

export async function GET(_req: NextRequest, ctx: { params: { token: string } }) {
  const issue = await (prisma as any).newsletterIssue.findUnique({
    where: { token: ctx.params.token },
  });
  if (!issue) return htmlResponse(shell('Not found', '<h1>Link not valid</h1><p class="sub">This review link doesn’t match any digest.</p>'), 404);

  const articles = articlesBySlugs(JSON.parse(issue.slugsJson || '[]'));
  const videos = videosForThemeKey(issue.themeKey);
  const previewHtml = renderDigestHtml({
    themeLabel: issue.themeLabel,
    intro: issue.intro,
    articles: articles.map((a) => ({ slug: a.slug, title: a.title, excerpt: a.excerpt })),
    videos,
  });

  if (issue.status !== 'DRAFT') {
    const msg =
      issue.status === 'SENT'
        ? `Sent to ${issue.sentCount ?? 0} subscriber(s).`
        : 'Skipped — no email was sent.';
    return htmlResponse(
      shell(
        `Digest ${issue.status.toLowerCase()}`,
        `<h1>${esc(issue.themeLabel)}</h1><p class="sub">This week’s digest is <strong>${esc(
          issue.status
        )}</strong>. ${esc(msg)}</p>${previewFrame(previewHtml)}`
      )
    );
  }

  const activeCount = await (prisma as any).newsletterSubscriber.count({
    where: { status: 'ACTIVE' },
  });
  const action = `/api/newsletter/review/${encodeURIComponent(ctx.params.token)}`;
  const controls = `
    <div class="row">
      <form method="post" action="${action}"><input type="hidden" name="action" value="send">
        <button class="send" type="submit">Send to ${activeCount} subscriber${activeCount === 1 ? '' : 's'}</button></form>
      <form method="post" action="${action}"><input type="hidden" name="action" value="skip">
        <button class="skip" type="submit">Skip this week</button></form>
    </div>`;
  const inner =
    `<h1>${esc(issue.themeLabel)}</h1>` +
    `<p class="sub">Subject: “${esc(issue.subject)}” &middot; ${articles.length} pieces &middot; ${activeCount} active subscriber${
      activeCount === 1 ? '' : 's'
    }.</p>` +
    controls +
    `<div class="note">Sending happens only when you press the button above. This link is private to you.</div>` +
    previewFrame(previewHtml);

  return htmlResponse(shell('Review digest', inner));
}

export async function POST(req: NextRequest, ctx: { params: { token: string } }) {
  const issue = await (prisma as any).newsletterIssue.findUnique({
    where: { token: ctx.params.token },
  });
  if (!issue) return htmlResponse(shell('Not found', '<h1>Link not valid</h1>'), 404);

  if (issue.status !== 'DRAFT') {
    return htmlResponse(
      shell('Already decided', `<h1>Already ${esc(issue.status.toLowerCase())}</h1><p class="sub">No action taken — this digest was already ${esc(
        issue.status.toLowerCase()
      )}.</p>`)
    );
  }

  let action = '';
  try {
    const form = await req.formData();
    action = String(form.get('action') || '');
  } catch {
    action = '';
  }

  if (action === 'skip') {
    await (prisma as any).newsletterIssue.update({
      where: { id: issue.id },
      data: { status: 'SKIPPED', decidedAt: new Date() },
    });
    return htmlResponse(
      shell('Skipped', '<h1>Skipped</h1><p class="sub">No email was sent this week. The next digest will be drafted on schedule.</p>')
    );
  }

  if (action === 'send') {
    const articles = articlesBySlugs(JSON.parse(issue.slugsJson || '[]'));
    const videos = videosForThemeKey(issue.themeKey);
    const subs: Array<{ email: string; token: string }> = await (
      prisma as any
    ).newsletterSubscriber.findMany({
      where: { status: 'ACTIVE' },
      select: { email: true, token: true },
    });

    const messages: OutMessage[] = subs.map((s) => {
      const unsub = unsubscribeUrl(s.token);
      return {
        to: s.email,
        subject: issue.subject,
        html: renderDigestHtml({
          themeLabel: issue.themeLabel,
          intro: issue.intro,
          articles: articles.map((a) => ({ slug: a.slug, title: a.title, excerpt: a.excerpt })),
          videos,
          unsubUrl: unsub,
        }),
        headers: {
          'List-Unsubscribe': `<${unsub}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      };
    });

    const result = subs.length > 0
      ? await sendNewsletterBatch(messages)
      : { sent: 0, failed: 0, errors: [] as string[] };

    await (prisma as any).newsletterIssue.update({
      where: { id: issue.id },
      data: {
        status: 'SENT',
        decidedAt: new Date(),
        recipientCount: subs.length,
        sentCount: result.sent,
      },
    });

    const failNote = result.failed > 0 ? ` ${result.failed} could not be sent.` : '';
    return htmlResponse(
      shell(
        'Sent',
        `<h1>Sent</h1><p class="sub">“${esc(issue.subject)}” went out to ${result.sent} of ${
          subs.length
        } subscriber${subs.length === 1 ? '' : 's'}.${esc(failNote)}</p><p class="sub"><a href="${SITE.url}/teaching">View Watch &amp; Read &rsaquo;</a></p>`
      )
    );
  }

  return htmlResponse(shell('Unknown action', '<h1>Unknown action</h1>'), 400);
}
