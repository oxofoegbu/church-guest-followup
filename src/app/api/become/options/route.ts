import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { BECOME_TRACK_SLUG } from '@/lib/enroll';

// Run 24 — public, read-only. Serves the /become landing page: the BECOME®
// track (id + name, needed to POST to /api/enroll) and its next 3 upcoming
// ACTIVE cohorts — same next-3 rule as /api/begin/options (starting today
// or later, undated last, soonest first, capped at 3), so the picker never
// floods when a whole year of cohorts is planned ahead.

export async function GET() {
  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const [churchSetting, track] = await Promise.all([
      prisma.appSetting.findUnique({ where: { key: 'church_name' } }),
      (prisma as any).track.findFirst({
        where: { slug: BECOME_TRACK_SLUG, isActive: true },
        select: {
          id: true,
          name: true,
          cohorts: {
            where: {
              status: 'ACTIVE',
              OR: [{ startDate: { gte: today } }, { startDate: null }],
            },
            orderBy: [{ startDate: { sort: 'asc', nulls: 'last' } }, { name: 'asc' }],
            take: 3,
            select: { id: true, name: true, meetingDay: true, meetingTime: true, startDate: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      churchName: churchSetting?.value || 'Grace Life Center',
      track: track || null,
    });
  } catch (error) {
    console.error('Become options GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
