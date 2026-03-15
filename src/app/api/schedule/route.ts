import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || '2026');

    const schedules = await prisma.serviceSchedule.findMany({
      where: {
        date: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`),
        },
      },
      include: {
        speaker:            { select: { id: true, name: true, email: true, phone: true } },
        serviceCoordinator: { select: { id: true, name: true, email: true, phone: true } },
        propheticPrayer:    { select: { id: true, name: true, email: true, phone: true } },
        worshipLeader:      { select: { id: true, name: true, email: true, phone: true } },
      },
      orderBy: { date: 'asc' },
    });

    return NextResponse.json(schedules);
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[schedule GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (!['ADMIN', 'SENIOR_LEADER'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const body = await request.json();
    const schedule = await prisma.serviceSchedule.create({ data: body });
    return NextResponse.json(schedule, { status: 201 });
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[schedule POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
