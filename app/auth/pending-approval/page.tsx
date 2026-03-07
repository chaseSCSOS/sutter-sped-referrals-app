import Link from 'next/link'
import Image from 'next/image'

export default function PendingApprovalPage() {
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
        <div className="bg-white rounded-2xl shadow-lg border border-cream-200 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h1 className="text-xl font-bold text-warm-gray-900 mb-2">
            Account Pending Approval
          </h1>
          <p className="text-sm text-warm-gray-600 mb-6 leading-relaxed">
            Your account has been created but is awaiting approval from a SCSOS administrator. 
            You&apos;ll be able to access the platform once your account has been activated.
          </p>

          <div className="bg-cream-50 rounded-xl p-4 mb-6">
            <p className="text-xs text-warm-gray-500 mb-1 font-semibold uppercase tracking-wide">
              What happens next?
            </p>
            <p className="text-sm text-warm-gray-700">
              An administrator will review and activate your account, typically within 1–2 business days. 
              You&apos;ll receive an email notification once approved.
            </p>
          </div>

          <div className="space-y-3">
            <Link
              href="/auth/login"
              className="block w-full bg-sky-600 text-white px-4 py-3 rounded-xl font-medium hover:bg-sky-700 transition-colors text-sm"
            >
              Back to Sign In
            </Link>
            <a
              href="mailto:sped@sutter.k12.ca.us"
              className="block w-full bg-white text-warm-gray-700 px-4 py-3 rounded-xl font-medium border border-cream-200 hover:bg-cream-50 transition-colors text-sm"
            >
              Contact Support
            </a>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-warm-gray-500 mt-6">
          Questions? Email{' '}
          <a href="mailto:sped@sutter.k12.ca.us" className="text-sky-600 hover:text-sky-700">
            sped@sutter.k12.ca.us
          </a>{' '}
          or call (530) 822-2900
        </p>
      </div>
    </div>
  )
}
