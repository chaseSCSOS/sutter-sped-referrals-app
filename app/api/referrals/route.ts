import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { uploadFile } from '@/lib/storage'
import { generateConfirmationNumber, calculateDeadline } from '@/lib/utils'
import { hasPermission } from '@/lib/auth/permissions'
import { sendReferralSubmissionEmail, sendReferralSubmittedToStaff, getEmailSettings } from '@/lib/email'
import type { ChecklistItemType } from '@prisma/client'

type ChecklistRuleInput = {
  grade?: string
}

const PRESCHOOL_GRADES = new Set(['PreK', 'Preschool'])
const HIGH_SCHOOL_GRADES = new Set(['9', '10', '11', '12'])

function isPreschoolGrade(grade?: string) {
  return Boolean(grade) && PRESCHOOL_GRADES.has(grade!)
}

function isHighSchoolGrade(grade?: string) {
  return Boolean(grade) && HIGH_SCHOOL_GRADES.has(grade!)
}

const interimChecklistConfig = [
  { key: 'studentRegistration', type: 'STUDENT_REGISTRATION', required: true },
  {
    key: 'homeLanguageSurvey',
    type: 'HOME_LANGUAGE_SURVEY',
    required: (data: ChecklistRuleInput) => Boolean(data.grade) && !isPreschoolGrade(data.grade),
  },
  { key: 'immunizationRecord', type: 'IMMUNIZATION_RECORD', required: true },
  { key: 'releaseOfInformation', type: 'RELEASE_OF_INFORMATION', required: true },
  { key: 'currentIEP', type: 'CURRENT_IEP', required: true },
  { key: 'psychoeducationalReport', type: 'PSYCHO_ED_REPORT', required: true },
  {
    key: 'transcripts',
    type: 'TRANSCRIPTS',
    required: (data: ChecklistRuleInput) => isHighSchoolGrade(data.grade),
  },
]

// Keep legacy alias so nothing else breaks
const checklistConfig = interimChecklistConfig

