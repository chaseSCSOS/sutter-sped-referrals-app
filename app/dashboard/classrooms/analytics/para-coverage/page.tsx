'use client'

import { useEffect, useState } from 'react'

const SCHOOL_YEAR_OPTIONS = [
  '2025-2026',
  '2024-2025',
  '2026-2027',
]

const SILO_LABELS: Record<string, string> = {
  ASD_ELEM: 'ASD-Elem',
  ASD_MIDHS: 'ASD-MidHS',
  SD: 'SD',
  NC: 'NC',
  DHH: 'DHH',
  ATP: 'ATP',
  MD: 'MD',
}

function getCurrentSchoolYear(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  if (month >= 8) return `${year}-${year + 1}`
  return `${year - 1}-${year}`
}

interface StudentCoverage {
  id: string
  name: string
  paraName: string | null
  isVacant: boolean
}

interface ClassroomCoverage {
  classroomId: string
  teacherName: string
  siteName: string
  programSilo: string
  totalRequiring1to1: number
  assigned: number
  vacant: number
  students: StudentCoverage[]
}

export default function ParaCoveragePage() {
  const [schoolYear, setSchoolYear] = useState<string>(getCurrentSchoolYear())
  const [siloFilter, setSiloFilter] = useState<string>('')
  const [data, setData] = useState<ClassroomCoverage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchData(schoolYear)
  }, [schoolYear])

  async function fetchData(year: string) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/classrooms/analytics/para-coverage?schoolYear=${encodeURIComponent(year)}`
      )
      if (!res.ok) throw new Error('Failed to load para coverage data')
      const json = await res.json()
      setData(json.coverage ?? [])
    } catch {
      setError('Could not load para coverage data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function toggleRow(classroomId: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(classroomId)) {
        next.delete(classroomId)
      } else {
        next.add(classroomId)
      }
      return next
    })
  }

  const filtered =
    siloFilter ? data.filter((c) => c.programSilo === siloFilter) : data

  // Only include classrooms that have at least one student requiring 1:1
  const withStudents = filtered.filter((c) => c.totalRequiring1to1 > 0)

  const totalRequiring = withStudents.reduce((s, c) => s + c.totalRequiring1to1, 0)
  const totalAssigned = withStudents.reduce((s, c) => s + c.assigned, 0)
  const totalVacant = withStudents.reduce((s, c) => s + c.vacant, 0)

  const uniqueSilos = Array.from(new Set(data.map((c) => c.programSilo))).sort()

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-warm-gray-500 mb-1">
          Classrooms / Analytics
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-warm-gray-900">1:1 Para Coverage</h1>
            <p className="text-sm text-warm-gray-600 mt-0.5">
              Students requiring 1:1 paraprofessional support by classroom
            </p>
          </div>

          {/* School year selector */}
          <div className="ml-auto">
            <label htmlFor="school-year" className="block text-xs font-medium text-warm-gray-700 mb-1">
              School Year
            </label>
            <select
              id="school-year"
              value={schoolYear}
              onChange={(e) => setSchoolYear(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-warm-gray-900 shadow-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            >
              {SCHOOL_YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary row */}
      {!loading && !error && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-cream-200 shadow-sm p-4 text-center">
            <p className="text-xs font-semibold text-warm-gray-600 mb-1">Requiring 1:1</p>
            <p className="text-3xl font-bold text-warm-gray-900">{totalRequiring}</p>
          </div>
          <div className="bg-white rounded-xl border border-cream-200 shadow-sm p-4 text-center">
            <p className="text-xs font-semibold text-warm-gray-600 mb-1">Assigned</p>
            <p className="text-3xl font-bold text-emerald-600">{totalAssigned}</p>
          </div>
          <div className={`rounded-xl border shadow-sm p-4 text-center ${totalVacant > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-cream-200'}`}>
            <p className="text-xs font-semibold text-warm-gray-600 mb-1">Vacant</p>
            <p className={`text-3xl font-bold ${totalVacant > 0 ? 'text-red-600' : 'text-warm-gray-900'}`}>
              {totalVacant}
            </p>
          </div>
        </div>
      )}

      {/* Filter row */}
      <div className="mb-4 flex items-center gap-3">
        <label htmlFor="silo-filter" className="text-sm font-medium text-warm-gray-700">
          Program:
        </label>
        <select
          id="silo-filter"
          value={siloFilter}
          onChange={(e) => setSiloFilter(e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-warm-gray-900 shadow-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
        >
          <option value="">All Programs</option>
          {uniqueSilos.map((silo) => (
            <option key={silo} value={silo}>
              {SILO_LABELS[silo] ?? silo}
            </option>
          ))}
        </select>
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
          <p className="text-sm">Loading para coverage data&hellip;</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && withStudents.length === 0 && (
        <div className="text-center py-16 text-warm-gray-400">
          <p className="text-sm">No classrooms with 1:1 requirements found for {schoolYear}.</p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && withStudents.length > 0 && (
        <div className="bg-white rounded-xl border border-cream-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-warm-gray-500 uppercase tracking-wider border-b border-cream-200 bg-cream-50/60">
                <th className="text-left px-4 py-3">Site</th>
                <th className="text-left px-4 py-3">Teacher</th>
                <th className="text-left px-4 py-3">Program</th>
                <th className="text-right px-4 py-3">Requiring 1:1</th>
                <th className="text-right px-4 py-3">Assigned</th>
                <th className="text-right px-4 py-3">Vacant</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-100">
              {withStudents.map((classroom) => {
                const isExpanded = expandedRows.has(classroom.classroomId)
                return (
                  <>
                    <tr
                      key={classroom.classroomId}
                      className="hover:bg-cream-50/40 cursor-pointer"
                      onClick={() => toggleRow(classroom.classroomId)}
                    >
                      <td className="px-4 py-3 text-warm-gray-800 font-medium">
                        {classroom.siteName}
                      </td>
                      <td className="px-4 py-3 text-warm-gray-700">
                        {classroom.teacherName}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-100">
                          {SILO_LABELS[classroom.programSilo] ?? classroom.programSilo}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-warm-gray-900">
                        {classroom.totalRequiring1to1}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                        {classroom.assigned}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`font-semibold ${
                            classroom.vacant > 0 ? 'text-red-600' : 'text-warm-gray-400'
                          }`}
                        >
                          {classroom.vacant}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-warm-gray-400 text-xs select-none">
                        {isExpanded ? '▲' : '▼'}
                      </td>
                    </tr>

                    {/* Expanded student breakdown */}
                    {isExpanded && (
                      <tr key={`${classroom.classroomId}-detail`}>
                        <td colSpan={7} className="px-0 py-0">
                          <div className="bg-cream-50/50 border-t border-cream-100 px-8 py-3">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-warm-gray-500 uppercase tracking-wide">
                                  <th className="text-left pb-1.5 pr-4">Student</th>
                                  <th className="text-left pb-1.5">Assigned Para</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-cream-100">
                                {classroom.students.map((student) => (
                                  <tr key={student.id}>
                                    <td className="py-1.5 pr-4 text-warm-gray-800 font-medium">
                                      {student.name}
                                    </td>
                                    <td className="py-1.5">
                                      {student.isVacant ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                                          VACANT
                                        </span>
                                      ) : (
                                        <span className="text-emerald-700 font-medium">
                                          {student.paraName}
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
