import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateDraftNumber } from '@/lib/utils'
import { sendDraftSavedEmail } from '@/lib/email'
import type { FormType } from '@prisma/client'

const DRAFT_TTL_DAYS = 30

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, formType, formData, draftNumber: existingDraftNumber } = body

    if (!email || !formType || !formData) {
      return NextResponse.json({ error: 'email, formType, and formData are required' }, { status: 400 })
    }

    if (!['INTERIM', 'DHH_ITINERANT', 'LEVEL_II'].includes(formType)) {
      return NextResponse.json({ error: 'Invalid formType' }, { status: 400 })
    }

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + DRAFT_TTL_DAYS)

    let draft

    if (existingDraftNumber) {
      // Update existing draft — verify email matches
      const existing = await prisma.referralDraft.findUnique({
        where: { draftNumber: existingDraftNumber },
      })

      if (!existing || existing.email.toLowerCase() !== email.toLowerCase()) {
        // Draft not found or email mismatch — create a new one
        draft = await prisma.referralDraft.create({
          data: {
            draftNumber: generateDraftNumber(),
            email: email.toLowerCase(),
            formType: formType as FormType,
            formData,
            expiresAt,
          },
        })
      } else {
        draft = await prisma.referralDraft.update({
          where: { draftNumber: existingDraftNumber },
          data: { formData, expiresAt, updatedAt: new Date() },
        })
      }
    } else {
      draft = await prisma.referralDraft.create({
        data: {
          draftNumber: generateDraftNumber(),
          email: email.toLowerCase(),
          formType: formType as FormType,
          formData,
          expiresAt,
        },
      })
    }

    // Send confirmation email (fire-and-forget)
    sendDraftSavedEmail(email, draft.draftNumber, formType, expiresAt).catch((err) =>
      console.error('[email] draft saved email failed:', err)
    )

    return NextResponse.json({
      success: true,
      draftNumber: draft.draftNumber,
      expiresAt: draft.expiresAt,
    })
  } catch (error) {
    console.error('Save draft error:', error)
    return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    const draftNumber = searchParams.get('draftNumber')

    if (!email || !draftNumber) {
      return NextResponse.json({ error: 'email and draftNumber are required' }, { status: 400 })
    }

    const draft = await prisma.referralDraft.findUnique({
      where: { draftNumber },
    })

    if (!draft) {
      return NextResponse.json({ error: 'Draft not found. Please check your draft number and try again.' }, { status: 404 })
    }

    if (draft.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ error: 'Draft not found. Please check your email address and draft number.' }, { status: 404 })
    }

    if (draft.expiresAt < new Date()) {
      return NextResponse.json({ error: 'This draft has expired. Drafts are saved for 30 days.' }, { status: 410 })
    }

    const formUrls: Record<string, string> = {
      INTERIM: '/interim-referral-form',
      DHH_ITINERANT: '/dhh-itinerant-referral-form',
      LEVEL_II: '/level-ii-referral-form',
    }

    return NextResponse.json({
      draftNumber: draft.draftNumber,
      formType: draft.formType,
      formData: draft.formData,
      formUrl: formUrls[draft.formType],
      expiresAt: draft.expiresAt,
    })
  } catch (error) {
    console.error('Get draft error:', error)
    return NextResponse.json({ error: 'Failed to retrieve draft' }, { status: 500 })
  }
}
