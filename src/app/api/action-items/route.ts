import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { actionItemSchema } from '@/lib/utils';

// ── Recurrence helpers ───────────────────────────────────────────────────────

type RecurrenceType = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'CUSTOM';

function getNextDate(current: Date, recurrence: RecurrenceType, interval?: number): Date {
  const d = new Date(current);
  switch (recurrence) {
    case 'DAILY':     d.setUTCDate(d.getUTCDate() + 1);  break;
    case 'WEEKLY':    d.setUTCDate(d.getUTCDate() + 7);  break;
    case 'BIWEEKLY':  d.setUTCDate(d.getUTCDate() + 14); break;
    case 'MONTHLY':   d.setUTCMonth(d.getUTCMonth() + 1); break;
    case 'QUARTERLY': d.setUTCMonth(d.getUTCMonth() + 3); break;
    case 'CUSTOM':    d.setUTCDate(d.getUTCDate() + (interval || 7)); break;
  }
  return d;
}

function generateOccurrences(
  startDate: Date,
  recurrence: RecurrenceType,
  endDate: Date,
  interval?: number,
  maxInstances = 104
): Date[] {
  const dates: Date[] = [];
  let current = new Date(startDate);
  while (current <= endDate && dates.length < maxInstances) {
    dates.push(new Date(current));
    current = getNextDate(current, recurrence, interval);
  }
  return dates;
}

