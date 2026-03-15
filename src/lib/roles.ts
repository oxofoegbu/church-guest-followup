// Permission levels determine what features a role can access
// ADMIN_ACCESS: Full access to everything
// LEADER_ACCESS: View all guests, assign, reports, but can't manage users/settings
// VOLUNTEER_ACCESS: Only see assigned guests, log activities

export type PermissionLevel = 'ADMIN_ACCESS' | 'LEADER_ACCESS' | 'VOLUNTEER_ACCESS';

export interface RoleConfig {
  name: string;
  label: string;
  permissionLevel: PermissionLevel;
  isDefault?: boolean;
}

// Default built-in roles (always available)
export const DEFAULT_ROLES: RoleConfig[] = [
  { name: 'ADMIN', label: 'Administrator', permissionLevel: 'ADMIN_ACCESS', isDefault: true },
  { name: 'SENIOR_LEADER', label: 'Senior Leader', permissionLevel: 'LEADER_ACCESS', isDefault: true },
  { name: 'LEADER', label: 'Leader', permissionLevel: 'LEADER_ACCESS', isDefault: true },
  { name: 'VOLUNTEER', label: 'Volunteer', permissionLevel: 'VOLUNTEER_ACCESS', isDefault: true },
];

// Parse custom roles from settings JSON
export function parseCustomRoles(json: string | null | undefined): RoleConfig[] {
  if (!json) return [];
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

// Get all roles (default + custom)
export function getAllRoles(customRolesJson?: string | null): RoleConfig[] {
  const custom = parseCustomRoles(customRolesJson);
  return [...DEFAULT_ROLES, ...custom];
}

// Get permission level for a role name
export function getPermissionLevel(roleName: string, customRolesJson?: string | null): PermissionLevel {
  const allRoles = getAllRoles(customRolesJson);
  const role = allRoles.find(r => r.name === roleName);
  return role?.permissionLevel || 'VOLUNTEER_ACCESS';
}

// Get display label for a role
export function getRoleLabel(roleName: string, customRolesJson?: string | null): string {
  const allRoles = getAllRoles(customRolesJson);
  const role = allRoles.find(r => r.name === roleName);
  return role?.label || roleName;
}

// Check if role has at least leader-level access
export function hasLeaderAccess(roleName: string, customRolesJson?: string | null): boolean {
  const level = getPermissionLevel(roleName, customRolesJson);
  return level === 'ADMIN_ACCESS' || level === 'LEADER_ACCESS';
}

// Check if role has admin-level access
export function hasAdminAccess(roleName: string, customRolesJson?: string | null): boolean {
  return getPermissionLevel(roleName, customRolesJson) === 'ADMIN_ACCESS';
}

// Permission level labels for the Settings UI
export const PERMISSION_LEVEL_LABELS: Record<PermissionLevel, string> = {
  ADMIN_ACCESS: 'Full Admin Access',
  LEADER_ACCESS: 'Leader Access (view all, assign, reports)',
  VOLUNTEER_ACCESS: 'Volunteer Access (own guests only)',
};
