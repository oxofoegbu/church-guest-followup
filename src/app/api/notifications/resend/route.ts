import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { notifyVolunteerAssignment } from '@/lib/notifications';
import { formatDate } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request, ['ADMIN']);
    const { guestId } = await request.json();

    if (!guestId) {
      return NextResponse.json({ error: 'guestId is required' }, { status: 400 });
    }

    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
      include: { assignedVolunteer: { select: { id: true, name: true, email: true, phone: true } } },
    });

    if (!guest || !guest.assignedVolunteer) {
      return NextResponse.json({ error: 'Guest not found or not assigned' }, { status: 404 });
    }

    const vol = guest.assignedVolunteer;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    await notifyVolunteerAssignment({
      volunteerId: vol.id,
      volunteerName: vol.name,
      volunteerEmail: vol.email,
      volunteerPhone: vol.phone,
      guestId: guest.id,
      guestName: `${guest.firstName} ${guest.lastName}`,
      guestPhone: guest.phone,
      firstVisitDate: formatDate(guest.firstVisitDate),
      serviceAttended: guest.serviceAttended,
      preferredContact: guest.preferredContactMethod,
      guestLink: `${appUrl}/dashboard/guests/${guest.id}`,
    });

    return NextResponse.json({ ok: true, message: 'Notifications resent' });
  } catch (error) {
    return handleAuthError(error);
  }
}
