'use client'

import { useAuth } from '@/lib/auth/hooks'
import ReferralList from '../referrals/components/referral-list'
import Link from 'next/link'

export default function MyReferralsPage() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Referrals</h1>
            <p className="text-gray-600 mt-2">View and track your submitted referrals</p>
          </div>
          <Link
            href="/referrals/submit"
            className="bg-sky-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-sky-700 transition-colors"
          >
            Submit New Referral
          </Link>
        </div>
      </div>

      <ReferralList />
    </div>
  )
}
