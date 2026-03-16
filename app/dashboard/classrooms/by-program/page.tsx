import { cookies } from 'next/headers'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentSchoolYear } from '@/lib/school-year'
import ClassroomCard from '../components/classroom-card'
import type { ProgramSilo } from '@prisma/client'

const SILOS: ProgramSilo[] = ['ASD_ELEM', 'ASD_MIDHS', 'SD', 'NC', 'DHH', 'ATP', 'MD']

const SILO_LABELS: Record<string, string> = {
  ASD_ELEM: 'ASD-Elem',
  ASD_MIDHS: 'ASD-MidHS',
  SD: 'SD',
  NC: 'NC',
  DHH: 'DHH',
  ATP: 'ATP',
  MD: 'MD',
}

const SILO_TAB_COLORS: Record<string, string> = {
  ASD_ELEM: 'border-sky-500 text-sky-700',
  ASD_MIDHS: 'border-sky-500 text-sky-700',
  SD: 'border-teal-500 text-teal-700',
  NC: 'border-amber-500 text-amber-700',
  DHH: 'border-violet-500 text-violet-700',
  ATP: 'border-emerald-500 text-emerald-700',
  MD: 'border-red-500 text-red-700',
}

interface ByProgramPageProps {
  searchParams: Promise<{ silo?: string }>
}

export default async function ByProgramPage({ searchParams }: ByProgramPageProps) {
  const { silo: siloParam } = await searchParams
  const activeSilo: ProgramSilo =
    siloParam && SILOS.includes(siloParam as ProgramSilo)
      ? (siloParam as ProgramSilo)
      : 'ASD_ELEM'

  const cookieStore = await cookies()
  const cookieYear = cookieStore.get('spedex-school-year')?.value
  const schoolYear = cookieYear ?? getCurrentSchoolYear()

  // Fetch counts for all silos (for tab labels)
  const allCounts = await prisma.classroom.groupBy({
    by: ['programSilo'],
    where: { schoolYear },
    _count: { id: true },
  })

  const countMap = new Map<string, number>()
  for (const row of allCounts) {
    countMap.set(row.programSilo, row._count.id)
  }

  // Fetch full classroom data for the active silo
  const classrooms = await prisma.classroom.findMany({
    where: { schoolYear, programSilo: activeSilo },
    select: {
      id: true,
      programSilo: true,
      gradeStart: true,
      gradeEnd: true,
      sessionType: true,
      sessionNumber: true,
      positionControlNumber: true,
      maxCapacity: true,
      isOpenPosition: true,
      site: { select: { name: true } },
      teacher: {
        select: {
          id: true,
          name: true,
          positionControlNumber: true,
        },
      },
      paras: {
        select: {
          id: true,
          name: true,
          role: true,
          isVacancy: true,
        },
      },
      studentPlacements: {
        select: {
          id: true,
          studentNameFirst: true,
          studentNameLast: true,
          grade: true,
          primaryDisability: true,
          enrollmentStatus: true,
          requires1to1: true,
          seisConfirmed: true,
          aeriesConfirmed: true,
        },
      },
    },
    orderBy: [
      { site: { name: 'asc' } },
      { gradeStart: 'asc' },
      { sessionNumber: 'asc' },
    ],
  })

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-warm-gray-500 mb-1">Classrooms</p>
        <h1 className="text-2xl font-semibold text-warm-gray-900">By Program</h1>
        <p className="text-sm text-warm-gray-600 mt-0.5">{schoolYear} school year</p>
      </div>

      {/* Silo tab bar */}
      <div className="flex items-end gap-0 border-b border-gray-200 mb-6 overflow-x-auto">
        {SILOS.map((silo) => {
          const isActive = silo === activeSilo
          const count = countMap.get(silo) ?? 0
          const label = SILO_LABELS[silo] ?? silo
          const activeColor = SILO_TAB_COLORS[silo] ?? 'border-gray-500 text-gray-700'

          return (
            <Link
              key={silo}
              href={`/dashboard/classrooms/by-program?silo=${silo}`}
              className={`
                flex-shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                ${
                  isActive
                    ? `${activeColor} bg-white`
                    : 'border-transparent text-warm-gray-500 hover:text-warm-gray-700 hover:border-gray-300'
                }
              `}
            >
              {label}
              <span
                className={`ml-1.5 text-xs font-normal ${
                  isActive ? 'text-warm-gray-600' : 'text-warm-gray-400'
                }`}
              >
                ({count})
              </span>
            </Link>
          )
        })}
      </div>

      {/* Classroom grid */}
      {classrooms.length === 0 ? (
        <div className="text-center py-16 text-warm-gray-400">
          <p className="text-sm">No classrooms for {SILO_LABELS[activeSilo]} in {schoolYear}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {classrooms.map((classroom) => (
            <ClassroomCard key={classroom.id} classroom={classroom} />
          ))}
        </div>
      )}
    </div>
  )
}
