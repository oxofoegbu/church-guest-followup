import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/auth';
import prisma from '@/lib/db';
import { getPermissionLevel, getRoleLabel } from '@/lib/roles';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { mustChangePassword: true },
    });

    const customRolesSetting = await prisma.appSetting.findUnique({ where: { key: 'custom_roles' } });
    const permissionLevel = getPermissionLevel(session.role, customRolesSetting?.value);
    const roleLabel = getRoleLabel(session.role, customRolesSetting?.value);

    return NextResponse.json({
      user: {
        ...session,
        mustChangePassword: user?.mustChangePassword ?? false,
        permissionLevel,
        roleLabel,
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
