import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { actionItemSchema } from '@/lib/utils';
import { getPermissionLevel } from '@/lib/roles';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const url = new URL(request.url);
    const month = url.searchParams.get('month');
    const format = url.searchParams.get('format');
    const view = url.searchParams.get('view');
    const guestId = url.searchParams.get('guestId');

    const where: any = { userId: session.userId };

    if (guestId) where.guestId = guestId;

    if (month) {
      const [y, m] = month.split('-').map(Number);
      where.dueDate = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
    }

    if (view === 'upcoming') {
      where.completed = false;
      where.dueDate = { gte: new Date() };
    } else if (view === 'overdue') {
      where.completed = false;
      where.dueDate = { lt: new Date() };
    } else if (view === 'completed') {
      where.completed = true;
    }

    const items = await prisma.actionItem.findMany({
      where,
      include: {
        guest: { select: { id: true, firstName: true, lastName: true, status: true, source: true } },
        invites: { select: { userId: true, userName: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    if (format === 'ics') {
      const icsContent = generateICS(items, session.name);
      return new NextResponse(icsContent, {
        headers: {
          'Content-Type': 'text/calendar; charset=utf-8',
          'Content-Disposition': `attachment; filename="action-items${month ? '-' + month : ''}.ics"`,
        },
      });
    }

    return NextResponse.json({ items });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const body = await request.json();

    // ── Complete / uncomplete ───────────────────────────────
    if (body.action === 'complete' || body.action === 'uncomplete') {
      const item = await prisma.actionItem.findUnique({ where: { id: body.id } });
      if (!item || item.userId !== session.userId) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      const updated = await prisma.actionItem.update({
        where: { id: body.id },
        data: {
          completed: body.action === 'complete',
          completedAt: body.action === 'complete' ? new Date() : null,
        },
      });
      return NextResponse.json({ item: updated });
    }

    // ── Delete ──────────────────────────────────────────────
    if (body.action === 'delete') {
      const item = await prisma.actionItem.findUnique({ where: { id: body.id } });
      if (!item || item.userId !== session.userId) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      // If this is an event, also remove all invite copies
      if (item.isEvent) {
        const invites = await prisma.eventInvite.findMany({ where: { eventItemId: body.id } });
        // Delete attendee copies
        for (const inv of invites) {
          await prisma.actionItem.deleteMany({
            where: {
              userId: inv.userId,
              title: item.title,
              dueDate: item.dueDate,
              isEvent: true,
            },
          });
        }
        await prisma.eventInvite.deleteMany({ where: { eventItemId: body.id } });
      }
      await prisma.actionItem.delete({ where: { id: body.id } });
      return NextResponse.json({ ok: true });
    }

    // ── Create ──────────────────────────────────────────────
    const parsed = actionItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const isEvent: boolean = body.isEvent === true;
    const attendeeIds: string[] = Array.isArray(body.attendeeIds) ? body.attendeeIds : [];

    const item = await prisma.actionItem.create({
      data: {
        userId: session.userId,
        guestId: data.guestId || null,
        actionType: data.actionType,
        customAction: data.customAction || null,
        title: data.title,
        notes: data.notes || null,
        dueDate: new Date(data.dueDate),
        dueTime: data.dueTime || null,
        reminderMinutes: data.reminderMinutes || 60,
        isEvent,
      },
      include: {
        guest: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // ── Create attendee calendar copies ─────────────────────
    if (isEvent && attendeeIds.length > 0) {
      const attendees = await prisma.user.findMany({
        where: { id: { in: attendeeIds } },
        select: { id: true, name: true, email: true },
      });

      // Create EventInvite records
      await prisma.eventInvite.createMany({
        data: attendees.map((a) => ({
          eventItemId: item.id,
          userId: a.id,
          userName: a.name,
        })),
        skipDuplicates: true,
      });

      // Create ActionItem copy for each attendee so it appears in their calendar
      for (const attendee of attendees) {
        await prisma.actionItem.create({
          data: {
            userId: attendee.id,
            actionType: data.actionType,
            customAction: data.customAction || null,
            title: data.title,
            notes: [
              data.notes || '',
              `📨 Invited by: ${session.name}`,
              data.dueTime ? `🕐 Time: ${data.dueTime}` : '',
            ].filter(Boolean).join('\n'),
            dueDate: new Date(data.dueDate),
            dueTime: data.dueTime || null,
            reminderMinutes: data.reminderMinutes || 60,
            isEvent: true,
          },
        });
      }
    }

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return handleAuthError(error);
  }
}

// ── ICS helpers (unchanged) ──────────────────────────────────

function generateICS(items: any[], userName: string): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Church Guest Follow-Up//Action Items//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${userName}'s Action Items`,
  ];

  for (const item of items) {
    const dueDate = new Date(item.dueDate);
    const dtStart = formatICSDate(dueDate, item.dueTime);
    const dtEnd = formatICSDate(
      new Date(dueDate.getTime() + 30 * 60000),
      item.dueTime ? addMinutesToTime(item.dueTime, 30) : undefined
    );
    const guestName = item.guest
      ? `${item.guest.firstName} ${item.guest.lastName}`
      : '';
    const attendeeNames =
      item.invites?.length > 0
        ? `Attendees: ${item.invites.map((i: any) => i.userName).join(', ')}`
        : '';
    const description = [
      guestName ? `Guest/Prospect: ${guestName}` : '',
      attendeeNames,
      item.notes || '',
      item.completed ? 'Status: Completed' : 'Status: Pending',
    ]
      .filter(Boolean)
      .join('\\n');

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${item.id}@church-followup`);
    lines.push(`DTSTAMP:${formatICSDateUTC(new Date())}`);
    lines.push(`DTSTART:${dtStart}`);
    lines.push(`DTEND:${dtEnd}`);
    lines.push(`SUMMARY:${escapeICS(item.title)}`);
    if (description) lines.push(`DESCRIPTION:${escapeICS(description)}`);
    if (item.reminderMinutes > 0) {
      lines.push('BEGIN:VALARM');
      lines.push('ACTION:DISPLAY');
      lines.push(`DESCRIPTION:Reminder: ${item.title}`);
      lines.push(`TRIGGER:-PT${item.reminderMinutes}M`);
      lines.push('END:VALARM');
    }
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function formatICSDate(date: Date, time?: string | null): string {
  if (time) {
    const [h, m] = time.split(':').map(Number);
    date.setHours(h, m, 0, 0);
  }
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function formatICSDateUTC(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function addMinutesToTime(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function escapeICS(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}
