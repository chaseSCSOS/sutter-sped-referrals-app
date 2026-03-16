'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/lib/auth/hooks'
import { hasPermission } from '@/lib/auth/permissions'
import { canAccessMyOrders } from '@/lib/auth/order-requestors'
import { WelcomeTour } from '@/components/WelcomeTour'
import { SchoolYearSwitcher } from '@/app/dashboard/components/school-year-switcher'

const NAV_TOUR_IDS: Record<string, string> = {
  '/dashboard/referrals': 'nav-referrals',
  '/dashboard/orders': 'nav-orders',
  '/dashboard/reports/enrollment': 'nav-reports',
  '/dashboard/settings': 'nav-users',
  '/dashboard/my-referrals': 'nav-my-referrals',
  '/dashboard/my-orders': 'nav-my-orders',
  '/dashboard/orders/submit': 'nav-submit-order',
}

type NavItem = {
  name: string
  href: string
  permission: 'referrals:view-all' | 'classrooms:view' | 'orders:view-all' | 'referrals:view-own' | 'orders:view-own' | 'orders:submit' | 'assessments:submit' | 'users:view' | null
  requiresOrderRequestor?: boolean
  icon: React.ReactNode
}

type NavGroup = {
  label: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      {
        name: 'Dashboard',
        href: '/dashboard',
        permission: null,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        ),
      },
      {
        name: 'Referrals',
        href: '/dashboard/referrals',
        permission: 'referrals:view-all',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
      },
      {
        name: 'My Referrals',
        href: '/dashboard/my-referrals',
        permission: 'referrals:view-own',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
      },
      {
        name: 'Classrooms',
        href: '/dashboard/classrooms',
        permission: 'classrooms:view',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        ),
      },
      {
        name: 'Class List',
        href: '/dashboard/referrals/class-list',
        permission: 'referrals:view-all',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Orders',
    items: [
      {
        name: 'Orders',
        href: '/dashboard/orders',
        permission: 'orders:view-all',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        ),
      },
      {
        name: 'My Orders',
        href: '/dashboard/my-orders',
        permission: 'orders:view-own',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        ),
      },
      {
        name: 'Submit Order',
        href: '/dashboard/orders/submit',
        permission: 'orders:submit',
        requiresOrderRequestor: true,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        ),
      },
      {
        name: 'Order Protocol',
        href: '/dashboard/orders/submit-protocol',
        permission: 'assessments:submit',
        requiresOrderRequestor: true,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Reports & Settings',
    items: [
      {
        name: 'Reports',
        href: '/dashboard/reports/enrollment',
        permission: 'referrals:view-all',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        ),
      },
      {
        name: 'Settings',
        href: '/dashboard/settings',
        permission: 'users:view',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      },
    ],
  },
]

