import Link from 'next/link'
import Image from 'next/image'

const forms = [
  {
    href: '/interim-referral-form',
    title: 'Interim Referral Packet',
    description:
      'Submit an interim special education referral for a student requiring immediate placement consideration.',
    icon: (
      <svg className="w-7 h-7 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    iconBg: 'bg-sky-100 group-hover:bg-sky-200',
    accent: 'from-sky-100 to-sky-50',
    cta: 'text-sky-600',
    border: 'border-cream-200',
  },
  {
    href: '/dhh-itinerant-referral-form',
    title: 'DHH Itinerant Referral Packet',
    description:
      'Refer a student who is Deaf or Hard of Hearing for itinerant specialist services and support.',
    icon: (
      <svg className="w-7 h-7 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6a7 7 0 010 12M8.464 8.464a5 5 0 000 7.072" />
      </svg>
    ),
    iconBg: 'bg-violet-100 group-hover:bg-violet-200',
    accent: 'from-violet-100 to-violet-50',
    cta: 'text-violet-600',
    border: 'border-cream-200',
  },
  {
    href: '/level-ii-referral-form',
    title: 'Level II Referral Packet',
    description:
      'Submit a Level II referral for students requiring more intensive evaluation or specialized program placement.',
    icon: (
      <svg className="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    iconBg: 'bg-amber-100 group-hover:bg-amber-200',
    accent: 'from-amber-100 to-amber-50',
    cta: 'text-amber-600',
    border: 'border-cream-200',
  },
]

export default function SelectFormPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="w-full px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
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
        </Link>
        <Link
          href="/auth/login"
          className="text-sm font-medium text-sky-700 hover:text-sky-800 transition-colors"
        >
          Staff Login
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="max-w-4xl mx-auto w-full">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-warm-gray-500 hover:text-sky-600 transition-colors mb-8"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>

          <div className="text-center mb-10">
            <h1 className="text-3xl sm:text-4xl font-bold text-warm-gray-900 mb-3 tracking-tight">
              Select a Referral Form
            </h1>
            <p className="text-warm-gray-600 max-w-xl mx-auto leading-relaxed">
              Choose the referral packet that corresponds to the services your student requires.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {forms.map((form) => (
              <Link
                key={form.href}
                href={form.href}
                className="group relative bg-white rounded-2xl p-8 border border-cream-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden flex flex-col"
              >
                <div className={`absolute top-0 right-0 w-28 h-28 bg-gradient-to-br ${form.accent} rounded-bl-[72px] -z-0 opacity-60 group-hover:opacity-100 transition-opacity`} />
                <div className="relative z-10 flex flex-col flex-1">
                  <div className={`w-14 h-14 ${form.iconBg} rounded-xl flex items-center justify-center mb-5 transition-colors`}>
                    {form.icon}
                  </div>
                  <h2 className="text-lg font-semibold text-warm-gray-900 mb-2 leading-snug">
                    {form.title}
                  </h2>
                  <p className="text-warm-gray-600 text-sm leading-relaxed mb-5 flex-1">
                    {form.description}
                  </p>
                  <span className={`inline-flex items-center ${form.cta} font-medium text-sm group-hover:gap-2 transition-all`}>
                    Start Form
                    <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>

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
