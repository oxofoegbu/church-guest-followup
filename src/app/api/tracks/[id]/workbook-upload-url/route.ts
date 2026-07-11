import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { createSignedUploadUrl } from '@/lib/storage';

// POST /api/tracks/[id]/workbook-upload-url — admin only.
// Returns a short-lived signed URL the browser uploads the PDF to DIRECTLY
// (bypassing Vercel's ~4.5 MB request limit), plus the final public URL to
// save on the track via the existing PATCH /api/tracks/[id].
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth(request, ['ADMIN']);

    const track = await (prisma as any).track.findUnique({
      where: { id: params.id },
      select: { id: true, slug: true },
    });
    if (!track) return NextResponse.json({ error: 'Track not found' }, { status: 404 });

    const path = `workbooks/${track.slug}-${Date.now()}.pdf`;
    const result = await createSignedUploadUrl(path);
    if (result.error || !result.uploadUrl) {
      return NextResponse.json({ error: result.error || 'Could not create upload URL' }, { status: 500 });
    }

    return NextResponse.json({ uploadUrl: result.uploadUrl, publicUrl: result.publicUrl });
  } catch (error) {
    return handleAuthError(error);
  }
}
