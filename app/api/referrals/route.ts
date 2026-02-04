import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { uploadFile } from '@/lib/storage'
import { generateConfirmationNumber, calculateDeadline } from '@/lib/utils'
import { hasPermission } from '@/lib/auth/permissions'

const checklistConfig = [
  { key: 'studentRegistration', type: 'STUDENT_REGISTRATION', required: true },
  { key: 'homeLanguageSurvey', type: 'HOME_LANGUAGE_SURVEY', required: (data: any) => data.grade !== 'PreK' },
  { key: 'immunizationRecord', type: 'IMMUNIZATION_RECORD', required: true },
  { key: 'releaseOfInformation', type: 'RELEASE_OF_INFORMATION', required: true },
  { key: 'currentIEP', type: 'CURRENT_IEP', required: true },
  { key: 'psychoeducationalReport', type: 'PSYCHO_ED_REPORT', required: true },
  { key: 'interimPlacementForm', type: 'INTERIM_PLACEMENT_FORM', required: (data: any) => data.nonSeisIep === 'Yes' },
  { key: 'transcripts', type: 'TRANSCRIPTS', required: (data: any) => ['9', '10', '11', '12'].includes(data.grade) },
] as const

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const dataString = formData.get('data') as string
    const data = JSON.parse(dataString)

    // Get user from session (optional for public submissions)
    const supabase = await createClient()
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser()

    let submittedByUserId: string | null = null
    if (supabaseUser) {
      const user = await prisma.user.findUnique({
        where: { supabaseUserId: supabaseUser.id },
      })
      submittedByUserId = user?.id || null
    }

    // Generate confirmation number and deadline
    const confirmationNumber = generateConfirmationNumber()
    const deadlineDate = calculateDeadline(30)

    // Extract primary disability from disabilities object
    const primaryDisability = Object.entries(data.disabilities || {}).find(
      ([_, value]) => value === 'P'
    )?.[0] || ''

    // Create referral in database
    const referral = await prisma.referral.create({
      data: {
        confirmationNumber,
        status: 'SUBMITTED',
        deadlineDate,
        submittedByUserId,

        // Student Information
        studentName: data.studentName,
        dateOfBirth: new Date(data.dateOfBirth),
        age: parseInt(data.age),
        grade: data.grade,
        gender: data.gender,
        fosterYouth: data.fosterYouth === 'Yes',
        birthplace: data.birthplace,

        // Contact Information
        parentGuardianName: data.parentGuardianName,
        homePhone: data.homePhone || null,
        cellPhone: data.cellPhone || null,
        homeAddress: data.homeAddress,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,

        // School Information
        schoolOfAttendance: data.schoolOfAttendance,
        schoolOfResidence: data.schoolOfResidence,
        transportationSpecialEd: data.transportationSpecialEd === 'Yes',

        // Language & Demographics
        nativeLanguage: data.nativeLanguage,
        englishLearner: data.englishLearner === 'Yes',
        elStartDate: data.elStartDate ? new Date(data.elStartDate) : null,
        redesignated: data.redesignated === 'Yes' ? true : data.redesignated === 'No' ? false : null,
        reclassificationDate: data.reclassificationDate ? new Date(data.reclassificationDate) : null,
        ethnicity: data.ethnicity,
        residency: data.residency,

        // Placement Type
        placementType: data.placementType,

        // Organizational Grouping
        silo: data.silo || null,

        // Disability Information
        primaryDisability,
        disabilities: data.disabilities,

        // Special Education Dates
        spedEntryDate: new Date(data.spedEntryDate),
        interimPlacementReviewDate: new Date(data.interimPlacementReviewDate),
        triennialDue: new Date(data.triennialDue),

        // Document Dates
        currentIepDate: data.currentIepDate ? new Date(data.currentIepDate) : null,
        currentPsychoReportDate: data.currentPsychoReportDate
          ? new Date(data.currentPsychoReportDate)
          : null,
        nonSeisIep: data.nonSeisIep === 'Yes',

        // Last Placement Information
        lastPlacementSchool: data.lastPlacementSchool,
        lastPlacementDistrict: data.lastPlacementDistrict,
        lastPlacementCounty: data.lastPlacementCounty,
        lastPlacementState: data.lastPlacementState,
        lastPlacementPhone: data.lastPlacementPhone || null,
        lastPlacementContactPerson: data.lastPlacementContactPerson || null,

        // Special Education Services (stored as JSON array)
        specialEdServices: data.specialEdServices,
        percentageOutsideGenEd: parseInt(data.percentageOutsideGenEd),

        // District Authorization
        leaRepresentativeName: data.leaRepresentativeName,
        leaRepresentativePosition: data.leaRepresentativePosition,
        submittedByEmail: data.submittedByEmail || null,

        // Additional Information
        additionalComments: data.additionalComments || null,
      },
    })

    const uploadedKeys = new Set<string>()
    for (const [key, value] of formData.entries()) {
      if (key !== 'data' && value instanceof File) {
        uploadedKeys.add(key)
      }
    }

    const checklistItems = await Promise.all(
      checklistConfig.map((item) => {
        const isRequired = typeof item.required === 'function' ? item.required(data) : item.required
        const status = isRequired && !uploadedKeys.has(item.key) ? 'MISSING' : 'PENDING'
        return prisma.documentChecklistItem.create({
          data: {
            referralId: referral.id,
            type: item.type,
            required: isRequired,
            status,
          },
        })
      })
    )

    const checklistByKey = new Map<string, (typeof checklistItems)[number]>()
    checklistConfig.forEach((item, index) => {
      checklistByKey.set(item.key, checklistItems[index])
    })

    // Handle file uploads to Supabase Storage
    const uploadedDocuments = []
    for (const [key, value] of formData.entries()) {
      if (key !== 'data' && value instanceof File) {
        const file = value as File
        const filePath = `referrals/${referral.id}/${key}/${file.name}`

        // Upload to Supabase Storage
        const result = await uploadFile('referral-documents', filePath, file)

        if (result.path) {
          // Save document metadata to database
          const document = await prisma.document.create({
            data: {
              referralId: referral.id,
              documentType: key,
              fileName: file.name,
              filePath: result.path,
              fileSize: file.size,
              mimeType: file.type,
              uploadedBy: submittedByUserId,
            },
          })
          uploadedDocuments.push(document)

          const checklistItem = checklistByKey.get(key)
          if (checklistItem) {
            await prisma.documentFile.create({
              data: {
                checklistItemId: checklistItem.id,
                fileName: file.name,
                filePath: result.path,
                fileSize: file.size,
                mimeType: file.type,
                uploadedBy: submittedByUserId || undefined,
              },
            })
          }
        } else {
          console.error(`Failed to upload ${key}:`, result.error)
        }
      }
    }

    // Create initial status history record
    await prisma.statusHistory.create({
      data: {
        referralId: referral.id,
        toStatus: 'SUBMITTED',
        changedBy: submittedByUserId || 'system',
      },
    })

    // TODO: Send email notifications (Phase 4)
    // await sendNotifications(referral, data)

    return NextResponse.json(
      {
        success: true,
        id: referral.id,
        confirmationNumber: referral.confirmationNumber,
        message: 'Referral submitted successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Referral submission error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to submit referral',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get user from session
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

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // If requesting specific referral
    if (id) {
      const referral = await prisma.referral.findUnique({
        where: { id },
        include: {
          documents: true,
          statusHistory: { orderBy: { changedAt: 'desc' } },
          notes: { orderBy: { createdAt: 'desc' } },
          assignedToStaff: { select: { id: true, name: true } },
          submittedByUser: { select: { id: true, name: true, email: true } },
        },
      })

      if (!referral) {
        return NextResponse.json({ error: 'Referral not found' }, { status: 404 })
      }

      // Check permissions
      const canViewAll = hasPermission(user.role, 'referrals:view-all')
      const isOwner = referral.submittedByUserId === user.id

      if (!canViewAll && !isOwner) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      return NextResponse.json({ referral })
    }

    // List referrals with filters
    let whereClause: any = {}

    // Apply role-based filtering
    if (user.role === 'EXTERNAL_ORG') {
      whereClause.submittedByUserId = user.id
    } else if (user.role === 'TEACHER') {
      return NextResponse.json({ error: 'Teachers do not have access to referrals' }, { status: 403 })
    }
    // SPED_STAFF, ADMIN, SUPER_ADMIN can see all

    if (status) {
      whereClause.status = status
    }

    const [referrals, total] = await Promise.all([
      prisma.referral.findMany({
        where: whereClause,
        include: {
          documents: { select: { id: true, documentType: true, fileName: true } },
          statusHistory: { orderBy: { changedAt: 'desc' }, take: 1 },
          assignedToStaff: { select: { id: true, name: true } },
        },
        orderBy: { submittedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.referral.count({ where: whereClause }),
    ])

    return NextResponse.json({
      referrals,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Referrals fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch referrals' }, { status: 500 })
  }
}
