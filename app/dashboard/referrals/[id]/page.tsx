import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import { hasPermission } from '@/lib/auth/permissions'
import { getSignedUrl } from '@/lib/storage'
import StatusBadge from '../components/status-badge'
import ReferralActions from '../components/referral-actions'
import ChecklistActions from '../components/checklist-actions'

interface ReferralDetailPageProps {
  params: Promise<{ id: string }>
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

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{referral.studentName}</h1>
            <p className="text-gray-600 mt-1">
              Confirmation: {referral.confirmationNumber}
            </p>
          </div>
          <StatusBadge status={referral.status} className="text-base px-4 py-2" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Student Information */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Student Information</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Date of Birth</p>
                <p className="text-gray-900 font-medium">
                  {new Date(referral.dateOfBirth).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Age</p>
                <p className="text-gray-900 font-medium">{referral.age}</p>
              </div>
              <div>
                <p className="text-gray-500">Grade</p>
                <p className="text-gray-900 font-medium">{referral.grade}</p>
              </div>
              <div>
                <p className="text-gray-500">Gender</p>
                <p className="text-gray-900 font-medium">{referral.gender}</p>
              </div>
              <div>
                <p className="text-gray-500">Birthplace</p>
                <p className="text-gray-900 font-medium">{referral.birthplace}</p>
              </div>
              <div>
                <p className="text-gray-500">Foster Youth</p>
                <p className="text-gray-900 font-medium">{referral.fosterYouth ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-500">Parent/Guardian</p>
                <p className="text-gray-900 font-medium">{referral.parentGuardianName}</p>
              </div>
              <div>
                <p className="text-gray-500">Address</p>
                <p className="text-gray-900 font-medium">
                  {referral.homeAddress}<br />
                  {referral.city}, {referral.state} {referral.zipCode}
                </p>
              </div>
              {referral.homePhone && (
                <div>
                  <p className="text-gray-500">Home Phone</p>
                  <p className="text-gray-900 font-medium">{referral.homePhone}</p>
                </div>
              )}
              {referral.cellPhone && (
                <div>
                  <p className="text-gray-500">Cell Phone</p>
                  <p className="text-gray-900 font-medium">{referral.cellPhone}</p>
                </div>
              )}
            </div>
          </div>

          {/* Placement Information */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Placement Information</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Placement Type</p>
                <p className="text-gray-900 font-medium">{referral.placementType}</p>
              </div>
              <div>
                <p className="text-gray-500">School of Attendance</p>
                <p className="text-gray-900 font-medium">{referral.schoolOfAttendance}</p>
              </div>
              <div>
                <p className="text-gray-500">School of Residence</p>
                <p className="text-gray-900 font-medium">{referral.schoolOfResidence}</p>
              </div>
              <div>
                <p className="text-gray-500">Special Ed Transportation</p>
                <p className="text-gray-900 font-medium">
                  {referral.transportationSpecialEd ? 'Yes' : 'No'}
                </p>
              </div>
            </div>
          </div>

          {/* Documents */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Documents</h2>
            {documentsWithUrls.length === 0 ? (
              <p className="text-gray-600">No documents uploaded</p>
            ) : (
              <div className="space-y-2">
                {documentsWithUrls.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{doc.fileName}</p>
                        <p className="text-xs text-gray-500">
                          {doc.documentType} • {(doc.fileSize / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    {doc.signedUrl && (
                      <a
                        href={doc.signedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-700 hover:text-sky-800 text-sm font-medium"
                      >
                        Download
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Document Checklist */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Document Checklist</h2>
            {checklistWithUrls.length === 0 ? (
              <p className="text-gray-600">Checklist not available yet</p>
            ) : (
              <div className="space-y-3">
                {checklistWithUrls.map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {checklistLabelMap[item.type] || item.type}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.required ? 'Required' : 'Optional'} • v{item.version}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${statusClassMap[item.status] || 'bg-cream-100 text-warm-gray-700'}`}
                      >
                        {statusBadgeMap[item.status] || item.status}
                      </span>
                    </div>
                    {item.rejectionReason && (
                      <p className="text-xs text-coral-600 mt-2">Reason: {item.rejectionReason}</p>
                    )}
                    {item.files.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {item.files.map((file) => (
                          <div key={file.id} className="flex items-center justify-between text-sm">
                            <span className="text-gray-700">{file.fileName}</span>
                            {file.signedUrl && (
                              <a
                                href={file.signedUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sky-700 hover:text-sky-800 text-xs font-medium"
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

          {/* Rejection Reason (if rejected) */}
          {referral.status === 'REJECTED' && referral.rejectionReason && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-red-900 mb-2">Rejection Reason</h2>
              <p className="text-red-800">{referral.rejectionReason}</p>
              {referral.missingItems && (
                <div className="mt-4">
                  <p className="font-medium text-red-900 mb-2">Missing Items:</p>
                  <ul className="list-disc list-inside text-red-800 space-y-1">
                    {(referral.missingItems as string[]).map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Actions */}
          {canUpdate && (
            <ReferralActions referralId={referral.id} currentStatus={referral.status} />
          )}

          {/* Timeline */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Status History</h2>
            <div className="space-y-4">
              {referral.statusHistory.map((history, index) => (
                <div key={history.id} className="relative pl-6">
                  {index !== referral.statusHistory.length - 1 && (
                    <div className="absolute left-2 top-6 bottom-0 w-0.5 bg-gray-200" />
                  )}
                  <div className="absolute left-0 top-1.5 w-4 h-4 bg-sky-600 rounded-full" />
                  <div>
                    <StatusBadge status={history.toStatus} className="mb-1" />
                    <p className="text-xs text-gray-600">
                      {new Date(history.changedAt).toLocaleString()}
                    </p>
                    {history.reason && (
                      <p className="text-xs text-gray-700 mt-1">{history.reason}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Details</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-500">Submitted</p>
                <p className="text-gray-900 font-medium">
                  {new Date(referral.submittedAt).toLocaleString()}
                </p>
              </div>
              {referral.submittedByUser && (
                <div>
                  <p className="text-gray-500">Submitted By</p>
                  <p className="text-gray-900 font-medium">{referral.submittedByUser.name}</p>
                  <p className="text-gray-600 text-xs">{referral.submittedByUser.email}</p>
                </div>
              )}
              <div>
                <p className="text-gray-500">Deadline</p>
                <p className="text-gray-900 font-medium">
                  {new Date(referral.deadlineDate).toLocaleDateString()}
                </p>
              </div>
              {referral.assignedToStaff && (
                <div>
                  <p className="text-gray-500">Assigned To</p>
                  <p className="text-gray-900 font-medium">{referral.assignedToStaff.name}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
