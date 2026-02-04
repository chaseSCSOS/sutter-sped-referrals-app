'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { NoteType } from '@prisma/client'

interface AddNoteModalProps {
  referralId: string
  onClose: () => void
}

const NOTE_TYPES: { value: NoteType; label: string }[] = [
  { value: 'GENERAL', label: 'General Note' },
  { value: 'PHONE_CALL', label: 'Phone Call' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'MEETING', label: 'Meeting' },
  { value: 'DOCUMENT_RECEIVED', label: 'Document Received' },
  { value: 'DECISION_MADE', label: 'Decision Made' },
]

export default function AddNoteModal({ referralId, onClose }: AddNoteModalProps) {
  const [content, setContent] = useState('')
  const [noteType, setNoteType] = useState<NoteType>('GENERAL')
  const [isImportant, setIsImportant] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`/api/referrals/${referralId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          noteType,
          isImportant,
        }),
      })

      if (response.ok) {
        router.refresh()
        onClose()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to add note')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="panel-strong rounded-2xl shadow-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-warm-gray-900">Add Note</h2>
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
              <label htmlFor="noteType" className="block text-sm font-medium text-warm-gray-700 mb-1">
                Note Type
              </label>
              <select
                id="noteType"
                value={noteType}
                onChange={(e) => setNoteType(e.target.value as NoteType)}
                className="w-full rounded-xl border border-cream-200/80 bg-white/70 px-3 py-2 text-sm text-warm-gray-800 shadow-sm transition focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-200/70 focus-visible:outline-none"
              >
                {NOTE_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="content" className="block text-sm font-medium text-warm-gray-700 mb-1">
                Note Content *
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                rows={5}
                className="w-full rounded-xl border border-cream-200/80 bg-white/70 px-3 py-2 text-sm text-warm-gray-800 shadow-sm transition focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-200/70 focus-visible:outline-none"
                placeholder="Enter note details..."
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isImportant"
                checked={isImportant}
                onChange={(e) => setIsImportant(e.target.checked)}
                className="h-4 w-4 rounded-md border border-cream-200/80 text-sky-700 accent-sky-600 focus-visible:ring-2 focus-visible:ring-sky-200/70"
              />
              <label htmlFor="isImportant" className="text-sm text-warm-gray-700">
                Mark as important
              </label>
            </div>

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
                {loading ? 'Adding...' : 'Add Note'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
