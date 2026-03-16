import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'
import { formatGradeRange } from '@/lib/constants/grades'
import StudentRow from '../components/student-row'

const SILO_LABELS: Record<string, string> = {
  ASD_ELEM: 'ASD-Elem',
  ASD_MIDHS: 'ASD-MidHS',
  SD: 'SD',
  NC: 'NC',
  DHH: 'DHH',
  ATP: 'ATP',
  MD: 'MD',
}

const SILO_BADGE: Record<string, string> = {
  ASD_ELEM: 'bg-sky-100 text-sky-700',
  ASD_MIDHS: 'bg-sky-100 text-sky-700',
  SD: 'bg-teal-100 text-teal-700',
  NC: 'bg-amber-100 text-amber-700',
  DHH: 'bg-violet-100 text-violet-700',
  ATP: 'bg-emerald-100 text-emerald-700',
  MD: 'bg-red-100 text-red-700',
}


const SESSION_TYPE_LABELS: Record<string, string> = {
  FULL_DAY: 'Full Day',
  PERIOD_ATTENDANCE: 'Period Attendance',
  SELF_CONTAINED: 'Self-Contained',
  AM: 'AM',
  PM: 'PM',
}

const STAFF_ROLE_LABELS: Record<string, string> = {
  TEACHER: 'Teacher',
  CLASS_PARA: 'Para',
  ONE_TO_ONE_PARA: '1:1 Para',
  INTERPRETER: 'Interpreter',
  SIGNING_PARA: 'Signing Para',
  LVN: 'LVN',
}

interface ClassroomDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ClassroomDetailPage({ params }: ClassroomDetailPageProps) {
  const { id } = await params

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

  if (!user || !hasPermission(user.role, 'classrooms:view')) {
    redirect('/dashboard')
  }

  const canEdit = hasPermission(user.role, 'classrooms:update')

