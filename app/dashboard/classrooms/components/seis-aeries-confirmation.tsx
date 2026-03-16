'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface SeisAeriesConfirmationProps {
  placementId: string
  seisConfirmed: boolean
  seisConfirmedAt: string | null
  seisConfirmedBy: string | null
  aeriesConfirmed: boolean
  aeriesConfirmedAt: string | null
  aeriesConfirmedBy: string | null
  confirmedByName?: string | null
}

export default function SeisAeriesConfirmation({
  placementId,
  seisConfirmed: initialSeis,
  seisConfirmedAt,
  aeriesConfirmed: initialAeries,
  aeriesConfirmedAt,
}: SeisAeriesConfirmationProps) {
  const router = useRouter()
  const [seis, setSeis] = useState(initialSeis)
  const [aeries, setAeries] = useState(initialAeries)
  const [loadingSeis, setLoadingSeis] = useState(false)
  const [loadingAeries, setLoadingAeries] = useState(false)

  async function toggleSeis() {
    setLoadingSeis(true)
    try {
      const res = await fetch(`/api/placements/${placementId}/seis`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmed: !seis }),
      })
      if (!res.ok) throw new Error('Failed to update')
      setSeis(!seis)
      toast.success(seis ? 'SEIS confirmation removed' : 'SEIS confirmed')
      router.refresh()
    } catch {
      toast.error('Failed to update SEIS confirmation')
    } finally {
      setLoadingSeis(false)
    }
  }

  async function toggleAeries() {
    setLoadingAeries(true)
    try {
      const res = await fetch(`/api/placements/${placementId}/aeries`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmed: !aeries }),
      })
      if (!res.ok) throw new Error('Failed to update')
      setAeries(!aeries)
      toast.success(aeries ? 'Aeries confirmation removed' : 'Aeries confirmed')
      router.refresh()
    } catch {
      toast.error('Failed to update Aeries confirmation')
    } finally {
      setLoadingAeries(false)
    }
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* SEIS */}
      <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-warm-gray-700">SEIS</span>
          <button
            onClick={toggleSeis}
            disabled={loadingSeis}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:opacity-50 ${
              seis ? 'bg-green-500' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                seis ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
        {seis && seisConfirmedAt ? (
          <p className="text-xs text-green-600">
            Confirmed {format(new Date(seisConfirmedAt), 'MM/dd/yyyy')}
          </p>
        ) : (
          <p className="text-xs text-warm-gray-400 italic">Not confirmed</p>
        )}
      </div>

      {/* Aeries */}
      <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-warm-gray-700">Aeries</span>
          <button
            onClick={toggleAeries}
            disabled={loadingAeries}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:opacity-50 ${
              aeries ? 'bg-green-500' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                aeries ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
        {aeries && aeriesConfirmedAt ? (
          <p className="text-xs text-green-600">
            Confirmed {format(new Date(aeriesConfirmedAt), 'MM/dd/yyyy')}
          </p>
        ) : (
          <p className="text-xs text-warm-gray-400 italic">Not confirmed</p>
        )}
      </div>
    </div>
  )
}
