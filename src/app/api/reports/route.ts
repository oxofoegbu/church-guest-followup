import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request, ['ADMIN', 'LEADER']);
    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'overview';

    switch (type) {
      case 'overview':
        return NextResponse.json(await getOverview());
      case 'funnel':
        return NextResponse.json(await getFunnel());
      case 'volunteer-performance':
        return NextResponse.json(await getVolunteerPerformance());
      case 'operational':
        return NextResponse.json(await getOperational());
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }
  } catch (error) {
    return handleAuthError(error);
  }
}

async function getOverview() {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const monthAgo = new Date(now.getTime() - 30 * 86400000);

  const [
    totalGuests,
    newGuestsWeek,
    newGuestsMonth,
    totalAssigned,
    totalContacted,
    becomeSignups,
    statusCounts,
    returnDistribution,
  ] = await Promise.all([
    prisma.guest.count(),
    prisma.guest.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.guest.count({ where: { createdAt: { gte: monthAgo } } }),
    prisma.guest.count({ where: { assignedVolunteerId: { not: null } } }),
    prisma.guest.count({ where: { status: { in: ['CONTACTED', 'MEETING_SCHEDULED', 'MET', 'ATTENDING_REGULARLY', 'BECOME_SIGNED_UP'] } } }),
    prisma.guest.count({ where: { becomeSignup: true } }),
    prisma.guest.groupBy({ by: ['status'], _count: true }),
    prisma.guest.groupBy({
      by: ['serviceReturnCount'],
      _count: true,
      orderBy: { serviceReturnCount: 'asc' },
    }),
  ]);

  // % assigned within 24h
  const recentGuests = await prisma.guest.findMany({
    where: { createdAt: { gte: monthAgo } },
    select: { createdAt: true, assignedAt: true },
  });
  const assignedWithin24h = recentGuests.filter(g => {
    if (!g.assignedAt) return false;
    return (g.assignedAt.getTime() - g.createdAt.getTime()) <= 24 * 3600000;
  }).length;
  const pctAssigned24h = recentGuests.length > 0
    ? Math.round((assignedWithin24h / recentGuests.length) * 100) : 0;

  // % contacted within 48h
  const assignedGuests = await prisma.guest.findMany({
    where: { assignedAt: { not: null }, createdAt: { gte: monthAgo } },
    select: { id: true, assignedAt: true },
  });
  let contactedWithin48h = 0;
  for (const g of assignedGuests) {
    const firstActivity = await prisma.followUpActivity.findFirst({
      where: { guestId: g.id },
      orderBy: { activityDateTime: 'asc' },
    });
    if (firstActivity && g.assignedAt &&
      (firstActivity.activityDateTime.getTime() - g.assignedAt.getTime()) <= 48 * 3600000) {
      contactedWithin48h++;
    }
  }
  const pctContacted48h = assignedGuests.length > 0
    ? Math.round((contactedWithin48h / assignedGuests.length) * 100) : 0;

  // Overdue follow-ups
  const overdueCount = await prisma.followUpActivity.count({
    where: {
      nextFollowUpDate: { lt: now },
      guest: { status: { notIn: ['BECOME_SIGNED_UP', 'NOT_INTERESTED', 'INACTIVE'] } },
    },
  });

  // Return stats
  const returned1x = await prisma.guest.count({ where: { serviceReturnCount: { gte: 1 } } });
  const returned3x = await prisma.guest.count({ where: { serviceReturnCount: { gte: 3 } } });
  const returned7x = await prisma.guest.count({ where: { serviceReturnCount: { gte: 7 } } });

  return {
    totalGuests,
    newGuestsWeek,
    newGuestsMonth,
    totalAssigned,
    totalContacted,
    becomeSignups,
    pctAssigned24h,
    pctContacted48h,
    overdueCount,
    returned1x,
    returned3x,
    returned7x,
    pctReturned1x: totalGuests > 0 ? Math.round((returned1x / totalGuests) * 100) : 0,
    pctReturned7x: totalGuests > 0 ? Math.round((returned7x / totalGuests) * 100) : 0,
    statusCounts: Object.fromEntries(statusCounts.map(s => [s.status, s._count])),
    returnDistribution: returnDistribution.map(r => ({
      returns: r.serviceReturnCount,
      count: r._count,
    })),
  };
}

