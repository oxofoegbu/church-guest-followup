import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { sendAnnouncementEmails } from '@/lib/enrollment-notifications';

// Run 20 — announcements.
// GET  /api/announcements?cohortId=... | ?enrollmentId=...   (leader-level)
// POST /api/announcements { cohortId | enrollmentId, title?, body }
//   Creates the announcement and ALWAYS emails the participants — every
//   ACTIVE/PAUSED enrollment in the cohort (or the single enrollee) that has
//   an email on file. Sending is fire-safe: the announcement still posts (and
//   shows in the portal/My Tracks) even if some or all emails fail.

const MAX_TITLE = 140;
const MAX_BODY = 4000;

const SELECT = {
  id: true, title: true, body: true, createdAt: true, emailedAt: true,
  cohortId: true, enrollmentId: true,
  author: { select: { id: true, name: true } },
};

function participantInfo(e: any): { firstName: string; email: string | null } {
  if (e.guest) return { firstName: e.guest.firstName, email: e.guest.email || null };
  const name: string = e.user?.name || '';
  return { firstName: name.split(' ')[0] || name, email: e.user?.email || null };
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, ['LEADER']);
    const url = new URL(request.url);
    const cohortId = url.searchParams.get('cohortId');
    const enrollmentId = url.searchParams.get('enrollmentId');
    if ((!cohortId && !enrollmentId) || (cohortId && enrollmentId)) {
      return NextResponse.json({ error: 'Provide exactly one of cohortId or enrollmentId' }, { status: 400 });
    }
    const announcements = await (prisma as any).trackAnnouncement.findMany({
      where: cohortId ? { cohortId } : { enrollmentId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: SELECT,
    });
    return NextResponse.json({ announcements });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request, ['LEADER']);
    const { cohortId, enrollmentId, title, body } = await request.json();

    if ((!cohortId && !enrollmentId) || (cohortId && enrollmentId)) {
      return NextResponse.json({ error: 'Provide exactly one target: a cohort OR an enrollment' }, { status: 400 });
    }
    if (typeof body !== 'string' || !body.trim()) {
      return NextResponse.json({ error: 'The announcement text is required' }, { status: 400 });
    }
    if (body.length > MAX_BODY || (title && String(title).length > MAX_TITLE)) {
      return NextResponse.json({ error: 'The announcement is too long' }, { status: 400 });
    }

    // Resolve the target + the recipients
    let trackName = '';
    let cohortName: string | null = null;
    let targetLabel = '';
    let recipients: { firstName: string; email: string; portalToken: string }[] = [];

    if (cohortId) {
      const cohort = await (prisma as any).trackCohort.findUnique({
        where: { id: cohortId },
        select: {
          id: true, name: true,
          track: { select: { name: true } },
          enrollments: {
            where: { status: { in: ['ACTIVE', 'PAUSED'] } },
            select: {
              portalToken: true,
              guest: { select: { firstName: true, email: true } },
              user: { select: { name: true, email: true } },
            },
          },
        },
      });
      if (!cohort) return NextResponse.json({ error: 'Cohort not found' }, { status: 404 });
      trackName = cohort.track.name;
      cohortName = cohort.name;
      targetLabel = `cohort "${cohort.name}"`;
      recipients = cohort.enrollments
        .map((e: any) => ({ ...participantInfo(e), portalToken: e.portalToken }))
        .filter((r: any) => !!r.email) as any;
    } else {
      const enrollment = await (prisma as any).trackEnrollment.findUnique({
        where: { id: enrollmentId },
        select: {
          id: true, portalToken: true,
          track: { select: { name: true } },
          guest: { select: { firstName: true, lastName: true, email: true } },
          user: { select: { name: true, email: true } },
        },
      });
      if (!enrollment) return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
      trackName = enrollment.track.name;
      const info = participantInfo(enrollment);
      targetLabel = enrollment.guest
        ? `${enrollment.guest.firstName} ${enrollment.guest.lastName}`.trim()
        : enrollment.user?.name || 'participant';
      if (info.email) {
        recipients = [{ firstName: info.firstName, email: info.email, portalToken: enrollment.portalToken }];
      }
    }

    const announcement = await (prisma as any).trackAnnouncement.create({
      data: {
        cohortId: cohortId || null,
        enrollmentId: enrollmentId || null,
        title: title?.trim() || null,
        body: body.trim(),
        authorUserId: session.userId,
      },
      select: SELECT,
    });

    // Always email — fire-safe, email only (Whapi stays parked)
    let sent = 0;
    if (recipients.length > 0) {
      sent = await sendAnnouncementEmails({
        trackName,
        cohortName,
        title: announcement.title,
        body: announcement.body,
        authorName: session.name || null,
        recipients,
      });
      if (sent > 0) {
        await (prisma as any).trackAnnouncement.update({
          where: { id: announcement.id },
          data: { emailedAt: new Date() },
        }).catch(() => {});
      }
    }

    await logAudit({
      action: 'TRACK_ANNOUNCEMENT', category: 'TRACK',
      description: `Announcement posted to ${targetLabel} (${trackName}) — emailed ${sent} participant${sent === 1 ? '' : 's'}`,
      userId: session.userId, userName: session.name,
      targetId: announcement.id, targetType: 'TRACK_ANNOUNCEMENT', targetName: targetLabel,
      metadata: { cohortId: cohortId || null, enrollmentId: enrollmentId || null },
    });

    return NextResponse.json({ announcement, emailed: sent, recipients: recipients.length }, { status: 201 });
  } catch (error) {
    return handleAuthError(error);
  }
}
