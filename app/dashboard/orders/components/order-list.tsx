'use client'

import { useEffect, useMemo, useState } from 'react'
import type { OrderStatus } from '@prisma/client'

interface OrderListProps {
  initialOrders?: any[]
}

export default function OrderList({ initialOrders = [] }: OrderListProps) {
  const [orders, setOrders] = useState(initialOrders)
  const [loading, setLoading] = useState(false)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [filters, setFilters] = useState({
    status: '',
    search: '',
  })

  useEffect(() => {
    fetchOrders()
  }, [filters])

  async function fetchOrders() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.status) params.set('status', filters.status)
      if (filters.search) params.set('search', filters.search)

      const response = await fetch(`/api/orders?${params}`)
      if (response.ok) {
        const data = await response.json()
        setOrders(data.orders || [])
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const statuses: { value: OrderStatus | ''; label: string }[] = [
    { value: '', label: 'All Statuses' },
    { value: 'NEW', label: 'New' },
    { value: 'SHIPPED', label: 'Shipped' },
    { value: 'RECEIVED', label: 'Received' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ]

  const sortedOrders = useMemo(() => {
    const rows = [...orders]
    rows.sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime()
      const bTime = new Date(b.createdAt).getTime()
      return sortDir === 'asc' ? aTime - bTime : bTime - aTime
    })
    return rows
  }, [orders, sortDir])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label htmlFor="search" className="block text-xs font-semibold text-gray-700 mb-1">
              Search
            </label>
            <input
              id="search"
              type="text"
              placeholder="Item name or order number..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full rounded-lg border border-cream-200/80 bg-white/70 px-3 py-2 text-sm text-warm-gray-800 shadow-sm transition focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-200/70 focus-visible:outline-none"
            />
          </div>

          <div>
            <label htmlFor="status" className="block text-xs font-semibold text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full rounded-lg border border-cream-200/80 bg-white/70 px-3 py-2 text-sm text-warm-gray-800 shadow-sm transition focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-200/70 focus-visible:outline-none"
            >
              {statuses.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {loading ? 'Loading...' : `${orders.length} order${orders.length !== 1 ? 's' : ''} found`}
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))}
            className="text-xs font-semibold text-warm-gray-700 hover:text-warm-gray-900 px-2 py-1 rounded-md border border-cream-200/80 bg-white/70 hover:bg-cream-50 transition-colors"
          >
            Date {sortDir === 'asc' ? 'Oldest' : 'Newest'}
          </button>
          <button
            onClick={fetchOrders}
            className="text-xs text-sky-700 hover:text-sky-800 font-semibold"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Orders table */}
      <div className="bg-white rounded-xl border border-cream-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
            <p className="mt-4 text-gray-600">No orders found</p>
          </div>
        ) : (
          <div>
            <div className="hidden md:grid grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,0.9fr)] gap-3 px-4 py-2 text-xs font-semibold text-warm-gray-600 bg-cream-50/70 border-b border-cream-200">
              <div>Order</div>
              <div>Requestor</div>
              <div>Site</div>
              <div>Submitted</div>
              <div className="text-right">Total</div>
            </div>
            <div className="divide-y divide-cream-200">
              {sortedOrders.map((order: any) => {
                const itemCount = order.items?.length || 0
                const displayTitle = itemCount === 1 ? order.items[0].itemName : `${itemCount} Items`
                return (
                  <a
                    key={order.id}
                    href={`/dashboard/orders/${order.id}`}
                    className="block px-4 py-3 hover:bg-cream-50/60 transition-colors"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,0.9fr)] gap-2 md:gap-3 items-center">
                      <div className="flex items-start gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-warm-gray-900 truncate">{displayTitle}</p>
                            <span className="text-xs text-warm-gray-500">#{order.orderNumber}</span>
                          </div>
                          <div className="text-xs text-warm-gray-600 mt-1 md:hidden">
                            {order.schoolSite} • {new Date(order.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="hidden md:block text-sm text-warm-gray-800">{order.requestor?.name}</div>
                      <div className="hidden md:block text-sm text-warm-gray-800">{order.schoolSite}</div>
                      <div className="hidden md:block text-sm text-warm-gray-700">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-sm font-semibold text-warm-gray-900 md:text-right">
                        ${Number(order.totalEstimatedPrice).toFixed(2)}
                        <span className="ml-2 text-xs text-warm-gray-500 md:ml-0 md:block">
                          {itemCount} {itemCount === 1 ? 'item' : 'items'}
                        </span>
                      </div>
                    </div>
                  </a>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
