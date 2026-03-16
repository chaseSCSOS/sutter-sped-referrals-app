import type { UserRole } from '@prisma/client'

export const PERMISSIONS = {
  // Referral permissions
  'referrals:submit': ['EXTERNAL_ORG', 'SPED_STAFF', 'ADMIN', 'SUPER_ADMIN'],
  'referrals:view-own': ['EXTERNAL_ORG'],
  'referrals:view-all': ['SPED_STAFF', 'ADMIN', 'SUPER_ADMIN'],
  'referrals:update': ['SPED_STAFF', 'ADMIN', 'SUPER_ADMIN'],
  'referrals:delete': ['ADMIN', 'SUPER_ADMIN'],

  // Operational fields — internal staff only; never exposed to external submitters
  'referrals:write-operational': ['SPED_STAFF', 'ADMIN', 'SUPER_ADMIN'],
  'referrals:manage-cum': ['SPED_STAFF', 'ADMIN', 'SUPER_ADMIN'],
  'referrals:manage-sync': ['SPED_STAFF', 'ADMIN', 'SUPER_ADMIN'],

  // Settings
  'settings:manage': ['ADMIN', 'SUPER_ADMIN'],

  // Order permissions
  'orders:submit': ['TEACHER', 'SPED_STAFF', 'ADMIN', 'SUPER_ADMIN'],
  'orders:view-own': ['TEACHER', 'SPED_STAFF', 'ADMIN', 'SUPER_ADMIN'],
  'orders:view-all': ['SPED_STAFF', 'ADMIN', 'SUPER_ADMIN'],
  'orders:approve': ['SPED_STAFF', 'ADMIN', 'SUPER_ADMIN'],
  'orders:update': ['SPED_STAFF', 'ADMIN', 'SUPER_ADMIN'],
  'orders:delete': ['ADMIN', 'SUPER_ADMIN'],

  // Assessment catalog permissions
  'assessments:submit': ['TEACHER', 'SPED_STAFF', 'ADMIN', 'SUPER_ADMIN'],
  'assessments:manage': ['ADMIN', 'SUPER_ADMIN'],

  // User permissions
  'users:create': ['ADMIN', 'SUPER_ADMIN'],
  'users:view': ['ADMIN', 'SUPER_ADMIN'],
  'users:update': ['ADMIN', 'SUPER_ADMIN'],
  'users:delete': ['SUPER_ADMIN'],

  // Dashboard changelog permissions
  'changelog:view': ['SPED_STAFF', 'ADMIN', 'SUPER_ADMIN'],

  // Classroom & Placement permissions
  'classrooms:view': ['SPED_STAFF', 'ADMIN', 'SUPER_ADMIN'],
  'classrooms:create': ['ADMIN', 'SUPER_ADMIN'],
  'classrooms:update': ['SPED_STAFF', 'ADMIN', 'SUPER_ADMIN'],
  'classrooms:delete': ['ADMIN', 'SUPER_ADMIN'],

  // Student placements
  'placements:view': ['SPED_STAFF', 'ADMIN', 'SUPER_ADMIN'],
  'placements:create': ['SPED_STAFF', 'ADMIN', 'SUPER_ADMIN'],
  'placements:update': ['SPED_STAFF', 'ADMIN', 'SUPER_ADMIN'],
  'placements:transfer': ['SPED_STAFF', 'ADMIN', 'SUPER_ADMIN'],
  'placements:delete': ['ADMIN', 'SUPER_ADMIN'],

  // Staff management
  'staff:view': ['SPED_STAFF', 'ADMIN', 'SUPER_ADMIN'],
  'staff:manage': ['ADMIN', 'SUPER_ADMIN'],

  // Sites management
  'sites:manage': ['ADMIN', 'SUPER_ADMIN'],

  // Transport records
  'transport:view': ['SPED_STAFF', 'ADMIN', 'SUPER_ADMIN'],
  'transport:update': ['SPED_STAFF', 'ADMIN', 'SUPER_ADMIN'],

  // RTD checklist
  'rtd:update': ['SPED_STAFF', 'ADMIN', 'SUPER_ADMIN'],

  // Planning / sandbox mode
  'planning:view': ['SPED_STAFF', 'ADMIN', 'SUPER_ADMIN'],
  'planning:create': ['ADMIN', 'SUPER_ADMIN'],
  'planning:publish': ['ADMIN', 'SUPER_ADMIN'],

  // Audit log
  'audit:view': ['ADMIN', 'SUPER_ADMIN'],
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
