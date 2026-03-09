'use client'

import { useEffect, useState } from 'react'

type TemplateDelivery = 'live' | 'manual' | 'template_only'

interface EmailTemplatePreview {
  id: string
  category: 'Orders' | 'Referrals' | 'Users' | 'Workflow'
  name: string
  audience: string
  trigger: string
  description: string
  delivery: TemplateDelivery
  subject: string
  html: string
}

const deliveryStyles: Record<TemplateDelivery, string> = {
  live: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  manual: 'bg-sky-50 text-sky-700 border-sky-200',
  template_only: 'bg-amber-50 text-amber-700 border-amber-200',
}

const deliveryLabels: Record<TemplateDelivery, string> = {
  live: 'Live',
  manual: 'Manual',
  template_only: 'Template Only',
}

export function EmailTemplatePreviewPanel() {
  const [templates, setTemplates] = useState<EmailTemplatePreview[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadTemplates() {
      try {
        const response = await fetch('/api/settings/email/templates')
        if (!response.ok) {
          const data = await response.json().catch(() => null)
          throw new Error(data?.error || 'Failed to load email templates')
        }

        const data = await response.json()
        if (cancelled) return

        const nextTemplates = Array.isArray(data.templates) ? data.templates : []
        setTemplates(nextTemplates)
        setSelectedId(current => current || nextTemplates[0]?.id || '')
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load email templates')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadTemplates()
    return () => { cancelled = true }
  }, [])

  const selectedTemplate =
    templates.find(template => template.id === selectedId) ?? templates[0] ?? null

  return (
    <section className="bg-white rounded-2xl border border-cream-200 overflow-hidden" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      <div className="px-5 py-4 border-b border-cream-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-warm-gray-900">System Email Templates</p>
            <p className="text-xs text-warm-gray-500 mt-0.5">Preview the HTML templates used across referrals, orders, user access, and workflow reminders.</p>
          </div>
          <span className="inline-flex items-center rounded-full bg-cream-100 border border-cream-200 px-3 py-1 text-xs font-medium text-warm-gray-700">
            Sample data preview
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[260px]">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-cream-200 border-t-sky-500" />
        </div>
      ) : error ? (
        <div className="p-5">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        </div>
      ) : selectedTemplate ? (
        <div className="grid xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="border-b xl:border-b-0 xl:border-r border-cream-200 bg-cream-50/40">
            <div className="max-h-[860px] overflow-y-auto p-3 space-y-2">
              {templates.map(template => {
                const isActive = template.id === selectedTemplate.id
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setSelectedId(template.id)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${
                      isActive
                        ? 'border-sky-200 bg-white shadow-sm'
                        : 'border-transparent bg-transparent hover:border-cream-200 hover:bg-white/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-warm-gray-900">{template.name}</p>
                        <p className="text-xs text-warm-gray-500 mt-1">{template.category}</p>
                      </div>
                      <span className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${deliveryStyles[template.delivery]}`}>
                        {deliveryLabels[template.delivery]}
                      </span>
                    </div>
                    <p className="text-xs text-warm-gray-600 mt-2">{template.description}</p>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="min-w-0">
            <div className="px-5 py-4 border-b border-cream-200 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-warm-gray-900">{selectedTemplate.name}</h3>
                  <p className="text-sm text-warm-gray-500 mt-1">{selectedTemplate.description}</p>
                </div>
                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${deliveryStyles[selectedTemplate.delivery]}`}>
                  {deliveryLabels[selectedTemplate.delivery]}
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <MetadataBlock label="Audience" value={selectedTemplate.audience} />
                <MetadataBlock label="Trigger" value={selectedTemplate.trigger} />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-warm-gray-500 mb-2">Subject Line</p>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-warm-gray-900 font-mono break-all">
                  {selectedTemplate.subject}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-100/60">
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <iframe
                  title={`${selectedTemplate.name} preview`}
                  srcDoc={selectedTemplate.html}
                  sandbox=""
                  className="block w-full h-[820px] bg-white"
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-5 text-sm text-warm-gray-500">No email templates available.</div>
      )}
    </section>
  )
}

function MetadataBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-cream-200 bg-cream-50/60 px-3.5 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-warm-gray-500">{label}</p>
      <p className="text-sm text-warm-gray-800 mt-1">{value}</p>
    </div>
  )
}
