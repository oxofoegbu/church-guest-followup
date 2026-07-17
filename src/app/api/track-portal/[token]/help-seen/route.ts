import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// Run 54 — POST /api/track-portal/[token]/help-seen
// Public, secured only by the unguessable portalToken (same trust model as the
// portal GET/POST). Stamps helpSeenAt so the first-run coachmark is not shown
// to this participant again, on any device.
//
// Deliberately idempotent and write-once: a second call on an enrollment that
// already has a stamp is a no-op rather than a refresh, so the "when did this
// person first find their footing" signal stays honest if we ever want it.
//
// Unlike the portal's progress POST this is NOT gated on status === 'ACTIVE':
// a PAUSED participant still reads the page, and still deserves to dismiss a
// hint. It writes nothing a non-participant could care about.

export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  try {
    const enrollment = await (prisma as any).trackEnrollment.findUnique({
      where: { portalToken: params.token },
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
    console.error('Portal help-seen error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
