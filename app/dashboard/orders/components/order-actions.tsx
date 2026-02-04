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
}

export default function OrderActions({ orderId, currentStatus }: OrderActionsProps) {
  const router = useRouter()
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)

  const canApprove = ['NEW'].includes(currentStatus)
  const canReject = ['NEW'].includes(currentStatus)
  const canUpdateStatus = !['CANCELLED', 'COMPLETED'].includes(currentStatus)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Actions</h3>
      <div className="flex flex-wrap gap-2">
        {canApprove && (
          <button
            onClick={() => setShowApproveModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium transition-colors"
          >
            Approve Order
          </button>
        )}
        {canReject && (
          <button
            onClick={() => setShowRejectModal(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium transition-colors"
          >
            Reject Order
          </button>
        )}
        {canUpdateStatus && (
          <button
            onClick={() => setShowStatusModal(true)}
            className="px-4 py-2 bg-sky-600 text-white rounded-xl hover:bg-sky-700 font-medium transition-colors"
          >
            Update Status
          </button>
        )}
        <button
          onClick={() => setShowNoteModal(true)}
          className="px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 font-medium transition-colors"
        >
          Add Note
        </button>
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
