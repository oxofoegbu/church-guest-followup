import { prisma } from './db';
import { getPermissionLevel } from './roles';

export async function canEditSchedule(session: { userId: string; role: string } | null): Promise<boolean> {
  if (!session) return false;
  const rolesRow = await prisma.appSetting.findUnique({ where: { key: 'custom_roles' } });
  const level = getPermissionLevel(session.role, (rolesRow?.value as string | null) ?? null);
  if (level === 'ADMIN_ACCESS' || level === 'LEADER_ACCESS') return true;
  const coordRow = await prisma.appSetting.findUnique({ where: { key: 'schedule_coordinators' } });
  try {
    const ids = JSON.parse((coordRow?.value as string | null) ?? '[]');
    return Array.isArray(ids) && ids.includes(session.userId);
  } catch { return false; }
}

export async function canManageTemplates(session: { userId: string; role: string } | null): Promise<boolean> {
  if (!session) return false;
  const rolesRow = await prisma.appSetting.findUnique({ where: { key: 'custom_roles' } });
  const level = getPermissionLevel(session.role, (rolesRow?.value as string | null) ?? null);
  return level === 'ADMIN_ACCESS' || level === 'LEADER_ACCESS';
}
