import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'
import { formatGradeRange } from '@/lib/constants/grades'
import EnrollmentStatusBadge from '../../components/enrollment-status-badge'
import SeisAeriesConfirmation from '../../components/seis-aeries-confirmation'

const SILO_LABELS: Record<string, string> = {
  ASD_ELEM: 'ASD-Elem',
  ASD_MIDHS: 'ASD-MidHS',
  SD: 'SD',
  NC: 'NC',
  DHH: 'DHH',
  ATP: 'ATP',
  MD: 'MD',
}


const TRANSFER_REASON_LABELS: Record<string, string> = {
  GRADE_PROMOTION: 'Grade Promotion',
  CASELOAD_BALANCE: 'Caseload Balance',
  BEHAVIOR_PLACEMENT_CHANGE: 'Behavior / Placement Change',
  PROGRAM_CHANGE: 'Program Change',
  PARENT_REQUEST: 'Parent Request',
  OTHER: 'Other',
}

const RTD_STEPS = [
  { field: 'dorNotified', atField: 'dorNotifiedAt', label: 'DOR Notified' },
  { field: 'parentNotified', atField: 'parentNotifiedAt', label: 'Parent Notified' },
  { field: 'secondStaffingCompleted', atField: 'secondStaffingAt', label: '2nd Staffing Completed' },
  { field: 'transitionIepHeld', atField: 'transitionIepAt', label: 'Transition IEP Held' },
  { field: 'packetCompleted', atField: 'packetCompletedAt', label: 'RTD Packet Completed and Turned In' },
  { field: 'packetSignedScanned', atField: 'packetSignedAt', label: 'Packet Signed by Admin and Scanned to DOR' },
  { field: 'aeriesExitCompleted', atField: 'aeriesExitAt', label: 'Aeries Exit & 200 Completed' },
  { field: 'seisExitCompleted', atField: 'seisExitAt', label: 'SEIS Exit Completed' },
] as const

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function StudentProfilePage({ params }: PageProps) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) redirect('/auth/login')

  const user = await prisma.user.findUnique({
    where: { supabaseUserId: authUser.id },
    select: { role: true, name: true },
  })

  if (!user || !hasPermission(user.role, 'placements:view')) {
    redirect('/dashboard')
  }

  const placement = await prisma.studentPlacement.findUnique({
    where: { id },
    include: {
      referral: {
        select: {
          id: true,
          confirmationNumber: true,
          studentName: true,
          submittedAt: true,
          silo: true,
        },
      },
      classroom: {
        include: {
          site: { select: { id: true, name: true } },
          teacher: { select: { id: true, name: true } },
          paras: { select: { id: true, name: true, role: true, isVacancy: true } },
        },
      },
      oneToOnePara: { select: { id: true, name: true, isVacancy: true } },
      transferEvents: {
        include: {
          fromClassroom: {
            select: { site: { select: { name: true } }, teacher: { select: { name: true } } },
          },
          toClassroom: {
            select: { site: { select: { name: true } }, teacher: { select: { name: true } } },
          },
        },
        orderBy: { effectiveDate: 'desc' },
      },
      rtdChecklist: true,
      transportRecord: true,
      auditLogs: {
        orderBy: { changedAt: 'desc' },
        take: 10,
      },
    },
  })

  if (!placement) notFound()

  const fullName = `${placement.studentNameLast}, ${placement.studentNameFirst}`

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-warm-gray-500">
        <Link href="/dashboard/classrooms" className="hover:text-warm-gray-700">
          Classrooms
        </Link>
        <span>/</span>
        {placement.classroom && (
          <>
            <Link
              href={`/dashboard/classrooms/${placement.classroom.id}`}
              className="hover:text-warm-gray-700"
            >
              {placement.classroom.teacher?.name ?? 'Open Position'} —{' '}
              {placement.classroom.site.name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-warm-gray-700">{fullName}</span>
      </nav>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-warm-gray-900">{fullName}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-warm-gray-600">
              <span>
                DOB:{' '}
                <span className="font-medium text-warm-gray-800">
                  {format(new Date(placement.dateOfBirth), 'MM/dd/yyyy')}
                </span>
              </span>
              <span className="text-warm-gray-300">•</span>
              <span>
                Grade: <span className="font-medium text-warm-gray-800">{placement.grade}</span>
              </span>
              <span className="text-warm-gray-300">•</span>
              <span>
                School Year:{' '}
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                  {placement.schoolYear}
                </span>
              </span>
              {placement.districtOfResidence && (
                <>
                  <span className="text-warm-gray-300">•</span>
                  <span>DOR: {placement.districtOfResidence}</span>
                </>
              )}
            </div>
            {placement.disabilityCodes.length > 0 && (
              <p className="mt-1.5 text-sm text-warm-gray-500">
                Disabilities: {placement.disabilityCodes.join(', ')}
                {placement.primaryDisability && ` (primary: ${placement.primaryDisability})`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <EnrollmentStatusBadge status={placement.enrollmentStatus} />
          </div>
        </div>
      </div>

      {/* Current Placement */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-warm-gray-900">Current Placement</h2>
        </div>
        <div className="p-6 space-y-4">
          {placement.classroom ? (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Link
                href={`/dashboard/classrooms/${placement.classroom.id}`}
                className="font-medium text-sky-700 hover:text-sky-800"
              >
                {placement.classroom.teacher?.name ?? 'Open Position'}
              </Link>
              <span className="text-warm-gray-400">at</span>
              <span className="text-warm-gray-800">{placement.classroom.site.name}</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                {SILO_LABELS[placement.classroom.programSilo] ?? placement.classroom.programSilo}
              </span>
              {placement.classroom.gradeStart && (
                <span className="text-warm-gray-500 text-xs">
                  {formatGradeRange(placement.classroom.gradeStart, placement.classroom.gradeEnd)}
                </span>
              )}
            </div>
          ) : (
            <p className="text-sm text-warm-gray-400 italic">Not assigned to a classroom</p>
          )}

          <SeisAeriesConfirmation
            placementId={placement.id}
            seisConfirmed={placement.seisConfirmed}
            seisConfirmedAt={placement.seisConfirmedAt?.toISOString() ?? null}
            seisConfirmedBy={placement.seisConfirmedBy}
            aeriesConfirmed={placement.aeriesConfirmed}
            aeriesConfirmedAt={placement.aeriesConfirmedAt?.toISOString() ?? null}
            aeriesConfirmedBy={placement.aeriesConfirmedBy}
          />

          {placement.requires1to1 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-warm-gray-600">1:1 Para:</span>
              {placement.oneToOnePara ? (
                placement.oneToOnePara.isVacancy ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                    VACANT
                  </span>
                ) : (
                  <span className="font-medium text-warm-gray-800">
                    {placement.oneToOnePara.name}
                  </span>
                )
              ) : (
                <span className="text-warm-gray-400 italic">Not assigned</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Placement History */}
      {placement.transferEvents.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-warm-gray-900">Transfer History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-warm-gray-500">
                    Date
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-warm-gray-500">
                    From
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-warm-gray-500">
                    To
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-warm-gray-500">
                    Reason
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {placement.transferEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-warm-gray-700">
                      {format(new Date(event.effectiveDate), 'MM/dd/yyyy')}
                    </td>
                    <td className="px-4 py-3 text-sm text-warm-gray-600">
                      {event.fromClassroom
                        ? `${event.fromClassroom.teacher?.name ?? 'Open'} — ${event.fromClassroom.site.name}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-warm-gray-600">
                      {event.toClassroom
                        ? `${event.toClassroom.teacher?.name ?? 'Open'} — ${event.toClassroom.site.name}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-warm-gray-600">
                      {TRANSFER_REASON_LABELS[event.reason] ?? event.reason}
                      {event.notes && (
                        <p className="text-xs text-warm-gray-400 mt-0.5">{event.notes}</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RTD Checklist — only shown when in progress */}
      {placement.enrollmentStatus === 'RTD_IN_PROGRESS' && placement.rtdChecklist && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-warm-gray-900">RTD Checklist</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {RTD_STEPS.map((step, i) => {
              const checklist = placement.rtdChecklist!
              const isDone = checklist[step.field as keyof typeof checklist] as boolean
              const doneAt = checklist[step.atField as keyof typeof checklist] as Date | null
              return (
                <div key={step.field} className="px-6 py-3 flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      isDone
                        ? 'bg-green-500 border-green-500'
                        : 'border-gray-300'
                    }`}
                  >
                    {isDone && (
                      <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                        <path
                          d="M2 6l3 3 5-5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm ${isDone ? 'text-warm-gray-600 line-through' : 'text-warm-gray-800'}`}>
                      {i + 1}. {step.label}
                    </span>
                    {isDone && doneAt && (
                      <p className="text-xs text-green-600 mt-0.5">
                        Completed {format(new Date(doneAt as Date), 'MM/dd/yyyy')}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Transport Record */}
      {placement.transportRecord && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-warm-gray-900">Transportation</h2>
          </div>
          <div className="p-6 space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              {placement.transportRecord.busNumber && (
                <div>
                  <span className="text-warm-gray-500">Bus #:</span>{' '}
                  <span className="font-medium text-warm-gray-800">
                    {placement.transportRecord.busNumber}
                  </span>
                </div>
              )}
              {placement.transportRecord.transportType && (
                <div>
                  <span className="text-warm-gray-500">Type:</span>{' '}
                  <span className="font-medium text-warm-gray-800">
                    {placement.transportRecord.transportType}
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {placement.transportRecord.isWheelchair && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
                  Wheelchair
                </span>
              )}
              {placement.transportRecord.needsCarSeat && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
                  Car Seat
                </span>
              )}
              {placement.transportRecord.needsSafetyVest && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
                  Safety Vest
                </span>
              )}
              {placement.transportRecord.needsSafetyLock && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
                  Safety Lock
                </span>
              )}
              {placement.transportRecord.needsBusAide && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
                  Bus Aide
                </span>
              )}
              {placement.transportRecord.riderAtHome && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                  Rider at Home
                </span>
              )}
              {placement.transportRecord.reducedDaySchedule && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                  Reduced Day
                </span>
              )}
              {placement.transportRecord.transportPending && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
                  Transport Pending
                </span>
              )}
            </div>
            {placement.transportRecord.specialTransportNotes && (
              <p className="text-sm text-warm-gray-600 mt-2">
                {placement.transportRecord.specialTransportNotes}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Source Referral */}
      {placement.referral && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-warm-gray-900 mb-3">Source Referral</h2>
          <div className="flex items-center gap-4 text-sm">
            <Link
              href={`/dashboard/referrals/${placement.referral.id}`}
              className="text-sky-700 hover:text-sky-800 font-medium"
            >
              {placement.referral.confirmationNumber}
            </Link>
            <span className="text-warm-gray-400">
              Submitted {format(new Date(placement.referral.submittedAt), 'MM/dd/yyyy')}
            </span>
            {placement.referral.silo && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                {placement.referral.silo}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Audit Log */}
      {placement.auditLogs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-warm-gray-900">Recent Activity</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-warm-gray-500">
                    Date
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-warm-gray-500">
                    Field
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-warm-gray-500">
                    Old
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-warm-gray-500">
                    New
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {placement.auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-warm-gray-500 whitespace-nowrap">
                      {format(new Date(log.changedAt), 'MM/dd/yyyy HH:mm')}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-warm-gray-700">{log.field}</td>
                    <td className="px-4 py-3 text-xs text-warm-gray-500 max-w-[150px] truncate">
                      {log.oldValue ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-warm-gray-700 max-w-[150px] truncate">
                      {log.newValue ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
