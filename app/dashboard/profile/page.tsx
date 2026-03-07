'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth/hooks'

export default function ProfilePage() {
  const { user } = useAuth()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [form, setForm] = useState({
    name: '',
    organization: '',
    jobTitle: '',
    phoneNumber: '',
  })

  if (!user) return null

  const startEditing = () => {
    setForm({
      name: user.name || '',
      organization: user.organization || '',
      jobTitle: user.jobTitle || '',
      phoneNumber: user.phoneNumber || '',
    })
    setEditing(true)
    setMessage(null)
  }

  const cancelEditing = () => {
    setEditing(false)
    setMessage(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update profile')
      }
      setEditing(false)
      setMessage({ type: 'success', text: 'Profile updated successfully. Refresh to see changes.' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  const fieldClass =
    'w-full rounded-xl border border-cream-200 bg-white px-4 py-2.5 text-sm text-warm-gray-800 shadow-sm transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200/70 focus:outline-none'

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-warm-gray-900 mb-8">Profile</h1>

      {message && (
        <div
          className={`mb-4 p-3 rounded-xl text-sm ${
            message.type === 'success'
              ? 'bg-sage-50 border border-sage-200 text-sage-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-6 border border-cream-200 space-y-6">
        {/* Profile header */}
        <div className="flex items-center gap-4 pb-6 border-b border-cream-200">
          <div className="w-20 h-20 bg-sky-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
            {(editing ? form.name : user.name).charAt(0).toUpperCase()}
          </div>
          <div>
            {editing ? (
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={`${fieldClass} text-lg font-bold`}
                placeholder="Full Name"
              />
            ) : (
              <>
                <h2 className="text-2xl font-bold text-warm-gray-900">{user.name}</h2>
                <p className="text-warm-gray-600">{user.email}</p>
              </>
            )}
          </div>
        </div>

        {/* Profile details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-warm-gray-700 mb-1">Role</label>
            <p className="text-warm-gray-900">{user.role.replace('_', ' ')}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-warm-gray-700 mb-1">Organization</label>
            {editing ? (
              <input
                value={form.organization}
                onChange={(e) => setForm({ ...form, organization: e.target.value })}
                className={fieldClass}
                placeholder="Organization"
              />
            ) : (
              <p className="text-warm-gray-900">{user.organization || '—'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-warm-gray-700 mb-1">Job Title</label>
            {editing ? (
              <input
                value={form.jobTitle}
                onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                className={fieldClass}
                placeholder="Job Title"
              />
            ) : (
              <p className="text-warm-gray-900">{user.jobTitle || '—'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-warm-gray-700 mb-1">Phone Number</label>
            {editing ? (
              <input
                value={form.phoneNumber}
                onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                className={fieldClass}
                placeholder="(555) 123-4567"
              />
            ) : (
              <p className="text-warm-gray-900">{user.phoneNumber || '—'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-warm-gray-700 mb-1">Account Status</label>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                user.isActive ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {user.isActive ? 'Active' : 'Pending Approval'}
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-warm-gray-700 mb-1">Member Since</label>
            <p className="text-warm-gray-900">
              {new Date(user.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          {user.lastLoginAt && (
            <div>
              <label className="block text-sm font-medium text-warm-gray-700 mb-1">Last Login</label>
              <p className="text-warm-gray-900">
                {new Date(user.lastLoginAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="pt-6 border-t border-cream-200 flex gap-3">
          {editing ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="px-5 py-2.5 bg-sky-600 text-white rounded-xl font-medium hover:bg-sky-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={cancelEditing}
                disabled={saving}
                className="px-5 py-2.5 bg-white text-warm-gray-700 rounded-xl font-medium border border-cream-200 hover:bg-cream-50 transition-colors text-sm"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={startEditing}
              className="px-5 py-2.5 bg-sky-600 text-white rounded-xl font-medium hover:bg-sky-700 transition-colors text-sm"
            >
              Edit Profile
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
