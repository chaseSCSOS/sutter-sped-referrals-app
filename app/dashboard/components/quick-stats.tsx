'use client'

import { useEffect, useState } from 'react'

interface QuickStatsData {
  totalReferrals: number
  totalOrders: number
  overdueReferrals: number
}

export function QuickStats() {
  const [stats, setStats] = useState<QuickStatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/dashboard/activity')
        if (response.ok) {
          const data = await response.json()
          setStats({
            totalReferrals: data.totalReferrals ?? 0,
            totalOrders: data.totalOrders ?? 0,
            overdueReferrals: data.overdueReferrals ?? 0,
          })
        }
      } catch (error) {
        console.error('Failed to fetch quick stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-cream-200/70 bg-white/60 px-4 py-3 animate-pulse">
            <div className="h-6 w-10 bg-cream-200 rounded mb-1" />
            <div className="h-3 w-16 bg-cream-100 rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (!stats) return null

  const items = [
    {
      label: 'Total Referrals',
      value: stats.totalReferrals,
      dot: 'bg-sky-600',
    },
    {
      label: 'Total Orders',
      value: stats.totalOrders,
      dot: 'bg-purple-600',
    },
    {
      label: 'Overdue',
      value: stats.overdueReferrals,
      dot: stats.overdueReferrals > 0 ? 'bg-red-500' : 'bg-sage-600',
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-cream-200/70 bg-white/60 px-4 py-3"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className={`h-2 w-2 rounded-full ${item.dot}`} />
            <span className="text-xl font-bold text-warm-gray-900">{item.value}</span>
          </div>
          <p className="text-xs text-warm-gray-500">{item.label}</p>
        </div>
      ))}
    </div>
  )
}
