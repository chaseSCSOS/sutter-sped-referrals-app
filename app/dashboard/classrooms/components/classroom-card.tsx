import Link from 'next/link'
import { formatGradeRange } from '@/lib/constants/grades'
import EnrollmentStatusBadge from './enrollment-status-badge'
import SeisAeriesStatus from './seis-aeries-status'

interface ClassroomCardProps {
  classroom: {
    id: string
    programSilo: string
    gradeStart: string
    gradeEnd: string
    sessionType: string
    sessionNumber?: string | null
    positionControlNumber?: string | null
    maxCapacity?: number | null
    isOpenPosition: boolean
    teacher?: { name: string; positionControlNumber?: string | null } | null
    site: { name: string }
    paras: Array<{ id: string; name: string; role: string; isVacancy: boolean }>
    studentPlacements: Array<{
      id: string
      studentNameFirst: string
      studentNameLast: string
      grade: string
      primaryDisability?: string | null
      enrollmentStatus: string
      requires1to1: boolean
      seisConfirmed: boolean
      aeriesConfirmed: boolean
    }>
    _count?: { studentPlacements: number }
  }
}

const SILO_LABELS: Record<string, string> = {
  ASD_ELEM: 'ASD-Elem',
  ASD_MIDHS: 'ASD-MidHS',
  SD: 'SD',
  NC: 'NC',
  DHH: 'DHH',
  ATP: 'ATP',
  MD: 'MD',
}

