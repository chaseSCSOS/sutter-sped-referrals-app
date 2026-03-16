'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { getCurrentSchoolYear, SCHOOL_YEARS } from '@/lib/school-year'

interface Draft {
  id: string
  name: string
  description: string | null
  schoolYear: string
  createdBy: string
  createdAt: string
  isPublished: boolean
  publishedAt: string | null
  _count: { draftClassrooms: number; draftPlacements: number }
}

export default function PlanningPage() {
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [schoolYear, setSchoolYear] = useState(getCurrentSchoolYear())
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newYear, setNewYear] = useState(getCurrentSchoolYear())

  const fetchDrafts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/planning?schoolYear=${encodeURIComponent(schoolYear)}`)
      const data = await res.json()
      setDrafts(data.drafts ?? [])
    } catch {
      toast.error('Failed to load drafts')
    } finally {
      setLoading(false)
    }
  }, [schoolYear])

  useEffect(() => { fetchDrafts() }, [fetchDrafts])

  async function createDraft(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    try {
      const res = await fetch('/api/planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, description: newDesc || undefined, schoolYear: newYear }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Draft created successfully')
      setShowCreate(false)
      setNewName('')
      setNewDesc('')
      fetchDrafts()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create draft')
    } finally {
      setCreating(false)
    }
  }

  async function deleteDraft(id: string) {
    if (!window.confirm('Delete this draft? This cannot be undone.')) return
    try {
      const res = await fetch(`/api/planning/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Draft deleted')
      fetchDrafts()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete draft')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-warm-gray-900">Planning Drafts</h1>
          <p className="text-sm text-warm-gray-500 mt-1">Create and manage future-year placement plans</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={schoolYear}
            onChange={(e) => setSchoolYear(e.target.value)}
            className="text-sm rounded-lg border border-gray-200 px-3 py-1.5"
          >
            {SCHOOL_YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-colors"
          >
            Create New Draft
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-warm-gray-400">Loading...</div>
      ) : drafts.length === 0 ? (
        <div className="py-10 text-center text-sm text-warm-gray-400 italic">
          No drafts for {schoolYear}. Create one to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {drafts.map((d) => (
            <div
              key={d.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-start justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-semibold text-warm-gray-900">{d.name}</h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                    {d.schoolYear}
                  </span>
                  {d.isPublished ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700">
                      Published
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                      Draft
                    </span>
                  )}
                </div>
                {d.description && (
                  <p className="text-sm text-warm-gray-500 mt-0.5">{d.description}</p>
                )}
                <p className="text-xs text-warm-gray-400 mt-1.5">
                  {d._count.draftClassrooms} classrooms · {d._count.draftPlacements} students ·
                  Created {format(new Date(d.createdAt), 'MM/dd/yyyy')}
                  {d.publishedAt && ` · Published ${format(new Date(d.publishedAt), 'MM/dd/yyyy')}`}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                  href={`/dashboard/classrooms/planning/${d.id}`}
                  className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-warm-gray-700 hover:bg-gray-50 transition-colors font-medium"
                >
                  Open Workspace
                </Link>
                <Link
                  href={`/dashboard/classrooms/planning/${d.id}/diff`}
                  className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-warm-gray-700 hover:bg-gray-50 transition-colors font-medium"
                >
                  View Diff
                </Link>
                {!d.isPublished && (
                  <button
                    onClick={() => deleteDraft(d.id)}
                    className="text-xs px-2 py-1.5 rounded text-red-500 hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreate(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-base font-semibold text-warm-gray-900">Create New Planning Draft</h2>
            </div>
            <form onSubmit={createDraft} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-300"
                  placeholder="e.g. 2026-2027 Initial Placement"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-warm-gray-700 mb-1">Description</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={2}
                  className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-300 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-warm-gray-700 mb-1">School Year</label>
                <select
                  value={newYear}
                  onChange={(e) => setNewYear(e.target.value)}
                  className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2"
                >
                  {SCHOOL_YEARS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-sm text-warm-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
