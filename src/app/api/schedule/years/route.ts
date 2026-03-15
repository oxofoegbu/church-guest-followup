import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';

function getSundaysForYear(year: number): Date[] {
  const sundays: Date[] = [];
  const d = new Date(Date.UTC(year, 0, 1));
  while (d.getUTCDay() !== 0) d.setUTCDate(d.getUTCDate() + 1);
  while (d.getUTCFullYear() === year) {
    sundays.push(new Date(d));
    d.setUTCDate(d.getUTCDate() + 7);
  }
  return sundays;
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get('includeArchived') === 'true';

    const years = await prisma.scheduleYear.findMany({
      where: includeArchived ? {} : undefined,
      orderBy: { year: 'desc' },
    });

    const withCounts = await Promise.all(
      years.map(async (y) => {
        const sundayCount = await prisma.serviceSchedule.count({
          where: {
            date: {
              gte: new Date(`${y.year}-01-01`),
              lte: new Date(`${y.year}-12-31`),
            },
          },
        });
        return { ...y, sundayCount };
      })
    );

    return NextResponse.json(withCounts);
  } catch (error: any) {
    if (error?.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (!['ADMIN', 'SENIOR_LEADER'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { year, label, theme } = await request.json();

    if (!year || year < 2020 || year > 2100) {
      return NextResponse.json({ error: 'Invalid year' }, { status: 400 });
    }

    const existing = await prisma.scheduleYear.findUnique({ where: { year } });
    if (existing) {
      return NextResponse.json({ error: `Schedule for ${year} already exists` }, { status: 400 });
    }

    const scheduleYear = await prisma.scheduleYear.create({
      data: {
        year,
        label: label || `${year} Sunday Schedule`,
        theme: theme || null,
        archived: false,
      },
    });

    // Auto-generate all Sundays for this year with blank topics
    const sundays = getSundaysForYear(year);
    await prisma.serviceSchedule.createMany({
      data: sundays.map((date) => ({
        date,
        topic: 'TBD — Topic to be assigned',
        monthTheme: null,
        speakerName: null,
        serviceCoordinatorName: null,
        propheticPrayerName: null,
        worshipLeaderName: null,
      })),
      skipDuplicates: true,
    });

    return NextResponse.json(
      { scheduleYear, sundaysCreated: sundays.length },
      { status: 201 }
    );
  } catch (error: any) {
    if (error?.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('[schedule/years POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (!['ADMIN', 'SENIOR_LEADER'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { year, archived, label, theme } = body;

    const data: any = {};
    if (archived !== undefined) data.archived = archived;
    if (label) data.label = label;
    if (theme !== undefined) data.theme = theme;

    const updated = await prisma.scheduleYear.update({ where: { year }, data });
    return NextResponse.json(updated);
  } catch (error: any) {
    if (error?.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
