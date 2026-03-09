import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'
import type { ReferralStatus } from '@prisma/client'
import { sendReferralStatusChangeEmail } from '@/lib/email'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // Get authenticated user
    const supabase = await createClient()
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser()

    if (!supabaseUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { supabaseUserId: supabaseUser.id },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check permission
    if (!hasPermission(user.role, 'referrals:update')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { status, reason, missingItems } = body

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 })
    }

    // NOT_ENROLLING and WITHDRAWN require a reason
    if ((status === 'NOT_ENROLLING' || status === 'WITHDRAWN') && !reason) {
      return NextResponse.json(
        { error: `A reason is required when setting status to ${status}` },
        { status: 400 }
      )
    }

    // Fetch current referral
    const referral = await prisma.referral.findUnique({
      where: { id },
    })

    if (!referral) {
      return NextResponse.json({ error: 'Referral not found' }, { status: 404 })
    }

    // Update referral status
    const updated = await prisma.referral.update({
      where: { id },
      data: {
        status: status as ReferralStatus,
        lastReviewedAt: new Date(),
        lastReviewedBy: user.id,
        rejectionReason: status === 'REJECTED' ? reason : null,
        missingItems: status === 'REJECTED' && missingItems ? missingItems : null,
      },
    })

    // Create status history record
    await prisma.statusHistory.create({
      data: {
        referralId: id,
        fromStatus: referral.status,
        toStatus: status as ReferralStatus,
        changedBy: user.id,
        reason: reason || null,
      },
    })

    // Send status change email to submitter
    if (referral.submittedByEmail) {
      sendReferralStatusChangeEmail(
        referral.submittedByEmail,
        referral.studentName,
        referral.confirmationNumber,
        status,
        reason,
        id
      ).catch((err) => console.error('[email] referral status change email failed:', err))
    }

    return NextResponse.json({
      success: true,
      referral: updated,
      message: 'Status updated successfully',
    })
  } catch (error) {
    console.error('Status update error:', error)
    return NextResponse.json(
      { error: 'Failed to update status' },
      { status: 500 }
    )
  }
}
