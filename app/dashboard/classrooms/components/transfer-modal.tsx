'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { formatGradeRange } from '@/lib/constants/grades'

const SILO_LABELS: Record<string, string> = {
  ASD_ELEM: 'ASD-Elem',
  ASD_MIDHS: 'ASD-MidHS',
  SD: 'SD',
  NC: 'NC',
  DHH: 'DHH',
  ATP: 'ATP',
  MD: 'MD',
}


const TRANSFER_REASONS = [
  { value: 'GRADE_PROMOTION', label: 'Grade Promotion' },
  { value: 'CASELOAD_BALANCE', label: 'Caseload Balance' },
  { value: 'BEHAVIOR_PLACEMENT_CHANGE', label: 'Behavior / Placement Change' },
  { value: 'PROGRAM_CHANGE', label: 'Program Change' },
  { value: 'PARENT_REQUEST', label: 'Parent Request' },
  { value: 'OTHER', label: 'Other' },
]

interface Classroom {
  id: string
  programSilo: string
  gradeStart: string
  gradeEnd: string
  sessionType: string
  schoolYear: string
  site: { name: string }
  teacher: { name: string } | null
}

interface TransferModalProps {
  placementId: string
  studentName: string
  currentClassroomId?: string | null
  schoolYear: string
  has1to1?: boolean
  onSuccess?: () => void
}

export default function TransferModal({
  placementId,
  studentName,
  currentClassroomId,
  schoolYear,
  has1to1 = false,
  onSuccess,
}: TransferModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [loadingClassrooms, setLoadingClassrooms] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [toClassroomId, setToClassroomId] = useState('')
  const [effectiveDate, setEffectiveDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!open) return
    setLoadingClassrooms(true)
    fetch(`/api/classrooms?schoolYear=${encodeURIComponent(schoolYear)}`)
      .then((r) => r.json())
      .then((data) => {
        const filtered = (data.classrooms ?? []).filter(
          (c: Classroom) => c.id !== currentClassroomId
        )
        setClassrooms(filtered)
      })
      .catch(() => toast.error('Failed to load classrooms'))
      .finally(() => setLoadingClassrooms(false))
  }, [open, schoolYear, currentClassroomId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!toClassroomId || !reason) {
      toast.error('Please select a classroom and reason')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/placements/${placementId}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toClassroomId,
          effectiveDate: new Date(effectiveDate).toISOString(),
          reason,
          notes: notes || undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Transfer failed')
      }

      toast.success('Student transferred successfully')
      setOpen(false)
      onSuccess?.()
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Transfer failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-2.5 py-1 rounded border border-gray-200 text-warm-gray-600 hover:bg-gray-50 transition-colors font-medium"
      >
        Transfer
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-base font-semibold text-warm-gray-900">
                Transfer Student
              </h2>
              <p className="text-sm text-warm-gray-500 mt-0.5">{studentName}</p>
            </div>

            {has1to1 && (
              <div className="mx-6 mt-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                <strong>Note:</strong> This student&apos;s 1:1 para will be reassigned to the new classroom
                and a vacant position will be created here.
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* To Classroom */}
              <div>
                <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                  Destination Classroom <span className="text-red-500">*</span>
                </label>
                {loadingClassrooms ? (
                  <div className="text-sm text-warm-gray-400">Loading classrooms...</div>
                ) : (
                  <select
                    value={toClassroomId}
                    onChange={(e) => setToClassroomId(e.target.value)}
                    required
                    className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-300"
                  >
                    <option value="">Select a classroom...</option>
                    {classrooms.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.teacher?.name ?? 'Open Position'} — {c.site.name} (
                        {SILO_LABELS[c.programSilo] ?? c.programSilo} /{' '}
                        {formatGradeRange(c.gradeStart, c.gradeEnd)})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Effective Date */}
              <div>
                <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                  Effective Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  required
                  className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-300"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                  Reason <span className="text-red-500">*</span>
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-300"
                >
                  <option value="">Select a reason...</option>
                  {TRANSFER_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-300 resize-none"
                  placeholder="Additional context..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 text-sm text-warm-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Transferring...' : 'Transfer Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
