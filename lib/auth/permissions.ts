import type { UserRole } from '@prisma/client'

export const PERMISSIONS = {
  // Referral permissions
  'referrals:submit': ['EXTERNAL_ORG', 'SPED_STAFF', 'ADMIN', 'SUPER_ADMIN'],
  'referrals:view-own': ['EXTERNAL_ORG', 'TEACHER', 'SPED_STAFF', 'ADMIN', 'SUPER_ADMIN'],
  'referrals:view-all': ['SPED_STAFF', 'ADMIN', 'SUPER_ADMIN'],
  'referrals:update': ['SPED_STAFF', 'ADMIN', 'SUPER_ADMIN'],
  'referrals:delete': ['ADMIN', 'SUPER_ADMIN'],

  // Order permissions
  'orders:submit': ['TEACHER', 'SPED_STAFF', 'ADMIN', 'SUPER_ADMIN'],
  'orders:view-own': ['TEACHER', 'SPED_STAFF', 'ADMIN', 'SUPER_ADMIN'],
  'orders:view-all': ['SPED_STAFF', 'ADMIN', 'SUPER_ADMIN'],
  'orders:approve': ['SPED_STAFF', 'ADMIN', 'SUPER_ADMIN'],
  'orders:update': ['SPED_STAFF', 'ADMIN', 'SUPER_ADMIN'],
  'orders:delete': ['ADMIN', 'SUPER_ADMIN'],

  // User permissions
  'users:create': ['ADMIN', 'SUPER_ADMIN'],
  'users:view': ['ADMIN', 'SUPER_ADMIN'],
  'users:update': ['ADMIN', 'SUPER_ADMIN'],
  'users:delete': ['SUPER_ADMIN'],
} as const

export type Permission = keyof typeof PERMISSIONS

export function hasPermission(userRole: UserRole | undefined | null, permission: Permission): boolean {
  if (!userRole) return false
  return (PERMISSIONS[permission] as readonly UserRole[])?.includes(userRole) ?? false
}

export function requirePermission(userRole: UserRole | undefined | null, permission: Permission): void {
  if (!hasPermission(userRole, permission)) {
    throw new Error(`Permission denied: ${permission}`)
  }
}
