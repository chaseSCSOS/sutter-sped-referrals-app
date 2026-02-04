import { PrismaClient, ReferralStatus, PlacementType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding sample referrals...\n')

  // Clear existing referrals (cascade delete will remove related records)
  console.log('Clearing existing referrals...')
  await prisma.referral.deleteMany({})
  console.log('✓ Cleared existing referrals\n')

  const sampleReferrals = [
    {
      confirmationNumber: 'REF-2026-01-20-001',
      status: ReferralStatus.SUBMITTED,
      studentName: 'Emma Rodriguez',
      dateOfBirth: new Date('2015-03-15'),
      age: 10,
      grade: '5th Grade',
      gender: 'Female',
      fosterYouth: false,
      birthplace: 'Yuba City, CA',
      parentGuardianName: 'Maria Rodriguez',
      homePhone: '(530) 555-0101',
      cellPhone: '(530) 555-0102',
      homeAddress: '123 Oak Street',
      city: 'Yuba City',
      state: 'CA',
      zipCode: '95991',
      schoolOfAttendance: 'Lincoln Elementary',
      schoolOfResidence: 'Lincoln Elementary',
      transportationSpecialEd: false,
      nativeLanguage: 'Spanish',
      englishLearner: true,
      elStartDate: new Date('2021-08-15'),
      redesignated: false,
      ethnicity: 'Hispanic/Latino',
      residency: 'Resident',
      placementType: PlacementType.FRA,
      disabilities: { '290': 'P', '240': 'S' }, // SLD Primary, Speech Secondary
      spedEntryDate: new Date('2024-09-01'),
      interimPlacementReviewDate: new Date('2026-02-15'),
      triennialDue: new Date('2027-09-01'),
      lastPlacementSchool: 'Lincoln Elementary',
      lastPlacementDistrict: 'Yuba City Unified',
      lastPlacementCounty: 'Sutter',
      lastPlacementState: 'CA',
      lastPlacementPhone: '(530) 555-2000',
      specialEdServices: [
        {
          service: 'Resource Specialist Program',
          frequency: '4 times per week',
          duration: '30 minutes',
          location: 'Resource Room',
          startDate: new Date('2024-09-01'),
          endDate: new Date('2025-06-15'),
          serviceProvider: 'Ms. Johnson',
        },
      ],
      percentageOutsideGenEd: 20,
      leaRepresentativeName: 'John Smith',
      leaRepresentativePosition: 'Special Education Director',
      submittedAt: new Date('2026-01-20'),
      deadlineDate: new Date('2026-02-03'), // 14 days from submission
      submittedByEmail: 'maria.rodriguez@parent.com',
    },
    {
      confirmationNumber: 'REF-2026-01-18-002',
      status: ReferralStatus.UNDER_REVIEW,
      studentName: 'Marcus Johnson',
      dateOfBirth: new Date('2013-07-22'),
      age: 12,
      grade: '7th Grade',
      gender: 'Male',
      fosterYouth: true,
      birthplace: 'Sacramento, CA',
      parentGuardianName: 'County Foster Services',
      homePhone: '(530) 555-0201',
      homeAddress: '456 Maple Avenue',
      city: 'Sutter',
      state: 'CA',
      zipCode: '95982',
      schoolOfAttendance: 'Sutter Middle School',
      schoolOfResidence: 'Sutter Middle School',
      transportationSpecialEd: true,
      nativeLanguage: 'English',
      englishLearner: false,
      ethnicity: 'African American',
      residency: 'Resident',
      placementType: PlacementType.SDC,
      disabilities: { '320': 'P', '280': 'S' }, // Autism Primary, OHI Secondary
      spedEntryDate: new Date('2020-09-01'),
      interimPlacementReviewDate: new Date('2026-01-28'),
      triennialDue: new Date('2026-09-01'),
      lastPlacementSchool: 'Brittan Elementary',
      lastPlacementDistrict: 'Sutter Union',
      lastPlacementCounty: 'Sutter',
      lastPlacementState: 'CA',
      specialEdServices: [
        {
          service: 'Special Day Class',
          frequency: 'Daily',
          duration: '300 minutes',
          location: 'SDC Classroom',
          startDate: new Date('2025-09-01'),
          endDate: new Date('2026-06-15'),
          serviceProvider: 'Mr. Davis',
        },
        {
          service: 'Behavioral Support',
          frequency: '2 times per week',
          duration: '45 minutes',
          location: 'SDC Classroom',
          startDate: new Date('2025-09-01'),
          endDate: new Date('2026-06-15'),
          serviceProvider: 'Ms. Chen',
        },
      ],
      percentageOutsideGenEd: 80,
      leaRepresentativeName: 'Sarah Williams',
      leaRepresentativePosition: 'Program Specialist',
      submittedAt: new Date('2026-01-18'),
      deadlineDate: new Date('2026-02-01'),
      submittedByEmail: 'placement@suttercounty.org',
    },
    {
      confirmationNumber: 'REF-2026-01-15-003',
      status: ReferralStatus.APPROVED,
      studentName: 'Sophia Chen',
      dateOfBirth: new Date('2017-11-08'),
      age: 8,
      grade: '3rd Grade',
      gender: 'Female',
      fosterYouth: false,
      birthplace: 'Yuba City, CA',
      parentGuardianName: 'David and Lisa Chen',
      homePhone: '(530) 555-0301',
      cellPhone: '(530) 555-0302',
      homeAddress: '789 Pine Lane',
      city: 'Yuba City',
      state: 'CA',
      zipCode: '95993',
      schoolOfAttendance: 'River Valley High School',
      schoolOfResidence: 'River Valley High School',
      transportationSpecialEd: false,
      nativeLanguage: 'Mandarin',
      englishLearner: true,
      elStartDate: new Date('2023-08-15'),
      redesignated: false,
      ethnicity: 'Asian',
      residency: 'Resident',
      placementType: PlacementType.FRA,
      disabilities: { '240': 'P' }, // Speech Primary
      spedEntryDate: new Date('2024-01-15'),
      interimPlacementReviewDate: new Date('2026-01-25'),
      triennialDue: new Date('2027-01-15'),
      lastPlacementSchool: 'New Student',
      lastPlacementDistrict: 'N/A',
      lastPlacementCounty: 'Sutter',
      lastPlacementState: 'CA',
      specialEdServices: [
        {
          service: 'Speech/Language Therapy',
          frequency: '3 times per week',
          duration: '30 minutes',
          location: 'Speech Room',
          startDate: new Date('2024-01-15'),
          endDate: new Date('2026-06-15'),
          serviceProvider: 'Ms. Anderson',
        },
      ],
      percentageOutsideGenEd: 5,
      leaRepresentativeName: 'Jennifer Taylor',
      leaRepresentativePosition: 'Special Education Coordinator',
      submittedAt: new Date('2026-01-15'),
      deadlineDate: new Date('2026-01-29'),
      submittedByEmail: 'lisa.chen@email.com',
    },
    {
      confirmationNumber: 'REF-2026-01-22-004',
      status: ReferralStatus.PENDING_ADDITIONAL_INFO,
      studentName: 'Aiden Martinez',
      dateOfBirth: new Date('2014-05-30'),
      age: 11,
      grade: '6th Grade',
      gender: 'Male',
      fosterYouth: false,
      birthplace: 'Marysville, CA',
      parentGuardianName: 'Carlos Martinez',
      cellPhone: '(530) 555-0401',
      homeAddress: '321 Cedar Court',
      city: 'Live Oak',
      state: 'CA',
      zipCode: '95953',
      schoolOfAttendance: 'Live Oak Elementary',
      schoolOfResidence: 'Live Oak Elementary',
      transportationSpecialEd: false,
      nativeLanguage: 'English',
      englishLearner: false,
      ethnicity: 'Hispanic/Latino',
      residency: 'Resident',
      placementType: PlacementType.FRA,
      disabilities: { '260': 'P', '290': 'S' }, // ED Primary, SLD Secondary
      spedEntryDate: new Date('2023-09-01'),
      interimPlacementReviewDate: new Date('2026-02-10'),
      triennialDue: new Date('2026-09-01'),
      lastPlacementSchool: 'Live Oak Elementary',
      lastPlacementDistrict: 'Live Oak Unified',
      lastPlacementCounty: 'Sutter',
      lastPlacementState: 'CA',
      specialEdServices: [
        {
          service: 'Resource Specialist Program',
          frequency: '5 times per week',
          duration: '45 minutes',
          location: 'Resource Room',
          startDate: new Date('2025-09-01'),
          endDate: new Date('2026-06-15'),
          serviceProvider: 'Mrs. Thompson',
        },
      ],
      percentageOutsideGenEd: 25,
      leaRepresentativeName: 'Michael Brown',
      leaRepresentativePosition: 'Director of Student Services',
      submittedAt: new Date('2026-01-22'),
      deadlineDate: new Date('2026-02-05'),
      submittedByEmail: 'carlos.martinez@email.com',
      rejectionReason: 'Missing current IEP document and psychological evaluation',
      missingItems: ['Current IEP', 'Psychological Evaluation', 'Recent progress reports'],
    },
    {
      confirmationNumber: 'REF-2026-01-10-005',
      status: ReferralStatus.SUBMITTED,
      studentName: 'Olivia Thompson',
      dateOfBirth: new Date('2016-09-12'),
      age: 9,
      grade: '4th Grade',
      gender: 'Female',
      fosterYouth: false,
      birthplace: 'Yuba City, CA',
      parentGuardianName: 'Rebecca Thompson',
      homePhone: '(530) 555-0501',
      cellPhone: '(530) 555-0502',
      homeAddress: '654 Elm Street',
      city: 'Yuba City',
      state: 'CA',
      zipCode: '95991',
      schoolOfAttendance: 'Terra Buena Elementary',
      schoolOfResidence: 'Terra Buena Elementary',
      transportationSpecialEd: false,
      nativeLanguage: 'English',
      englishLearner: false,
      ethnicity: 'White',
      residency: 'Resident',
      placementType: PlacementType.FRA,
      disabilities: { '250': 'P' }, // Visual Impairment Primary
      spedEntryDate: new Date('2022-09-01'),
      interimPlacementReviewDate: new Date('2026-01-24'),
      triennialDue: new Date('2025-09-01'), // Overdue!
      lastPlacementSchool: 'Terra Buena Elementary',
      lastPlacementDistrict: 'Yuba City Unified',
      lastPlacementCounty: 'Sutter',
      lastPlacementState: 'CA',
      specialEdServices: [
        {
          service: 'Vision Specialist Services',
          frequency: '2 times per month',
          duration: '60 minutes',
          location: 'Classroom/Resource Room',
          startDate: new Date('2025-09-01'),
          endDate: new Date('2026-06-15'),
          serviceProvider: 'Dr. Martinez',
        },
        {
          service: 'Orientation & Mobility',
          frequency: '1 time per week',
          duration: '30 minutes',
          location: 'Various',
          startDate: new Date('2025-09-01'),
          endDate: new Date('2026-06-15'),
          serviceProvider: 'Mr. Lee',
        },
      ],
      percentageOutsideGenEd: 10,
      leaRepresentativeName: 'Patricia Green',
      leaRepresentativePosition: 'SELPA Coordinator',
      submittedAt: new Date('2026-01-10'),
      deadlineDate: new Date('2026-01-24'),
      submittedByEmail: 'rebecca.thompson@email.com',
    },
  ]

  for (const referralData of sampleReferrals) {
    // Extract primary disability from disabilities object
    const primaryDisability = Object.entries(referralData.disabilities).find(
      ([_, value]) => value === 'P'
    )?.[0] || ''

    const referral = await prisma.referral.create({
      data: {
        ...referralData,
        primaryDisability,
        silo: null, // Add silo field (optional)
      },
    })

    // Create initial status history
    await prisma.statusHistory.create({
      data: {
        referralId: referral.id,
        toStatus: referralData.status,
        changedBy: referralData.submittedByEmail || 'System',
        reason: 'Referral submitted',
      },
    })

    console.log(`✅ Created referral: ${referral.confirmationNumber} - ${referral.studentName}`)
  }

  console.log('\n✨ Seed completed! 5 sample referrals created.')
  console.log('\nReferral statuses:')
  console.log('- 2 SUBMITTED')
  console.log('- 1 UNDER_REVIEW')
  console.log('- 1 APPROVED')
  console.log('- 1 PENDING_ADDITIONAL_INFO')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
