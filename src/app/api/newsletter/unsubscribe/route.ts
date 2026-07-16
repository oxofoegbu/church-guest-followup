/**
 * /api/newsletter/unsubscribe?t=TOKEN  (Run 43)
 * ---------------------------------------------------------------------------
 * One-click unsubscribe. Works on GET (link click) and POST (RFC 8058
 * List-Unsubscribe-Post one-click) — the token is always read from the query
 * string. Idempotent: unsubscribing an already-removed address is a no-op.
 * ---------------------------------------------------------------------------
 */
import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { esc } from '@/lib/newsletter/email';
import { SITE } from '@/lib/site';

export const dynamic = 'force-dynamic';

function page(title: string, body: string, status = 200): Response {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(title)} — Grace Life Center</title>
<style>body{margin:0;background:#f7f2e8;color:#2a2621;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;}
.wrap{max-width:520px;margin:0 auto;padding:56px 22px;}h1{font-family:Georgia,serif;color:#3a332a;font-size:26px;margin:0 0 10px;}
p{color:#4a443b;font-size:16px;line-height:1.6;margin:0 0 12px;}a{color:#b7532b;font-weight:700;text-decoration:none;}</style>
</head><body><div class="wrap">${body}</div></body></html>`;
  return new Response(html, { status, headers: { 'content-type': 'text/html; charset=utf-8' } });
}

async function handle(req: NextRequest): Promise<Response> {
  const token = new URL(req.url).searchParams.get('t') || '';
  if (!token) return page('Unsubscribe', '<h1>Missing link</h1><p>This unsubscribe link is incomplete.</p>', 400);

  const sub = await (prisma as any).newsletterSubscriber.findUnique({ where: { token } });
  if (!sub) {
    return page('Unsubscribe', '<h1>Link not valid</h1><p>We couldn’t find this address on our list. It may already be removed.</p>', 404);
  }

  if (sub.status !== 'UNSUBSCRIBED') {
    await (prisma as any).newsletterSubscriber.update({
      where: { id: sub.id },
      data: { status: 'UNSUBSCRIBED', unsubscribedAt: new Date() },
    });
  }

  return page(
    "You're unsubscribed",
    `<h1>You're unsubscribed</h1><p><strong>${esc(sub.email)}</strong> has been removed from the Grace Life Center teaching list. You won’t receive further emails.</p><p>Changed your mind? You can rejoin anytime at <a href="${SITE.url}/teaching">${esc(
      SITE.url
    )}/teaching</a>.</p>`
  );
}

export async function GET(req: NextRequest) {
  return handle(req);
}
export async function POST(req: NextRequest) {
  return handle(req);
}
