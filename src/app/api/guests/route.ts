import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { Prisma } from '@prisma/client';
import { getPermissionLevel } from '@/lib/roles';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const status = url.searchParams.get('status') || '';
    const volunteerId = url.searchParams.get('volunteerId') || '';
    const service = url.searchParams.get('service') || '';
    const dateFrom = url.searchParams.get('dateFrom') || '';
    const dateTo = url.searchParams.get('dateTo') || '';
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const unassigned = url.searchParams.get('unassigned') === 'true';

    const where: Prisma.GuestWhereInput = {};

    // Get permission level for current user's role
    const customRolesSetting = await prisma.appSetting.findUnique({ where: { key: 'custom_roles' } });
    const permLevel = getPermissionLevel(session.role, customRolesSetting?.value);

    // Volunteer-level users only see their assigned guests
    if (permLevel === 'VOLUNTEER_ACCESS') {
      where.assignedVolunteerId = session.userId;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) where.status = status as any;
    if (volunteerId) where.assignedVolunteerId = volunteerId;
    if (unassigned) where.assignedVolunteerId = null;
    if (service) where.serviceAttended = service;
    if (dateFrom) where.firstVisitDate = { ...(where.firstVisitDate as any || {}), gte: new Date(dateFrom) };
    if (dateTo) where.firstVisitDate = { ...(where.firstVisitDate as any || {}), lte: new Date(dateTo) };

    // Source filter: 'prospect' or 'guest_form'
    const source = url.searchParams.get('source') || '';
    if (source === 'prospect') {
      where.source = 'PROSPECT';
    } else if (source === 'guest_form') {
      where.source = 'GUEST_FORM';
    }

    // Deletion request filter
    const deletionRequested = url.searchParams.get('deletionRequested');
    if (deletionRequested === 'true') {
      where.deletionRequestedAt = { not: null };
    }

    const [guests, total] = await Promise.all([
      prisma.guest.findMany({
        where,
        include: {
          assignedVolunteer: { select: { id: true, name: true, email: true } },
          addedBy: { select: { id: true, name: true } },
          activities: { orderBy: { activityDateTime: 'desc' }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.guest.count({ where }),
    ]);

    return NextResponse.json({ guests, total, page, limit });
  } catch (error) {
    return handleAuthError(error);
  }
}
