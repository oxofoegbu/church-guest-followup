import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { notifyVolunteerAssignment } from '@/lib/notifications';
import { formatDate } from '@/lib/utils';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth(request);
    const { id } = params;

    const guest = await prisma.guest.findUnique({
      where: { id },
      include: {
        assignedVolunteer: { select: { id: true, name: true, email: true, phone: true } },
        activities: {
          include: { performedBy: { select: { id: true, name: true } } },
          orderBy: { activityDateTime: 'desc' },
        },
        serviceReturns: {
          include: { recordedBy: { select: { id: true, name: true } } },
          orderBy: { returnNumber: 'asc' },
        },
        notifications: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });

    if (!guest) {
      return NextResponse.json({ error: 'Guest not found' }, { status: 404 });
    }

    // Volunteers can only see their guests
    if (session.role === 'VOLUNTEER' && guest.assignedVolunteerId !== session.userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ guest });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth(request);
    const { id } = params;
    const body = await request.json();

    const guest = await prisma.guest.findUnique({ where: { id } });
    if (!guest) {
      return NextResponse.json({ error: 'Guest not found' }, { status: 404 });
    }

    // Volunteers can only update their assigned guests and only certain fields
    if (session.role === 'VOLUNTEER') {
      if (guest.assignedVolunteerId !== session.userId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
      // Restrict fields
      const allowed = ['status', 'becomeSignup', 'becomeSignupDate', 'becomeCohort'];
      const keys = Object.keys(body);
      for (const key of keys) {
        if (!allowed.includes(key)) {
          return NextResponse.json({ error: `Cannot update field: ${key}` }, { status: 403 });
        }
      }
      // Restrict statuses
      const VOLUNTEER_ALLOWED = [
        'ASSIGNED', 'CONTACT_ATTEMPTED', 'CONTACTED',
        'MEETING_SCHEDULED', 'MET', 'ATTENDING_REGULARLY',
      ];
      if (body.status && !VOLUNTEER_ALLOWED.includes(body.status)) {
        return NextResponse.json({ error: 'Not allowed to set this status' }, { status: 403 });
      }
    }

    // Handle assignment
    const isNewAssignment = body.assignedVolunteerId !== undefined &&
      body.assignedVolunteerId !== guest.assignedVolunteerId;

    const updateData: any = { ...body };

    if (isNewAssignment) {
      if (session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Only admins can assign guests' }, { status: 403 });
      }
      updateData.assignedAt = new Date();
      if (guest.status === 'NEW_GUEST') {
        updateData.status = 'ASSIGNED';
      }
    }

    // Date fields
    if (updateData.firstVisitDate) updateData.firstVisitDate = new Date(updateData.firstVisitDate);
    if (updateData.becomeSignupDate) updateData.becomeSignupDate = new Date(updateData.becomeSignupDate);
    if (updateData.assignedAt) updateData.assignedAt = new Date(updateData.assignedAt);

    const updated = await prisma.guest.update({
      where: { id },
      data: updateData,
      include: { assignedVolunteer: { select: { id: true, name: true, email: true, phone: true } } },
    });

    // Notify volunteer on assignment
    if (isNewAssignment && updated.assignedVolunteer) {
      const vol = updated.assignedVolunteer;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      notifyVolunteerAssignment({
        volunteerId: vol.id,
        volunteerName: vol.name,
        volunteerEmail: vol.email,
        volunteerPhone: vol.phone,
        guestId: updated.id,
        guestName: `${updated.firstName} ${updated.lastName}`,
        guestPhone: updated.phone,
        firstVisitDate: formatDate(updated.firstVisitDate),
        serviceAttended: updated.serviceAttended,
        preferredContact: updated.preferredContactMethod,
        guestLink: `${appUrl}/dashboard/guests/${updated.id}`,
      }).catch(console.error); // Fire and forget
    }

    return NextResponse.json({ guest: updated });
  } catch (error) {
    return handleAuthError(error);
  }
}
