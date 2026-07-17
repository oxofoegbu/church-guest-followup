import prisma from './db';

interface AuditParams {
  action: string;
  category: 'GUEST' | 'USER' | 'ASSIGNMENT' | 'SETTINGS' | 'AUTH' | 'NOTIFICATION' | 'SCHEDULE' | 'DRIP' | 'TRACK' | 'TEACHING';
  description: string;
  userId?: string;
  userName?: string;
  targetId?: string;
  targetType?: string;
  targetName?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
}

export async function logAudit(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        category: params.category,
        description: params.description,
        userId: params.userId || null,
        userName: params.userName || null,
        targetId: params.targetId || null,
        targetType: params.targetType || null,
        targetName: params.targetName || null,
        metadata: params.metadata || undefined,
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (error) {
    console.error('Audit log error:', error);
  }
}

// Convenience helpers
export function auditGuestCreated(guestId: string, guestName: string, ip?: string) {
  return logAudit({
    action: 'GUEST_CREATED',
    category: 'GUEST',
    description: `New guest "${guestName}" submitted via form`,
    targetId: guestId,
    targetType: 'GUEST',
    targetName: guestName,
    ipAddress: ip,
  });
}

export function auditGuestAssigned(userId: string, userName: string, guestId: string, guestName: string, assigneeName: string) {
  return logAudit({
    action: 'GUEST_ASSIGNED',
    category: 'ASSIGNMENT',
    description: `${userName} assigned "${guestName}" to ${assigneeName}`,
    userId,
    userName,
    targetId: guestId,
    targetType: 'GUEST',
    targetName: guestName,
    metadata: { assigneeName },
  });
}

export function auditGuestStatusChanged(userId: string, userName: string, guestId: string, guestName: string, oldStatus: string, newStatus: string) {
  return logAudit({
    action: 'GUEST_STATUS_CHANGED',
    category: 'GUEST',
    description: `${userName} changed "${guestName}" status from ${oldStatus} to ${newStatus}`,
    userId,
    userName,
    targetId: guestId,
    targetType: 'GUEST',
    targetName: guestName,
    metadata: { oldStatus, newStatus },
  });
}

export function auditGuestArchived(userId: string, userName: string, guestId: string, guestName: string, reason?: string) {
  return logAudit({
    action: 'GUEST_ARCHIVED',
    category: 'GUEST',
    description: `${userName} archived "${guestName}"${reason ? `: ${reason}` : ''}`,
    userId,
    userName,
    targetId: guestId,
    targetType: 'GUEST',
    targetName: guestName,
    metadata: { reason },
  });
}

export function auditGuestRestored(userId: string, userName: string, guestId: string, guestName: string) {
  return logAudit({
    action: 'GUEST_RESTORED',
    category: 'GUEST',
    description: `${userName} restored "${guestName}" from archive`,
    userId,
    userName,
    targetId: guestId,
    targetType: 'GUEST',
    targetName: guestName,
  });
}

export function auditGuestDeleted(userId: string, userName: string, guestName: string) {
  return logAudit({
    action: 'GUEST_DELETED',
    category: 'GUEST',
    description: `${userName} permanently deleted "${guestName}"`,
    userId,
    userName,
    targetType: 'GUEST',
    targetName: guestName,
  });
}

export function auditUserCreated(adminId: string, adminName: string, newUserId: string, newUserName: string, role: string) {
  return logAudit({
    action: 'USER_CREATED',
    category: 'USER',
    description: `${adminName} created user "${newUserName}" with role ${role}`,
    userId: adminId,
    userName: adminName,
    targetId: newUserId,
    targetType: 'USER',
    targetName: newUserName,
    metadata: { role },
  });
}

export function auditUserUpdated(adminId: string, adminName: string, targetUserId: string, targetUserName: string, changes: Record<string, any>) {
  const changeList = Object.keys(changes).join(', ');
  return logAudit({
    action: 'USER_UPDATED',
    category: 'USER',
    description: `${adminName} updated user "${targetUserName}" (${changeList})`,
    userId: adminId,
    userName: adminName,
    targetId: targetUserId,
    targetType: 'USER',
    targetName: targetUserName,
    metadata: { fields: Object.keys(changes) },
  });
}

export function auditUserDeactivated(adminId: string, adminName: string, targetUserId: string, targetUserName: string) {
  return logAudit({
    action: 'USER_DEACTIVATED',
    category: 'USER',
    description: `${adminName} deactivated user "${targetUserName}"`,
    userId: adminId,
    userName: adminName,
    targetId: targetUserId,
    targetType: 'USER',
    targetName: targetUserName,
  });
}

export function auditPasswordReset(adminId: string, adminName: string, targetUserId: string, targetUserName: string) {
  return logAudit({
    action: 'PASSWORD_RESET',
    category: 'AUTH',
    description: `${adminName} reset password for "${targetUserName}"`,
    userId: adminId,
    userName: adminName,
    targetId: targetUserId,
    targetType: 'USER',
    targetName: targetUserName,
  });
}

export function auditSettingsChanged(adminId: string, adminName: string, keys: string[]) {
  return logAudit({
    action: 'SETTINGS_CHANGED',
    category: 'SETTINGS',
    description: `${adminName} updated settings: ${keys.join(', ')}`,
    userId: adminId,
    userName: adminName,
    metadata: { keys },
  });
}

export function auditLogin(userId: string, userName: string, ip?: string) {
  return logAudit({
    action: 'USER_LOGIN',
    category: 'AUTH',
    description: `${userName} logged in`,
    userId,
    userName,
    ipAddress: ip,
  });
}
