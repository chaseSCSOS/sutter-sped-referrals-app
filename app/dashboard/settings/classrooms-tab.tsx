'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth/hooks'
import { hasPermission } from '@/lib/auth/permissions'
import { SCHOOL_YEARS, getCurrentSchoolYear } from '@/lib/school-year'
import { GRADE_VALUES, formatGradeRange } from '@/lib/constants/grades'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ProgramSilo, SessionType } from '@prisma/client'

// ==================== Types ====================

type Site = {
  id: string
  name: string
  isActive: boolean
}

type StaffOption = {
  id: string
  name: string
  role: string
  positionControlNumber: string | null
}

type Classroom = {
  id: string
  classroomNumber: string | null
  programSilo: ProgramSilo
  siteId: string
  site: { id: string; name: string }
  gradeStart: string
  gradeEnd: string
  sessionNumber: string | null
  sessionType: SessionType
  positionControlNumber: string | null
  credentials: string | null
  maxCapacity: number | null
  schoolYear: string
  isOpenPosition: boolean
  teacherId: string | null
  teacher: { id: string; name: string; role: string } | null
  paras: { id: string; name: string; role: string }[]
  _count: { studentPlacements: number }
  createdAt: string
  updatedAt: string
}

type ClassroomFormData = {
  classroomNumber: string
  programSilo: ProgramSilo
  siteId: string
  gradeStart: string
  gradeEnd: string
  sessionType: SessionType
  sessionNumber: string
  positionControlNumber: string
  credentials: string
  maxCapacity: string
  schoolYear: string
  teacherId: string
  supportStaffIds: string[]
  isOpenPosition: boolean
}

// ==================== Enum Labels ====================

const PROGRAM_SILO_VALUES: ProgramSilo[] = ['ASD_ELEM', 'ASD_MIDHS', 'SD', 'NC', 'DHH', 'ATP', 'MD']
const PROGRAM_SILO_LABELS: Record<ProgramSilo, string> = {
  ASD_ELEM:  'ASD-Elem',
  ASD_MIDHS: 'ASD-MidHS',
  SD:        'SD',
  NC:        'NC',
  DHH:       'DHH',
  ATP:       'ATP',
  MD:        'MD',
}

const SESSION_TYPE_VALUES: SessionType[] = ['AM', 'PM', 'FULL_DAY', 'PERIOD_ATTENDANCE', 'SELF_CONTAINED']
const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  AM:                 'AM',
  PM:                 'PM',
  FULL_DAY:          'Full Day',
  PERIOD_ATTENDANCE: 'Period Attendance',
  SELF_CONTAINED:    'Self-Contained',
}

const SUPPORT_STAFF_ROLES = ['CLASS_PARA', 'ONE_TO_ONE_PARA', 'INTERPRETER', 'SIGNING_PARA', 'LVN'] as const
const SUPPORT_ROLE_LABELS: Record<string, string> = {
  CLASS_PARA: 'Class Para',
  ONE_TO_ONE_PARA: '1:1 Para',
  INTERPRETER: 'Interpreter',
  SIGNING_PARA: 'Signing Para',
  LVN: 'LVN',
}

// ==================== Constants ====================

const cardClass = 'bg-white rounded-2xl border border-cream-200 overflow-hidden'
const cardShadow = { boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }

const DEFAULT_FORM: ClassroomFormData = {
  classroomNumber: '',
  programSilo: 'ASD_ELEM',
  siteId: '',
  gradeStart: 'K',
  gradeEnd: 'K',
  sessionType: 'FULL_DAY',
  sessionNumber: '',
  positionControlNumber: '',
  credentials: '',
  maxCapacity: '',
  schoolYear: getCurrentSchoolYear(),
  teacherId: '',
  supportStaffIds: [],
  isOpenPosition: false,
}

// ==================== Component ====================

