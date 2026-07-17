import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';

// Run 54 — POST /api/my-tracks/help-seen  { enrollmentId }
// The session-side twin of the portal's help-seen route. Stamps helpSeenAt on
// the caller's OWN enrollment so the first-run coachmark stops appearing.
//
// The `userId: session.userId` clause in the where is the whole security
// model: a member can only ever stamp an enrollment that is theirs. Do not
// relax it into a bare findUnique on enrollmentId — that would let any signed-
// in user write to any enrollment.
//
// Write-once and idempotent, matching the portal route.

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const { enrollmentId } = await request.json();
    if (!enrollmentId || typeof enrollmentId !== 'string') {
      return NextResponse.json({ error: 'enrollmentId is required' }, { status: 400 });
    }

    const enrollment = await (prisma as any).trackEnrollment.findFirst({
      where: { id: enrollmentId, userId: session.userId },
      select: { id: true, helpSeenAt: true },
    });
    if (!enrollment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (enrollment.helpSeenAt) {
      return NextResponse.json({ helpSeenAt: enrollment.helpSeenAt });
    }

    const updated = await (prisma as any).trackEnrollment.update({
      where: { id: enrollment.id },
      data: { helpSeenAt: new Date() },
      select: { helpSeenAt: true },
    });
    return NextResponse.json({ helpSeenAt: updated.helpSeenAt });
  } catch (error) {
    return handleAuthError(error);
  }
}
