'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { UserRole } from '@prisma/client'

type TourStep = {
  title: string
  description: string
  tourTarget?: string // data-tour attribute value on the sidebar element
}

function getTourSteps(role: UserRole): TourStep[] {
  if (role === 'EXTERNAL_ORG') {
    return [
      {
        title: 'Welcome to SPEDEX',
        description: 'SPEDEX is the Sutter County portal for submitting and tracking special education referrals. This quick tour will walk you through the key areas.',
      },
      {
        title: 'My Referrals',
        description: 'This is where you track all the referrals you\'ve submitted. You\'ll see the current status of each one, any documents that SCSOS staff have flagged for re-upload, and notes from the team.',
        tourTarget: 'nav-my-referrals',
      },
      {
        title: 'Document Checklist',
        description: 'Each referral has a required document checklist (IEP, Psychoeducational Report, etc.). If staff rejects a document, you\'ll see the reason and can upload a corrected version directly from the referral page.',
        tourTarget: 'nav-my-referrals',
      },
      {
        title: 'Forgot Your Password?',
        description: 'On the login page, click "Forgot?" next to the password field to get a reset link sent to your email. You can also ask your SCSOS administrator to send you a reset link from the Users page.',
      },
    ]
  }

  if (role === 'TEACHER') {
    return [
      {
        title: 'Welcome to SPEDEX',
        description: 'SPEDEX is the Sutter County portal for requesting and tracking instructional materials and equipment. Here\'s a quick tour.',
      },
      {
        title: 'Submit an Order',
        description: 'Use "Submit Order" to request materials or equipment for your classroom. Fill in the item details, vendor, estimated cost, and a brief justification. SCSOS staff will review and approve.',
        tourTarget: 'nav-submit-order',
      },
      {
        title: 'My Orders',
        description: 'Track the status of everything you\'ve requested — pending review, approved, shipped, or delivered. You\'ll also see any notes from the staff member who handled your order.',
        tourTarget: 'nav-my-orders',
      },
    ]
  }

  // SPED_STAFF, ADMIN, SUPER_ADMIN
  const steps: TourStep[] = [
    {
      title: 'Welcome to SPEDEX',
      description: 'SPEDEX is the Sutter County platform for managing special education referrals, material orders, and user accounts. Here\'s a quick tour of the key areas.',
    },
    {
      title: 'Referrals',
      description: 'Your main queue. Review incoming submissions, update statuses (Under Review, Missing Documents, Approved, etc.), manage the document checklist, assign staff, and add notes. Use filters to sort by status, district, or date.',
      tourTarget: 'nav-referrals',
    },
    {
      title: 'Orders',
      description: 'All material and equipment requests from teachers. Approve or reject requests, add tracking notes, and mark items as Shipped or Received when fulfilled.',
      tourTarget: 'nav-orders',
    },
    {
      title: 'Enrollment Reports',
      description: 'Real-time enrollment projections built from submitted referrals. Filter by date range and status, view breakdowns by grade, disability code, and placement type, and export to CSV.',
      tourTarget: 'nav-reports',
    },
  ]

  if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
    steps.push({
      title: 'User Management',
      description: 'Create accounts for teachers, external organizations, and SPED staff. Enter their name, email, and role — they\'ll receive an invite email with a link to set their password. You can also reset passwords, resend invites, and deactivate accounts from here.',
      tourTarget: 'nav-users',
    })
  }

  return steps
}

const TOUR_STORAGE_KEY = 'spedex_tour_v2'

type TargetRect = { x: number; y: number; width: number; height: number }

type WelcomeTourProps = {
  role: UserRole
  userId: string
  forceOpen?: boolean
  onClose?: () => void
}

