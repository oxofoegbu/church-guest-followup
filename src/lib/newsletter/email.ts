// Run 43 — newsletter email rendering + sending.
// Sends from the church's own identity ("Grace Life Center") via Resend, with a
// branded, email-client-safe (table + inline styles) digest and a CAN-SPAM
// footer (postal address + one-click unsubscribe). A dedicated sender keeps the
// public newsletter's From identity separate from the internal follow-up app.

import { SITE } from '@/lib/site';
import { youTubeThumb } from '@/content/teaching';

const FROM_EMAIL =
  process.env.NEWSLETTER_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || 'hello@gracelifecenter.com';
const FROM = `${SITE.name} <${FROM_EMAIL}>`;

// Warm palette (inline; email clients ignore <style>/classes reliably).
const C = {
  cream: '#f7f2e8',
  card: '#ffffff',
  ink: '#2a2621',
  umber: '#3a332a',
  soft: '#6a6157',
  ember: '#b7532b',
  line: '#e7ddca',
};

export function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&quot;'
  );
}

export function unsubscribeUrl(token: string): string {
  return `${SITE.url}/api/newsletter/unsubscribe?t=${encodeURIComponent(token)}`;
}
export function reviewUrl(token: string): string {
  return `${SITE.url}/api/newsletter/review/${encodeURIComponent(token)}`;
}

export interface DigestArticle {
  slug: string;
  title: string;
  excerpt: string;
}

export interface DigestVideo {
  slug: string;
  title: string;
  excerpt: string;
  youTubeId: string;
}

