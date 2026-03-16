'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { splitStudentName } from '@/lib/utils/placement-helpers'
import { SCHOOL_YEARS, getCurrentSchoolYear } from '@/lib/school-year'
import { DISTRICTS } from '@/lib/constants/districts'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Site {
  id: string
  name: string
  isActive: boolean
}

interface Classroom {
  id: string
  programSilo: string
  gradeStart: string
  gradeEnd: string
  sessionType: string | null
  teacher: { id: string; name: string } | null
  _count: { studentPlacements: number }
}

interface PlacementInfo {
  id: string
  enrollmentStatus: string
  classroom: {
    site: { name: string }
    teacher: { name: string } | null
  }
}

interface AssignToClassroomProps {
  referral: {
    id: string
    studentName: string
    dateOfBirth: string
    grade: string
    primaryDisability?: string | null
    districtOfResidence?: string | null
    disabilities?: Record<string, string> | null
    silo?: string | null
    status: string
    placement?: PlacementInfo | null
  }
}

// ---------------------------------------------------------------------------
// Silo mapping: Referral.silo → ProgramSilo
// ---------------------------------------------------------------------------

const PROGRAM_SILO_OPTIONS = [
  { value: 'ASD_ELEM', label: 'ASD-Elem' },
  { value: 'ASD_MIDHS', label: 'ASD-MidHS' },
  { value: 'SD', label: 'SD' },
  { value: 'NC', label: 'NC' },
  { value: 'DHH', label: 'DHH' },
  { value: 'ATP', label: 'ATP' },
  { value: 'MD', label: 'MD' },
]

function mapSiloToProgramSilo(silo: string | null | undefined, grade: string): string {
  if (!silo) return ''
  if (silo === 'ASD') {
    const gradeNum = parseInt(grade, 10)
    if (!isNaN(gradeNum) && gradeNum >= 6) return 'ASD_MIDHS'
    return 'ASD_ELEM'
  }
  // SD, NC, DHH, MD map directly; OT has no ProgramSilo equivalent
  if (['SD', 'NC', 'DHH', 'MD'].includes(silo)) return silo
  return ''
}

// ---------------------------------------------------------------------------
// Enrollment status badge colours
// ---------------------------------------------------------------------------

const STATUS_CLASSES: Record<string, string> = {
  ACTIVE: 'bg-sage-50 text-sage-700 border-sage-200',
  REFERRAL_PENDING: 'bg-cream-100 text-warm-gray-700 border-cream-200',
  REFERRAL_NOT_RECEIVED: 'bg-coral-50 text-coral-600 border-coral-100',
  REFERRAL_ON_HOLD: 'bg-amber-50 text-amber-700 border-amber-200',
  PLACED_NOT_IN_SYSTEMS: 'bg-sky-50 text-sky-700 border-sky-200',
  HOME_INSTRUCTION: 'bg-purple-50 text-purple-700 border-purple-200',
  RTD_IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200',
  EXITED: 'bg-warm-gray-100 text-warm-gray-500 border-warm-gray-200',
}

