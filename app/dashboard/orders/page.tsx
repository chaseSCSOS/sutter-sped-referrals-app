import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'
import OrderList from './components/order-list'

export default async function OrdersPage() {
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

  // Check if user has permission to view all orders
  if (!hasPermission(user.role, 'orders:view-all')) {
    return (
      <div className="max-w-[1600px] mx-auto">
        <div className="bg-coral-100 border border-coral-200 rounded-xl p-6 text-center">
          <h2 className="text-xl font-semibold text-warm-gray-900 mb-2">Access Denied</h2>
          <p className="text-warm-gray-700">You do not have permission to view all orders.</p>
          <Link
            href="/dashboard/my-orders"
            className="inline-block mt-4 px-4 py-2 bg-sage-600 text-white rounded hover:bg-sage-700 text-sm font-medium"
          >
            View My Orders
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-sky-700 mb-1">All Orders</h1>
          <p className="text-warm-gray-600 text-sm">Manage and track all order requests</p>
        </div>
        <Link
          href="/dashboard/orders/submit"
          className="px-4 py-2 bg-sage-600 text-white rounded hover:bg-sage-700 text-sm font-medium transition-colors"
        >
          Submit New Order
        </Link>
      </div>

      <OrderList />
    </div>
  )
}