// The digest body. Returns a self-contained fragment (no <html>/<body>) so it
// embeds cleanly both as a sent email and inside the review preview.
export function renderDigestHtml(args: {
  themeLabel: string;
  intro: string;
  articles: DigestArticle[];
  videos?: DigestVideo[];
  unsubUrl?: string;
}): string {
  const cards = args.articles
    .map((a) => {
      const url = `${SITE.url}/teaching/${encodeURIComponent(a.slug)}`;
      return `
      <tr><td style="padding:0 0 14px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.card};border:1px solid ${C.line};border-radius:12px;">
          <tr><td style="padding:20px 22px;">
            <a href="${url}" style="color:${C.umber};font-family:Georgia,'Times New Roman',serif;font-size:19px;font-weight:bold;text-decoration:none;line-height:1.3;">${esc(a.title)}</a>
            <p style="margin:8px 0 14px 0;color:${C.soft};font-size:15px;line-height:1.55;font-family:Georgia,serif;">${esc(a.excerpt)}</p>
            <a href="${url}" style="color:${C.ember};font-size:14px;font-weight:bold;text-decoration:none;font-family:Arial,Helvetica,sans-serif;">Read &rsaquo;</a>
          </td></tr>
        </table>
      </td></tr>`;
    })
    .join('');

  const videoSection =
    args.videos && args.videos.length > 0
      ? `<tr><td style="padding:2px 20px 0 20px;">
        <p style="margin:24px 0 10px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${C.ember};font-weight:bold;">Watch</p>
        ${args.videos
          .map((v) => {
            const url = `${SITE.url}/teaching/${encodeURIComponent(v.slug)}`;
            return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.card};border:1px solid ${C.line};border-radius:12px;margin-bottom:14px;"><tr><td style="padding:0;">
              <a href="${url}" style="text-decoration:none;display:block;"><img src="${youTubeThumb(v.youTubeId)}" width="560" alt="${esc(v.title)}" style="width:100%;max-width:560px;height:auto;border-radius:12px 12px 0 0;display:block;"></a>
              <div style="padding:16px 22px 20px 22px;">
                <a href="${url}" style="color:${C.umber};font-family:Georgia,'Times New Roman',serif;font-size:19px;font-weight:bold;text-decoration:none;line-height:1.3;">${esc(v.title)}</a>
                <p style="margin:8px 0 12px 0;color:${C.soft};font-size:15px;line-height:1.55;font-family:Georgia,serif;">${esc(v.excerpt)}</p>
                <a href="${url}" style="color:${C.ember};font-size:14px;font-weight:bold;text-decoration:none;font-family:Arial,Helvetica,sans-serif;">&#9658;&nbsp; Watch the message</a>
              </div></td></tr></table>`;
          })
          .join('')}
      </td></tr>`
      : '';

  const addr = `${esc(SITE.name)} &middot; ${esc(SITE.street)}, ${esc(SITE.city)}, ${esc(
    SITE.region
  )} ${esc(SITE.postal)}`;

  const unsub = args.unsubUrl
    ? `<a href="${args.unsubUrl}" style="color:${C.soft};text-decoration:underline;">Unsubscribe</a>`
    : `<span style="color:${C.soft};">(unsubscribe link appears on the sent copy)</span>`;

  return `
  <div style="background:${C.cream};margin:0;padding:24px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
      <tr><td style="padding:0 20px;">
        <p style="margin:0 0 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${C.ember};font-weight:bold;">Grace Life Center &middot; Watch &amp; Read</p>
        <h1 style="margin:0 0 14px 0;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.15;color:${C.umber};font-weight:bold;">${esc(
          args.themeLabel
        )}</h1>
        <p style="margin:0 0 22px 0;font-family:Georgia,serif;font-size:16px;line-height:1.6;color:${C.ink};">${esc(
          args.intro
        )}</p>
      </td></tr>
      <tr><td style="padding:0 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${cards}</table>
      </td></tr>
      ${videoSection}
      <tr><td style="padding:8px 20px 0 20px;">
        <a href="${SITE.url}/teaching" style="color:${C.ember};font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;text-decoration:none;">Browse all teaching &rsaquo;</a>
      </td></tr>
      <tr><td style="padding:26px 20px 0 20px;border-top:1px solid ${C.line};margin-top:20px;">
        <p style="margin:16px 0 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:${C.soft};">${addr}</p>
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:${C.soft};">You are receiving this because you asked to hear when new teaching lands. ${unsub}.</p>
      </td></tr>
    </table>
  </div>`;
}

// The review email sent to the pastor: a heads-up + the preview + a button that
// leads to the review page (where the actual send happens on a POST — so an
// inbox link-scanner can never trigger a send).
export function renderReviewEmail(args: {
  themeLabel: string;
  subject: string;
  articleCount: number;
  activeCount: number;
  reviewUrl: string;
  previewHtml: string;
}): string {
  return `
  <div style="background:${C.cream};padding:24px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
      <tr><td style="padding:0 20px 18px 20px;">
        <h2 style="margin:0 0 8px 0;font-family:Georgia,serif;font-size:22px;color:${C.umber};">This week's digest is ready to review</h2>
        <p style="margin:0 0 6px 0;font-family:Georgia,serif;font-size:15px;line-height:1.6;color:${C.ink};">
          Theme: <strong>${esc(args.themeLabel)}</strong> &middot; ${args.articleCount} pieces &middot; ${args.activeCount} active subscriber(s).
        </p>
        <p style="margin:0 0 16px 0;font-family:Georgia,serif;font-size:15px;line-height:1.6;color:${C.ink};">
          Nothing goes out until you approve it. Review the full digest and choose to send or skip:
        </p>
        <a href="${args.reviewUrl}" style="display:inline-block;background:${C.ember};color:#ffffff;padding:13px 26px;border-radius:8px;text-decoration:none;font-weight:bold;font-family:Arial,Helvetica,sans-serif;font-size:15px;">Review &amp; send &rsaquo;</a>
      </td></tr>
      <tr><td style="padding:0 20px;">
        <p style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:${C.soft};">Preview</p>
        <div style="border:1px solid ${C.line};border-radius:12px;overflow:hidden;">${args.previewHtml}</div>
      </td></tr>
    </table>
  </div>`;
}

// ── Sending (Resend) ────────────────────────────────────────────────────────

export async function sendOne(
  to: string,
  subject: string,
  html: string,
  headers?: Record<string, string>
): Promise<{ id?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { error: 'Resend API key not configured' };
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [to], subject, html, headers: headers || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: (data && data.message) || `Resend error ${res.status}` };
    return { id: data && data.id };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'send failed' };
  }
}

export interface OutMessage {
  to: string;
  subject: string;
  html: string;
  headers?: Record<string, string>;
}

// Batch-send via Resend's /emails/batch (up to 100 per call), chunked. Each
// message carries its own personalized unsubscribe header/link.
export async function sendNewsletterBatch(
  messages: OutMessage[]
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { sent: 0, failed: messages.length, errors: ['Resend API key not configured'] };

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];
  const CHUNK = 100;

  for (let i = 0; i < messages.length; i += CHUNK) {
    const slice = messages.slice(i, i + CHUNK);
    const payload = slice.map((m) => ({
      from: FROM,
      to: [m.to],
      subject: m.subject,
      html: m.html,
      headers: m.headers || undefined,
    }));
    try {
      const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        failed += slice.length;
        errors.push((data && data.message) || `Resend batch error ${res.status}`);
      } else {
        sent += slice.length;
      }
    } catch (e: unknown) {
      failed += slice.length;
      errors.push(e instanceof Error ? e.message : 'batch send failed');
    }
  }
  return { sent, failed, errors };
}
