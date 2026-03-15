import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { prospectSchema } from '@/lib/utils';
import { logAudit } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const body = await request.json();

    // Handle "convert to guest" action
    if (body.action === 'convert') {
      return convertToGuest(request, session, body);
    }

    const parsed = prospectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    const prospect = await prisma.guest.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        preferredContactMethod: (data.preferredContactMethod as any) || 'CALL',
        status: 'PROSPECT',
        source: 'PROSPECT',
        addedByUserId: session.userId,
        assignedVolunteerId: data.assignedVolunteerId || session.userId,
        assignedAt: new Date(),
        relationshipToAdder: data.relationshipToAdder || null,
        spiritualStatus: data.spiritualStatus || null,
        prospectNotes: data.prospectNotes || null,
      },
    });

    const prospectName = `${prospect.firstName} ${prospect.lastName}`;

    logAudit({
      action: 'PROSPECT_ADDED',
      category: 'GUEST',
      description: `${session.name} added prospect "${prospectName}"`,
      userId: session.userId,
      userName: session.name,
      targetId: prospect.id,
      targetType: 'GUEST',
      targetName: prospectName,
      metadata: { relationship: data.relationshipToAdder, spiritualStatus: data.spiritualStatus },
    }).catch(() => {});

    return NextResponse.json({ ok: true, id: prospect.id, prospect }, { status: 201 });
  } catch (error) {
    return handleAuthError(error);
  }
}

async function convertToGuest(request: NextRequest, session: any, body: any) {
  const { guestId, firstVisitDate, serviceAttended } = body;

  if (!guestId) {
    return NextResponse.json({ error: 'guestId is required' }, { status: 400 });
  }

  const prospect = await prisma.guest.findUnique({ where: { id: guestId } });
  if (!prospect) {
    return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
  }

  if (!['PROSPECT', 'INVITED', 'FIRST_VISIT'].includes(prospect.status)) {
    return NextResponse.json({ error: 'This person is already in the guest pipeline' }, { status: 400 });
  }

  const updated = await prisma.guest.update({
    where: { id: guestId },
    data: {
      status: 'NEW_GUEST',
      firstVisitDate: firstVisitDate ? new Date(firstVisitDate) : new Date(),
      serviceAttended: serviceAttended || null,
      convertedToGuestAt: new Date(),
    },
  });

  const name = `${updated.firstName} ${updated.lastName}`;

  logAudit({
    action: 'PROSPECT_CONVERTED',
    category: 'GUEST',
    description: `${session.name} converted prospect "${name}" to guest`,
    userId: session.userId,
    userName: session.name,
    targetId: guestId,
    targetType: 'GUEST',
    targetName: name,
  }).catch(() => {});

  return NextResponse.json({ ok: true, guest: updated });
}
