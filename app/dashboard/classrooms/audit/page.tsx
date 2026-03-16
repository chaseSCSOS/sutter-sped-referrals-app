'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'

interface AuditLog {
  id: string
  entityType: string
  entityId: string
  field: string
  oldValue: string | null
  newValue: string | null
  changedBy: string
  changedAt: string
  studentId: string | null
}

const ENTITY_COLORS: Record<string, string> = {
  StudentPlacement: 'bg-sky-100 text-sky-700',
  Classroom: 'bg-teal-100 text-teal-700',
  StaffMember: 'bg-violet-100 text-violet-700',
  TransferEvent: 'bg-amber-100 text-amber-700',
  RTDChecklist: 'bg-orange-100 text-orange-700',
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [entityFilter, setEntityFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' })
      if (entityFilter) params.set('entityType', entityFilter)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      const res = await fetch(`/api/audit?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setLogs(data.logs ?? [])
      setTotal(data.total ?? 0)
    } catch {
      // silently handle
    } finally {
      setLoading(false)
    }
  }, [page, entityFilter, dateFrom, dateTo])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-warm-gray-900">Audit Log</h1>
        <p className="text-sm text-warm-gray-500 mt-1">Program-wide activity log for placement changes</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-wrap gap-3">
        <div>
          <label className="block text-xs text-warm-gray-500 mb-1">Entity Type</label>
          <select value={entityFilter} onChange={(e) => { setEntityFilter(e.target.value); setPage(1) }}
            className="text-sm rounded-lg border border-gray-200 px-3 py-1.5">
            <option value="">All Types</option>
            <option value="StudentPlacement">Student Placement</option>
            <option value="Classroom">Classroom</option>
            <option value="StaffMember">Staff Member</option>
            <option value="TransferEvent">Transfer</option>
            <option value="RTDChecklist">RTD Checklist</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-warm-gray-500 mb-1">From</label>
          <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
            className="text-sm rounded-lg border border-gray-200 px-3 py-1.5" />
        </div>
        <div>
          <label className="block text-xs text-warm-gray-500 mb-1">To</label>
          <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
            className="text-sm rounded-lg border border-gray-200 px-3 py-1.5" />
        </div>
        {(entityFilter || dateFrom || dateTo) && (
          <button
            onClick={() => { setEntityFilter(''); setDateFrom(''); setDateTo(''); setPage(1) }}
            className="self-end text-xs text-warm-gray-500 hover:text-warm-gray-700 underline pb-1.5"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-3 border-b border-gray-100 text-sm text-warm-gray-500">
          {total} total entries
        </div>
        {loading ? (
          <div className="p-10 text-center text-sm text-warm-gray-400">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="p-10 text-center text-sm text-warm-gray-400 italic">No audit entries found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-warm-gray-500">Date / Time</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-warm-gray-500">Entity</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-warm-gray-500">Field</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-warm-gray-500">Old Value</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-warm-gray-500">New Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-warm-gray-500 whitespace-nowrap">
                      {format(new Date(log.changedAt), 'MM/dd/yyyy HH:mm')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${ENTITY_COLORS[log.entityType] ?? 'bg-gray-100 text-gray-600'}`}>
                          {log.entityType}
                        </span>
                        {log.studentId && (
                          <Link href={`/dashboard/classrooms/students/${log.studentId}`}
                            className="text-xs text-sky-600 hover:text-sky-800 truncate max-w-[80px]">
                            {log.entityId.slice(0, 8)}…
                          </Link>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-warm-gray-700">{log.field}</td>
                    <td className="px-4 py-3 text-xs text-warm-gray-500 max-w-[160px] truncate">
                      {log.oldValue ?? <span className="italic text-warm-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-warm-gray-700 max-w-[160px] truncate">
                      {log.newValue ?? <span className="italic text-warm-gray-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-warm-gray-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-warm-gray-600 hover:bg-gray-50 disabled:opacity-40">
                Previous
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-warm-gray-600 hover:bg-gray-50 disabled:opacity-40">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
