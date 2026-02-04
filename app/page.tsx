import Link from 'next/link'
import Image from 'next/image'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="w-full px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-lg px-3 py-2 shadow-sm">
            <Image
              src="/scsos-logo.png"
              alt="Sutter County Superintendent of Schools"
              width={180}
              height={48}
              priority
              className="h-auto w-auto max-w-[180px]"
            />
          </div>
        </div>
        <Link
          href="/auth/login"
          className="text-sm font-medium text-sky-700 hover:text-sky-800 transition-colors"
        >
          Staff Login
        </Link>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="max-w-4xl mx-auto text-center mb-12 animate-fade-in-up">
          <h1 className="text-4xl sm:text-5xl font-bold text-warm-gray-900 mb-4 tracking-tight">
            Special Education<br />
            <span className="text-sky-600">Interim Placement Services</span>
          </h1>
          <p className="text-lg text-warm-gray-600 max-w-2xl mx-auto leading-relaxed">
            Streamlined referral management for Sutter County schools. Submit referrals, 
            track placements, and coordinate services—all in one secure platform.
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl w-full animate-fade-in-up animation-delay-200">
          {/* Submit Referral Card */}
          <Link
            href="/interim-referral-form"
            className="group relative bg-white rounded-2xl p-8 border border-cream-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-sky-100 to-sky-50 rounded-bl-[80px] -z-0 opacity-60 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="w-14 h-14 bg-sky-100 rounded-xl flex items-center justify-center mb-5 group-hover:bg-sky-200 transition-colors">
                <svg className="w-7 h-7 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-warm-gray-900 mb-2">
                Submit a Referral
              </h2>
              <p className="text-warm-gray-600 text-sm leading-relaxed mb-4">
                District staff can submit interim placement referral packets for students requiring special education services.
              </p>
              <span className="inline-flex items-center text-sky-600 font-medium text-sm group-hover:gap-2 transition-all">
                Start Referral
                <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          </Link>

          {/* SCSOS Staff Login Card */}
          <Link
            href="/auth/login"
            className="group relative bg-white rounded-2xl p-8 border border-cream-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-sage-100 to-sage-50 rounded-bl-[80px] -z-0 opacity-60 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="w-14 h-14 bg-sage-100 rounded-xl flex items-center justify-center mb-5 group-hover:bg-sage-200 transition-colors">
                <svg className="w-7 h-7 text-sage-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-warm-gray-900 mb-2">
                SCSOS Staff Portal
              </h2>
              <p className="text-warm-gray-600 text-sm leading-relaxed mb-4">
                County Office staff can sign in to manage referrals, track placements, and coordinate services.
              </p>
              <span className="inline-flex items-center text-sage-600 font-medium text-sm group-hover:gap-2 transition-all">
                Sign In
                <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          </Link>
        </div>

        {/* Info Section */}
        <div className="mt-16 max-w-2xl text-center animate-fade-in-up animation-delay-300">
          <div className="inline-flex items-center gap-2 bg-cream-100 text-warm-gray-700 px-4 py-2 rounded-full text-sm mb-6">
            <svg className="w-4 h-4 text-sky-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Secure & FERPA Compliant
          </div>
          <h3 className="text-lg font-semibold text-warm-gray-900 mb-3">
            About SPEDEX
          </h3>
          <p className="text-warm-gray-600 text-sm leading-relaxed">
            SPEDEX (Special Education Exchange) is the Sutter County Superintendent of Schools' 
            digital platform for managing interim special education placements. We help districts 
            submit referrals efficiently while ensuring compliance with state and federal requirements.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full px-6 py-6 border-t border-cream-200">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-warm-gray-600">
          <p>© {new Date().getFullYear()} Sutter County Superintendent of Schools</p>
          <div className="flex items-center gap-6">
            <a href="https://sutter.k12.ca.us" target="_blank" rel="noopener noreferrer" className="hover:text-sky-600 transition-colors">
              SCSOS Website
            </a>
            <Link href="/auth/login" className="hover:text-sky-600 transition-colors">
              Staff Login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
