import type { OrderStatus } from '@prisma/client'

interface OrderStatusBadgeProps {
  status: OrderStatus
  className?: string
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string }> = {
  PENDING: { label: 'Pending', color: 'bg-sky-100 text-sky-700 border-sky-200' },
  UNDER_REVIEW: { label: 'Under Review', color: 'bg-sky-200 text-sky-700 border-sky-300' },
  APPROVED: { label: 'Approved', color: 'bg-sage-100 text-sage-700 border-sage-200' },
  REJECTED: { label: 'Rejected', color: 'bg-warm-gray-400/20 text-warm-gray-700 border-warm-gray-400' },
  ORDERED: { label: 'Ordered', color: 'bg-sky-100 text-sky-600 border-sky-200' },
  SHIPPED: { label: 'Shipped', color: 'bg-sage-50 text-sage-600 border-sage-200' },
  RECEIVED: { label: 'Received', color: 'bg-sage-200 text-sage-700 border-sage-400' },
  CANCELLED: { label: 'Cancelled', color: 'bg-warm-gray-400/20 text-warm-gray-700 border-warm-gray-400' },
}

export default function OrderStatusBadge({ status, className = '' }: OrderStatusBadgeProps) {
  const config = STATUS_CONFIG[status]

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${config.color} ${className}`}
    >
      {config.label}
    </span>
  )
}
