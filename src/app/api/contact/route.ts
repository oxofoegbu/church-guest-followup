// Run 31 — public Contact endpoint. Emails the church inbox via the existing
// Resend sender (no new plumbing, no DB). Recipient from CONTACT_EMAIL env
// (comma-separated) with a safe default. Honeypot + rate limit; fire-safe.
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
  name: z.string().min(1, 'Name is required').max(120).trim(),
  email: z.string().email('A valid email is required'),
  subject: z.string().max(120).optional(),
  message: z.string().min(1, 'Message is required').max(4000).trim(),
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
      return NextResponse.json({ error: 'Too many messages. Please try again later.' }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    // Honeypot: pretend success, write/send nothing.
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
    const { name, email, message } = parsed.data;
    const topic = parsed.data.subject ? ` (${parsed.data.subject})` : '';

    const recipients = (process.env.CONTACT_EMAIL || 'pastor@gracelifecenter.com')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const subject = `New message from ${name}${topic} — gracelifecenter.com`;
    const html =
      `<p><strong>${esc(name)}</strong> &lt;${esc(email)}&gt; wrote via the website${topic ? ` about “${esc(parsed.data.subject || '')}”` : ''}:</p>` +
      `<p style="white-space:pre-wrap">${esc(message)}</p>` +
      `<hr><p style="color:#6A6157;font-size:13px">Reply directly to ${esc(email)}.</p>`;

    // Fire-safe: never block or fail the submit on a send error.
    await Promise.all(
      recipients.map((to) => sendEmailViaResend(to, subject, html).catch(() => ({})))
    );

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json({ error: 'Failed to send. Please try again.' }, { status: 500 });
  }
}
