'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { orderSchema, type OrderFormData } from '@/lib/validation/order'
import { useAuth } from '@/lib/auth/hooks'
import { hasPermission } from '@/lib/auth/permissions'

export default function SubmitOrderPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    watch,
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      items: [
        {
          itemName: '',
          itemLink: '',
          estimatedPrice: 0,
          quantity: 1,
        },
      ],
      schoolSite: '',
      justification: '',
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  })

  if (!user) return null

  if (!hasPermission(user.role, 'orders:submit')) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-red-900 mb-2">Access Denied</h2>
          <p className="text-red-700">You do not have permission to submit orders.</p>
        </div>
      </div>
    )
  }

  const onSubmit = async (data: OrderFormData) => {
    setError('')
    setSubmitting(true)

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        const result = await response.json()
        router.push(`/dashboard/orders/${result.id}`)
      } else {
        const result = await response.json()
        setError(result.error || 'Failed to submit order')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  const items = watch('items')
  const totalEstimate = items.reduce(
    (sum, item) => sum + (Number(item.estimatedPrice) || 0) * (Number(item.quantity) || 1),
    0
  )

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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-warm-gray-900">Submit Order Request</h1>
            <p className="text-sm text-warm-gray-600">Request materials or equipment for your classroom</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="animate-fade-in-up animation-delay-100">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-4 rounded-xl text-sm mb-6 flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Items Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-semibold text-warm-gray-900">Order Items</h2>
              <p className="text-xs text-warm-gray-600">Add one or more products to your order</p>
            </div>
            <button
              type="button"
              onClick={() =>
                append({
                  itemName: '',
                  itemLink: '',
                  estimatedPrice: 0,
                  quantity: 1,
                })
              }
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 rounded-lg hover:bg-sky-100 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Item
            </button>
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="bg-white rounded-xl p-4 border border-cream-200 animate-fade-in"
                style={{ boxShadow: '0 1px 6px rgba(0, 0, 0, 0.04)' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-md bg-sky-100 text-sky-700 flex items-center justify-center text-xs font-semibold">
                      {index + 1}
                    </div>
                    <h3 className="text-sm font-medium text-warm-gray-900">Item {index + 1}</h3>
                  </div>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="text-coral-600 hover:text-coral-700 p-1 rounded-md hover:bg-coral-50 transition-colors"
                      aria-label="Remove item"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {/* Item Name */}
                  <div>
                    <label htmlFor={`items.${index}.itemName`} className="block text-xs font-medium text-warm-gray-700 mb-1.5">
                      Item Name *
                    </label>
                    <input
                      id={`items.${index}.itemName`}
                      type="text"
                      {...register(`items.${index}.itemName`)}
                      className="w-full px-3.5 py-2.5 bg-cream-50 border border-cream-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all text-sm text-warm-gray-900 placeholder-warm-gray-400"
                      placeholder="e.g., Noise-canceling headphones"
                      style={{ outline: 'none' }}
                    />
                    {errors.items?.[index]?.itemName && (
                      <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.items[index]?.itemName?.message}
                      </p>
                    )}
                  </div>

                  {/* Product Link */}
                  <div>
                    <label htmlFor={`items.${index}.itemLink`} className="block text-xs font-medium text-warm-gray-700 mb-1.5">
                      Product Link <span className="text-warm-gray-500 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-4 w-4 text-warm-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </div>
                      <input
                        id={`items.${index}.itemLink`}
                        type="url"
                        {...register(`items.${index}.itemLink`)}
                        className="w-full pl-9 pr-3.5 py-2.5 bg-cream-50 border border-cream-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all text-sm text-warm-gray-900 placeholder-warm-gray-400"
                        placeholder="https://amazon.com/..."
                        style={{ outline: 'none' }}
                      />
                    </div>
                    {errors.items?.[index]?.itemLink && (
                      <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.items[index]?.itemLink?.message}
                      </p>
                    )}
                  </div>

                  {/* Price and Quantity Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor={`items.${index}.estimatedPrice`} className="block text-xs font-medium text-warm-gray-700 mb-1.5">
                        Estimated Price * ($)
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-warm-gray-500 text-base">$</span>
                        </div>
                        <input
                          id={`items.${index}.estimatedPrice`}
                          type="number"
                          step="0.01"
                          min="0.01"
                          {...register(`items.${index}.estimatedPrice`, { valueAsNumber: true })}
                          className="w-full pl-7 pr-3.5 py-2.5 bg-cream-50 border border-cream-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all text-sm text-warm-gray-900 placeholder-warm-gray-400"
                          placeholder="29.99"
                          style={{ outline: 'none' }}
                        />
                      </div>
                      {errors.items?.[index]?.estimatedPrice && (
                        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {errors.items[index]?.estimatedPrice?.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor={`items.${index}.quantity`} className="block text-xs font-medium text-warm-gray-700 mb-1.5">
                        Quantity *
                      </label>
                      <input
                        id={`items.${index}.quantity`}
                        type="number"
                        min="1"
                        {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                        className="w-full px-3.5 py-2.5 bg-cream-50 border border-cream-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all text-sm text-warm-gray-900 placeholder-warm-gray-400"
                        style={{ outline: 'none' }}
                      />
                      {errors.items?.[index]?.quantity && (
                        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {errors.items[index]?.quantity?.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Item subtotal */}
                  {items[index] && items[index].estimatedPrice > 0 && (
                    <div className="bg-cream-100 rounded-md px-3 py-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-warm-gray-700">Item Subtotal</span>
                      <span className="text-base font-semibold text-warm-gray-900">
                        ${((items[index].estimatedPrice || 0) * (items[index].quantity || 1)).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {errors.items?.root && (
            <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {errors.items.root.message}
            </p>
          )}
        </div>

        {/* Total Estimate Display */}
        {totalEstimate > 0 && (
          <div className="mb-5 bg-gradient-to-br from-sky-50 to-sky-100/50 rounded-xl p-4 border border-sky-200">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-sky-900">Order Total Estimate</span>
                <p className="text-xs text-sky-700">{fields.length} item{fields.length > 1 ? 's' : ''}</p>
              </div>
              <span className="text-2xl font-bold text-sky-700">${totalEstimate.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Order Details Card */}
        <div
          className="bg-white rounded-xl p-4 border border-cream-200 mb-5"
          style={{ boxShadow: '0 1px 6px rgba(0, 0, 0, 0.04)' }}
        >
          <h2 className="text-base font-semibold text-warm-gray-900 mb-3">Order Details</h2>

          <div className="space-y-3">
            {/* School Site */}
            <div>
              <label htmlFor="schoolSite" className="block text-xs font-medium text-warm-gray-700 mb-1.5">
                School/Site *
              </label>
              <input
                id="schoolSite"
                type="text"
                {...register('schoolSite')}
                className="w-full px-3.5 py-2.5 bg-cream-50 border border-cream-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all text-sm text-warm-gray-900 placeholder-warm-gray-400"
                placeholder="e.g., Lincoln Elementary"
                style={{ outline: 'none' }}
              />
              {errors.schoolSite && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.schoolSite.message}
                </p>
              )}
            </div>

            {/* Justification */}
            <div>
              <label htmlFor="justification" className="block text-xs font-medium text-warm-gray-700 mb-1.5">
                Educational Justification *
              </label>
              <textarea
                id="justification"
                {...register('justification')}
                rows={5}
                className="w-full px-3.5 py-2.5 bg-cream-50 border border-cream-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all text-sm text-warm-gray-900 placeholder-warm-gray-400 resize-none"
                placeholder="Explain why these items are needed for student education. Include how they will be used, which students will benefit, and any relevant IEP goals or accommodations."
                style={{ outline: 'none' }}
              />
              <p className="mt-2 text-xs text-warm-gray-500">
                Minimum 20 characters. Be specific about educational need and student benefit.
              </p>
              {errors.justification && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.justification.message}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
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
            disabled={submitting}
            className="flex-1 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-sky-600/20 hover:shadow-lg hover:shadow-sky-600/25"
          >
            {submitting ? 'Submitting...' : 'Submit Order Request'}
          </button>
        </div>
      </form>
    </div>
  )
}
