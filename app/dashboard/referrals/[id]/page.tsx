import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import { hasPermission } from '@/lib/auth/permissions'
import { getSignedUrl } from '@/lib/storage'
import StatusBadge from '../components/status-badge'
import ReferralActions from '../components/referral-actions'
import ChecklistActions from '../components/checklist-actions'
import AssignStaff from '../components/assign-staff'
import DetailHeader from '../components/detail-header'
import ProgramClassificationPanel from '../components/program-classification-panel'
import CumWorkflowPanel from '../components/cum-workflow-panel'
import SystemSyncPanel from '../components/system-sync-panel'
import AssignToClassroom from '../components/assign-to-classroom'

interface ReferralDetailPageProps {
  params: Promise<{ id: string }>
}

const DISABILITY_LABELS: Record<string, string> = {
  '210': 'Intellectual Disability',
  '220': 'Hard of Hearing',
  '230': 'Deaf',
  '240': 'Speech or Language Impairment',
  '250': 'Visual Impairment',
  '260': 'Emotional Disturbance',
  '270': 'Orthopedic Impairment',
  '280': 'Other Health Impairment',
  '281': 'Traumatic Brain Injury',
  '290': 'Specific Learning Disability',
  '300': 'Deaf-Blindness',
  '310': 'Multiple Disabilities',
  '320': 'Autism',
  '330': 'Established Medical Disability (EMD)',
}

