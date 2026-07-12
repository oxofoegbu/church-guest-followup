// Run 21 — put a cohort's meetings on the Calendar (and take them off).
// Run 22 — cohorts with a custom sessionPlan get one occurrence per SESSION
// (on its exact date, at its own time, titled with the weeks it covers)
// instead of one occurrence per CORE week.
//
// POST   /api/tracks/[id]/cohorts/[cohortId]/calendar — create the series
// DELETE /api/tracks/[id]/cohorts/[cohortId]/calendar — remove the series
//
// Weekly cohorts (no sessionPlan): one occurrence per CORE week of the track
// (Run 16 rule), starting from the cohort's start date on its meeting day.
// The series is owned by the facilitator (or the leader who clicks the
// button when no facilitator is set) and every enrolled ACTIVE/PAUSED
// participant who is a member (User) gets calendar copies of each occurrence
// — guests have no calendar. All rows carry recurrenceParentId = the parent
// item, so removal is one deleteMany. TrackCohort.calendarEventId remembers
// the parent (and blocks double-creation).

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { readSessionPlan, weeksLabel } from '@/lib/cohort-sessions';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MAX_WEEKS = 52;

function isCoreModule(m: { kind?: string | null }): boolean {
  return !m.kind || m.kind === 'CORE';
}

async function loadCohort(trackId: string, cohortId: string) {
  return (prisma as any).trackCohort.findFirst({
    where: { id: cohortId, trackId },
    include: {
      track: { select: { id: true, name: true, modules: { select: { id: true, kind: true } } } },
      facilitator: { select: { id: true, name: true } },
      enrollments: {
        where: { status: { in: ['ACTIVE', 'PAUSED'] } },
        select: { user: { select: { id: true, name: true } } },
      },
    },
  });
}

type Occurrence = { date: Date; dueTime: string | null; title: string; notes: string };

