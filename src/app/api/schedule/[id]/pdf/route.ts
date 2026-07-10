import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { buildOrderOfServicePdf, oosPdfFilename, OoSItem } from '@/lib/oos-pdf';

type Params = { params: { id: string } };

/**
 * GET /api/schedule/[id]/pdf — Run 8
 * Returns the Order of Service as a downloadable PDF.
 * Public by unguessable cuid (same trust model as the public schedule page),
 * so links in emails and WhatsApp work without login.
 * Falls back to the default Order of Service template when the Sunday
 * has no customized order.
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const schedule = await prisma.serviceSchedule.findUnique({
      where: { id: params.id },
      include: {
        speaker:            { select: { name: true } },
        serviceCoordinator: { select: { name: true } },
        propheticPrayer:    { select: { name: true } },
        worshipLeader:      { select: { name: true } },
      },
    });
    if (!schedule) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const s = schedule as any;

    // Custom order, else default template, else empty
    let items: OoSItem[] = Array.isArray(s.orderOfService) ? s.orderOfService : [];
    if (!items.length) {
      const defaultTpl = await (prisma as any).orderOfServiceTemplate
        .findFirst({ where: { isDefault: true } })
        .catch(() => null);
      if (defaultTpl && Array.isArray(defaultTpl.items)) items = defaultTpl.items;
    }

    const churchSetting = await prisma.appSetting.findUnique({ where: { key: 'church_name' } }).catch(() => null);
    const churchName = churchSetting?.value || 'Grace Life Center';

    const dateStr = schedule.date.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
    });

    const display = (name: string | null, user: { name: string } | null) =>
      user?.name || (name && name !== 'TBD' ? name : 'TBD');

    const roles: { label: string; name: string }[] = [];
    if (s.isSeminar && Array.isArray(s.panelSpeakers) && s.panelSpeakers.length) {
      roles.push({
        label: 'Seminar Panel',
        name: s.panelSpeakers.map((sp: any) => sp.name).filter(Boolean).join(', '),
      });
    } else {
      roles.push({ label: 'Speaker', name: display(schedule.speakerName, schedule.speaker) });
    }
    roles.push({ label: 'Coordinator', name: display(schedule.serviceCoordinatorName, schedule.serviceCoordinator) });
    roles.push({ label: 'Prophetic Prayer', name: display(schedule.propheticPrayerName, schedule.propheticPrayer) });
    roles.push({ label: 'Worship', name: display(schedule.worshipLeaderName, schedule.worshipLeader) });

    const pdfBytes = await buildOrderOfServicePdf({
      churchName,
      dateStr,
      topic: schedule.topic,
      monthTheme: schedule.monthTheme,
      roles,
      items,
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${oosPdfFilename(schedule.date)}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[schedule pdf]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
