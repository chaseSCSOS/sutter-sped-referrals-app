import Link from 'next/link'
import StatusBadge from './status-badge'
import { daysBetween } from '@/lib/utils'

interface ReferralCardProps {
  referral: {
    id: string
    confirmationNumber: string
    status: any
    studentName: string
    grade: string
    submittedAt: Date
    deadlineDate: Date
    assignedToStaff?: { id: string; name: string } | null
    documents: { id: string; documentType: string }[]
  }
}

export default function ReferralCard({ referral }: ReferralCardProps) {
  const daysUntilDeadline = daysBetween(new Date(), new Date(referral.deadlineDate))
  const isUrgent = daysUntilDeadline <= 7

  return (
    <Link
      href={`/dashboard/referrals/${referral.id}`}
      className="block bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-5 border border-cream-200"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-base font-medium text-warm-gray-900">{referral.studentName}</h3>
            <StatusBadge status={referral.status} />
          </div>
          <p className="text-sm text-warm-gray-600">
            Grade: {referral.grade} • Confirmation: {referral.confirmationNumber}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-warm-gray-600 text-xs">Submitted</p>
          <p className="text-warm-gray-900 font-medium">
            {new Date(referral.submittedAt).toLocaleDateString()}
          </p>
        </div>
        <div>
          <p className="text-warm-gray-600 text-xs">Deadline</p>
          <p className={`font-medium ${isUrgent ? 'text-coral-600' : 'text-warm-gray-900'}`}>
            {new Date(referral.deadlineDate).toLocaleDateString()}
            <span className="text-xs ml-1 text-warm-gray-600">({daysUntilDeadline} days)</span>
          </p>
        </div>
        <div>
          <p className="text-warm-gray-600 text-xs">Documents</p>
          <p className="text-warm-gray-900 font-medium">{referral.documents.length} uploaded</p>
        </div>
        {referral.assignedToStaff && (
          <div>
            <p className="text-warm-gray-600 text-xs">Assigned To</p>
            <p className="text-warm-gray-900 font-medium">{referral.assignedToStaff.name}</p>
          </div>
        )}
      </div>
    </Link>
  )
}
