'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth/hooks'
import { hasPermission } from '@/lib/auth/permissions'
import {
  getRoleDisplayName,
  getSystemRoleOptionId,
  getSystemRoleOptions,
  SYSTEM_ROLE_LABELS,
  type RoleOptionResponse,
} from '@/lib/auth/role-options'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { UserRole } from '@prisma/client'
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

type User = {
  id: string
  email: string
  name: string
  role: UserRole
  roleOption: {
    id: string
    name: string
    baseRole: UserRole
  } | null
  organization: string | null
  phoneNumber: string | null
  jobTitle: string | null
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
}

type UserFormData = {
  email: string
  name: string
  role: UserRole
  roleOptionId: string | null
  organization: string
  phoneNumber: string
  jobTitle: string
}

export default function UsersPage() {
  const { user: currentUser, loading: authLoading } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingRoleOptions, setLoadingRoleOptions] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [roleOptions, setRoleOptions] = useState<RoleOptionResponse[]>(getSystemRoleOptions())
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    name: '',
    role: 'TEACHER',
    roleOptionId: null,
    organization: '',
    phoneNumber: '',
    jobTitle: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [filterRole, setFilterRole] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!authLoading && currentUser && !hasPermission(currentUser.role, 'users:view')) {
      router.push('/dashboard')
    }
  }, [authLoading, currentUser, router])

  const fetchUsers = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filterRole) params.append('role', filterRole)
      if (searchQuery) params.append('search', searchQuery)

      const response = await fetch(`/api/users?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
      }
    } catch (err) {
      console.error('Error fetching users:', err)
    } finally {
      setLoading(false)
    }
  }, [filterRole, searchQuery])

  const fetchRoleOptions = useCallback(async () => {
    try {
      const response = await fetch('/api/settings/user-roles')
      if (!response.ok) {
        return
      }
      const data = await response.json()
      if (Array.isArray(data.roleOptions) && data.roleOptions.length > 0) {
        setRoleOptions(data.roleOptions)
      } else {
        setRoleOptions(getSystemRoleOptions())
      }
    } catch (err) {
      console.error('Error fetching role options:', err)
      setRoleOptions(getSystemRoleOptions())
    } finally {
      setLoadingRoleOptions(false)
    }
  }, [])

  useEffect(() => {
    if (currentUser && hasPermission(currentUser.role, 'users:view')) {
      fetchUsers()
      fetchRoleOptions()
    } else {
      setLoadingRoleOptions(false)
    }
  }, [currentUser, fetchUsers, fetchRoleOptions])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        if (data.inviteSent) {
          setSuccess(`User ${formData.name} created and invitation email sent.`)
        } else if (data.warning) {
          setSuccess(`${data.warning} You can use "Resend Invite" from the user actions.`)
        } else {
          setSuccess(`User ${formData.name} created successfully.`)
        }
        setShowAddModal(false)
        setFormData({
          email: '',
          name: '',
          role: 'TEACHER',
          roleOptionId: null,
          organization: '',
          phoneNumber: '',
          jobTitle: '',
        })
        fetchUsers()
      } else {
        setError(data.error || 'Failed to create user')
      }
    } catch {
      setError('An error occurred while creating the user')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          role: formData.role,
          roleOptionId: formData.roleOptionId,
          organization: formData.organization || null,
          phoneNumber: formData.phoneNumber || null,
          jobTitle: formData.jobTitle || null,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(`User ${formData.name} updated successfully!`)
        setShowEditModal(false)
        setEditingUser(null)
        fetchUsers()
      } else {
        setError(data.error || 'Failed to update user')
      }
    } catch {
      setError('An error occurred while updating the user')
    } finally {
      setSubmitting(false)
    }
  }

  const openEditModal = (user: User) => {
    setEditingUser(user)
    setFormData({
      email: user.email,
      name: user.name,
      role: user.role,
      roleOptionId: user.roleOption?.id ?? null,
      organization: user.organization || '',
      phoneNumber: user.phoneNumber || '',
      jobTitle: user.jobTitle || '',
    })
    setShowEditModal(true)
  }

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      })

      if (response.ok) {
        setSuccess('User status updated successfully')
        fetchUsers()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to update user status')
      }
    } catch {
      setError('An error occurred while updating user status')
    }
  }

  const handleResendInvite = async (userId: string, userName: string) => {
    if (!confirm(`Resend invitation email to ${userName}?`)) return

    try {
      const response = await fetch(`/api/users/${userId}/invite`, {
        method: 'POST',
      })

      if (response.ok) {
        setSuccess(`Invitation email sent to ${userName}`)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to send invitation email')
      }
    } catch {
      setError('An error occurred while sending invitation email')
    }
  }

  const handleResetPassword = async (userId: string, userName: string) => {
    if (!confirm(`Send password reset link to ${userName}?`)) return

    try {
      const response = await fetch(`/api/users/${userId}/reset-password`, {
        method: 'POST',
      })

      if (response.ok) {
        setSuccess(`Password reset email sent to ${userName}`)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to send password reset email')
      }
    } catch {
      setError('An error occurred while resetting password')
    }
  }

  const getSelectedRoleOptionValue = (role: UserRole, roleOptionId: string | null) => {
    if (roleOptionId && roleOptions.some((option) => option.id === roleOptionId)) {
      return roleOptionId
    }
    return getSystemRoleOptionId(role)
  }

  const applyRoleSelection = (selectedOptionId: string) => {
    const selectedOption = roleOptions.find((option) => option.id === selectedOptionId)
    if (!selectedOption) return

    setFormData((prev) => ({
      ...prev,
      role: selectedOption.baseRole,
      roleOptionId: selectedOption.isSystem ? null : selectedOption.id,
    }))
  }

  if (authLoading || loading || loadingRoleOptions) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage-600"></div>
      </div>
    )
  }

  if (!currentUser || !hasPermission(currentUser.role, 'users:view')) {
    return null
  }

  const roleColors: Record<UserRole, string> = {
    EXTERNAL_ORG: 'bg-teal-100 text-teal-700',
    TEACHER: 'bg-sky-100 text-sky-700',
    SPED_STAFF: 'bg-sage-100 text-sage-700',
    ADMIN: 'bg-coral-100 text-coral-700',
    SUPER_ADMIN: 'bg-warm-gray-800 text-white',
  }

  return (
    <div className="mx-auto max-w-[1600px]">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-warm-gray-900">User Management</h1>
        <p className="text-warm-gray-600 mt-1">Create users, send onboarding emails, and manage account access.</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {success}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <CardTitle>Users</CardTitle>
              <CardDescription>Manage profiles, invitations, and password access links.</CardDescription>
            </div>
            {hasPermission(currentUser.role, 'users:create') && (
              <Button onClick={() => setShowAddModal(true)}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New User
              </Button>
            )}
          </div>
          <div className="mt-3 text-xs text-warm-gray-500">
            Resend Invite sends a setup email for first-time access. Send Reset Link emails a password reset link.
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <Input
              placeholder="Search by name, email, or organization..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Select value={filterRole || 'all'} onValueChange={(value) => setFilterRole(value === 'all' ? '' : value)}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {Object.entries(SYSTEM_ROLE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-cream-200 rounded-lg hover:bg-cream-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center text-sky-700 font-medium flex-shrink-0">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-warm-gray-900 truncate">{user.name}</h3>
                      <p className="text-sm text-warm-gray-600 truncate">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 ml-13">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${roleColors[user.role]}`}>
                      {getRoleDisplayName(user.role, user.roleOption?.name)}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        user.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-warm-gray-100 text-warm-gray-600'
                      }`}
                    >
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {user.organization && (
                      <span className="text-xs text-warm-gray-600 px-2 py-1 bg-cream-100 rounded">
                        {user.organization}
                      </span>
                    )}
                    {user.jobTitle && (
                      <span className="text-xs text-warm-gray-600 px-2 py-1 bg-cream-100 rounded">
                        {user.jobTitle}
                      </span>
                    )}
                  </div>
                </div>
                {hasPermission(currentUser.role, 'users:update') && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResendInvite(user.id, user.name)}
                    >
                      Resend Invite
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(user)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResetPassword(user.id, user.name)}
                    >
                      Send Reset Link
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleUserStatus(user.id, user.isActive)}
                    >
                      {user.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                )}
              </div>
            ))}
            {users.length === 0 && (
              <div className="text-center py-12 text-warm-gray-500">
                No users found
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create User Account</DialogTitle>
            <DialogDescription>
              Add the user details below. Saving will automatically send a setup email.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
              <p className="font-medium">What happens next</p>
              <p className="mt-1">1) Account is created 2) Invitation email is sent 3) User sets password and signs in at /auth/login.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select
                  value={getSelectedRoleOptionValue(formData.role, formData.roleOptionId)}
                  onValueChange={applyRoleSelection}
                >
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.isSystem
                          ? option.name
                          : `${option.name} (${SYSTEM_ROLE_LABELS[option.baseRole]})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="organization">Organization</Label>
                <Input
                  id="organization"
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input
                  id="jobTitle"
                  value={formData.jobTitle}
                  onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddModal(false)
                  setError(null)
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create User & Send Invite'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name *</Label>
                <Input
                  id="edit-name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-cream-50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role *</Label>
                <Select
                  value={getSelectedRoleOptionValue(formData.role, formData.roleOptionId)}
                  onValueChange={applyRoleSelection}
                >
                  <SelectTrigger id="edit-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.isSystem
                          ? option.name
                          : `${option.name} (${SYSTEM_ROLE_LABELS[option.baseRole]})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phoneNumber">Phone Number</Label>
                <Input
                  id="edit-phoneNumber"
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-organization">Organization</Label>
                <Input
                  id="edit-organization"
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-jobTitle">Job Title</Label>
                <Input
                  id="edit-jobTitle"
                  value={formData.jobTitle}
                  onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowEditModal(false)
                  setEditingUser(null)
                  setError(null)
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Updating...' : 'Update User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
