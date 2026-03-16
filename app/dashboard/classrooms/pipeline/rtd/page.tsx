import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'
import { RTDRow } from './RTDRow'
import type { RTDStudentRow } from './RTDRow'

export default async function RTDPipelinePage() {
  // Auth
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/auth/login')
  }

  const user = await prisma.user.findUnique({
    where: { supabaseUserId: authUser.id },
    select: { role: true },
  })

  if (!user || !hasPermission(user.role, 'placements:view')) {
    redirect('/dashboard')
  }

  // Fetch all students with RTD_IN_PROGRESS status, including their RTD checklist
  const placements = await prisma.studentPlacement.findMany({
    where: { enrollmentStatus: 'RTD_IN_PROGRESS' },
    include: {
      classroom: {
        select: {
          id: true,
          programSilo: true,
          site: { select: { id: true, name: true } },
          teacher: { select: { id: true, name: true } },
        },
      },
      rtdChecklist: true,
    },
    orderBy: [{ studentNameLast: 'asc' }, { studentNameFirst: 'asc' }],
  })

  // Auto-create RTD checklists for any students that don't have one yet
  // (Prisma doesn't support nested create-if-missing in findMany, so we do it here)
  const studentsWithoutChecklist = placements.filter((p) => !p.rtdChecklist)
  if (studentsWithoutChecklist.length > 0) {
    await Promise.all(
      studentsWithoutChecklist.map((p) =>
        prisma.rTDChecklist.upsert({
          where: { studentId: p.id },
          create: { studentId: p.id },
          update: {},
        })
      )
    )

    // Re-fetch to get the newly created checklists
    const updatedPlacements = await prisma.studentPlacement.findMany({
      where: { enrollmentStatus: 'RTD_IN_PROGRESS' },
      include: {
        classroom: {
          select: {
            id: true,
            programSilo: true,
            site: { select: { id: true, name: true } },
            teacher: { select: { id: true, name: true } },
          },
        },
        rtdChecklist: true,
      },
      orderBy: [{ studentNameLast: 'asc' }, { studentNameFirst: 'asc' }],
    })

    return <RTDPipelineView placements={updatedPlacements as RTDStudentRow[]} />
  }

  return <RTDPipelineView placements={placements as RTDStudentRow[]} />
}

function RTDPipelineView({ placements }: { placements: RTDStudentRow[] }) {
  const total = placements.length

  // Count fully completed (all 8 steps done)
  const fullyCompleted = placements.filter((p) => {
    if (!p.rtdChecklist) return false
    const c = p.rtdChecklist
    return (
      c.dorNotified &&
      c.parentNotified &&
      c.secondStaffingCompleted &&
      c.transitionIepHeld &&
      c.packetCompleted &&
      c.packetSignedScanned &&
      c.aeriesExitCompleted &&
      c.seisExitCompleted
    )
  }).length

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-warm-gray-500 mb-1">
          Classrooms / Pipeline / RTD
        </p>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-warm-gray-900">RTD Pipeline</h1>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
            {total} student{total !== 1 ? 's' : ''} in RTD process
          </span>
        </div>
        <p className="text-sm text-warm-gray-600 mt-0.5">
          Track the 8-step Return to District process for students exiting the program.
        </p>
      </div>

      {/* Summary bar */}
      {total > 0 && (
        <div className="flex gap-6 mb-6 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="text-center">
            <p className="text-2xl font-bold text-warm-gray-900">{total}</p>
            <p className="text-xs text-warm-gray-500 mt-0.5">Total Students</p>
          </div>
          <div className="w-px bg-gray-200" />
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-500">{total - fullyCompleted}</p>
            <p className="text-xs text-warm-gray-500 mt-0.5">In Progress</p>
          </div>
          <div className="w-px bg-gray-200" />
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{fullyCompleted}</p>
            <p className="text-xs text-warm-gray-500 mt-0.5">All Steps Done</p>
          </div>
        </div>
      )}

      {total === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-warm-gray-500 text-sm">No students are currently in the RTD process.</p>
          <p className="text-warm-gray-400 text-xs mt-1">
            Students with enrollment status &ldquo;RTD In Progress&rdquo; will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {placements.map((student) => (
            <RTDRow key={student.id} student={student} />
          ))}
        </div>
      )}
    </div>
  )
}
