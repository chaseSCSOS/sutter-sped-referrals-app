import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import OrderStatusBadge from '../components/order-status-badge'
import OrderActions from '../components/order-actions'
import { formatDistanceToNow } from 'date-fns'

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) {
    return <div>Unauthorized</div>
  }

  const user = await prisma.user.findUnique({
    where: { supabaseUserId: authUser.id },
  })

  if (!user) {
    return <div>User not found</div>
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      requestor: {
        select: {
          id: true,
          name: true,
          email: true,
          organization: true,
          phoneNumber: true,
        },
      },
      approver: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      statusHistory: {
        include: {
          changedBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
      notes: {
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  })

  if (!order) {
    notFound()
  }

  // Check permissions
  const canViewAll = ['SPED_STAFF', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)
  const isRequestor = order.requestorId === user.id

  if (!canViewAll && !isRequestor) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <h2 className="text-xl font-semibold text-red-900 mb-2">Access Denied</h2>
          <p className="text-red-700">You do not have permission to view this order.</p>
        </div>
      </div>
    )
  }

  const canManage = ['SPED_STAFF', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)
  const itemCount = order.items.length
  const title = itemCount === 1 ? order.items[0].itemName : `Order with ${itemCount} Items`

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
          <div className="flex items-center gap-3">
            <p className="text-gray-600">Order: {order.orderNumber}</p>
            <OrderStatusBadge status={order.status} />
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">${Number(order.totalEstimatedPrice).toFixed(2)}</p>
          <p className="text-sm text-gray-500">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </p>
        </div>
      </div>

      {/* Rejection Reason */}
      {order.status === 'CANCELLED' && order.rejectionReason && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-red-900 mb-2">Cancellation Reason</h3>
          <p className="text-red-800">{order.rejectionReason}</p>
        </div>
      )}

      {/* Actions */}
      {canManage && <OrderActions orderId={order.id} currentStatus={order.status} />}

      {/* Order Items */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Ordered Items</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-y border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {order.items.map((item) => {
                const itemTotal = Number(item.estimatedPrice) * item.quantity
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.itemName}</p>
                        {item.itemLink && (
                          <a
                            href={item.itemLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-sky-600 hover:underline"
                          >
                            View product
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-900">{item.quantity}</td>
                    <td className="px-6 py-4 text-right text-sm text-gray-900">${Number(item.estimatedPrice).toFixed(2)}</td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">${itemTotal.toFixed(2)}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td colSpan={3} className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Total Estimated:</td>
                <td className="px-6 py-4 text-right text-lg font-bold text-gray-900">${Number(order.totalEstimatedPrice).toFixed(2)}</td>
              </tr>
              {order.totalActualPrice && (
                <tr>
                  <td colSpan={3} className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Total Actual:</td>
                  <td className="px-6 py-3 text-right text-lg font-bold text-green-600">${Number(order.totalActualPrice).toFixed(2)}</td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>
      </div>

      {/* Order Details */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Information</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">School/Site</label>
              <p className="text-gray-900">{order.schoolSite}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Submitted</label>
              <p className="text-gray-900">{new Date(order.createdAt).toLocaleDateString()}</p>
              <p className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
              </p>
            </div>
            {order.vendor && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Vendor</label>
                <p className="text-gray-900">{order.vendor}</p>
              </div>
            )}
            {order.trackingNumber && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Tracking Number</label>
                <p className="text-gray-900 font-mono text-sm">{order.trackingNumber}</p>
              </div>
            )}
            {order.purchaseOrderNumber && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">PO Number</label>
                <p className="text-gray-900 font-mono text-sm">{order.purchaseOrderNumber}</p>
              </div>
            )}
            {order.receivedDate && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Received Date</label>
                <p className="text-gray-900">{new Date(order.receivedDate).toLocaleDateString()}</p>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">Justification</label>
          <p className="text-gray-900 whitespace-pre-wrap">{order.justification}</p>
        </div>
      </div>

      {/* Requestor Information */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Requestor</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Name</label>
            <p className="text-gray-900">{order.requestor.name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
            <a href={`mailto:${order.requestor.email}`} className="text-sky-700 hover:underline">
              {order.requestor.email}
            </a>
          </div>
          {order.requestor.organization && (
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Organization</label>
              <p className="text-gray-900">{order.requestor.organization}</p>
            </div>
          )}
          {order.requestor.phoneNumber && (
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Phone</label>
              <a href={`tel:${order.requestor.phoneNumber}`} className="text-sky-700 hover:underline">
                {order.requestor.phoneNumber}
              </a>
            </div>
          )}
        </div>

        {order.approver && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Approved By</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Name</label>
                <p className="text-gray-900">{order.approver.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Date</label>
                <p className="text-gray-900">
                  {order.approvedAt ? new Date(order.approvedAt).toLocaleDateString() : '-'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Status History</h2>
        <div className="space-y-4">
          {order.statusHistory.map((history) => (
            <div key={history.id} className="flex gap-4 pb-4 border-b border-gray-200 last:border-0 last:pb-0">
              <div className="flex-shrink-0 pt-1">
                <OrderStatusBadge status={history.status} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">{history.notes}</p>
                <p className="text-xs text-gray-500 mt-1">
                  by {history.changedBy.name} •{' '}
                  {formatDistanceToNow(new Date(history.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      {order.notes.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
          <div className="space-y-4">
            {order.notes.map((note) => (
              <div key={note.id} className="pb-4 border-b border-gray-200 last:border-0 last:pb-0">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm font-medium text-gray-900">{note.createdBy.name}</p>
                  <div className="flex items-center gap-2">
                    {note.noteType !== 'GENERAL' && (
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                        {note.noteType.replace('_', ' ')}
                      </span>
                    )}
                    <p className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
