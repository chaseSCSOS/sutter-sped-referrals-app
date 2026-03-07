'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import OrderStatusBadge from '../components/order-status-badge'
import UpdateStatusModal from '../components/update-status-modal'
import ProductLink from '../components/product-link'
import { formatDistanceToNow } from 'date-fns'

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [order, setOrder] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [submittingNote, setSubmittingNote] = useState(false)
  const [noteError, setNoteError] = useState('')

  useEffect(() => {
    async function fetchOrder() {
      const { id } = await params
      const response = await fetch(`/api/orders/${id}`)
      if (!response.ok) {
        router.push('/dashboard/orders')
        return
      }
      const data = await response.json()
      setOrder(data.order)
      setUser(data.user)
      setLoading(false)
    }
    fetchOrder()
  }, [params, router])

  const handleDelete = async () => {
    if (!order) return
    setDeleting(true)
    setDeleteError('')
    try {
      const response = await fetch(`/api/orders/${order.id}`, { method: 'DELETE' })
      if (response.ok) {
        router.push('/dashboard/orders')
      } else {
        const result = await response.json()
        setDeleteError(result.error || 'Failed to delete order')
        setDeleting(false)
      }
    } catch {
      setDeleteError('An unexpected error occurred')
      setDeleting(false)
    }
  }

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!noteContent.trim() || !order) return
    
    setSubmittingNote(true)
    setNoteError('')
    try {
      const response = await fetch(`/api/orders/${order.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: noteContent }),
      })
      
      if (response.ok) {
        setNoteContent('')
        const { id } = await params
        const refreshResponse = await fetch(`/api/orders/${id}`)
        const data = await refreshResponse.json()
        setOrder(data.order)
      } else {
        const result = await response.json()
        setNoteError(result.error || 'Failed to add note')
      }
    } catch {
      setNoteError('An unexpected error occurred')
    } finally {
      setSubmittingNote(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-cream-200 border-t-sky-500" />
      </div>
    )
  }

  if (!order || !user) {
    return (
      <div className="max-w-lg mx-auto mt-20">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <h2 className="text-xl font-semibold text-red-900 mb-2">Order Not Found</h2>
          <p className="text-red-700">The order you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  const isRequestor = order.requestorId === user.id

  const canManage = ['SPED_STAFF', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)
  const canDelete = ['ADMIN', 'SUPER_ADMIN'].includes(user.role)
  const itemCount = order.items.length
  const title = itemCount === 1 ? order.items[0].itemName : `Order with ${itemCount} Items`

  return (
    <div className="max-w-[1600px] mx-auto space-y-5">
      {/* Back link */}
      <Link
        href="/dashboard/orders"
        className="inline-flex items-center gap-1.5 text-sm text-warm-gray-500 hover:text-warm-gray-800 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        All Orders
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-xl shadow-sm border border-cream-200 overflow-hidden">
        {/* Title + status + actions row */}
        <div className="px-6 pt-5 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-warm-gray-900 leading-snug">{title}</h1>
                <OrderStatusBadge status={order.status} />
              </div>
              <p className="text-sm text-warm-gray-500">{order.requestor.name}</p>
            </div>
            {canManage && (
              <div className="flex items-center gap-2 flex-shrink-0">
                {!['CANCELLED', 'COMPLETED'].includes(order.status) && (
                  <button
                    onClick={() => setShowStatusModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700 font-medium transition-colors text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Update Status
                  </button>
                )}
                {canDelete && !showDeleteConfirm && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-red-600 rounded-lg hover:bg-red-50 font-medium transition-colors text-sm border border-red-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                )}
                {canDelete && showDeleteConfirm && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                    <span className="text-sm font-medium text-red-700">Delete permanently?</span>
                    {deleteError && <span className="text-xs text-red-600">{deleteError}</span>}
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="px-2.5 py-1 bg-red-600 text-white rounded-md text-xs font-semibold hover:bg-red-700 disabled:opacity-60 transition-colors"
                    >
                      {deleting ? 'Deleting…' : 'Yes'}
                    </button>
                    <button
                      onClick={() => { setShowDeleteConfirm(false); setDeleteError('') }}
                      className="px-2.5 py-1 bg-white text-warm-gray-700 rounded-md text-xs font-semibold hover:bg-warm-gray-100 border border-warm-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Info strip — 4 columns, fills full width */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-cream-200 divide-x divide-cream-200 bg-cream-50/60">
          <div className="px-5 py-3">
            <p className="text-[11px] font-bold text-warm-gray-400 uppercase tracking-wider mb-1">School / Site</p>
            <p className="text-sm font-semibold text-warm-gray-900">{order.schoolSite}</p>
          </div>
          <div className="px-5 py-3">
            <p className="text-[11px] font-bold text-warm-gray-400 uppercase tracking-wider mb-1">Submitted</p>
            <p className="text-sm font-semibold text-warm-gray-900">{new Date(order.createdAt).toLocaleDateString()}</p>
            <p className="text-xs text-warm-gray-400 mt-0.5">{formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}</p>
          </div>
          <div className="px-5 py-3">
            <p className="text-[11px] font-bold text-warm-gray-400 uppercase tracking-wider mb-1">Order #</p>
            <p className="text-sm font-semibold text-warm-gray-900 font-mono">#{order.orderNumber}</p>
            <p className="text-xs text-warm-gray-400 mt-0.5">{itemCount} {itemCount === 1 ? 'item' : 'items'}</p>
          </div>
          <div className="px-5 py-3">
            <p className="text-[11px] font-bold text-warm-gray-400 uppercase tracking-wider mb-1">Est. Total</p>
            <p className="text-2xl font-bold text-warm-gray-900">${Number(order.totalEstimatedPrice).toFixed(2)}</p>
            {order.totalActualPrice && (
              <p className="text-xs font-semibold text-sage-700 mt-0.5">Actual: ${Number(order.totalActualPrice).toFixed(2)}</p>
            )}
          </div>
        </div>
      </div>

      {/* Rejection Reason */}
      {order.status === 'CANCELLED' && order.rejectionReason && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-red-900 mb-2">Cancellation Reason</h3>
          <p className="text-red-800">{order.rejectionReason}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          {/* Order Items */}
          <div className="bg-white rounded-xl shadow-sm border border-cream-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-cream-200 bg-cream-50/70">
              <h2 className="text-sm font-semibold text-warm-gray-900">Ordered Items</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-cream-50 border-y border-cream-200">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-warm-gray-500 uppercase tracking-wider">Item</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-warm-gray-500 uppercase tracking-wider">Qty</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-warm-gray-500 uppercase tracking-wider">Unit</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-warm-gray-500 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-200">
                  {order.items.map((item: any) => {
                    const itemTotal = Number(item.estimatedPrice) * item.quantity
                    return (
                      <tr key={item.id} className="hover:bg-cream-50/60">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-warm-gray-900">{item.itemName}</p>
                            {item.itemLink && (
                              <ProductLink href={item.itemLink} />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-warm-gray-900">{item.quantity}</td>
                        <td className="px-4 py-3 text-right text-sm text-warm-gray-900">
                          ${Number(item.estimatedPrice).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-warm-gray-900">
                          ${itemTotal.toFixed(2)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-cream-50 border-t border-cream-200">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-right text-xs font-semibold text-warm-gray-600">Total Estimated</td>
                    <td className="px-4 py-3 text-right text-base font-bold text-warm-gray-900">
                      ${Number(order.totalEstimatedPrice).toFixed(2)}
                    </td>
                  </tr>
                  {order.totalActualPrice && (
                    <tr>
                      <td colSpan={3} className="px-4 py-2 text-right text-xs font-semibold text-warm-gray-600">Total Actual</td>
                      <td className="px-4 py-2 text-right text-base font-bold text-sage-700">
                        ${Number(order.totalActualPrice).toFixed(2)}
                      </td>
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>
          </div>

          {/* Order Details */}
          <div className="bg-white rounded-xl shadow-sm border border-cream-200 p-4 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-warm-gray-900 mb-3">Order Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {order.vendor && (
                  <div>
                    <label className="block text-xs font-semibold text-warm-gray-500 mb-1">Vendor</label>
                    <p className="text-sm text-warm-gray-900">{order.vendor}</p>
                  </div>
                )}
                {order.trackingNumber && (
                  <div>
                    <label className="block text-xs font-semibold text-warm-gray-500 mb-1">Tracking Number</label>
                    <p className="text-sm text-warm-gray-900 font-mono">{order.trackingNumber}</p>
                  </div>
                )}
                {order.purchaseOrderNumber && (
                  <div>
                    <label className="block text-xs font-semibold text-warm-gray-500 mb-1">PO Number</label>
                    <p className="text-sm text-warm-gray-900 font-mono">{order.purchaseOrderNumber}</p>
                  </div>
                )}
                {order.receivedDate && (
                  <div>
                    <label className="block text-xs font-semibold text-warm-gray-500 mb-1">Received Date</label>
                    <p className="text-sm text-warm-gray-900">{new Date(order.receivedDate).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-warm-gray-500 mb-1">Justification</label>
              <p className="text-sm text-warm-gray-900 whitespace-pre-wrap">{order.justification}</p>
            </div>
          </div>

          {/* Add Note */}
          <div className="bg-white rounded-xl shadow-sm border border-cream-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-cream-200 bg-cream-50/70">
              <h2 className="text-xs font-bold text-warm-gray-500 uppercase tracking-wide">Add Note</h2>
            </div>
            <form onSubmit={handleAddNote} className="p-4">
              {noteError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-3 border border-red-100">
                  {noteError}
                </div>
              )}
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                rows={3}
                placeholder="Add a note about this order…"
                className="w-full rounded-lg border border-cream-200 bg-white px-3 py-2 text-sm text-warm-gray-800 shadow-sm transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200/70 focus:outline-none resize-none"
              />
              <div className="flex justify-end mt-3">
                <button
                  type="submit"
                  disabled={submittingNote || !noteContent.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:bg-warm-gray-300 disabled:cursor-not-allowed font-medium transition-colors text-sm"
                >
                  {submittingNote ? 'Adding…' : 'Add Note'}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="space-y-5">
          {/* Requestor Information */}
          <div className="bg-white rounded-xl shadow-sm border border-cream-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-cream-200 bg-cream-50/70">
              <h2 className="text-xs font-bold text-warm-gray-500 uppercase tracking-wide">Requestor</h2>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-warm-gray-400 uppercase tracking-wider mb-1">Name</label>
                <p className="text-sm font-semibold text-warm-gray-900">{order.requestor.name}</p>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-warm-gray-400 uppercase tracking-wider mb-1">Email</label>
                <a href={`mailto:${order.requestor.email}`} className="text-sm font-medium text-sky-700 hover:underline">
                  {order.requestor.email}
                </a>
              </div>
              {order.requestor.organization && (
                <div>
                  <label className="block text-[11px] font-bold text-warm-gray-400 uppercase tracking-wider mb-1">Organization</label>
                  <p className="text-sm font-semibold text-warm-gray-900">{order.requestor.organization}</p>
                </div>
              )}
              {order.requestor.phoneNumber && (
                <div>
                  <label className="block text-[11px] font-bold text-warm-gray-400 uppercase tracking-wider mb-1">Phone</label>
                  <a href={`tel:${order.requestor.phoneNumber}`} className="text-sm font-medium text-sky-700 hover:underline">
                    {order.requestor.phoneNumber}
                  </a>
                </div>
              )}
            </div>

            {order.approver && (
              <div className="border-t border-cream-200 bg-cream-50/40 px-4 py-3">
                <h3 className="text-[11px] font-bold text-warm-gray-400 uppercase tracking-wider mb-3">Approved By</h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-semibold text-warm-gray-900">{order.approver.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-warm-gray-500">
                      {order.approvedAt ? new Date(order.approvedAt).toLocaleDateString() : '-'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Status History */}
          <div className="bg-white rounded-xl shadow-sm border border-cream-200 p-4">
            <h2 className="text-sm font-semibold text-warm-gray-900 mb-3">Status History</h2>
            <div className="space-y-3">
              {order.statusHistory.map((history: any) => (
                <div key={history.id} className="flex gap-3 pb-3 border-b border-cream-200 last:border-0 last:pb-0">
                  <div className="flex-shrink-0 pt-0.5">
                    <OrderStatusBadge status={history.status} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-warm-gray-900">{history.notes}</p>
                    <p className="text-xs text-warm-gray-500 mt-1">
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
            <div className="bg-white rounded-xl shadow-sm border border-cream-200 p-4">
              <h2 className="text-sm font-semibold text-warm-gray-900 mb-3">Notes</h2>
              <div className="space-y-3">
                {order.notes.map((note: any) => (
                  <div key={note.id} className="pb-3 border-b border-cream-200 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm font-medium text-warm-gray-900">{note.createdBy.name}</p>
                      <div className="flex items-center gap-2">
                        {note.noteType !== 'GENERAL' && (
                          <span className="text-[11px] px-2 py-0.5 bg-cream-100 text-warm-gray-600 rounded">
                            {note.noteType.replace('_', ' ')}
                          </span>
                        )}
                        <p className="text-[11px] text-warm-gray-500">
                          {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-warm-gray-700 whitespace-pre-wrap">{note.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showStatusModal && (
        <UpdateStatusModal
          orderId={order.id}
          currentStatus={order.status}
          onClose={() => setShowStatusModal(false)}
          onSuccess={() => {
            setShowStatusModal(false)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
