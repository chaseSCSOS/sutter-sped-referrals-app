'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AddNoteModal from './add-note-modal'

interface RequestorAddNoteProps {
  orderId: string
}

export default function RequestorAddNote({ orderId }: RequestorAddNoteProps) {
  const [showModal, setShowModal] = useState(false)
  const router = useRouter()

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-cream-200 p-4">
        <h3 className="text-sm font-semibold text-warm-gray-900 mb-3">Actions</h3>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-warm-gray-600 text-white rounded-xl hover:bg-warm-gray-700 font-medium transition-colors text-sm"
        >
          Add Note
        </button>
      </div>

      {showModal && (
        <AddNoteModal
          orderId={orderId}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false)
            router.refresh()
          }}
        />
      )}
    </>
  )
}
