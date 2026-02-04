import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { uploadFile } from '@/lib/storage'
import { hasPermission } from '@/lib/auth/permissions'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const formData = await request.formData()
    const checklistType = formData.get('checklistType')?.toString()
    const typeToKey: Record<string, string> = {
      STUDENT_REGISTRATION: 'studentRegistration',
      HOME_LANGUAGE_SURVEY: 'homeLanguageSurvey',
      IMMUNIZATION_RECORD: 'immunizationRecord',
      RELEASE_OF_INFORMATION: 'releaseOfInformation',
      CURRENT_IEP: 'currentIEP',
      PSYCHO_ED_REPORT: 'psychoeducationalReport',
      INTERIM_PLACEMENT_FORM: 'interimPlacementForm',
      TRANSCRIPTS: 'transcripts',
    }

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

    const referral = await prisma.referral.findUnique({
      where: { id },
      select: { submittedByUserId: true },
    })

    if (!referral) {
      return NextResponse.json({ error: 'Referral not found' }, { status: 404 })
    }

    const canViewAll = hasPermission(user.role, 'referrals:view-all')
    const isOwner = referral.submittedByUserId === user.id

    if (!canViewAll && !isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!checklistType) {
      return NextResponse.json({ error: 'checklistType is required' }, { status: 400 })
    }

    const checklistItem = await prisma.documentChecklistItem.findFirst({
      where: { referralId: id, type: checklistType as any },
    })

    if (!checklistItem) {
      return NextResponse.json({ error: 'Checklist item not found' }, { status: 404 })
    }

    const uploadedFiles = []
    for (const [key, value] of formData.entries()) {
      if (key === 'checklistType') continue
      if (!(value instanceof File)) continue

      const file = value as File
      const filePath = `referrals/${id}/${checklistType}/${file.name}`
      const result = await uploadFile('referral-documents', filePath, file)

      if (!result.path) {
        return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
      }

      await prisma.documentFile.create({
        data: {
          checklistItemId: checklistItem.id,
          fileName: file.name,
          filePath: result.path,
          fileSize: file.size,
          mimeType: file.type,
          uploadedBy: user.id,
        },
      })

      await prisma.document.create({
        data: {
          referralId: id,
          documentType: typeToKey[checklistType] || checklistType,
          fileName: file.name,
          filePath: result.path,
          fileSize: file.size,
          mimeType: file.type,
          uploadedBy: user.id,
        },
      })

      uploadedFiles.push({ fileName: file.name, filePath: result.path })
    }

    await prisma.documentChecklistItem.update({
      where: { id: checklistItem.id },
      data: {
        status: 'PENDING',
        rejectionReason: null,
        version: { increment: 1 },
      },
    })

    return NextResponse.json({ success: true, files: uploadedFiles })
  } catch (error) {
    console.error('Checklist document upload error:', error)
    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 })
  }
}
