"use client"

import { useState } from 'react'

type ChecklistStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'MISSING'

interface ChecklistItem {
  id: string
  type: string
  status: ChecklistStatus
}

interface ChecklistActionsProps {
  referralId: string
  item: ChecklistItem
  canUpdate: boolean
  isOwner: boolean
}

export default function ChecklistActions({
  referralId,
  item,
  canUpdate,
  isOwner,
}: ChecklistActionsProps) {
  const [status, setStatus] = useState<ChecklistStatus>(item.status)
  const [reason, setReason] = useState('')
  const [fileList, setFileList] = useState<FileList | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleStatusUpdate() {
    setSaving(true)
    setMessage('')
    try {
      const response = await fetch(
        `/api/referrals/${referralId}/checklist/${item.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, rejectionReason: reason }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to update status')
      }

      setMessage('Status updated')
    } catch (error) {
      setMessage('Update failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpload() {
    if (!fileList || fileList.length === 0) return
    setUploading(true)
    setMessage('')

    try {
      const formData = new FormData()
      formData.append('checklistType', item.type)
      Array.from(fileList).forEach((file) => {
        formData.append(file.name, file)
      })

      const response = await fetch(`/api/referrals/${referralId}/documents`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to upload')
      }

      setMessage('Upload complete')
      setFileList(null)
    } catch (error) {
      setMessage('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const shouldShowUpload = isOwner && (item.status === 'REJECTED' || item.status === 'MISSING')

  return (
    <div className="mt-3 space-y-2">
      {canUpdate && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as ChecklistStatus)}
              className="rounded-xl border border-cream-200/80 bg-white/70 px-3 py-2 text-xs text-warm-gray-800 shadow-sm"
            >
              <option value="PENDING">Pending</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="REJECTED">Rejected</option>
              <option value="MISSING">Missing</option>
            </select>
            <input
              type="text"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Reason (required if rejected)"
              className="flex-1 rounded-xl border border-cream-200/80 bg-white/70 px-3 py-2 text-xs text-warm-gray-800 shadow-sm"
            />
            <button
              type="button"
              onClick={handleStatusUpdate}
              disabled={saving}
              className="rounded-xl bg-sky-600 px-3 py-2 text-xs text-white hover:bg-sky-700 disabled:bg-warm-gray-400"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {shouldShowUpload && (
        <div className="flex flex-col gap-2">
          <input
            type="file"
            multiple
            onChange={(event) => setFileList(event.target.files)}
            className="block w-full text-xs text-warm-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-cream-100 file:text-warm-gray-700 hover:file:bg-cream-200"
          />
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading || !fileList}
            className="self-start rounded-xl bg-cream-200/80 px-3 py-2 text-xs text-warm-gray-700 hover:bg-cream-300/80 disabled:bg-warm-gray-400"
          >
            {uploading ? 'Uploading...' : 'Upload Replacement'}
          </button>
        </div>
      )}

      {message && <p className="text-xs text-warm-gray-600">{message}</p>}
    </div>
  )
}
