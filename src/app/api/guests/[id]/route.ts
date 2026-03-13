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

    if (session.role === 'VOLUNTEER' && guest.assignedVolunteerId !== session.userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Also fetch custom targets from settings
    const customTargetsSetting = await prisma.appSetting.findUnique({ where: { key: 'custom_targets' } });
    const customTargets = customTargetsSetting?.value ? JSON.parse(customTargetsSetting.value) : [];

    return NextResponse.json({ guest, customTargets });
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
      const allowed = [
        'status', 'becomeSignup', 'becomeSignupDate', 'becomeCohort',
        'waterBaptism', 'waterBaptismDate', 'volunteerInChurch', 'volunteerInChurchDate',
        'joinSmallGroup', 'joinSmallGroupDate', 'customTargets',
      ];
      const keys = Object.keys(body);
      for (const key of keys) {
        if (!allowed.includes(key)) {
          return NextResponse.json({ error: `Cannot update field: ${key}` }, { status: 403 });
        }
      }
      const VOLUNTEER_ALLOWED = [
        'ASSIGNED', 'CONTACT_ATTEMPTED', 'CONTACTED',
        'MEETING_SCHEDULED', 'MET', 'ATTENDING_REGULARLY',
      ];
      if (body.status && !VOLUNTEER_ALLOWED.includes(body.status)) {
        return NextResponse.json({ error: 'Not allowed to set this status' }, { status: 403 });
      }
    }

    // Handle assignment (admin and leader can assign)
    const isNewAssignment = body.assignedVolunteerId !== undefined &&
      body.assignedVolunteerId !== guest.assignedVolunteerId;

    const updateData: any = { ...body };

    if (isNewAssignment) {
      if (session.role === 'VOLUNTEER') {
        return NextResponse.json({ error: 'Only admins and leaders can assign guests' }, { status: 403 });
      }
      updateData.assignedAt = new Date();
      if (guest.status === 'NEW_GUEST') {
        updateData.status = 'ASSIGNED';
      }
    }

    // Handle archiving
    if (body.status === 'ARCHIVED' && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can archive guests' }, { status: 403 });
    }
    if (body.status === 'ARCHIVED') {
      updateData.archivedAt = new Date();
      updateData.archivedReason = body.archivedReason || null;
    }

    // Unarchive
    if (guest.status === 'ARCHIVED' && body.status && body.status !== 'ARCHIVED') {
      updateData.archivedAt = null;
      updateData.archivedReason = null;
    }

    // Date fields
    if (updateData.firstVisitDate) updateData.firstVisitDate = new Date(updateData.firstVisitDate);
    if (updateData.becomeSignupDate) updateData.becomeSignupDate = new Date(updateData.becomeSignupDate);
    if (updateData.waterBaptismDate) updateData.waterBaptismDate = new Date(updateData.waterBaptismDate);
    if (updateData.volunteerInChurchDate) updateData.volunteerInChurchDate = new Date(updateData.volunteerInChurchDate);
    if (updateData.joinSmallGroupDate) updateData.joinSmallGroupDate = new Date(updateData.joinSmallGroupDate);
    if (updateData.assignedAt) updateData.assignedAt = new Date(updateData.assignedAt);

    // Remove archivedReason from updateData if not archiving (it's not a Prisma field to set otherwise)
    if (body.status !== 'ARCHIVED') {
      delete updateData.archivedReason;
    }

    const updated = await prisma.guest.update({
      where: { id },
      data: updateData,
      include: { assignedVolunteer: { select: { id: true, name: true, email: true, phone: true } } },
    });

    // Notify on assignment (await so log status updates before function terminates)
    if (isNewAssignment && updated.assignedVolunteer) {
      const vol = updated.assignedVolunteer;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      try {
        await notifyVolunteerAssignment({
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
        });
      } catch (e) { console.error('Notification error:', e); }
    }

    return NextResponse.json({ guest: updated });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth(request, ['ADMIN']);
    const { id } = params;

    const guest = await prisma.guest.findUnique({ where: { id } });
    if (!guest) {
      return NextResponse.json({ error: 'Guest not found' }, { status: 404 });
    }

    // Delete guest and all related data (cascades)
    await prisma.guest.delete({ where: { id } });

    return NextResponse.json({ ok: true, message: 'Guest permanently deleted' });
  } catch (error) {
    return handleAuthError(error);
  }
}
