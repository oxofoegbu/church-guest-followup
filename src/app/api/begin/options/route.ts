import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { WELCOME_TRACK_SLUG } from '@/lib/enroll';

// Run 19 — public, read-only. Serves the /begin page: the Welcome Track's
// active cohorts (for the gentle "When would you like to begin?" question)
// and the church name. Exposes the minimum needed to render the page.

export async function GET() {
  try {
    const [churchSetting, track] = await Promise.all([
      prisma.appSetting.findUnique({ where: { key: 'church_name' } }),
      (prisma as any).track.findFirst({
        where: { slug: WELCOME_TRACK_SLUG, isActive: true },
        select: {
          id: true,
          name: true,
          cohorts: {
            where: { status: 'ACTIVE' },
            orderBy: [{ startDate: 'asc' }, { name: 'asc' }],
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
