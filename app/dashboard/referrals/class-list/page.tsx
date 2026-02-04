'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import StatusBadge from '../components/status-badge'
import type { ReferralStatus } from '@prisma/client'

interface ClassListReferral {
  id: string
  studentName: string
  primaryDisability: string
  grade: string
  submittedAt: string
  silo: string | null
  status: ReferralStatus
  assignedToStaff: { name: string } | null
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

export default function ClassListPage() {
  const [referrals, setReferrals] = useState<ClassListReferral[]>([])
  const [filteredReferrals, setFilteredReferrals] = useState<ClassListReferral[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filters
  const [gradeFilter, setGradeFilter] = useState('')
  const [siloFilter, setSiloFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // Sort
  const [sortColumn, setSortColumn] = useState<keyof ClassListReferral>('studentName')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    fetchReferrals()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [referrals, gradeFilter, siloFilter, statusFilter, searchTerm, sortColumn, sortDirection])

  async function fetchReferrals() {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/referrals')

      if (!response.ok) {
        throw new Error('Failed to fetch referrals')
      }

      const data = await response.json()
      setReferrals(data.referrals || [])
    } catch (err) {
      setError('Failed to load class list. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function applyFilters() {
    let filtered = [...referrals]

    // Apply filters
    if (gradeFilter) {
      filtered = filtered.filter((r) => r.grade === gradeFilter)
    }

    if (siloFilter) {
      filtered = filtered.filter((r) => (r.silo || 'Unassigned') === siloFilter)
    }

    if (statusFilter) {
      filtered = filtered.filter((r) => r.status === statusFilter)
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter((r) =>
        r.studentName.toLowerCase().includes(term) ||
        (r.assignedToStaff?.name || '').toLowerCase().includes(term)
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortColumn]
      let bValue: any = b[sortColumn]

      // Handle null values
      if (sortColumn === 'silo') {
        aValue = aValue || 'Unassigned'
        bValue = bValue || 'Unassigned'
      }

      if (sortColumn === 'assignedToStaff') {
        aValue = a.assignedToStaff?.name || 'Unassigned'
        bValue = b.assignedToStaff?.name || 'Unassigned'
      }

      if (typeof aValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }

      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
    })

    setFilteredReferrals(filtered)
  }

  function handleSort(column: keyof ClassListReferral) {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  function exportToCSV() {
    // Create CSV header
    const headers = [
      'Last Name',
      'First Name',
      'Primary Disability',
      'Grade',
      'DOR',
      'Silo',
      'Assigned Teacher',
      'Status',
    ]

    // Create CSV rows
    const rows = filteredReferrals.map((ref) => {
      const [lastName, ...firstNameParts] = ref.studentName.split(',').map((s) => s.trim())
      const firstName = firstNameParts.join(' ') || ref.studentName.split(' ').slice(1).join(' ')

      return [
        lastName || ref.studentName.split(' ')[ref.studentName.split(' ').length - 1],
        firstName || ref.studentName.split(' ').slice(0, -1).join(' '),
        DISABILITY_LABELS[ref.primaryDisability] || ref.primaryDisability,
        ref.grade,
        format(new Date(ref.submittedAt), 'MM/dd/yyyy'),
        ref.silo || 'Unassigned',
        ref.assignedToStaff?.name || 'Unassigned',
        ref.status,
      ]
    })

    // Combine headers and rows
    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n')

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `class-list-${format(new Date(), 'yyyy-MM-dd')}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  // Get unique values for filters
  const grades = Array.from(new Set(referrals.map((r) => r.grade))).sort()
  const silos = Array.from(new Set(referrals.map((r) => r.silo || 'Unassigned'))).sort()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading class list...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-xl">{error}</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Class List</h1>
        <p className="text-gray-600 mt-1">View and manage student referrals in list format</p>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Student or teacher name..."
              className="w-full rounded-xl border border-cream-200/80 bg-white/70 px-3 py-2 text-sm text-warm-gray-800 shadow-sm transition focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-200/70 focus-visible:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="w-full rounded-xl border border-cream-200/80 bg-white/70 px-3 py-2 text-sm text-warm-gray-800 shadow-sm transition focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-200/70 focus-visible:outline-none"
            >
              <option value="">All Grades</option>
              {grades.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Silo</label>
            <select
              value={siloFilter}
              onChange={(e) => setSiloFilter(e.target.value)}
              className="w-full rounded-xl border border-cream-200/80 bg-white/70 px-3 py-2 text-sm text-warm-gray-800 shadow-sm transition focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-200/70 focus-visible:outline-none"
            >
              <option value="">All Silos</option>
              {silos.map((silo) => (
                <option key={silo} value={silo}>
                  {silo}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-cream-200/80 bg-white/70 px-3 py-2 text-sm text-warm-gray-800 shadow-sm transition focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-200/70 focus-visible:outline-none"
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
        <div className="flex gap-3">
          <button
            onClick={() => {
              setSearchTerm('')
              setGradeFilter('')
              setSiloFilter('')
              setStatusFilter('')
            }}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300"
          >
            Clear Filters
          </button>
          <button
            onClick={exportToCSV}
            className="ml-auto px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700"
          >
            Export to CSV
          </button>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4 text-sm text-gray-600">
        Showing {filteredReferrals.length} of {referrals.length} referrals
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  onClick={() => handleSort('studentName')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Student Name {sortColumn === 'studentName' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => handleSort('primaryDisability')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Primary Disability {sortColumn === 'primaryDisability' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => handleSort('grade')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Grade {sortColumn === 'grade' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => handleSort('submittedAt')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  DOR {sortColumn === 'submittedAt' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => handleSort('silo')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Silo {sortColumn === 'silo' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => handleSort('assignedToStaff')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Assigned Teacher {sortColumn === 'assignedToStaff' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReferrals.map((referral) => (
                <tr key={referral.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {referral.studentName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {DISABILITY_LABELS[referral.primaryDisability] || referral.primaryDisability}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{referral.grade}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {format(new Date(referral.submittedAt), 'MM/dd/yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {referral.silo || 'Unassigned'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {referral.assignedToStaff?.name || 'Unassigned'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={referral.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <a
                      href={`/dashboard/referrals/${referral.id}`}
                      className="text-sky-700 hover:text-blue-800 font-medium"
                    >
                      View
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredReferrals.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No referrals found matching your filters.</p>
          </div>
        )}
      </div>
    </div>
  )
}
