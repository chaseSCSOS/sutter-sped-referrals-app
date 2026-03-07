'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { OrderStatus } from '@prisma/client'
import ApproveOrderModal from './approve-order-modal'
import RejectOrderModal from './reject-order-modal'
import UpdateStatusModal from './update-status-modal'
import AddNoteModal from './add-note-modal'

interface OrderActionsProps {
  orderId: string
  currentStatus: OrderStatus
  canDelete?: boolean
}

export default function OrderActions({ orderId, currentStatus, canDelete = false }: OrderActionsProps) {
  const router = useRouter()
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const canApprove = ['NEW'].includes(currentStatus)
  const canReject = ['NEW'].includes(currentStatus)
  const canUpdateStatus = !['CANCELLED', 'COMPLETED'].includes(currentStatus)

  const handleDelete = async () => {
    setDeleting(true)
    setDeleteError('')
    try {
      const response = await fetch(`/api/orders/${orderId}`, { method: 'DELETE' })
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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-cream-200 overflow-hidden">
      <div className="px-4 py-3 bg-cream-50/70 border-b border-cream-200">
        <h3 className="text-xs font-semibold text-warm-gray-500 uppercase tracking-wide">Order Actions</h3>
      </div>
      <div className="p-3 flex flex-wrap items-center gap-2">
        {canApprove && (
          <button
            onClick={() => setShowApproveModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Approve Order
          </button>
        )}
        {canReject && (
          <button
            onClick={() => setShowRejectModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Reject Order
          </button>
        )}
        {canUpdateStatus && (
          <button
            onClick={() => setShowStatusModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 font-medium transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Update Status
          </button>
        )}
        <button
          onClick={() => setShowNoteModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-warm-gray-100 text-warm-gray-700 rounded-lg hover:bg-warm-gray-200 font-medium transition-colors text-sm border border-warm-gray-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Add Note
        </button>

        {canDelete && !showDeleteConfirm && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-red-600 rounded-lg hover:bg-red-50 font-medium transition-colors text-sm border border-red-200 ml-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete Order
          </button>
        )}

        {canDelete && showDeleteConfirm && (
          <div className="ml-auto flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
            <span className="text-sm font-medium text-red-700">Delete this order permanently?</span>
            {deleteError && <span className="text-xs text-red-600">{deleteError}</span>}
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-2.5 py-1 bg-red-600 text-white rounded-md text-xs font-semibold hover:bg-red-700 disabled:opacity-60 transition-colors"
            >
              {deleting ? 'Deleting…' : 'Yes, Delete'}
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

      {showApproveModal && (
        <ApproveOrderModal
          orderId={orderId}
          onClose={() => setShowApproveModal(false)}
          onSuccess={() => {
            setShowApproveModal(false)
            router.refresh()
          }}
        />
      )}

      {showRejectModal && (
        <RejectOrderModal
          orderId={orderId}
          onClose={() => setShowRejectModal(false)}
          onSuccess={() => {
            setShowRejectModal(false)
            router.refresh()
          }}
        />
      )}

      {showStatusModal && (
        <UpdateStatusModal
          orderId={orderId}
          currentStatus={currentStatus}
          onClose={() => setShowStatusModal(false)}
          onSuccess={() => {
            setShowStatusModal(false)
            router.refresh()
          }}
        />
      )}

      {showNoteModal && (
        <AddNoteModal
          orderId={orderId}
          onClose={() => setShowNoteModal(false)}
          onSuccess={() => {
            setShowNoteModal(false)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
