'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

interface ActivityData {
  recentReferrals: Array<{
    id: string
    confirmationNumber: string
    studentName: string
    status: string
    submittedAt: string
    submittedByUser: { name: string } | null
  }>
  recentOrders: Array<{
    id: string
    orderNumber: string
    status: string
    createdAt: string
    items: Array<{ itemName: string }>
    requestor: { name: string }
  }>
  pendingReferrals: number
  pendingOrders: number
}

export function ActivityFeed() {
  const [activity, setActivity] = useState<ActivityData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchActivity() {
      try {
        const response = await fetch('/api/dashboard/activity')
        if (response.ok) {
          const data = await response.json()
          setActivity(data)
        }
      } catch (error) {
        console.error('Failed to fetch activity:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchActivity()
  }, [])

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    )
  }

  if (!activity) {
    return (
      <p className="text-sm text-warm-gray-500">Unable to load recent activity.</p>
    )
  }

  const hasActivity = activity.recentReferrals.length > 0 || activity.recentOrders.length > 0

  if (!hasActivity) {
    return (
      <p className="text-sm text-gray-600">No recent activity. Start by submitting a referral or order.</p>
    )
  }

  // Combine and sort activities
  const allActivities = [
    ...activity.recentReferrals.map((r) => ({
      type: 'referral' as const,
      id: r.id,
      title: r.studentName,
      subtitle: `Referral ${r.confirmationNumber}`,
      status: r.status,
      timestamp: new Date(r.submittedAt),
      submittedBy: r.submittedByUser?.name || 'Unknown',
      href: `/dashboard/referrals/${r.id}`,
    })),
    ...activity.recentOrders.map((o) => ({
      type: 'order' as const,
      id: o.id,
      title: o.items[0]?.itemName || 'Order',
      subtitle: `Order ${o.orderNumber}`,
      status: o.status,
      timestamp: new Date(o.createdAt),
      submittedBy: o.requestor.name,
      href: `/dashboard/orders/${o.id}`,
    })),
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

  return (
    <div className="space-y-3">
      {allActivities.slice(0, 6).map((item) => {
        const isReferral = item.type === 'referral'
        const statusColors: Record<string, string> = {
          SUBMITTED: 'bg-blue-100 text-blue-700',
          UNDER_REVIEW: 'bg-yellow-100 text-yellow-700',
          APPROVED: 'bg-green-100 text-green-700',
          REJECTED: 'bg-red-100 text-red-700',
          NEW: 'bg-blue-100 text-blue-700',
          PENDING: 'bg-cream-100 text-warm-gray-700',
        }

        return (
          <Link
            key={`${item.type}-${item.id}`}
            href={item.href}
            className="group block rounded-xl border border-cream-200 bg-white p-4 transition-all hover:border-cream-300 hover:shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg ${isReferral ? 'bg-sky-100 text-sky-700' : 'bg-purple-100 text-purple-700'}`}>
                {isReferral ? (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-warm-gray-900 truncate group-hover:text-sky-700 transition-colors">
                      {item.title}
                    </p>
                    <p className="text-xs text-warm-gray-500 mt-0.5">{item.subtitle}</p>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[item.status] || statusColors.PENDING}`}>
                    {item.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-xs text-warm-gray-400 mt-2">
                  {formatDistanceToNow(item.timestamp, { addSuffix: true })} • by {item.submittedBy}
                </p>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

export function ActivityStats({ pendingReferrals, pendingOrders }: { pendingReferrals: number; pendingOrders: number }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {pendingReferrals > 0 && (
        <Link
          href="/dashboard/referrals?status=SUBMITTED,UNDER_REVIEW"
          className="rounded-xl border border-cream-200 bg-white p-4 transition-all hover:border-sky-300 hover:shadow-sm"
        >
          <p className="text-2xl font-bold text-warm-gray-900">{pendingReferrals}</p>
          <p className="text-xs text-warm-gray-500 mt-1">Pending Referrals</p>
        </Link>
      )}
      {pendingOrders > 0 && (
        <Link
          href="/dashboard/orders?status=NEW"
          className="rounded-xl border border-cream-200 bg-white p-4 transition-all hover:border-purple-300 hover:shadow-sm"
        >
          <p className="text-2xl font-bold text-warm-gray-900">{pendingOrders}</p>
          <p className="text-xs text-warm-gray-500 mt-1">Pending Orders</p>
        </Link>
      )}
    </div>
  )
}
