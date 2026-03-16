'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth/hooks'
import { hasPermission } from '@/lib/auth/permissions'
import { SCHOOL_YEARS, getCurrentSchoolYear } from '@/lib/school-year'
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
import type { StaffRole } from '@prisma/client'

type StaffMember = {
  id: string
  name: string
  role: StaffRole
  positionControlNumber: string | null
  credentials: string | null
  isVacancy: boolean
  isActive: boolean
  schoolYear: string
  classroomId: string | null
  classroom: {
    id: string
    programSilo: string
    gradeStart: string
    gradeEnd: string
    site: { id: string; name: string }
  } | null
  createdAt: string
  updatedAt: string
}

type StaffFormData = {
  name: string
  role: StaffRole
  positionControlNumber: string
  credentials: string
  schoolYear: string
}

const STAFF_ROLE_VALUES: StaffRole[] = [
  'TEACHER',
  'CLASS_PARA',
  'ONE_TO_ONE_PARA',
  'INTERPRETER',
  'SIGNING_PARA',
  'LVN',
]

const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  TEACHER: 'Teacher',
  CLASS_PARA: 'Class Paraeducator',
  ONE_TO_ONE_PARA: '1:1 Paraeducator',
  INTERPRETER: 'Interpreter',
  SIGNING_PARA: 'Signing Para',
  LVN: 'LVN',
}

const ROLE_BADGE_COLORS: Record<StaffRole, string> = {
  TEACHER: 'bg-sky-100 text-sky-700',
  CLASS_PARA: 'bg-sage-100 text-sage-700',
  ONE_TO_ONE_PARA: 'bg-purple-100 text-purple-700',
  INTERPRETER: 'bg-amber-100 text-amber-700',
  SIGNING_PARA: 'bg-teal-100 text-teal-700',
  LVN: 'bg-coral-100 text-coral-700',
}

const cardClass = 'bg-white rounded-2xl border border-cream-200 overflow-hidden'
const cardShadow = { boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }

const DEFAULT_FORM: StaffFormData = {
  name: '',
  role: 'TEACHER',
  positionControlNumber: '',
  credentials: '',
  schoolYear: getCurrentSchoolYear(),
}

