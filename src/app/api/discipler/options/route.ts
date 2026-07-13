import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { DISCIPLER_TRACK_SLUG } from '@/lib/enroll';

// Run 27 — public, read-only. Serves the /discipler landing page: the
// Disciplers Track (id + name, needed to POST to /api/enroll) and its next 3
// upcoming ACTIVE cohorts — same next-3 rule as /api/begin/options and
// /api/become/options. The track is invite-only, so the page never hardcodes
// a cohort: Door 1 silently targets the first cohort returned here (the one
// Pastor Okezie creates in the app UI simply appears), and if none exists
// yet the request lands in the approval queue without a cohort and the team
// assigns one at (or after) approval.

export async function GET() {
  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const [churchSetting, track] = await Promise.all([
      prisma.appSetting.findUnique({ where: { key: 'church_name' } }),
      (prisma as any).track.findFirst({
        where: { slug: DISCIPLER_TRACK_SLUG, isActive: true },
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
    console.error('Discipler options GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
