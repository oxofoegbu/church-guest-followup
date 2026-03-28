import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { notifyVolunteerAssignment } from '@/lib/notifications';
import { formatDate } from '@/lib/utils';
import { logAudit } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const { guestId } = await request.json();

    if (!guestId) {
      return NextResponse.json({ error: 'guestId is required' }, { status: 400 });
    }

    const guest = await prisma.guest.findUnique({ where: { id: guestId } });
    if (!guest) {
      return NextResponse.json({ error: 'Guest not found' }, { status: 404 });
    }

    // Only allow self-assign if guest is unassigned
    if (guest.assignedVolunteerId) {
      return NextResponse.json({ error: 'This guest has already been assigned to someone.' }, { status: 409 });
    }

    // Assign to self
    const updated = await prisma.guest.update({
      where: { id: guestId },
      data: {
        assignedVolunteerId: session.userId,
        assignedAt: new Date(),
        status: guest.status === 'NEW_GUEST' ? 'ASSIGNED' : guest.status,
      },
      include: {
        assignedVolunteer: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    const guestName = `${guest.firstName} ${guest.lastName}`;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://harvest.gracelifecenter.com';

    // Audit log
    logAudit({
      action: 'GUEST_SELF_ASSIGNED',
      category: 'GUEST',
      description: `${session.name} self-assigned guest "${guestName}"`,
      userId: session.userId,
      userName: session.name,
      targetId: guestId,
      targetType: 'GUEST',
      targetName: guestName,
    }).catch(() => {});

    // Send notification to self (confirmation)
    if (updated.assignedVolunteer) {
      const vol = updated.assignedVolunteer;
      notifyVolunteerAssignment({
        volunteerId: vol.id,
        volunteerName: vol.name,
        volunteerEmail: vol.email,
        volunteerPhone: vol.phone,
        guestId: updated.id,
        guestName,
        guestPhone: updated.phone,
        firstVisitDate: formatDate(updated.firstVisitDate),
        serviceAttended: updated.serviceAttended,
        preferredContact: updated.preferredContactMethod,
        guestLink: `${appUrl}/dashboard/guests/${updated.id}`,
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true, guest: updated });
  } catch (error) {
    return handleAuthError(error);
  }
}
