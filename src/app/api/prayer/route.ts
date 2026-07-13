// Run 32 — public Prayer request endpoint. Emails the prayer team via the
// existing Resend sender (no new plumbing, no DB). Recipient from PRAYER_EMAIL
// env (comma-separated) with a safe default of prayforme@gracelifecenter.com.
// Honors the "urgent" and "private" flags in the message. Honeypot + rate
// limit; fire-safe (never blocks the submit). Mirrors /api/contact exactly.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sendEmailViaResend } from '@/lib/notifications';

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
  name: z.string().max(120).trim().optional(),
  email: z.string().email('A valid email is required').optional().or(z.literal('')),
  request: z.string().min(1, 'Please share what we can pray for').max(4000).trim(),
  urgent: z.boolean().optional(),
  private: z.boolean().optional(),
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
    // Honeypot: pretend success, send nothing.
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
    const { request: prayerText } = parsed.data;
    const name = parsed.data.name && parsed.data.name.length > 0 ? parsed.data.name : 'Someone';
    const email = parsed.data.email && parsed.data.email.length > 0 ? parsed.data.email : '';
    const urgent = parsed.data.urgent === true;
    const isPrivate = parsed.data.private === true;

    const recipients = (process.env.PRAYER_EMAIL || 'prayforme@gracelifecenter.com')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const flags: string[] = [];
    if (urgent) flags.push('URGENT');
    if (isPrivate) flags.push('PRIVATE');
    const flagTag = flags.length > 0 ? `[${flags.join(' · ')}] ` : '';

    const subject = `${flagTag}Prayer request from ${name} — gracelifecenter.com`;
    const followUp = email
      ? `<p style="color:#6A6157;font-size:13px">They left an email — you can reach back out at ${esc(email)}.</p>`
      : `<p style="color:#6A6157;font-size:13px">No email was left; this request is anonymous.</p>`;
    const banner =
      urgent
        ? `<p style="background:#A63D1F;color:#fff;padding:8px 12px;border-radius:6px;font-weight:600">This request was marked <strong>urgent</strong> — someone asked to be reached out to.</p>`
        : '';
    const privacy = isPrivate
      ? `<p style="color:#8C6A38;font-size:13px"><strong>Keep confidential:</strong> the sender asked that this stay with the prayer team only.</p>`
      : '';

    const html =
      banner +
      `<p><strong>${esc(name)}</strong>${email ? ` &lt;${esc(email)}&gt;` : ''} asked for prayer:</p>` +
      `<p style="white-space:pre-wrap;font-size:16px">${esc(prayerText)}</p>` +
      `<hr>` +
      privacy +
      followUp;

    // Fire-safe: never block or fail the submit on a send error.
    await Promise.all(
      recipients.map((to) => sendEmailViaResend(to, subject, html).catch(() => ({})))
    );

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('Prayer form error:', error);
    return NextResponse.json({ error: 'Failed to send. Please try again.' }, { status: 500 });
  }
}
