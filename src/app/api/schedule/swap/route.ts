import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { getPermissionLevel } from '@/lib/roles';
import { notifyServiceRoleAssignment } from '@/lib/schedule-notifications';
import { logAudit } from '@/lib/audit';

/**
 * POST /api/schedule/swap
 * Body: { sourceId: string, targetId: string, mode: 'swap' | 'move', notify?: boolean }
 *
 * swap — exchanges all content (topic, roles, seminar panel, notes, order of service)
 *        between the two Sundays. Dates and month themes stay with their calendar slot.
 * move — moves content from source → target; source is reset to a blank Sunday.
 *
 * Both modes: reset reminder flags on both rows, rebuild calendar ActionItems for all
 * linked users at their new dates, and (optionally) send immediate notifications.
 */

const ROLE_DEFINITIONS = [
  { idKey: 'speakerId' as const,            nameKey: 'speakerName' as const,            emoji: '🎤', label: 'Speaker (Word Minister)'  },
  { idKey: 'serviceCoordinatorId' as const, nameKey: 'serviceCoordinatorName' as const, emoji: '📋', label: 'Service Coordinator'       },
  { idKey: 'propheticPrayerId' as const,    nameKey: 'propheticPrayerName' as const,    emoji: '🙏', label: 'Prophetic Prayer Minister' },
  { idKey: 'worshipLeaderId' as const,      nameKey: 'worshipLeaderName' as const,      emoji: '🎵', label: 'Worship Leader'            },
];

// Content that travels with a Sunday when moved/swapped
type Content = Record<string, unknown>;

function extractContent(s: any): Content {
  return {
    topic:                  s.topic,
    speakerId:              s.speakerId,              speakerName:            s.speakerName,
    serviceCoordinatorId:   s.serviceCoordinatorId,   serviceCoordinatorName: s.serviceCoordinatorName,
    propheticPrayerId:      s.propheticPrayerId,      propheticPrayerName:    s.propheticPrayerName,
    worshipLeaderId:        s.worshipLeaderId,        worshipLeaderName:      s.worshipLeaderName,
    isSeminar:              s.isSeminar,
    panelSpeakers:          s.panelSpeakers ?? null,
    notes:                  s.notes,
    orderOfService:         s.orderOfService ?? null,
    orderCustomized:        s.orderCustomized,
  };
}

const BLANK_CONTENT: Content = {
  topic: 'TBD — Topic to be assigned',
  speakerId: null,            speakerName: null,
  serviceCoordinatorId: null, serviceCoordinatorName: null,
  propheticPrayerId: null,    propheticPrayerName: null,
  worshipLeaderId: null,      worshipLeaderName: null,
  isSeminar: false,
  panelSpeakers: null,
  notes: null,
  orderOfService: null,
  orderCustomized: false,
};

const RESET_REMINDERS = {
  reminder60Sent: false,
  reminder30Sent: false,
  reminder14Sent: false,
  reminder7Sent:  false,
};

