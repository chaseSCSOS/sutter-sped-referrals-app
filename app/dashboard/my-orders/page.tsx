import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'
import OrderList from '../orders/components/order-list'

export default async function MyOrdersPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) {
    return <div>Unauthorized</div>
  }

  const user = await prisma.user.findUnique({
    where: { supabaseUserId: authUser.id },
  })

  if (!user) {
    return <div>User not found</div>
  }

  // Check if user has permission to submit orders
  if (!hasPermission(user.role, 'orders:submit')) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <h2 className="text-xl font-semibold text-red-900 mb-2">Access Denied</h2>
          <p className="text-red-700">You do not have permission to submit orders.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
          <p className="text-gray-600 mt-1">View and track your order requests</p>
        </div>
        <Link
          href="/dashboard/orders/submit"
          className="px-4 py-2 bg-sky-600 text-white rounded-xl hover:bg-sky-700 font-medium transition-colors"
        >
          Submit New Order
        </Link>
      </div>

      <OrderList />
    </div>
  )
}
