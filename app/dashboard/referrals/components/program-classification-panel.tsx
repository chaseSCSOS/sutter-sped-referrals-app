'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ProgramClassificationPanelProps {
  referral: any
  canUpdate: boolean
}

const PROGRAM_TRACKS = [
  { value: 'GENERAL', label: 'General' },
  { value: 'BEHAVIOR', label: 'BX (Behavior)' },
  { value: 'DHH', label: 'DHH' },
  { value: 'SCIP', label: 'SCIP' },
  { value: 'VIP', label: 'VIP' },
]

const SILO_OPTIONS = [
  { value: '', label: '— None —' },
  { value: 'ASD', label: 'ASD' },
  { value: 'SD', label: 'SD' },
  { value: 'NC', label: 'NC' },
  { value: 'DHH', label: 'DHH' },
  { value: 'MD', label: 'MD' },
  { value: 'OT', label: 'OT' },
]

export default function ProgramClassificationPanel({ referral, canUpdate }: ProgramClassificationPanelProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    programTrack: referral.programTrack || 'GENERAL',
    silo: referral.silo || '',
    districtOfResidence: referral.districtOfResidence || '',
    referringParty: referral.referringParty || '',
    dateStudentStartedSchool: referral.dateStudentStartedSchool
      ? new Date(referral.dateStudentStartedSchool).toISOString().split('T')[0]
      : '',
    serviceProvider: referral.serviceProvider || '',
  })

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const payload: Record<string, any> = {
        programTrack: form.programTrack,
        silo: form.silo || null,
        districtOfResidence: form.districtOfResidence || null,
        referringParty: form.referringParty || null,
        dateStudentStartedSchool: form.dateStudentStartedSchool || null,
        serviceProvider: form.serviceProvider || null,
      }

      const res = await fetch(`/api/referrals/${referral.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to save')
        return
      }

      setEditing(false)
      router.refresh()
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  const trackLabel = PROGRAM_TRACKS.find(t => t.value === referral.programTrack)?.label || referral.programTrack || 'General'

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-cream-200 overflow-hidden">
      <div className="px-6 pt-6 pb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-warm-gray-900 flex items-center gap-2">
          <span className="w-1.5 h-4 bg-sky-400 rounded-full inline-block"></span>
          Program Classification
        </h2>
        {canUpdate && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-sky-700 hover:text-sky-800 font-medium transition-colors"
          >
            Edit
          </button>
        )}
        {editing && (
          <div className="flex gap-2">
            <button
              onClick={() => { setEditing(false); setError('') }}
              className="text-xs text-warm-gray-500 hover:text-warm-gray-700 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-xs bg-sky-700 text-white px-3 py-1 rounded-lg hover:bg-sky-800 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>

      <div className="px-6 pb-6">
        {error && (
          <div className="mt-3 text-xs text-coral-600 bg-coral-50 rounded-lg px-3 py-2 border border-coral-100">
            {error}
          </div>
        )}

        {!editing ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm mt-3">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-0.5">Program Track</p>
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 text-xs font-semibold">
                {trackLabel}
              </span>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-0.5">Silo</p>
              <p className="text-warm-gray-900 font-medium">{referral.silo || '—'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-0.5">District of Residence</p>
              <p className="text-warm-gray-900 font-medium">{referral.districtOfResidence || '—'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-0.5">Referring Party</p>
              <p className="text-warm-gray-900 font-medium">{referral.referringParty || '—'}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-0.5">Start Date at School</p>
              <p className="text-warm-gray-900 font-medium">
                {referral.dateStudentStartedSchool
                  ? new Date(referral.dateStudentStartedSchool).toLocaleDateString()
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-0.5">Service Provider</p>
              <p className="text-warm-gray-900 font-medium">{referral.serviceProvider || '—'}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 mt-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-1">
                  Program Track
                </label>
                <select
                  value={form.programTrack}
                  onChange={e => setForm(f => ({ ...f, programTrack: e.target.value }))}
                  className="w-full rounded-xl border border-cream-200 bg-white px-3 py-2 text-sm text-warm-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-500"
                >
                  {PROGRAM_TRACKS.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-1">
                  Silo
                </label>
                <select
                  value={form.silo}
                  onChange={e => setForm(f => ({ ...f, silo: e.target.value }))}
                  className="w-full rounded-xl border border-cream-200 bg-white px-3 py-2 text-sm text-warm-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-500"
                >
                  {SILO_OPTIONS.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-1">
                District of Residence
              </label>
              <input
                type="text"
                value={form.districtOfResidence}
                onChange={e => setForm(f => ({ ...f, districtOfResidence: e.target.value }))}
                className="w-full rounded-xl border border-cream-200 bg-white px-3 py-2 text-sm text-warm-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-500"
                placeholder="e.g. Yuba City USD"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-1">
                Referring Party
              </label>
              <input
                type="text"
                value={form.referringParty}
                onChange={e => setForm(f => ({ ...f, referringParty: e.target.value }))}
                className="w-full rounded-xl border border-cream-200 bg-white px-3 py-2 text-sm text-warm-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-500"
                placeholder="e.g. John Smith, Special Ed Director"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-1">
                  Start Date at School
                </label>
                <input
                  type="date"
                  value={form.dateStudentStartedSchool}
                  onChange={e => setForm(f => ({ ...f, dateStudentStartedSchool: e.target.value }))}
                  className="w-full rounded-xl border border-cream-200 bg-white px-3 py-2 text-sm text-warm-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-1">
                  Service Provider
                </label>
                <input
                  type="text"
                  value={form.serviceProvider}
                  onChange={e => setForm(f => ({ ...f, serviceProvider: e.target.value }))}
                  className="w-full rounded-xl border border-cream-200 bg-white px-3 py-2 text-sm text-warm-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-500"
                  placeholder="e.g. ABC Therapy Services"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
