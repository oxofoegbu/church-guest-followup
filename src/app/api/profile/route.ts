import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { getRoleLabel } from '@/lib/roles';

// GET /api/profile — the session user's own record (any permission level)
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, name: true, email: true, phone: true, role: true, photoUrl: true, createdAt: true } as any,
    });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const customRolesSetting = await prisma.appSetting.findUnique({ where: { key: 'custom_roles' } });
    const roleLabel = getRoleLabel(session.role, customRolesSetting?.value ?? null);

    return NextResponse.json({ profile: { ...user, roleLabel } });
  } catch (error) {
    return handleAuthError(error);
  }
}
