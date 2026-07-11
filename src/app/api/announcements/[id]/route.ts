import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';

// Run 20 — DELETE /api/announcements/[id] (admin only). Deleting removes the
// announcement from the portal and My Tracks; emails already sent are sent.

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth(request, ['ADMIN']);
    await (prisma as any).trackAnnouncement.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
