import Link from 'next/link'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { getCurrentSchoolYear } from '@/lib/school-year'
import type { ProgramSilo } from '@prisma/client'

const SILO_LABELS: Record<string, string> = {
  ASD_ELEM: 'ASD-Elem',
  ASD_MIDHS: 'ASD-MidHS',
  SD: 'SD',
  NC: 'NC',
  DHH: 'DHH',
  ATP: 'ATP',
  MD: 'MD',
}

const SILO_COLORS: Record<string, { card: string; badge: string; dot: string }> = {
  ASD_ELEM: { card: 'border-t-sky-500', badge: 'bg-sky-100 text-sky-700', dot: 'bg-sky-500' },
  ASD_MIDHS: { card: 'border-t-sky-500', badge: 'bg-sky-100 text-sky-700', dot: 'bg-sky-500' },
  SD: { card: 'border-t-teal-500', badge: 'bg-teal-100 text-teal-700', dot: 'bg-teal-500' },
  NC: { card: 'border-t-amber-500', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  DHH: { card: 'border-t-violet-500', badge: 'bg-violet-100 text-violet-700', dot: 'bg-violet-500' },
  ATP: { card: 'border-t-emerald-500', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  MD: { card: 'border-t-red-500', badge: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
}

const SILO_ORDER: ProgramSilo[] = ['ASD_ELEM', 'ASD_MIDHS', 'SD', 'NC', 'DHH', 'ATP', 'MD']

export default async function ClassroomsPage() {
  const cookieStore = await cookies()
  const cookieYear = cookieStore.get('spedex-school-year')?.value
  const schoolYear = cookieYear ?? getCurrentSchoolYear()

  const classrooms = await prisma.classroom.findMany({
    where: { schoolYear },
    select: {
      id: true,
      programSilo: true,
      isOpenPosition: true,
      _count: {
        select: { studentPlacements: true },
      },
    },
  })

  // Group by silo
  type SiloSummary = {
    silo: ProgramSilo
    classroomCount: number
    studentCount: number
    vacantCount: number
  }

  const siloMap = new Map<ProgramSilo, SiloSummary>()

  for (const silo of SILO_ORDER) {
    siloMap.set(silo, {
      silo,
      classroomCount: 0,
      studentCount: 0,
      vacantCount: 0,
    })
  }

  for (const classroom of classrooms) {
    const entry = siloMap.get(classroom.programSilo)
    if (!entry) continue
    entry.classroomCount += 1
    entry.studentCount += classroom._count.studentPlacements
    if (classroom.isOpenPosition) {
      entry.vacantCount += 1
    }
  }

  const siloSummaries = SILO_ORDER.map((silo) => siloMap.get(silo)!).filter(Boolean)
  const totalClassrooms = classrooms.length
  const totalStudents = siloSummaries.reduce((sum, s) => sum + s.studentCount, 0)
  const totalVacant = siloSummaries.reduce((sum, s) => sum + s.vacantCount, 0)

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-warm-gray-500 mb-1">Classrooms</p>
        <h1 className="text-2xl font-semibold text-warm-gray-900">Classroom Hub</h1>
        <p className="text-sm text-warm-gray-600 mt-0.5">
          {schoolYear} school year — overview by program
        </p>
      </div>

      {/* Summary bar */}
      <div className="flex gap-6 mb-6 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="text-center">
          <p className="text-2xl font-bold text-warm-gray-900">{totalClassrooms}</p>
          <p className="text-xs text-warm-gray-500 mt-0.5">Total Classrooms</p>
        </div>
        <div className="w-px bg-gray-200" />
        <div className="text-center">
          <p className="text-2xl font-bold text-warm-gray-900">{totalStudents}</p>
          <p className="text-xs text-warm-gray-500 mt-0.5">Students Placed</p>
        </div>
        <div className="w-px bg-gray-200" />
        <div className="text-center">
          <p className="text-2xl font-bold text-red-600">{totalVacant}</p>
          <p className="text-xs text-warm-gray-500 mt-0.5">Vacant Positions</p>
        </div>
      </div>

      {/* Silo grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {siloSummaries.map((summary) => {
          const colors = SILO_COLORS[summary.silo] ?? {
            card: 'border-t-gray-400',
            badge: 'bg-gray-100 text-gray-700',
            dot: 'bg-gray-400',
          }
          const label = SILO_LABELS[summary.silo] ?? summary.silo

          return (
            <Link
              key={summary.silo}
              href={`/dashboard/classrooms/by-program?silo=${summary.silo}`}
              className="block group"
            >
              <div
                className={`bg-white rounded-xl border border-gray-200 border-t-4 ${colors.card} shadow-sm p-4 transition-shadow group-hover:shadow-md`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${colors.badge}`}
                  >
                    {label}
                  </span>
                  {summary.vacantCount > 0 && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                      {summary.vacantCount} vacant
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-warm-gray-500">Classrooms</span>
                    <span className="text-sm font-semibold text-warm-gray-900">
                      {summary.classroomCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-warm-gray-500">Students</span>
                    <span className="text-sm font-semibold text-warm-gray-900">
                      {summary.studentCount}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100">
                  <span className="text-xs text-sky-600 group-hover:text-sky-800 font-medium">
                    View classrooms →
                  </span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