export function ClassroomsTab() {
  const { user: currentUser } = useAuth()

  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [teachers, setTeachers] = useState<StaffOption[]>([])
  const [supportStaff, setSupportStaff] = useState<StaffOption[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null)
  const [formData, setFormData] = useState<ClassroomFormData>(DEFAULT_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Filters
  const [filterSchoolYear, setFilterSchoolYear] = useState(getCurrentSchoolYear())
  const [filterSilo, setFilterSilo] = useState<ProgramSilo | 'ALL'>('ALL')

  // ==================== Data Fetching ====================

  const fetchClassrooms = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterSchoolYear) params.append('schoolYear', filterSchoolYear)
      if (filterSilo !== 'ALL') params.append('programSilo', filterSilo)
      const response = await fetch(`/api/classrooms?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setClassrooms(data.classrooms ?? [])
      }
    } catch (err) {
      console.error('Error fetching classrooms:', err)
    } finally {
      setLoading(false)
    }
  }, [filterSchoolYear, filterSilo])

  const fetchSites = useCallback(async () => {
    try {
      const response = await fetch('/api/sites')
      if (response.ok) {
        const data = await response.json()
        setSites((data.sites ?? []).filter((s: Site) => s.isActive))
      }
    } catch (err) {
      console.error('Error fetching sites:', err)
    }
  }, [])

  const fetchStaff = useCallback(async (schoolYear: string) => {
    try {
      const teacherParams = new URLSearchParams({ role: 'TEACHER' })
      if (schoolYear) teacherParams.append('schoolYear', schoolYear)
      const teacherRes = await fetch(`/api/staff?${teacherParams.toString()}`)
      if (teacherRes.ok) {
        const data = await teacherRes.json()
        setTeachers(data.staffMembers ?? [])
      }

      // Fetch support staff roles
      const supportRoles = SUPPORT_STAFF_ROLES.join(',')
      const supportParams = new URLSearchParams()
      if (schoolYear) supportParams.append('schoolYear', schoolYear)
      // Fetch each role type
      const results: StaffOption[] = []
      for (const role of SUPPORT_STAFF_ROLES) {
        const p = new URLSearchParams({ role })
        if (schoolYear) p.append('schoolYear', schoolYear)
        const res = await fetch(`/api/staff?${p.toString()}`)
        if (res.ok) {
          const d = await res.json()
          results.push(...(d.staffMembers ?? []))
        }
      }
      setSupportStaff(results)
      void supportRoles // suppress unused warning
    } catch (err) {
      console.error('Error fetching staff:', err)
    }
  }, [])

  useEffect(() => {
    if (currentUser && hasPermission(currentUser.role, 'classrooms:view')) {
      fetchClassrooms()
      fetchSites()
    } else {
      setLoading(false)
    }
  }, [currentUser, fetchClassrooms, fetchSites])

  useEffect(() => {
    if (showAddModal || showEditModal) {
      fetchStaff(formData.schoolYear)
    }
  }, [formData.schoolYear, showAddModal, showEditModal, fetchStaff])

  // ==================== Handlers ====================

  const openAddModal = () => {
    setFormData({ ...DEFAULT_FORM, schoolYear: filterSchoolYear || getCurrentSchoolYear() })
    setError(null)
    setShowAddModal(true)
  }

  const openEditModal = (classroom: Classroom) => {
    setEditingClassroom(classroom)
    setFormData({
      classroomNumber: classroom.classroomNumber ?? '',
      programSilo: classroom.programSilo,
      siteId: classroom.siteId,
      gradeStart: classroom.gradeStart,
      gradeEnd: classroom.gradeEnd,
      sessionType: classroom.sessionType,
      sessionNumber: classroom.sessionNumber ?? '',
      positionControlNumber: classroom.positionControlNumber ?? '',
      credentials: classroom.credentials ?? '',
      maxCapacity: classroom.maxCapacity != null ? String(classroom.maxCapacity) : '',
      schoolYear: classroom.schoolYear,
      teacherId: classroom.teacherId ?? '',
      supportStaffIds: classroom.paras.map((p) => p.id),
      isOpenPosition: classroom.isOpenPosition,
    })
    setError(null)
    setShowEditModal(true)
  }

  const buildPayload = (data: ClassroomFormData) => ({
    classroomNumber: data.classroomNumber || undefined,
    programSilo: data.programSilo,
    siteId: data.siteId,
    gradeStart: data.gradeStart,
    gradeEnd: data.gradeEnd,
    sessionType: data.sessionType,
    sessionNumber: data.sessionNumber || undefined,
    positionControlNumber: data.positionControlNumber || undefined,
    credentials: data.credentials || undefined,
    maxCapacity: data.maxCapacity ? parseInt(data.maxCapacity, 10) : null,
    schoolYear: data.schoolYear,
    teacherId: data.teacherId || null,
    supportStaffIds: data.supportStaffIds,
    isOpenPosition: data.isOpenPosition,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch('/api/classrooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(formData)),
      })
      const data = await response.json()
      if (response.ok) {
        setSuccess('Classroom created successfully.')
        setShowAddModal(false)
        fetchClassrooms()
      } else {
        setError(data.error || 'Failed to create classroom')
      }
    } catch {
      setError('An error occurred while creating the classroom')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingClassroom) return
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch(`/api/classrooms/${editingClassroom.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(formData)),
      })
      const data = await response.json()
      if (response.ok) {
        setSuccess('Classroom updated successfully.')
        setShowEditModal(false)
        setEditingClassroom(null)
        fetchClassrooms()
      } else {
        setError(data.error || 'Failed to update classroom')
      }
    } catch {
      setError('An error occurred while updating the classroom')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (classroom: Classroom) => {
    const label = `${classroom.site.name} · ${PROGRAM_SILO_LABELS[classroom.programSilo]} · ${formatGradeRange(classroom.gradeStart, classroom.gradeEnd)}`
    if (!confirm(`Delete classroom "${label}"? This cannot be undone.`)) return
    try {
      const response = await fetch(`/api/classrooms/${classroom.id}`, { method: 'DELETE' })
      if (response.ok) {
        setSuccess('Classroom deleted.')
        fetchClassrooms()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to delete classroom')
      }
    } catch {
      setError('An error occurred while deleting the classroom')
    }
  }

  // ==================== Guards ====================

  if (!currentUser || !hasPermission(currentUser.role, 'classrooms:view')) return null

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-cream-200 border-t-sky-500" />
      </div>
    )
  }

  // ==================== Render ====================

  return (
    <>
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">{success}</div>
      )}

      <div className={cardClass} style={cardShadow}>
        {/* Card header */}
        <div className="px-5 py-4 border-b border-cream-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-warm-gray-900">Classrooms</p>
            <p className="text-xs text-warm-gray-500 mt-0.5">
              Manage classroom records, teacher assignments, and capacity for each program silo.
            </p>
          </div>
          {hasPermission(currentUser.role, 'classrooms:create') && (
            <Button onClick={openAddModal} className="shrink-0">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Classroom
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="px-5 py-3 border-b border-cream-200 flex flex-wrap gap-3 items-center">
          <Select
            value={filterSchoolYear || 'all'}
            onValueChange={(v) => setFilterSchoolYear(v === 'all' ? '' : v)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {SCHOOL_YEARS.map((year) => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex flex-wrap gap-1">
            {(['ALL', ...PROGRAM_SILO_VALUES] as const).map((silo) => (
              <button
                key={silo}
                onClick={() => setFilterSilo(silo)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  filterSilo === silo
                    ? 'bg-sky-700 text-white'
                    : 'bg-cream-50 text-warm-gray-600 hover:bg-cream-100 border border-cream-200'
                }`}
              >
                {silo === 'ALL' ? 'All' : PROGRAM_SILO_LABELS[silo]}
              </button>
            ))}
          </div>

          <span className="ml-auto text-xs text-warm-gray-400">
            {classrooms.length} {classrooms.length === 1 ? 'classroom' : 'classrooms'}
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cream-100 bg-cream-50/60">
                <th className="text-left px-5 py-3 text-xs font-semibold text-warm-gray-600 uppercase tracking-wide">Site</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-warm-gray-600 uppercase tracking-wide">Silo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-warm-gray-600 uppercase tracking-wide">Rm #</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-warm-gray-600 uppercase tracking-wide">Grades</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-warm-gray-600 uppercase tracking-wide">Session</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-warm-gray-600 uppercase tracking-wide">Session #</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-warm-gray-600 uppercase tracking-wide">Teacher</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-warm-gray-600 uppercase tracking-wide">Staff</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-warm-gray-600 uppercase tracking-wide">PC#</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-warm-gray-600 uppercase tracking-wide">Enroll</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-warm-gray-600 uppercase tracking-wide">Max</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-warm-gray-600 uppercase tracking-wide">Yr</th>
                {hasPermission(currentUser.role, 'classrooms:update') && (
                  <th className="text-right px-5 py-3 text-xs font-semibold text-warm-gray-600 uppercase tracking-wide">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-100">
              {classrooms.map((classroom) => (
                <tr key={classroom.id} className="hover:bg-cream-50/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-warm-gray-900">{classroom.site.name}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-700">
                      {PROGRAM_SILO_LABELS[classroom.programSilo]}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-warm-gray-700">
                    {classroom.classroomNumber ?? <span className="text-warm-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3.5 text-warm-gray-700">
                    {formatGradeRange(classroom.gradeStart, classroom.gradeEnd)}
                  </td>
                  <td className="px-4 py-3.5 text-warm-gray-700">
                    {SESSION_TYPE_LABELS[classroom.sessionType]}
                  </td>
                  <td className="px-4 py-3.5 text-warm-gray-700">
                    {classroom.sessionNumber ?? <span className="text-warm-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    {classroom.isOpenPosition ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        OPEN
                      </span>
                    ) : classroom.teacher ? (
                      <span className="text-warm-gray-900">{classroom.teacher.name}</span>
                    ) : (
                      <span className="text-warm-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-warm-gray-700">
                    {classroom.paras.length > 0 ? (
                      <span className="text-xs">{classroom.paras.length} staff</span>
                    ) : (
                      <span className="text-warm-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-warm-gray-700">
                    {classroom.positionControlNumber ?? <span className="text-warm-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3.5 text-right text-warm-gray-700">
                    {classroom._count.studentPlacements}
                  </td>
                  <td className="px-4 py-3.5 text-right text-warm-gray-700">
                    {classroom.maxCapacity ?? <span className="text-warm-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3.5 text-warm-gray-500 text-xs">
                    {classroom.schoolYear}
                  </td>
                  {hasPermission(currentUser.role, 'classrooms:update') && (
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditModal(classroom)}>
                          Edit
                        </Button>
                        {hasPermission(currentUser.role, 'classrooms:delete') && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => handleDelete(classroom)}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {classrooms.length === 0 && (
            <div className="text-center py-12 text-warm-gray-400 text-sm">No classrooms found</div>
          )}
        </div>
      </div>

      {/* Add Classroom Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Classroom</DialogTitle>
            <DialogDescription>Enter classroom details below.</DialogDescription>
          </DialogHeader>
          <ClassroomForm
            formData={formData}
            setFormData={setFormData}
            sites={sites}
            teachers={teachers}
            supportStaff={supportStaff}
            error={error}
            submitting={submitting}
            onSubmit={handleSubmit}
            onCancel={() => { setShowAddModal(false); setError(null) }}
            submitLabel="Create Classroom"
            submittingLabel="Creating..."
          />
        </DialogContent>
      </Dialog>

      {/* Edit Classroom Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Classroom</DialogTitle>
            <DialogDescription>Update classroom information.</DialogDescription>
          </DialogHeader>
          <ClassroomForm
            formData={formData}
            setFormData={setFormData}
            sites={sites}
            teachers={teachers}
            supportStaff={supportStaff}
            error={error}
            submitting={submitting}
            onSubmit={handleEditSubmit}
            onCancel={() => { setShowEditModal(false); setEditingClassroom(null); setError(null) }}
            submitLabel="Update Classroom"
            submittingLabel="Updating..."
          />
        </DialogContent>
      </Dialog>
    </>
  )
}

// ==================== Shared Form Component ====================

interface ClassroomFormProps {
  formData: ClassroomFormData
  setFormData: (data: ClassroomFormData) => void
  sites: Site[]
  teachers: StaffOption[]
  supportStaff: StaffOption[]
  error: string | null
  submitting: boolean
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  submitLabel: string
  submittingLabel: string
}

function ClassroomForm({
  formData,
  setFormData,
  sites,
  teachers,
  supportStaff,
  error,
  submitting,
  onSubmit,
  onCancel,
  submitLabel,
  submittingLabel,
}: ClassroomFormProps) {
  const set = (patch: Partial<ClassroomFormData>) => setFormData({ ...formData, ...patch })

  const toggleSupportStaff = (id: string) => {
    const current = formData.supportStaffIds
    const updated = current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    set({ supportStaffIds: updated })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Program Silo */}
        <div className="space-y-2">
          <Label htmlFor="cls-silo">Program Silo *</Label>
          <Select value={formData.programSilo} onValueChange={(v) => set({ programSilo: v as ProgramSilo })}>
            <SelectTrigger id="cls-silo"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PROGRAM_SILO_VALUES.map((silo) => (
                <SelectItem key={silo} value={silo}>{PROGRAM_SILO_LABELS[silo]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* School Year */}
        <div className="space-y-2">
          <Label htmlFor="cls-school-year">School Year *</Label>
          <Select value={formData.schoolYear} onValueChange={(v) => set({ schoolYear: v })}>
            <SelectTrigger id="cls-school-year"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SCHOOL_YEARS.map((year) => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Site */}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="cls-site">Site *</Label>
          <Select value={formData.siteId || 'none'} onValueChange={(v) => set({ siteId: v === 'none' ? '' : v })}>
            <SelectTrigger id="cls-site"><SelectValue placeholder="Select site..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none" disabled>Select site...</SelectItem>
              {sites.map((site) => (
                <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Classroom Number */}
        <div className="space-y-2">
          <Label htmlFor="cls-room-number">Classroom #</Label>
          <Input
            id="cls-room-number"
            value={formData.classroomNumber}
            onChange={(e) => set({ classroomNumber: e.target.value })}
            placeholder="e.g. 12, B-4"
          />
        </div>

        {/* Session Type */}
        <div className="space-y-2">
          <Label htmlFor="cls-session-type">Session Type *</Label>
          <Select value={formData.sessionType} onValueChange={(v) => set({ sessionType: v as SessionType })}>
            <SelectTrigger id="cls-session-type"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SESSION_TYPE_VALUES.map((st) => (
                <SelectItem key={st} value={st}>{SESSION_TYPE_LABELS[st]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Grade Start */}
        <div className="space-y-2">
          <Label htmlFor="cls-grade-start">Grade Start *</Label>
          <Select value={formData.gradeStart} onValueChange={(v) => set({ gradeStart: v })}>
            <SelectTrigger id="cls-grade-start"><SelectValue /></SelectTrigger>
            <SelectContent>
              {GRADE_VALUES.map((g) => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Grade End */}
        <div className="space-y-2">
          <Label htmlFor="cls-grade-end">Grade End *</Label>
          <Select value={formData.gradeEnd} onValueChange={(v) => set({ gradeEnd: v })}>
            <SelectTrigger id="cls-grade-end"><SelectValue /></SelectTrigger>
            <SelectContent>
              {GRADE_VALUES.map((g) => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Session Number */}
        <div className="space-y-2">
          <Label htmlFor="cls-session-number">Session #</Label>
          <Input
            id="cls-session-number"
            value={formData.sessionNumber}
            onChange={(e) => set({ sessionNumber: e.target.value })}
            placeholder="e.g. 1, 2A"
          />
        </div>

        {/* Position Control Number */}
        <div className="space-y-2">
          <Label htmlFor="cls-pcn">Position Control #</Label>
          <Input
            id="cls-pcn"
            value={formData.positionControlNumber}
            onChange={(e) => set({ positionControlNumber: e.target.value })}
            placeholder="e.g. 1234"
          />
        </div>

        {/* Credentials */}
        <div className="space-y-2">
          <Label htmlFor="cls-credentials">Credentials</Label>
          <Input
            id="cls-credentials"
            value={formData.credentials}
            onChange={(e) => set({ credentials: e.target.value })}
            placeholder="e.g. Mild/Mod"
          />
        </div>

        {/* Max Capacity */}
        <div className="space-y-2">
          <Label htmlFor="cls-max-capacity">Max Capacity</Label>
          <Input
            id="cls-max-capacity"
            type="number"
            min={1}
            value={formData.maxCapacity}
            onChange={(e) => set({ maxCapacity: e.target.value })}
            placeholder="e.g. 10"
          />
        </div>

        {/* Teacher */}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="cls-teacher">Teacher</Label>
          <Select value={formData.teacherId || 'none'} onValueChange={(v) => set({ teacherId: v === 'none' ? '' : v })}>
            <SelectTrigger id="cls-teacher"><SelectValue placeholder="Select teacher..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No teacher assigned</SelectItem>
              {teachers.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}{t.positionControlNumber ? ` (PC# ${t.positionControlNumber})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Support Staff */}
        {supportStaff.length > 0 && (
          <div className="space-y-2 md:col-span-2">
            <Label>Support Staff</Label>
            <div className="border border-slate-200 rounded-xl bg-slate-50 max-h-40 overflow-y-auto p-2 space-y-1">
              {supportStaff.map((s) => (
                <label key={s.id} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-100 cursor-pointer text-sm text-warm-gray-800">
                  <input
                    type="checkbox"
                    checked={formData.supportStaffIds.includes(s.id)}
                    onChange={() => toggleSupportStaff(s.id)}
                    className="rounded border-cream-300"
                  />
                  <span>{s.name}</span>
                  <span className="ml-auto text-xs text-warm-gray-400">{SUPPORT_ROLE_LABELS[s.role] ?? s.role}</span>
                </label>
              ))}
            </div>
            {formData.supportStaffIds.length > 0 && (
              <p className="text-xs text-warm-gray-500">{formData.supportStaffIds.length} staff member{formData.supportStaffIds.length !== 1 ? 's' : ''} selected</p>
            )}
          </div>
        )}

        {/* Open Position */}
        <div className="md:col-span-2">
          <label className="flex items-center gap-2 text-sm text-warm-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={formData.isOpenPosition}
              onChange={(e) => set({ isOpenPosition: e.target.checked })}
              className="rounded border-cream-300"
            />
            Mark as Open Position
          </label>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting || !formData.siteId}>
          {submitting ? submittingLabel : submitLabel}
        </Button>
      </DialogFooter>
    </form>
  )
}
