'use client'

import { useEffect, useMemo, useState } from 'react'
import type { OrderStatus } from '@prisma/client'
import OrderStatusBadge from './order-status-badge'
import Pagination from '@/components/ui/pagination'

interface OrderListProps {
  initialOrders?: any[]
  ownOnly?: boolean
}

export default function OrderList({ initialOrders = [], ownOnly = false }: OrderListProps) {
  const [orders, setOrders] = useState(initialOrders)
  const [loading, setLoading] = useState(false)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState({
    status: '',
    search: '',
  })

  useEffect(() => {
    fetchOrders()
  }, [filters, page, ownOnly])

  useEffect(() => {
    setPage(1)
  }, [filters.status, filters.search])

  async function fetchOrders() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.status) params.set('status', filters.status)
      if (filters.search) params.set('search', filters.search)
      if (ownOnly) params.set('scope', 'own')
      params.set('page', String(page))
      params.set('limit', '20')

      const response = await fetch(`/api/orders?${params}`)
      if (response.ok) {
        const data = await response.json()
        setOrders(data.orders || [])
        if (data.pagination) {
          setTotalPages(data.pagination.pages)
        }
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const statuses: { value: OrderStatus | ''; label: string }[] = [
    { value: '', label: 'All Statuses' },
    { value: 'NEW', label: 'Submitted' },
    { value: 'SHIPPED', label: 'Placed' },
    { value: 'RECEIVED', label: 'Ready for Pickup' },
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
      <div className="bg-white rounded-xl shadow-sm border border-cream-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              id="search"
              type="text"
              placeholder="Search by item name or order number…"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-cream-200 bg-white text-sm text-warm-gray-800 shadow-sm transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200/70 focus:outline-none"
            />
          </div>
          <select
            id="status"
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="rounded-lg border border-cream-200 bg-white px-3 py-2 text-sm text-warm-gray-800 shadow-sm transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200/70 focus:outline-none"
          >
            {statuses.map(status => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-warm-gray-500">
          {loading ? 'Loading…' : `${orders.length} order${orders.length !== 1 ? 's' : ''} found`}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-warm-gray-600 hover:text-warm-gray-900 px-2.5 py-1.5 rounded-md border border-cream-200 bg-white hover:bg-cream-50 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
            </svg>
            {sortDir === 'asc' ? 'Oldest first' : 'Newest first'}
          </button>
          <button onClick={fetchOrders} className="text-xs text-sky-600 hover:text-sky-800 font-semibold px-2">
            Refresh
          </button>
        </div>
      </div>

      {/* Orders table */}
      <div className="bg-white rounded-xl border border-cream-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-cream-200 border-t-sky-500" />
            <p className="text-sm text-warm-gray-500">Loading orders…</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-warm-gray-400">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <p className="text-sm font-medium">No orders found</p>
          </div>
        ) : (
          <div>
            {/* Column headers */}
            <div className="hidden md:grid md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.85fr)_minmax(0,0.85fr)] px-5 py-2.5 border-b border-cream-200 bg-warm-gray-50">
              <p className="text-[11px] font-bold text-warm-gray-500 uppercase tracking-wider">Order</p>
              <p className="text-[11px] font-bold text-warm-gray-500 uppercase tracking-wider">Requestor</p>
              <p className="text-[11px] font-bold text-warm-gray-500 uppercase tracking-wider">School / Site</p>
              <p className="text-[11px] font-bold text-warm-gray-500 uppercase tracking-wider">Status</p>
              <p className="text-[11px] font-bold text-warm-gray-500 uppercase tracking-wider">Submitted</p>
              <p className="text-[11px] font-bold text-warm-gray-500 uppercase tracking-wider text-right">Total</p>
            </div>

            <div className="divide-y divide-cream-100">
              {sortedOrders.map((order: any) => {
                const itemCount = order.items?.length || 0
                const displayTitle = itemCount === 1 ? order.items[0].itemName : `${itemCount} Items`
                return (
                  <a
                    key={order.id}
                    href={`/dashboard/orders/${order.id}`}
                    className="group flex md:grid md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.85fr)_minmax(0,0.85fr)] gap-3 items-center px-5 py-4 hover:bg-sky-50/50 border-l-[3px] border-transparent hover:border-sky-400 transition-all"
                  >
                    {/* Order name + # */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-warm-gray-900 truncate group-hover:text-sky-700 transition-colors">
                        {displayTitle}
                      </p>
                      <p className="text-xs text-warm-gray-400 mt-0.5 font-mono">#{order.orderNumber}</p>
                      {/* Mobile: extra info */}
                      <div className="flex items-center gap-2 mt-1.5 md:hidden">
                        <OrderStatusBadge status={order.status} />
                        <span className="text-xs text-warm-gray-500">{order.schoolSite}</span>
                      </div>
                    </div>

                    {/* Requestor */}
                    <div className="hidden md:block">
                      <p className="text-sm text-warm-gray-800">{order.requestor?.name}</p>
                    </div>

                    {/* School */}
                    <div className="hidden md:block">
                      <p className="text-sm text-warm-gray-800">{order.schoolSite}</p>
                    </div>

                    {/* Status */}
                    <div className="hidden md:block">
                      <OrderStatusBadge status={order.status} />
                    </div>

                    {/* Date */}
                    <div className="hidden md:block">
                      <p className="text-sm text-warm-gray-700">{new Date(order.createdAt).toLocaleDateString()}</p>
                    </div>

                    {/* Total */}
                    <div className="flex-shrink-0 text-right">
                      <p className="text-sm font-bold text-warm-gray-900">${Number(order.totalEstimatedPrice).toFixed(2)}</p>
                      <p className="text-xs text-warm-gray-400">{itemCount} {itemCount === 1 ? 'item' : 'items'}</p>
                    </div>
                  </a>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  )
}
