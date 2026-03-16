'use client'

import { useState } from 'react'
import Link from 'next/link'

export interface RTDChecklistData {
  id: string
  studentId: string
  dorNotified: boolean
  dorNotifiedAt: string | null
  dorNotifiedBy: string | null
  parentNotified: boolean
  parentNotifiedAt: string | null
  parentNotifiedBy: string | null
  secondStaffingCompleted: boolean
  secondStaffingAt: string | null
  secondStaffingBy: string | null
  transitionIepHeld: boolean
  transitionIepAt: string | null
  transitionIepBy: string | null
  packetCompleted: boolean
  packetCompletedAt: string | null
  packetCompletedBy: string | null
  packetSignedScanned: boolean
  packetSignedAt: string | null
  packetSignedBy: string | null
  aeriesExitCompleted: boolean
  aeriesExitAt: string | null
  aeriesExitBy: string | null
  seisExitCompleted: boolean
  seisExitAt: string | null
  seisExitBy: string | null
}

export interface RTDStudentRow {
  id: string
  studentNameFirst: string
  studentNameLast: string
  classroom: {
    id: string
    programSilo: string
    site: { id: string; name: string }
    teacher: { id: string; name: string } | null
  } | null
  rtdChecklist: RTDChecklistData | null
}

const RTD_STEPS: Array<{ key: keyof RTDChecklistData & string; label: string }> = [
  { key: 'dorNotified', label: 'DOR Notified' },
  { key: 'parentNotified', label: 'Parent Notified' },
  { key: 'secondStaffingCompleted', label: '2nd Staffing Completed' },
  { key: 'transitionIepHeld', label: 'Transition IEP Held' },
  { key: 'packetCompleted', label: 'RTD Packet Completed and Turned In' },
  { key: 'packetSignedScanned', label: 'Packet Signed by Admin and Scanned to DOR' },
  { key: 'aeriesExitCompleted', label: 'Aeries Exit & 200 Completed' },
  { key: 'seisExitCompleted', label: 'SEIS Exit Completed' },
]

const BOOLEAN_STEP_KEYS = new Set(RTD_STEPS.map((s) => s.key))

// Maps each boolean step key to its corresponding timestamp field
const STEP_AT_KEY: Record<string, keyof RTDChecklistData> = {
  dorNotified: 'dorNotifiedAt',
  parentNotified: 'parentNotifiedAt',
  secondStaffingCompleted: 'secondStaffingAt',
  transitionIepHeld: 'transitionIepAt',
  packetCompleted: 'packetCompletedAt',
  packetSignedScanned: 'packetSignedAt',
  aeriesExitCompleted: 'aeriesExitAt',
  seisExitCompleted: 'seisExitAt',
}

function countCompleted(checklist: RTDChecklistData | null): number {
  if (!checklist) return 0
  return RTD_STEPS.filter((s) => checklist[s.key] === true).length
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface RTDRowProps {
  student: RTDStudentRow
}

export function RTDRow({ student }: RTDRowProps) {
  const [checklist, setChecklist] = useState<RTDChecklistData | null>(student.rtdChecklist)
  const [expanded, setExpanded] = useState(false)
  const [loadingStep, setLoadingStep] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const completed = countCompleted(checklist)
  const total = RTD_STEPS.length
  const progressPct = Math.round((completed / total) * 100)

  const siteName = student.classroom?.site?.name ?? '—'
  const teacherName = student.classroom?.teacher?.name ?? 'No Teacher'
  const programSilo = student.classroom?.programSilo ?? '—'

  async function handleStepToggle(stepKey: string, currentValue: boolean) {
    setLoadingStep(stepKey)
    setError(null)
    try {
      const res = await fetch(`/api/placements/${student.id}/rtd`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: stepKey, completed: !currentValue }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to update step')
        return
      }
      const data = await res.json()
      setChecklist(data.checklist)
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoadingStep(null)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Row summary */}
      <div className="flex items-center gap-4 px-4 py-3">
        {/* Student name */}
        <div className="flex-1 min-w-0">
          <Link
            href={`/dashboard/classrooms/students/${student.id}`}
            className="text-sm font-semibold text-warm-gray-900 hover:text-sky-700 truncate block"
          >
            {student.studentNameLast}, {student.studentNameFirst}
          </Link>
          <p className="text-xs text-warm-gray-500 truncate">
            {teacherName} &middot; {programSilo}
          </p>
        </div>

        {/* Site */}
        <div className="hidden sm:block w-32 flex-shrink-0">
          <p className="text-xs text-warm-gray-500">Site</p>
          <p className="text-sm text-warm-gray-800 truncate">{siteName}</p>
        </div>

        {/* Progress */}
        <div className="w-32 flex-shrink-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-warm-gray-500">
              {completed}/{total} steps
            </span>
            <span className="text-xs font-medium text-warm-gray-700">{progressPct}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${
                progressPct === 100 ? 'bg-green-500' : 'bg-orange-400'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Expand button */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="ml-2 flex-shrink-0 text-xs text-sky-600 hover:text-sky-800 font-medium px-2 py-1 rounded hover:bg-sky-50 transition-colors"
          aria-expanded={expanded}
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {/* Expanded checklist */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
          {error && (
            <p className="text-xs text-red-600 mb-2 font-medium">{error}</p>
          )}
          <ol className="space-y-2">
            {RTD_STEPS.map((step, idx) => {
              const isChecked =
                checklist !== null &&
                BOOLEAN_STEP_KEYS.has(step.key) &&
                checklist[step.key] === true
              const atKey = STEP_AT_KEY[step.key]
              const completedAt = checklist && atKey ? checklist[atKey] as string | null : null
              const isLoading = loadingStep === step.key

              return (
                <li key={step.key} className="flex items-start gap-3">
                  <span className="mt-0.5 text-xs text-warm-gray-400 w-4 flex-shrink-0 text-right">
                    {idx + 1}.
                  </span>
                  <label className="flex items-start gap-2 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isLoading}
                      onChange={() => handleStepToggle(step.key, isChecked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400 flex-shrink-0 disabled:opacity-50 cursor-pointer"
                    />
                    <span
                      className={`text-sm leading-tight ${
                        isChecked ? 'line-through text-warm-gray-400' : 'text-warm-gray-800'
                      }`}
                    >
                      {step.label}
                      {isChecked && completedAt && (
                        <span className="ml-2 text-xs text-warm-gray-400 no-underline" style={{ textDecoration: 'none' }}>
                          {formatDate(completedAt)}
                        </span>
                      )}
                    </span>
                  </label>
                  {isLoading && (
                    <span className="text-xs text-warm-gray-400 flex-shrink-0 mt-0.5">saving...</span>
                  )}
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </div>
  )
}
