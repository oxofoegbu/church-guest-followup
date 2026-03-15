import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const year = parseInt(searchParams.get('year') || '2026')

    const schedules = await prisma.serviceSchedule.findMany({
      where: {
        date: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`),
        },
      },
      include: {
        speaker:           { select: { id: true, name: true, email: true, phone: true } },
        serviceCoordinator:{ select: { id: true, name: true, email: true, phone: true } },
        propheticPrayer:   { select: { id: true, name: true, email: true, phone: true } },
        worshipLeader:     { select: { id: true, name: true, email: true, phone: true } },
      },
      orderBy: { date: 'asc' },
    })

    return NextResponse.json(schedules)
  } catch (error) {
    console.error('[schedule GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = (session.user as any).role
    if (!['ADMIN', 'SENIOR_LEADER'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const schedule = await prisma.serviceSchedule.create({ data: body })
    return NextResponse.json(schedule, { status: 201 })
  } catch (error) {
    console.error('[schedule POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
