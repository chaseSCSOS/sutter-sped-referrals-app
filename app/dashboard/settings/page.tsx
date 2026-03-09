'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Tab = 'email' | 'assessments'

export default function SettingsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('email')

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
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-warm-gray-900">Settings</h1>
        <p className="text-sm text-warm-gray-500 mt-1">
          Manage email notifications and assessment catalog.
        </p>
      </div>

      {/* Tab Nav */}
      <div className="flex gap-1 bg-cream-100 rounded-xl p-1 max-w-xs">
        <button
          onClick={() => setActiveTab('email')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'email' ? 'bg-white shadow-sm text-warm-gray-900' : 'text-warm-gray-600 hover:text-warm-gray-900'
          }`}
        >
          Email
        </button>
        <button
          onClick={() => setActiveTab('assessments')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'assessments' ? 'bg-white shadow-sm text-warm-gray-900' : 'text-warm-gray-600 hover:text-warm-gray-900'
          }`}
        >
          Assessments
        </button>
      </div>

      {activeTab === 'email' ? (
        <>
          {/* Order Notifications */}
          <EmailRecipientCard
            title="New Order Notifications"
            description="These recipients are notified every time a new supply order is submitted."
            emails={orderEmails}
            inputValue={orderInput}
            onInputChange={setOrderInput}
            onAdd={() => addEmail(orderEmails, setOrderEmails, orderInput, setOrderInput)}
            onRemove={(email) => removeEmail(orderEmails, setOrderEmails, email)}
            inputId="order-email"
          />

          {/* Referral Notifications */}
          <EmailRecipientCard
            title="Referral Notifications"
            description="These recipients are notified when a new referral is submitted or updated."
            emails={referralEmails}
            inputValue={referralInput}
            onInputChange={setReferralInput}
            onAdd={() => addEmail(referralEmails, setReferralEmails, referralInput, setReferralInput)}
            onRemove={(email) => removeEmail(referralEmails, setReferralEmails, email)}
            inputId="referral-email"
          />

          {/* CUM / SEIS Reminder Thresholds */}
          <div className="bg-white rounded-xl shadow-sm border border-cream-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-cream-200 bg-cream-50/70">
              <h2 className="text-sm font-bold text-warm-gray-900">Workflow Reminder Thresholds</h2>
              <p className="text-xs text-warm-gray-500 mt-0.5">Set how many days before generating overdue alerts for CUM records and SEIS/Aeries entry.</p>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-warm-gray-700 mb-1.5">
                  CUM Reminder Days
                </label>
                <p className="text-xs text-warm-gray-500 mb-2">Alert when CUM has been requested but not received for this many days.</p>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={cumReminderDays}
                  onChange={e => setCumReminderDays(parseInt(e.target.value) || 10)}
                  className="w-full rounded-lg border border-cream-200 bg-white px-3 py-2 text-sm text-warm-gray-800 shadow-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-200/70 focus:outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-warm-gray-700 mb-1.5">
                  SEIS / Aeries Reminder Days
                </label>
                <p className="text-xs text-warm-gray-500 mb-2">Alert when a student has been enrolled but not yet entered into SEIS or Aeries for this many days.</p>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={seisAeriesReminderDays}
                  onChange={e => setSeisAeriesReminderDays(parseInt(e.target.value) || 5)}
                  className="w-full rounded-lg border border-cream-200 bg-white px-3 py-2 text-sm text-warm-gray-800 shadow-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-200/70 focus:outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* Save */}
          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-sage-700 text-white rounded-lg hover:bg-sage-800 disabled:opacity-60 font-semibold transition-colors text-sm"
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
              <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Settings saved
              </div>
            )}
            {saveError && (
              <p className="text-sm text-red-600">{saveError}</p>
            )}
          </div>
        </>
      ) : (
        <AssessmentCatalogSettings />
      )}
    </div>
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
  title,
  description,
  emails,
  inputValue,
  onInputChange,
  onAdd,
  onRemove,
  inputId,
}: EmailRecipientCardProps) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); onAdd() }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-cream-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-cream-200 bg-cream-50/70">
        <h2 className="text-sm font-bold text-warm-gray-900">{title}</h2>
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
          <p className="text-sm text-warm-gray-400 italic">No recipients configured. Add an email address below.</p>
        )}

        <div className="flex gap-2">
          <input
            id={inputId}
            type="email"
            value={inputValue}
            onChange={e => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="name@example.com"
            className="flex-1 rounded-lg border border-cream-200 bg-white px-3 py-2 text-sm text-warm-gray-800 shadow-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-200/70 focus:outline-none transition"
          />
          <button
            type="button"
            onClick={onAdd}
            disabled={!inputValue.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-40 font-medium transition-colors text-sm"
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

// ==================== ASSESSMENT CATALOG ====================

interface ACategory { id: string; name: string; description: string | null; sortOrder: number }
interface AVendor { id: string; name: string; website: string | null }
interface ATest { id: string; name: string; vendor: { name: string }; category: { name: string }; estimatedPrice: string; isPhysical: boolean; purchaseUrl: string | null }

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

  function loadCategories() {
    fetch('/api/assessments/categories').then(r => r.json()).then(d => setCategories(d.categories ?? []))
  }
  function loadVendors() {
    fetch('/api/assessments/vendors').then(r => r.json()).then(d => setVendors(d.vendors ?? []))
  }
  function loadTests() {
    fetch('/api/assessments/tests').then(r => r.json()).then(d => setTests(d.tests ?? []))
  }

  useEffect(() => { loadCategories(); loadVendors(); loadTests() }, [])

  async function addCategory() {
    if (!newCatName.trim()) return
    setSavingCat(true)
    await fetch('/api/assessments/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCatName, description: newCatDesc }),
    })
    setNewCatName(''); setNewCatDesc('')
    loadCategories()
    setSavingCat(false)
  }

  async function deleteCategory(id: string) {
    await fetch(`/api/assessments/categories/${id}`, { method: 'DELETE' })
    loadCategories()
  }

  async function addVendor() {
    if (!newVendorName.trim()) return
    setSavingVendor(true)
    await fetch('/api/assessments/vendors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newVendorName, website: newVendorWebsite }),
    })
    setNewVendorName(''); setNewVendorWebsite('')
    loadVendors()
    setSavingVendor(false)
  }

  async function deleteVendor(id: string) {
    await fetch(`/api/assessments/vendors/${id}`, { method: 'DELETE' })
    loadVendors()
  }

  async function addTest() {
    if (!newTest.name.trim() || !newTest.vendorId || !newTest.categoryId) return
    setSavingTest(true)
    await fetch('/api/assessments/tests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newTest, estimatedPrice: parseFloat(newTest.estimatedPrice) || 0 }),
    })
    setNewTest({ name: '', vendorId: '', categoryId: '', purchaseUrl: '', estimatedPrice: '', isPhysical: true, notes: '' })
    loadTests()
    setSavingTest(false)
  }

  async function deleteTest(id: string) {
    await fetch(`/api/assessments/tests/${id}`, { method: 'DELETE' })
    loadTests()
  }

  return (
    <div className="space-y-6">
      {/* Categories */}
      <div className="bg-white rounded-xl shadow-sm border border-cream-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-cream-200 bg-cream-50/70">
          <h2 className="text-sm font-bold text-warm-gray-900">Role Categories</h2>
          <p className="text-xs text-warm-gray-500 mt-0.5">The discipline/role groups shown on the order form (e.g., Speech, Psych, Teacher).</p>
        </div>
        <div className="p-5 space-y-4">
          {categories.length > 0 ? (
            <div className="space-y-2">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between py-2 px-3 bg-cream-50 rounded-lg border border-cream-200">
                  <div>
                    <span className="text-sm font-medium text-warm-gray-900">{cat.name}</span>
                    {cat.description && <span className="text-xs text-warm-gray-500 ml-2">{cat.description}</span>}
                  </div>
                  <button onClick={() => deleteCategory(cat.id)} className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-warm-gray-400 italic">No categories yet.</p>
          )}
          <div className="flex gap-2 pt-2 border-t border-cream-100">
            <input
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              placeholder="Category name *"
              className="flex-1 rounded-lg border border-cream-200 bg-white px-3 py-2 text-sm text-warm-gray-800 focus:border-sky-400 focus:ring-2 focus:ring-sky-200/70 focus:outline-none"
            />
            <input
              value={newCatDesc}
              onChange={e => setNewCatDesc(e.target.value)}
              placeholder="Description (optional)"
              className="flex-1 rounded-lg border border-cream-200 bg-white px-3 py-2 text-sm text-warm-gray-800 focus:border-sky-400 focus:ring-2 focus:ring-sky-200/70 focus:outline-none"
            />
            <button
              onClick={addCategory}
              disabled={!newCatName.trim() || savingCat}
              className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-40 font-medium transition-colors text-sm"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Vendors */}
      <div className="bg-white rounded-xl shadow-sm border border-cream-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-cream-200 bg-cream-50/70">
          <h2 className="text-sm font-bold text-warm-gray-900">Vendors / Publishers</h2>
          <p className="text-xs text-warm-gray-500 mt-0.5">Companies that publish or sell assessment materials.</p>
        </div>
        <div className="p-5 space-y-4">
          {vendors.length > 0 ? (
            <div className="space-y-2">
              {vendors.map(v => (
                <div key={v.id} className="flex items-center justify-between py-2 px-3 bg-cream-50 rounded-lg border border-cream-200">
                  <div>
                    <span className="text-sm font-medium text-warm-gray-900">{v.name}</span>
                    {v.website && (
                      <a href={v.website} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-600 hover:underline ml-2">
                        {v.website}
                      </a>
                    )}
                  </div>
                  <button onClick={() => deleteVendor(v.id)} className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-warm-gray-400 italic">No vendors yet.</p>
          )}
          <div className="flex gap-2 pt-2 border-t border-cream-100">
            <input
              value={newVendorName}
              onChange={e => setNewVendorName(e.target.value)}
              placeholder="Vendor name *"
              className="flex-1 rounded-lg border border-cream-200 bg-white px-3 py-2 text-sm text-warm-gray-800 focus:border-sky-400 focus:ring-2 focus:ring-sky-200/70 focus:outline-none"
            />
            <input
              value={newVendorWebsite}
              onChange={e => setNewVendorWebsite(e.target.value)}
              placeholder="Website (optional)"
              className="flex-1 rounded-lg border border-cream-200 bg-white px-3 py-2 text-sm text-warm-gray-800 focus:border-sky-400 focus:ring-2 focus:ring-sky-200/70 focus:outline-none"
            />
            <button
              onClick={addVendor}
              disabled={!newVendorName.trim() || savingVendor}
              className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-40 font-medium transition-colors text-sm"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Tests */}
      <div className="bg-white rounded-xl shadow-sm border border-cream-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-cream-200 bg-cream-50/70">
          <h2 className="text-sm font-bold text-warm-gray-900">Assessments / Tests</h2>
          <p className="text-xs text-warm-gray-500 mt-0.5">Individual assessment tools available for ordering.</p>
        </div>
        <div className="p-5 space-y-4">
          {tests.length > 0 ? (
            <div className="space-y-2">
              {tests.map(t => (
                <div key={t.id} className="flex items-center justify-between py-2 px-3 bg-cream-50 rounded-lg border border-cream-200">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-warm-gray-900">{t.name}</span>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-warm-gray-500">{t.vendor.name}</span>
                      <span className="text-xs text-warm-gray-400">·</span>
                      <span className="text-xs text-warm-gray-500">{t.category.name}</span>
                      <span className="text-xs text-warm-gray-400">·</span>
                      <span className={`text-xs font-medium ${t.isPhysical ? 'text-amber-600' : 'text-blue-600'}`}>
                        {t.isPhysical ? 'Physical' : 'Digital'}
                      </span>
                      <span className="text-xs text-warm-gray-400">·</span>
                      <span className="text-xs text-warm-gray-500">${Number(t.estimatedPrice).toFixed(2)}</span>
                    </div>
                  </div>
                  <button onClick={() => deleteTest(t.id)} className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors ml-4 flex-shrink-0">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-warm-gray-400 italic">No tests configured yet.</p>
          )}

          {/* Add test form */}
          <div className="pt-2 border-t border-cream-100 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                value={newTest.name}
                onChange={e => setNewTest(p => ({ ...p, name: e.target.value }))}
                placeholder="Test name *"
                className="rounded-lg border border-cream-200 bg-white px-3 py-2 text-sm text-warm-gray-800 focus:border-sky-400 focus:ring-2 focus:ring-sky-200/70 focus:outline-none"
              />
              <input
                value={newTest.purchaseUrl}
                onChange={e => setNewTest(p => ({ ...p, purchaseUrl: e.target.value }))}
                placeholder="Purchase URL"
                className="rounded-lg border border-cream-200 bg-white px-3 py-2 text-sm text-warm-gray-800 focus:border-sky-400 focus:ring-2 focus:ring-sky-200/70 focus:outline-none"
              />
              <select
                value={newTest.categoryId}
                onChange={e => setNewTest(p => ({ ...p, categoryId: e.target.value }))}
                className="rounded-lg border border-cream-200 bg-white px-3 py-2 text-sm text-warm-gray-800 focus:border-sky-400 focus:ring-2 focus:ring-sky-200/70 focus:outline-none"
              >
                <option value="">Select category *</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select
                value={newTest.vendorId}
                onChange={e => setNewTest(p => ({ ...p, vendorId: e.target.value }))}
                className="rounded-lg border border-cream-200 bg-white px-3 py-2 text-sm text-warm-gray-800 focus:border-sky-400 focus:ring-2 focus:ring-sky-200/70 focus:outline-none"
              >
                <option value="">Select vendor *</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
              <input
                value={newTest.estimatedPrice}
                onChange={e => setNewTest(p => ({ ...p, estimatedPrice: e.target.value }))}
                placeholder="Estimated price ($)"
                type="number"
                step="0.01"
                min="0"
                className="rounded-lg border border-cream-200 bg-white px-3 py-2 text-sm text-warm-gray-800 focus:border-sky-400 focus:ring-2 focus:ring-sky-200/70 focus:outline-none"
              />
              <select
                value={newTest.isPhysical ? 'physical' : 'digital'}
                onChange={e => setNewTest(p => ({ ...p, isPhysical: e.target.value === 'physical' }))}
                className="rounded-lg border border-cream-200 bg-white px-3 py-2 text-sm text-warm-gray-800 focus:border-sky-400 focus:ring-2 focus:ring-sky-200/70 focus:outline-none"
              >
                <option value="physical">Physical</option>
                <option value="digital">Digital</option>
              </select>
            </div>
            <input
              value={newTest.notes}
              onChange={e => setNewTest(p => ({ ...p, notes: e.target.value }))}
              placeholder="Notes (optional)"
              className="w-full rounded-lg border border-cream-200 bg-white px-3 py-2 text-sm text-warm-gray-800 focus:border-sky-400 focus:ring-2 focus:ring-sky-200/70 focus:outline-none"
            />
            <button
              onClick={addTest}
              disabled={!newTest.name.trim() || !newTest.vendorId || !newTest.categoryId || savingTest}
              className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-40 font-medium transition-colors text-sm"
            >
              Add Test
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
