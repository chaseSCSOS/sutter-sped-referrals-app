import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'

const CLASSROOMS_NAV = [
  { name: 'Dashboard', href: '/dashboard/classrooms' },
  { name: 'By Program', href: '/dashboard/classrooms/by-program' },
  { name: 'By Campus', href: '/dashboard/classrooms/by-campus' },
  { name: 'By Teacher', href: '/dashboard/classrooms/by-teacher' },
  { name: 'Para Coverage', href: '/dashboard/classrooms/analytics/para-coverage' },
  { name: 'Placement Queue', href: '/dashboard/classrooms/analytics/referral-queue' },
  { name: 'SEIS / Aeries', href: '/dashboard/classrooms/seis-aeries' },
  { name: 'Transition Pipeline', href: '/dashboard/classrooms/pipeline' },
  { name: 'Transportation', href: '/dashboard/classrooms/transportation' },
  { name: 'Planning', href: '/dashboard/classrooms/planning' },
  { name: 'Audit Log', href: '/dashboard/classrooms/audit' },
]

export default async function ClassroomsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/auth/login')
  }

  const user = await prisma.user.findUnique({
    where: { supabaseUserId: authUser.id },
    select: { role: true },
  })

  if (!user || !hasPermission(user.role, 'classrooms:view')) {
    redirect('/dashboard')
  }

  return (
    <div className="flex gap-6 max-w-[1600px] mx-auto">
      {/* Secondary sidebar */}
      <aside className="w-48 flex-shrink-0">
        <nav className="sticky top-4 space-y-0.5">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-warm-gray-500 px-3 pb-2">
            Classrooms
          </p>
          {CLASSROOMS_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-3 py-2 rounded text-sm text-warm-gray-700 hover:bg-cream-100 hover:text-warm-gray-900 transition-colors"
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
