import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'
import { sendUserPasswordResetEmail } from '@/lib/email'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
    const redirectTo = `${appUrl}/auth/callback?next=/dashboard`
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { supabaseUserId: authUser.id },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!hasPermission(user.role, 'users:update')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        supabaseUserId: true,
        email: true,
        name: true,
        role: true,
        roleOption: {
          select: {
            name: true,
          },
        },
      },
    })

    if (!targetUser || !targetUser.supabaseUserId) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 })
    }

    const adminClient = createAdminClient()
    const { data, error } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email: targetUser.email,
      options: {
        redirectTo,
      },
    })

    if (error || !data?.properties?.action_link) {
      console.error('Password reset error:', error)
      return NextResponse.json(
        { error: 'Failed to send password reset email' },
        { status: 500 }
      )
    }

    await sendUserPasswordResetEmail({
      recipientName: targetUser.name,
      recipientEmail: targetUser.email,
      role: targetUser.role,
      roleLabel: targetUser.roleOption?.name,
      actionLink: data.properties.action_link,
      sentByName: user.name,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error resetting password:', error)
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    )
  }
}
