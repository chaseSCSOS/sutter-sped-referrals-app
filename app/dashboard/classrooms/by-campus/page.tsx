'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ClassroomCard from '../components/classroom-card'

const SILO_LABELS: Record<string, string> = {
  ASD_ELEM: 'ASD-Elem',
  ASD_MIDHS: 'ASD-MidHS',
  SD: 'SD',
  NC: 'NC',
  DHH: 'DHH',
  ATP: 'ATP',
  MD: 'MD',
}

const SILO_ORDER = ['ASD_ELEM', 'ASD_MIDHS', 'SD', 'NC', 'DHH', 'ATP', 'MD']

const SILO_HEADER_COLORS: Record<string, string> = {
  ASD_ELEM: 'bg-sky-50 border-sky-200 text-sky-800',
  ASD_MIDHS: 'bg-sky-50 border-sky-200 text-sky-800',
  SD: 'bg-teal-50 border-teal-200 text-teal-800',
  NC: 'bg-amber-50 border-amber-200 text-amber-800',
  DHH: 'bg-violet-50 border-violet-200 text-violet-800',
  ATP: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  MD: 'bg-red-50 border-red-200 text-red-800',
}

interface Site {
  id: string
  name: string
  isActive: boolean
}

interface Classroom {
  id: string
  programSilo: string
  gradeStart: string
  gradeEnd: string
  sessionType: string
  sessionNumber?: string | null
  positionControlNumber?: string | null
  maxCapacity?: number | null
  isOpenPosition: boolean
  site: { name: string }
  teacher?: { id: string; name: string; positionControlNumber?: string | null } | null
  paras: Array<{ id: string; name: string; role: string; isVacancy: boolean }>
  studentPlacements: Array<{
    id: string
    studentNameFirst: string
    studentNameLast: string
    grade: string
    primaryDisability?: string | null
    enrollmentStatus: string
    requires1to1: boolean
    seisConfirmed: boolean
    aeriesConfirmed: boolean
  }>
  _count?: { studentPlacements: number }
}

export default function ByCampusPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const siteIdParam = searchParams.get('siteId') ?? ''

  const [sites, setSites] = useState<Site[]>([])
  const [selectedSiteId, setSelectedSiteId] = useState<string>(siteIdParam)
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [loading, setLoading] = useState(false)
  const [sitesLoading, setSitesLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load sites on mount
  useEffect(() => {
    async function fetchSites() {
      setSitesLoading(true)
      try {
        const res = await fetch('/api/sites')
        if (!res.ok) throw new Error('Failed to load sites')
        const data = await res.json()
        const activeSites = (data.sites as Site[]).filter((s) => s.isActive)
        setSites(activeSites)
      } catch {
        setError('Could not load sites.')
      } finally {
        setSitesLoading(false)
      }
    }
    fetchSites()
  }, [])

  // Load classrooms when site changes
  const fetchClassrooms = useCallback(async (siteId: string) => {
    if (!siteId) {
      setClassrooms([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/classrooms?siteId=${encodeURIComponent(siteId)}`)
      if (!res.ok) throw new Error('Failed to load classrooms')
      const data = await res.json()
      setClassrooms(data.classrooms ?? [])
    } catch {
      setError('Could not load classrooms for this site.')
      setClassrooms([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedSiteId) {
      fetchClassrooms(selectedSiteId)
    } else {
      setClassrooms([])
    }
  }, [selectedSiteId, fetchClassrooms])

  function handleSiteChange(siteId: string) {
    setSelectedSiteId(siteId)
    const params = new URLSearchParams(searchParams.toString())
    if (siteId) {
      params.set('siteId', siteId)
    } else {
      params.delete('siteId')
    }
    router.replace(`/dashboard/classrooms/by-campus?${params.toString()}`)
  }

  // Group classrooms by programSilo
  const grouped = new Map<string, Classroom[]>()
  for (const silo of SILO_ORDER) {
    grouped.set(silo, [])
  }
  for (const c of classrooms) {
    const arr = grouped.get(c.programSilo) ?? []
    arr.push(c)
    grouped.set(c.programSilo, arr)
  }

  const activeSilos = SILO_ORDER.filter((silo) => (grouped.get(silo)?.length ?? 0) > 0)

  const selectedSite = sites.find((s) => s.id === selectedSiteId)

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-warm-gray-500 mb-1">Classrooms</p>
        <h1 className="text-2xl font-semibold text-warm-gray-900">By Campus</h1>
        <p className="text-sm text-warm-gray-600 mt-0.5">Select a site to view its classrooms</p>
      </div>

      {/* Site selector */}
      <div className="mb-6">
        <label htmlFor="site-select" className="block text-sm font-medium text-warm-gray-700 mb-1.5">
          Campus / Site
        </label>
        {sitesLoading ? (
          <div className="h-9 w-72 bg-gray-100 rounded animate-pulse" />
        ) : (
          <select
            id="site-select"
            value={selectedSiteId}
            onChange={(e) => handleSiteChange(e.target.value)}
            className="block w-72 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-warm-gray-900 shadow-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          >
            <option value="">-- Select a site --</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Results */}
      {!selectedSiteId && !sitesLoading && (
        <div className="text-center py-16 text-warm-gray-400">
          <p className="text-sm">Choose a site above to view classrooms.</p>
        </div>
      )}

      {selectedSiteId && loading && (
        <div className="text-center py-16 text-warm-gray-400">
          <p className="text-sm">Loading classrooms&hellip;</p>
        </div>
      )}

      {selectedSiteId && !loading && classrooms.length === 0 && !error && (
        <div className="text-center py-16 text-warm-gray-400">
          <p className="text-sm">
            No classrooms found at {selectedSite?.name ?? 'this site'}.
          </p>
        </div>
      )}

      {selectedSiteId && !loading && activeSilos.length > 0 && (
        <div className="space-y-8">
          {activeSilos.map((silo) => {
            const siloClassrooms = grouped.get(silo) ?? []
            const headerColor = SILO_HEADER_COLORS[silo] ?? 'bg-gray-50 border-gray-200 text-gray-700'
            return (
              <section key={silo}>
                <div
                  className={`px-4 py-2 rounded-lg border mb-4 flex items-center justify-between ${headerColor}`}
                >
                  <h2 className="text-sm font-semibold">
                    {SILO_LABELS[silo] ?? silo}
                  </h2>
                  <span className="text-xs font-medium opacity-75">
                    {siloClassrooms.length} classroom{siloClassrooms.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {siloClassrooms.map((classroom) => (
                    <ClassroomCard key={classroom.id} classroom={classroom} />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