function statusLabel(s: string): string {
  return s.replace(/_/g, ' ')
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitialSchoolYear(): string {
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/(?:^|;\s*)spedex-school-year=([^;]+)/)
    if (match) return decodeURIComponent(match[1])
  }
  return getCurrentSchoolYear()
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AssignToClassroom({ referral }: AssignToClassroomProps) {
  const router = useRouter()

  // ── Only show to operational staff; external orgs never see this ──────────
  // The page already guards canWriteOperational; this component is only rendered
  // inside that guard, so no extra permission check needed here.

  const [open, setOpen] = useState(false)

  // Form state
  const nameParts = splitStudentName(referral.studentName)
  const [schoolYear, setSchoolYear] = useState(getInitialSchoolYear)
  const [programSilo, setProgramSilo] = useState(() =>
    mapSiloToProgramSilo(referral.silo, referral.grade)
  )
  const [siteId, setSiteId] = useState('')
  const [classroomId, setClassroomId] = useState('')
  const [firstName, setFirstName] = useState(nameParts.first)
  const [lastName, setLastName] = useState(nameParts.last)
  const [dateOfBirth, setDateOfBirth] = useState(() => {
    if (!referral.dateOfBirth) return ''
    return new Date(referral.dateOfBirth).toISOString().split('T')[0]
  })
  const [grade, setGrade] = useState(referral.grade || '')
  const [primaryDisability, setPrimaryDisability] = useState(referral.primaryDisability || '')
  const [districtOfResidence, setDistrictOfResidence] = useState(referral.districtOfResidence || '')
  const [requires1to1, setRequires1to1] = useState(false)

  // Async data
  const [sites, setSites] = useState<Site[]>([])
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [loadingSites, setLoadingSites] = useState(false)
  const [loadingClassrooms, setLoadingClassrooms] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Fetch sites when dialog opens
  useEffect(() => {
    if (!open) return
    setLoadingSites(true)
    fetch('/api/sites')
      .then((r) => r.json())
      .then((data) => setSites((data.sites || []).filter((s: Site) => s.isActive)))
      .catch(() => toast.error('Failed to load sites'))
      .finally(() => setLoadingSites(false))
  }, [open])

  // Fetch classrooms whenever silo + site + year are all set
  useEffect(() => {
    if (!open || !programSilo || !siteId || !schoolYear) {
      setClassrooms([])
      setClassroomId('')
      return
    }
    setLoadingClassrooms(true)
    const params = new URLSearchParams({ schoolYear, programSilo, siteId })
    fetch(`/api/classrooms?${params}`)
      .then((r) => r.json())
      .then((data) => setClassrooms(data.classrooms || []))
      .catch(() => toast.error('Failed to load classrooms'))
      .finally(() => setLoadingClassrooms(false))
  }, [open, programSilo, siteId, schoolYear])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      // Build disabilityCodes array from the disabilities JSON object
      const rawDisabilities = referral.disabilities as Record<string, string> | null | undefined
      const disabilityCodes = rawDisabilities
        ? Object.entries(rawDisabilities)
            .filter(([, v]) => v && v !== 'None')
            .map(([code]) => code)
        : []

      const payload = {
        referralId: referral.id,
        classroomId: classroomId || null,
        studentNameFirst: firstName,
        studentNameLast: lastName,
        dateOfBirth: new Date(dateOfBirth).toISOString(),
        grade,
        districtOfResidence: districtOfResidence || undefined,
        disabilityCodes,
        primaryDisability: primaryDisability || undefined,
        schoolYear,
        requires1to1,
      }

      const res = await fetch('/api/placements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || 'Failed to place student')
        return
      }

      toast.success('Student placed successfully')
      setOpen(false)
      router.refresh()
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Already placed ────────────────────────────────────────────────────────
  if (referral.placement) {
    const p = referral.placement
    const teacherName = p.classroom.teacher?.name ?? 'Unknown Teacher'
    const siteName = p.classroom.site.name
    const statusClass = STATUS_CLASSES[p.enrollmentStatus] ?? 'bg-cream-100 text-warm-gray-700 border-cream-200'

    return (
      <section className="bg-white rounded-2xl shadow-sm border border-cream-200 overflow-hidden">
        <div className="px-6 pt-6 pb-2">
          <h2 className="text-sm font-semibold text-warm-gray-900 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-sage-500 rounded-full inline-block"></span>
            Classroom Placement
          </h2>
        </div>
        <div className="px-6 pb-6">
          <div className="mt-3 flex flex-col gap-3">
            <div className="bg-sage-50 border border-sage-200 rounded-xl px-4 py-3 text-sm">
              <p className="text-warm-gray-800 font-medium">
                {teacherName}{' '}
                <span className="text-warm-gray-500 font-normal">at</span>{' '}
                {siteName}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold">Status</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusClass}`}>
                  {statusLabel(p.enrollmentStatus)}
                </span>
              </div>
            </div>
            <a
              href={`/dashboard/classrooms/students/${p.id}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-700 hover:text-sky-800 transition-colors"
            >
              View Student Record
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </section>
    )
  }

  // ── Not yet placed — only show button if status is ACCEPTED_AWAITING_PLACEMENT ──
  if (referral.status !== 'ACCEPTED_AWAITING_PLACEMENT') {
    return null
  }

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-cream-200 overflow-hidden">
      <div className="px-6 pt-6 pb-2">
        <h2 className="text-sm font-semibold text-warm-gray-900 flex items-center gap-2">
          <span className="w-1.5 h-4 bg-sage-500 rounded-full inline-block"></span>
          Classroom Placement
        </h2>
      </div>
      <div className="px-6 pb-6">
        <p className="text-sm text-warm-gray-500 mt-2 mb-4">
          This referral is accepted and awaiting classroom placement.
        </p>
        <button
          onClick={() => setOpen(true)}
          className="w-full py-2.5 rounded-xl border-2 border-dashed border-sky-300 text-sm font-semibold text-sky-700 hover:bg-sky-50 hover:border-sky-400 transition-colors"
        >
          + Place Student
        </button>
      </div>

      {/* ── Dialog ────────────────────────────────────────────────────────── */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-cream-200">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-cream-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-base font-semibold text-warm-gray-900">Place Student in Classroom</h3>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-warm-gray-400 hover:text-warm-gray-700 hover:bg-cream-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

              {/* ── School Year + Program Silo ─────────────────────────── */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-1.5">
                    School Year <span className="text-coral-500">*</span>
                  </label>
                  <select
                    required
                    value={schoolYear}
                    onChange={(e) => setSchoolYear(e.target.value)}
                    className="w-full rounded-xl border border-cream-200 bg-white px-3 py-2 text-sm text-warm-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-500"
                  >
                    {SCHOOL_YEARS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-1.5">
                    Program / Silo <span className="text-coral-500">*</span>
                  </label>
                  <select
                    required
                    value={programSilo}
                    onChange={(e) => { setProgramSilo(e.target.value); setClassroomId('') }}
                    className="w-full rounded-xl border border-cream-200 bg-white px-3 py-2 text-sm text-warm-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-500"
                  >
                    <option value="">— Select program —</option>
                    {PROGRAM_SILO_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ── Campus / Site ──────────────────────────────────────── */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-1.5">
                  Campus / Site <span className="text-coral-500">*</span>
                </label>
                {loadingSites ? (
                  <div className="h-9 bg-cream-100 rounded-xl animate-pulse" />
                ) : (
                  <select
                    required
                    value={siteId}
                    onChange={(e) => { setSiteId(e.target.value); setClassroomId('') }}
                    className="w-full rounded-xl border border-cream-200 bg-white px-3 py-2 text-sm text-warm-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-500"
                  >
                    <option value="">— Select campus —</option>
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* ── Classroom ─────────────────────────────────────────── */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-1.5">
                  Classroom
                </label>
                {loadingClassrooms ? (
                  <div className="h-9 bg-cream-100 rounded-xl animate-pulse" />
                ) : (
                  <select
                    value={classroomId}
                    onChange={(e) => setClassroomId(e.target.value)}
                    disabled={!programSilo || !siteId || !schoolYear}
                    className="w-full rounded-xl border border-cream-200 bg-white px-3 py-2 text-sm text-warm-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">— Select classroom (optional) —</option>
                    {classrooms.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.teacher?.name ?? 'Vacant'} — {c.gradeStart}–{c.gradeEnd} ({c.sessionType ?? '—'}) — {c._count.studentPlacements} students
                      </option>
                    ))}
                  </select>
                )}
                {programSilo && siteId && schoolYear && classrooms.length === 0 && !loadingClassrooms && (
                  <p className="mt-1.5 text-xs text-warm-gray-500">No classrooms found for this filter combination.</p>
                )}
              </div>

              {/* ── Divider ───────────────────────────────────────────── */}
              <div className="border-t border-cream-200" />

              {/* ── Student Info ──────────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-1.5">
                    First Name <span className="text-coral-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full rounded-xl border border-cream-200 bg-white px-3 py-2 text-sm text-warm-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-500"
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-1.5">
                    Last Name <span className="text-coral-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full rounded-xl border border-cream-200 bg-white px-3 py-2 text-sm text-warm-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-500"
                    placeholder="Last name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-1.5">
                    Date of Birth <span className="text-coral-500">*</span>
                  </label>
                  <input
                    required
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full rounded-xl border border-cream-200 bg-white px-3 py-2 text-sm text-warm-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-1.5">
                    Grade <span className="text-coral-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full rounded-xl border border-cream-200 bg-white px-3 py-2 text-sm text-warm-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-500"
                    placeholder="e.g. 3 or PreK"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-1.5">
                  Primary Disability
                </label>
                <input
                  type="text"
                  value={primaryDisability}
                  onChange={(e) => setPrimaryDisability(e.target.value)}
                  className="w-full rounded-xl border border-cream-200 bg-white px-3 py-2 text-sm text-warm-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-500"
                  placeholder="e.g. 320"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-1.5">
                  District of Residence
                </label>
                <select
                  value={districtOfResidence}
                  onChange={(e) => setDistrictOfResidence(e.target.value)}
                  className="w-full rounded-xl border border-cream-200 bg-white px-3 py-2 text-sm text-warm-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-500"
                >
                  <option value="">Select district...</option>
                  {DISTRICTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* ── Requires 1:1 Para ─────────────────────────────────── */}
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={requires1to1}
                  onChange={(e) => setRequires1to1(e.target.checked)}
                  className="w-4 h-4 rounded border-cream-300 text-sky-600 focus:ring-sky-400 focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-sm text-warm-gray-800 font-medium">Requires 1:1 Para</span>
              </label>

              {/* ── Actions ───────────────────────────────────────────── */}
              <div className="pt-2 flex justify-end gap-3 border-t border-cream-200">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-warm-gray-600 hover:text-warm-gray-800 border border-cream-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-semibold bg-sky-700 text-white rounded-xl hover:bg-sky-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Placing…' : 'Place Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
