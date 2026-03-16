'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth/hooks'
import { hasPermission } from '@/lib/auth/permissions'
import { DISTRICTS } from '@/lib/constants/districts'
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
import { toast } from 'sonner'

type Site = {
  id: string
  name: string
  district: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const cardClass = 'bg-white rounded-2xl border border-cream-200 overflow-hidden'
const cardShadow = { boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }

export function SitesTab() {
  const { user: currentUser } = useAuth()

  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingSite, setEditingSite] = useState<Site | null>(null)
  const [nameInput, setNameInput] = useState('')
  const [districtInput, setDistrictInput] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchSites = useCallback(async () => {
    try {
      const response = await fetch('/api/sites')
      if (response.ok) {
        const data = await response.json()
        setSites(data.sites)
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to load sites')
      }
    } catch {
      toast.error('Failed to load sites')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (currentUser && hasPermission(currentUser.role, 'classrooms:view')) {
      fetchSites()
    } else {
      setLoading(false)
    }
  }, [currentUser, fetchSites])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = nameInput.trim()
    if (!name) return
    setSubmitting(true)
    try {
      const response = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, district: districtInput || null }),
      })
      const data = await response.json()
      if (response.ok) {
        toast.success(`Site "${name}" created`)
        setShowAddModal(false)
        setNameInput('')
        setDistrictInput('')
        fetchSites()
      } else {
        toast.error(data.error || 'Failed to create site')
      }
    } catch {
      toast.error('Failed to create site')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingSite) return
    const name = nameInput.trim()
    if (!name) return
    setSubmitting(true)
    try {
      const response = await fetch(`/api/sites/${editingSite.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, district: districtInput || null }),
      })
      const data = await response.json()
      if (response.ok) {
        toast.success(`Site "${name}" updated`)
        setShowEditModal(false)
        setEditingSite(null)
        setNameInput('')
        setDistrictInput('')
        fetchSites()
      } else {
        toast.error(data.error || 'Failed to update site')
      }
    } catch {
      toast.error('Failed to update site')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (site: Site) => {
    try {
      const response = await fetch(`/api/sites/${site.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !site.isActive }),
      })
      const data = await response.json()
      if (response.ok) {
        toast.success(`Site "${site.name}" ${!site.isActive ? 'activated' : 'deactivated'}`)
        fetchSites()
      } else {
        toast.error(data.error || 'Failed to update site')
      }
    } catch {
      toast.error('Failed to update site')
    }
  }

  const handleDelete = async (site: Site) => {
    if (!confirm(`Delete "${site.name}"? This cannot be undone.`)) return
    try {
      const response = await fetch(`/api/sites/${site.id}`, { method: 'DELETE' })
      const data = await response.json()
      if (response.ok) {
        toast.success(`Site "${site.name}" deleted`)
        fetchSites()
      } else {
        toast.error(data.error || 'Failed to delete site')
      }
    } catch {
      toast.error('Failed to delete site')
    }
  }

  const openEditModal = (site: Site) => {
    setEditingSite(site)
    setNameInput(site.name)
    setDistrictInput(site.district ?? '')
    setShowEditModal(true)
  }

  const openAddModal = () => {
    setNameInput('')
    setDistrictInput('')
    setShowAddModal(true)
  }

  const canManage = currentUser ? hasPermission(currentUser.role, 'sites:manage') : false

  if (!currentUser || !hasPermission(currentUser.role, 'classrooms:view')) return null

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-cream-200 border-t-sky-500" />
      </div>
    )
  }

  return (
    <>
      <div className={cardClass} style={cardShadow}>
        {/* Card header */}
        <div className="px-5 py-4 border-b border-cream-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-warm-gray-900">Sites</p>
            <p className="text-xs text-warm-gray-500 mt-0.5">
              Manage school sites. Sites are used when assigning classrooms and placements.
            </p>
          </div>
          {canManage && (
            <Button onClick={openAddModal} className="shrink-0">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Site
            </Button>
          )}
        </div>

        {/* Sites table */}
        <div className="divide-y divide-cream-100">
          {sites.map((site) => (
            <div
              key={site.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 hover:bg-cream-50/60 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-warm-gray-900">{site.name}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        site.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-warm-gray-100 text-warm-gray-600'
                      }`}
                    >
                      {site.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {site.district && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-700">
                        {site.district}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {canManage && (
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => openEditModal(site)}>
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(site)}
                  >
                    {site.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:border-red-300"
                    onClick={() => handleDelete(site)}
                  >
                    Delete
                  </Button>
                </div>
              )}
            </div>
          ))}

          {sites.length === 0 && (
            <div className="text-center py-12 text-warm-gray-400 text-sm">
              No sites configured yet.
            </div>
          )}
        </div>
      </div>

      {/* Add site dialog */}
      <Dialog open={showAddModal} onOpenChange={(open) => { setShowAddModal(open); if (!open) { setNameInput(''); setDistrictInput('') } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Site</DialogTitle>
            <DialogDescription>Enter a name and district for the new school site.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="site-name">Site Name *</Label>
              <Input
                id="site-name"
                required
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="e.g., Sutter Middle School"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="site-district">District</Label>
              <Select value={districtInput || 'none'} onValueChange={(v) => setDistrictInput(v === 'none' ? '' : v)}>
                <SelectTrigger id="site-district">
                  <SelectValue placeholder="Select district..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No district</SelectItem>
                  {DISTRICTS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setShowAddModal(false); setNameInput(''); setDistrictInput('') }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !nameInput.trim()}>
                {submitting ? 'Creating…' : 'Create Site'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit site dialog */}
      <Dialog open={showEditModal} onOpenChange={(open) => { setShowEditModal(open); if (!open) { setEditingSite(null); setNameInput(''); setDistrictInput('') } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Site</DialogTitle>
            <DialogDescription>Update the site name and district.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-site-name">Site Name *</Label>
              <Input
                id="edit-site-name"
                required
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="e.g., Sutter Middle School"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-site-district">District</Label>
              <Select value={districtInput || 'none'} onValueChange={(v) => setDistrictInput(v === 'none' ? '' : v)}>
                <SelectTrigger id="edit-site-district">
                  <SelectValue placeholder="Select district..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No district</SelectItem>
                  {DISTRICTS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setShowEditModal(false); setEditingSite(null); setNameInput(''); setDistrictInput('') }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !nameInput.trim()}>
                {submitting ? 'Saving…' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
