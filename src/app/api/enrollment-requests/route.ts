import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';

// GET /api/enrollment-requests?status=PENDING — admin-level only.
// Returns requests newest-first with enough context to decide.
export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, ['ADMIN']);
    const status = new URL(request.url).searchParams.get('status');
    // UNVERIFIED requests (Run 14: email not yet confirmed) never appear in
    // the admin queue — 'ALL' means all decided-or-decidable requests.
    const where = status && status !== 'ALL'
      ? { status }
      : { status: { in: ['PENDING', 'APPROVED', 'REJECTED'] } };

    const requests = await (prisma as any).enrollmentRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        track: { select: { id: true, name: true, slug: true } },
        cohort: { select: { id: true, name: true, meetingDay: true, meetingTime: true } },
        matchedUser: { select: { id: true, name: true } },
        decidedBy: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json({ requests });
  } catch (error) {
    return handleAuthError(error);
  }
}
