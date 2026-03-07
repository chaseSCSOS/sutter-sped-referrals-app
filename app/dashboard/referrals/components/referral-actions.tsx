'use client'

import { useState } from 'react'
import StatusUpdateModal from './status-update-modal'
import AddNoteModal from './add-note-modal'
import type { ReferralStatus } from '@prisma/client'

interface ReferralActionsProps {
  referralId: string
  currentStatus: ReferralStatus
}

export default function ReferralActions({ referralId, currentStatus }: ReferralActionsProps) {
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-cream-200 overflow-hidden">
        <div className="px-6 pt-6 pb-2">
          <h2 className="text-sm font-semibold text-warm-gray-900">Actions</h2>
        </div>
        <div className="px-6 pb-6 space-y-2 mt-2">
          <button
            onClick={() => setShowStatusModal(true)}
            className="w-full bg-sky-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-sky-700 transition-colors"
          >
            Update Status
          </button>
          <button
            onClick={() => setShowNoteModal(true)}
            className="w-full bg-cream-100 text-warm-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-cream-200 transition-colors"
          >
            Add Note
          </button>
        </div>
      </div>

      {showStatusModal && (
        <StatusUpdateModal
          referralId={referralId}
          currentStatus={currentStatus}
          onClose={() => setShowStatusModal(false)}
        />
      )}

      {showNoteModal && (
        <AddNoteModal referralId={referralId} onClose={() => setShowNoteModal(false)} />
      )}
    </>
  )
}
