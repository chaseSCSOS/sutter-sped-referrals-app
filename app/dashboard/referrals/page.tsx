'use client'

import { useAuth } from '@/lib/auth/hooks'
import { hasPermission } from '@/lib/auth/permissions'
import ReferralList from './components/referral-list'
import { useRouter } from 'next/navigation'

export default function ReferralsPage() {
  const { user } = useAuth()
  const router = useRouter()

  if (!user) return null

  // Check permission
  if (!hasPermission(user.role, 'referrals:view-all')) {
    return (
      <div className="max-w-[1600px] mx-auto">
        <div className="bg-coral-100 border border-coral-200 rounded-xl p-6 text-center">
          <h2 className="text-xl font-semibold text-warm-gray-900 mb-2">Access Denied</h2>
          <p className="text-warm-gray-700">You do not have permission to view all referrals.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1600px] mx-auto">
      <div className="mb-6 animate-fade-in-up">
        <h1 className="text-2xl font-semibold text-sky-700 mb-1">
          Referrals
        </h1>
        <p className="text-warm-gray-600 text-sm">Manage and review all submitted referrals</p>
      </div>

      <div className="animate-fade-in-up animation-delay-100">
        <ReferralList />
      </div>
    </div>
  )
}
