'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SYSTEM_ROLE_LABELS, USER_ROLE_VALUES } from '@/lib/auth/role-options'
import type { UserRole } from '@prisma/client'
import { UsersTab } from './users-tab'
import { SitesTab } from './sites-tab'
import { StaffTab } from './staff-tab'
import { ClassroomsTab } from './classrooms-tab'
import { EmailTemplatePreviewPanel } from './email-template-preview-panel'
import { useAuth } from '@/lib/auth/hooks'
import { hasPermission } from '@/lib/auth/permissions'

type Tab = 'email' | 'assessments' | 'userRoles' | 'users' | 'sites' | 'staff' | 'classrooms'

const ALL_TABS: { key: Tab; label: string; permission?: Parameters<typeof hasPermission>[1] }[] = [
  { key: 'email',       label: 'Email & Reminders' },
  { key: 'assessments', label: 'Assessments' },
  { key: 'userRoles',   label: 'User Roles' },
  { key: 'users',       label: 'Users' },
  { key: 'sites',       label: 'Sites', permission: 'sites:manage' },
  { key: 'staff',       label: 'Staff', permission: 'staff:view' },
  { key: 'classrooms',  label: 'Classrooms', permission: 'classrooms:view' },
]

const inputClass =
  'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-warm-gray-900 placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all outline-none'

const cardClass =
  'bg-white rounded-2xl border border-cream-200 overflow-hidden'

const cardShadow = { boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }

function SettingsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user: currentUser } = useAuth()

  const TABS = ALL_TABS.filter(t =>
    !t.permission || (currentUser && hasPermission(currentUser.role, t.permission))
  )

  const initialTab = (searchParams.get('tab') as Tab | null) ?? 'email'
  const [activeTab, setActiveTab] = useState<Tab>(
    TABS.some(t => t.key === initialTab) ? initialTab : 'email'
  )

  // Email settings state
  const [orderEmails, setOrderEmails] = useState<string[]>([])
  const [referralEmails, setReferralEmails] = useState<string[]>([])
  const [orderInput, setOrderInput] = useState('')
  const [referralInput, setReferralInput] = useState('')
  const [cumReminderDays, setCumReminderDays] = useState(10)
  const [seisAeriesReminderDays, setSeisAeriesReminderDays] = useState(5)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    fetch('/api/settings/email')
      .then(r => {
        if (r.status === 403) { router.push('/dashboard'); return null }
        return r.json()
      })
      .then(data => {
        if (!data) return
        setOrderEmails(data.orderNotifyEmails ?? [])
        setReferralEmails(data.referralNotifyEmails ?? [])
        setCumReminderDays(data.cumReminderDays ?? 10)
        setSeisAeriesReminderDays(data.seisAeriesReminderDays ?? 5)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [router])

  function addEmail(list: string[], setList: (v: string[]) => void, input: string, setInput: (v: string) => void) {
    const email = input.trim().toLowerCase()
    if (!email || !email.includes('@')) return
    if (list.includes(email)) { setInput(''); return }
    setList([...list, email])
    setInput('')
  }

  function removeEmail(list: string[], setList: (v: string[]) => void, email: string) {
    setList(list.filter(e => e !== email))
  }

  async function handleSave() {
    setSaving(true)
    setSaveError('')
    setSaveSuccess(false)
    try {
      const res = await fetch('/api/settings/email', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNotifyEmails: orderEmails,
          referralNotifyEmails: referralEmails,
          cumReminderDays,
          seisAeriesReminderDays,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        setSaveError(d.error || 'Failed to save')
      } else {
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      }
    } catch {
      setSaveError('An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-cream-200 border-t-sky-500" />
      </div>
    )
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-sky-700 mb-1">Settings</h1>
        <p className="text-warm-gray-600 text-sm">
          Manage email notifications, assessment catalog, and user role options.
        </p>
      </div>

      {/* Tab Nav — matches referral list tab style */}
      <div
        className="inline-flex items-center gap-1 bg-white rounded-2xl border border-cream-200 p-1.5"
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
      >
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-sky-700 text-white shadow-sm'
                : 'text-warm-gray-600 hover:text-warm-gray-900 hover:bg-cream-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'email' && (
        <div className="space-y-5">
          <div className="max-w-5xl space-y-5">
            <div className="grid gap-5 xl:grid-cols-2 items-start">
              <EmailRecipientCard
                title="New Order Notifications"
                description="Notified every time a new supply order is submitted."
                emails={orderEmails}
                inputValue={orderInput}
                onInputChange={setOrderInput}
                onAdd={() => addEmail(orderEmails, setOrderEmails, orderInput, setOrderInput)}
                onRemove={(email) => removeEmail(orderEmails, setOrderEmails, email)}
                inputId="order-email"
              />

              <EmailRecipientCard
                title="Referral Notifications"
                description="Notified when a new referral is submitted."
                emails={referralEmails}
                inputValue={referralInput}
                onInputChange={setReferralInput}
                onAdd={() => addEmail(referralEmails, setReferralEmails, referralInput, setReferralInput)}
                onRemove={(email) => removeEmail(referralEmails, setReferralEmails, email)}
                inputId="referral-email"
              />
            </div>

            {/* Reminder Thresholds */}
            <div className={cardClass} style={cardShadow}>
              <div className="px-5 py-4 border-b border-cream-200">
                <p className="text-sm font-semibold text-warm-gray-900">Workflow Reminder Thresholds</p>
                <p className="text-xs text-warm-gray-500 mt-0.5">Days before generating overdue alerts for CUM records and SEIS/Aeries entry.</p>
              </div>
              <div className="p-5 grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-warm-gray-600 uppercase tracking-wide mb-1.5">
                    CUM Reminder Days
                  </label>
                  <p className="text-xs text-warm-gray-500 mb-2">Alert when CUM requested but not received for this many days.</p>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={cumReminderDays}
                    onChange={e => setCumReminderDays(parseInt(e.target.value) || 10)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-warm-gray-600 uppercase tracking-wide mb-1.5">
                    SEIS / Aeries Reminder Days
                  </label>
                  <p className="text-xs text-warm-gray-500 mb-2">Alert when enrolled but not entered into SEIS or Aeries for this many days.</p>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={seisAeriesReminderDays}
                    onChange={e => setSeisAeriesReminderDays(parseInt(e.target.value) || 5)}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* Save */}
            <div className="flex items-center gap-4 pt-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-700 text-white rounded-xl hover:bg-sky-800 disabled:opacity-60 font-medium transition-colors text-sm"
              >
                {saving ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Saving…
                  </>
                ) : 'Save Settings'}
              </button>
              {saveSuccess && (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Settings saved
                </span>
              )}
              {saveError && <p className="text-sm text-red-600">{saveError}</p>}
            </div>
          </div>

          <EmailTemplatePreviewPanel />
        </div>
      )}

      {activeTab === 'assessments' && <AssessmentCatalogSettings />}
      {activeTab === 'userRoles'   && <UserRoleSettings />}
      {activeTab === 'users'       && <UsersTab />}
      {activeTab === 'sites'       && <SitesTab />}
      {activeTab === 'staff'       && <StaffTab />}
      {activeTab === 'classrooms'  && <ClassroomsTab />}
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-cream-200 border-t-sky-500" />
      </div>
    }>
      <SettingsContent />
    </Suspense>
  )
}

// ==================== EMAIL CARD ====================

interface EmailRecipientCardProps {
  title: string
  description: string
  emails: string[]
  inputValue: string
  onInputChange: (v: string) => void
  onAdd: () => void
  onRemove: (email: string) => void
  inputId: string
}

