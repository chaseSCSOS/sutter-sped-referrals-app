'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { format } from 'date-fns'
import EnrollmentStatusBadge from '../components/enrollment-status-badge'

const SILO_LABELS: Record<string, string> = {
  ASD_ELEM: 'ASD-Elem',
  ASD_MIDHS: 'ASD-MidHS',
  SD: 'SD',
  NC: 'NC',
  DHH: 'DHH',
  ATP: 'ATP',
  MD: 'MD',
}

interface Placement {
  id: string
  studentNameFirst: string
  studentNameLast: string
  enrollmentStatus: string
  seisConfirmed: boolean
  seisConfirmedAt: string | null
  aeriesConfirmed: boolean
  aeriesConfirmedAt: string | null
  classroom: {
    id: string
    programSilo: string
    site: { id: string; name: string }
    teacher: { id: string; name: string } | null
  } | null
  referral: { confirmationNumber: string; studentName: string } | null
}

export default function SeisAeriesPage() {
  const router = useRouter()
  const [placements, setPlacements] = useState<Placement[]>([])
  const [loading, setLoading] = useState(true)
  const [siloFilter, setSiloFilter] = useState('')
  const [siteFilter, setSiteFilter] = useState('')
  const [toggling, setToggling] = useState<Record<string, boolean>>({})

  const fetchPlacements = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/placements/seis-aeries-pending')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setPlacements(data.placements ?? [])
    } catch {
      toast.error('Failed to load pending confirmations')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPlacements()
  }, [fetchPlacements])

  async function toggle(placementId: string, system: 'seis' | 'aeries', current: boolean) {
    const key = `${placementId}-${system}`
    setToggling((prev) => ({ ...prev, [key]: true }))
    try {
      const res = await fetch(`/api/placements/${placementId}/${system}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmed: !current }),
      })
      if (!res.ok) throw new Error('Failed to update')
      toast.success(`${system.toUpperCase()} ${current ? 'unconfirmed' : 'confirmed'}`)
      await fetchPlacements()
      router.refresh()
    } catch {
      toast.error(`Failed to update ${system.toUpperCase()} confirmation`)
    } finally {
      setToggling((prev) => ({ ...prev, [key]: false }))
    }
  }

  const filtered = placements.filter((p) => {
    if (siloFilter && p.classroom?.programSilo !== siloFilter) return false
    if (siteFilter && p.classroom?.site.id !== siteFilter) return false
    return true
  })

  const silos = Array.from(new Set(placements.map((p) => p.classroom?.programSilo).filter(Boolean)))
  const sites = Array.from(
    new Map(
      placements
        .filter((p) => p.classroom?.site)
        .map((p) => [p.classroom!.site.id, p.classroom!.site])
    ).values()
  )

  const pendingSeis = filtered.filter((p) => !p.seisConfirmed).length
  const pendingAeries = filtered.filter((p) => !p.aeriesConfirmed).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-warm-gray-900">SEIS / Aeries Confirmation</h1>
        <p className="text-sm text-warm-gray-500 mt-1">
          Students with pending system confirmations
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 max-w-sm">
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-center">
          <div className="text-2xl font-bold text-amber-700">{pendingSeis}</div>
          <div className="text-xs text-amber-600 mt-0.5">Pending SEIS</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-center">
          <div className="text-2xl font-bold text-amber-700">{pendingAeries}</div>
          <div className="text-xs text-amber-600 mt-0.5">Pending Aeries</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="block text-xs text-warm-gray-500 mb-1">Program</label>
            <select
              value={siloFilter}
              onChange={(e) => setSiloFilter(e.target.value)}
              className="text-sm rounded-lg border border-gray-200 px-3 py-1.5"
            >
              <option value="">All Programs</option>
              {silos.map((s) => (
                <option key={s} value={s!}>
                  {SILO_LABELS[s!] ?? s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-warm-gray-500 mb-1">Site</label>
            <select
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
              className="text-sm rounded-lg border border-gray-200 px-3 py-1.5"
            >
              <option value="">All Sites</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </div>
          {(siloFilter || siteFilter) && (
            <button
              onClick={() => { setSiloFilter(''); setSiteFilter('') }}
              className="self-end text-xs text-warm-gray-500 hover:text-warm-gray-700 underline pb-1.5"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-warm-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-warm-gray-400 italic">
            No students with pending confirmations.
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
                    Classroom
                  </th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-warm-gray-500">
                    SEIS
                  </th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-warm-gray-500">
                    Aeries
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-warm-gray-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((p) => (
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
                      {p.classroom ? (
                        <Link
                          href={`/dashboard/classrooms/${p.classroom.id}`}
                          className="hover:text-warm-gray-800"
                        >
                          {p.classroom.teacher?.name ?? 'Open'} — {p.classroom.site.name}
                          <span className="ml-1.5 text-xs text-warm-gray-400">
                            ({SILO_LABELS[p.classroom.programSilo] ?? p.classroom.programSilo})
                          </span>
                        </Link>
                      ) : (
                        <span className="italic text-warm-gray-400">No classroom</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggle(p.id, 'seis', p.seisConfirmed)}
                        disabled={toggling[`${p.id}-seis`]}
                        title={p.seisConfirmed && p.seisConfirmedAt
                          ? `Confirmed ${format(new Date(p.seisConfirmedAt), 'MM/dd/yyyy')}`
                          : 'Click to confirm'}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
                          p.seisConfirmed ? 'bg-green-500' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                            p.seisConfirmed ? 'translate-x-4' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggle(p.id, 'aeries', p.aeriesConfirmed)}
                        disabled={toggling[`${p.id}-aeries`]}
                        title={p.aeriesConfirmed && p.aeriesConfirmedAt
                          ? `Confirmed ${format(new Date(p.aeriesConfirmedAt), 'MM/dd/yyyy')}`
                          : 'Click to confirm'}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
                          p.aeriesConfirmed ? 'bg-green-500' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                            p.aeriesConfirmed ? 'translate-x-4' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <EnrollmentStatusBadge status={p.enrollmentStatus as never} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
