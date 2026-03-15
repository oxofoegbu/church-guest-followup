import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { serviceReturnSchema } from '@/lib/utils';
import { getPermissionLevel } from '@/lib/roles';

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const body = await request.json();
    const parsed = serviceReturnSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    const guest = await prisma.guest.findUnique({
      where: { id: data.guestId },
      include: { serviceReturns: true },
    });

    if (!guest) {
      return NextResponse.json({ error: 'Guest not found' }, { status: 404 });
    }

    const customRolesSetting = await prisma.appSetting.findUnique({ where: { key: 'custom_roles' } });
    const permLevel = getPermissionLevel(session.role, customRolesSetting?.value);

    if (permLevel === 'VOLUNTEER_ACCESS' && guest.assignedVolunteerId !== session.userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (guest.serviceReturnCount >= 7) {
      return NextResponse.json({ error: 'Guest has reached the maximum of 7 service returns' }, { status: 400 });
    }

    const nextReturnNumber = guest.serviceReturnCount + 1;

    const serviceReturn = await prisma.guestServiceReturn.create({
      data: {
        guestId: data.guestId,
        returnNumber: nextReturnNumber,
        serviceDate: new Date(data.serviceDate),
        serviceName: data.serviceName || null,
        recordedByUserId: session.userId,
      },
    });

    await prisma.guest.update({
      where: { id: data.guestId },
      data: { serviceReturnCount: nextReturnNumber },
    });

    return NextResponse.json({ serviceReturn, newCount: nextReturnNumber }, { status: 201 });
  } catch (error) {
    return handleAuthError(error);
  }
}
