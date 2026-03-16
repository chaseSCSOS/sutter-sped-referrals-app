'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'

interface QueuedReferral {
  id: string
  confirmationNumber: string
  studentName: string
  grade: string
  silo: string | null
  districtOfResidence: string | null
  submittedAt: string
  daysElapsed: number
  isStale: boolean
  assignedTo: { name: string } | null
}

const GRADE_OPTIONS = [
  'PreK', 'TK', 'K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12',
]

const SILO_LABELS: Record<string, string> = {
  ASD: 'ASD',
  SD: 'SD',
  NC: 'NC',
  DHH: 'DHH',
  MD: 'MD',
  OT: 'OT',
}

function daysColor(days: number): string {
  if (days >= 30) return 'text-red-700 font-semibold'
  if (days >= 14) return 'text-amber-700 font-semibold'
  return 'text-warm-gray-700'
}

function daysBg(days: number): string {
  if (days >= 30) return 'bg-red-50'
  if (days >= 14) return 'bg-amber-50'
  return ''
}

export default function ReferralQueuePage() {
  const [data, setData] = useState<QueuedReferral[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [gradeFilter, setGradeFilter] = useState<string>('')
  const [siloFilter, setSiloFilter] = useState<string>('')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/classrooms/analytics/referral-queue')
      if (!res.ok) throw new Error('Failed to load referral queue')
      const json = await res.json()
      setData(json.queue ?? [])
    } catch {
      setError('Could not load placement queue. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const filtered = data.filter((r) => {
    if (gradeFilter && r.grade !== gradeFilter) return false
    if (siloFilter && r.silo !== siloFilter) return false
    return true
  })

  const totalCount = data.length
  const staleCount = data.filter((r) => r.isStale).length

  const uniqueSilos = Array.from(new Set(data.map((r) => r.silo).filter(Boolean) as string[])).sort()

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-warm-gray-500 mb-1">
          Classrooms / Analytics
        </p>
        <h1 className="text-2xl font-semibold text-warm-gray-900">Placement Queue</h1>
        <p className="text-sm text-warm-gray-600 mt-0.5">
          Referrals accepted and awaiting classroom placement
        </p>
      </div>

      {/* Summary banner */}
      {!loading && !error && (
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="px-4 py-2 rounded-lg bg-white border border-cream-200 shadow-sm text-sm">
            <span className="font-semibold text-warm-gray-900">{totalCount}</span>
            <span className="text-warm-gray-600 ml-1">
              referral{totalCount !== 1 ? 's' : ''} awaiting placement
            </span>
          </div>
          {staleCount > 0 && (
            <div className="px-4 py-2 rounded-lg bg-amber-50 border border-amber-200 text-sm">
              <span className="font-semibold text-amber-800">{staleCount}</span>
              <span className="text-amber-700 ml-1">
                stale (14+ days)
              </span>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div>
          <label htmlFor="grade-filter" className="text-xs font-medium text-warm-gray-700 mr-1.5">
            Grade:
          </label>
          <select
            id="grade-filter"
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-warm-gray-900 shadow-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          >
            <option value="">All Grades</option>
            {GRADE_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="silo-filter" className="text-xs font-medium text-warm-gray-700 mr-1.5">
            Silo:
          </label>
          <select
            id="silo-filter"
            value={siloFilter}
            onChange={(e) => setSiloFilter(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-warm-gray-900 shadow-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          >
            <option value="">All Silos</option>
            {uniqueSilos.map((silo) => (
              <option key={silo} value={silo}>
                {SILO_LABELS[silo] ?? silo}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="text-center py-16 text-warm-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mx-auto mb-3" />
          <p className="text-sm">Loading placement queue&hellip;</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-16 text-warm-gray-400">
          <p className="text-sm">
            {data.length === 0
              ? 'No referrals are currently awaiting placement.'
              : 'No referrals match the selected filters.'}
          </p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && filtered.length > 0 && (
        <div className="bg-white rounded-xl border border-cream-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-warm-gray-500 uppercase tracking-wider border-b border-cream-200 bg-cream-50/60">
                  <th className="text-left px-4 py-3">Student Name</th>
                  <th className="text-left px-4 py-3">Grade</th>
                  <th className="text-left px-4 py-3">Silo</th>
                  <th className="text-left px-4 py-3">DOR</th>
                  <th className="text-left px-4 py-3">Referral Date</th>
                  <th className="text-right px-4 py-3">Days Waiting</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-100">
                {filtered.map((referral) => (
                  <tr
                    key={referral.id}
                    className={`hover:bg-cream-50/40 ${daysBg(referral.daysElapsed)}`}
                  >
                    <td className="px-4 py-3 font-medium text-warm-gray-900">
                      {referral.studentName}
                    </td>
                    <td className="px-4 py-3 text-warm-gray-700">
                      {referral.grade}
                    </td>
                    <td className="px-4 py-3">
                      {referral.silo ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-100">
                          {SILO_LABELS[referral.silo] ?? referral.silo}
                        </span>
                      ) : (
                        <span className="text-warm-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-warm-gray-600">
                      {referral.districtOfResidence ?? (
                        <span className="text-warm-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-warm-gray-600">
                      {format(new Date(referral.submittedAt), 'MM/dd/yyyy')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={daysColor(referral.daysElapsed)}>
                        {referral.daysElapsed}
                      </span>
                      {referral.isStale && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                          Stale
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/referrals/${referral.id}`}
                        className="inline-flex items-center px-3 py-1 rounded-md bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Place Now
                      </Link>
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
