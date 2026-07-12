import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { WELCOME_TRACK_SLUG } from '@/lib/enroll';

// Run 19 — public, read-only. Serves the /begin page: the Welcome Track's
// active cohorts (for the gentle "When would you like to begin?" question)
// and the church name. Exposes the minimum needed to render the page.
// Run 22 — always the NEXT 3 cohorts: ACTIVE cohorts that start today or
// later (undated cohorts allowed, listed last), soonest first, capped at 3 —
// so the picker never floods when a whole year of cohorts is planned ahead.

export async function GET() {
  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const [churchSetting, track] = await Promise.all([
      prisma.appSetting.findUnique({ where: { key: 'church_name' } }),
      (prisma as any).track.findFirst({
        where: { slug: WELCOME_TRACK_SLUG, isActive: true },
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
    console.error('Begin options GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
