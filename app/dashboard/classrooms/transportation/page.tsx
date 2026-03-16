'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

// ─── Types ───────────────────────────────────────────────────────────────────

interface TransportRecord {
  id: string
  studentId: string
  busNumber: string | null
  transportType: string | null
  amPmFlag: string | null
  specialTransportNotes: string | null
  isWheelchair: boolean
  needsCarSeat: boolean
  needsSafetyVest: boolean
  needsSafetyLock: boolean
  needsBusAide: boolean
  riderAtHome: boolean
  reducedDaySchedule: boolean
  transportPending: boolean
  updatedAt: string
}

interface Placement {
  id: string
  studentNameFirst: string
  studentNameLast: string
  enrollmentStatus: string
  districtOfResidence: string | null
  classroom: {
    id: string
    programSilo: string
    site: { id: string; name: string }
    teacher: { id: string; name: string } | null
  } | null
  referral: { confirmationNumber: string } | null
  transportRecord: TransportRecord | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SAFETY_FLAGS: { key: keyof TransportRecord; label: string; color: string }[] = [
  { key: 'isWheelchair', label: 'Wheelchair', color: 'bg-purple-100 text-purple-700' },
  { key: 'needsCarSeat', label: 'Car Seat', color: 'bg-blue-100 text-blue-700' },
  { key: 'needsBusAide', label: 'Bus Aide', color: 'bg-orange-100 text-orange-700' },
  { key: 'needsSafetyVest', label: 'Safety Vest', color: 'bg-yellow-100 text-yellow-700' },
  { key: 'needsSafetyLock', label: 'Safety Lock', color: 'bg-red-100 text-red-700' },
]

function buildCsvRow(p: Placement): string {
  const tr = p.transportRecord
  const studentName = `${p.studentNameLast}, ${p.studentNameFirst}`
  const site = p.classroom?.site.name ?? ''
  const teacher = p.classroom?.teacher?.name ?? ''
  const dor = p.districtOfResidence ?? ''
  const bus = tr?.busNumber ?? ''
  const type = tr?.transportType ?? ''
  const ampm = tr?.amPmFlag ?? ''
  const pending = tr?.transportPending ? 'Yes' : 'No'
  const wheelchair = tr?.isWheelchair ? 'Yes' : 'No'
  const carSeat = tr?.needsCarSeat ? 'Yes' : 'No'
  const busAide = tr?.needsBusAide ? 'Yes' : 'No'
  const safetyVest = tr?.needsSafetyVest ? 'Yes' : 'No'
  const safetyLock = tr?.needsSafetyLock ? 'Yes' : 'No'
  const riderAtHome = tr?.riderAtHome ? 'Yes' : 'No'
  const reducedDay = tr?.reducedDaySchedule ? 'Yes' : 'No'
  const notes = (tr?.specialTransportNotes ?? '').replace(/"/g, '""')

  return [
    `"${studentName}"`,
    `"${site}"`,
    `"${teacher}"`,
    `"${dor}"`,
    `"${bus}"`,
    `"${type}"`,
    `"${ampm}"`,
    pending,
    wheelchair,
    carSeat,
    busAide,
    safetyVest,
    safetyLock,
    riderAtHome,
    reducedDay,
    `"${notes}"`,
  ].join(',')
}

// ─── Inline Edit Form ─────────────────────────────────────────────────────────

interface EditFormProps {
  placement: Placement
  onSave: (placementId: string, data: Partial<TransportRecord>) => Promise<void>
  onCancel: () => void
}

function EditForm({ placement, onSave, onCancel }: EditFormProps) {
  const tr = placement.transportRecord
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    busNumber: tr?.busNumber ?? '',
    transportType: tr?.transportType ?? '',
    amPmFlag: tr?.amPmFlag ?? '',
    specialTransportNotes: tr?.specialTransportNotes ?? '',
    isWheelchair: tr?.isWheelchair ?? false,
    needsCarSeat: tr?.needsCarSeat ?? false,
    needsSafetyVest: tr?.needsSafetyVest ?? false,
    needsSafetyLock: tr?.needsSafetyLock ?? false,
    needsBusAide: tr?.needsBusAide ?? false,
    riderAtHome: tr?.riderAtHome ?? false,
    reducedDaySchedule: tr?.reducedDaySchedule ?? false,
    transportPending: tr?.transportPending ?? true,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target
    const value = target.type === 'checkbox' ? (target as HTMLInputElement).checked : target.value
    setForm((prev) => ({ ...prev, [target.name]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(placement.id, {
        busNumber: form.busNumber || null,
        transportType: form.transportType || null,
        amPmFlag: form.amPmFlag || null,
        specialTransportNotes: form.specialTransportNotes || null,
        isWheelchair: form.isWheelchair,
        needsCarSeat: form.needsCarSeat,
        needsSafetyVest: form.needsSafetyVest,
        needsSafetyLock: form.needsSafetyLock,
        needsBusAide: form.needsBusAide,
        riderAtHome: form.riderAtHome,
        reducedDaySchedule: form.reducedDaySchedule,
        transportPending: form.transportPending,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 bg-cream-50 border border-gray-200 rounded-lg mt-1">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-3">
        <div>
          <label className="block text-xs font-medium text-warm-gray-700 mb-1">Bus #</label>
          <input
            name="busNumber"
            value={form.busNumber}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            placeholder="e.g. 42"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-warm-gray-700 mb-1">Transport Type</label>
          <select
            name="transportType"
            value={form.transportType}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
          >
            <option value="">— select —</option>
            <option value="District Bus">District Bus</option>
            <option value="Non-Public">Non-Public</option>
            <option value="Parent/Guardian">Parent/Guardian</option>
            <option value="Cab/Taxi">Cab/Taxi</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-warm-gray-700 mb-1">AM/PM</label>
          <select
            name="amPmFlag"
            value={form.amPmFlag}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
          >
            <option value="">— select —</option>
            <option value="AM">AM</option>
            <option value="PM">PM</option>
            <option value="Both">Both</option>
          </select>
        </div>
      </div>

      <div className="mb-3">
        <label className="block text-xs font-medium text-warm-gray-700 mb-1">Special Transport Notes</label>
        <textarea
          name="specialTransportNotes"
          value={form.specialTransportNotes}
          onChange={handleChange}
          rows={2}
          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
          placeholder="Any special instructions..."
        />
      </div>

      <div className="flex flex-wrap gap-4 mb-3">
        {[
          { name: 'isWheelchair', label: 'Wheelchair' },
          { name: 'needsCarSeat', label: 'Car Seat' },
          { name: 'needsBusAide', label: 'Bus Aide' },
          { name: 'needsSafetyVest', label: 'Safety Vest' },
          { name: 'needsSafetyLock', label: 'Safety Lock' },
          { name: 'riderAtHome', label: 'Rider at Home' },
          { name: 'reducedDaySchedule', label: 'Reduced Day' },
          { name: 'transportPending', label: 'Transport Pending' },
        ].map(({ name, label }) => (
          <label key={name} className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input
              type="checkbox"
              name={name}
              checked={form[name as keyof typeof form] as boolean}
              onChange={handleChange}
              className="rounded border-gray-300"
            />
            <span className="text-warm-gray-700">{label}</span>
          </label>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-1.5 bg-sky-600 text-white text-sm rounded hover:bg-sky-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 bg-gray-100 text-warm-gray-700 text-sm rounded hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TransportationPage() {
  const [placements, setPlacements] = useState<Placement[]>([])
  const [loading, setLoading] = useState(true)
  const [siteFilter, setSiteFilter] = useState('')
  const [dorFilter, setDorFilter] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  // Fetch all transport data
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/transport')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setPlacements(data.placements ?? [])
    } catch {
      toast.error('Failed to load transport data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Save transport record via PATCH
  const handleSave = useCallback(async (placementId: string, data: Partial<TransportRecord>) => {
    const res = await fetch(`/api/placements/${placementId}/transport`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      toast.error('Failed to save transport record')
      return
    }
    toast.success('Transport record saved')
    setEditingId(null)
    await fetchData()
  }, [fetchData])

  // Derived values
  const allSites = Array.from(new Set(placements.map((p) => p.classroom?.site.name).filter(Boolean) as string[])).sort()
  const allDors = Array.from(new Set(placements.map((p) => p.districtOfResidence).filter(Boolean) as string[])).sort()

  const filtered = placements.filter((p) => {
    if (siteFilter && p.classroom?.site.name !== siteFilter) return false
    if (dorFilter && p.districtOfResidence !== dorFilter) return false
    return true
  })

  // Safety flag summary counts
  const flagCounts = SAFETY_FLAGS.map(({ key, label, color }) => ({
    label,
    color,
    count: filtered.filter((p) => p.transportRecord?.[key] === true).length,
  }))

  // Group by site
  const grouped = new Map<string, Placement[]>()
  for (const p of filtered) {
    const site = p.classroom?.site.name ?? 'No Site Assigned'
    const existing = grouped.get(site) ?? []
    existing.push(p)
    grouped.set(site, existing)
  }
  const sortedSites = Array.from(grouped.keys()).sort()

  // CSV export
  const handleExportCsv = () => {
    const header = [
      'Student Name',
      'Site',
      'Teacher',
      'District of Residence',
      'Bus #',
      'Transport Type',
      'AM/PM',
      'Transport Pending',
      'Wheelchair',
      'Car Seat',
      'Bus Aide',
      'Safety Vest',
      'Safety Lock',
      'Rider at Home',
      'Reduced Day',
      'Special Notes',
    ].join(',')

    const rows = filtered.map(buildCsvRow)
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transport-roster-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-warm-gray-500 text-sm">
        Loading transport data…
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.2em] text-warm-gray-500 mb-1">Classrooms</p>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-warm-gray-900">Transportation</h1>
            <p className="text-sm text-warm-gray-600 mt-0.5">
              {filtered.length} student{filtered.length !== 1 ? 's' : ''} shown
            </p>
          </div>
          <button
            onClick={handleExportCsv}
            className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-warm-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Safety flag summary */}
      <div className="flex flex-wrap gap-3 mb-5 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
        <p className="w-full text-xs font-semibold uppercase tracking-[0.15em] text-warm-gray-500 mb-1">
          Safety Flag Summary
        </p>
        {flagCounts.map(({ label, color, count }) => (
          <span
            key={label}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${color}`}
          >
            {label}
            <span className="font-bold">{count}</span>
          </span>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div>
          <label className="block text-xs font-medium text-warm-gray-700 mb-1">Filter by Site</label>
          <select
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white shadow-sm"
          >
            <option value="">All Sites</option>
            {allSites.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-warm-gray-700 mb-1">Filter by DOR</label>
          <select
            value={dorFilter}
            onChange={(e) => setDorFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white shadow-sm"
          >
            <option value="">All Districts</option>
            {allDors.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table grouped by site */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-warm-gray-500 text-sm">No students match the current filters.</div>
      ) : (
        <div className="space-y-8">
          {sortedSites.map((site) => {
            const sitePlacements = grouped.get(site) ?? []
            return (
              <div key={site}>
                <h2 className="text-sm font-semibold text-warm-gray-700 uppercase tracking-[0.1em] mb-2 pb-1 border-b border-gray-200">
                  {site} — {sitePlacements.length} student{sitePlacements.length !== 1 ? 's' : ''}
                </h2>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-warm-gray-600 uppercase tracking-wide">
                          Student
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-warm-gray-600 uppercase tracking-wide">
                          Teacher
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-warm-gray-600 uppercase tracking-wide">
                          DOR
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-warm-gray-600 uppercase tracking-wide">
                          Bus #
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-warm-gray-600 uppercase tracking-wide">
                          Type / AM-PM
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-warm-gray-600 uppercase tracking-wide">
                          Safety Flags
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-warm-gray-600 uppercase tracking-wide">
                          Status
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-warm-gray-600 uppercase tracking-wide">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sitePlacements.map((p) => {
                        const tr = p.transportRecord
                        const isEditing = editingId === p.id
                        const activeFlags = SAFETY_FLAGS.filter(({ key }) => tr?.[key] === true)

                        return (
                          <>
                            <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-3 py-2.5 font-medium text-warm-gray-900">
                                {p.studentNameLast}, {p.studentNameFirst}
                              </td>
                              <td className="px-3 py-2.5 text-warm-gray-600">
                                {p.classroom?.teacher?.name ?? <span className="text-warm-gray-400 italic">Vacant</span>}
                              </td>
                              <td className="px-3 py-2.5 text-warm-gray-600">
                                {p.districtOfResidence ?? <span className="text-warm-gray-400">—</span>}
                              </td>
                              <td className="px-3 py-2.5">
                                {tr?.busNumber ? (
                                  <span className="font-mono text-warm-gray-900">{tr.busNumber}</span>
                                ) : (
                                  <span className="text-warm-gray-400">—</span>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-warm-gray-600">
                                {tr ? (
                                  <>
                                    <span>{tr.transportType ?? '—'}</span>
                                    {tr.amPmFlag && (
                                      <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded bg-gray-100 text-warm-gray-600">
                                        {tr.amPmFlag}
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-warm-gray-400">—</span>
                                )}
                              </td>
                              <td className="px-3 py-2.5">
                                {activeFlags.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {activeFlags.map(({ label, color }) => (
                                      <span
                                        key={label}
                                        className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${color}`}
                                      >
                                        {label}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-warm-gray-400 text-xs">None</span>
                                )}
                              </td>
                              <td className="px-3 py-2.5">
                                {!tr ? (
                                  <span className="text-xs text-warm-gray-400 italic">No info</span>
                                ) : tr.transportPending ? (
                                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                    Pending
                                  </span>
                                ) : (
                                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                                    Confirmed
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2.5">
                                <button
                                  onClick={() => setEditingId(isEditing ? null : p.id)}
                                  className="text-xs px-2 py-1 rounded border border-gray-300 text-warm-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                  {isEditing ? 'Cancel' : tr ? 'Edit' : 'Add'}
                                </button>
                              </td>
                            </tr>
                            {isEditing && (
                              <tr key={`${p.id}-edit`}>
                                <td colSpan={8} className="px-3 pb-3">
                                  <EditForm
                                    placement={p}
                                    onSave={handleSave}
                                    onCancel={() => setEditingId(null)}
                                  />
                                </td>
                              </tr>
                            )}
                          </>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
