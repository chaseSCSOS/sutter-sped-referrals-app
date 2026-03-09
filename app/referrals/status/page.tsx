'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import StatusBadge from '@/app/dashboard/referrals/components/status-badge'

function StatusLookupContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialConfirmation = searchParams.get('confirmation') || ''

  const [mode, setMode] = useState<'status' | 'resume'>('status')

  // Status lookup state
  const [confirmationNumber, setConfirmationNumber] = useState(initialConfirmation)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [referral, setReferral] = useState<any>(null)

  // Resume draft state
  const [draftEmail, setDraftEmail] = useState('')
  const [draftNumber, setDraftNumber] = useState('')
  const [resumeLoading, setResumeLoading] = useState(false)
  const [resumeError, setResumeError] = useState('')

  async function handleResumeDraft(e: React.FormEvent) {
    e.preventDefault()
    setResumeError('')
    setResumeLoading(true)

    try {
      const response = await fetch(
        `/api/referrals/draft?email=${encodeURIComponent(draftEmail)}&draftNumber=${encodeURIComponent(draftNumber)}`
      )
      const data = await response.json()

      if (!response.ok) {
        setResumeError(data.error || 'Draft not found. Please check your details and try again.')
        return
      }

      // Store in sessionStorage and redirect to the correct form
      sessionStorage.setItem(
        'pendingDraft',
        JSON.stringify({
          formType: data.formType,
          formData: data.formData,
          draftNumber: data.draftNumber,
          email: draftEmail,
        })
      )
      router.push(data.formUrl)
    } catch {
      setResumeError('Failed to load draft. Please try again.')
    } finally {
      setResumeLoading(false)
    }
  }

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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Referral Lookup</h1>
          <p className="text-gray-600">
            Check your referral status or resume a saved draft
          </p>
        </div>

        {/* Mode tabs */}
        <div className="flex rounded-xl bg-white shadow-md overflow-hidden mb-6">
          <button
            type="button"
            onClick={() => { setMode('status'); setError(''); setReferral(null); }}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              mode === 'status'
                ? 'bg-sky-600 text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Check Referral Status
          </button>
          <button
            type="button"
            onClick={() => { setMode('resume'); setResumeError(''); }}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              mode === 'resume'
                ? 'bg-sky-600 text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Resume a Draft
          </button>
        </div>

        {mode === 'status' ? (
        /* Status lookup form */
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
        ) : (
        /* Resume draft form */
        <div className="bg-white rounded-xl shadow-xl p-8 mb-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Resume a Saved Draft</p>
              <p className="text-sm text-gray-500">Enter the email and draft number from your saved draft email</p>
            </div>
          </div>
          <form onSubmit={handleResumeDraft} className="space-y-4">
            <div>
              <label htmlFor="draft-email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="draft-email"
                type="email"
                required
                value={draftEmail}
                onChange={(e) => setDraftEmail(e.target.value)}
                placeholder="you@district.edu"
                className="w-full rounded-xl border border-cream-200/80 bg-white/70 px-3 py-3 text-warm-gray-800 shadow-sm transition focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-200/70 focus-visible:outline-none"
              />
            </div>
            <div>
              <label htmlFor="draft-number" className="block text-sm font-medium text-gray-700 mb-2">
                Draft Number
              </label>
              <input
                id="draft-number"
                type="text"
                required
                value={draftNumber}
                onChange={(e) => setDraftNumber(e.target.value)}
                placeholder="DFT-20260309-ABCD"
                className="w-full rounded-xl border border-cream-200/80 bg-white/70 px-3 py-3 text-warm-gray-800 shadow-sm transition focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-200/70 focus-visible:outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Found in the draft confirmation email we sent you
              </p>
            </div>

            {resumeError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm">
                {resumeError}
              </div>
            )}

            <button
              type="submit"
              disabled={resumeLoading || !draftEmail || !draftNumber}
              className="w-full bg-sky-600 text-white py-3 rounded-xl font-medium hover:bg-sky-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {resumeLoading ? 'Loading draft...' : 'Resume Draft'}
            </button>
          </form>
        </div>
        )}

        {/* Results */}
        {mode === 'status' && referral && (
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
