import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { getPermissionLevel } from '@/lib/roles';

type Params = { params: { id: string } };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    await requireAuth(request);
    const schedule = await prisma.serviceSchedule.findUnique({
      where: { id: params.id },
      include: {
        speaker:            { select: { id: true, name: true, email: true, phone: true } },
        serviceCoordinator: { select: { id: true, name: true, email: true, phone: true } },
        propheticPrayer:    { select: { id: true, name: true, email: true, phone: true } },
        worshipLeader:      { select: { id: true, name: true, email: true, phone: true } },
      },
    });
    if (!schedule) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(schedule);
  } catch (error: any) {
    if (error?.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth(request);

    // Fetch custom roles for permission check
    const customRolesSetting = await prisma.appSetting.findUnique({ where: { key: 'custom_roles' } });
    const permLevel = getPermissionLevel(session.role, customRolesSetting?.value ?? null);

    const canEdit = permLevel === 'ADMIN_ACCESS' || permLevel === 'LEADER_ACCESS';
    if (!canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();

    const allowedFields = [
      'speakerName', 'speakerId',
      'serviceCoordinatorName', 'serviceCoordinatorId',
      'propheticPrayerName', 'propheticPrayerId',
      'worshipLeaderName', 'worshipLeaderId',
      'notes', 'reminderSent',
    ];

    const data: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) data[field] = body[field];
    }

    // Admins can also update topic/theme
    if (permLevel === 'ADMIN_ACCESS') {
      if ('topic' in body) data.topic = body.topic;
      if ('monthTheme' in body) data.monthTheme = body.monthTheme;
    }

    const updated = await prisma.serviceSchedule.update({
      where: { id: params.id },
      data,
      include: {
        speaker:            { select: { id: true, name: true, email: true, phone: true } },
        serviceCoordinator: { select: { id: true, name: true, email: true, phone: true } },
        propheticPrayer:    { select: { id: true, name: true, email: true, phone: true } },
        worshipLeader:      { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error?.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('[schedule PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth(request);
    if (!['ADMIN', 'SENIOR_LEADER'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await prisma.serviceSchedule.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
