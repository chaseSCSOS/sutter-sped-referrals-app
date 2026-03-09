'use client'

import { useState, useEffect } from 'react'
import ReferralCard from './referral-card'
import ReferralTable from './referral-table'
import Pagination from '@/components/ui/pagination'

interface ReferralListProps {
  initialReferrals?: any[]
  isStaff?: boolean
}

type PresetTab = 'ALL' | 'GENERAL' | 'BEHAVIOR' | 'DHH' | 'SCIP' | 'VIP'

const PRESET_TABS: { value: PresetTab; label: string; track?: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'GENERAL', label: 'General', track: 'GENERAL' },
  { value: 'BEHAVIOR', label: 'BX', track: 'BEHAVIOR' },
  { value: 'DHH', label: 'DHH', track: 'DHH' },
  { value: 'SCIP', label: 'SCIP', track: 'SCIP' },
  { value: 'VIP', label: 'VIP', track: 'VIP' },
]

const STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'MISSING_DOCUMENTS', label: 'Missing Documents' },
  { value: 'PENDING_ADDITIONAL_INFO', label: 'Pending Info' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'NOT_ENROLLING', label: 'Not Enrolling' },
  { value: 'WITHDRAWN', label: 'Withdrawn' },
]

const CUM_STATUSES = [
  { value: '', label: 'All CUM' },
  { value: 'none', label: 'Not Requested' },
  { value: 'requested', label: 'Requested' },
  { value: 'received', label: 'Received' },
  { value: 'sent', label: 'Sent' },
]

export default function ReferralList({ initialReferrals = [], isStaff = false }: ReferralListProps) {
  const [referrals, setReferrals] = useState(initialReferrals)
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [activePreset, setActivePreset] = useState<PresetTab>('ALL')
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    cumStatus: '',
  })

  useEffect(() => {
    fetchReferrals()
  }, [filters, page, activePreset])

  useEffect(() => {
    setPage(1)
  }, [filters.status, filters.search, filters.cumStatus, activePreset])

  async function fetchReferrals() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.status) params.set('status', filters.status)
      if (filters.search) params.set('search', filters.search)
      if (filters.cumStatus) params.set('cumStatus', filters.cumStatus)

      const preset = PRESET_TABS.find(t => t.value === activePreset)
      if (preset?.track) params.set('programTrack', preset.track)

      params.set('page', String(page))
      params.set('limit', '20')

      const response = await fetch(`/api/referrals?${params}`)
      if (response.ok) {
        const data = await response.json()
        setReferrals(data.referrals || [])
        if (data.pagination) {
          setTotalPages(data.pagination.pages)
          setTotal(data.pagination.total)
        }
      }
    } catch (error) {
      console.error('Failed to fetch referrals:', error)
    } finally {
      setLoading(false)
    }
  }

  const showSyncColumns = activePreset === 'SCIP' || activePreset === 'VIP'
  const showCumFilter = isStaff

  return (
    <div className="space-y-4">
      {/* Preset tabs — replicating spreadsheet tabs */}
      {isStaff && (
        <div className="flex items-center gap-1 bg-white rounded-2xl border border-cream-200 p-1.5"
             style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          {PRESET_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setActivePreset(tab.value)}
              className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all ${
                activePreset === tab.value
                  ? 'bg-sky-700 text-white shadow-sm'
                  : 'text-warm-gray-600 hover:text-warm-gray-900 hover:bg-cream-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200"
           style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)' }}>
        <div className={`grid gap-4 ${showCumFilter ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-slate-700 mb-1.5">
              Search
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                id="search"
                type="text"
                placeholder="Student name or confirmation number..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all text-slate-900 placeholder-slate-400 text-sm"
                style={{ outline: 'none' }}
              />
            </div>
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-slate-700 mb-1.5">
              Status
            </label>
            <select
              id="status"
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all text-slate-900 text-sm"
              style={{ outline: 'none' }}
            >
              {STATUSES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {showCumFilter && (
            <div>
              <label htmlFor="cumStatus" className="block text-sm font-medium text-slate-700 mb-1.5">
                CUM Status
              </label>
              <select
                id="cumStatus"
                value={filters.cumStatus}
                onChange={(e) => setFilters(prev => ({ ...prev, cumStatus: e.target.value }))}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all text-slate-900 text-sm"
                style={{ outline: 'none' }}
              >
                {CUM_STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Results toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <p className="text-sm text-slate-600">
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading...
              </span>
            ) : (
              <>
                <span className="font-semibold text-slate-900">{total}</span> referral{total !== 1 ? 's' : ''} found
              </>
            )}
          </p>

          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'cards'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
          </div>
        </div>

        <button
          onClick={fetchReferrals}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-sky-700 bg-sky-50 rounded-xl hover:bg-sky-100 transition-colors disabled:opacity-50"
        >
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200"
             style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)' }}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading referrals...</p>
        </div>
      ) : referrals.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200"
             style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)' }}>
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-slate-600 font-medium">No referrals found</p>
          <p className="text-slate-500 text-sm mt-1">Try adjusting your search or filter criteria</p>
        </div>
      ) : viewMode === 'table' ? (
        <ReferralTable referrals={referrals} preset={activePreset} showSyncColumns={showSyncColumns} isStaff={isStaff} />
      ) : (
        <div className="space-y-4">
          {referrals.map(referral => (
            <ReferralCard key={referral.id} referral={referral} />
          ))}
        </div>
      )}

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  )
}