async function getFunnel() {
  const months: { month: string; newGuests: number; assigned: number; contacted: number; becomeSignups: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const start = new Date();
    start.setMonth(start.getMonth() - i, 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    const [newGuests, assigned, contacted, becomeSignups] = await Promise.all([
      prisma.guest.count({ where: { createdAt: { gte: start, lt: end } } }),
      prisma.guest.count({ where: { assignedAt: { gte: start, lt: end } } }),
      prisma.guest.count({
        where: {
          createdAt: { gte: start, lt: end },
          status: { in: ['CONTACTED', 'MEETING_SCHEDULED', 'MET', 'ATTENDING_REGULARLY', 'BECOME_SIGNED_UP'] },
        },
      }),
      prisma.guest.count({ where: { becomeSignupDate: { gte: start, lt: end } } }),
    ]);

    months.push({
      month: start.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      newGuests,
      assigned,
      contacted,
      becomeSignups,
    });
  }

  return { months };
}

async function getVolunteerPerformance() {
  const volunteers = await prisma.user.findMany({
    where: { role: 'VOLUNTEER', active: true },
    select: {
      id: true,
      name: true,
      _count: { select: { assignedGuests: true, activities: true } },
      assignedGuests: {
        select: {
          id: true,
          status: true,
          serviceReturnCount: true,
          becomeSignup: true,
          assignedAt: true,
        },
      },
      activities: {
        select: { activityType: true, activityDateTime: true, guestId: true },
        orderBy: { activityDateTime: 'asc' },
      },
    },
  });

  const result = volunteers.map(vol => {
    const guestCount = vol._count.assignedGuests;
    const activityCount = vol._count.activities;
    const becomeSignups = vol.assignedGuests.filter(g => g.becomeSignup).length;
    const avgReturns = guestCount > 0
      ? (vol.assignedGuests.reduce((sum, g) => sum + g.serviceReturnCount, 0) / guestCount).toFixed(1)
      : '0';
    const guests7Returns = vol.assignedGuests.filter(g => g.serviceReturnCount >= 7).length;

    // Overdue follow-ups count would require another query; simplified here
    const activityByType: Record<string, number> = {};
    vol.activities.forEach(a => {
      activityByType[a.activityType] = (activityByType[a.activityType] || 0) + 1;
    });

    return {
      id: vol.id,
      name: vol.name,
      guestCount,
      activityCount,
      becomeSignups,
      avgReturns: parseFloat(avgReturns),
      guests7Returns,
      activityByType,
    };
  });

  return { volunteers: result };
}

async function getOperational() {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 3600000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);

  const [unassigned24h, overdueFollowUps, stalledGuests, nearTarget] = await Promise.all([
    // Unassigned guests older than 24h
    prisma.guest.findMany({
      where: { assignedVolunteerId: null, createdAt: { lt: dayAgo } },
      select: { id: true, firstName: true, lastName: true, createdAt: true, serviceAttended: true },
      orderBy: { createdAt: 'asc' },
    }),
    // Overdue follow-ups
    prisma.followUpActivity.findMany({
      where: {
        nextFollowUpDate: { lt: now },
        guest: { status: { notIn: ['BECOME_SIGNED_UP', 'NOT_INTERESTED', 'INACTIVE'] } },
      },
      include: {
        guest: { select: { id: true, firstName: true, lastName: true, status: true } },
        performedBy: { select: { name: true } },
      },
      orderBy: { nextFollowUpDate: 'asc' },
    }),
    // Stalled: assigned but no activity in 7+ days
    prisma.guest.findMany({
      where: {
        assignedVolunteerId: { not: null },
        status: { notIn: ['BECOME_SIGNED_UP', 'NOT_INTERESTED', 'INACTIVE'] },
        activities: { none: { activityDateTime: { gte: sevenDaysAgo } } },
      },
      select: {
        id: true, firstName: true, lastName: true, status: true,
        assignedVolunteer: { select: { name: true } },
        activities: { orderBy: { activityDateTime: 'desc' }, take: 1 },
      },
    }),
    // Near target (5/7 or 6/7)
    prisma.guest.findMany({
      where: { serviceReturnCount: { in: [5, 6] } },
      select: {
        id: true, firstName: true, lastName: true,
        serviceReturnCount: true,
        assignedVolunteer: { select: { name: true } },
      },
    }),
  ]);

  return {
    unassigned24h,
    overdueFollowUps,
    stalledGuests,
    nearTarget,
  };
}
