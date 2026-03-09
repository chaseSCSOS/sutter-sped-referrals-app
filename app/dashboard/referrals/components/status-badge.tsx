import type { ReferralStatus } from '@prisma/client'

interface StatusBadgeProps {
  status: ReferralStatus
  className?: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  SUBMITTED: { label: 'Submitted', color: 'bg-sky-100 text-sky-700 border-sky-200' },
  UNDER_REVIEW: { label: 'Under Review', color: 'bg-sky-200 text-sky-700 border-sky-300' },
  MISSING_DOCUMENTS: { label: 'Missing Documents', color: 'bg-coral-100 text-coral-600 border-coral-200' },
  PENDING_ADDITIONAL_INFO: { label: 'Pending Info', color: 'bg-coral-100 text-coral-600 border-coral-200' },
  PENDING_APPROVAL: { label: 'Pending Approval', color: 'bg-sky-100 text-sky-600 border-sky-200' },
  APPROVED: { label: 'Approved', color: 'bg-sage-100 text-sage-700 border-sage-200' },
  ACCEPTED_AWAITING_PLACEMENT: { label: 'Accepted - Awaiting Placement', color: 'bg-sage-100 text-sage-700 border-sage-200' },
  REJECTED: { label: 'Rejected', color: 'bg-warm-gray-400/20 text-warm-gray-700 border-warm-gray-400' },
  ON_HOLD: { label: 'On Hold', color: 'bg-warm-gray-100 text-warm-gray-600 border-warm-gray-200' },
  COMPLETED: { label: 'Completed', color: 'bg-sage-200 text-sage-700 border-sage-400' },
  NOT_ENROLLING: { label: 'Not Enrolling', color: 'bg-warm-gray-200 text-warm-gray-700 border-warm-gray-300' },
  WITHDRAWN: { label: 'Withdrawn', color: 'bg-coral-100 text-coral-700 border-coral-200' },
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status]

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${config.color} ${className}`}
    >
      {config.label}
    </span>
  )
}
