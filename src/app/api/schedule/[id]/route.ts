import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { getPermissionLevel } from '@/lib/roles';

type Params = { params: { id: string } };

const ROLE_DEFINITIONS = [
  { prevKey: 'speakerId' as const,            newKey: 'speakerId' as const,            emoji: '🎤', label: 'Speaking at Sunday Service'   },
  { prevKey: 'serviceCoordinatorId' as const, newKey: 'serviceCoordinatorId' as const, emoji: '📋', label: 'Service Coordinator'            },
  { prevKey: 'propheticPrayerId' as const,    newKey: 'propheticPrayerId' as const,    emoji: '🙏', label: 'Prophetic Prayer Minister'       },
  { prevKey: 'worshipLeaderId' as const,      newKey: 'worshipLeaderId' as const,      emoji: '🎵', label: 'Worship Leader'                  },
];

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
    const customRolesSetting = await prisma.appSetting.findUnique({ where: { key: 'custom_roles' } });
    const permLevel = getPermissionLevel(session.role, customRolesSetting?.value ?? null);

    const canEdit = permLevel === 'ADMIN_ACCESS' || permLevel === 'LEADER_ACCESS';
    if (!canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Snapshot before update for diff
    const before = await prisma.serviceSchedule.findUnique({ where: { id: params.id } });
    if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 });

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

    // ── Auto-sync ActionItems for assigned users ─────────────────────────
    const dateStr = before.date.toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
    });

    for (const { prevKey, emoji, label } of ROLE_DEFINITIONS) {
      const prevUserId: string | null = (before as any)[prevKey] ?? null;
      const newUserId: string | null = (updated as any)[prevKey] ?? null;

      if (prevUserId === newUserId) continue; // no change

      // Remove old ActionItem
      if (prevUserId) {
        await prisma.actionItem.deleteMany({
          where: { scheduleId: params.id, userId: prevUserId },
        });
      }

      // Create new ActionItem
      if (newUserId) {
        await prisma.actionItem.create({
          data: {
            userId: newUserId,
            actionType: 'APPOINTMENT',
            title: `${emoji} ${label}`,
            notes: `📅 ${dateStr}\n📖 Topic: ${before.topic}`,
            dueDate: before.date,
            dueTime: '10:00',
            reminderMinutes: 1440,
            scheduleId: params.id,
          },
        });
      }
    }

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
    // Remove linked ActionItems first
    await prisma.actionItem.deleteMany({ where: { scheduleId: params.id } });
    await prisma.serviceSchedule.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
