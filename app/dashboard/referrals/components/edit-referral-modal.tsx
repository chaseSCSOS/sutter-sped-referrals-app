'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Tab =
  | 'student'
  | 'contact'
  | 'placement'
  | 'language'
  | 'disability'
  | 'dates'
  | 'lastPlacement'
  | 'authorization'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'student', label: 'Student', icon: '👤' },
  { id: 'contact', label: 'Contact', icon: '📞' },
  { id: 'placement', label: 'Placement', icon: '🏫' },
  { id: 'language', label: 'Language', icon: '🌐' },
  { id: 'disability', label: 'Disability', icon: '📋' },
  { id: 'dates', label: 'SPED Dates', icon: '📅' },
  { id: 'lastPlacement', label: 'Last Placement', icon: '🔄' },
  { id: 'authorization', label: 'Authorization', icon: '✅' },
]

interface EditReferralModalProps {
  referral: any
  open: boolean
  onClose: () => void
}

function formatDateForInput(date: string | Date | null | undefined): string {
  if (!date) return ''
  const d = new Date(date)
  return d.toISOString().split('T')[0]
}

export default function EditReferralModal({ referral, open, onClose }: EditReferralModalProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('student')
  const [saving, setSaving] = useState(false)

  // Form state — initialized from referral data
  const [form, setForm] = useState({
    // Student
    studentName: referral.studentName || '',
    dateOfBirth: formatDateForInput(referral.dateOfBirth),
    age: referral.age || 0,
    grade: referral.grade || '',
    gender: referral.gender || '',
    fosterYouth: referral.fosterYouth ?? false,
    birthplace: referral.birthplace || '',

    // Contact
    parentGuardianName: referral.parentGuardianName || '',
    homePhone: referral.homePhone || '',
    cellPhone: referral.cellPhone || '',
    homeAddress: referral.homeAddress || '',
    city: referral.city || '',
    state: referral.state || '',
    zipCode: referral.zipCode || '',

    // Placement
    placementType: referral.placementType || 'FRA',
    schoolOfAttendance: referral.schoolOfAttendance || '',
    schoolOfResidence: referral.schoolOfResidence || '',
    transportationSpecialEd: referral.transportationSpecialEd ?? false,
    silo: referral.silo || '',

    // Language
    nativeLanguage: referral.nativeLanguage || '',
    englishLearner: referral.englishLearner ?? false,
    elStartDate: formatDateForInput(referral.elStartDate),
    redesignated: referral.redesignated ?? false,
    reclassificationDate: formatDateForInput(referral.reclassificationDate),
    ethnicity: referral.ethnicity || '',
    residency: referral.residency || '',

    // Disability
    primaryDisability: referral.primaryDisability || '',

    // Dates
    spedEntryDate: formatDateForInput(referral.spedEntryDate),
    triennialDue: formatDateForInput(referral.triennialDue),
    currentIepDate: formatDateForInput(referral.currentIepDate),
    currentPsychoReportDate: formatDateForInput(referral.currentPsychoReportDate),

    // Last Placement
    lastPlacementSchool: referral.lastPlacementSchool || '',
    lastPlacementDistrict: referral.lastPlacementDistrict || '',
    lastPlacementCounty: referral.lastPlacementCounty || '',
    lastPlacementState: referral.lastPlacementState || '',
    lastPlacementPhone: referral.lastPlacementPhone || '',
    lastPlacementContactPerson: referral.lastPlacementContactPerson || '',

    // Authorization
    leaRepresentativeName: referral.leaRepresentativeName || '',
    leaRepresentativePosition: referral.leaRepresentativePosition || '',
    nonSeisIep: referral.nonSeisIep ?? false,
    submittedByEmail: referral.submittedByEmail || '',
    additionalComments: referral.additionalComments || '',
    percentageOutsideGenEd: referral.percentageOutsideGenEd ?? 0,
  })

  function updateField(field: string, value: any) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const payload: Record<string, any> = { ...form }

      // Convert empty strings to null for nullable fields
      const nullableFields = [
        'homePhone', 'cellPhone', 'elStartDate', 'reclassificationDate',
        'currentIepDate', 'currentPsychoReportDate', 'lastPlacementPhone',
        'lastPlacementContactPerson', 'submittedByEmail', 'additionalComments', 'silo',
      ]
      for (const field of nullableFields) {
        if (payload[field] === '') payload[field] = null
      }

      // Convert redesignated
      if (payload.redesignated === '') payload.redesignated = null

      const res = await fetch(`/api/referrals/${referral.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update referral')
      }

      toast.success('Referral updated successfully')
      onClose()
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update referral')
    } finally {
      setSaving(false)
    }
  }

  const fieldClass =
    'w-full rounded-xl border border-cream-200/80 bg-white/70 px-3 py-2 text-sm text-warm-gray-800 shadow-sm transition focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-200/70 focus-visible:outline-none'

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Referral</DialogTitle>
          <DialogDescription>
            Update information for {referral.studentName} &mdash; {referral.confirmationNumber}
          </DialogDescription>
        </DialogHeader>

        {/* Tab navigation */}
        <div className="flex gap-1 overflow-x-auto pb-1 border-b border-cream-200 -mx-6 px-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-sky-50 text-sky-700 border-b-2 border-sky-600'
                  : 'text-warm-gray-600 hover:text-warm-gray-900 hover:bg-cream-50'
              }`}
            >
              <span className="text-sm">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto py-4 -mx-6 px-6 min-h-[320px]">
          {activeTab === 'student' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Student Name *</Label>
                <Input value={form.studentName} onChange={(e) => updateField('studentName', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Date of Birth *</Label>
                <input type="date" className={fieldClass} value={form.dateOfBirth} onChange={(e) => updateField('dateOfBirth', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Age</Label>
                <Input type="number" value={form.age} onChange={(e) => updateField('age', parseInt(e.target.value) || 0)} />
              </div>
              <div className="space-y-1.5">
                <Label>Grade *</Label>
                <Input value={form.grade} onChange={(e) => updateField('grade', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Gender *</Label>
                <Input value={form.gender} onChange={(e) => updateField('gender', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Birthplace *</Label>
                <Input value={form.birthplace} onChange={(e) => updateField('birthplace', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Foster Youth</Label>
                <Select value={form.fosterYouth ? 'yes' : 'no'} onValueChange={(v) => updateField('fosterYouth', v === 'yes')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Parent/Guardian Name *</Label>
                <Input value={form.parentGuardianName} onChange={(e) => updateField('parentGuardianName', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Home Phone</Label>
                <Input type="tel" value={form.homePhone} onChange={(e) => updateField('homePhone', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Cell Phone</Label>
                <Input type="tel" value={form.cellPhone} onChange={(e) => updateField('cellPhone', e.target.value)} />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Home Address *</Label>
                <Input value={form.homeAddress} onChange={(e) => updateField('homeAddress', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>City *</Label>
                <Input value={form.city} onChange={(e) => updateField('city', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>State *</Label>
                <Input value={form.state} onChange={(e) => updateField('state', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Zip Code *</Label>
                <Input value={form.zipCode} onChange={(e) => updateField('zipCode', e.target.value)} />
              </div>
            </div>
          )}

          {activeTab === 'placement' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Placement Type *</Label>
                <Select value={form.placementType} onValueChange={(v) => updateField('placementType', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FRA">FRA</SelectItem>
                    <SelectItem value="SDC">SDC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Silo</Label>
                <Input value={form.silo} onChange={(e) => updateField('silo', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>School of Attendance *</Label>
                <Input value={form.schoolOfAttendance} onChange={(e) => updateField('schoolOfAttendance', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>School of Residence *</Label>
                <Input value={form.schoolOfResidence} onChange={(e) => updateField('schoolOfResidence', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Special Ed Transportation</Label>
                <Select value={form.transportationSpecialEd ? 'yes' : 'no'} onValueChange={(v) => updateField('transportationSpecialEd', v === 'yes')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {activeTab === 'language' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Native Language *</Label>
                <Input value={form.nativeLanguage} onChange={(e) => updateField('nativeLanguage', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>English Learner</Label>
                <Select value={form.englishLearner ? 'yes' : 'no'} onValueChange={(v) => updateField('englishLearner', v === 'yes')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.englishLearner && (
                <div className="space-y-1.5">
                  <Label>EL Start Date</Label>
                  <input type="date" className={fieldClass} value={form.elStartDate} onChange={(e) => updateField('elStartDate', e.target.value)} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Redesignated</Label>
                <Select value={form.redesignated ? 'yes' : 'no'} onValueChange={(v) => updateField('redesignated', v === 'yes')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.redesignated && (
                <div className="space-y-1.5">
                  <Label>Reclassification Date</Label>
                  <input type="date" className={fieldClass} value={form.reclassificationDate} onChange={(e) => updateField('reclassificationDate', e.target.value)} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Ethnicity *</Label>
                <Input value={form.ethnicity} onChange={(e) => updateField('ethnicity', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Residency *</Label>
                <Input value={form.residency} onChange={(e) => updateField('residency', e.target.value)} />
              </div>
            </div>
          )}

          {activeTab === 'disability' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Primary Disability Code *</Label>
                <Input value={form.primaryDisability} onChange={(e) => updateField('primaryDisability', e.target.value)} />
                <p className="text-xs text-warm-gray-500 mt-1">Enter the disability code (e.g., 320 for Autism, 290 for SLD)</p>
              </div>
              <div className="space-y-1.5">
                <Label>% Outside General Education</Label>
                <Input type="number" min={0} max={100} value={form.percentageOutsideGenEd} onChange={(e) => updateField('percentageOutsideGenEd', parseInt(e.target.value) || 0)} />
              </div>
            </div>
          )}

          {activeTab === 'dates' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>SPED Entry Date *</Label>
                <input type="date" className={fieldClass} value={form.spedEntryDate} onChange={(e) => updateField('spedEntryDate', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Triennial Due *</Label>
                <input type="date" className={fieldClass} value={form.triennialDue} onChange={(e) => updateField('triennialDue', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Current IEP Date</Label>
                <input type="date" className={fieldClass} value={form.currentIepDate} onChange={(e) => updateField('currentIepDate', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Psychoeducational Report Date</Label>
                <input type="date" className={fieldClass} value={form.currentPsychoReportDate} onChange={(e) => updateField('currentPsychoReportDate', e.target.value)} />
              </div>
            </div>
          )}

          {activeTab === 'lastPlacement' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>School *</Label>
                <Input value={form.lastPlacementSchool} onChange={(e) => updateField('lastPlacementSchool', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>District *</Label>
                <Input value={form.lastPlacementDistrict} onChange={(e) => updateField('lastPlacementDistrict', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>County *</Label>
                <Input value={form.lastPlacementCounty} onChange={(e) => updateField('lastPlacementCounty', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>State *</Label>
                <Input value={form.lastPlacementState} onChange={(e) => updateField('lastPlacementState', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input type="tel" value={form.lastPlacementPhone} onChange={(e) => updateField('lastPlacementPhone', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Contact Person</Label>
                <Input value={form.lastPlacementContactPerson} onChange={(e) => updateField('lastPlacementContactPerson', e.target.value)} />
              </div>
            </div>
          )}

          {activeTab === 'authorization' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>LEA Representative *</Label>
                <Input value={form.leaRepresentativeName} onChange={(e) => updateField('leaRepresentativeName', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Position *</Label>
                <Input value={form.leaRepresentativePosition} onChange={(e) => updateField('leaRepresentativePosition', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Non-SEIS IEP</Label>
                <Select value={form.nonSeisIep ? 'yes' : 'no'} onValueChange={(v) => updateField('nonSeisIep', v === 'yes')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Submitted By Email</Label>
                <Input type="email" value={form.submittedByEmail} onChange={(e) => updateField('submittedByEmail', e.target.value)} />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Additional Comments</Label>
                <Textarea value={form.additionalComments} onChange={(e) => updateField('additionalComments', e.target.value)} rows={3} />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-cream-200 pt-4 -mx-6 px-6">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
