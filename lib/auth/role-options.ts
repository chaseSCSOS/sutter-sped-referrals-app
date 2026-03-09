import type { UserRole } from '@prisma/client'

export const SYSTEM_ROLE_LABELS: Record<UserRole, string> = {
  EXTERNAL_ORG: 'External Organization',
  TEACHER: 'Teacher',
  SPED_STAFF: 'SPED Staff',
  ADMIN: 'Administrator',
  SUPER_ADMIN: 'Super Administrator',
}

export const USER_ROLE_VALUES = ['EXTERNAL_ORG', 'TEACHER', 'SPED_STAFF', 'ADMIN', 'SUPER_ADMIN'] as const

export type RoleOptionResponse = {
  id: string
  name: string
  baseRole: UserRole
  isSystem: boolean
}

export function getSystemRoleOptionId(role: UserRole): string {
  return `system:${role}`
}

export function getRoleDisplayName(role: UserRole, customRoleName?: string | null): string {
  if (customRoleName?.trim()) {
    return customRoleName.trim()
  }
  return SYSTEM_ROLE_LABELS[role] ?? role
}

export function getSystemRoleOptions(): RoleOptionResponse[] {
  return USER_ROLE_VALUES.map((role) => ({
    id: getSystemRoleOptionId(role),
    name: SYSTEM_ROLE_LABELS[role],
    baseRole: role,
    isSystem: true,
  }))
}
