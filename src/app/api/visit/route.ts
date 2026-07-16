// Run 47 — public "Plan a Visit" endpoint (website). Captures the visit as an
// UNVERIFIED WebContact and emails a 6-digit code; on verification it becomes a
// real Guest in the Harvest CRM (drip + audit + team alert) via finalizeWebContact.
// The in-service guest card keeps using /api/guests/public (no OTP there).
// Honeypot + rate limit; email is required so we can send the code.
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
  firstName: z.string().trim().min(1, 'First name is required').max(80),
  lastName: z.string().trim().min(1, 'Last name is required').max(80),
  phone: z.string().trim().min(1, 'A phone number helps us say hello').max(40),
  email: z.string().trim().email('A valid email is required so we can confirm your visit').max(200),
  firstVisitDate: z.string().trim().min(1, 'Please pick a Sunday'),
  prayerRequest: z.string().trim().max(4000).optional().or(z.literal('')),
  website: z.string().max(0).optional(), // honeypot
});

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Too many submissions. Please try again later.' }, { status: 429 });
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
    const d = parsed.data;

    const { id, sent } = await createPendingWebContact({
      type: 'VISIT',
      name: `${d.firstName} ${d.lastName}`.trim(),
      email: d.email,
      phone: d.phone,
      message: d.prayerRequest && d.prayerRequest.length > 0 ? d.prayerRequest : null,
      meta: { firstName: d.firstName, lastName: d.lastName, firstVisitDate: d.firstVisitDate },
      source: 'plan-a-visit',
    });
    if (!sent) {
      return NextResponse.json({ error: 'We could not send your confirmation code. Please try again.' }, { status: 502 });
    }
    return NextResponse.json({ ok: true, requiresVerification: true, id }, { status: 200 });
  } catch (error) {
    console.error('Visit submit error:', error);
    return NextResponse.json({ error: 'Failed to submit. Please try again.' }, { status: 500 });
  }
}
