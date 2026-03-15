import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { getPermissionLevel } from '@/lib/roles';
import { notifyServiceRoleAssignment } from '@/lib/schedule-notifications';

type Params = { params: { id: string } };

const ROLE_DEFINITIONS = [
  { idKey: 'speakerId' as const,            emoji: '🎤', label: 'Speaker (Word Minister)'   },
  { idKey: 'serviceCoordinatorId' as const, emoji: '📋', label: 'Service Coordinator'        },
  { idKey: 'propheticPrayerId' as const,    emoji: '🙏', label: 'Prophetic Prayer Minister'  },
  { idKey: 'worshipLeaderId' as const,      emoji: '🎵', label: 'Worship Leader'             },
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
    if (permLevel !== 'ADMIN_ACCESS' && permLevel !== 'LEADER_ACCESS') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const before = await prisma.serviceSchedule.findUnique({ where: { id: params.id } });
    if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await request.json();
    const allowedFields = [
      'speakerName','speakerId','serviceCoordinatorName','serviceCoordinatorId',
      'propheticPrayerName','propheticPrayerId','worshipLeaderName','worshipLeaderId',
      'notes','reminderSent',
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

    // ── Sync ActionItems + send immediate notifications ──────────────────────
    const dateStr = before.date.toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
    });

    for (const { idKey, emoji, label } of ROLE_DEFINITIONS) {
      const prevUserId = (before as any)[idKey] as string | null;
      const newUserId  = (updated as any)[idKey] as string | null;
      if (prevUserId === newUserId) continue;

      // Remove old ActionItem for previous assignee
      if (prevUserId) {
        await prisma.actionItem.deleteMany({ where: { scheduleId: params.id, userId: prevUserId } });
      }

      // Create ActionItem + send immediate notification for new assignee
      if (newUserId) {
        const user = await prisma.user.findUnique({
          where: { id: newUserId },
          select: { id: true, name: true, email: true, phone: true },
        });

        if (user) {
          // Calendar entry
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

          // Immediate email + WhatsApp
          notifyServiceRoleAssignment({
            userName:   user.name,
            userEmail:  user.email,
            userPhone:  user.phone,
            role:       label,
            date:       before.date,
            topic:      before.topic,
            monthTheme: before.monthTheme,
            scheduleId: params.id,
          }).catch(e => console.error('[schedule notify]', e));
        }
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
    await prisma.actionItem.deleteMany({ where: { scheduleId: params.id } });
    await prisma.serviceSchedule.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
