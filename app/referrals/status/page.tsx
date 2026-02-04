'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import StatusBadge from '@/app/dashboard/referrals/components/status-badge'

function StatusLookupContent() {
  const searchParams = useSearchParams()
  const initialConfirmation = searchParams.get('confirmation') || ''

  const [confirmationNumber, setConfirmationNumber] = useState(initialConfirmation)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [referral, setReferral] = useState<any>(null)

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setReferral(null)
    setLoading(true)

    try {
      const response = await fetch(`/api/referrals/lookup?confirmation=${encodeURIComponent(confirmationNumber)}`)

      if (response.ok) {
        const data = await response.json()
        setReferral(data.referral)
      } else {
        const data = await response.json()
        setError(data.error || 'Referral not found')
      }
    } catch (err) {
      setError('Failed to lookup referral. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-block mb-6">
            <div className="bg-white rounded-2xl p-6 shadow-xl">
              <Image
                src="/scsos-logo.png"
                alt="Sutter County Superintendent of Schools"
                width={300}
                height={80}
                priority
                className="h-auto w-auto max-w-[300px]"
              />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Check Referral Status</h1>
          <p className="text-gray-600">
            Enter your confirmation number to view your referral status
          </p>
        </div>

        {/* Lookup form */}
        <div className="bg-white rounded-xl shadow-xl p-8 mb-6">
          <form onSubmit={handleLookup} className="space-y-4">
            <div>
              <label htmlFor="confirmation" className="block text-sm font-medium text-gray-700 mb-2">
                Confirmation Number
              </label>
              <input
                id="confirmation"
                type="text"
                value={confirmationNumber}
                onChange={(e) => setConfirmationNumber(e.target.value)}
                placeholder="REF-2026-01-23-123"
                required
                className="w-full rounded-xl border border-cream-200/80 bg-white/70 px-3 py-3 text-lg text-warm-gray-800 shadow-sm transition focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-200/70 focus-visible:outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Format: REF-YYYY-MM-DD-XXX (e.g., REF-2026-01-23-123)
              </p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !confirmationNumber}
              className="w-full bg-sky-600 text-white py-3 rounded-xl font-medium hover:bg-sky-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Looking up...' : 'Check Status'}
            </button>
          </form>
        </div>

        {/* Results */}
        {referral && (
          <div className="bg-white rounded-xl shadow-xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Referral Status</h2>
              <StatusBadge status={referral.status} className="text-base px-4 py-2" />
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Student Name</p>
                <p className="text-lg font-semibold text-gray-900">{referral.studentName}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Grade</p>
                  <p className="text-gray-900 font-medium">{referral.grade}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Placement Type</p>
                  <p className="text-gray-900 font-medium">{referral.placementType}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500">Submitted On</p>
                <p className="text-gray-900 font-medium">
                  {new Date(referral.submittedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Review Deadline</p>
                <p className="text-gray-900 font-medium">
                  {new Date(referral.deadlineDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>

              {referral.status === 'REJECTED' && referral.rejectionReason && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mt-4">
                  <p className="font-semibold text-red-900 mb-2">Action Required</p>
                  <p className="text-red-800">{referral.rejectionReason}</p>
                  {referral.missingItems && referral.missingItems.length > 0 && (
                    <div className="mt-3">
                      <p className="font-medium text-red-900 mb-1">Missing Items:</p>
                      <ul className="list-disc list-inside text-red-800 text-sm space-y-1">
                        {referral.missingItems.map((item: string, index: number) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {referral.status === 'APPROVED' && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mt-4">
                  <p className="text-green-800">
                    Your referral has been approved. You will be contacted by the SPED team regarding next steps.
                  </p>
                </div>
              )}

              {referral.status === 'UNDER_REVIEW' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mt-4">
                  <p className="text-yellow-800">
                    Your referral is currently under review. We will notify you of any updates.
                  </p>
                </div>
              )}

              {referral.lastReviewedAt && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-500">Last Updated</p>
                  <p className="text-gray-900">
                    {new Date(referral.lastReviewedAt).toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Help text */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            If you have questions about your referral, please contact:
          </p>
          <p className="mt-2">
            <strong>Sutter County Superintendent of Schools</strong><br />
            Phone: (530) 822-2909<br />
            Email: janinef@sutter.k12.ca.us
          </p>
        </div>
      </div>
    </div>
  )
}

export default function StatusLookupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <StatusLookupContent />
    </Suspense>
  )
}
