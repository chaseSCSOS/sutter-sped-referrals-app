'use client'

import { useState } from 'react'
import Link from 'next/link'
import EnrollmentStatusBadge from './enrollment-status-badge'
import TransferModal from './transfer-modal'

const ENROLLMENT_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'REFERRAL_PENDING', label: 'Referral Pending' },
  { value: 'REFERRAL_NOT_RECEIVED', label: 'Referral Not Received' },
  { value: 'REFERRAL_ON_HOLD', label: 'On Hold' },
  { value: 'PLACED_NOT_IN_SYSTEMS', label: 'Placed – Not in Systems' },
  { value: 'HOME_INSTRUCTION', label: 'Home Instruction' },
  { value: 'RTD_IN_PROGRESS', label: 'RTD in Progress' },
  { value: 'EXITED', label: 'Exited' },
]

const DISABILITY_LABELS: Record<string, string> = {
  '210': 'Intellectual Disability',
  '220': 'Hard of Hearing',
  '230': 'Deaf',
  '240': 'Speech/Language',
  '250': 'Visual Impairment',
  '260': 'Emotional Disturbance',
  '270': 'Orthopedic Impairment',
  '280': 'Other Health Impairment',
  '281': 'Traumatic Brain Injury',
  '290': 'Specific Learning Disability',
  '300': 'Deaf-Blindness',
  '310': 'Multiple Disabilities',
  '320': 'Autism',
  '330': 'Est. Medical Disability',
}

interface StudentRowProps {
  student: {
    id: string
    studentNameFirst: string
    studentNameLast: string
    grade: string
    primaryDisability?: string | null
    enrollmentStatus: string
    seisConfirmed: boolean
    aeriesConfirmed: boolean
    requires1to1: boolean
    referral?: { confirmationNumber: string } | null
    oneToOnePara?: {
      id: string
      name: string
      positionControlNumber?: string | null
      isVacancy: boolean
    } | null
  }
  canEdit: boolean
  classroomId: string
  schoolYear: string
}

export default function StudentRow({ student, canEdit, classroomId, schoolYear }: StudentRowProps) {
  const [seisConfirmed, setSeisConfirmed] = useState(student.seisConfirmed)
  const [aeriesConfirmed, setAeriesConfirmed] = useState(student.aeriesConfirmed)
  const [seisLoading, setSeisLoading] = useState(false)
  const [aeriesLoading, setAeriesLoading] = useState(false)
  const [enrollmentStatus, setEnrollmentStatus] = useState(student.enrollmentStatus)
  const [statusLoading, setStatusLoading] = useState(false)

  async function handleStatusChange(newStatus: string) {
    const prev = enrollmentStatus
    setEnrollmentStatus(newStatus)
    setStatusLoading(true)
    try {
      const res = await fetch(`/api/placements/${student.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollmentStatus: newStatus }),
      })
      if (!res.ok) setEnrollmentStatus(prev)
    } catch {
      setEnrollmentStatus(prev)
    } finally {
      setStatusLoading(false)
    }
  }

  async function handleToggle(system: 'seis' | 'aeries', value: boolean) {
    const setLoading = system === 'seis' ? setSeisLoading : setAeriesLoading
    const setValue = system === 'seis' ? setSeisConfirmed : setAeriesConfirmed
    const prevValue = system === 'seis' ? seisConfirmed : aeriesConfirmed

    setLoading(true)
    setValue(value)

    try {
      const res = await fetch(`/api/placements/${student.id}/${system}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmed: value }),
      })
      if (!res.ok) setValue(prevValue)
    } catch {
      setValue(prevValue)
    } finally {
      setLoading(false)
    }
  }

  const disabilityLabel = student.primaryDisability
    ? (DISABILITY_LABELS[student.primaryDisability] ?? student.primaryDisability)
    : '—'

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      {/* Student Name */}
      <td className="px-4 py-3 whitespace-nowrap">
        <Link
          href={`/dashboard/classrooms/students/${student.id}`}
          className="text-sm font-medium text-sky-700 hover:text-sky-900 hover:underline"
        >
          {student.studentNameLast}, {student.studentNameFirst}
        </Link>
        {student.referral?.confirmationNumber && (
          <p className="text-xs text-warm-gray-400 mt-0.5">
            {student.referral.confirmationNumber}
          </p>
        )}
      </td>

      {/* Grade */}
      <td className="px-4 py-3 whitespace-nowrap text-sm text-warm-gray-700">
        {student.grade}
      </td>

      {/* Primary Disability */}
      <td className="px-4 py-3 whitespace-nowrap text-sm text-warm-gray-700">
        <span title={student.primaryDisability ?? undefined}>{disabilityLabel}</span>
      </td>

      {/* Enrollment Status */}
      <td className="px-4 py-3 whitespace-nowrap">
        {canEdit ? (
          <select
            value={enrollmentStatus}
            disabled={statusLoading}
            onChange={e => handleStatusChange(e.target.value)}
            className="text-xs rounded border border-slate-200 bg-white px-2 py-1 text-slate-700 focus:border-sky-400 focus:ring-1 focus:ring-sky-100 focus:outline-none disabled:opacity-50"
          >
            {ENROLLMENT_STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ) : (
          <EnrollmentStatusBadge status={enrollmentStatus} />
        )}
      </td>

      {/* SEIS toggle */}
      <td className="px-4 py-3 whitespace-nowrap text-center">
        <label className="inline-flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={seisConfirmed}
            disabled={!canEdit || seisLoading}
            onChange={(e) => handleToggle('seis', e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          {seisLoading && (
            <span className="text-xs text-warm-gray-400">saving…</span>
          )}
        </label>
      </td>

      {/* Aeries toggle */}
      <td className="px-4 py-3 whitespace-nowrap text-center">
        <label className="inline-flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={aeriesConfirmed}
            disabled={!canEdit || aeriesLoading}
            onChange={(e) => handleToggle('aeries', e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          {aeriesLoading && (
            <span className="text-xs text-warm-gray-400">saving…</span>
          )}
        </label>
      </td>

      {/* 1:1 Para */}
      <td className="px-4 py-3 whitespace-nowrap text-sm">
        {student.requires1to1 ? (
          student.oneToOnePara ? (
            student.oneToOnePara.isVacancy ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                VACANT
              </span>
            ) : (
              <span className="text-warm-gray-700">{student.oneToOnePara.name}</span>
            )
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
              VACANT
            </span>
          )
        ) : (
          <span className="text-warm-gray-400 text-xs">—</span>
        )}
      </td>

      {/* Transfer */}
      <td className="px-4 py-3 whitespace-nowrap text-center">
        {canEdit && (
          <TransferModal
            placementId={student.id}
            studentName={`${student.studentNameLast}, ${student.studentNameFirst}`}
            currentClassroomId={classroomId}
            schoolYear={schoolYear}
            has1to1={student.requires1to1 && !!student.oneToOnePara}
          />
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3 whitespace-nowrap text-right">
        <Link
          href={`/dashboard/classrooms/students/${student.id}`}
          className="text-xs text-sky-600 hover:text-sky-800 font-medium"
        >
          View →
        </Link>
      </td>
    </tr>
  )
}
