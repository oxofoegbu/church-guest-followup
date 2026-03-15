import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { getAllRoles } from '@/lib/roles';

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);

    const customRolesSetting = await prisma.appSetting.findUnique({ where: { key: 'custom_roles' } });
    const roles = getAllRoles(customRolesSetting?.value);

    return NextResponse.json({ roles, customRolesJson: customRolesSetting?.value || '[]' });
  } catch (error) {
    return handleAuthError(error);
  }
}
