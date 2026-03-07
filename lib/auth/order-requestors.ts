import type { UserRole } from '@prisma/client'

type OrderRequestorUser = {
  role: UserRole
  jobTitle?: string | null
}

const REQUESTOR_TITLE_KEYWORDS = ['nurse', 'speech', 'psych']

export function canAccessMyOrders(user: OrderRequestorUser): boolean {
  if (user.role === 'TEACHER') {
    return true
  }

  if (user.role !== 'SPED_STAFF') {
    return false
  }

  const normalizedTitle = (user.jobTitle || '').toLowerCase()
  return REQUESTOR_TITLE_KEYWORDS.some((keyword) => normalizedTitle.includes(keyword))
}