/** Rebuild calendar ActionItems + optionally notify everyone linked on this schedule row. */
async function rebuildCalendarAndNotify(scheduleId: string, notify: boolean) {
  const schedule = await prisma.serviceSchedule.findUnique({ where: { id: scheduleId } });
  if (!schedule) return;
  const s = schedule as any;

  // Wipe existing calendar entries for this Sunday — they may point at the wrong date/topic now
  await prisma.actionItem.deleteMany({ where: { scheduleId } });

  const dateStr = schedule.date.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });

  // Standard 4 roles
  for (const { idKey, emoji, label } of ROLE_DEFINITIONS) {
    const userId = s[idKey] as string | null;
    if (!userId) continue;
    // Seminar Sundays use the panel instead of the single speaker slot
    if (idKey === 'speakerId' && s.isSeminar) continue;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, phone: true },
    });
    if (!user) continue;

    await prisma.actionItem.create({
      data: {
        userId,
        actionType: 'APPOINTMENT',
        title: `${emoji} ${label}`,
        notes: `📅 ${dateStr}\n📖 Topic: ${schedule.topic}`,
        dueDate: schedule.date,
        dueTime: '10:00',
        reminderMinutes: 1440,
        scheduleId,
      },
    });

    if (notify) {
      notifyServiceRoleAssignment({
        userName:   user.name,
        userEmail:  user.email,
        userPhone:  user.phone,
        role:       label,
        date:       schedule.date,
        topic:      schedule.topic,
        monthTheme: schedule.monthTheme,
        orderOfService: s.orderOfService ?? null,
        scheduleId,
      }).catch(e => console.error('[swap notify]', e));
    }
  }

  // Seminar panel speakers
  if (s.isSeminar && Array.isArray(s.panelSpeakers)) {
    for (const panelist of s.panelSpeakers) {
      if (!panelist?.userId) continue;
      const user = await prisma.user.findUnique({
        where: { id: panelist.userId },
        select: { id: true, name: true, email: true, phone: true },
      });
      if (!user) continue;

      await prisma.actionItem.create({
        data: {
          userId: user.id,
          actionType: 'APPOINTMENT',
          title: `🎓 Seminar Speaker${panelist.title ? ' — ' + panelist.title : ''}`,
          notes: `📅 ${dateStr} | 📖 Topic: ${schedule.topic}` + (panelist.title ? ` | 🎤 Your topic: ${panelist.title}` : ''),
          dueDate: schedule.date,
          dueTime: '10:00',
          reminderMinutes: 1440,
          scheduleId,
        },
      });

      if (notify) {
        notifyServiceRoleAssignment({
          userName:   user.name,
          userEmail:  user.email,
          userPhone:  user.phone,
          role:       `🎓 Seminar Speaker${panelist.title ? ' — ' + panelist.title : ''}`,
          date:       schedule.date,
          topic:      schedule.topic,
          monthTheme: schedule.monthTheme,
          orderOfService: s.orderOfService ?? null,
          scheduleId,
        }).catch(e => console.error('[swap panel notify]', e));
      }
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);

    // Admin-only: swapping moves topics, which only ADMIN_ACCESS may edit
    const customRolesSetting = await prisma.appSetting.findUnique({ where: { key: 'custom_roles' } });
    const permLevel = getPermissionLevel(session.role, customRolesSetting?.value ?? null);
    if (permLevel !== 'ADMIN_ACCESS') {
      return NextResponse.json({ error: 'Forbidden — admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { sourceId, targetId, mode } = body as { sourceId?: string; targetId?: string; mode?: string };
    const notify = body.notify !== false; // default true

    if (!sourceId || !targetId || sourceId === targetId) {
      return NextResponse.json({ error: 'sourceId and targetId must be two different Sundays' }, { status: 400 });
    }
    if (mode !== 'swap' && mode !== 'move') {
      return NextResponse.json({ error: "mode must be 'swap' or 'move'" }, { status: 400 });
    }

    const [source, target] = await Promise.all([
      prisma.serviceSchedule.findUnique({ where: { id: sourceId } }),
      prisma.serviceSchedule.findUnique({ where: { id: targetId } }),
    ]);
    if (!source || !target) return NextResponse.json({ error: 'Sunday not found' }, { status: 404 });

    const sourceContent = extractContent(source);
    const targetContent = extractContent(target);

    const newSourceContent = mode === 'swap' ? targetContent : BLANK_CONTENT;
    const newTargetContent = sourceContent;

    // Apply both updates atomically
    await prisma.$transaction([
      prisma.serviceSchedule.update({
        where: { id: sourceId },
        data: { ...newSourceContent, ...RESET_REMINDERS } as any,
      }),
      prisma.serviceSchedule.update({
        where: { id: targetId },
        data: { ...newTargetContent, ...RESET_REMINDERS } as any,
      }),
    ]);

    // Rebuild calendar entries + notify (non-atomic, best-effort — same as existing PATCH flow)
    await rebuildCalendarAndNotify(sourceId, notify);
    await rebuildCalendarAndNotify(targetId, notify);

    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
    await logAudit({
      action: mode === 'swap' ? 'SCHEDULE_SWAP' : 'SCHEDULE_MOVE',
      category: 'SCHEDULE',
      description: mode === 'swap'
        ? `Swapped Sundays ${fmt(source.date)} ⇄ ${fmt(target.date)} ("${source.topic}" ⇄ "${target.topic}")`
        : `Moved "${source.topic}" from ${fmt(source.date)} → ${fmt(target.date)}`,
      userId: session.userId,
      targetId: targetId,
      targetType: 'SCHEDULE',
      metadata: { sourceId, targetId, mode, notify },
    }).catch(e => console.error('[swap audit]', e));

    const [updatedSource, updatedTarget] = await Promise.all([
      prisma.serviceSchedule.findUnique({ where: { id: sourceId } }),
      prisma.serviceSchedule.findUnique({ where: { id: targetId } }),
    ]);

    return NextResponse.json({ success: true, source: updatedSource, target: updatedTarget });
  } catch (error: any) {
    if (error?.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('[schedule swap]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
