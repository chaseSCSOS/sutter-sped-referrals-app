const { PrismaClient } = require('@prisma/client');

const p = new PrismaClient();

async function main() {
  console.log('=== DATABASE PRE-FLIGHT CHECK ===\n');

  // 1. Count existing referrals
  const count = await p.referral.count();
  console.log('Existing referrals in DB:', count);

  // 2. Distinct existing silo values
  const silos = await p.referral.findMany({ select: { silo: true }, distinct: ['silo'] });
  console.log('Existing silo values:', silos.map(r => r.silo));

  // 3. Distinct existing programTrack values
  const tracks = await p.referral.findMany({ select: { programTrack: true }, distinct: ['programTrack'] });
  console.log('Existing programTrack values:', tracks.map(r => r.programTrack));

  // 4. Distinct existing status values
  const statuses = await p.referral.findMany({ select: { status: true }, distinct: ['status'] });
  console.log('Existing status values:', statuses.map(r => r.status));

  // 5. Verify new columns exist
  const cols = await p.$queryRaw`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'Referral'
      AND column_name IN (
        'classroomTeacher','pipIndicator','programTrack','districtOfResidence',
        'cumRequestedDate','cumReceivedDate','cumSentDate','cumNotes',
        'inSEIS','inSEISDate','inAeries','inAeriesDate',
        'serviceProvider','referringParty','dateStudentStartedSchool'
      )
    ORDER BY column_name
  `;
  console.log('\n=== SCHEMA COLUMN VERIFICATION ===');
  console.log(JSON.stringify(cols, null, 2));

  // 6. Check if any referrals already have confirmationNumbers starting with IMPORT-
  const existing = await p.referral.count({
    where: { confirmationNumber: { startsWith: 'IMPORT-' } }
  });
  console.log('\nExisting IMPORT- prefixed records:', existing);
}

main()
  .catch(console.error)
  .finally(() => p.$disconnect());
