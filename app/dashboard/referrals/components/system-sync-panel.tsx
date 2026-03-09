'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface SystemSyncPanelProps {
  referral: any
  canManage: boolean
  showForTracks?: string[]
}

function SyncRow({
  system,
  checked,
  date,
  canManage,
  onToggle,
  saving,
}: {
  system: string
  checked: boolean
  date: string | null
  canManage: boolean
  onToggle: (val: boolean) => void
  saving: boolean
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-cream-100 last:border-0">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
          checked ? 'bg-sage-100 text-sage-700' : 'bg-cream-100 text-warm-gray-500'
        }`}>
          {system}
        </div>
        <div>
          <p className="text-sm font-medium text-warm-gray-900">{system}</p>
          <p className="text-[11px] text-warm-gray-500">
            {checked ? `Entered ${date ? new Date(date).toLocaleDateString() : ''}` : 'Not yet entered'}
          </p>
        </div>
      </div>
      {canManage && (
        <button
          onClick={() => onToggle(!checked)}
          disabled={saving}
          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
            checked ? 'bg-sage-500 border-sage-500' : 'bg-cream-200 border-cream-300'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
              checked ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      )}
      {!canManage && (
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
          checked ? 'bg-sage-50 text-sage-700 border border-sage-200' : 'bg-warm-gray-50 text-warm-gray-500 border border-warm-gray-200'
        }`}>
          {checked ? 'Yes' : 'No'}
        </span>
      )}
    </div>
  )
}

export default function SystemSyncPanel({ referral, canManage, showForTracks }: SystemSyncPanelProps) {
  const router = useRouter()
  const [savingSEIS, setSavingSEIS] = useState(false)
  const [savingAeries, setSavingAeries] = useState(false)
  const [error, setError] = useState('')

  // Only show if the referral is a SCIP or VIP track (or if no filter is given)
  const track = referral.programTrack || 'GENERAL'
  if (showForTracks && !showForTracks.includes(track)) {
    return null
  }

  async function toggleSystem(field: 'inSEIS' | 'inAeries', value: boolean) {
    const setSaving = field === 'inSEIS' ? setSavingSEIS : setSavingAeries
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/referrals/${referral.id}/sync`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, value }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to update')
        return
      }

      router.refresh()
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  const bothComplete = referral.inSEIS && referral.inAeries

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-cream-200 overflow-hidden">
      <div className="px-6 pt-6 pb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-warm-gray-900 flex items-center gap-2">
          <span className="w-1.5 h-4 bg-violet-500 rounded-full inline-block"></span>
          System Sync
          {bothComplete && (
            <span className="ml-auto text-[10px] font-semibold bg-sage-50 text-sage-700 border border-sage-200 px-2 py-0.5 rounded-full">
              Complete
            </span>
          )}
        </h2>
      </div>

      <div className="px-6 pb-6">
        {error && (
          <div className="mt-3 text-xs text-coral-600 bg-coral-50 rounded-xl px-3 py-2 border border-coral-100">
            {error}
          </div>
        )}

        <div className="mt-3">
          <SyncRow
            system="SEIS"
            checked={!!referral.inSEIS}
            date={referral.inSEISDate}
            canManage={canManage}
            onToggle={(val) => toggleSystem('inSEIS', val)}
            saving={savingSEIS}
          />
          <SyncRow
            system="Aeries"
            checked={!!referral.inAeries}
            date={referral.inAeriesDate}
            canManage={canManage}
            onToggle={(val) => toggleSystem('inAeries', val)}
            saving={savingAeries}
          />
        </div>

        {!bothComplete && (
          <p className="text-[11px] text-warm-gray-400 mt-3">
            Toggle the switch once the student has been entered into each system.
          </p>
        )}
      </div>
    </section>
  )
}
