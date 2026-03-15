import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || '2026');

    const [scheduleYear, schedules] = await Promise.all([
      prisma.scheduleYear.findUnique({ where: { year } }),
      prisma.serviceSchedule.findMany({
        where: {
          date: { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31`) },
        },
        select: {
          id: true, date: true, monthTheme: true, topic: true,
          speakerName: true, serviceCoordinatorName: true,
          propheticPrayerName: true, worshipLeaderName: true,
          speaker:            { select: { name: true } },
          serviceCoordinator: { select: { name: true } },
          propheticPrayer:    { select: { name: true } },
          worshipLeader:      { select: { name: true } },
          notes: true,
        },
        orderBy: { date: 'asc' },
      }),
    ]);

    if (!scheduleYear) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Cache for 5 minutes
    return NextResponse.json(
      { scheduleYear, schedules },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' } }
    );
  } catch (error) {
    console.error('[public schedule]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
