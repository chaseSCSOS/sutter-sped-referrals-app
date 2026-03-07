'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      })

      if (error) {
        setError(error.message)
      } else {
        setSent(true)
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/">
            <div className="bg-white rounded-lg px-4 py-3 shadow-sm">
              <Image
                src="/scsos-logo.png"
                alt="Sutter County Superintendent of Schools"
                width={200}
                height={53}
                priority
                className="h-auto w-auto max-w-[200px]"
              />
            </div>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-cream-200 p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-sage-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-sage-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-warm-gray-900 mb-2">Check Your Email</h1>
              <p className="text-sm text-warm-gray-600 mb-6">
                We&apos;ve sent a password reset link to <strong className="text-warm-gray-800">{email}</strong>. 
                Please check your inbox and follow the instructions to reset your password.
              </p>
              <p className="text-xs text-warm-gray-500 mb-6">
                Didn&apos;t receive the email? Check your spam folder or try again.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setSent(false)}
                  className="w-full bg-white text-warm-gray-700 px-4 py-3 rounded-xl font-medium border border-cream-200 hover:bg-cream-50 transition-colors text-sm"
                >
                  Try a Different Email
                </button>
                <Link
                  href="/auth/login"
                  className="text-sm text-sky-600 hover:text-sky-700 font-medium text-center"
                >
                  ← Back to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h1 className="text-xl font-bold text-warm-gray-900 mb-2">Reset Your Password</h1>
                <p className="text-sm text-warm-gray-600">
                  Enter your email address and we&apos;ll send you a link to reset your password.
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-warm-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-cream-200 bg-white px-4 py-3 text-sm text-warm-gray-800 shadow-sm transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200/70 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full bg-sky-600 text-white px-4 py-3 rounded-xl font-medium hover:bg-sky-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  href="/auth/login"
                  className="text-sm text-sky-600 hover:text-sky-700 font-medium"
                >
                  ← Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-warm-gray-500 mt-6">
          Need help? Contact the SCSOS office for assistance.
        </p>
      </div>
    </div>
  )
}
