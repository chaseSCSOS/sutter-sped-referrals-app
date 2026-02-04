'use client'

import Link from 'next/link'
import StatusBadge from './status-badge'
import { formatDistanceToNow } from 'date-fns'

interface ReferralTableProps {
  referrals: any[]
}

export default function ReferralTable({ referrals }: ReferralTableProps) {
  const getUrgencyColor = (deadlineDate: Date) => {
    const daysUntil = Math.ceil((new Date(deadlineDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    if (daysUntil < 0) return 'text-coral-600'
    if (daysUntil <= 7) return 'text-coral-600'
    return 'text-warm-gray-600'
  }

  const getPrimaryDisability = (disabilities: any) => {
    if (!disabilities) return '-'

    const disabilityCodes: Record<string, string> = {
      '210': 'Intellectual Disability',
      '220': 'Hard of Hearing',
      '230': 'Deaf',
      '240': 'Speech/Language',
      '250': 'Visual Impairment',
      '260': 'Emotional Disturbance',
      '270': 'Orthopedic Impairment',
      '280': 'Other Health Impairment',
      '281': 'Traumatic Brain Injury',
      '290': 'Specific Learning Disability',
      '300': 'Deaf-Blindness',
      '310': 'Multiple Disabilities',
      '320': 'Autism',
      '330': 'Established Medical Disability',
    }

    for (const [code, label] of Object.entries(disabilityCodes)) {
      if (disabilities[code] === 'P') {
        return label
      }
    }
    return '-'
  }

  return (
    <div className="bg-white rounded-xl border border-cream-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-sky-50 border-b border-sky-100">
              <th className="px-3 py-3 text-left text-xs font-medium text-sky-700 uppercase tracking-wide">
                Confirmation #
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-stone-600 uppercase tracking-wide">
                Student Name
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-stone-600 uppercase tracking-wide">
                Grade
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-stone-600 uppercase tracking-wide">
                Placement
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-stone-600 uppercase tracking-wide">
                School
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-stone-600 uppercase tracking-wide">
                Primary Disability
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-stone-600 uppercase tracking-wide">
                Status
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-stone-600 uppercase tracking-wide">
                Submitted
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-stone-600 uppercase tracking-wide">
                Deadline
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-stone-600 uppercase tracking-wide">
                Submitted By
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-sky-700 uppercase tracking-wide">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-100">
            {referrals.map((referral, index) => (
              <tr key={referral.id}
                  className="hover:bg-cream-50 transition-colors group"
                  style={{ animationDelay: `${index * 50}ms` }}>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className="text-sm font-mono text-warm-gray-900 font-medium">
                    {referral.confirmationNumber}
                  </span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <div className="text-sm font-medium text-warm-gray-900">
                    {referral.studentName}
                  </div>
                  <div className="text-xs text-warm-gray-600">
                    DOB: {new Date(referral.dateOfBirth).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className="text-sm text-warm-gray-700">{referral.grade}</span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className="text-xs font-medium text-sky-700 border border-sky-200 bg-sky-50 px-2 py-0.5 rounded">
                    {referral.placementType}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <div className="text-sm text-warm-gray-700 max-w-xs truncate">
                    {referral.schoolOfAttendance}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="text-sm text-warm-gray-700 max-w-xs truncate">
                    {getPrimaryDisability(referral.disabilities)}
                  </div>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <StatusBadge status={referral.status} />
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <div className="text-sm text-stone-700">
                    {new Date(referral.submittedAt).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-warm-gray-600">
                    {formatDistanceToNow(new Date(referral.submittedAt), { addSuffix: true })}
                  </div>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <div className={`text-sm font-medium ${getUrgencyColor(referral.deadlineDate)}`}>
                    {new Date(referral.deadlineDate).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-warm-gray-600">
                    {Math.ceil((new Date(referral.deadlineDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="text-sm text-warm-gray-700 max-w-xs truncate">
                    {referral.submittedByName || referral.submittedByEmail}
                  </div>
                  {referral.submittedByOrganization && (
                    <div className="text-xs text-stone-500 truncate">
                      {referral.submittedByOrganization}
                    </div>
                  )}
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-center">
                  <Link
                    href={`/dashboard/referrals/${referral.id}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-sage-700 border border-sage-200 bg-sage-50 rounded hover:bg-sage-100 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
