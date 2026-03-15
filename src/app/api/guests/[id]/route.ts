import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { notifyVolunteerAssignment } from '@/lib/notifications';
import { formatDate } from '@/lib/utils';
import { auditGuestAssigned, auditGuestStatusChanged, auditGuestArchived, auditGuestRestored, auditGuestDeleted } from '@/lib/audit';
import { logAudit } from '@/lib/audit';
import { getPermissionLevel } from '@/lib/roles';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth(request);
    const { id } = params;

    const guest = await prisma.guest.findUnique({
      where: { id },
      include: {
        assignedVolunteer: { select: { id: true, name: true, email: true, phone: true } },
        addedBy: { select: { id: true, name: true } },
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

    const customRolesSetting = await prisma.appSetting.findUnique({ where: { key: 'custom_roles' } });
    const permLevel = getPermissionLevel(session.role, customRolesSetting?.value);

    if (permLevel === 'VOLUNTEER_ACCESS' && guest.assignedVolunteerId !== session.userId) {
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

    const customRolesSetting2 = await prisma.appSetting.findUnique({ where: { key: 'custom_roles' } });
    const patchPermLevel = getPermissionLevel(session.role, customRolesSetting2?.value);

    // Volunteer-level users can only update their assigned guests and only certain fields
    if (patchPermLevel === 'VOLUNTEER_ACCESS') {
      if (guest.assignedVolunteerId !== session.userId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
      const allowed = [
        'status', 'becomeSignup', 'becomeSignupDate', 'becomeCohort',
        'waterBaptism', 'waterBaptismDate', 'volunteerInChurch', 'volunteerInChurchDate',
        'joinSmallGroup', 'joinSmallGroupDate', 'customTargets',
        'requestDeletion', 'deletionReason',
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
    // Remove action flags that aren't DB fields
    delete updateData.requestDeletion;
    delete updateData.deletionReason;
    delete updateData.dismissDeletionRequest;
    delete updateData.archivedReason;

    if (isNewAssignment) {
      if (patchPermLevel === 'VOLUNTEER_ACCESS') {
        return NextResponse.json({ error: 'Only admins and leaders can assign guests' }, { status: 403 });
      }
      updateData.assignedAt = new Date();
      if (guest.status === 'NEW_GUEST') {
        updateData.status = 'ASSIGNED';
      }
    }

    // Handle archiving
    if (body.status === 'ARCHIVED' && patchPermLevel !== 'ADMIN_ACCESS') {
      return NextResponse.json({ error: 'Only admins can archive guests' }, { status: 403 });
    }
    if (body.status === 'ARCHIVED') {
      updateData.archivedAt = new Date();
      updateData.archivedReason = body.archivedReason || null;
    }

    // Handle deletion request (non-admins can request, admins can dismiss)
    if (body.requestDeletion) {
      updateData.deletionRequestedAt = new Date();
      updateData.deletionRequestedBy = session.name;
      updateData.deletionRequestReason = body.deletionReason || null;
    }
    if (body.dismissDeletionRequest && patchPermLevel === 'ADMIN_ACCESS') {
      updateData.deletionRequestedAt = null;
      updateData.deletionRequestedBy = null;
      updateData.deletionRequestReason = null;
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

    const guestName = `${updated.firstName} ${updated.lastName}`;

    // Audit: status change
    if (body.status && body.status !== guest.status) {
      auditGuestStatusChanged(session.userId, session.name, id, guestName, guest.status, body.status).catch(() => {});
    }

    // Audit: archive
    if (body.status === 'ARCHIVED') {
      auditGuestArchived(session.userId, session.name, id, guestName, body.archivedReason).catch(() => {});
    }

    // Audit: restore from archive
    if (guest.status === 'ARCHIVED' && body.status && body.status !== 'ARCHIVED') {
      auditGuestRestored(session.userId, session.name, id, guestName).catch(() => {});
    }

    // Audit: assignment
    if (isNewAssignment && updated.assignedVolunteer) {
      auditGuestAssigned(session.userId, session.name, id, guestName, updated.assignedVolunteer.name).catch(() => {});
    }

    // Audit: deletion request
    if (body.requestDeletion) {
      logAudit({ action: 'DELETION_REQUESTED', category: 'GUEST', description: `${session.name} requested deletion of "${guestName}"`, userId: session.userId, userName: session.name, targetId: id, targetType: 'GUEST', targetName: guestName, metadata: { reason: body.deletionReason } }).catch(() => {});
    }
    if (body.dismissDeletionRequest) {
      logAudit({ action: 'DELETION_REQUEST_DISMISSED', category: 'GUEST', description: `${session.name} dismissed deletion request for "${guestName}"`, userId: session.userId, userName: session.name, targetId: id, targetType: 'GUEST', targetName: guestName }).catch(() => {});
    }

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
          guestName,
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

    const guestName = `${guest.firstName} ${guest.lastName}`;

    // Delete guest and all related data (cascades)
    await prisma.guest.delete({ where: { id } });

    // Audit after deletion
    await auditGuestDeleted(session.userId, session.name, guestName);

    return NextResponse.json({ ok: true, message: 'Guest permanently deleted' });
  } catch (error) {
    return handleAuthError(error);
  }
}
