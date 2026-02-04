'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/hooks'
import { hasPermission } from '@/lib/auth/permissions'
import { useRouter } from 'next/navigation'

type User = {
  id: string
  email: string
  name: string
  role: string
  organization: string | null
  phoneNumber: string | null
  jobTitle: string | null
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
}

export default function UsersPage() {
  const { user: currentUser, loading: authLoading } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'TEACHER' as 'EXTERNAL_ORG' | 'TEACHER' | 'SPED_STAFF' | 'ADMIN',
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

  useEffect(() => {
    if (currentUser && hasPermission(currentUser.role, 'users:view')) {
      fetchUsers()
    }
  }, [currentUser, filterRole, searchQuery])

  const fetchUsers = async () => {
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
  }

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
        setSuccess(`User ${formData.name} created successfully!`)
        setShowAddModal(false)
        setFormData({
          email: '',
          name: '',
          role: 'TEACHER',
          organization: '',
          phoneNumber: '',
          jobTitle: '',
        })
        fetchUsers()
      } else {
        setError(data.error || 'Failed to create user')
      }
    } catch (err) {
      setError('An error occurred while creating the user')
    } finally {
      setSubmitting(false)
    }
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
    } catch (err) {
      setError('An error occurred while updating user status')
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage-600"></div>
      </div>
    )
  }

  if (!currentUser || !hasPermission(currentUser.role, 'users:view')) {
    return null
  }

  const roleLabels: Record<string, string> = {
    EXTERNAL_ORG: 'External Organization',
    TEACHER: 'Teacher',
    SPED_STAFF: 'SPED Staff',
    ADMIN: 'Administrator',
    SUPER_ADMIN: 'Super Administrator',
  }

  const roleColors: Record<string, string> = {
    EXTERNAL_ORG: 'bg-teal-100 text-teal-700',
    TEACHER: 'bg-sky-100 text-sky-700',
    SPED_STAFF: 'bg-sage-100 text-sage-700',
    ADMIN: 'bg-coral-100 text-coral-700',
    SUPER_ADMIN: 'bg-warm-gray-800 text-white',
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-warm-gray-900">User Management</h1>
        <p className="text-warm-gray-600 mt-1">Manage system users and permissions</p>
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

      <div className="bg-white rounded-xl border border-cream-200 shadow-sm">
        <div className="p-6 border-b border-cream-200">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex-1 flex flex-col sm:flex-row gap-3 w-full">
              <input
                type="text"
                placeholder="Search by name, email, or organization..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage-500"
              />
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-4 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage-500"
              >
                <option value="">All Roles</option>
                <option value="EXTERNAL_ORG">External Organization</option>
                <option value="TEACHER">Teacher</option>
                <option value="SPED_STAFF">SPED Staff</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </div>
            {hasPermission(currentUser.role, 'users:create') && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-sage-600 text-white rounded-lg hover:bg-sage-700 transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add User
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-cream-50 border-b border-cream-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-warm-gray-700 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-warm-gray-700 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-warm-gray-700 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-warm-gray-700 uppercase tracking-wider">
                  Organization
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-warm-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-warm-gray-700 uppercase tracking-wider">
                  Last Login
                </th>
                {hasPermission(currentUser.role, 'users:update') && (
                  <th className="px-6 py-3 text-left text-xs font-semibold text-warm-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-cream-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-warm-gray-900">{user.name}</div>
                    {user.jobTitle && (
                      <div className="text-sm text-warm-gray-500">{user.jobTitle}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-warm-gray-600">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${roleColors[user.role]}`}>
                      {roleLabels[user.role]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-warm-gray-600">
                    {user.organization || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        user.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-warm-gray-100 text-warm-gray-600'
                      }`}
                    >
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-warm-gray-600">
                    {user.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleDateString()
                      : 'Never'}
                  </td>
                  {hasPermission(currentUser.role, 'users:update') && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => toggleUserStatus(user.id, user.isActive)}
                        className="text-sage-600 hover:text-sage-800 font-medium"
                      >
                        {user.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <div className="text-center py-12 text-warm-gray-500">
              No users found
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-warm-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-cream-200">
              <h2 className="text-2xl font-bold text-warm-gray-900">Add New User</h2>
              <p className="text-warm-gray-600 mt-1">Create a new user account</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                    Role *
                  </label>
                  <select
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage-500"
                  >
                    <option value="TEACHER">Teacher</option>
                    <option value="SPED_STAFF">SPED Staff</option>
                    <option value="ADMIN">Administrator</option>
                    <option value="EXTERNAL_ORG">External Organization</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                    Organization
                  </label>
                  <input
                    type="text"
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                    className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                    Job Title
                  </label>
                  <input
                    type="text"
                    value={formData.jobTitle}
                    onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                    className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setError(null)
                  }}
                  className="flex-1 px-4 py-2 border border-cream-300 text-warm-gray-700 rounded-lg hover:bg-cream-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-sage-600 text-white rounded-lg hover:bg-sage-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
