import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { activitySchema } from '@/lib/utils';
import { getPermissionLevel } from '@/lib/roles';

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const body = await request.json();
    const parsed = activitySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    const guest = await prisma.guest.findUnique({ where: { id: data.guestId } });
    if (!guest) {
      return NextResponse.json({ error: 'Guest not found' }, { status: 404 });
    }

    const customRolesSetting = await prisma.appSetting.findUnique({ where: { key: 'custom_roles' } });
    const permLevel = getPermissionLevel(session.role, customRolesSetting?.value);

    if (permLevel === 'VOLUNTEER_ACCESS' && guest.assignedVolunteerId !== session.userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (guest.status === 'NOT_INTERESTED' && permLevel !== 'ADMIN_ACCESS') {
      return NextResponse.json({ error: 'Guest is marked Do Not Contact' }, { status: 403 });
    }

    // Leader-level users can only add PASTORAL_MEETING type
    if (permLevel === 'LEADER_ACCESS' && data.activityType !== 'PASTORAL_MEETING') {
      return NextResponse.json({ error: 'Leaders can only log Pastoral Meeting activities' }, { status: 403 });
    }

    const activity = await prisma.followUpActivity.create({
      data: {
        guestId: data.guestId,
        performedByUserId: session.userId,
        activityType: data.activityType as any,
        activityDateTime: data.activityDateTime ? new Date(data.activityDateTime) : new Date(),
        outcome: data.outcome || null,
        notes: data.notes || null,
        nextFollowUpDate: data.nextFollowUpDate ? new Date(data.nextFollowUpDate) : null,
      },
      include: { performedBy: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ activity }, { status: 201 });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const url = new URL(request.url);
    const guestId = url.searchParams.get('guestId');

    if (!guestId) {
      return NextResponse.json({ error: 'guestId is required' }, { status: 400 });
    }

    const customRolesSetting = await prisma.appSetting.findUnique({ where: { key: 'custom_roles' } });
    const permLevel = getPermissionLevel(session.role, customRolesSetting?.value);

    if (permLevel === 'VOLUNTEER_ACCESS') {
      const guest = await prisma.guest.findUnique({ where: { id: guestId } });
      if (!guest || guest.assignedVolunteerId !== session.userId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    const activities = await prisma.followUpActivity.findMany({
      where: { guestId },
      include: { performedBy: { select: { id: true, name: true } } },
      orderBy: { activityDateTime: 'desc' },
    });

    return NextResponse.json({ activities });
  } catch (error) {
    return handleAuthError(error);
  }
}
