import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { SELF_ENROLL_TRACK_SLUGS } from '@/lib/enroll';

// Run 13 — public, read-only. Serves the /enroll page: the tracks that are
// open for self-enrollment (Become & Leaders Track) with their active
// cohorts. Exposes the minimum needed to render the form.

export async function GET() {
  try {
    const [churchSetting, tracks] = await Promise.all([
      prisma.appSetting.findUnique({ where: { key: 'church_name' } }),
      (prisma as any).track.findMany({
        where: { slug: { in: SELF_ENROLL_TRACK_SLUGS }, isActive: true },
        orderBy: { ordering: 'asc' },
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          milestoneLabel: true,
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
      tracks,
    });
  } catch (error) {
    console.error('Enroll options GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