const SILO_BORDER: Record<string, string> = {
  ASD_ELEM: 'border-t-sky-500',
  ASD_MIDHS: 'border-t-sky-500',
  SD: 'border-t-teal-500',
  NC: 'border-t-amber-500',
  DHH: 'border-t-violet-500',
  ATP: 'border-t-emerald-500',
  MD: 'border-t-red-500',
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

export default function ClassroomCard({ classroom }: ClassroomCardProps) {
  const {
    id,
    programSilo,
    gradeStart,
    gradeEnd,
    sessionType,
    sessionNumber,
    positionControlNumber,
    maxCapacity,
    isOpenPosition,
    teacher,
    site,
    paras,
    studentPlacements,
    _count,
  } = classroom

  const enrolledCount = studentPlacements.length > 0 ? studentPlacements.length : (_count?.studentPlacements ?? 0)
  const isNearCapacity = maxCapacity != null && maxCapacity > 0 && enrolledCount / maxCapacity >= 0.8

  const seisConfirmedCount = studentPlacements.filter((s) => s.seisConfirmed).length
  const aeriesConfirmedCount = studentPlacements.filter((s) => s.aeriesConfirmed).length

  const requires1to1Count = studentPlacements.filter((s) => s.requires1to1).length
  const oneToOneAssigned = paras.filter((p) => p.role === 'ONE_TO_ONE_PARA' && !p.isVacancy).length
  const oneToOneVacant = paras.filter((p) => p.role === 'ONE_TO_ONE_PARA' && p.isVacancy).length

  const supportParas = paras.filter((p) => p.role !== 'ONE_TO_ONE_PARA')

  const displayedStudents = studentPlacements.slice(0, 3)
  const remainingStudents = studentPlacements.length - 3

  const borderColor = SILO_BORDER[programSilo] ?? 'border-t-gray-400'
  const siloBadgeColor = SILO_BADGE[programSilo] ?? 'bg-gray-100 text-gray-700'
  const siloLabel = SILO_LABELS[programSilo] ?? programSilo
  const gradeBandLabel = formatGradeRange(gradeStart, gradeEnd)
  const sessionTypeLabel = SESSION_TYPE_LABELS[sessionType] ?? sessionType

  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 border-t-4 ${borderColor} shadow-sm overflow-hidden ${
        isNearCapacity ? 'bg-amber-50' : ''
      }`}
    >
      {/* Header */}
      <div className={`px-4 pt-3 pb-2 ${isNearCapacity ? 'bg-amber-50' : 'bg-white'}`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${siloBadgeColor}`}>
            {siloLabel}
          </span>
          <span className="text-sm font-medium text-warm-gray-900">{site.name}</span>
          <span className="text-warm-gray-400 text-xs">•</span>
          <span className="text-xs text-warm-gray-600">{gradeBandLabel}</span>
          <span className="text-warm-gray-400 text-xs">•</span>
          <span className="text-xs text-warm-gray-600">{sessionTypeLabel}</span>
          {sessionNumber && (
            <>
              <span className="text-warm-gray-400 text-xs">•</span>
              <span className="text-xs text-warm-gray-500">Session {sessionNumber}</span>
            </>
          )}
        </div>
      </div>

      <div className="border-t border-gray-100" />

      {/* Teacher row */}
      <div className={`px-4 py-2 flex items-center justify-between gap-3 ${isNearCapacity ? 'bg-amber-50' : 'bg-white'}`}>
        <div className="flex items-center gap-2 min-w-0">
          {isOpenPosition ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
              OPEN POSITION
            </span>
          ) : teacher ? (
            <span className="text-sm text-warm-gray-800 truncate">
              <span className="text-warm-gray-500 text-xs mr-1">Teacher:</span>
              {teacher.name}
            </span>
          ) : (
            <span className="text-xs text-warm-gray-400 italic">No teacher assigned</span>
          )}
          {(teacher?.positionControlNumber || positionControlNumber) && (
            <span className="text-xs text-warm-gray-400 whitespace-nowrap">
              PC# {teacher?.positionControlNumber ?? positionControlNumber}
            </span>
          )}
        </div>
        <Link
          href={`/dashboard/classrooms/${id}`}
          className="flex-shrink-0 text-xs text-sky-600 hover:text-sky-800 font-medium whitespace-nowrap"
        >
          View Roster →
        </Link>
      </div>

      <div className="border-t border-gray-100" />

      {/* Students section */}
      <div className={`px-4 py-2 ${isNearCapacity ? 'bg-amber-50' : 'bg-white'}`}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-warm-gray-500">Students</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-warm-gray-700 font-medium">{enrolledCount} enrolled</span>
            {studentPlacements.length > 0 && (
              <span className="text-xs text-warm-gray-400">
                ({seisConfirmedCount} SEIS • {aeriesConfirmedCount} Aeries)
              </span>
            )}
          </div>
        </div>
        {displayedStudents.length > 0 ? (
          <ul className="space-y-1">
            {displayedStudents.map((student) => (
              <li key={student.id} className="flex items-center justify-between gap-2">
                <span className="text-sm text-warm-gray-800 truncate">
                  {student.studentNameLast}, {student.studentNameFirst}
                  <span className="text-warm-gray-400 text-xs ml-1">Gr. {student.grade}</span>
                </span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <EnrollmentStatusBadge status={student.enrollmentStatus} />
                  <SeisAeriesStatus
                    seisConfirmed={student.seisConfirmed}
                    aeriesConfirmed={student.aeriesConfirmed}
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-warm-gray-400 italic">No students placed</p>
        )}
        {remainingStudents > 0 && (
          <Link
            href={`/dashboard/classrooms/${id}`}
            className="mt-1.5 inline-block text-xs text-sky-600 hover:text-sky-800"
          >
            + {remainingStudents} more
          </Link>
        )}
      </div>

      <div className="border-t border-gray-100" />

      {/* 1:1 row */}
      <div className={`px-4 py-2 ${isNearCapacity ? 'bg-amber-50' : 'bg-white'}`}>
        <span className="text-xs text-warm-gray-500">
          <span className="font-medium text-warm-gray-700">1:1:</span>{' '}
          {requires1to1Count} required
          {' • '}
          {oneToOneAssigned} assigned
          {oneToOneVacant > 0 && (
            <span className="text-red-600 font-medium"> • {oneToOneVacant} VACANT</span>
          )}
        </span>
      </div>

      {supportParas.length > 0 && (
        <>
          <div className="border-t border-gray-100" />
          <div className={`px-4 py-2 ${isNearCapacity ? 'bg-amber-50' : 'bg-white'}`}>
            <span className="text-xs font-semibold uppercase tracking-wide text-warm-gray-500 mr-2">Staff:</span>
            <span className="text-xs text-warm-gray-700">
              {supportParas.map((para, i) => (
                <span key={para.id}>
                  {i > 0 && <span className="text-warm-gray-300 mx-1">•</span>}
                  {para.isVacancy ? (
                    <span className="text-red-500 font-medium">VACANT ({STAFF_ROLE_LABELS[para.role] ?? para.role})</span>
                  ) : (
                    <span>
                      {para.name}
                      <span className="text-warm-gray-400 ml-0.5">({STAFF_ROLE_LABELS[para.role] ?? para.role})</span>
                    </span>
                  )}
                </span>
              ))}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
