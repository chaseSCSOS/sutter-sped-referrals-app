'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { DISTRICTS } from '@/lib/constants/districts'

interface EditReferralModalProps {
  referral: any
  open: boolean
  onClose: () => void
}

function formatDateForInput(date: string | Date | null | undefined): string {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  return d.toISOString().split('T')[0]
}

function SectionHeader({ label, icon }: { label: string; icon: string }) {
  return (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
      <span className="text-base">{icon}</span>
      <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">{label}</h3>
    </div>
  )
}

function Field({ label, children, half }: { label: string; children: React.ReactNode; half?: boolean }) {
  return (
    <div className={half ? 'col-span-1' : 'col-span-2 sm:col-span-1'}>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  )
}

function FieldWide({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="col-span-2">
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  )
}

interface Teacher {
  id: string
  name: string
  classroom: {
    id: string
    site: { id: string; name: string }
  } | null
}

export default function EditReferralModal({ referral, open, onClose }: EditReferralModalProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('')

  const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 focus:outline-none'
  const selectCls = inputCls

  const [form, setForm] = useState({
    studentName: referral.studentName || '',
    dateOfBirth: formatDateForInput(referral.dateOfBirth),
    age: referral.age ?? '',
    grade: referral.grade || '',
    gender: referral.gender || '',
    fosterYouth: referral.fosterYouth ?? false,
    birthplace: referral.birthplace || '',
    classroomTeacher: referral.classroomTeacher || '',
    pipIndicator: referral.pipIndicator ?? false,

    parentGuardianName: referral.parentGuardianName || '',
    homePhone: referral.homePhone || '',
    cellPhone: referral.cellPhone || '',
    homeAddress: referral.homeAddress || '',
    city: referral.city || '',
    state: referral.state || '',
    zipCode: referral.zipCode || '',

    placementType: referral.placementType || 'FRA',
    schoolOfAttendance: referral.schoolOfAttendance || '',
    schoolOfResidence: referral.schoolOfResidence || '',
    transportationSpecialEd: referral.transportationSpecialEd ?? false,
    silo: referral.silo || '',
    programTrack: referral.programTrack || 'GENERAL',
    districtOfResidence: referral.districtOfResidence || '',
    dateStudentStartedSchool: formatDateForInput(referral.dateStudentStartedSchool),

    nativeLanguage: referral.nativeLanguage || '',
    englishLearner: referral.englishLearner ?? false,
    elStartDate: formatDateForInput(referral.elStartDate),
    redesignated: referral.redesignated ?? false,
    reclassificationDate: formatDateForInput(referral.reclassificationDate),
    ethnicity: referral.ethnicity || '',
    residency: referral.residency || '',

    primaryDisability: referral.primaryDisability || '',
    percentageOutsideGenEd: referral.percentageOutsideGenEd ?? 0,

    spedEntryDate: formatDateForInput(referral.spedEntryDate),
    triennialDue: formatDateForInput(referral.triennialDue),
    currentIepDate: formatDateForInput(referral.currentIepDate),
    currentPsychoReportDate: formatDateForInput(referral.currentPsychoReportDate),
    deadlineDate: formatDateForInput(referral.deadlineDate),

    referringParty: referral.referringParty || '',
    serviceProvider: referral.serviceProvider || '',
    inSEIS: referral.inSEIS ?? false,
    inSEISDate: formatDateForInput(referral.inSEISDate),
    inAeries: referral.inAeries ?? false,
    inAeriesDate: formatDateForInput(referral.inAeriesDate),
    cumNotes: referral.cumNotes || '',

    lastPlacementSchool: referral.lastPlacementSchool || '',
    lastPlacementDistrict: referral.lastPlacementDistrict || '',
    lastPlacementCounty: referral.lastPlacementCounty || '',
    lastPlacementState: referral.lastPlacementState || '',
    lastPlacementPhone: referral.lastPlacementPhone || '',
    lastPlacementContactPerson: referral.lastPlacementContactPerson || '',

    leaRepresentativeName: referral.leaRepresentativeName || '',
    leaRepresentativePosition: referral.leaRepresentativePosition || '',
    nonSeisIep: referral.nonSeisIep ?? false,
    submittedByEmail: referral.submittedByEmail || '',
    additionalComments: referral.additionalComments || '',
  })

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Fetch teachers when modal opens
  useEffect(() => {
    if (!open) return
    fetch('/api/staff?role=TEACHER&isActive=true')
      .then(r => r.json())
      .then(data => {
        const list: Teacher[] = (data.staffMembers || [])
          .filter((s: any) => !s.isVacancy)
          .map((s: any) => ({
            id: s.id,
            name: s.name,
            classroom: s.classroom ? {
              id: s.classroom.id,
              site: s.classroom.site,
            } : null,
          }))
        setTeachers(list)
        // Pre-select if current classroomTeacher matches a name
        if (referral.classroomTeacher) {
          const match = list.find(t => t.name === referral.classroomTeacher)
          if (match) setSelectedTeacherId(match.id)
        }
      })
      .catch(() => {})
  }, [open])

  function set(field: string, value: any) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const payload: Record<string, any> = { ...form }
      const nullableStr = [
        'homePhone','cellPhone','elStartDate','reclassificationDate','currentIepDate',
        'currentPsychoReportDate','lastPlacementPhone','lastPlacementContactPerson',
        'submittedByEmail','additionalComments','silo','classroomTeacher','districtOfResidence',
        'referringParty','serviceProvider','cumNotes','dateStudentStartedSchool',
        'inSEISDate','inAeriesDate','birthplace','gender','ethnicity','residency',
        'schoolOfAttendance','spedEntryDate','triennialDue',
      ]
      for (const f of nullableStr) {
        if (payload[f] === '') payload[f] = null
      }
      // age must be a number or omitted (not empty string)
      if (typeof payload.age !== 'number') delete payload.age
      // Include teacher staff ID for classroom assignment
      payload.classroomTeacherStaffId = selectedTeacherId || null
      const res = await fetch(`/api/referrals/${referral.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update referral')
      }
      toast.success('Referral updated')
      onClose()
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update referral')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex flex-col w-full max-w-2xl bg-white shadow-2xl"
           style={{ boxShadow: '-8px 0 40px rgba(0,0,0,0.12)' }}>

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{referral.studentName}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Edit referral details &mdash; all sections are editable below
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors text-slate-500 hover:text-slate-800 ml-4 shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable form body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8">

          {/* Student Information */}
          <section>
            <SectionHeader label="Student Information" icon="👤" />
            <div className="grid grid-cols-2 gap-3">
              <FieldWide label="Student Name">
                <input className={inputCls} value={form.studentName} onChange={e => set('studentName', e.target.value)} />
              </FieldWide>
              <Field label="Date of Birth">
                <input type="date" className={inputCls} value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} />
              </Field>
              <Field label="Grade">
                <input className={inputCls} value={form.grade} onChange={e => set('grade', e.target.value)} placeholder="e.g. K, 1, TK, PS" />
              </Field>
              <Field label="Gender">
                <select className={selectCls} value={form.gender} onChange={e => set('gender', e.target.value)}>
                  <option value="">— Select —</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </Field>
              <Field label="Birthplace">
                <input className={inputCls} value={form.birthplace} onChange={e => set('birthplace', e.target.value)} />
              </Field>
              <Field label="Foster Youth">
                <select className={selectCls} value={form.fosterYouth ? 'yes' : 'no'} onChange={e => set('fosterYouth', e.target.value === 'yes')}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </Field>
              <Field label="Classroom Teacher">
                <select
                  className={selectCls}
                  value={selectedTeacherId}
                  onChange={e => {
                    const tid = e.target.value
                    setSelectedTeacherId(tid)
                    const teacher = teachers.find(t => t.id === tid)
                    set('classroomTeacher', teacher ? teacher.name : '')
                    set('schoolOfAttendance', teacher?.classroom?.site?.name || form.schoolOfAttendance)
                  }}
                >
                  <option value="">— Select teacher —</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}{t.classroom?.site ? ` (${t.classroom.site.name})` : ''}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="PIP">
                <select className={selectCls} value={form.pipIndicator ? 'yes' : 'no'} onChange={e => set('pipIndicator', e.target.value === 'yes')}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </Field>
            </div>
          </section>

          {/* Contact Information */}
          <section>
            <SectionHeader label="Contact Information" icon="📞" />
            <div className="grid grid-cols-2 gap-3">
              <FieldWide label="Parent / Guardian Name">
                <input className={inputCls} value={form.parentGuardianName} onChange={e => set('parentGuardianName', e.target.value)} />
              </FieldWide>
              <Field label="Home Phone">
                <input type="tel" className={inputCls} value={form.homePhone} onChange={e => set('homePhone', e.target.value)} />
              </Field>
              <Field label="Cell Phone">
                <input type="tel" className={inputCls} value={form.cellPhone} onChange={e => set('cellPhone', e.target.value)} />
              </Field>
              <FieldWide label="Home Address">
                <input className={inputCls} value={form.homeAddress} onChange={e => set('homeAddress', e.target.value)} />
              </FieldWide>
              <Field label="City">
                <input className={inputCls} value={form.city} onChange={e => set('city', e.target.value)} />
              </Field>
              <Field label="State">
                <input className={inputCls} value={form.state} onChange={e => set('state', e.target.value)} />
              </Field>
              <Field label="Zip Code">
                <input className={inputCls} value={form.zipCode} onChange={e => set('zipCode', e.target.value)} />
              </Field>
            </div>
          </section>

          {/* Placement & Program */}
          <section>
            <SectionHeader label="Placement & Program" icon="🏫" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Placement Type">
                <select className={selectCls} value={form.placementType} onChange={e => set('placementType', e.target.value)}>
                  <option value="FRA">FRA</option>
                  <option value="SDC">SDC</option>
                </select>
              </Field>
              <Field label="Program Track">
                <select className={selectCls} value={form.programTrack} onChange={e => set('programTrack', e.target.value)}>
                  <option value="GENERAL">General</option>
                  <option value="BEHAVIOR">BX (Behavior)</option>
                  <option value="DHH">DHH</option>
                  <option value="SCIP">SCIP</option>
                  <option value="VIP">VIP</option>
                </select>
              </Field>
              <Field label="Silo">
                <select className={selectCls} value={form.silo} onChange={e => set('silo', e.target.value)}>
                  <option value="">— None —</option>
                  <option value="ASD">ASD</option>
                  <option value="SD">SD</option>
                  <option value="NC">NC</option>
                  <option value="DHH">DHH</option>
                  <option value="MD">MD</option>
                  <option value="OT">OT</option>
                </select>
              </Field>
              <Field label="District of Residence (DOR)">
                <select className={inputCls} value={form.districtOfResidence} onChange={e => set('districtOfResidence', e.target.value)}>
                  <option value="">Select district...</option>
                  {DISTRICTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </Field>
              <Field label="School of Attendance">
                <input className={inputCls} value={form.schoolOfAttendance} onChange={e => set('schoolOfAttendance', e.target.value)} />
              </Field>
              <Field label="School of Residence">
                <input className={inputCls} value={form.schoolOfResidence} onChange={e => set('schoolOfResidence', e.target.value)} />
              </Field>
              <Field label="Date Student Started School">
                <input type="date" className={inputCls} value={form.dateStudentStartedSchool} onChange={e => set('dateStudentStartedSchool', e.target.value)} />
              </Field>
              <Field label="Special Ed Transportation">
                <select className={selectCls} value={form.transportationSpecialEd ? 'yes' : 'no'} onChange={e => set('transportationSpecialEd', e.target.value === 'yes')}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </Field>
              <Field label="Referring Party">
                <input className={inputCls} value={form.referringParty} onChange={e => set('referringParty', e.target.value)} />
              </Field>
              <Field label="Service Provider">
                <input className={inputCls} value={form.serviceProvider} onChange={e => set('serviceProvider', e.target.value)} />
              </Field>
            </div>
          </section>

          {/* Language & Demographics */}
          <section>
            <SectionHeader label="Language & Demographics" icon="🌐" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Native Language">
                <input className={inputCls} value={form.nativeLanguage} onChange={e => set('nativeLanguage', e.target.value)} />
              </Field>
              <Field label="Ethnicity">
                <input className={inputCls} value={form.ethnicity} onChange={e => set('ethnicity', e.target.value)} />
              </Field>
              <Field label="Residency">
                <input className={inputCls} value={form.residency} onChange={e => set('residency', e.target.value)} />
              </Field>
              <Field label="English Learner">
                <select className={selectCls} value={form.englishLearner ? 'yes' : 'no'} onChange={e => set('englishLearner', e.target.value === 'yes')}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </Field>
              {form.englishLearner && (
                <Field label="EL Start Date">
                  <input type="date" className={inputCls} value={form.elStartDate} onChange={e => set('elStartDate', e.target.value)} />
                </Field>
              )}
              <Field label="Redesignated">
                <select className={selectCls} value={form.redesignated ? 'yes' : 'no'} onChange={e => set('redesignated', e.target.value === 'yes')}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </Field>
              {form.redesignated && (
                <Field label="Reclassification Date">
                  <input type="date" className={inputCls} value={form.reclassificationDate} onChange={e => set('reclassificationDate', e.target.value)} />
                </Field>
              )}
            </div>
          </section>

          {/* Disability */}
          <section>
            <SectionHeader label="Disability" icon="📋" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Primary Disability Code">
                <input className={inputCls} value={form.primaryDisability} onChange={e => set('primaryDisability', e.target.value)} placeholder="e.g. 320 (Autism), 290 (SLD)" />
              </Field>
              <Field label="% Outside General Education">
                <input type="number" min={0} max={100} className={inputCls} value={form.percentageOutsideGenEd} onChange={e => set('percentageOutsideGenEd', parseInt(e.target.value) || 0)} />
              </Field>
            </div>
          </section>

          {/* SPED Dates */}
          <section>
            <SectionHeader label="SPED Dates" icon="📅" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Deadline Date">
                <input type="date" className={inputCls} value={form.deadlineDate} onChange={e => set('deadlineDate', e.target.value)} />
              </Field>
              <Field label="SPED Entry Date">
                <input type="date" className={inputCls} value={form.spedEntryDate} onChange={e => set('spedEntryDate', e.target.value)} />
              </Field>
              <Field label="Triennial Due">
                <input type="date" className={inputCls} value={form.triennialDue} onChange={e => set('triennialDue', e.target.value)} />
              </Field>
              <Field label="Current IEP Date">
                <input type="date" className={inputCls} value={form.currentIepDate} onChange={e => set('currentIepDate', e.target.value)} />
              </Field>
              <Field label="Psychoeducational Report Date">
                <input type="date" className={inputCls} value={form.currentPsychoReportDate} onChange={e => set('currentPsychoReportDate', e.target.value)} />
              </Field>
            </div>
          </section>

          {/* System Sync (SEIS / Aeries / CUM) */}
          <section>
            <SectionHeader label="System Sync" icon="🔁" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="In SEIS">
                <select className={selectCls} value={form.inSEIS ? 'yes' : 'no'} onChange={e => set('inSEIS', e.target.value === 'yes')}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </Field>
              <Field label="SEIS Date">
                <input type="date" className={inputCls} value={form.inSEISDate} onChange={e => set('inSEISDate', e.target.value)} />
              </Field>
              <Field label="In Aeries">
                <select className={selectCls} value={form.inAeries ? 'yes' : 'no'} onChange={e => set('inAeries', e.target.value === 'yes')}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </Field>
              <Field label="Aeries Date">
                <input type="date" className={inputCls} value={form.inAeriesDate} onChange={e => set('inAeriesDate', e.target.value)} />
              </Field>
              <FieldWide label="CUM Notes">
                <input className={inputCls} value={form.cumNotes} onChange={e => set('cumNotes', e.target.value)} placeholder="e.g. CUM requested from: PIP | CUM processed by: AB" />
              </FieldWide>
            </div>
          </section>

          {/* Last Placement */}
          <section>
            <SectionHeader label="Last Placement" icon="🔄" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="School">
                <input className={inputCls} value={form.lastPlacementSchool} onChange={e => set('lastPlacementSchool', e.target.value)} />
              </Field>
              <Field label="District">
                <input className={inputCls} value={form.lastPlacementDistrict} onChange={e => set('lastPlacementDistrict', e.target.value)} />
              </Field>
              <Field label="County">
                <input className={inputCls} value={form.lastPlacementCounty} onChange={e => set('lastPlacementCounty', e.target.value)} />
              </Field>
              <Field label="State">
                <input className={inputCls} value={form.lastPlacementState} onChange={e => set('lastPlacementState', e.target.value)} />
              </Field>
              <Field label="Phone">
                <input type="tel" className={inputCls} value={form.lastPlacementPhone} onChange={e => set('lastPlacementPhone', e.target.value)} />
              </Field>
              <Field label="Contact Person">
                <input className={inputCls} value={form.lastPlacementContactPerson} onChange={e => set('lastPlacementContactPerson', e.target.value)} />
              </Field>
            </div>
          </section>

          {/* Authorization */}
          <section>
            <SectionHeader label="Authorization" icon="✅" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="LEA Representative">
                <input className={inputCls} value={form.leaRepresentativeName} onChange={e => set('leaRepresentativeName', e.target.value)} />
              </Field>
              <Field label="Position">
                <input className={inputCls} value={form.leaRepresentativePosition} onChange={e => set('leaRepresentativePosition', e.target.value)} />
              </Field>
              <Field label="Non-SEIS IEP">
                <select className={selectCls} value={form.nonSeisIep ? 'yes' : 'no'} onChange={e => set('nonSeisIep', e.target.value === 'yes')}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </Field>
              <Field label="Submitted By Email">
                <input type="email" className={inputCls} value={form.submittedByEmail} onChange={e => set('submittedByEmail', e.target.value)} />
              </Field>
              <FieldWide label="Additional Comments">
                <textarea
                  className={inputCls + ' resize-none'}
                  rows={3}
                  value={form.additionalComments}
                  onChange={e => set('additionalComments', e.target.value)}
                />
              </FieldWide>
            </div>
          </section>

          {/* Bottom padding so last section clears the footer */}
          <div className="h-4" />
        </div>

        {/* Sticky footer */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-white">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-sm font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            {saving && (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </>,
    document.body
  )
}
