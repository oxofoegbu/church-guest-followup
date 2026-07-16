// Run 47 — public Prayer request endpoint. Captures the request as an UNVERIFIED
// WebContact and emails a 6-digit code; only after it is confirmed is the prayer
// team notified (see finalizeWebContact), honoring the urgent/private flags. An
// email is now required so we can send the code. Honeypot + rate limit; fire-safe.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createPendingWebContact } from '@/lib/webcontact';

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
  email: z.string().trim().email('A valid email is required so we can send your confirmation code').max(200),
  request: z.string().min(1, 'Please share what we can pray for').max(4000).trim(),
  urgent: z.boolean().optional(),
  private: z.boolean().optional(),
  website: z.string().max(0).optional(), // honeypot
});

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
    const name = parsed.data.name && parsed.data.name.length > 0 ? parsed.data.name : null;

    const { id, sent } = await createPendingWebContact({
      type: 'PRAYER',
      name,
      email: parsed.data.email,
      message: parsed.data.request,
      meta: { urgent: parsed.data.urgent === true, private: parsed.data.private === true },
      source: 'prayer',
    });
    if (!sent) {
      return NextResponse.json({ error: 'We could not send your confirmation code. Please try again.' }, { status: 502 });
    }
    return NextResponse.json({ ok: true, requiresVerification: true, id }, { status: 200 });
  } catch (error) {
    console.error('Prayer form error:', error);
    return NextResponse.json({ error: 'Failed to send. Please try again.' }, { status: 500 });
  }
}