const levelIIChecklistConfig = [
  { key: 'rationaleForReferral', type: 'RATIONALE_FOR_REFERRAL', required: true },
  { key: 'studentRegistration', type: 'STUDENT_REGISTRATION', required: true },
  {
    key: 'homeLanguageSurvey',
    type: 'HOME_LANGUAGE_SURVEY',
    required: (data: ChecklistRuleInput) => Boolean(data.grade) && !isPreschoolGrade(data.grade),
  },
  { key: 'releaseOfInformation', type: 'RELEASE_OF_INFORMATION', required: true },
  { key: 'multiDisciplinaryReport', type: 'MULTIDISCIPLINARY_TEAM_REPORT', required: true },
  { key: 'behaviorAssessment', type: 'BEHAVIOR_ASSESSMENT', required: true },
  { key: 'interventionStrategies', type: 'INTERVENTION_STRATEGIES', required: true },
  { key: 'currentAcademicAssessment', type: 'CURRENT_ACADEMIC_ASSESSMENT', required: true },
  { key: 'reportsOtherAgencies', type: 'REPORTS_OTHER_AGENCIES', required: true },
  { key: 'currentIEP', type: 'CURRENT_IEP', required: true },
  { key: 'currentBehaviorPlan', type: 'CURRENT_BEHAVIOR_PLAN', required: true },
  { key: 'iepDocumentation', type: 'IEP_DOCUMENTATION', required: true },
  { key: 'primaryModeOfLearning', type: 'PRIMARY_MODE_OF_LEARNING', required: true },
  { key: 'prescribedMedication', type: 'PRESCRIBED_MEDICATION', required: true },
  { key: 'immunizationRecord', type: 'IMMUNIZATION_RECORD', required: true },
  {
    key: 'audiogramChart',
    type: 'AUDIOGRAM_CHART',
    required: (data: ChecklistRuleInput & { audiogramApplicable?: boolean }) =>
      Boolean(data.audiogramApplicable),
  },
  {
    key: 'transcripts',
    type: 'TRANSCRIPTS',
    required: (data: ChecklistRuleInput) => isHighSchoolGrade(data.grade),
  },
]

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

        const formType: string = data.formType || 'INTERIM'
    const isInterim = formType === 'INTERIM'
    const isLevelII = formType === 'LEVEL_II'
    const isDHH = formType === 'DHH_ITINERANT'

    // Extract primary disability from disabilities object (interim only)
    const primaryDisability = isInterim
      ? (Object.entries(data.disabilities || {}).find(([_, value]) => value === 'P')?.[0] || null)
      : null

    // Fields shared by all form types
    const sharedFields = {
      confirmationNumber,
      status: 'SUBMITTED' as const,
      formType: formType as 'INTERIM' | 'DHH_ITINERANT' | 'LEVEL_II',
      deadlineDate,
      submittedByUserId,
      studentName: data.studentName,
      dateOfBirth: new Date(data.dateOfBirth),
      grade: data.grade,
      additionalComments: data.additionalComments || null,
    }

    // Interim-only fields
    const interimFields = isInterim
      ? {
          fosterYouth: data.fosterYouth === 'Yes',
          birthplace: data.birthplace,
          elStartDate: data.elStartDate ? new Date(data.elStartDate) : null,
          reclassificationDate: data.reclassificationDate ? new Date(data.reclassificationDate) : null,
          age: parseInt(data.age),
          gender: data.gender,
          parentGuardianName: data.parentGuardianName,
          homePhone: data.homePhone || null,
          cellPhone: data.cellPhone || null,
          homeAddress: data.homeAddress,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
          schoolOfAttendance: data.schoolOfAttendance,
          schoolOfResidence: data.schoolOfResidence,
          transportationSpecialEd: data.transportationSpecialEd === 'Yes',
          nativeLanguage: data.nativeLanguage,
          englishLearner: data.englishLearner === 'Yes',
          redesignated: data.redesignated === 'Yes' ? true : data.redesignated === 'No' ? false : null,
          ethnicity: data.ethnicity,
          residency: data.residency,
          placementType: data.placementType,
          silo: (data.silo || null) as any,
          primaryDisability,
          disabilities: data.disabilities,
          spedEntryDate: new Date(data.spedEntryDate),
          interimPlacementReviewDate: data.interimPlacementReviewDate
            ? new Date(data.interimPlacementReviewDate)
            : null,
          triennialDue: new Date(data.triennialDue),
          currentIepDate: data.currentIepDate ? new Date(data.currentIepDate) : null,
          currentPsychoReportDate: data.currentPsychoReportDate
            ? new Date(data.currentPsychoReportDate)
            : null,
          nonSeisIep: data.nonSeisIep === 'Yes',
          lastPlacementSchool: data.lastPlacementSchool,
          lastPlacementDistrict: data.lastPlacementDistrict,
          lastPlacementCounty: data.lastPlacementCounty,
          lastPlacementState: data.lastPlacementState,
          lastPlacementPhone: data.lastPlacementPhone || null,
          lastPlacementContactPerson: data.lastPlacementContactPerson || null,
          specialEdServices: data.specialEdServices,
          percentageOutsideGenEd: parseInt(data.percentageOutsideGenEd),
          leaRepresentativeName: data.leaRepresentativeName,
          leaRepresentativePosition: data.leaRepresentativePosition,
          submittedByEmail: data.submittedByEmail || null,
        }
      : {}

    // Level II specific fields
    const levelIIFields = isLevelII
      ? {
          fosterYouth: data.fosterYouth === 'Yes',
          birthplace: data.birthplace,
          elStartDate: data.elStartDate ? new Date(data.elStartDate) : null,
          reclassificationDate: data.reclassificationDate ? new Date(data.reclassificationDate) : null,
          leaRepresentativeName: data.districtAdminName,
          submittedByEmail: data.districtAdminEmail,
        }
      : {}

    // DHH Itinerant specific fields
    const dhhFields = isDHH
      ? {
          schoolOfAttendance: data.schoolSite || null,
          leaRepresentativeName: data.leaAdminName,
          submittedByEmail: data.leaAdminEmail || null,
          formMetadata: {
            lea: data.lea,
            schoolSite: data.schoolSite,
            generalEdTeacher: data.generalEdTeacher,
            generalEdTeacherContact: data.generalEdTeacherContact,
            otherContact: data.otherContact || null,
            serviceType: data.serviceType,
            isEligibleForSped: data.isEligibleForSped,
            eligibilityIEP: data.eligibilityIEP,
            eligibility504: data.eligibility504,
            reasonForRequest: data.reasonForRequest,
            areasOfConcern: data.areasOfConcern,
            historyOfSeizures: data.historyOfSeizures,
            visionAdequate: data.visionAdequate,
            medications: data.medications,
            medicationsList: data.medicationsList || null,
            recentSurgeries: data.recentSurgeries,
            recentSurgeriesDescription: data.recentSurgeriesDescription || null,
            hearingAid: data.hearingAid,
            hearingAidMakeModel: data.hearingAidMakeModel || null,
            hasAudiogramChart: data.hasAudiogramChart,
            hasAudiologyReport: data.hasAudiologyReport,
            assistiveListeningDevices: data.assistiveListeningDevices,
            staffKnowledgeALD: data.staffKnowledgeALD,
            additionalTrainingNeeded: data.additionalTrainingNeeded,
            aldSufficient: data.aldSufficient,
            additionalConcerns: data.additionalConcerns || null,
          },
        }
      : {}

    // Create referral in database
    const referral = await prisma.referral.create({
      data: {
        ...sharedFields,
        ...interimFields,
        ...levelIIFields,
        ...dhhFields,
      } as any,
    })

    const uploadedKeys = new Set<string>()
    for (const [key, value] of formData.entries()) {
      if (key !== 'data' && value instanceof File) {
        uploadedKeys.add(key)
      }
    }

    const dhhChecklistConfig = [
      { key: 'dhhReferralRequest', type: 'DHH_REFERRAL_REQUEST', required: true },
      { key: 'releaseOfInformation', type: 'RELEASE_OF_INFORMATION', required: true },
      { key: 'currentIEP', type: 'CURRENT_IEP', required: true },
      { key: 'psychoeducationalReport', type: 'PSYCHO_ED_REPORT', required: true },
      { key: 'audiogramAndReport', type: 'AUDIOGRAM_CHART', required: true },
      {
        key: 'accommodationsModifications',
        type: 'ACCOMMODATIONS_MODIFICATIONS',
        required: (d: { serviceType?: string }) =>
          d.serviceType === 'Screening' || d.serviceType === 'Assessment',
      },
    ]

    const activeChecklistConfig = isDHH
      ? dhhChecklistConfig
      : isLevelII
        ? levelIIChecklistConfig
        : interimChecklistConfig

    const checklistItems = await Promise.all(
      activeChecklistConfig.map((item) => {
        const isRequired = typeof item.required === 'function' ? item.required(data) : item.required
        const status = isRequired && !uploadedKeys.has(item.key) ? 'MISSING' : 'PENDING'
        return prisma.documentChecklistItem.create({
          data: {
            referralId: referral.id,
            type: item.type as ChecklistItemType,
            required: isRequired,
            status,
          },
        })
      })
    )

    const checklistByKey = new Map<string, (typeof checklistItems)[number]>()
    activeChecklistConfig.forEach((item, index) => {
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

    // Send emails (fire-and-forget)
    const submitterEmail =
      (data.districtAdminEmail || data.leaAdminEmail || data.submittedByEmail || formData.get('submittedByEmail')) as string | undefined

    if (submitterEmail) {
      sendReferralSubmissionEmail(
        submitterEmail,
        referral.studentName,
        referral.confirmationNumber,
        referral.id
      ).catch((err) => console.error('[email] referral submitter confirm failed:', err))
    }

    getEmailSettings().then(({ referralNotifyEmails }) => {
      sendReferralSubmittedToStaff(referralNotifyEmails, {
        referralId: referral.id,
        confirmationNumber: referral.confirmationNumber,
        studentName: referral.studentName,
        submitterEmail: submitterEmail || 'Unknown',
        formType: formType,
        submittedAt: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      }).catch((err) => console.error('[email] referral staff notify failed:', err))
    }).catch((err) => console.error('[email] settings load failed:', err))

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
    const search = searchParams.get('search')
    const programTrack = searchParams.get('programTrack')
    const districtOfResidence = searchParams.get('districtOfResidence')
    const cumStatus = searchParams.get('cumStatus') // none | requested | received | sent
    const inSEISParam = searchParams.get('inSEIS')
    const inAeriesParam = searchParams.get('inAeries')
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

    if (programTrack) {
      whereClause.programTrack = programTrack
    }

    if (districtOfResidence) {
      whereClause.districtOfResidence = { contains: districtOfResidence, mode: 'insensitive' }
    }

    if (cumStatus) {
      if (cumStatus === 'none') {
        whereClause.cumRequestedDate = null
      } else if (cumStatus === 'requested') {
        whereClause.cumRequestedDate = { not: null }
        whereClause.cumReceivedDate = null
      } else if (cumStatus === 'received') {
        whereClause.cumReceivedDate = { not: null }
        whereClause.cumSentDate = null
      } else if (cumStatus === 'sent') {
        whereClause.cumSentDate = { not: null }
      }
    }

    if (inSEISParam !== null && inSEISParam !== '') {
      whereClause.inSEIS = inSEISParam === 'true'
    }

    if (inAeriesParam !== null && inAeriesParam !== '') {
      whereClause.inAeries = inAeriesParam === 'true'
    }

    if (search) {
      whereClause.OR = [
        { studentName: { contains: search, mode: 'insensitive' } },
        { confirmationNumber: { contains: search, mode: 'insensitive' } },
      ]
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
