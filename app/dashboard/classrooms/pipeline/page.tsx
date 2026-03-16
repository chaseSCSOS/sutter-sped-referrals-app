import Link from 'next/link'

const PIPELINE_SECTIONS = [
  {
    href: '/dashboard/classrooms/pipeline/rtd',
    title: 'RTD Checklist',
    description: 'Track the 8-step Return to District process for students exiting the program.',
    color: 'border-t-orange-500',
    badge: 'bg-orange-100 text-orange-700',
    label: 'RTD',
  },
  {
    href: '/dashboard/classrooms/pipeline/atp-ageout',
    title: 'ATP Age-Outs',
    description: 'Monitor students in the ATP program approaching their 22nd birthday age-out date.',
    color: 'border-t-purple-500',
    badge: 'bg-purple-100 text-purple-700',
    label: 'ATP',
  },
]

export default function PipelinePage() {
  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-warm-gray-500 mb-1">
          Classrooms / Transition Pipeline
        </p>
        <h1 className="text-2xl font-semibold text-warm-gray-900">Transition Pipeline</h1>
        <p className="text-sm text-warm-gray-600 mt-0.5">
          Manage students in active transition processes — RTD exits, age-outs, and program changes.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PIPELINE_SECTIONS.map((section) => (
          <Link key={section.href} href={section.href} className="block group">
            <div
              className={`bg-white rounded-xl border border-gray-200 border-t-4 ${section.color} shadow-sm p-5 transition-shadow group-hover:shadow-md`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${section.badge}`}
                >
                  {section.label}
                </span>
                <h2 className="text-base font-semibold text-warm-gray-900">{section.title}</h2>
              </div>
              <p className="text-sm text-warm-gray-600">{section.description}</p>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <span className="text-xs text-sky-600 group-hover:text-sky-800 font-medium">
                  Open {section.title} →
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