// POST — create the meeting series
export async function POST(request: NextRequest, { params }: { params: { id: string; cohortId: string } }) {
  try {
    const session = await requireAuth(request, ['LEADER']);
    const cohort = await loadCohort(params.id, params.cohortId);
    if (!cohort) return NextResponse.json({ error: 'Cohort not found' }, { status: 404 });

    // Already on the calendar? (Tolerate a stale pointer whose parent item
    // was deleted from the Calendar page — clean up and recreate.)
    if (cohort.calendarEventId) {
      const parent = await prisma.actionItem.findUnique({ where: { id: cohort.calendarEventId } });
      if (parent) {
        return NextResponse.json(
          { error: 'This cohort is already on the calendar. Remove the existing meetings first.' },
          { status: 400 },
        );
      }
      await (prisma.actionItem.deleteMany as any)({ where: { recurrenceParentId: cohort.calendarEventId } });
      await (prisma as any).eventInvite.deleteMany({ where: { eventItemId: cohort.calendarEventId } }).catch(() => {});
    }

    const plan = readSessionPlan(cohort.sessionPlan);
    const isCustom = plan.length > 0;

    if (!isCustom && !cohort.startDate) {
      return NextResponse.json(
        { error: 'Set a start date on the cohort first (✏️ edit the cohort).' },
        { status: 400 },
      );
    }

    const baseTitle = `🌱 ${cohort.name} — ${cohort.track.name}`;
    const baseNotes = [
      `Cohort meeting for ${cohort.name} (${cohort.track.name}).`,
      cohort.meetingDay ? `📅 ${cohort.meetingDay}${cohort.meetingTime ? ` at ${cohort.meetingTime}` : ''}` : '',
      cohort.facilitator ? `🧭 Facilitator: ${cohort.facilitator.name}` : '',
    ].filter(Boolean).join('\n');

    const occurrences: Occurrence[] = [];

    if (isCustom) {
      // Run 22 — one occurrence per planned session, on its exact date.
      // Dates are kept at UTC midnight like every other calendar item; the
      // session's own time (falling back to the cohort meeting time) rides
      // in dueTime.
      for (let i = 0; i < plan.length; i++) {
        const s = plan[i];
        const covered = weeksLabel(s.weeks);
        const extras = [
          s.label ? `🏷️ ${s.label}` : '',
          covered ? `📖 Covers ${covered}` : '',
        ].filter(Boolean).join('\n');
        occurrences.push({
          date: new Date(`${s.date}T00:00:00.000Z`),
          dueTime: s.time || cohort.meetingTime || null,
          title: covered ? `${baseTitle} (${covered})` : baseTitle,
          notes: extras ? `${baseNotes}\n${extras}` : baseNotes,
        });
      }
    } else {
      // Run 21 — weekly rhythm: first occurrence is the first day >=
      // startDate that falls on meetingDay (or the start date itself when
      // no meeting day is set), then one per CORE week.
      const first = new Date(cohort.startDate);
      first.setUTCHours(0, 0, 0, 0);
      const targetDow = cohort.meetingDay ? WEEKDAYS.indexOf(cohort.meetingDay) : -1;
      if (targetDow >= 0) {
        while (first.getUTCDay() !== targetDow) first.setUTCDate(first.getUTCDate() + 1);
      }
      const coreWeeks = cohort.track.modules.filter(isCoreModule).length;
      const weeks = Math.min(MAX_WEEKS, Math.max(1, coreWeeks || 12));
      for (let i = 0; i < weeks; i++) {
        occurrences.push({
          date: new Date(first.getTime() + i * 7 * 86400000),
          dueTime: cohort.meetingTime || null,
          title: baseTitle,
          notes: baseNotes,
        });
      }
    }

    const endDate = occurrences[occurrences.length - 1].date;
    const ownerId = cohort.facilitator?.id || session.userId;

    const baseData = {
      actionType: 'OTHER',
      customAction: 'Cohort Meeting',
      reminderMinutes: 60,
      isEvent: true,
      recurrence: isCustom ? 'CUSTOM' : 'WEEKLY',
      recurrenceEndDate: endDate,
    };

    // Parent (first occurrence) on the owner's calendar
    const parentItem = await (prisma.actionItem.create as any)({
      data: {
        ...baseData, userId: ownerId,
        title: occurrences[0].title, notes: occurrences[0].notes,
        dueDate: occurrences[0].date, dueTime: occurrences[0].dueTime,
      },
    });
    await (prisma.actionItem.update as any)({
      where: { id: parentItem.id },
      data: { recurrenceParentId: parentItem.id },
    });

    // Remaining occurrences for the owner
    if (occurrences.length > 1) {
      await (prisma.actionItem.createMany as any)({
        data: occurrences.slice(1).map(o => ({
          ...baseData, userId: ownerId,
          title: o.title, notes: o.notes, dueDate: o.date, dueTime: o.dueTime,
          recurrenceParentId: parentItem.id,
        })),
      });
    }

    // Attendee copies: enrolled members (Users) other than the owner get the
    // whole series too; EventInvite rows record them on the parent.
    const attendees: { id: string; name: string }[] = [];
    const seen = new Set<string>([ownerId]);
    for (const e of cohort.enrollments) {
      if (e.user && !seen.has(e.user.id)) { seen.add(e.user.id); attendees.push(e.user); }
    }
    if (attendees.length > 0) {
      await (prisma as any).eventInvite.createMany({
        data: attendees.map(a => ({ eventItemId: parentItem.id, userId: a.id, userName: a.name })),
        skipDuplicates: true,
      });
      const addedBy = `📨 Cohort meeting — added by ${session.name}`;
      await (prisma.actionItem.createMany as any)({
        data: attendees.flatMap(a =>
          occurrences.map(o => ({
            ...baseData, userId: a.id,
            title: o.title, notes: `${o.notes}\n${addedBy}`, dueDate: o.date, dueTime: o.dueTime,
            recurrenceParentId: parentItem.id,
          })),
        ),
      });
    }

    await (prisma as any).trackCohort.update({
      where: { id: cohort.id },
      data: { calendarEventId: parentItem.id },
    });

    await logAudit({
      action: 'TRACK_COHORT_CALENDAR_ADDED', category: 'TRACK',
      description: `Cohort "${cohort.name}" (${cohort.track.name}): ${occurrences.length} ${isCustom ? 'planned session(s)' : 'weekly meeting(s)'} added to the Calendar for ${1 + attendees.length} people`,
      userId: session.userId, userName: session.name,
      targetId: cohort.id, targetType: 'TRACK_COHORT', targetName: cohort.name,
      metadata: { calendarEventId: parentItem.id, occurrences: occurrences.length, attendees: attendees.length, ownerId, custom: isCustom },
    });

    return NextResponse.json({
      ok: true,
      calendarEventId: parentItem.id,
      occurrences: occurrences.length,
      attendees: attendees.length,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

// DELETE — remove the whole series (owner rows + attendee copies + invites)
export async function DELETE(request: NextRequest, { params }: { params: { id: string; cohortId: string } }) {
  try {
    const session = await requireAuth(request, ['LEADER']);
    const cohort = await loadCohort(params.id, params.cohortId);
    if (!cohort) return NextResponse.json({ error: 'Cohort not found' }, { status: 404 });
    if (!cohort.calendarEventId) {
      return NextResponse.json({ error: 'This cohort has no calendar meetings to remove.' }, { status: 400 });
    }

    await (prisma as any).eventInvite.deleteMany({ where: { eventItemId: cohort.calendarEventId } }).catch(() => {});
    const deleted = await (prisma.actionItem.deleteMany as any)({
      where: { OR: [{ id: cohort.calendarEventId }, { recurrenceParentId: cohort.calendarEventId }] },
    });
    await (prisma as any).trackCohort.update({
      where: { id: cohort.id },
      data: { calendarEventId: null },
    });

    await logAudit({
      action: 'TRACK_COHORT_CALENDAR_REMOVED', category: 'TRACK',
      description: `Cohort "${cohort.name}" (${cohort.track.name}): meeting series removed from the Calendar (${deleted.count} item(s))`,
      userId: session.userId, userName: session.name,
      targetId: cohort.id, targetType: 'TRACK_COHORT', targetName: cohort.name,
      metadata: { calendarEventId: cohort.calendarEventId, deleted: deleted.count },
    });

    return NextResponse.json({ ok: true, deleted: deleted.count });
  } catch (error) {
    return handleAuthError(error);
  }
}
