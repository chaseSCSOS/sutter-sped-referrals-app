'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { format, differenceInDays } from 'date-fns'
import EnrollmentStatusBadge from '../../components/enrollment-status-badge'

interface ATPPlacement {
  id: string
  studentNameFirst: string
  studentNameLast: string
  dateOfBirth: string | null
  ageOutDate: string | null
  enrollmentStatus: string
  seisConfirmed: boolean
  aeriesConfirmed: boolean
  classroom: {
    id: string
    programSilo: string
    teacher: { id: string; name: string } | null
    site: { id: string; name: string }
  } | null
}

type TabKey = 'december' | 'june'

function getRowClass(ageOutDate: Date, today: Date): string {
  const days = differenceInDays(ageOutDate, today)
  if (days <= 60) return 'bg-red-50'
  if (days <= 180) return 'bg-amber-50'
  return ''
}

function DaysUntilAgeOut({ ageOutDate }: { ageOutDate: Date }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = differenceInDays(ageOutDate, today)

  if (days < 0) {
    return (
      <span className="text-sm font-semibold text-red-700">
        Aged out ({Math.abs(days)}d ago)
      </span>
    )
  }
  if (days === 0) {
    return <span className="text-sm font-bold text-red-700">Today</span>
  }

  const textClass =
    days <= 60
      ? 'text-red-700 font-semibold'
      : days <= 180
        ? 'text-amber-700 font-semibold'
        : 'text-warm-gray-700'

  return <span className={`text-sm ${textClass}`}>{days} days</span>
}

