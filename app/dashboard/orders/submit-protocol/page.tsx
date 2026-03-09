'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/hooks'
import { hasPermission } from '@/lib/auth/permissions'

interface Category { id: string; name: string; description: string | null }
interface Vendor { id: string; name: string }
interface Test {
  id: string
  name: string
  vendorId: string
  vendor: Vendor
  estimatedPrice: string
  purchaseUrl: string | null
  isPhysical: boolean
  notes: string | null
}
interface CartItem { test: Test; quantity: number }

export default function SubmitProtocolPage() {
  const { user } = useAuth()
  const router = useRouter()

  const [categories, setCategories] = useState<Category[]>([])
  const [tests, setTests] = useState<Test[]>([])
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [schoolSite, setSchoolSite] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [loadingTests, setLoadingTests] = useState(false)

  useEffect(() => {
    fetch('/api/assessments/categories')
      .then(r => r.json())
      .then(d => setCategories(d.categories ?? []))
  }, [])

  useEffect(() => {
    if (!selectedCategory) { setTests([]); return }
    setLoadingTests(true)
    fetch(`/api/assessments/tests?categoryId=${selectedCategory.id}`)
      .then(r => r.json())
      .then(d => setTests(d.tests ?? []))
      .finally(() => setLoadingTests(false))
  }, [selectedCategory])

  if (!user) return null

  if (!hasPermission(user.role, 'assessments:submit')) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-semibold text-red-900 mb-2">Access Denied</h2>
          <p className="text-red-700">You do not have permission to submit protocol orders.</p>
        </div>
      </div>
    )
  }

  const testsByVendor = tests.reduce<Record<string, { vendor: Vendor; tests: Test[] }>>((acc, t) => {
    if (!acc[t.vendorId]) acc[t.vendorId] = { vendor: t.vendor, tests: [] }
    acc[t.vendorId].tests.push(t)
    return acc
  }, {})

  function getCartQty(testId: string) {
    return cart.find(c => c.test.id === testId)?.quantity ?? 0
  }

  function setCartQty(test: Test, qty: number) {
    if (qty <= 0) {
      setCart(prev => prev.filter(c => c.test.id !== test.id))
    } else {
      setCart(prev => {
        const existing = prev.find(c => c.test.id === test.id)
        if (existing) return prev.map(c => c.test.id === test.id ? { ...c, quantity: qty } : c)
        return [...prev, { test, quantity: qty }]
      })
    }
  }

  const totalEstimate = cart.reduce((sum, c) => sum + Number(c.test.estimatedPrice) * c.quantity, 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (cart.length === 0) { setError('Add at least one assessment to your order.'); return }
    if (!schoolSite.trim()) { setError('School/site is required.'); return }

    setSubmitting(true)
    setError('')
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderType: 'PROTOCOL_ASSESSMENT',
          assessmentCategoryId: selectedCategory?.id ?? null,
          schoolSite: schoolSite.trim(),
          items: cart.map(c => ({
            itemName: c.test.name,
            itemLink: c.test.purchaseUrl ?? '',
            estimatedPrice: Number(c.test.estimatedPrice),
            quantity: c.quantity,
            assessmentTestId: c.test.id,
          })),
        }),
      })
      if (response.ok) {
        const result = await response.json()
        router.push(`/dashboard/orders/${result.id}`)
      } else {
        const result = await response.json()
        setError(result.error || 'Failed to submit order')
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 animate-fade-in-up">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-600 to-sky-700 flex items-center justify-center"
            style={{ boxShadow: '0 6px 12px rgba(75, 119, 116, 0.2)' }}
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-warm-gray-900">Order Protocols / Assessments</h1>
            <p className="text-sm text-warm-gray-600">Select a category, then add assessments to your order</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="animate-fade-in-up animation-delay-100">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-4 rounded-xl text-sm mb-6 flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Category Selection */}
        <div className="mb-6">
          <div className="mb-3">
            <h2 className="text-base font-semibold text-warm-gray-900">Step 1: Select Category</h2>
            <p className="text-xs text-warm-gray-600">Choose the role/discipline this order is for</p>
          </div>
          {categories.length === 0 ? (
            <div
              className="bg-white rounded-xl p-4 border border-cream-200"
              style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}
            >
              <p className="text-sm text-warm-gray-400 italic">No categories configured yet. Contact your administrator.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => { setSelectedCategory(cat); setCart([]) }}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    selectedCategory?.id === cat.id
                      ? 'border-sky-500 bg-sky-50 shadow-sm'
                      : 'bg-white border-cream-200 hover:border-sky-300 hover:bg-sky-50/40'
                  }`}
                  style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}
                >
                  <p className="font-semibold text-warm-gray-900 text-sm">{cat.name}</p>
                  {cat.description && <p className="text-xs text-warm-gray-500 mt-1">{cat.description}</p>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Step 2: Browse & Add Tests */}
        {selectedCategory && (
          <div className="mb-6">
            <div className="mb-3">
              <h2 className="text-base font-semibold text-warm-gray-900">Step 2: Add Assessments</h2>
              <p className="text-xs text-warm-gray-600">
                Browse available assessments for <span className="font-medium text-sky-700">{selectedCategory.name}</span>
              </p>
            </div>
            <div
              className="bg-white rounded-xl p-4 border border-cream-200"
              style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}
            >
              {loadingTests ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-cream-200 border-t-sky-500" />
                </div>
              ) : Object.keys(testsByVendor).length === 0 ? (
                <p className="text-sm text-warm-gray-400 italic">No assessments available for this category yet.</p>
              ) : (
                <div className="space-y-5">
                  {Object.values(testsByVendor).map(({ vendor, tests: vTests }) => (
                    <div key={vendor.id}>
                      <h3 className="text-xs font-bold text-warm-gray-500 uppercase tracking-wide mb-2">{vendor.name}</h3>
                      <div className="space-y-2">
                        {vTests.map(test => {
                          const qty = getCartQty(test.id)
                          return (
                            <div
                              key={test.id}
                              className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                                qty > 0 ? 'border-sky-300 bg-sky-50/50' : 'border-cream-200 bg-cream-50/50'
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium text-warm-gray-900">{test.name}</span>
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                                    test.isPhysical ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'
                                  }`}>
                                    {test.isPhysical ? 'Physical' : 'Digital'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 mt-0.5">
                                  <span className="text-xs text-warm-gray-500">${Number(test.estimatedPrice).toFixed(2)} est.</span>
                                  {test.purchaseUrl && (
                                    <a href={test.purchaseUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-600 hover:underline">
                                      View listing ↗
                                    </a>
                                  )}
                                </div>
                                {test.notes && <p className="text-xs text-warm-gray-400 mt-0.5">{test.notes}</p>}
                              </div>
                              <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                                {qty > 0 ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => setCartQty(test, qty - 1)}
                                      className="w-7 h-7 rounded-md bg-white border border-cream-200 flex items-center justify-center text-warm-gray-600 hover:bg-coral-50 hover:border-coral-200 hover:text-coral-600 transition-colors"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                      </svg>
                                    </button>
                                    <span className="w-6 text-center text-sm font-semibold text-warm-gray-900">{qty}</span>
                                    <button
                                      type="button"
                                      onClick={() => setCartQty(test, qty + 1)}
                                      className="w-7 h-7 rounded-md bg-sky-600 flex items-center justify-center text-white hover:bg-sky-700 transition-colors"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                      </svg>
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setCartQty(test, 1)}
                                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 rounded-lg hover:bg-sky-100 transition-colors"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Add
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Order Summary */}
        {cart.length > 0 && (
          <div className="mb-5 bg-gradient-to-br from-sky-50 to-sky-100/50 rounded-xl p-4 border border-sky-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-xs font-semibold text-sky-900">Order Summary</span>
                <p className="text-xs text-sky-700">{cart.length} assessment{cart.length > 1 ? 's' : ''}</p>
              </div>
              <span className="text-2xl font-bold text-sky-700">${totalEstimate.toFixed(2)}</span>
            </div>
            <div className="space-y-1">
              {cart.map(c => (
                <div key={c.test.id} className="flex items-center justify-between text-sm">
                  <span className="text-warm-gray-700 truncate pr-4">
                    {c.test.name} <span className="text-warm-gray-400">×{c.quantity}</span>
                  </span>
                  <span className="font-medium text-warm-gray-900 flex-shrink-0">
                    ${(Number(c.test.estimatedPrice) * c.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Order Details */}
        <div
          className="bg-white rounded-xl p-4 border border-cream-200 mb-5"
          style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}
        >
          <h2 className="text-base font-semibold text-warm-gray-900 mb-3">Order Details</h2>
          <div className="space-y-3">
            <div>
              <label htmlFor="schoolSite" className="block text-xs font-medium text-warm-gray-700 mb-1.5">
                School/Site *
              </label>
              <input
                id="schoolSite"
                type="text"
                value={schoolSite}
                onChange={e => setSchoolSite(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-cream-50 border border-cream-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all text-sm text-warm-gray-900 placeholder-warm-gray-400"
                placeholder="e.g., Lincoln Elementary"
                style={{ outline: 'none' }}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 px-4 py-2.5 bg-cream-100 text-warm-gray-700 rounded-lg text-sm font-medium transition-all hover:bg-cream-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || cart.length === 0}
            className="flex-1 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-sky-600/20 hover:shadow-lg hover:shadow-sky-600/25"
          >
            {submitting ? 'Submitting...' : 'Submit Protocol Order'}
          </button>
        </div>
      </form>
    </div>
  )
}
