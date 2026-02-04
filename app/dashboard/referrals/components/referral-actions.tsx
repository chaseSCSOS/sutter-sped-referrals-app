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
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
        <div className="space-y-2">
          <button
            onClick={() => setShowStatusModal(true)}
            className="w-full bg-sky-600 text-white px-4 py-2 rounded-xl hover:bg-sky-700 transition-colors"
          >
            Update Status
          </button>
          <button
            onClick={() => setShowNoteModal(true)}
            className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-300 transition-colors"
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