function EmailRecipientCard({
  title, description, emails, inputValue, onInputChange, onAdd, onRemove, inputId,
}: EmailRecipientCardProps) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); onAdd() }
  }

  return (
    <div className={cardClass} style={cardShadow}>
      <div className="px-5 py-4 border-b border-cream-200">
        <p className="text-sm font-semibold text-warm-gray-900">{title}</p>
        <p className="text-xs text-warm-gray-500 mt-0.5">{description}</p>
      </div>
      <div className="p-5 space-y-4">
        {emails.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {emails.map(email => (
              <span
                key={email}
                className="inline-flex items-center gap-1.5 bg-sky-50 border border-sky-200 text-sky-800 rounded-full pl-3 pr-2 py-1 text-sm font-medium"
              >
                {email}
                <button
                  onClick={() => onRemove(email)}
                  className="text-sky-400 hover:text-red-500 transition-colors rounded-full p-0.5 hover:bg-red-50"
                  aria-label={`Remove ${email}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-warm-gray-400 italic">No recipients configured.</p>
        )}
        <div className="flex gap-2">
          <input
            id={inputId}
            type="email"
            value={inputValue}
            onChange={e => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="name@example.com"
            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-warm-gray-900 placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all outline-none"
          />
          <button
            type="button"
            onClick={onAdd}
            disabled={!inputValue.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-700 text-white rounded-xl hover:bg-sky-800 disabled:opacity-40 font-medium transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add
          </button>
        </div>
      </div>
    </div>
  )
}

// ==================== USER ROLE SETTINGS ====================

interface ManagedUserRoleOption {
  id: string
  name: string
  baseRole: UserRole
  createdAt: string
}

function UserRoleSettings() {
  const [customRoleOptions, setCustomRoleOptions] = useState<ManagedUserRoleOption[]>([])
  const [newRoleName, setNewRoleName] = useState('')
  const [newBaseRole, setNewBaseRole] = useState<UserRole>('TEACHER')
  const [loadingRoleOptions, setLoadingRoleOptions] = useState(true)
  const [savingRoleOption, setSavingRoleOption] = useState(false)
  const [roleError, setRoleError] = useState('')
  const [roleSuccess, setRoleSuccess] = useState('')

  const loadRoleOptions = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/user-roles')
      if (!res.ok) {
        const data = await res.json()
        setRoleError(data.error || 'Failed to load role options')
        return
      }
      const data = await res.json()
      setCustomRoleOptions(data.customRoleOptions ?? [])
    } catch {
      setRoleError('Failed to load role options')
    } finally {
      setLoadingRoleOptions(false)
    }
  }, [])

  useEffect(() => { loadRoleOptions() }, [loadRoleOptions])

  async function addRoleOption() {
    const name = newRoleName.trim()
    if (!name) return
    setSavingRoleOption(true)
    setRoleError('')
    setRoleSuccess('')
    try {
      const res = await fetch('/api/settings/user-roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, baseRole: newBaseRole }),
      })
      if (!res.ok) {
        const data = await res.json()
        setRoleError(data.error || 'Failed to create role option')
        return
      }
      setNewRoleName('')
      setNewBaseRole('TEACHER')
      setRoleSuccess('Role option created')
      loadRoleOptions()
      setTimeout(() => setRoleSuccess(''), 3000)
    } catch {
      setRoleError('Failed to create role option')
    } finally {
      setSavingRoleOption(false)
    }
  }

  async function deleteRoleOption(id: string, name: string) {
    if (!confirm(`Delete "${name}"? Users with this custom role will fall back to their base permission role label.`)) return
    setRoleError('')
    setRoleSuccess('')
    try {
      const res = await fetch(`/api/settings/user-roles/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        setRoleError(data.error || 'Failed to delete role option')
        return
      }
      setRoleSuccess('Role option deleted')
      loadRoleOptions()
      setTimeout(() => setRoleSuccess(''), 3000)
    } catch {
      setRoleError('Failed to delete role option')
    }
  }

  if (loadingRoleOptions) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-cream-200 border-t-sky-500" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-5">
      {/* Built-in roles */}
      <div className={cardClass} style={cardShadow}>
        <div className="px-5 py-4 border-b border-cream-200">
          <p className="text-sm font-semibold text-warm-gray-900">Built-in Permission Roles</p>
          <p className="text-xs text-warm-gray-500 mt-0.5">These control permissions in the app and cannot be deleted.</p>
        </div>
        <div className="p-5">
          <div className="flex flex-wrap gap-2">
            {Object.entries(SYSTEM_ROLE_LABELS).map(([value, label]) => (
              <span
                key={value}
                className="inline-flex items-center rounded-xl bg-cream-100 border border-cream-200 px-3 py-1.5 text-xs font-medium text-warm-gray-700"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Custom role labels */}
      <div className={cardClass} style={cardShadow}>
        <div className="px-5 py-4 border-b border-cream-200">
          <p className="text-sm font-semibold text-warm-gray-900">Custom User Role Labels</p>
          <p className="text-xs text-warm-gray-500 mt-0.5">Display labels for the Users page. Each maps to a built-in permission role.</p>
        </div>
        <div className="p-5 space-y-4">
          {customRoleOptions.length > 0 ? (
            <div className="space-y-2">
              {customRoleOptions.map((option) => (
                <div
                  key={option.id}
                  className="flex items-center justify-between py-2.5 px-4 bg-slate-50 rounded-xl border border-slate-200"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-warm-gray-900">{option.name}</p>
                    <p className="text-xs text-warm-gray-500 mt-0.5">Permission level: {SYSTEM_ROLE_LABELS[option.baseRole]}</p>
                  </div>
                  <button
                    onClick={() => deleteRoleOption(option.id, option.name)}
                    className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors ml-4 shrink-0"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-warm-gray-400 italic">No custom role labels configured yet.</p>
          )}

          <div className="pt-3 border-t border-cream-100 space-y-2">
            <div className="grid sm:grid-cols-3 gap-2">
              <input
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="Label (e.g., SLP)"
                className="sm:col-span-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-warm-gray-900 placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none"
              />
              <select
                value={newBaseRole}
                onChange={(e) => setNewBaseRole(e.target.value as UserRole)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-warm-gray-900 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none"
              >
                {USER_ROLE_VALUES.map((role) => (
                  <option key={role} value={role}>{SYSTEM_ROLE_LABELS[role]}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={addRoleOption}
                disabled={!newRoleName.trim() || savingRoleOption}
                className="px-4 py-2 bg-sky-700 text-white rounded-xl hover:bg-sky-800 disabled:opacity-40 font-medium transition-colors text-sm"
              >
                {savingRoleOption ? 'Adding…' : 'Add Role Label'}
              </button>
              {roleSuccess && <p className="text-sm text-emerald-700">{roleSuccess}</p>}
              {roleError && <p className="text-sm text-red-600">{roleError}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ==================== ASSESSMENT CATALOG ====================

interface ACategory { id: string; name: string; description: string | null; sortOrder: number }
interface AVendor   { id: string; name: string; website: string | null }
interface ATest     { id: string; name: string; vendor: { name: string }; category: { name: string }; estimatedPrice: string; isPhysical: boolean; purchaseUrl: string | null }

function AssessmentCatalogSettings() {
  const [categories, setCategories] = useState<ACategory[]>([])
  const [newCatName, setNewCatName] = useState('')
  const [newCatDesc, setNewCatDesc] = useState('')
  const [savingCat, setSavingCat] = useState(false)

  const [vendors, setVendors] = useState<AVendor[]>([])
  const [newVendorName, setNewVendorName] = useState('')
  const [newVendorWebsite, setNewVendorWebsite] = useState('')
  const [savingVendor, setSavingVendor] = useState(false)

  const [tests, setTests] = useState<ATest[]>([])
  const [newTest, setNewTest] = useState({ name: '', vendorId: '', categoryId: '', purchaseUrl: '', estimatedPrice: '', isPhysical: true, notes: '' })
  const [savingTest, setSavingTest] = useState(false)

  function loadCategories() { fetch('/api/assessments/categories').then(r => r.json()).then(d => setCategories(d.categories ?? [])) }
  function loadVendors()    { fetch('/api/assessments/vendors').then(r => r.json()).then(d => setVendors(d.vendors ?? [])) }
  function loadTests()      { fetch('/api/assessments/tests').then(r => r.json()).then(d => setTests(d.tests ?? [])) }

  useEffect(() => { loadCategories(); loadVendors(); loadTests() }, [])

  async function addCategory() {
    if (!newCatName.trim()) return
    setSavingCat(true)
    await fetch('/api/assessments/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newCatName, description: newCatDesc }) })
    setNewCatName(''); setNewCatDesc('')
    loadCategories(); setSavingCat(false)
  }
  async function deleteCategory(id: string) { await fetch(`/api/assessments/categories/${id}`, { method: 'DELETE' }); loadCategories() }

  async function addVendor() {
    if (!newVendorName.trim()) return
    setSavingVendor(true)
    await fetch('/api/assessments/vendors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newVendorName, website: newVendorWebsite }) })
    setNewVendorName(''); setNewVendorWebsite('')
    loadVendors(); setSavingVendor(false)
  }
  async function deleteVendor(id: string) { await fetch(`/api/assessments/vendors/${id}`, { method: 'DELETE' }); loadVendors() }

  async function addTest() {
    if (!newTest.name.trim() || !newTest.vendorId || !newTest.categoryId) return
    setSavingTest(true)
    await fetch('/api/assessments/tests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...newTest, estimatedPrice: parseFloat(newTest.estimatedPrice) || 0 }) })
    setNewTest({ name: '', vendorId: '', categoryId: '', purchaseUrl: '', estimatedPrice: '', isPhysical: true, notes: '' })
    loadTests(); setSavingTest(false)
  }
  async function deleteTest(id: string) { await fetch(`/api/assessments/tests/${id}`, { method: 'DELETE' }); loadTests() }

  const smInput = 'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-warm-gray-900 placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none'
  const addBtn  = 'px-4 py-2 bg-sky-700 text-white rounded-xl hover:bg-sky-800 disabled:opacity-40 font-medium transition-colors text-sm shrink-0'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

      {/* Left column: Categories + Vendors */}
      <div className="space-y-5">

        {/* Role Categories */}
        <div className={cardClass} style={cardShadow}>
          <div className="px-5 py-4 border-b border-cream-200">
            <p className="text-sm font-semibold text-warm-gray-900">Role Categories</p>
            <p className="text-xs text-warm-gray-500 mt-0.5">Discipline groups shown on the order form (e.g., Speech, Psych).</p>
          </div>
          <div className="p-5 space-y-3">
            {categories.length > 0 ? (
              <div className="space-y-1.5">
                {categories.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-warm-gray-900">{cat.name}</span>
                      {cat.description && <span className="text-xs text-warm-gray-500 ml-2">{cat.description}</span>}
                    </div>
                    <button onClick={() => deleteCategory(cat.id)} className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors ml-3 shrink-0">Remove</button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-warm-gray-400 italic">No categories yet.</p>
            )}
            <div className="pt-2 border-t border-cream-100 space-y-2">
              <input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Category name *" className={smInput} />
              <div className="flex gap-2">
                <input value={newCatDesc} onChange={e => setNewCatDesc(e.target.value)} placeholder="Description (optional)" className={smInput} />
                <button onClick={addCategory} disabled={!newCatName.trim() || savingCat} className={addBtn}>Add</button>
              </div>
            </div>
          </div>
        </div>

        {/* Vendors */}
        <div className={cardClass} style={cardShadow}>
          <div className="px-5 py-4 border-b border-cream-200">
            <p className="text-sm font-semibold text-warm-gray-900">Vendors / Publishers</p>
            <p className="text-xs text-warm-gray-500 mt-0.5">Companies that publish or sell assessment materials.</p>
          </div>
          <div className="p-5 space-y-3">
            {vendors.length > 0 ? (
              <div className="space-y-1.5">
                {vendors.map(v => (
                  <div key={v.id} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-warm-gray-900">{v.name}</span>
                      {v.website && (
                        <a href={v.website} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-600 hover:underline ml-2 truncate">{v.website}</a>
                      )}
                    </div>
                    <button onClick={() => deleteVendor(v.id)} className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors ml-3 shrink-0">Remove</button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-warm-gray-400 italic">No vendors yet.</p>
            )}
            <div className="pt-2 border-t border-cream-100 space-y-2">
              <input value={newVendorName} onChange={e => setNewVendorName(e.target.value)} placeholder="Vendor name *" className={smInput} />
              <div className="flex gap-2">
                <input value={newVendorWebsite} onChange={e => setNewVendorWebsite(e.target.value)} placeholder="Website (optional)" className={smInput} />
                <button onClick={addVendor} disabled={!newVendorName.trim() || savingVendor} className={addBtn}>Add</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right column: Tests */}
      <div className={cardClass} style={cardShadow}>
        <div className="px-5 py-4 border-b border-cream-200">
          <p className="text-sm font-semibold text-warm-gray-900">Assessments / Tests</p>
          <p className="text-xs text-warm-gray-500 mt-0.5">Individual assessment tools available for ordering.</p>
        </div>
        <div className="p-5 space-y-4">
          {tests.length > 0 ? (
            <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
              {tests.map(t => (
                <div key={t.id} className="flex items-start justify-between py-2.5 px-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-warm-gray-900 truncate">{t.name}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                      <span className="text-xs text-warm-gray-500">{t.vendor.name}</span>
                      <span className="text-warm-gray-300 text-xs">·</span>
                      <span className="text-xs text-warm-gray-500">{t.category.name}</span>
                      <span className="text-warm-gray-300 text-xs">·</span>
                      <span className={`text-xs font-medium ${t.isPhysical ? 'text-amber-600' : 'text-blue-600'}`}>
                        {t.isPhysical ? 'Physical' : 'Digital'}
                      </span>
                      <span className="text-warm-gray-300 text-xs">·</span>
                      <span className="text-xs text-warm-gray-500">${Number(t.estimatedPrice).toFixed(2)}</span>
                    </div>
                  </div>
                  <button onClick={() => deleteTest(t.id)} className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors ml-3 shrink-0 mt-0.5">Remove</button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-warm-gray-400 italic">No tests configured yet.</p>
          )}

          <div className="pt-3 border-t border-cream-100 space-y-2">
            <p className="text-xs font-semibold text-warm-gray-600 uppercase tracking-wide">Add New Test</p>
            <input
              value={newTest.name}
              onChange={e => setNewTest(p => ({ ...p, name: e.target.value }))}
              placeholder="Test name *"
              className={smInput}
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={newTest.categoryId}
                onChange={e => setNewTest(p => ({ ...p, categoryId: e.target.value }))}
                className={smInput}
              >
                <option value="">Category *</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select
                value={newTest.vendorId}
                onChange={e => setNewTest(p => ({ ...p, vendorId: e.target.value }))}
                className={smInput}
              >
                <option value="">Vendor *</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
              <input
                value={newTest.purchaseUrl}
                onChange={e => setNewTest(p => ({ ...p, purchaseUrl: e.target.value }))}
                placeholder="Purchase URL"
                className={smInput}
              />
              <div className="flex gap-2">
                <input
                  value={newTest.estimatedPrice}
                  onChange={e => setNewTest(p => ({ ...p, estimatedPrice: e.target.value }))}
                  placeholder="Price ($)"
                  type="number"
                  step="0.01"
                  min="0"
                  className={smInput}
                />
                <select
                  value={newTest.isPhysical ? 'physical' : 'digital'}
                  onChange={e => setNewTest(p => ({ ...p, isPhysical: e.target.value === 'physical' }))}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-warm-gray-900 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none shrink-0"
                >
                  <option value="physical">Physical</option>
                  <option value="digital">Digital</option>
                </select>
              </div>
            </div>
            <input
              value={newTest.notes}
              onChange={e => setNewTest(p => ({ ...p, notes: e.target.value }))}
              placeholder="Notes (optional)"
              className={smInput}
            />
            <button
              onClick={addTest}
              disabled={!newTest.name.trim() || !newTest.vendorId || !newTest.categoryId || savingTest}
              className={addBtn}
            >
              {savingTest ? 'Adding…' : 'Add Test'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
