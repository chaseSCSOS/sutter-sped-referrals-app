import Link from 'next/link'
import OrderStatusBadge from './order-status-badge'

interface OrderCardProps {
  order: {
    id: string
    orderNumber: string
    orderType?: string
    status: any
    totalEstimatedPrice: any
    schoolSite: string
    createdAt: Date
    items: Array<{
      id: string
      itemName: string
      quantity: number
    }>
    requestor: { id: string; name: string }
    approver?: { id: string; name: string } | null
  }
}

export default function OrderCard({ order }: OrderCardProps) {
  const itemCount = order.items.length
  const displayTitle = itemCount === 1 ? order.items[0].itemName : `${itemCount} Items`

  return (
    <Link
      href={`/dashboard/orders/${order.id}`}
      className="block bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-5 border border-cream-200"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h3 className="text-base font-medium text-warm-gray-900">{displayTitle}</h3>
            <OrderStatusBadge status={order.status} />
            {order.orderType === 'PROTOCOL_ASSESSMENT' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700">
                Protocol
              </span>
            )}
          </div>
          <p className="text-sm text-warm-gray-600">
            Order: {order.orderNumber} • Site: {order.schoolSite}
          </p>
        </div>
        <div className="text-right">
          <p className="text-base font-semibold text-warm-gray-900">
            ${Number(order.totalEstimatedPrice).toFixed(2)}
          </p>
          <p className="text-xs text-warm-gray-600">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-warm-gray-600 text-xs">Requested By</p>
          <p className="text-warm-gray-900 font-medium">{order.requestor.name}</p>
        </div>
        <div>
          <p className="text-warm-gray-600 text-xs">Submitted</p>
          <p className="text-warm-gray-900 font-medium">
            {new Date(order.createdAt).toLocaleDateString()}
          </p>
        </div>
        {order.approver && (
          <div className="col-span-2">
            <p className="text-warm-gray-600 text-xs">Approved By</p>
            <p className="text-warm-gray-900 font-medium">{order.approver.name}</p>
          </div>
        )}
      </div>
    </Link>
  )
}
