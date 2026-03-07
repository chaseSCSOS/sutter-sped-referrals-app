'use client'

import { useState } from 'react'
import type { OrderStatus } from '@prisma/client'

interface UpdateStatusModalProps {
  orderId: string
  currentStatus: OrderStatus
  onClose: () => void
  onSuccess: () => void
}

const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ['SHIPPED', 'CANCELLED'],           // Submitted → Placed, Cancelled
  SHIPPED: ['RECEIVED', 'CANCELLED'],       // Placed → Ready for Pickup, Cancelled  
  RECEIVED: ['COMPLETED', 'CANCELLED'],     // Ready for Pickup → Completed, Cancelled
  COMPLETED: [],                            // Completed (no further transitions)
  CANCELLED: [],                            // Cancelled (no further transitions)
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: 'Submitted',
  SHIPPED: 'Placed',
  RECEIVED: 'Ready for Pickup',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

export default function UpdateStatusModal({
  orderId,
  currentStatus,
  onClose,
  onSuccess,
}: UpdateStatusModalProps) {
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const availableStatuses = STATUS_TRANSITIONS[currentStatus]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!status) {
      setError('Please select a status')
      return
    }

    setError('')
    setSubmitting(true)

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes }),
      })

      if (response.ok) {
        onSuccess()
      } else {
        const result = await response.json()
        setError(result.error || 'Failed to update status')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[9999]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-warm-gray-900">Update Order Status</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-warm-gray-400 hover:text-warm-gray-700 hover:bg-warm-gray-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-sm text-warm-gray-500 mb-4">
          Current: <span className="font-medium text-warm-gray-700">{STATUS_LABELS[currentStatus]}</span>
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-warm-gray-700 mb-1.5">
              New Status <span className="text-red-500">*</span>
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as OrderStatus)}
              required
              className="w-full rounded-lg border border-cream-200/80 bg-white px-3 py-2.5 text-sm text-warm-gray-800 shadow-sm transition focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-200/70 focus-visible:outline-none"
            >
              <option value="">Select new status…</option>
              {Object.keys(STATUS_LABELS).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s as OrderStatus]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-warm-gray-700 mb-1.5">
              Notes <span className="text-warm-gray-400">(optional)</span>
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-cream-200/80 bg-white px-3 py-2 text-sm text-warm-gray-800 shadow-sm transition focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-200/70 focus-visible:outline-none resize-none"
              placeholder="Add any notes about this status change…"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-warm-gray-100 text-warm-gray-700 rounded-lg hover:bg-warm-gray-200 font-medium transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !status}
              className="flex-1 px-4 py-2.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:bg-warm-gray-300 disabled:cursor-not-allowed font-medium transition-colors text-sm"
            >
              {submitting ? 'Updating…' : 'Update Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
