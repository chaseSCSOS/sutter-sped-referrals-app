'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface CumWorkflowPanelProps {
  referral: any
  canManage: boolean
  staffList?: { id: string; name: string }[]
}

type CumStep = 'requested' | 'received' | 'sent'

function StepBadge({ done, active, label }: { done: boolean; active: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold border-2 transition-colors ${
        done ? 'bg-sage-500 border-sage-500 text-white' :
        active ? 'bg-white border-sky-500 text-sky-600' :
        'bg-white border-cream-300 text-warm-gray-400'
      }`}>
        {done ? (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        ) : '●'}
      </div>
      <span className={`text-xs font-medium ${done ? 'text-sage-700' : active ? 'text-sky-700' : 'text-warm-gray-400'}`}>
        {label}
      </span>
    </div>
  )
}

export default function CumWorkflowPanel({ referral, canManage, staffList = [] }: CumWorkflowPanelProps) {
  const router = useRouter()
  const [activeStep, setActiveStep] = useState<CumStep | null>(null)
  const [stepDate, setStepDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [staffId, setStaffId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [emailDraft, setEmailDraft] = useState<Record<string, string> | null>(null)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailTo, setEmailTo] = useState('')
  const [emailSent, setEmailSent] = useState(false)

  const cumRequested = !!referral.cumRequestedDate
  const cumReceived = !!referral.cumReceivedDate
  const cumSent = !!referral.cumSentDate

  // Compute next actionable step
  const nextStep: CumStep | null = !cumRequested ? 'requested' : !cumReceived ? 'received' : !cumSent ? 'sent' : null

  // Days since request (for overdue indicator)
  const daysSinceRequest = cumRequested && !cumReceived
    ? Math.floor((Date.now() - new Date(referral.cumRequestedDate).getTime()) / 86400000)
    : null

  async function handleStepSubmit(step: CumStep) {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/referrals/${referral.id}/cum`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step, date: stepDate, notes: notes || undefined, staffId: staffId || undefined }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to update')
        return
      }

      if (data.emailDraft) {
        setEmailDraft(data.emailDraft)
        setEmailTo('')
        setEmailSent(false)
      }

      setActiveStep(null)
      setNotes('')
      setStaffId('')
      router.refresh()
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  async function handleSendEmail() {
    if (!emailDraft || !emailTo) return
    setSendingEmail(true)
    try {
      const res = await fetch(`/api/referrals/${referral.id}/cum/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: emailTo, subject: emailDraft.subject, body: emailDraft.body }),
      })
      if (res.ok) {
        setEmailSent(true)
        setEmailDraft(null)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to send email')
      }
    } catch {
      setError('Failed to send email')
    } finally {
      setSendingEmail(false)
    }
  }

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-cream-200 overflow-hidden">
      <div className="px-6 pt-6 pb-2">
        <h2 className="text-sm font-semibold text-warm-gray-900 flex items-center gap-2">
          <span className="w-1.5 h-4 bg-amber-500 rounded-full inline-block"></span>
          CUM Records Workflow
          {daysSinceRequest !== null && daysSinceRequest > 10 && (
            <span className="ml-auto text-[10px] font-semibold bg-coral-100 text-coral-600 border border-coral-200 px-2 py-0.5 rounded-full">
              {daysSinceRequest}d overdue
            </span>
          )}
        </h2>
      </div>

      <div className="px-6 pb-6">
        {/* Step progress */}
        <div className="flex items-center gap-3 mt-4 mb-5">
          <StepBadge done={cumRequested} active={!cumRequested} label="Requested" />
          <div className={`flex-1 h-0.5 rounded-full transition-colors ${cumRequested ? 'bg-sage-400' : 'bg-cream-200'}`} />
          <StepBadge done={cumReceived} active={cumRequested && !cumReceived} label="Received" />
          <div className={`flex-1 h-0.5 rounded-full transition-colors ${cumReceived ? 'bg-sage-400' : 'bg-cream-200'}`} />
          <StepBadge done={cumSent} active={cumReceived && !cumSent} label="Sent to School" />
        </div>

        {/* Dates summary */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Requested', date: referral.cumRequestedDate },
            { label: 'Received', date: referral.cumReceivedDate },
            { label: 'Sent', date: referral.cumSentDate },
          ].map(({ label, date }) => (
            <div key={label} className="bg-cream-50 rounded-xl border border-cream-200 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-warm-gray-400 font-semibold">{label}</p>
              <p className="text-xs font-medium text-warm-gray-800 mt-0.5">
                {date ? new Date(date).toLocaleDateString() : '—'}
              </p>
            </div>
          ))}
        </div>

        {referral.cumNotes && (
          <div className="mb-4 text-xs text-warm-gray-600 bg-cream-50 rounded-xl px-3 py-2 border border-cream-200 whitespace-pre-wrap">
            {referral.cumNotes}
          </div>
        )}

        {/* Email sent confirmation */}
        {emailSent && (
          <div className="mb-4 text-xs text-sage-700 bg-sage-50 rounded-xl px-3 py-2 border border-sage-200">
            CUM request email sent successfully.
          </div>
        )}

        {/* Email draft modal */}
        {emailDraft && (
          <div className="mb-4 border border-sky-200 bg-sky-50 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-sky-800">CUM Request Email Ready</p>
            <div>
              <label className="block text-[10px] uppercase text-warm-gray-500 font-semibold mb-1">To (school records email)</label>
              <input
                type="email"
                value={emailTo}
                onChange={e => setEmailTo(e.target.value)}
                placeholder="records@school.edu"
                className="w-full rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-sky-300"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase text-warm-gray-500 font-semibold mb-1">Subject</label>
              <p className="text-xs text-warm-gray-700 bg-white rounded-lg px-3 py-1.5 border border-sky-200">{emailDraft.subject}</p>
            </div>
            <div>
              <label className="block text-[10px] uppercase text-warm-gray-500 font-semibold mb-1">Body Preview</label>
              <pre className="text-xs text-warm-gray-700 bg-white rounded-lg px-3 py-2 border border-sky-200 whitespace-pre-wrap font-sans max-h-32 overflow-y-auto">{emailDraft.body}</pre>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSendEmail}
                disabled={!emailTo || sendingEmail}
                className="text-xs bg-sky-700 text-white px-4 py-1.5 rounded-lg hover:bg-sky-800 transition-colors disabled:opacity-50"
              >
                {sendingEmail ? 'Sending…' : 'Send Email'}
              </button>
              <button
                onClick={() => setEmailDraft(null)}
                className="text-xs text-warm-gray-500 hover:text-warm-gray-700 px-3 py-1.5 rounded-lg border border-cream-200 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-3 text-xs text-coral-600 bg-coral-50 rounded-xl px-3 py-2 border border-coral-100">
            {error}
          </div>
        )}

        {/* Action button & step form */}
        {canManage && nextStep && !activeStep && (
          <button
            onClick={() => setActiveStep(nextStep)}
            className="w-full py-2 rounded-xl border-2 border-dashed border-sky-300 text-xs font-semibold text-sky-700 hover:bg-sky-50 hover:border-sky-400 transition-colors"
          >
            + Mark CUM as {nextStep.charAt(0).toUpperCase() + nextStep.slice(1)}
          </button>
        )}

        {activeStep && (
          <div className="border border-sky-200 rounded-xl p-4 space-y-3 bg-sky-50/50">
            <p className="text-xs font-semibold text-sky-800">
              Mark CUM as: <span className="capitalize">{activeStep}</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase text-warm-gray-500 font-semibold mb-1">Date</label>
                <input
                  type="date"
                  value={stepDate}
                  onChange={e => setStepDate(e.target.value)}
                  className="w-full rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-sky-300"
                />
              </div>
              {activeStep === 'sent' && staffList.length > 0 && (
                <div>
                  <label className="block text-[10px] uppercase text-warm-gray-500 font-semibold mb-1">Processed By</label>
                  <select
                    value={staffId}
                    onChange={e => setStaffId(e.target.value)}
                    className="w-full rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-sky-300"
                  >
                    <option value="">— Select staff —</option>
                    {staffList.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div>
              <label className="block text-[10px] uppercase text-warm-gray-500 font-semibold mb-1">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-sky-300 resize-none"
                placeholder="Any relevant notes..."
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleStepSubmit(activeStep)}
                disabled={saving}
                className="text-xs bg-sky-700 text-white px-4 py-1.5 rounded-lg hover:bg-sky-800 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Confirm'}
              </button>
              <button
                onClick={() => { setActiveStep(null); setError('') }}
                className="text-xs text-warm-gray-500 hover:text-warm-gray-700 px-3 py-1.5 rounded-lg border border-cream-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {!nextStep && (
          <p className="text-xs text-sage-600 font-medium text-center py-2">
            ✓ CUM workflow complete
          </p>
        )}
      </div>
    </section>
  )
}