export default function AtpAgeOutPage() {
  const [placements, setPlacements] = useState<ATPPlacement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('december')

  const fetchPlacements = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/placements/atp')
      if (!res.ok) throw new Error('Failed to fetch ATP placements')
      const data = await res.json()
      setPlacements(data.placements ?? [])
    } catch {
      setError('Failed to load ATP students. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPlacements()
  }, [fetchPlacements])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Split into December (month 11) and June (month 5) groups
  const withDate = placements.filter((p) => p.ageOutDate != null)
  const noDate = placements.filter((p) => p.ageOutDate == null)

  const decemberAgeOuts = withDate.filter((p) => {
    const d = new Date(p.ageOutDate!)
    return d.getMonth() === 11
  })

  const juneAgeOuts = withDate.filter((p) => {
    const d = new Date(p.ageOutDate!)
    return d.getMonth() === 5
  })

  const activeList = activeTab === 'december' ? decemberAgeOuts : juneAgeOuts

  // Count urgency for badge
  const urgentCount = activeList.filter((p) => {
    const days = differenceInDays(new Date(p.ageOutDate!), today)
    return days <= 60
  }).length

  const soonCount = activeList.filter((p) => {
    const days = differenceInDays(new Date(p.ageOutDate!), today)
    return days > 60 && days <= 180
  }).length

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-warm-gray-500 mb-1">
          Pipeline / ATP
        </p>
        <h1 className="text-2xl font-semibold text-warm-gray-900">ATP Age-Outs</h1>
        <p className="text-sm text-warm-gray-600 mt-0.5">
          ATP students sorted by age-out date. Rows highlighted in red are within 60 days; amber
          within 6 months.
        </p>
      </div>

      {/* Summary strip */}
      {!loading && !error && (
        <div className="flex flex-wrap gap-4">
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-center min-w-[100px]">
            <div className="text-2xl font-bold text-red-700">{urgentCount}</div>
            <div className="text-xs text-red-600 mt-0.5">Within 60 days</div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-center min-w-[100px]">
            <div className="text-2xl font-bold text-amber-700">{soonCount}</div>
            <div className="text-xs text-amber-600 mt-0.5">Within 6 months</div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-center min-w-[100px]">
            <div className="text-2xl font-bold text-warm-gray-700">{noDate.length}</div>
            <div className="text-xs text-warm-gray-500 mt-0.5">Unknown date</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('december')}
          className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
            activeTab === 'december'
              ? 'text-warm-gray-900 border-b-2 border-warm-gray-900 -mb-px'
              : 'text-warm-gray-500 hover:text-warm-gray-700'
          }`}
        >
          December Age-Outs
          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-warm-gray-700">
            {decemberAgeOuts.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('june')}
          className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
            activeTab === 'june'
              ? 'text-warm-gray-900 border-b-2 border-warm-gray-900 -mb-px'
              : 'text-warm-gray-500 hover:text-warm-gray-700'
          }`}
        >
          June Age-Outs
          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-warm-gray-700">
            {juneAgeOuts.length}
          </span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-warm-gray-400">Loading ATP students…</div>
        ) : error ? (
          <div className="p-10 text-center text-sm text-red-500">{error}</div>
        ) : activeList.length === 0 ? (
          <div className="p-10 text-center text-sm text-warm-gray-400 italic">
            No {activeTab === 'december' ? 'December' : 'June'} age-outs found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-warm-gray-500">
                    Student
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-warm-gray-500">
                    DOB
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-warm-gray-500">
                    Age-Out Date
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-warm-gray-500">
                    Days Until
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-warm-gray-500">
                    Teacher
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-warm-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-warm-gray-500">
                    SEIS
                  </th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-warm-gray-500">
                    Aeries
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activeList.map((p) => {
                  const ageOutDate = new Date(p.ageOutDate!)
                  const rowClass = getRowClass(ageOutDate, today)
                  return (
                    <tr key={p.id} className={`${rowClass} hover:brightness-95`}>
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/classrooms/students/${p.id}`}
                          className="text-sm font-medium text-sky-700 hover:text-sky-800"
                        >
                          {p.studentNameLast}, {p.studentNameFirst}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-warm-gray-600">
                        {p.dateOfBirth
                          ? format(new Date(p.dateOfBirth), 'MM/dd/yyyy')
                          : <span className="italic text-warm-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-warm-gray-700 font-medium">
                        {format(ageOutDate, 'MM/dd/yyyy')}
                      </td>
                      <td className="px-4 py-3">
                        <DaysUntilAgeOut ageOutDate={ageOutDate} />
                      </td>
                      <td className="px-4 py-3 text-sm text-warm-gray-600">
                        {p.classroom?.teacher?.name ?? (
                          <span className="italic text-warm-gray-400">No teacher</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <EnrollmentStatusBadge status={p.enrollmentStatus} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.seisConfirmed ? (
                          <span
                            title="SEIS Confirmed"
                            className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-700"
                          >
                            ✓
                          </span>
                        ) : (
                          <span
                            title="SEIS not confirmed"
                            className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-warm-gray-400"
                          >
                            –
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.aeriesConfirmed ? (
                          <span
                            title="Aeries Confirmed"
                            className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-700"
                          >
                            ✓
                          </span>
                        ) : (
                          <span
                            title="Aeries not confirmed"
                            className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-warm-gray-400"
                          >
                            –
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Students with unknown age-out date */}
      {!loading && !error && noDate.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="text-sm font-semibold text-warm-gray-700">
              Students with Unknown Age-Out Date ({noDate.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-warm-gray-500">
                    Student
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-warm-gray-500">
                    DOB
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-warm-gray-500">
                    Teacher
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-warm-gray-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {noDate.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/classrooms/students/${p.id}`}
                        className="text-sm font-medium text-sky-700 hover:text-sky-800"
                      >
                        {p.studentNameLast}, {p.studentNameFirst}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-warm-gray-600">
                      {p.dateOfBirth
                        ? format(new Date(p.dateOfBirth), 'MM/dd/yyyy')
                        : <span className="italic text-warm-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-warm-gray-600">
                      {p.classroom?.teacher?.name ?? (
                        <span className="italic text-warm-gray-400">No teacher</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <EnrollmentStatusBadge status={p.enrollmentStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
