'use client'

import { useState } from 'react'
import type { NoteType } from '@prisma/client'

interface AddNoteModalProps {
  orderId: string
  onClose: () => void
  onSuccess: () => void
}

const NOTE_TYPES: { value: NoteType; label: string }[] = [
  { value: 'GENERAL', label: 'General' },
  { value: 'PHONE_CALL', label: 'Phone Call' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'MEETING', label: 'Meeting' },
  { value: 'DOCUMENT_RECEIVED', label: 'Document Received' },
  { value: 'DECISION_MADE', label: 'Decision Made' },
]

export default function AddNoteModal({ orderId, onClose, onSuccess }: AddNoteModalProps) {
  const [content, setContent] = useState('')
  const [noteType, setNoteType] = useState<NoteType>('GENERAL')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!content.trim()) {
      setError('Note content is required')
      return
    }

    setError('')
    setSubmitting(true)

    try {
      const response = await fetch(`/api/orders/${orderId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, noteType }),
      })

      if (response.ok) {
        onSuccess()
      } else {
        const result = await response.json()
        setError(result.error || 'Failed to add note')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Add Note</h2>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="noteType" className="block text-sm font-medium text-gray-700 mb-1">
              Note Type
            </label>
            <select
              id="noteType"
              value={noteType}
              onChange={(e) => setNoteType(e.target.value as NoteType)}
              className="w-full rounded-xl border border-cream-200/80 bg-white/70 px-3 py-2 text-sm text-warm-gray-800 shadow-sm transition focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-200/70 focus-visible:outline-none"
            >
              {NOTE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
              Note Content *
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              required
              className="w-full rounded-xl border border-cream-200/80 bg-white/70 px-3 py-2 text-sm text-warm-gray-800 shadow-sm transition focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-200/70 focus-visible:outline-none"
              placeholder="Enter your note..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-sky-600 text-white rounded-xl hover:bg-sky-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {submitting ? 'Adding...' : 'Add Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