function calculateAge(dateOfBirth: string | Date): number | null {
  if (!dateOfBirth) return null
  const birth = new Date(dateOfBirth)
  if (isNaN(birth.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

export default async function ReferralDetailPage({ params }: ReferralDetailPageProps) {
  const { id } = await params

  // Get authenticated user
  const supabase = await createClient()
  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser()

  if (!supabaseUser) {
    redirect('/auth/login')
  }

  const user = await prisma.user.findUnique({
    where: { supabaseUserId: supabaseUser.id },
  })

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch referral with all related data
  const referral = await prisma.referral.findUnique({
    where: { id },
    include: {
      documents: true,
      documentChecklistItems: {
        include: { files: true },
        orderBy: { createdAt: 'asc' },
      },
      statusHistory: { orderBy: { changedAt: 'desc' } },
      notes: { orderBy: { createdAt: 'desc' } },
      assignedToStaff: { select: { id: true, name: true } },
      submittedByUser: { select: { id: true, name: true, email: true } },
      placement: {
        select: {
          id: true,
          enrollmentStatus: true,
          classroom: {
            include: {
              site: true,
              teacher: true,
            },
          },
        },
      },
    },
  })

  if (!referral) {
    notFound()
  }

  // Check permissions
  const canViewAll = hasPermission(user.role, 'referrals:view-all')
  const isOwner = referral.submittedByUserId === user.id

  if (!canViewAll && !isOwner) {
    redirect('/dashboard')
  }

  const canUpdate = hasPermission(user.role, 'referrals:update')
  const canWriteOperational = hasPermission(user.role, 'referrals:write-operational')
  const canManageCum = hasPermission(user.role, 'referrals:manage-cum')
  const canManageSync = hasPermission(user.role, 'referrals:manage-sync')

  // Fetch staff list for CUM processed-by dropdown (SPED_STAFF+)
  const staffList = canManageCum
    ? await prisma.user.findMany({
        where: { role: { in: ['SPED_STAFF', 'ADMIN', 'SUPER_ADMIN'] } },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })
    : []

  const checklistLabelMap: Record<string, string> = {
    STUDENT_REGISTRATION: 'Student Registration Form',
    HOME_LANGUAGE_SURVEY: 'Home Language Survey',
    IMMUNIZATION_RECORD: 'Current Immunization Record',
    RELEASE_OF_INFORMATION: 'Release of Information',
    CURRENT_IEP: 'Current IEP',
    PSYCHO_ED_REPORT: 'Psychoeducational Report',
    INTERIM_PLACEMENT_FORM: 'Interim Placement Form',
    TRANSCRIPTS: 'Transcripts (9+)',
  }

  const statusBadgeMap: Record<string, string> = {
    PENDING: 'Pending Review',
    ACCEPTED: 'Accepted',
    REJECTED: 'Rejected',
    MISSING: 'Missing',
  }

  const statusClassMap: Record<string, string> = {
    PENDING: 'bg-cream-100 text-warm-gray-700',
    ACCEPTED: 'bg-sage-50 text-sage-700',
    REJECTED: 'bg-coral-50 text-coral-600',
    MISSING: 'bg-coral-50 text-coral-600',
  }

  // Get signed URLs for documents
  const documentsWithUrls = await Promise.all(
    referral.documents.map(async (doc) => {
      const signedUrl = await getSignedUrl('referral-documents', doc.filePath, 3600)
      return { ...doc, signedUrl }
    })
  )

  const checklistWithUrls = await Promise.all(
    referral.documentChecklistItems.map(async (item) => {
      const files = await Promise.all(
        item.files.map(async (file) => {
          const signedUrl = await getSignedUrl('referral-documents', file.filePath, 3600)
          return { ...file, signedUrl }
        })
      )
      return { ...item, files }
    })
  )

  // Serialize referral for client component (dates become strings via JSON)
  const serializedReferral = JSON.parse(JSON.stringify(referral))

  return (
    <div className="max-w-7xl mx-auto">
      {/* Client-side header with breadcrumb, edit button, and modal */}
      <DetailHeader referral={serializedReferral} canUpdate={canUpdate} />

      {/* ═══════════════════════════════════════════════════════════════
          ZONE 1: Quick Stats — full width, 5 columns
          ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-10">
        <div className="bg-white/80 backdrop-blur rounded-2xl border border-cream-200 px-5 py-4">
          <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-1">Age</p>
          <p className="text-2xl font-bold text-warm-gray-900">{calculateAge(referral.dateOfBirth) ?? referral.age ?? '—'}</p>
        </div>
        <div className="bg-white/80 backdrop-blur rounded-2xl border border-cream-200 px-5 py-4">
          <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-1">Grade</p>
          <p className="text-2xl font-bold text-warm-gray-900">{referral.grade}</p>
        </div>
        <div className="bg-white/80 backdrop-blur rounded-2xl border border-cream-200 px-5 py-4">
          <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-1">Disability</p>
          <p className="text-base font-bold text-warm-gray-900 truncate">
            {referral.primaryDisability ? (DISABILITY_LABELS[referral.primaryDisability] || referral.primaryDisability) : '—'}
          </p>
        </div>
        <div className="bg-white/80 backdrop-blur rounded-2xl border border-cream-200 px-5 py-4">
          <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-1">Days Elapsed</p>
          <p className="text-2xl font-bold text-warm-gray-900">{referral.daysElapsed}</p>
        </div>
        <div className="bg-white/80 backdrop-blur rounded-2xl border border-cream-200 px-5 py-4">
          <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-1">Deadline</p>
          <p className="text-lg font-bold text-warm-gray-900">
            {new Date(referral.deadlineDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Rejection banner — full width, above everything */}
      {referral.status === 'REJECTED' && referral.rejectionReason && (
        <section className="bg-coral-50 border border-coral-200 rounded-2xl overflow-hidden mb-8">
          <div className="px-8 py-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-coral-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <h2 className="text-sm font-semibold text-coral-700 mb-1">Rejection Reason</h2>
                <p className="text-coral-600 text-sm leading-relaxed">{referral.rejectionReason}</p>
                {referral.missingItems && (
                  <div className="mt-3 pt-2 border-t border-coral-200">
                    <p className="font-semibold text-coral-600 text-xs mb-1.5">Missing Items:</p>
                    <ul className="list-disc list-inside text-coral-600 space-y-0.5 text-sm">
                      {(referral.missingItems as string[]).map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          ZONE 2: Referral Data — 2-column balanced grid
          ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

        {/* LEFT COL: Student + Contact */}
        <section className="bg-white rounded-2xl shadow-sm border border-cream-200 overflow-hidden">
          <div className="px-6 pt-6 pb-2">
            <h2 className="text-sm font-semibold text-warm-gray-900 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-sky-500 rounded-full inline-block"></span>
              Student Information
            </h2>
          </div>
          <div className="px-6 pb-6">
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm mt-3">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-0.5">Date of Birth</p>
                <p className="text-warm-gray-900 font-medium">{new Date(referral.dateOfBirth).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-0.5">Gender</p>
                <p className="text-warm-gray-900 font-medium">{referral.gender}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-0.5">Birthplace</p>
                <p className="text-warm-gray-900 font-medium">{referral.birthplace}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-0.5">Foster Youth</p>
                <p className="text-warm-gray-900 font-medium">{referral.fosterYouth ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-0.5">Ethnicity</p>
                <p className="text-warm-gray-900 font-medium">{referral.ethnicity}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-0.5">Residency</p>
                <p className="text-warm-gray-900 font-medium">{referral.residency}</p>
              </div>
            </div>

            <div className="border-t border-cream-200 my-5" />

            <h3 className="text-xs font-semibold text-warm-gray-500 uppercase tracking-wider mb-3">Contact</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div className="col-span-2">
                <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-0.5">Parent / Guardian</p>
                <p className="text-warm-gray-900 font-medium">{referral.parentGuardianName}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-0.5">Address</p>
                <p className="text-warm-gray-900 font-medium">
                  {referral.homeAddress}, {referral.city}, {referral.state} {referral.zipCode}
                </p>
              </div>
              {referral.homePhone && (
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-0.5">Home Phone</p>
                  <p className="text-warm-gray-900 font-medium">{referral.homePhone}</p>
                </div>
              )}
              {referral.cellPhone && (
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-0.5">Cell Phone</p>
                  <p className="text-warm-gray-900 font-medium">{referral.cellPhone}</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* RIGHT COL: Placement + Language */}
        <section className="bg-white rounded-2xl shadow-sm border border-cream-200 overflow-hidden">
          <div className="px-6 pt-6 pb-2">
            <h2 className="text-sm font-semibold text-warm-gray-900 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-sage-500 rounded-full inline-block"></span>
              Placement &amp; Language
            </h2>
          </div>
          <div className="px-6 pb-6">
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm mt-3">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-0.5">Placement Type</p>
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 text-xs font-semibold">
                  {referral.placementType}
                </span>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-0.5">SPED Transportation</p>
                <p className="text-warm-gray-900 font-medium">{referral.transportationSpecialEd ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-0.5">School of Attendance</p>
                <p className="text-warm-gray-900 font-medium">{referral.schoolOfAttendance}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-0.5">School of Residence</p>
                <p className="text-warm-gray-900 font-medium">{referral.schoolOfResidence}</p>
              </div>
            </div>

            <div className="border-t border-cream-200 my-5" />

            <h3 className="text-xs font-semibold text-warm-gray-500 uppercase tracking-wider mb-3">Language &amp; Demographics</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-0.5">Native Language</p>
                <p className="text-warm-gray-900 font-medium">{referral.nativeLanguage}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-0.5">English Learner</p>
                <p className="text-warm-gray-900 font-medium">{referral.englishLearner ? 'Yes' : 'No'}</p>
              </div>
              {referral.englishLearner && referral.elStartDate && (
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-0.5">EL Start Date</p>
                  <p className="text-warm-gray-900 font-medium">{new Date(referral.elStartDate).toLocaleDateString()}</p>
                </div>
              )}
              {referral.redesignated !== null && (
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-0.5">Redesignated</p>
                  <p className="text-warm-gray-900 font-medium">{referral.redesignated ? 'Yes' : 'No'}</p>
                </div>
              )}
              {referral.reclassificationDate && (
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-0.5">Reclassification Date</p>
                  <p className="text-warm-gray-900 font-medium">{new Date(referral.reclassificationDate).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* LEFT COL: Disability + SPED Dates */}
        <section className="bg-white rounded-2xl shadow-sm border border-cream-200 overflow-hidden">
          <div className="px-6 pt-6 pb-2">
            <h2 className="text-sm font-semibold text-warm-gray-900 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-coral-500 rounded-full inline-block"></span>
              Disability &amp; SPED Dates
            </h2>
          </div>
          <div className="px-6 pb-6">
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm mt-3">
              <div className="col-span-2">
                <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-0.5">Primary Disability</p>
                <p className="text-warm-gray-900 font-medium">
                  {referral.primaryDisability ? (DISABILITY_LABELS[referral.primaryDisability] || referral.primaryDisability) : '—'}
                  <span className="text-warm-gray-400 text-xs ml-1.5">({referral.primaryDisability})</span>
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-0.5">% Outside Gen Ed</p>
                <p className="text-warm-gray-900 font-bold text-lg">{referral.percentageOutsideGenEd}%</p>
              </div>
            </div>

            {referral.disabilities && typeof referral.disabilities === 'object' && (
              <div className="mt-3">
                <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-2">Additional Disabilities</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(referral.disabilities as Record<string, string>)
                    .filter(([, value]) => value && value !== 'None')
                    .map(([code, designation]) => (
                      <span key={code} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cream-100 text-warm-gray-700 text-xs font-medium border border-cream-200">
                        <span className="font-semibold">{code}</span>
                        <span className="text-warm-gray-500">{designation}</span>
                      </span>
                    ))}
                  {Object.entries(referral.disabilities as Record<string, string>)
                    .filter(([, value]) => value && value !== 'None').length === 0 && (
                    <span className="text-sm text-warm-gray-500">None recorded</span>
                  )}
                </div>
              </div>
            )}

            <div className="border-t border-cream-200 my-5" />

            <h3 className="text-xs font-semibold text-warm-gray-500 uppercase tracking-wider mb-3">Key Dates</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-0.5">SPED Entry</p>
                <p className="text-warm-gray-900 font-medium">{referral.spedEntryDate ? new Date(referral.spedEntryDate).toLocaleDateString() : '—'}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-0.5">Triennial Due</p>
                <p className="text-warm-gray-900 font-medium">{referral.triennialDue ? new Date(referral.triennialDue).toLocaleDateString() : '—'}</p>
              </div>
              {referral.currentIepDate && (
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-0.5">Current IEP</p>
                  <p className="text-warm-gray-900 font-medium">{new Date(referral.currentIepDate).toLocaleDateString()}</p>
                </div>
              )}
              {referral.currentPsychoReportDate && (
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-0.5">Psycho-Ed Report</p>
                  <p className="text-warm-gray-900 font-medium">{new Date(referral.currentPsychoReportDate).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* RIGHT COL: Last Placement + Authorization */}
        <section className="bg-white rounded-2xl shadow-sm border border-cream-200 overflow-hidden">
          <div className="px-6 pt-6 pb-2">
            <h2 className="text-sm font-semibold text-warm-gray-900 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-warm-gray-400 rounded-full inline-block"></span>
              Last Placement &amp; Authorization
            </h2>
          </div>
          <div className="px-6 pb-6">
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm mt-3">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-0.5">School</p>
                <p className="text-warm-gray-900 font-medium">{referral.lastPlacementSchool}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-0.5">District</p>
                <p className="text-warm-gray-900 font-medium">{referral.lastPlacementDistrict}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-0.5">County / State</p>
                <p className="text-warm-gray-900 font-medium">{referral.lastPlacementCounty}, {referral.lastPlacementState}</p>
              </div>
              {referral.lastPlacementPhone && (
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-0.5">Phone</p>
                  <p className="text-warm-gray-900 font-medium">{referral.lastPlacementPhone}</p>
                </div>
              )}
              {referral.lastPlacementContactPerson && (
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-0.5">Contact Person</p>
                  <p className="text-warm-gray-900 font-medium">{referral.lastPlacementContactPerson}</p>
                </div>
              )}
            </div>

            <div className="border-t border-cream-200 my-5" />

            <h3 className="text-xs font-semibold text-warm-gray-500 uppercase tracking-wider mb-3">District Authorization</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-0.5">LEA Representative</p>
                <p className="text-warm-gray-900 font-medium">{referral.leaRepresentativeName}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-0.5">Position</p>
                <p className="text-warm-gray-900 font-medium">{referral.leaRepresentativePosition}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-0.5">Non-SEIS IEP</p>
                <p className="text-warm-gray-900 font-medium">{referral.nonSeisIep ? 'Yes' : 'No'}</p>
              </div>
              {referral.submittedByEmail && (
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-0.5">Submitted By Email</p>
                  <p className="text-warm-gray-900 font-medium text-xs">{referral.submittedByEmail}</p>
                </div>
              )}
            </div>
            {referral.additionalComments && (
              <div className="mt-4 pt-3 border-t border-cream-200">
                <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-1.5">Additional Comments</p>
                <p className="text-warm-gray-800 text-sm whitespace-pre-wrap leading-relaxed bg-cream-50 rounded-xl p-3 border border-cream-200">
                  {referral.additionalComments}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          ZONE 2.5: Operational Panels — 3-column grid (staff only)
          ═══════════════════════════════════════════════════════════════ */}
      {canWriteOperational && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <ProgramClassificationPanel
              referral={serializedReferral}
              canUpdate={canWriteOperational}
            />
            <CumWorkflowPanel
              referral={serializedReferral}
              canManage={canManageCum}
              staffList={staffList}
            />
            <SystemSyncPanel
              referral={serializedReferral}
              canManage={canManageSync}
            />
          </div>
          <div className="mb-8">
            <AssignToClassroom referral={serializedReferral} />
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          ZONE 3: Services — full width
          ═══════════════════════════════════════════════════════════════ */}
      <section className="bg-white rounded-2xl shadow-sm border border-cream-200 overflow-hidden mb-8">
        <div className="px-6 pt-6 pb-2">
          <h2 className="text-sm font-semibold text-warm-gray-900 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-sky-600 rounded-full inline-block"></span>
            Special Education Services
          </h2>
        </div>
        <div className="px-6 pb-6">
          {Array.isArray(referral.specialEdServices) && (referral.specialEdServices as any[]).length > 0 ? (
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-cream-200">
                    <th className="text-left py-2.5 pr-4 text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold">Service</th>
                    <th className="text-left py-2.5 pr-4 text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold">Frequency</th>
                    <th className="text-left py-2.5 pr-4 text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold">Duration</th>
                    <th className="text-left py-2.5 pr-4 text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold">Location</th>
                    <th className="text-left py-2.5 text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold">Provider</th>
                  </tr>
                </thead>
                <tbody>
                  {(referral.specialEdServices as any[]).map((svc: any, idx: number) => (
                    <tr key={idx} className="border-b border-cream-100 last:border-0">
                      <td className="py-2.5 pr-4 text-warm-gray-900 font-medium">{svc.service || svc.serviceType || '—'}</td>
                      <td className="py-2.5 pr-4 text-warm-gray-700">{svc.frequency || '—'}</td>
                      <td className="py-2.5 pr-4 text-warm-gray-700">{svc.duration || '—'}</td>
                      <td className="py-2.5 pr-4 text-warm-gray-700">{svc.location || '—'}</td>
                      <td className="py-2.5 text-warm-gray-700">{svc.provider || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-warm-gray-500 text-sm mt-3">No services recorded</p>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          ZONE 4: Documents + Checklist — 2-column
          ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Documents */}
        <section className="bg-white rounded-2xl shadow-sm border border-cream-200 overflow-hidden">
          <div className="px-6 pt-6 pb-2">
            <h2 className="text-sm font-semibold text-warm-gray-900 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-sage-600 rounded-full inline-block"></span>
              Documents
              {documentsWithUrls.length > 0 && (
                <span className="ml-auto text-xs font-normal text-warm-gray-400">{documentsWithUrls.length} file{documentsWithUrls.length !== 1 ? 's' : ''}</span>
              )}
            </h2>
          </div>
          <div className="px-6 pb-6">
            {documentsWithUrls.length === 0 ? (
              <p className="text-warm-gray-500 text-sm mt-3">No documents uploaded</p>
            ) : (
              <div className="space-y-2 mt-3">
                {documentsWithUrls.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 bg-cream-50 rounded-xl border border-cream-200 hover:border-cream-300 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3.5 h-3.5 text-sky-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-warm-gray-900 truncate">{doc.fileName}</p>
                        <p className="text-xs text-warm-gray-500">
                          {doc.documentType} · {(doc.fileSize / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    {doc.signedUrl && (
                      <a
                        href={doc.signedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 ml-2 text-sky-700 hover:text-sky-800 text-xs font-medium"
                      >
                        Download
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Document Checklist */}
        <section className="bg-white rounded-2xl shadow-sm border border-cream-200 overflow-hidden">
          <div className="px-6 pt-6 pb-2">
            <h2 className="text-sm font-semibold text-warm-gray-900 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-coral-500 rounded-full inline-block"></span>
              Document Checklist
            </h2>
          </div>
          <div className="px-6 pb-6">
            {checklistWithUrls.length === 0 ? (
              <p className="text-warm-gray-500 text-sm mt-3">Checklist not available yet</p>
            ) : (
              <div className="space-y-2 mt-3">
                {checklistWithUrls.map((item) => (
                  <div key={item.id} className="border border-cream-200 rounded-xl p-4 bg-cream-50/50 hover:bg-cream-50 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-warm-gray-900 truncate">
                          {checklistLabelMap[item.type] || item.type}
                        </p>
                        <p className="text-[11px] text-warm-gray-500 mt-0.5">
                          {item.required ? 'Required' : 'Optional'} · v{item.version}
                        </p>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex-shrink-0 ${statusClassMap[item.status] || 'bg-cream-100 text-warm-gray-700'}`}
                      >
                        {statusBadgeMap[item.status] || item.status}
                      </span>
                    </div>
                    {item.rejectionReason && (
                      <p className="text-xs text-coral-600 mt-2 bg-coral-50 rounded-lg px-2.5 py-1 border border-coral-100">
                        Reason: {item.rejectionReason}
                      </p>
                    )}
                    {item.files.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {item.files.map((file) => (
                          <div key={file.id} className="flex items-center justify-between text-xs bg-white rounded-lg px-2.5 py-1.5 border border-cream-200">
                            <span className="text-warm-gray-700 truncate">{file.fileName}</span>
                            {file.signedUrl && (
                              <a
                                href={file.signedUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sky-700 hover:text-sky-800 text-[11px] font-medium flex-shrink-0 ml-2"
                              >
                                Download
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <ChecklistActions
                      referralId={referral.id}
                      item={{ id: item.id, type: item.type, status: item.status }}
                      canUpdate={canUpdate}
                      isOwner={isOwner}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          ZONE 5: Activity — Actions + Details | Timeline | Notes
          ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* Col 1: Actions + Metadata */}
        <div className="space-y-6">
          {canUpdate && (
            <ReferralActions referralId={referral.id} currentStatus={referral.status} />
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-cream-200 overflow-hidden">
            <div className="px-6 pt-6 pb-2">
              <h2 className="text-sm font-semibold text-warm-gray-900">Referral Details</h2>
            </div>
            <div className="px-6 pb-6">
              <div className="space-y-3.5 text-sm mt-2">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-0.5">Submitted</p>
                  <p className="text-warm-gray-900 font-medium">{new Date(referral.submittedAt).toLocaleString()}</p>
                </div>
                {referral.submittedByUser && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-0.5">Submitted By</p>
                    <p className="text-warm-gray-900 font-medium">{referral.submittedByUser.name}</p>
                    <p className="text-warm-gray-500 text-xs">{referral.submittedByUser.email}</p>
                  </div>
                )}
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-0.5">Deadline</p>
                  <p className="text-warm-gray-900 font-medium">{new Date(referral.deadlineDate).toLocaleDateString()}</p>
                </div>
                {referral.silo && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-0.5">Silo</p>
                    <p className="text-warm-gray-900 font-medium">{referral.silo}</p>
                  </div>
                )}
                {!canUpdate && referral.assignedToStaff && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-0.5">Assigned To</p>
                    <p className="text-warm-gray-900 font-medium">{referral.assignedToStaff.name}</p>
                  </div>
                )}
              </div>
              {canUpdate && (
                <div className="mt-4 pt-3 border-t border-cream-200">
                  <AssignStaff
                    referralId={referral.id}
                    currentStaffId={referral.assignedToStaff?.id}
                    currentStaffName={referral.assignedToStaff?.name}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Col 2: Status Timeline */}
        <div className="bg-white rounded-2xl shadow-sm border border-cream-200 overflow-hidden">
          <div className="px-6 pt-6 pb-2">
            <h2 className="text-sm font-semibold text-warm-gray-900">Status History</h2>
          </div>
          <div className="px-6 pb-6">
            <div className="space-y-4 mt-2">
              {referral.statusHistory.map((history, index) => (
                <div key={history.id} className="relative pl-6">
                  {index !== referral.statusHistory.length - 1 && (
                    <div className="absolute left-[7px] top-6 bottom-0 w-px bg-cream-200" />
                  )}
                  <div className="absolute left-0 top-1 w-[15px] h-[15px] bg-sky-100 border-2 border-sky-500 rounded-full" />
                  <div>
                    <StatusBadge status={history.toStatus} className="mb-1" />
                    <p className="text-[11px] text-warm-gray-500">
                      {new Date(history.changedAt).toLocaleString()}
                    </p>
                    {history.reason && (
                      <p className="text-[11px] text-warm-gray-600 mt-0.5 italic">{history.reason}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Col 3: Notes */}
        <div className="bg-white rounded-2xl shadow-sm border border-cream-200 overflow-hidden">
          <div className="px-6 pt-6 pb-2">
            <h2 className="text-sm font-semibold text-warm-gray-900">
              Notes
              {referral.notes.length > 0 && (
                <span className="ml-1.5 text-xs font-normal text-warm-gray-400">({referral.notes.length})</span>
              )}
            </h2>
          </div>
          <div className="px-6 pb-6">
            {referral.notes.length === 0 ? (
              <p className="text-warm-gray-500 text-sm mt-2">No notes yet</p>
            ) : (
              <div className="space-y-3 mt-2">
                {referral.notes.map((note) => (
                  <div key={note.id} className="pb-3 border-b border-cream-200 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-semibold text-warm-gray-900">{note.createdBy}</p>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {note.noteType !== 'GENERAL' && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-cream-100 text-warm-gray-600 rounded font-medium">
                            {note.noteType.replace(/_/g, ' ')}
                          </span>
                        )}
                        {note.isImportant && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-coral-50 text-coral-600 rounded font-semibold border border-coral-100">
                            Important
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-warm-gray-700 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                    <p className="text-[11px] text-warm-gray-400 mt-1">
                      {new Date(note.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
