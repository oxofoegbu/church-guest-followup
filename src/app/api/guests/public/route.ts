import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { guestIntakeSchema } from '@/lib/utils';
import { notifyNewGuestSubmission } from '@/lib/notifications';

// Simple in-memory rate limiter
const rateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // requests per window
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour

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

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Too many submissions. Please try again later.' }, { status: 429 });
    }

    const body = await request.json();
    const parsed = guestIntakeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      }, { status: 400 });
    }

    const data = parsed.data;

    // Honeypot check
    if (data.honeypot) {
      // Silently accept but don't save (bot submission)
      return NextResponse.json({ ok: true, id: 'fake' });
    }

    const guest = await prisma.guest.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        email: data.email || null,
        preferredContactMethod: data.preferredContactMethod as any,
        firstVisitDate: new Date(data.firstVisitDate),
        serviceAttended: data.serviceAttended || null,
        howHeardAboutUs: data.howHeardAboutUs || null,
        prayerRequest: data.prayerRequest || null,
        status: 'NEW_GUEST',
      },
    });

    // Send notifications in the background (don't block response)
    notifyNewGuestSubmission({
      id: guest.id,
      firstName: guest.firstName,
      lastName: guest.lastName,
      phone: guest.phone,
      email: guest.email,
      serviceAttended: guest.serviceAttended,
      firstVisitDate: new Date(data.firstVisitDate).toLocaleDateString(),
      preferredContactMethod: data.preferredContactMethod,
      prayerRequest: guest.prayerRequest,
    }).catch(err => console.error('New guest notification error:', err));

    return NextResponse.json({ ok: true, id: guest.id }, { status: 201 });
  } catch (error) {
    console.error('Guest intake error:', error);
    return NextResponse.json({ error: 'Failed to submit. Please try again.' }, { status: 500 });
  }
}
