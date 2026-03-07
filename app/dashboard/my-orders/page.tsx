import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'
import { canAccessMyOrders } from '@/lib/auth/order-requestors'
import OrderList from '../orders/components/order-list'

export default async function MyOrdersPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) {
    return (
      <div className="max-w-lg mx-auto mt-20">
        <div className="bg-white rounded-2xl shadow-sm border border-cream-200 p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-coral-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-coral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-warm-gray-900 mb-1">Authentication Required</h2>
          <p className="text-sm text-warm-gray-600 mb-5">Please sign in to access your orders.</p>
          <Link href="/auth/login" className="inline-block bg-sky-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-sky-700 transition-colors text-sm">Sign In</Link>
        </div>
      </div>
    )
  }

  const user = await prisma.user.findUnique({
    where: { supabaseUserId: authUser.id },
  })

  if (!user) {
    return (
      <div className="max-w-lg mx-auto mt-20">
        <div className="bg-white rounded-2xl shadow-sm border border-cream-200 p-8 text-center">
          <h2 className="text-lg font-bold text-warm-gray-900 mb-1">Account Not Found</h2>
          <p className="text-sm text-warm-gray-600 mb-5">We couldn&apos;t find your account. Please contact support.</p>
          <Link href="/auth/login" className="inline-block bg-sky-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-sky-700 transition-colors text-sm">Back to Sign In</Link>
        </div>
      </div>
    )
  }

  // Check if user can submit orders and belongs to a requestor role/group.
  if (!hasPermission(user.role, 'orders:submit') || !canAccessMyOrders(user)) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <h2 className="text-xl font-semibold text-red-900 mb-2">Access Denied</h2>
          <p className="text-red-700">My Orders is only available to order requestors.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-warm-gray-900">My Orders</h1>
          <p className="text-warm-gray-600 mt-1">View and track your order requests</p>
        </div>
        <Link
          href="/dashboard/orders/submit"
          className="px-4 py-2 bg-sky-600 text-white rounded-xl hover:bg-sky-700 font-medium transition-colors"
        >
          Submit New Order
        </Link>
      </div>

      <OrderList ownOnly />
    </div>
  )
}