export function StaffTab() {
  const { user: currentUser } = useAuth()

  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null)
  const [formData, setFormData] = useState<StaffFormData>(DEFAULT_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Filters
  const [filterSchoolYear, setFilterSchoolYear] = useState(getCurrentSchoolYear())
  const [filterRole, setFilterRole] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [showVacanciesOnly, setShowVacanciesOnly] = useState(false)

  const fetchStaff = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterSchoolYear) params.append('schoolYear', filterSchoolYear)
      if (filterRole) params.append('role', filterRole)
      // Fetch all active/inactive based on filter; we'll filter vacancies client-side
      const response = await fetch(`/api/staff?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setStaffMembers(data.staffMembers ?? [])
      }
    } catch (err) {
      console.error('Error fetching staff:', err)
    } finally {
      setLoading(false)
    }
  }, [filterSchoolYear, filterRole])

  useEffect(() => {
    if (currentUser && hasPermission(currentUser.role, 'staff:view')) {
      fetchStaff()
    } else {
      setLoading(false)
    }
  }, [currentUser, fetchStaff])

  const visibleStaff = staffMembers.filter((m) => {
    if (!showInactive && !m.isActive) return false
    if (showVacanciesOnly && !m.isVacancy) return false
    return true
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          role: formData.role,
          positionControlNumber: formData.positionControlNumber || undefined,
          credentials: formData.credentials || undefined,
          schoolYear: formData.schoolYear,
        }),
      })
      const data = await response.json()
      if (response.ok) {
        setSuccess(`Staff member "${formData.name}" created successfully.`)
        setShowAddModal(false)
        setFormData(DEFAULT_FORM)
        fetchStaff()
      } else {
        setError(data.error || 'Failed to create staff member')
      }
    } catch {
      setError('An error occurred while creating the staff member')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMember) return
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch(`/api/staff/${editingMember.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          role: formData.role,
          positionControlNumber: formData.positionControlNumber || null,
          credentials: formData.credentials || null,
          schoolYear: formData.schoolYear,
        }),
      })
      const data = await response.json()
      if (response.ok) {
        setSuccess(`Staff member "${formData.name}" updated successfully.`)
        setShowEditModal(false)
        setEditingMember(null)
        fetchStaff()
      } else {
        setError(data.error || 'Failed to update staff member')
      }
    } catch {
      setError('An error occurred while updating the staff member')
    } finally {
      setSubmitting(false)
    }
  }

  const openEditModal = (member: StaffMember) => {
    setEditingMember(member)
    setFormData({
      name: member.name,
      role: member.role,
      positionControlNumber: member.positionControlNumber ?? '',
      credentials: member.credentials ?? '',
      schoolYear: member.schoolYear,
    })
    setShowEditModal(true)
  }

  const handleToggleActive = async (member: StaffMember) => {
    try {
      const response = await fetch(`/api/staff/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !member.isActive }),
      })
      if (response.ok) {
        setSuccess('Staff member status updated.')
        fetchStaff()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to update staff member')
      }
    } catch {
      setError('An error occurred while updating the staff member')
    }
  }

  const handleDelete = async (member: StaffMember) => {
    const msg = member.isActive && !member.isVacancy && member.positionControlNumber
      ? `Delete "${member.name}"? A vacancy record will be auto-created for PC# ${member.positionControlNumber}.`
      : `Delete "${member.name}"? This cannot be undone.`
    if (!confirm(msg)) return
    try {
      const response = await fetch(`/api/staff/${member.id}`, { method: 'DELETE' })
      if (response.ok) {
        setSuccess(`"${member.name}" deleted.`)
        fetchStaff()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to delete staff member')
      }
    } catch {
      setError('An error occurred while deleting the staff member')
    }
  }

  if (!currentUser || !hasPermission(currentUser.role, 'staff:view')) return null

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-cream-200 border-t-sky-500" />
      </div>
    )
  }

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
            <p className="text-sm font-semibold text-warm-gray-900">Staff Members</p>
            <p className="text-xs text-warm-gray-500 mt-0.5">
              Manage staff records, vacancies, and position control assignments.
            </p>
          </div>
          {hasPermission(currentUser.role, 'staff:manage') && (
            <Button
              onClick={() => { setFormData(DEFAULT_FORM); setShowAddModal(true) }}
              className="shrink-0"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Staff Member
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="px-5 py-3 border-b border-cream-200 flex flex-wrap gap-3 items-center">
          {/* School Year */}
          <Select value={filterSchoolYear || 'all'} onValueChange={(v) => setFilterSchoolYear(v === 'all' ? '' : v)}>
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

          {/* Role filter */}
          <Select value={filterRole || 'all'} onValueChange={(v) => setFilterRole(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {STAFF_ROLE_VALUES.map((role) => (
                <SelectItem key={role} value={role}>{STAFF_ROLE_LABELS[role]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Show Inactive toggle */}
          <label className="flex items-center gap-2 text-sm text-warm-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-cream-300"
            />
            Show Inactive
          </label>

          {/* Vacancies Only toggle */}
          <label className="flex items-center gap-2 text-sm text-warm-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showVacanciesOnly}
              onChange={(e) => setShowVacanciesOnly(e.target.checked)}
              className="rounded border-cream-300"
            />
            Vacancies Only
          </label>

          <span className="ml-auto text-xs text-warm-gray-400">
            {visibleStaff.length} {visibleStaff.length === 1 ? 'record' : 'records'}
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cream-100 bg-cream-50/60">
                <th className="text-left px-5 py-3 text-xs font-semibold text-warm-gray-600 uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-warm-gray-600 uppercase tracking-wide">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-warm-gray-600 uppercase tracking-wide">PC#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-warm-gray-600 uppercase tracking-wide">School Year</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-warm-gray-600 uppercase tracking-wide">Classroom</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-warm-gray-600 uppercase tracking-wide">Status</th>
                {hasPermission(currentUser.role, 'staff:manage') && (
                  <th className="text-right px-5 py-3 text-xs font-semibold text-warm-gray-600 uppercase tracking-wide">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-100">
              {visibleStaff.map((member) => (
                <tr key={member.id} className="hover:bg-cream-50/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-warm-gray-900">{member.name}</p>
                    {member.credentials && (
                      <p className="text-xs text-warm-gray-500 mt-0.5">{member.credentials}</p>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE_COLORS[member.role]}`}>
                      {STAFF_ROLE_LABELS[member.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-warm-gray-700">
                    {member.positionControlNumber ?? <span className="text-warm-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3.5 text-warm-gray-700">{member.schoolYear}</td>
                  <td className="px-4 py-3.5 text-warm-gray-700">
                    {member.classroom
                      ? <span>{member.classroom.site.name} · {member.classroom.programSilo}</span>
                      : <span className="text-warm-gray-300">—</span>
                    }
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap gap-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        member.isActive ? 'bg-green-100 text-green-700' : 'bg-warm-gray-100 text-warm-gray-600'
                      }`}>
                        {member.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {member.isVacancy && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                          Vacancy
                        </span>
                      )}
                    </div>
                  </td>
                  {hasPermission(currentUser.role, 'staff:manage') && (
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditModal(member)}>
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleToggleActive(member)}>
                          {member.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => handleDelete(member)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {visibleStaff.length === 0 && (
            <div className="text-center py-12 text-warm-gray-400 text-sm">No staff members found</div>
          )}
        </div>
      </div>

      {/* Add Staff Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Staff Member</DialogTitle>
            <DialogDescription>Enter staff member details below.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="staff-name">Full Name *</Label>
                <Input
                  id="staff-name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-role">Role *</Label>
                <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v as StaffRole })}>
                  <SelectTrigger id="staff-role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAFF_ROLE_VALUES.map((role) => (
                      <SelectItem key={role} value={role}>{STAFF_ROLE_LABELS[role]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-school-year">School Year *</Label>
                <Select value={formData.schoolYear} onValueChange={(v) => setFormData({ ...formData, schoolYear: v })}>
                  <SelectTrigger id="staff-school-year"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SCHOOL_YEARS.map((year) => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-pcn">Position Control #</Label>
                <Input
                  id="staff-pcn"
                  value={formData.positionControlNumber}
                  onChange={(e) => setFormData({ ...formData, positionControlNumber: e.target.value })}
                  placeholder="e.g. 1234"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-credentials">Credentials</Label>
                <Input
                  id="staff-credentials"
                  value={formData.credentials}
                  onChange={(e) => setFormData({ ...formData, credentials: e.target.value })}
                  placeholder="e.g. M.A., CCC-SLP"
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowAddModal(false); setError(null) }}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Staff Member'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Staff Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
            <DialogDescription>Update staff member information.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit-staff-name">Full Name *</Label>
                <Input
                  id="edit-staff-name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-staff-role">Role *</Label>
                <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v as StaffRole })}>
                  <SelectTrigger id="edit-staff-role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAFF_ROLE_VALUES.map((role) => (
                      <SelectItem key={role} value={role}>{STAFF_ROLE_LABELS[role]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-staff-school-year">School Year *</Label>
                <Select value={formData.schoolYear} onValueChange={(v) => setFormData({ ...formData, schoolYear: v })}>
                  <SelectTrigger id="edit-staff-school-year"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SCHOOL_YEARS.map((year) => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-staff-pcn">Position Control #</Label>
                <Input
                  id="edit-staff-pcn"
                  value={formData.positionControlNumber}
                  onChange={(e) => setFormData({ ...formData, positionControlNumber: e.target.value })}
                  placeholder="e.g. 1234"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-staff-credentials">Credentials</Label>
                <Input
                  id="edit-staff-credentials"
                  value={formData.credentials}
                  onChange={(e) => setFormData({ ...formData, credentials: e.target.value })}
                  placeholder="e.g. M.A., CCC-SLP"
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setShowEditModal(false); setEditingMember(null); setError(null) }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Updating...' : 'Update Staff Member'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
