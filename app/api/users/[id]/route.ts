import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth/permissions'
import { USER_ROLE_VALUES } from '@/lib/auth/role-options'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(USER_ROLE_VALUES).optional(),
  roleOptionId: z.string().uuid().nullable().optional(),
  organization: z.string().optional(),
  phoneNumber: z.string().optional(),
  jobTitle: z.string().optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    const body = await request.json()
    const validatedData = updateUserSchema.parse(body)
    const roleOptionProvided = 'roleOptionId' in validatedData

    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        role: true,
        roleOptionId: true,
      },
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 })
    }

    const nextRole = validatedData.role ?? existingUser.role
    let nextRoleOptionId = roleOptionProvided ? validatedData.roleOptionId ?? null : existingUser.roleOptionId

    if (!roleOptionProvided && validatedData.role && validatedData.role !== existingUser.role) {
      // Clear custom role option when base permission role changes unless caller explicitly sets one.
      nextRoleOptionId = null
    }

    if (nextRoleOptionId) {
      const roleOption = await prisma.userRoleOption.findUnique({
        where: { id: nextRoleOptionId },
        select: { id: true, baseRole: true },
      })

      if (!roleOption) {
        return NextResponse.json({ error: 'Selected role option was not found' }, { status: 400 })
      }

      if (roleOption.baseRole !== nextRole) {
        return NextResponse.json(
          { error: 'Selected role option does not match the assigned permission role' },
          { status: 400 }
        )
      }
    }

    const updateData: Prisma.UserUncheckedUpdateInput = {}
    if (validatedData.name !== undefined) updateData.name = validatedData.name
    if (validatedData.role !== undefined) updateData.role = validatedData.role
    if (validatedData.organization !== undefined) updateData.organization = validatedData.organization || null
    if (validatedData.phoneNumber !== undefined) updateData.phoneNumber = validatedData.phoneNumber || null
    if (validatedData.jobTitle !== undefined) updateData.jobTitle = validatedData.jobTitle || null
    if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive
    if (roleOptionProvided || validatedData.role !== undefined) updateData.roleOptionId = nextRoleOptionId

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        roleOptionId: true,
        roleOption: {
          select: {
            id: true,
            name: true,
            baseRole: true,
          },
        },
        isActive: true,
      },
    })

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        roleOptionId: updatedUser.roleOptionId,
        roleOption: updatedUser.roleOption,
        isActive: updatedUser.isActive,
      },
    })
  } catch (error) {
    console.error('Error updating user:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    if (!hasPermission(user.role, 'users:delete')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 })
    }

    // Delete from Supabase Auth if they have a supabase user ID
    if (targetUser.supabaseUserId) {
      await supabase.auth.admin.deleteUser(targetUser.supabaseUserId)
    }

    // Delete from database
    await prisma.user.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}