// ── GET ──────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const url = new URL(request.url);
    const month    = url.searchParams.get('month');
    const format   = url.searchParams.get('format');
    const view     = url.searchParams.get('view');
    const guestId  = url.searchParams.get('guestId');

    const where: any = { userId: session.userId };
    if (guestId) where.guestId = guestId;

    if (month) {
      const [y, m] = month.split('-').map(Number);
      where.dueDate = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
    }
    if (view === 'upcoming')  { where.completed = false; where.dueDate = { gte: new Date() }; }
    if (view === 'overdue')   { where.completed = false; where.dueDate = { lt:  new Date() }; }
    if (view === 'completed') { where.completed = true; }

    const items = await prisma.actionItem.findMany({
      where,
      include: {
        guest:   { select: { id: true, firstName: true, lastName: true, status: true, source: true } },
        invites: { select: { userId: true, userName: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    if (format === 'ics') {
      return new NextResponse(generateICS(items, session.name), {
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

// ── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const body = await request.json();

    // ── Complete/uncomplete ──────────────────────────────────────────────────
    if (body.action === 'complete' || body.action === 'uncomplete') {
      const item = await prisma.actionItem.findUnique({ where: { id: body.id } });
      if (!item || item.userId !== session.userId) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      const updated = await prisma.actionItem.update({
        where: { id: body.id },
        data: { completed: body.action === 'complete', completedAt: body.action === 'complete' ? new Date() : null },
      });
      return NextResponse.json({ item: updated });
    }

    // ── Delete ───────────────────────────────────────────────────────────────
    if (body.action === 'delete') {
      const item = await prisma.actionItem.findUnique({ where: { id: body.id } });
      if (!item || item.userId !== session.userId) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }

      // Delete all in series?
      if (body.deleteAll && (item as any).recurrenceParentId) {
        await prisma.actionItem.deleteMany({
          where: { recurrenceParentId: (item as any).recurrenceParentId, userId: session.userId },
        });
        // also delete the parent itself if it wasn't caught above
        await prisma.actionItem.deleteMany({
          where: { id: item.recurrenceParentId, userId: session.userId },
        });
        return NextResponse.json({ ok: true, deleted: 'series' });
      }

      // Delete event copies for attendees
      if (item.isEvent) {
        const invites = await prisma.eventInvite.findMany({ where: { eventItemId: body.id } });
        for (const inv of invites) {
          await prisma.actionItem.deleteMany({
            where: { userId: inv.userId, title: item.title, dueDate: item.dueDate, isEvent: true },
          });
        }
        await prisma.eventInvite.deleteMany({ where: { eventItemId: body.id } });
      }

      await prisma.actionItem.delete({ where: { id: body.id } });
      return NextResponse.json({ ok: true });
    }

    // ── Create ───────────────────────────────────────────────────────────────
    const parsed = actionItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const data        = parsed.data;
    const isEvent     = body.isEvent === true;
    const attendeeIds = Array.isArray(body.attendeeIds) ? body.attendeeIds : [];

    // Recurrence
    const recurrence: RecurrenceType | null = body.recurrence || null;
    const recurrenceInterval: number | null = recurrence === 'CUSTOM' ? (body.recurrenceInterval || 7) : null;
    const recurrenceEndDate: Date | null    = body.recurrenceEndDate ? new Date(body.recurrenceEndDate) : null;

    // Create first instance
    const firstItem = await prisma.actionItem.create({
      data: {
        userId:            session.userId,
        guestId:           data.guestId || null,
        actionType:        data.actionType,
        customAction:      data.customAction || null,
        title:             data.title,
        notes:             data.notes || null,
        dueDate:           new Date(data.dueDate),
        dueTime:           data.dueTime || null,
        reminderMinutes:   data.reminderMinutes || 60,
        isEvent,
        recurrence:        recurrence || null,
        recurrenceInterval,
        recurrenceEndDate,
      },
      include: { guest: { select: { id: true, firstName: true, lastName: true } } },
    });

    // Set recurrenceParentId on itself (marks it as the root of the series)
    if (recurrence && recurrenceEndDate) {
      await prisma.actionItem.update({
        where: { id: firstItem.id },
        data: { recurrenceParentId: firstItem.id },
      });

      // Generate remaining occurrences
      const startDate = new Date(data.dueDate);
      const occurrences = generateOccurrences(
        getNextDate(startDate, recurrence, recurrenceInterval ?? undefined),
        recurrence,
        recurrenceEndDate,
        recurrenceInterval ?? undefined,
      );

      if (occurrences.length > 0) {
        await prisma.actionItem.createMany({
          data: occurrences.map(date => ({
            userId:            session.userId,
            guestId:           data.guestId || null,
            actionType:        data.actionType,
            customAction:      data.customAction || null,
            title:             data.title,
            notes:             data.notes || null,
            dueDate:           date,
            dueTime:           data.dueTime || null,
            reminderMinutes:   data.reminderMinutes || 60,
            isEvent,
            recurrence:        recurrence || null,
            recurrenceInterval,
            recurrenceEndDate,
            recurrenceParentId: firstItem.id,
          })),
        });
      }
    }

    // Event attendees: create invite records + calendar copies for each attendee
    if (isEvent && attendeeIds.length > 0) {
      const attendees = await prisma.user.findMany({
        where: { id: { in: attendeeIds } },
        select: { id: true, name: true, email: true },
      });

      await prisma.eventInvite.createMany({
        data: attendees.map(a => ({ eventItemId: firstItem.id, userId: a.id, userName: a.name })),
        skipDuplicates: true,
      });

      for (const attendee of attendees) {
        await prisma.actionItem.create({
          data: {
            userId:      attendee.id,
            actionType:  data.actionType,
            customAction: data.customAction || null,
            title:       data.title,
            notes:       [data.notes || '', `📨 Invited by: ${session.name}`, data.dueTime ? `🕐 Time: ${data.dueTime}` : ''].filter(Boolean).join('\n'),
            dueDate:     new Date(data.dueDate),
            dueTime:     data.dueTime || null,
            reminderMinutes: data.reminderMinutes || 60,
            isEvent:     true,
          },
        });
      }
    }

    return NextResponse.json({ item: firstItem }, { status: 201 });
  } catch (error) {
    return handleAuthError(error);
  }
}

// ── ICS generator ────────────────────────────────────────────────────────────

function generateICS(items: any[], userName: string): string {
  const lines = [
    'BEGIN:VCALENDAR','VERSION:2.0',
    'PRODID:-//Church Guest Follow-Up//Action Items//EN',
    'CALSCALE:GREGORIAN','METHOD:PUBLISH',
    `X-WR-CALNAME:${userName}'s Action Items`,
  ];

  for (const item of items) {
    const dueDate = new Date(item.dueDate);
    const dtStart = formatICSDate(dueDate, item.dueTime);
    const dtEnd   = formatICSDate(new Date(dueDate.getTime() + 30 * 60000), item.dueTime ? addMins(item.dueTime, 30) : undefined);
    const guestName    = item.guest ? `${item.guest.firstName} ${item.guest.lastName}` : '';
    const attendeeStr  = item.invites?.length > 0 ? `Attendees: ${item.invites.map((i: any) => i.userName).join(', ')}` : '';
    const description  = [guestName ? `Guest/Prospect: ${guestName}` : '', attendeeStr, item.notes || '', item.completed ? 'Status: Completed' : 'Status: Pending'].filter(Boolean).join('\\n');

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${item.id}@church-followup`);
    lines.push(`DTSTAMP:${formatICSDate(new Date())}`);
    lines.push(`DTSTART:${dtStart}`);
    lines.push(`DTEND:${dtEnd}`);
    lines.push(`SUMMARY:${esc(item.title)}`);
    if (description) lines.push(`DESCRIPTION:${esc(description)}`);
    if (item.reminderMinutes > 0) {
      lines.push('BEGIN:VALARM','ACTION:DISPLAY',`DESCRIPTION:Reminder: ${item.title}`,`TRIGGER:-PT${item.reminderMinutes}M`,'END:VALARM');
    }
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function formatICSDate(date: Date, time?: string | null): string {
  if (time) { const [h,m] = time.split(':').map(Number); date.setHours(h,m,0,0); }
  return date.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
}
function addMins(time: string, mins: number): string {
  const [h,m] = time.split(':').map(Number); const t = h*60+m+mins;
  return `${String(Math.floor(t/60)%24).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;
}
function esc(t: string): string {
  return t.replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\n/g,'\\n');
}
