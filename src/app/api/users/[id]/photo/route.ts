import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { getPermissionLevel } from '@/lib/roles';
import { uploadBuffer } from '@/lib/storage';
import { logAudit } from '@/lib/audit';

const MAX_BYTES = 4 * 1024 * 1024; // photos are resized client-side; this is a hard cap
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

// POST /api/users/[id]/photo — multipart upload of a profile photo.
// Allowed: the user themselves, or an admin for anyone.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth(request);

    const isSelf = session.userId === params.id;
    if (!isSelf) {
      const setting = await prisma.appSetting.findUnique({ where: { key: 'custom_roles' } });
      const permLevel = getPermissionLevel(session.role, setting?.value ?? null);
      if (permLevel !== 'ADMIN_ACCESS') {
        return NextResponse.json({ error: 'Only admins can change another user\u2019s photo' }, { status: 403 });
      }
    }

    const target = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true, name: true } });
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const form = await request.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ error: 'Please upload a JPEG, PNG, or WebP image' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Image is too large (max 4 MB)' }, { status: 400 });
    }

    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `photos/${params.id}-${Date.now()}.${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());

    const result = await uploadBuffer(path, buf, file.type);
    if (result.error || !result.url) {
      return NextResponse.json({ error: result.error || 'Upload failed' }, { status: 500 });
    }

    await prisma.user.update({ where: { id: params.id }, data: { photoUrl: result.url } as any });

    await logAudit({
      action: 'USER_PHOTO_UPDATED', category: 'USER',
      description: `Profile photo updated for ${target.name}${isSelf ? '' : ` by ${session.name}`}`,
      userId: session.userId, userName: session.name,
      targetId: target.id, targetType: 'USER', targetName: target.name,
    });

    return NextResponse.json({ photoUrl: result.url });
  } catch (error) {
    return handleAuthError(error);
  }
}
