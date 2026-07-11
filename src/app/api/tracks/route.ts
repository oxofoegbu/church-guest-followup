import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

// GET /api/tracks — list all tracks with module/enrollment counts
export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const tracks = await (prisma as any).track.findMany({
      include: {
        _count: { select: { modules: true, cohorts: true, enrollments: true } },
        enrollments: { where: { status: 'ACTIVE' }, select: { id: true } },
      },
      orderBy: { ordering: 'asc' },
    });
    const shaped = tracks.map((t: any) => ({
      id: t.id, name: t.name, slug: t.slug, description: t.description,
      ordering: t.ordering, isActive: t.isActive,
      milestoneLabel: t.milestoneLabel, workbookUrl: t.workbookUrl,
      moduleCount: t._count.modules, cohortCount: t._count.cohorts,
      enrollmentCount: t._count.enrollments,
      activeEnrollmentCount: t.enrollments.length,
    }));
    return NextResponse.json({ tracks: shaped });
  } catch (error) {
    return handleAuthError(error);
  }
}

// POST /api/tracks — create a track (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request, ['ADMIN']);
    const { name, slug, description, ordering, milestoneLabel, workbookUrl } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const cleanSlug = (slug?.trim() || name.trim())
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const existing = await (prisma as any).track.findUnique({ where: { slug: cleanSlug } });
    if (existing) return NextResponse.json({ error: 'A track with this slug already exists' }, { status: 400 });

    const track = await (prisma as any).track.create({
      data: {
        name: name.trim(),
        slug: cleanSlug,
        description: description?.trim() || null,
        ordering: typeof ordering === 'number' ? ordering : 0,
        milestoneLabel: milestoneLabel?.trim() || null,
        workbookUrl: workbookUrl?.trim() || null,
      },
    });

    await logAudit({
      action: 'TRACK_CREATED', category: 'TRACK',
      description: `Track "${track.name}" created`,
      userId: session.userId, userName: session.name,
      targetId: track.id, targetType: 'TRACK', targetName: track.name,
    });

    return NextResponse.json({ track }, { status: 201 });
  } catch (error) {
    return handleAuthError(error);
  }
}
