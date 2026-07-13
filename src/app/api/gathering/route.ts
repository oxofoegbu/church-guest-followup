// Run 33 — The Gathering interest endpoint. Two kinds of interest: joining the
// launch team, or being told when The Gathering launches. Emails the recipient
// via the existing Resend sender (no new plumbing, no DB). Recipient from
// GATHERING_EMAIL env (comma-separated), default thegathering@gracelifecenter.com.
// Honeypot + rate limit; fire-safe. Mirrors /api/contact + /api/prayer.
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
  interest: z.enum(['LAUNCH_TEAM', 'GATHER']),
  note: z.string().max(4000).trim().optional(),
  website: z.string().max(0).optional(), // honeypot
});

function esc(s: string): string {
  return s.replace(/[&<>]/g, (c) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'));
}

const LABEL: Record<'LAUNCH_TEAM' | 'GATHER', string> = {
  LAUNCH_TEAM: 'wants to join the launch team',
  GATHER: 'wants to be told when The Gathering launches',
};

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
    const { name, email, interest } = parsed.data;
    const note = parsed.data.note && parsed.data.note.length > 0 ? parsed.data.note : '';

    const recipients = (process.env.GATHERING_EMAIL || 'thegathering@gracelifecenter.com')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const tag = interest === 'LAUNCH_TEAM' ? '[Launch team] ' : '[Interest] ';
    const subject = `${tag}${name} — The Gathering`;
    const html =
      `<p><strong>${esc(name)}</strong> &lt;${esc(email)}&gt; ${LABEL[interest]}.</p>` +
      (note ? `<p style="white-space:pre-wrap">${esc(note)}</p>` : '') +
      `<hr><p style="color:#6A6157;font-size:13px">Reply directly to ${esc(email)}.</p>`;

    // Fire-safe: never block or fail the submit on a send error.
    await Promise.all(
      recipients.map((to) => sendEmailViaResend(to, subject, html).catch(() => ({})))
    );

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('Gathering form error:', error);
    return NextResponse.json({ error: 'Failed to send. Please try again.' }, { status: 500 });
  }
}
