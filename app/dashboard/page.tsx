'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/auth/hooks'
import { getDynamicDashboardMessage } from '@/lib/utils/dynamic-messages'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { ActivityFeed } from './components/activity-feed'
import { DashboardStats } from './components/dashboard-stats'

type ActionTone = 'teal' | 'sage' | 'coral' | 'stone'

const toneStyles: Record<
  ActionTone,
  { icon: string; ring: string; pill: string }
> = {
  teal: {
    icon: 'bg-sky-100/70 text-sky-700',
    ring: 'group-hover:shadow-[0_0_0_1px_rgba(63,99,95,0.25),0_16px_40px_-28px_rgba(63,99,95,0.7)]',
    pill: 'bg-sky-50 text-sky-700',
  },
  sage: {
    icon: 'bg-sage-100/70 text-sage-700',
    ring: 'group-hover:shadow-[0_0_0_1px_rgba(79,97,87,0.25),0_16px_40px_-28px_rgba(79,97,87,0.7)]',
    pill: 'bg-sage-50 text-sage-700',
  },
  coral: {
    icon: 'bg-coral-100/70 text-coral-600',
    ring: 'group-hover:shadow-[0_0_0_1px_rgba(192,111,123,0.2),0_16px_40px_-28px_rgba(192,111,123,0.7)]',
    pill: 'bg-coral-50 text-coral-600',
  },
  stone: {
    icon: 'bg-cream-200/80 text-warm-gray-700',
    ring: 'group-hover:shadow-[0_0_0_1px_rgba(38,35,31,0.12),0_16px_40px_-28px_rgba(38,35,31,0.5)]',
    pill: 'bg-cream-100 text-warm-gray-700',
  },
}

export default function DashboardPage() {
  const { user } = useAuth()

  if (!user) return null

  const dynamicMessage = getDynamicDashboardMessage(user.name)

  const quickActions: Array<{
    title: string
    description: string
    href: string
    icon: ReactNode
    tone: ActionTone
    meta: string
  }> = []

  if (user.role === 'EXTERNAL_ORG') {
    quickActions.push(
      {
        title: 'Submit Referral',
        description: 'Start a new interim placement request',
        href: '/referrals/submit',
        tone: 'teal',
        meta: 'Referral intake',
        icon: (
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        ),
      },
      {
        title: 'My Referrals',
        description: 'Track progress and follow-up tasks',
        href: '/dashboard/referrals/my-referrals',
        tone: 'sage',
        meta: 'Status tracking',
        icon: (
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        ),
      }
    )
  }

  if (user.role === 'TEACHER') {
    quickActions.push(
      {
        title: 'Submit Order',
        description: 'Request new materials or equipment',
        href: '/dashboard/orders/submit',
        tone: 'teal',
        meta: 'Order request',
        icon: (
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
        ),
      },
      {
        title: 'My Orders',
        description: 'Track approvals and delivery dates',
        href: '/dashboard/orders/my-orders',
        tone: 'sage',
        meta: 'Order tracking',
        icon: (
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
        ),
      }
    )
  }

  if (user.role === 'SPED_STAFF' || user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
    quickActions.push(
      {
        title: 'Manage Referrals',
        description: 'Review and update referral status',
        href: '/dashboard/referrals',
        tone: 'coral',
        meta: 'Workflow queue',
        icon: (
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        ),
      },
      {
        title: 'Manage Orders',
        description: 'Approve, fulfill, and audit requests',
        href: '/dashboard/orders',
        tone: 'stone',
        meta: 'Order oversight',
        icon: (
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
        ),
      }
    )
  }

  const getRoleDescription = () => {
    switch (user.role) {
      case 'SPED_STAFF':
        return 'Manage referrals and orders for your district'
      case 'ADMIN':
      case 'SUPER_ADMIN':
        return 'Full system administration access'
      case 'TEACHER':
        return 'Submit and track your order requests'
      case 'EXTERNAL_ORG':
        return 'Submit and track your referrals'
      default:
        return ''
    }
  }

  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 right-0 top-[-140px] -z-10 h-80 bg-[radial-gradient(ellipse_at_top,_rgba(143,179,177,0.25),_transparent_60%)]"
      />
      <div className="mx-auto max-w-[1600px] px-4 py-10 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-warm-gray-600">
                Dashboard
              </p>
              <h1 className="text-3xl font-semibold text-warm-gray-900 sm:text-4xl">
                {dynamicMessage.greeting}
              </h1>
              <p className="mt-1 text-sm text-warm-gray-600">{dynamicMessage.subtitle}</p>
            </div>
            <Badge className="self-start sm:self-auto">{user.role.replaceAll('_', ' ')}</Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pending Items</CardTitle>
                <CardDescription>
                  Review pending submissions and stay on top of deadlines.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DashboardStats />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Stats</CardTitle>
                <CardDescription>At-a-glance overview of your workload.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 rounded-xl border border-cream-200/70 bg-white/60 px-4 py-3 text-sm text-warm-gray-700">
                  <span className="h-2 w-2 rounded-full bg-sage-600" />
                  Enhanced metrics coming soon.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {quickActions.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-warm-gray-900">Quick actions</h2>
              <span className="text-xs uppercase tracking-[0.2em] text-warm-gray-600">
                Shortcuts
              </span>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {quickActions.map((action, index) => {
                const tone = toneStyles[action.tone]
                return (
                  <Link
                    key={index}
                    href={action.href}
                    className={`group block h-full rounded-2xl transition-all duration-200 ${tone.ring}`}
                  >
                    <Card className="h-full border border-cream-200/80 bg-white/70 transition-all duration-200 group-hover:-translate-y-0.5">
                      <CardHeader className="flex flex-row items-start gap-4">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone.icon}`}
                        >
                          {action.icon}
                        </div>
                        <div className="space-y-1">
                          <CardTitle className="text-base">{action.title}</CardTitle>
                          <CardDescription className="text-sm">
                            {action.description}
                          </CardDescription>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center justify-between text-xs text-warm-gray-600">
                          <span className={`rounded-full px-2 py-1 ${tone.pill}`}>
                            {action.meta}
                          </span>
                          <span className="font-medium text-warm-gray-700">Open</span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        <Card className="mt-10">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Your latest referrals and orders at a glance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityFeed />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
