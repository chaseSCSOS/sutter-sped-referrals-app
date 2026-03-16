interface EnrollmentStatusBadgeProps {
  status: string
  className?: string
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: 'Active', className: 'bg-green-100 text-green-800' },
  REFERRAL_PENDING: { label: 'Referral Pending', className: 'bg-sky-100 text-sky-800' },
  REFERRAL_NOT_RECEIVED: { label: 'Referral Not Received', className: 'bg-red-100 text-red-800' },
  REFERRAL_ON_HOLD: { label: 'On Hold', className: 'bg-yellow-100 text-yellow-800' },
  PLACED_NOT_IN_SYSTEMS: { label: 'Placed – Not in Systems', className: 'bg-amber-100 text-amber-800' },
  HOME_INSTRUCTION: { label: 'Home Instruction', className: 'bg-violet-100 text-violet-800' },
  RTD_IN_PROGRESS: { label: 'RTD in Progress', className: 'bg-orange-100 text-orange-800' },
  EXITED: { label: 'Exited', className: 'bg-gray-100 text-gray-600' },
}

export default function EnrollmentStatusBadge({ status, className = '' }: EnrollmentStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.className} ${className}`}
    >
      {config.label}
    </span>
  )
}
