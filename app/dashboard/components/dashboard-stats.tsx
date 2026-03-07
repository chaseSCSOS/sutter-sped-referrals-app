'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface StatsData {
  pendingReferrals: number
  pendingOrders: number
}

export function DashboardStats() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/dashboard/activity')
        if (response.ok) {
          const data = await response.json()
          setStats({
            pendingReferrals: data.pendingReferrals,
            pendingOrders: data.pendingOrders,
          })
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-cream-200/70 bg-white/60 px-4 py-3">
        <div className="h-2 w-2 rounded-full bg-sky-600 animate-pulse" />
        <span className="text-sm text-warm-gray-600">Loading...</span>
      </div>
    )
  }

  if (!stats || (stats.pendingReferrals === 0 && stats.pendingOrders === 0)) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-cream-200/70 bg-white/60 px-4 py-3 text-sm text-warm-gray-700">
        <span className="h-2 w-2 rounded-full bg-green-600" />
        All caught up! No pending items.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {stats.pendingReferrals > 0 && (
        <Link
          href="/dashboard/referrals?status=SUBMITTED,UNDER_REVIEW"
          className="flex items-center justify-between gap-3 rounded-xl border border-sky-200/70 bg-sky-50/60 px-4 py-3 text-sm hover:bg-sky-50 hover:border-sky-300 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-sky-600" />
            <span className="text-sky-900 font-medium">{stats.pendingReferrals} pending referral{stats.pendingReferrals !== 1 ? 's' : ''}</span>
          </div>
          <svg className="h-4 w-4 text-sky-600 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      )}
      {stats.pendingOrders > 0 && (
        <Link
          href="/dashboard/orders?status=NEW"
          className="flex items-center justify-between gap-3 rounded-xl border border-purple-200/70 bg-purple-50/60 px-4 py-3 text-sm hover:bg-purple-50 hover:border-purple-300 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-purple-600" />
            <span className="text-purple-900 font-medium">{stats.pendingOrders} pending order{stats.pendingOrders !== 1 ? 's' : ''}</span>
          </div>
          <svg className="h-4 w-4 text-purple-600 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      )}
    </div>
  )
}
