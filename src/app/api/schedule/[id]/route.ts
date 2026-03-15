import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type Params = { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const schedule = await prisma.serviceSchedule.findUnique({
      where: { id: params.id },
      include: {
        speaker:           { select: { id: true, name: true, email: true, phone: true } },
        serviceCoordinator:{ select: { id: true, name: true, email: true, phone: true } },
        propheticPrayer:   { select: { id: true, name: true, email: true, phone: true } },
        worshipLeader:     { select: { id: true, name: true, email: true, phone: true } },
      },
    })

    if (!schedule) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(schedule)
  } catch (error) {
    console.error('[schedule/:id GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = (session.user as any).role
    const customRole = (session.user as any).customRole as string | null

    const canEdit =
      ['ADMIN', 'SENIOR_LEADER'].includes(role) ||
      ['Coordination Leader', 'Prayer Coordinator', 'Worship Team Coordinator'].includes(customRole ?? '')

    if (!canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()

    // Only allow updating assignment fields + notes
    const allowedFields = [
      'speakerName', 'speakerId',
      'serviceCoordinatorName', 'serviceCoordinatorId',
      'propheticPrayerName', 'propheticPrayerId',
      'worshipLeaderName', 'worshipLeaderId',
      'notes', 'reminderSent',
    ]
    const data: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in body) data[field] = body[field]
    }

    // Allow ADMIN/SENIOR_LEADER to also update topic/theme
    if (['ADMIN', 'SENIOR_LEADER'].includes(role)) {
      if ('topic' in body) data.topic = body.topic
      if ('monthTheme' in body) data.monthTheme = body.monthTheme
    }

    const updated = await prisma.serviceSchedule.update({
      where: { id: params.id },
      data,
      include: {
        speaker:           { select: { id: true, name: true, email: true, phone: true } },
        serviceCoordinator:{ select: { id: true, name: true, email: true, phone: true } },
        propheticPrayer:   { select: { id: true, name: true, email: true, phone: true } },
        worshipLeader:     { select: { id: true, name: true, email: true, phone: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[schedule/:id PATCH]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = (session.user as any).role
    if (!['ADMIN', 'SENIOR_LEADER'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.serviceSchedule.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[schedule/:id DELETE]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
