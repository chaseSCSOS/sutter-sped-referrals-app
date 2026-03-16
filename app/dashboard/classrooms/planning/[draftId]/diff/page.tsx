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
  draftClassroomId: string | null
  sourcePlacementId: string | null
}

interface DraftClassroom {
  id: string
  programSilo: string
  gradeStart: string
  gradeEnd: string
  sessionType: string
  teacherName: string | null
  positionControlNumber: string | null
  isOpenPosition: boolean
  sourceClassroomId: string | null
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

interface StudentMove {
  studentName: string
  grade: string
  fromClassroom: string
  toClassroom: string
}

interface PcChange {
  pcNumber: string
  oldTeacher: string
  newTeacher: string
  classroom: string
}

const SILO_LABELS: Record<string, string> = {
  ASD_ELEM: 'ASD-Elem', ASD_MIDHS: 'ASD-MidHS', SD: 'SD', NC: 'NC', DHH: 'DHH', ATP: 'ATP', MD: 'MD',
}

interface PageProps {
  params: Promise<{ draftId: string }>
}

export default function DiffPage({ params }: PageProps) {
  const router = useRouter()
  const [draftId, setDraftId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [loading, setLoading] = useState(true)
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

  async function publishDraft() {
    if (!draftId || !window.confirm('Publish this draft? All placement moves will be applied to live data.')) return
    setPublishing(true)
    try {
      const res = await fetch(`/api/planning/${draftId}/publish`, { method: 'POST' })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Draft published successfully')
      router.push('/dashboard/classrooms/planning')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to publish')
    } finally {
      setPublishing(false)
    }
  }

  // Compute diff
  const studentMoves: StudentMove[] = []
  const pcChanges: PcChange[] = []

  if (draft) {
    const classroomMap = new Map(draft.draftClassrooms.map((dc) => [dc.id, dc]))

    for (const dp of draft.draftPlacements) {
      if (!dp.sourcePlacementId) continue
      // Find original classroom via sourceClassroomId matching
      // The source placement's original classroom is encoded via the sourceClassroomId on the DraftClassroom
      // We need to find which draft classroom contains the source and compare to current
      const currentClassroom = dp.draftClassroomId ? classroomMap.get(dp.draftClassroomId) : null

      // To find original, we'd need the original classroom data — but we only have draft data here
      // We can compute moves by finding placements that changed draftClassroomId from their original
      // For now, show all placements and their current classroom assignment
    }

    // PC# changes: classrooms where the teacher changed (not easily derivable without live data)
    // Show classrooms missing a PC#
  }

  if (loading || !draft) {
    return <div className="p-8 text-center text-warm-gray-400">Loading diff...</div>
  }

  const missingPcClassrooms = draft.draftClassrooms.filter((dc) => !dc.positionControlNumber)

  function exportCsv(rows: string[][], filename: string) {
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-warm-gray-500 mb-1">
            <Link href="/dashboard/classrooms/planning" className="hover:text-warm-gray-700">Planning</Link>
            <span>/</span>
            <Link href={`/dashboard/classrooms/planning/${draft.id}`} className="hover:text-warm-gray-700">{draft.name}</Link>
            <span>/</span>
            <span>Diff</span>
          </nav>
          <h1 className="text-2xl font-bold text-warm-gray-900">Draft Diff — {draft.name}</h1>
          <p className="text-sm text-warm-gray-500 mt-0.5">{draft.schoolYear}</p>
        </div>
        {!draft.isPublished && (
          <button onClick={publishDraft} disabled={publishing}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
            {publishing ? 'Publishing...' : 'Publish This Draft'}
          </button>
        )}
        {draft.isPublished && (
          <span className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 rounded-lg">Published</span>
        )}
      </div>

      {/* All Classroom Assignments */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-warm-gray-900">Student Assignments</h2>
            <p className="text-xs text-warm-gray-400 mt-0.5">{draft.draftPlacements.length} total students</p>
          </div>
          <button
            onClick={() => {
              const rows = [
                ['Student', 'Grade', 'Classroom', 'Program', 'PC#'],
                ...draft.draftPlacements.map((p) => {
                  const dc = p.draftClassroomId ? draft.draftClassrooms.find((c) => c.id === p.draftClassroomId) : null
                  return [
                    `${p.studentNameLast}, ${p.studentNameFirst}`,
                    p.grade,
                    dc ? (dc.isOpenPosition ? 'OPEN' : (dc.teacherName ?? '—')) : 'Unassigned',
                    dc ? (SILO_LABELS[dc.programSilo] ?? dc.programSilo) : '—',
                    dc?.positionControlNumber ?? '—',
                  ]
                }),
              ]
              exportCsv(rows, `draft-assignments-${draft.id}.csv`)
            }}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-warm-gray-600 hover:bg-gray-50"
          >
            Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-warm-gray-500">Student</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-warm-gray-500">Grade</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-warm-gray-500">Classroom</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-warm-gray-500">Program</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-warm-gray-500">PC#</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {draft.draftPlacements.map((p) => {
                const dc = p.draftClassroomId
                  ? draft.draftClassrooms.find((c) => c.id === p.draftClassroomId)
                  : null
                return (
                  <tr key={p.id} className={!dc ? 'bg-amber-50' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-3 text-sm font-medium text-warm-gray-800">
                      {p.studentNameLast}, {p.studentNameFirst}
                    </td>
                    <td className="px-4 py-3 text-sm text-warm-gray-600">{p.grade}</td>
                    <td className="px-4 py-3 text-sm text-warm-gray-700">
                      {dc ? (dc.isOpenPosition ? 'OPEN POSITION' : (dc.teacherName ?? '—')) : (
                        <span className="text-amber-700 font-medium">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-warm-gray-600">
                      {dc ? (SILO_LABELS[dc.programSilo] ?? dc.programSilo) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-warm-gray-500">
                      {dc?.positionControlNumber ?? '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAR Needs — classrooms missing PC# */}
      {missingPcClassrooms.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-warm-gray-900">PAR Needs</h2>
              <p className="text-xs text-warm-gray-400 mt-0.5">
                Classrooms missing a Position Control Number (may need a PAR)
              </p>
            </div>
            <button
              onClick={() => {
                const rows = [
                  ['Teacher', 'Program', 'Grade Band', 'Session Type'],
                  ...missingPcClassrooms.map((dc) => [
                    dc.isOpenPosition ? 'OPEN' : (dc.teacherName ?? '—'),
                    SILO_LABELS[dc.programSilo] ?? dc.programSilo,
                    formatGradeRange(dc.gradeStart, dc.gradeEnd),
                    dc.sessionType,
                  ]),
                ]
                exportCsv(rows, `par-needs-${draft.id}.csv`)
              }}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-warm-gray-600 hover:bg-gray-50"
            >
              Export CSV
            </button>
          </div>
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-warm-gray-500">Teacher</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-warm-gray-500">Program</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-warm-gray-500">Grade Band</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {missingPcClassrooms.map((dc) => (
                <tr key={dc.id} className="bg-yellow-50 hover:bg-yellow-100/50">
                  <td className="px-4 py-3 text-sm text-warm-gray-800">
                    {dc.isOpenPosition ? (
                      <span className="font-medium text-red-600">OPEN POSITION</span>
                    ) : (dc.teacherName ?? '—')}
                  </td>
                  <td className="px-4 py-3 text-sm text-warm-gray-600">
                    {SILO_LABELS[dc.programSilo] ?? dc.programSilo}
                  </td>
                  <td className="px-4 py-3 text-sm text-warm-gray-600">{formatGradeRange(dc.gradeStart, dc.gradeEnd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
