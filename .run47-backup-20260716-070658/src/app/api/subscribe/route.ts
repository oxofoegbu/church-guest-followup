// Run 35 — Watch & Read subscribe endpoint. Captures an email so the church
// can let people know when new teaching lands. Emails a list-owner inbox via
// Resend (NEWSLETTER_EMAIL, comma-separated; default hello@gracelifecenter.com)
// AND — since Run 43 — persists the address to the NewsletterSubscriber table
// that feeds the weekly themed digest. Honeypot + rate limit; fire-safe.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sendEmailViaResend } from '@/lib/notifications';
import prisma from '@/lib/db';

const rateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 8;
const RATE_WINDOW = 60 * 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimit.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

const schema = z.object({
  email: z.string().email('A valid email is required'),
  website: z.string().max(0).optional(), // honeypot
});

function esc(s: string): string {
  return s.replace(/[&<>]/g, (c) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'));
}

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    if (body && typeof body.website === 'string' && body.website.length > 0) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { email } = parsed.data;
    const source =
      body && typeof body.source === 'string' ? body.source.slice(0, 60) : 'teaching';

    // Run 43 — persist to the newsletter list (best-effort; a DB hiccup must
    // never block the reply or the owner-inbox notification). Re-subscribing an
    // address that had unsubscribed reactivates it.
    try {
      await (prisma as any).newsletterSubscriber.upsert({
        where: { email },
        update: { status: 'ACTIVE', unsubscribedAt: null, source },
        create: { email, source },
      });
    } catch (e) {
      console.error('[subscribe] newsletter persist failed (non-fatal):', e);
    }

    const recipients = (process.env.NEWSLETTER_EMAIL || 'hello@gracelifecenter.com')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const subject = `New Watch & Read subscriber — gracelifecenter.com`;
    const html =
      `<p>A new person asked to hear when new teaching lands:</p>` +
      `<p style="font-size:16px"><strong>${esc(email)}</strong></p>` +
      `<hr><p style="color:#6A6157;font-size:13px">Add them to the teaching list.</p>`;

    await Promise.all(
      recipients.map((to) => sendEmailViaResend(to, subject, html).catch(() => ({})))
    );

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('Subscribe error:', error);
    return NextResponse.json({ error: 'Failed to subscribe. Please try again.' }, { status: 500 });
  }
}
