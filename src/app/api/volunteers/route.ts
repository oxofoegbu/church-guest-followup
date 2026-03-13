import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request, ['ADMIN', 'LEADER']);
    const url = new URL(request.url);
    const volunteerId = url.searchParams.get('id');

    if (!volunteerId) {
      return NextResponse.json({ error: 'Volunteer ID required' }, { status: 400 });
    }

    const volunteer = await prisma.user.findUnique({
      where: { id: volunteerId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        assignedGuests: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            status: true,
            serviceReturnCount: true,
            serviceReturnTarget: true,
            becomeSignup: true,
            firstVisitDate: true,
            serviceAttended: true,
            assignedAt: true,
            activities: {
              select: {
                id: true,
                activityType: true,
                activityDateTime: true,
                outcome: true,
                notes: true,
                nextFollowUpDate: true,
              },
              orderBy: { activityDateTime: 'desc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!volunteer) {
      return NextResponse.json({ error: 'Volunteer not found' }, { status: 404 });
    }

    return NextResponse.json(volunteer);
  } catch (error) {
    return handleAuthError(error);
  }
}
