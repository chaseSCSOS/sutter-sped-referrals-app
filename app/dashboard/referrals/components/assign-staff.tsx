'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface StaffUser {
  id: string
  name: string
  role: string
}

interface AssignStaffProps {
  referralId: string
  currentStaffId?: string | null
  currentStaffName?: string | null
}

export default function AssignStaff({ referralId, currentStaffId, currentStaffName }: AssignStaffProps) {
  const [staffList, setStaffList] = useState<StaffUser[]>([])
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const [selectedId, setSelectedId] = useState(currentStaffId || '')
  const router = useRouter()

  useEffect(() => {
    async function fetchStaff() {
      try {
        const responses = await Promise.all([
          fetch('/api/users?role=SPED_STAFF'),
          fetch('/api/users?role=ADMIN'),
          fetch('/api/users?role=SUPER_ADMIN'),
        ])
        const allUsers: StaffUser[] = []
        for (const res of responses) {
          if (res.ok) {
            const data = await res.json()
            allUsers.push(...(data.users || []))
          }
        }
        // Deduplicate by id
        const unique = Array.from(new Map(allUsers.map((u) => [u.id, u])).values())
        setStaffList(unique.sort((a, b) => a.name.localeCompare(b.name)))
      } catch {
        console.error('Failed to fetch staff list')
      } finally {
        setLoading(false)
      }
    }
    fetchStaff()
  }, [])

  const handleAssign = async () => {
    if (!selectedId || selectedId === currentStaffId) return
    setAssigning(true)
    try {
      const res = await fetch(`/api/referrals/${referralId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId: selectedId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to assign staff')
      }
      toast.success('Staff member assigned successfully')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setAssigning(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-9 bg-cream-100 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-warm-gray-700">Assign Staff</label>
      <div className="flex gap-2">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="flex-1 rounded-xl border border-cream-200 bg-white px-3 py-2 text-sm text-warm-gray-800 shadow-sm transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200/70 focus:outline-none"
        >
          <option value="">Unassigned</option>
          {staffList.map((staff) => (
            <option key={staff.id} value={staff.id}>
              {staff.name}
            </option>
          ))}
        </select>
        <button
          onClick={handleAssign}
          disabled={assigning || !selectedId || selectedId === currentStaffId}
          className="px-3 py-2 bg-sky-600 text-white rounded-xl text-sm font-medium hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {assigning ? '...' : 'Assign'}
        </button>
      </div>
      {currentStaffName && (
        <p className="text-xs text-warm-gray-500">
          Currently assigned to <span className="font-medium text-warm-gray-700">{currentStaffName}</span>
        </p>
      )}
    </div>
  )
}