// Keep a flat list for tour ID lookups and active-state logic
const NAVIGATION = NAV_GROUPS.flatMap(g => g.items)

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading, signOut, isAuthenticated, userNotFound } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [tourOpen, setTourOpen] = useState(false)
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [loading, isAuthenticated, router])

  // Check if user account is pending approval
  useEffect(() => {
    if (user && !user.isActive) {
      router.push('/auth/pending-approval')
    }
  }, [user, router])

  // Close avatar dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (avatarMenuOpen) {
        setAvatarMenuOpen(false)
      }
    }

    if (avatarMenuOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [avatarMenuOpen])

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage-600 mx-auto"></div>
          <p className="mt-4 text-warm-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (isAuthenticated && userNotFound) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-cream-200 p-8 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-warm-gray-900 mb-2">Account Setup Incomplete</h1>
          <p className="text-sm text-warm-gray-600 mb-6">
            Your login credentials were found, but your account has not been fully set up in SPEDEX yet.
            Please contact your SCSOS administrator to have your account created through the portal.
          </p>
          <p className="text-xs text-warm-gray-500 mb-6">
            Administrators: go to <strong>Dashboard → Settings → Users → New User</strong> and enter this person's email to complete setup.
          </p>
          <button
            onClick={signOut}
            className="w-full py-2.5 px-4 rounded-xl text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  const visibleGroups = NAV_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (item.requiresOrderRequestor) {
        return canAccessMyOrders(user) && (!item.permission || hasPermission(user.role, item.permission))
      }
      if (item.href === '/dashboard/my-orders') {
        return canAccessMyOrders(user)
      }
      return !item.permission || hasPermission(user.role, item.permission)
    }),
  })).filter(group => group.items.length > 0)

  return (
    <div className="min-h-screen bg-cream-100">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-warm-gray-900 bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-4 bottom-4 left-4 w-64 bg-white border border-cream-200 rounded-2xl shadow-lg z-30 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-cream-200 bg-white">
            <div className="flex items-center justify-center mb-2">
              <Image
                src="/scsos-logo.png"
                alt="Sutter County Superintendent of Schools"
                width={180}
                height={48}
                priority
                className="h-auto w-auto max-w-[180px]"
              />
            </div>
            <p className="text-xs text-warm-gray-600 text-center">Special Education Portal</p>
          </div>

          <SchoolYearSwitcher />

          <nav className="flex-1 px-3 py-4 overflow-y-auto bg-cream-50">
            {visibleGroups.map((group, groupIndex) => (
              <div key={group.label} className={groupIndex > 0 ? 'mt-4 pt-4 border-t border-cream-200' : ''}>
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-warm-gray-400">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map(item => {
                    const isActive = (() => {
                      if (item.href === '/dashboard') return pathname === '/dashboard'
                      if (pathname === item.href) return true
                      if (!pathname.startsWith(item.href + '/')) return false
                      return !NAVIGATION.some(other =>
                        other.href !== item.href &&
                        other.href.startsWith(item.href + '/') &&
                        (pathname === other.href || pathname.startsWith(other.href + '/'))
                      )
                    })()
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        data-tour={NAV_TOUR_IDS[item.href]}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-sage-100 text-sage-700'
                            : 'text-warm-gray-700 hover:bg-cream-100'
                        }`}
                        onClick={() => setSidebarOpen(false)}
                      >
                        {item.icon}
                        <span>{item.name}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="p-3 border-t border-cream-200 bg-cream-50">
            {/* Avatar with dropdown */}
            <div className="relative">
              <button
                onClick={() => setAvatarMenuOpen(!avatarMenuOpen)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded hover:bg-cream-100 transition-colors"
              >
                <div className="w-8 h-8 bg-sky-200 rounded-full flex items-center justify-center text-sky-700 font-medium text-sm">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-warm-gray-900 truncate">{user.name}</p>
                  <p className="text-xs text-warm-gray-600 truncate">{user.role.replace('_', ' ')}</p>
                </div>
                <svg className={`w-4 h-4 text-warm-gray-400 transition-transform ${avatarMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {avatarMenuOpen && (
                <div className="absolute bottom-full left-3 right-3 mb-2 bg-white border border-cream-200 rounded-lg shadow-lg overflow-hidden">
                  <Link
                    href="/dashboard/profile"
                    className="flex items-center gap-3 px-3 py-2.5 text-sm text-warm-gray-700 hover:bg-cream-100 transition-colors"
                    onClick={() => setAvatarMenuOpen(false)}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Profile
                  </Link>
                  <button
                    onClick={signOut}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-warm-gray-700 hover:bg-cream-100 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              )}
            </div>

            {/* Tour button */}
            <button
              onClick={() => setTourOpen(true)}
              className="mt-1 w-full flex items-center gap-2 px-3 py-2 text-sm text-warm-gray-600 hover:bg-cream-100 rounded transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Take a tour
            </button>

            {/* Changelog link */}
            {hasPermission(user.role, 'changelog:view') && (
              <Link
                href="/dashboard/changelog"
                className="mt-1 flex items-center gap-2 px-3 py-2 text-sm text-warm-gray-600 hover:bg-cream-100 rounded transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h4" />
                </svg>
                Change Log
              </Link>
            )}
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="lg:hidden bg-white border-b border-cream-200 p-4 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded hover:bg-cream-100"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Image
            src="/scsos-logo.png"
            alt="Sutter County Superintendent of Schools"
            width={150}
            height={40}
            priority
            className="h-auto w-auto max-w-[150px]"
          />
        </header>

        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>

      <WelcomeTour
        role={user.role}
        userId={user.id}
        forceOpen={tourOpen}
        onClose={() => setTourOpen(false)}
      />
    </div>
  )
}