export function WelcomeTour({ role, userId, forceOpen, onClose }: WelcomeTourProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null)
  const [windowSize, setWindowSize] = useState({ w: 0, h: 0 })
  const storageKey = `${TOUR_STORAGE_KEY}_${userId}`
  const steps = useMemo(() => getTourSteps(role), [role])

  useEffect(() => {
    const update = () => setWindowSize({ w: window.innerWidth, h: window.innerHeight })
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  useEffect(() => {
    if (forceOpen) {
      setStep(0)
      setOpen(true)
      return
    }
    if (!localStorage.getItem(storageKey)) setOpen(true)
  }, [storageKey, forceOpen])

  const measureTarget = useCallback((tourTarget?: string) => {
    if (!tourTarget) { setTargetRect(null); return }
    const el = document.querySelector(`[data-tour="${tourTarget}"]`)
    if (!el) { setTargetRect(null); return }
    const r = el.getBoundingClientRect()
    // If element is not visible (e.g. mobile sidebar hidden), fall back
    if (r.width === 0 && r.height === 0) { setTargetRect(null); return }
    setTargetRect({ x: r.left, y: r.top, width: r.width, height: r.height })
  }, [])

  useEffect(() => {
    if (!open) return
    measureTarget(steps[step]?.tourTarget)
  }, [step, open, steps, measureTarget])

  const handleClose = () => {
    localStorage.setItem(storageKey, 'true')
    setOpen(false)
    setStep(0)
    onClose?.()
  }

  const handleNext = () => {
    if (step < steps.length - 1) setStep(step + 1)
    else handleClose()
  }

  const handleBack = () => {
    if (step > 0) setStep(step - 1)
  }

  if (!open) return null

  const current = steps[step]
  const isLast = step === steps.length - 1
  const pad = 6

  // Tooltip card dimensions (approximate)
  const CARD_W = 340
  const CARD_H = 200

  // Calculate tooltip position
  let cardStyle: React.CSSProperties = {}
  let arrowStyle: React.CSSProperties = {}
  let showArrow = false
  let arrowDir: 'left' | 'top' = 'left'

  if (targetRect && windowSize.w > 0) {
    const spaceRight = windowSize.w - (targetRect.x + targetRect.width + pad)
    const spaceBelow = windowSize.h - (targetRect.y + targetRect.height + pad)

    if (spaceRight >= CARD_W + 20) {
      // Place to the right
      const left = targetRect.x + targetRect.width + pad + 16
      const top = Math.max(12, Math.min(
        targetRect.y + targetRect.height / 2 - CARD_H / 2,
        windowSize.h - CARD_H - 12
      ))
      cardStyle = { position: 'fixed', left, top, width: CARD_W, zIndex: 60 }
      arrowDir = 'left'
      arrowStyle = {
        position: 'fixed',
        left: left - 10,
        top: targetRect.y + targetRect.height / 2 - 10,
        zIndex: 60,
      }
      showArrow = true
    } else if (spaceBelow >= CARD_H + 20) {
      // Place below
      const left = Math.max(12, Math.min(
        targetRect.x + targetRect.width / 2 - CARD_W / 2,
        windowSize.w - CARD_W - 12
      ))
      const top = targetRect.y + targetRect.height + pad + 16
      cardStyle = { position: 'fixed', left, top, width: CARD_W, zIndex: 60 }
      arrowDir = 'top'
      arrowStyle = {
        position: 'fixed',
        left: targetRect.x + targetRect.width / 2 - 10,
        top: top - 10,
        zIndex: 60,
      }
      showArrow = true
    } else {
      // Fallback: center-right of viewport
      cardStyle = {
        position: 'fixed',
        right: 24,
        top: '50%',
        transform: 'translateY(-50%)',
        width: CARD_W,
        zIndex: 60,
      }
    }
  } else {
    // No target — center the card
    cardStyle = {
      position: 'fixed',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
      width: CARD_W,
      zIndex: 60,
    }
  }

  return (
    <>
      {/* Dim overlay — no blur */}
      <div
        className="fixed inset-0 z-50"
        style={{ background: 'rgba(15, 23, 42, 0.55)' }}
        onClick={handleClose}
      />

      {/* Spotlight cutout using SVG */}
      {targetRect && (
        <svg
          className="fixed inset-0 pointer-events-none"
          style={{ zIndex: 50, width: '100%', height: '100%' }}
        >
          <defs>
            <mask id="tour-spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={targetRect.x - pad}
                y={targetRect.y - pad}
                width={targetRect.width + pad * 2}
                height={targetRect.height + pad * 2}
                rx="8"
                fill="black"
              />
            </mask>
          </defs>
          {/* This covers the dim overlay's spotlight area so the element shows through */}
          <rect
            x={targetRect.x - pad - 2}
            y={targetRect.y - pad - 2}
            width={targetRect.width + (pad + 2) * 2}
            height={targetRect.height + (pad + 2) * 2}
            rx="9"
            fill="none"
            stroke="rgba(56, 189, 248, 0.7)"
            strokeWidth="2"
          />
        </svg>
      )}

      {/* Arrow */}
      {showArrow && targetRect && (
        <div style={arrowStyle} className="pointer-events-none">
          {arrowDir === 'left' ? (
            <svg width="20" height="20" viewBox="0 0 20 20">
              <path d="M14 2 L2 10 L14 18" fill="white" stroke="white" strokeWidth="1" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20">
              <path d="M2 14 L10 2 L18 14" fill="white" stroke="white" strokeWidth="1" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      )}

      {/* Tooltip card */}
      <div
        style={cardStyle}
        className="bg-white rounded-2xl shadow-2xl border border-cream-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div className="h-1 bg-cream-100">
          <div
            className="h-full bg-sky-500 transition-all duration-300"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="p-5">
          {/* Step label + close */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-warm-gray-400 uppercase tracking-wider">
              {step + 1} / {steps.length}
            </span>
            <button
              onClick={handleClose}
              className="text-warm-gray-300 hover:text-warm-gray-500 transition-colors"
              aria-label="Close tour"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <h2 className="text-base font-semibold text-warm-gray-900 mb-1.5">{current.title}</h2>
          <p className="text-sm text-warm-gray-600 leading-relaxed">{current.description}</p>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex items-center justify-between">
          <button
            onClick={handleClose}
            className="text-xs text-warm-gray-400 hover:text-warm-gray-600 transition-colors"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={handleBack}
                className="px-3 py-1.5 text-sm font-medium text-warm-gray-700 bg-cream-100 hover:bg-cream-200 rounded-lg transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-4 py-1.5 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors"
            >
              {isLast ? 'Get started' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