  const classroom = await prisma.classroom.findUnique({
    where: { id },
    select: {
      id: true,
      programSilo: true,
      gradeStart: true,
      gradeEnd: true,
      sessionType: true,
      sessionNumber: true,
      positionControlNumber: true,
      credentials: true,
      maxCapacity: true,
      schoolYear: true,
      isOpenPosition: true,
      site: { select: { id: true, name: true } },
      teacher: {
        select: {
          id: true,
          name: true,
          positionControlNumber: true,
          credentials: true,
          isVacancy: true,
        },
      },
      paras: {
        select: {
          id: true,
          name: true,
          role: true,
          positionControlNumber: true,
          credentials: true,
          isVacancy: true,
        },
        orderBy: { role: 'asc' },
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
          referral: {
            select: { confirmationNumber: true },
          },
          oneToOnePara: {
            select: {
              id: true,
              name: true,
              positionControlNumber: true,
              isVacancy: true,
            },
          },
        },
        orderBy: [{ studentNameLast: 'asc' }, { studentNameFirst: 'asc' }],
      },
    },
  })

  if (!classroom) {
    notFound()
  }

  const siloLabel = SILO_LABELS[classroom.programSilo] ?? classroom.programSilo
  const siloBadgeColor = SILO_BADGE[classroom.programSilo] ?? 'bg-gray-100 text-gray-700'
  const gradeBandLabel = formatGradeRange(classroom.gradeStart, classroom.gradeEnd)
  const sessionTypeLabel = SESSION_TYPE_LABELS[classroom.sessionType] ?? classroom.sessionType

  const supportParas = classroom.paras.filter((p) => p.role !== 'ONE_TO_ONE_PARA')
  const oneToOneParas = classroom.paras.filter((p) => p.role === 'ONE_TO_ONE_PARA')

  const enrolledCount = classroom.studentPlacements.length

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-warm-gray-500">
        <Link href="/dashboard/classrooms" className="hover:text-warm-gray-700">
          Classrooms
        </Link>
        <span>/</span>
        <Link
          href={`/dashboard/classrooms/by-campus?siteId=${classroom.site.id}`}
          className="hover:text-warm-gray-700"
        >
          {classroom.site.name}
        </Link>
        <span>/</span>
        <span className="text-warm-gray-700">{siloLabel} Classroom</span>
      </nav>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold ${siloBadgeColor}`}
              >
                {siloLabel}
              </span>
              <span className="text-sm font-medium text-warm-gray-900">
                {classroom.site.name}
              </span>
              <span className="text-warm-gray-300 text-xs">•</span>
              <span className="text-sm text-warm-gray-600">{gradeBandLabel}</span>
              <span className="text-warm-gray-300 text-xs">•</span>
              <span className="text-sm text-warm-gray-600">{sessionTypeLabel}</span>
              {classroom.sessionNumber && (
                <>
                  <span className="text-warm-gray-300 text-xs">•</span>
                  <span className="text-sm text-warm-gray-500">
                    Session {classroom.sessionNumber}
                  </span>
                </>
              )}
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                {classroom.schoolYear}
              </span>
            </div>

            {canEdit && (
              <Link
                href={`/dashboard/classrooms/${id}/edit`}
                className="flex-shrink-0 text-xs px-3 py-1.5 rounded border border-gray-200 text-warm-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                Edit
              </Link>
            )}
          </div>

          {/* PC# */}
          {classroom.positionControlNumber && (
            <p className="mt-1.5 text-xs text-warm-gray-500">
              PC# {classroom.positionControlNumber}
            </p>
          )}
        </div>

        {/* Teacher row */}
        <div className="px-6 py-3">
          {classroom.isOpenPosition ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
              OPEN POSITION
            </span>
          ) : classroom.teacher ? (
            <div className="flex items-center gap-3">
              <div>
                <span className="text-xs text-warm-gray-500 mr-1.5">Teacher:</span>
                <span className="text-sm font-medium text-warm-gray-900">
                  {classroom.teacher.name}
                </span>
                {classroom.teacher.credentials && (
                  <span className="ml-1.5 text-xs text-warm-gray-500">
                    {classroom.teacher.credentials}
                  </span>
                )}
                {classroom.teacher.positionControlNumber && (
                  <span className="ml-2 text-xs text-warm-gray-400">
                    PC# {classroom.teacher.positionControlNumber}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <span className="text-xs text-warm-gray-400 italic">No teacher assigned</span>
          )}
        </div>
      </div>

      {/* Student Roster Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-warm-gray-900">Student Roster</h2>
            <p className="text-xs text-warm-gray-500 mt-0.5">
              {enrolledCount} student{enrolledCount !== 1 ? 's' : ''} enrolled
              {classroom.maxCapacity != null && ` · max capacity ${classroom.maxCapacity}`}
            </p>
          </div>
        </div>

        {enrolledCount === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-warm-gray-400 italic">
            No students placed in this classroom.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-warm-gray-500">
                    Student Name
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-warm-gray-500">
                    Grade
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-warm-gray-500">
                    Primary Disability
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-warm-gray-500">
                    Enrollment Status
                  </th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-warm-gray-500">
                    SEIS
                  </th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-warm-gray-500">
                    Aeries
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-warm-gray-500">
                    1:1 Para
                  </th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-warm-gray-500">
                    Transfer
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-warm-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {classroom.studentPlacements.map((student) => (
                  <StudentRow
                    key={student.id}
                    student={student}
                    canEdit={canEdit}
                    classroomId={id}
                    schoolYear={classroom.schoolYear}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Staff Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-warm-gray-900">Staff</h2>
        </div>

        {classroom.paras.length === 0 && !classroom.teacher ? (
          <div className="px-6 py-6 text-sm text-warm-gray-400 italic text-center">
            No staff assigned.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {/* Teacher row in staff list */}
            {classroom.teacher && (
              <div className="px-6 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-sky-100 text-sky-700 flex-shrink-0">
                    Teacher
                  </span>
                  {classroom.teacher.isVacancy ? (
                    <span className="text-sm font-medium text-red-600">VACANT</span>
                  ) : (
                    <span className="text-sm text-warm-gray-800 truncate">
                      {classroom.teacher.name}
                      {classroom.teacher.credentials && (
                        <span className="ml-1.5 text-xs text-warm-gray-500">
                          {classroom.teacher.credentials}
                        </span>
                      )}
                    </span>
                  )}
                </div>
                {classroom.teacher.positionControlNumber && (
                  <span className="text-xs text-warm-gray-400 flex-shrink-0">
                    PC# {classroom.teacher.positionControlNumber}
                  </span>
                )}
              </div>
            )}

            {/* Support paras */}
            {supportParas.map((para) => (
              <div key={para.id} className="px-6 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 flex-shrink-0">
                    {STAFF_ROLE_LABELS[para.role] ?? para.role}
                  </span>
                  {para.isVacancy ? (
                    <span className="text-sm font-medium text-red-600">VACANT</span>
                  ) : (
                    <span className="text-sm text-warm-gray-800 truncate">
                      {para.name}
                      {para.credentials && (
                        <span className="ml-1.5 text-xs text-warm-gray-500">
                          {para.credentials}
                        </span>
                      )}
                    </span>
                  )}
                </div>
                {para.positionControlNumber && (
                  <span className="text-xs text-warm-gray-400 flex-shrink-0">
                    PC# {para.positionControlNumber}
                  </span>
                )}
              </div>
            ))}

            {/* 1:1 Paras */}
            {oneToOneParas.map((para) => (
              <div key={para.id} className="px-6 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700 flex-shrink-0">
                    1:1 Para
                  </span>
                  {para.isVacancy ? (
                    <span className="text-sm font-medium text-red-600">VACANT</span>
                  ) : (
                    <span className="text-sm text-warm-gray-800 truncate">
                      {para.name}
                      {para.credentials && (
                        <span className="ml-1.5 text-xs text-warm-gray-500">
                          {para.credentials}
                        </span>
                      )}
                    </span>
                  )}
                </div>
                {para.positionControlNumber && (
                  <span className="text-xs text-warm-gray-400 flex-shrink-0">
                    PC# {para.positionControlNumber}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
