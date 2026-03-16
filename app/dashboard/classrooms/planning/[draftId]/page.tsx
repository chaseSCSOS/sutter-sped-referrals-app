'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { formatGradeRange } from '@/lib/constants/grades'

interface DraftPlacement {
  id: string
  studentNameFirst: string
  studentNameLast: string
  grade: string
  primaryDisability: string | null
  requires1to1: boolean
  draftClassroomId: string | null
  sourcePlacementId: string | null
}

interface DraftClassroom {
  id: string
  programSilo: string
  siteId: string
  gradeStart: string
  gradeEnd: string
  sessionType: string
  teacherName: string | null
  positionControlNumber: string | null
  isOpenPosition: boolean
  draftPlacements: DraftPlacement[]
}

interface Draft {
  id: string
  name: string
  schoolYear: string
  isPublished: boolean
  draftClassrooms: DraftClassroom[]
  draftPlacements: DraftPlacement[]
}

const SILO_LABELS: Record<string, string> = {
  ASD_ELEM: 'ASD-Elem', ASD_MIDHS: 'ASD-MidHS', SD: 'SD', NC: 'NC', DHH: 'DHH', ATP: 'ATP', MD: 'MD',
}


interface PageProps {
  params: Promise<{ draftId: string }>
}

export default function DraftWorkspacePage({ params }: PageProps) {
  const router = useRouter()
  const [draftId, setDraftId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [loading, setLoading] = useState(true)
  const [movingPlacement, setMovingPlacement] = useState<DraftPlacement | null>(null)
  const [moveTarget, setMoveTarget] = useState('')
  const [moving, setMoving] = useState(false)
  const [publishing, setPublishing] = useState(false)

  useEffect(() => {
    params.then(({ draftId: id }) => setDraftId(id))
  }, [params])

  const fetchDraft = useCallback(async () => {
    if (!draftId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/planning/${draftId}`)
      if (!res.ok) throw new Error('Failed to load draft')
      const data = await res.json()
      setDraft(data.draft)
    } catch {
      toast.error('Failed to load draft')
    } finally {
      setLoading(false)
    }
  }, [draftId])

  useEffect(() => { fetchDraft() }, [fetchDraft])

  async function movePlacement() {
    if (!movingPlacement || !moveTarget || !draftId) return
    setMoving(true)
    try {
      const res = await fetch(`/api/planning/${draftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movePlacement: { placementId: movingPlacement.id, toDraftClassroomId: moveTarget } }),
      })
      if (!res.ok) throw new Error('Move failed')
      toast.success('Student moved')
      setMovingPlacement(null)
      setMoveTarget('')
      fetchDraft()
    } catch {
      toast.error('Failed to move student')
    } finally {
      setMoving(false)
    }
  }

  async function publishDraft() {
    if (!draftId || !window.confirm('Publish this draft? This will update all live placements. This cannot be undone.')) return
    setPublishing(true)
    try {
      const res = await fetch(`/api/planning/${draftId}/publish`, { method: 'POST' })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Draft published successfully')
      router.refresh()
      fetchDraft()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to publish')
    } finally {
      setPublishing(false)
    }
  }

  if (loading || !draft) {
    return <div className="p-8 text-center text-warm-gray-400">Loading workspace...</div>
  }

  const unassigned = draft.draftPlacements.filter((p) => !p.draftClassroomId)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-warm-gray-500 mb-1">
            <Link href="/dashboard/classrooms/planning" className="hover:text-warm-gray-700">Planning</Link>
            <span>/</span>
            <span>{draft.name}</span>
          </nav>
          <h1 className="text-2xl font-bold text-warm-gray-900">{draft.name}</h1>
          <p className="text-sm text-warm-gray-500 mt-0.5">{draft.schoolYear} · {draft.draftClassrooms.length} classrooms · {draft.draftPlacements.length} students</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/classrooms/planning/${draft.id}/diff`}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-warm-gray-700 hover:bg-gray-50 transition-colors">
            View Diff
          </Link>
          {!draft.isPublished && (
            <button onClick={publishDraft} disabled={publishing}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
              {publishing ? 'Publishing...' : 'Publish Draft'}
            </button>
          )}
          {draft.isPublished && (
            <span className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 rounded-lg">Published</span>
          )}
        </div>
      </div>

      {/* Unassigned students */}
      {unassigned.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-amber-800 mb-2">Unassigned Students ({unassigned.length})</h3>
          <div className="flex flex-wrap gap-2">
            {unassigned.map((p) => (
              <button key={p.id} onClick={() => { setMovingPlacement(p); setMoveTarget('') }}
                className="text-xs px-2.5 py-1 rounded-full border border-amber-300 bg-white text-amber-800 hover:bg-amber-50">
                {p.studentNameLast}, {p.studentNameFirst}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Classrooms grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {draft.draftClassrooms.map((dc) => (
          <div key={dc.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-warm-gray-600">
                    {SILO_LABELS[dc.programSilo] ?? dc.programSilo}
                  </span>
                  <span className="text-xs text-warm-gray-400">
                    {formatGradeRange(dc.gradeStart, dc.gradeEnd)}
                  </span>
                </div>
                <p className="text-sm font-medium text-warm-gray-800 mt-0.5">
                  {dc.isOpenPosition ? 'OPEN POSITION' : (dc.teacherName ?? 'No teacher')}
                </p>
              </div>
              <span className="text-xs text-warm-gray-400">
                {dc.draftPlacements.length} students
              </span>
            </div>
            <div className="divide-y divide-gray-100">
              {dc.draftPlacements.length === 0 ? (
                <p className="px-4 py-3 text-xs text-warm-gray-400 italic">No students</p>
              ) : (
                dc.draftPlacements.map((p) => (
                  <div key={p.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-sm text-warm-gray-800">
                        {p.studentNameLast}, {p.studentNameFirst}
                      </span>
                      <span className="ml-2 text-xs text-warm-gray-400">Gr. {p.grade}</span>
                      {p.requires1to1 && (
                        <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">1:1</span>
                      )}
                    </div>
                    {!draft.isPublished && (
                      <button
                        onClick={() => { setMovingPlacement(p); setMoveTarget('') }}
                        className="text-xs px-2 py-1 rounded border border-gray-200 text-warm-gray-500 hover:bg-gray-50 flex-shrink-0"
                      >
                        Move
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Move modal */}
      {movingPlacement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMovingPlacement(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-base font-semibold text-warm-gray-900">Move Student</h2>
              <p className="text-sm text-warm-gray-500 mt-0.5">
                {movingPlacement.studentNameLast}, {movingPlacement.studentNameFirst}
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                  Destination Classroom
                </label>
                <select
                  value={moveTarget}
                  onChange={(e) => setMoveTarget(e.target.value)}
                  className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-300"
                >
                  <option value="">Select a classroom...</option>
                  {draft.draftClassrooms
                    .filter((dc) => dc.id !== movingPlacement.draftClassroomId)
                    .map((dc) => (
                      <option key={dc.id} value={dc.id}>
                        {dc.isOpenPosition ? 'OPEN' : (dc.teacherName ?? 'No teacher')} —{' '}
                        {SILO_LABELS[dc.programSilo] ?? dc.programSilo} /{' '}
                        {formatGradeRange(dc.gradeStart, dc.gradeEnd)}
                        {' '}({dc.draftPlacements.length} students)
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setMovingPlacement(null)}
                  className="px-4 py-2 text-sm text-warm-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={movePlacement} disabled={moving || !moveTarget}
                  className="px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:opacity-50">
                  {moving ? 'Moving...' : 'Move Student'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
