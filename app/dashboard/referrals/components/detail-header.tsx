'use client'

import { useState } from 'react'
import Link from 'next/link'
import StatusBadge from './status-badge'
import EditReferralModal from './edit-referral-modal'
import type { ReferralStatus } from '@prisma/client'

interface DetailHeaderProps {
  referral: any
  canUpdate: boolean
}

export default function DetailHeader({ referral, canUpdate }: DetailHeaderProps) {
  const [editOpen, setEditOpen] = useState(false)

  return (
    <>
      <div className="mb-10">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-warm-gray-600 mb-6">
          <Link href="/dashboard/referrals" className="hover:text-sky-700 transition-colors">
            Referrals
          </Link>
          <svg className="w-3.5 h-3.5 text-warm-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-warm-gray-900 font-medium truncate">{referral.studentName}</span>
        </nav>

        {/* Hero header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-700 font-semibold text-lg flex-shrink-0">
                {referral.studentName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-warm-gray-900 tracking-tight truncate">
                  {referral.studentName}
                </h1>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm text-warm-gray-600 font-mono">
                    {referral.confirmationNumber}
                  </span>
                  <span className="text-warm-gray-400">·</span>
                  <span className="text-sm text-warm-gray-600">
                    Grade {referral.grade}
                  </span>
                  <span className="text-warm-gray-400">·</span>
                  <span className="text-sm text-warm-gray-600">
                    {referral.placementType}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <StatusBadge status={referral.status as ReferralStatus} className="text-sm px-3.5 py-1.5" />
            {canUpdate && (
              <button
                onClick={() => setEditOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-cream-200 rounded-xl text-sm font-medium text-warm-gray-700 hover:bg-cream-50 hover:border-cream-300 transition-all shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Referral
              </button>
            )}
          </div>
        </div>
      </div>

      {editOpen && (
        <EditReferralModal
          referral={referral}
          open={editOpen}
          onClose={() => setEditOpen(false)}
        />
      )}
    </>
  )
}
