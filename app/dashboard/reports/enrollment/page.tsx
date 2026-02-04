'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'

interface EnrollmentStats {
  totalReferrals: number
  byStatus: Record<string, number>
  byGrade: Record<string, number>
  byPrimaryDisability: Record<string, number>
  bySilo: Record<string, number>
  byPlacementType: Record<string, number>
}

interface Referral {
  id: string
  status: string
  grade: string
  primaryDisability: string
  silo: string | null
  placementType: string
  submittedAt: string
  assignedToStaff: { name: string } | null
}

interface ReportData {
  stats: EnrollmentStats
  referrals: Referral[]
  filters: {
    startDate: string | null
    endDate: string | null
    status: string | null
  }
}

// Disability code labels
const DISABILITY_LABELS: Record<string, string> = {
  '210': 'Intellectual Disability',
  '220': 'Hard of Hearing',
  '230': 'Deaf',
  '240': 'Speech or Language Impairment',
  '250': 'Visual Impairment',
  '260': 'Emotional Disturbance',
  '270': 'Orthopedic Impairment',
  '280': 'Other Health Impairment',
  '281': 'Traumatic Brain Injury',
  '290': 'Specific Learning Disability',
  '300': 'Deaf-Blindness',
  '310': 'Multiple Disabilities',
  '320': 'Autism',
  '330': 'Established Medical Disability (EMD)',
}

