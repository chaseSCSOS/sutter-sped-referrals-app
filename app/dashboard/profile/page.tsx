'use client'

import { useAuth } from '@/lib/auth/hooks'
import { formatDate } from '@/lib/utils'

export default function ProfilePage() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Profile</h1>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 space-y-6">
        {/* Profile header */}
        <div className="flex items-center gap-4 pb-6 border-b">
          <div className="w-20 h-20 bg-sky-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
            <p className="text-gray-600">{user.email}</p>
          </div>
        </div>

        {/* Profile details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <p className="text-gray-900">
              {user.role.replace('_', ' ')}
            </p>
          </div>

          {user.organization && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organization
              </label>
              <p className="text-gray-900">{user.organization}</p>
            </div>
          )}

          {user.jobTitle && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Title
              </label>
              <p className="text-gray-900">{user.jobTitle}</p>
            </div>
          )}

          {user.phoneNumber && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <p className="text-gray-900">{user.phoneNumber}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Status
            </label>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                user.isActive
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {user.isActive ? 'Active' : 'Pending Approval'}
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Member Since
            </label>
            <p className="text-gray-900">
              {new Date(user.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          {user.lastLoginAt && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Login
              </label>
              <p className="text-gray-900">
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

        {/* Edit profile button - placeholder for future */}
        <div className="pt-6 border-t">
          <button
            disabled
            className="px-4 py-2 bg-gray-300 text-gray-500 rounded-xl cursor-not-allowed"
            title="Profile editing coming soon"
          >
            Edit Profile (Coming Soon)
          </button>
        </div>
      </div>
    </div>
  )
}
