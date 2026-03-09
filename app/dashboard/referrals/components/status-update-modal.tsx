'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ReferralStatus } from '@prisma/client'

interface StatusUpdateModalProps {
  referralId: string
  currentStatus: ReferralStatus
  onClose: () => void
}

const STATUSES: { value: string; label: string }[] = [
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'MISSING_DOCUMENTS', label: 'Missing Documents' },
  { value: 'PENDING_ADDITIONAL_INFO', label: 'Pending Additional Info' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'ACCEPTED_AWAITING_PLACEMENT', label: 'Accepted - Awaiting Placement' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'NOT_ENROLLING', label: 'Not Enrolling' },
  { value: 'WITHDRAWN', label: 'Withdrawn' },
]

const REASON_REQUIRED_STATUSES = new Set(['REJECTED', 'NOT_ENROLLING', 'WITHDRAWN'])

const COMMON_MISSING_DOCUMENTS = [
  'IEP (Individualized Education Program)',
  'Student Registration Form',
  'Home Language Survey',
  'Most Recent Assessments',
  'Medical Records',
  'Progress Reports',
  'Behavior Intervention Plan',
  '504 Plan',
  'Proof of Residency',
  'Birth Certificate',
]

export default function StatusUpdateModal({ referralId, currentStatus, onClose }: StatusUpdateModalProps) {
  const [status, setStatus] = useState<string>(currentStatus as string)
  const [reason, setReason] = useState('')
  const [missingItems, setMissingItems] = useState<string[]>([])
  const [selectedCommonItems, setSelectedCommonItems] = useState<Set<string>>(new Set())
  const [newItem, setNewItem] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // Combine selected common items with manually added items
    const allMissingItems = [
      ...Array.from(selectedCommonItems),
      ...missingItems,
    ]

    // For rejections, require either a reason OR missing items
    if (status === 'REJECTED' && !reason && allMissingItems.length === 0) {
      setError('Please provide a reason or select missing items for rejection')
      return
    }

    // NOT_ENROLLING and WITHDRAWN require a reason
    if ((status === 'NOT_ENROLLING' || status === 'WITHDRAWN') && !reason) {
      setError('A reason is required for this status change')
      return
    }

    setLoading(true)

    try {
      // Auto-generate reason from missing items if no custom reason provided
      let finalReason = reason
      if (status === 'REJECTED' && !reason && allMissingItems.length > 0) {
        finalReason = `Missing certain forms or information. Please re-submit with: ${allMissingItems.join(', ')}.`
      }

      const response = await fetch(`/api/referrals/${referralId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          reason: finalReason || undefined,
          missingItems: status === 'REJECTED' && allMissingItems.length > 0 ? allMissingItems : undefined,
        }),
      })

      if (response.ok) {
        router.refresh()
        onClose()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to update status')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  function toggleCommonItem(item: string) {
    const newSelected = new Set(selectedCommonItems)
    if (newSelected.has(item)) {
      newSelected.delete(item)
    } else {
      newSelected.add(item)
    }
    setSelectedCommonItems(newSelected)
  }

  function addMissingItem() {
    if (newItem.trim()) {
      setMissingItems([...missingItems, newItem.trim()])
      setNewItem('')
    }
  }

  function removeMissingItem(index: number) {
    setMissingItems(missingItems.filter((_, i) => i !== index))
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="panel-strong rounded-2xl shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-warm-gray-900">Update Status</h2>
            <button
              onClick={onClose}
              className="text-warm-gray-400 hover:text-warm-gray-700 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-coral-50 text-coral-600 p-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-warm-gray-700 mb-1">
                New Status *
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ReferralStatus)}
                required
                className="w-full rounded-xl border border-cream-200/80 bg-white/70 px-3 py-2 text-sm text-warm-gray-800 shadow-sm transition focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-200/70 focus-visible:outline-none"
              >
                {STATUSES.map(s => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-warm-gray-700 mb-1">
                Reason / Notes {status === 'REJECTED' && <span className="text-red-500">*</span>}
              </label>
              {status === 'REJECTED' && (selectedCommonItems.size > 0 || missingItems.length > 0) && (
                <div className="mb-2 p-3 bg-sky-50/80 border border-sky-200/70 rounded-xl text-sm">
                  <p className="text-sky-800 font-medium mb-1">Auto-generated message preview:</p>
                  <p className="text-sky-700 italic">
                    Missing certain forms or information. Please re-submit with:{' '}
                    {[...Array.from(selectedCommonItems), ...missingItems].join(', ')}.
                  </p>
                </div>
              )}
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-cream-200/80 bg-white/70 px-3 py-2 text-sm text-warm-gray-800 shadow-sm transition focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-200/70 focus-visible:outline-none"
                placeholder={
                  status === 'REJECTED'
                    ? 'Additional notes or context (optional if missing items are selected above)...'
                    : 'Provide details about this status change...'
                }
              />
            </div>

            {status === 'REJECTED' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-warm-gray-700 mb-3">
                    Missing Documents <span className="text-warm-gray-600">(Select all that apply)</span>
                  </label>
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto border border-cream-200/70 rounded-xl p-3 bg-cream-100/70">
                    {COMMON_MISSING_DOCUMENTS.map((doc) => (
                      <label key={doc} className="flex items-center gap-2 cursor-pointer hover:bg-white/70 p-2 rounded-xl">
                        <input
                          type="checkbox"
                          checked={selectedCommonItems.has(doc)}
                          onChange={() => toggleCommonItem(doc)}
                          className="h-4 w-4 rounded-md border border-cream-200/80 text-sky-700 accent-sky-600 focus-visible:ring-2 focus-visible:ring-sky-200/70"
                        />
                        <span className="text-sm text-warm-gray-700">{doc}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-warm-gray-700 mb-2">
                    Additional Missing Items
                  </label>
                  <div className="space-y-2">
                    {missingItems.map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="flex-1 text-sm bg-cream-100/80 px-3 py-2 rounded-xl">{item}</span>
                        <button
                          type="button"
                          onClick={() => removeMissingItem(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newItem}
                        onChange={(e) => setNewItem(e.target.value)}
                        placeholder="Add other missing item..."
                        className="flex-1 rounded-xl border border-cream-200/80 bg-white/70 px-3 py-2 text-sm text-warm-gray-800 shadow-sm transition focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-200/70 focus-visible:outline-none"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            addMissingItem()
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={addMissingItem}
                        className="px-4 py-2 bg-cream-200/80 text-warm-gray-700 rounded-xl hover:bg-cream-300/80 text-sm"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-cream-200/80 text-warm-gray-700 rounded-xl hover:bg-cream-300/80 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-sky-600 text-white rounded-xl hover:bg-sky-700 disabled:bg-warm-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