export default function EnrollmentReportPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filters
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    fetchReportData()
  }, [])

  async function fetchReportData() {
    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      if (statusFilter) params.append('status', statusFilter)

      const response = await fetch(`/api/reports/enrollment?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Failed to fetch report data')
      }

      const data = await response.json()
      setReportData(data)
    } catch (err) {
      setError('Failed to load enrollment report. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function handleApplyFilters() {
    fetchReportData()
  }

  function handleClearFilters() {
    setStartDate('')
    setEndDate('')
    setStatusFilter('')
    setTimeout(() => fetchReportData(), 0)
  }

  function exportToCSV() {
    if (!reportData) return

    // Create CSV header
    const headers = [
      'Student ID',
      'Status',
      'Grade',
      'Primary Disability',
      'Silo',
      'Placement Type',
      'Submitted Date',
      'Assigned Teacher',
    ]

    // Create CSV rows
    const rows = reportData.referrals.map((ref) => [
      ref.id,
      ref.status,
      ref.grade,
      DISABILITY_LABELS[ref.primaryDisability] || ref.primaryDisability,
      ref.silo || 'Unassigned',
      ref.placementType,
      format(new Date(ref.submittedAt), 'MM/dd/yyyy'),
      ref.assignedToStaff?.name || 'Unassigned',
    ])

    // Combine headers and rows
    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n')

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `enrollment-report-${format(new Date(), 'yyyy-MM-dd')}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading report...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-xl">
          {error}
        </div>
      </div>
    )
  }

  if (!reportData) return null

  const { stats } = reportData

  return (
    <div className="max-w-[1600px] mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-sky-700">Enrollment Projections</h1>
        <p className="text-sm text-warm-gray-600">View and analyze referral data for enrollment planning</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-cream-200 shadow-sm p-4">
        <h2 className="text-base font-semibold text-warm-gray-900 mb-3">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-cream-200/80 bg-white/70 px-3 py-2 text-sm text-warm-gray-800 shadow-sm transition focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-200/70 focus-visible:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-cream-200/80 bg-white/70 px-3 py-2 text-sm text-warm-gray-800 shadow-sm transition focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-200/70 focus-visible:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-cream-200/80 bg-white/70 px-3 py-2 text-sm text-warm-gray-800 shadow-sm transition focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-200/70 focus-visible:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="APPROVED">Approved</option>
              <option value="ACCEPTED_AWAITING_PLACEMENT">Accepted - Awaiting Placement</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <button
            onClick={handleApplyFilters}
            className="px-3.5 py-2 bg-sky-600 text-white rounded-lg text-sm font-semibold hover:bg-sky-700"
          >
            Apply Filters
          </button>
          <button
            onClick={handleClearFilters}
            className="px-3.5 py-2 bg-cream-100 text-warm-gray-700 rounded-lg text-sm font-semibold hover:bg-cream-200"
          >
            Clear Filters
          </button>
          <button
            onClick={exportToCSV}
            className="ml-auto px-3.5 py-2 bg-sage-600 text-white rounded-lg text-sm font-semibold hover:bg-sage-700"
          >
            Export to CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-cream-200 shadow-sm p-4">
          <h3 className="text-xs font-semibold text-warm-gray-600 mb-1">Total Referrals</h3>
          <p className="text-2xl font-bold text-sky-700">{stats.totalReferrals}</p>
        </div>
        <div className="bg-white rounded-xl border border-cream-200 shadow-sm p-4">
          <h3 className="text-xs font-semibold text-warm-gray-600 mb-1">Awaiting Placement</h3>
          <p className="text-2xl font-bold text-emerald-600">
            {stats.byStatus['ACCEPTED_AWAITING_PLACEMENT'] || 0}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-cream-200 shadow-sm p-4">
          <h3 className="text-xs font-semibold text-warm-gray-600 mb-1">Under Review</h3>
          <p className="text-2xl font-bold text-yellow-600">
            {stats.byStatus['UNDER_REVIEW'] || 0}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-cream-200 shadow-sm p-4">
          <h3 className="text-xs font-semibold text-warm-gray-600 mb-1">Completed</h3>
          <p className="text-2xl font-bold text-teal-600">
            {stats.byStatus['COMPLETED'] || 0}
          </p>
        </div>
      </div>

      {/* Detailed Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* By Grade */}
        <div className="bg-white rounded-xl border border-cream-200 shadow-sm p-4">
          <h3 className="text-base font-semibold text-warm-gray-900 mb-3">By Grade Level</h3>
          <div className="space-y-1.5">
            {Object.entries(stats.byGrade)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([grade, count]) => (
                <div key={grade} className="flex justify-between items-center">
                  <span className="text-sm text-warm-gray-700">{grade}</span>
                  <span className="text-sm font-semibold text-warm-gray-900">{count}</span>
                </div>
              ))}
          </div>
        </div>

        {/* By Primary Disability */}
        <div className="bg-white rounded-xl border border-cream-200 shadow-sm p-4">
          <h3 className="text-base font-semibold text-warm-gray-900 mb-3">By Primary Disability</h3>
          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {Object.entries(stats.byPrimaryDisability)
              .sort(([, a], [, b]) => b - a)
              .map(([code, count]) => (
                <div key={code} className="flex justify-between items-center">
                  <span className="text-sm text-warm-gray-700">
                    {DISABILITY_LABELS[code] || code}
                  </span>
                  <span className="text-sm font-semibold text-warm-gray-900">{count}</span>
                </div>
              ))}
          </div>
        </div>

        {/* By Silo */}
        <div className="bg-white rounded-xl border border-cream-200 shadow-sm p-4">
          <h3 className="text-base font-semibold text-warm-gray-900 mb-3">By Silo</h3>
          <div className="space-y-1.5">
            {Object.entries(stats.bySilo)
              .sort(([, a], [, b]) => b - a)
              .map(([silo, count]) => (
                <div key={silo} className="flex justify-between items-center">
                  <span className="text-sm text-warm-gray-700">{silo}</span>
                  <span className="text-sm font-semibold text-warm-gray-900">{count}</span>
                </div>
              ))}
          </div>
        </div>

        {/* By Placement Type */}
        <div className="bg-white rounded-xl border border-cream-200 shadow-sm p-4">
          <h3 className="text-base font-semibold text-warm-gray-900 mb-3">By Placement Type</h3>
          <div className="space-y-1.5">
            {Object.entries(stats.byPlacementType).map(([type, count]) => (
              <div key={type} className="flex justify-between items-center">
                <span className="text-sm text-warm-gray-700">
                  {type === 'FRA' ? 'FRA (Functionally Related Academic)' : 'SDC (Special Day Class)'}
                </span>
                <span className="text-sm font-semibold text-warm-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* By Status */}
        <div className="bg-white rounded-xl border border-cream-200 shadow-sm p-4 md:col-span-2">
          <h3 className="text-base font-semibold text-warm-gray-900 mb-3">By Status</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(stats.byStatus)
              .sort(([, a], [, b]) => b - a)
              .map(([status, count]) => (
                <div key={status} className="text-center p-3 bg-cream-50/70 border border-cream-200/70 rounded-lg">
                  <p className="text-xl font-bold text-warm-gray-900">{count}</p>
                  <p className="text-xs text-warm-gray-600 mt-1">
                    {status.replace(/_/g, ' ')}
                  </p>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
