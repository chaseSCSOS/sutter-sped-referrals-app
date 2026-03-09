/**
 * import-referral-log.ts
 *
 * One-time import script for the Sutter SPED Referral Log 2025-2026 Excel file.
 * Reads all 5 sheets (SDC, BX, SCIP, VIP, DHH), transforms the data to match
 * the Prisma schema, and inserts into the database.
 *
 * Usage:
 *   npx tsx scripts/import-referral-log.ts            (live import)
 *   npx tsx scripts/import-referral-log.ts --dry-run  (preview only, no DB writes)
 *
 * Pre-requisites:
 *   pip install msoffcrypto-tool openpyxl  (already done)
 *   npm install xlsx                        (already done)
 */

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import { PrismaClient, FormType, ProgramTrack, Silo, ReferralStatus } from '@prisma/client'

const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes('--dry-run')
const EXCEL_PASSWORD = '2913'
const EXCEL_FILE = path.join(__dirname, '..', 'Referral Log 2025 2026 2.xlsx')
const TEMP_JSON = path.join(__dirname, '..', 'scripts', '_import_temp.json')
const LOG_FILE = path.join(__dirname, '..', 'scripts', 'import-errors.log')

// ── Counters ────────────────────────────────────────────────────────────────
let inserted = 0
let skipped = 0
let errors = 0
const errorLines: string[] = []

function logError(msg: string) {
  errors++
  const line = `[ERROR] ${msg}`
  console.error(line)
  errorLines.push(line)
}

function logWarn(msg: string) {
  const line = `[WARN]  ${msg}`
  console.warn(line)
  errorLines.push(line)
}

// ── Date Helpers ─────────────────────────────────────────────────────────────

/**
 * Parse a value that may be a Python datetime string ("2025-03-20 00:00:00"),
 * a JS Date object, or null/undefined.
 */
function parseDate(val: unknown): Date | null {
  if (!val) return null
  if (val instanceof Date) return val
  if (typeof val === 'string') {
    // Python datetime string: "2025-03-20 00:00:00"
    const d = new Date(val.replace(' ', 'T'))
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

/**
 * Parse the "Date CUM Received and Sent to" column.
 * Values are strings like "8/25/25 AB" or "1/21/26 AB".
 * Returns { date, initials }.
 */
function parseCumReceivedString(val: unknown): { date: Date | null; initials: string | null } {
  if (!val) return { date: null, initials: null }

  // If it's already a datetime from Python (BX sheet CUM Requested column is a real date)
  if (typeof val === 'string' && val.includes('-') && val.includes(':')) {
    return { date: parseDate(val), initials: null }
  }

  if (typeof val !== 'string') return { date: null, initials: null }

  const trimmed = val.trim()
  // Format: "M/D/YY initials" e.g. "8/25/25 AB"
  const match = trimmed.match(/^(\d{1,2}\/\d{1,2}\/\d{2,4})\s+([A-Za-z]+)$/)
  if (match) {
    const [, datePart, initials] = match
    // Parse M/D/YY — assume 20XX for 2-digit years
    const parts = datePart.split('/')
    const month = parseInt(parts[0], 10)
    const day = parseInt(parts[1], 10)
    let year = parseInt(parts[2], 10)
    if (year < 100) year += 2000

    const d = new Date(year, month - 1, day)
    if (isNaN(d.getTime())) return { date: null, initials }
    return { date: d, initials }
  }

  // No initials, just a date string
  const d = new Date(trimmed)
  if (!isNaN(d.getTime())) return { date: d, initials: null }

  return { date: null, initials: trimmed }
}

/**
 * Determine formType from checkboxes.
 * Priority: Interim > Level 2 Ref > PIP (defaults to INTERIM).
 */
function resolveFormType(interim: unknown, level2: unknown): FormType {
  if (interim) return FormType.INTERIM
  if (level2) return FormType.LEVEL_II
  // PIP rows and unchecked rows default to INTERIM
  return FormType.INTERIM
}

/**
 * Normalize a silo string to the Silo enum value.
 */
function normalizeSilo(val: unknown): Silo | null {
  if (!val) return null
  const s = String(val).trim().toUpperCase()
  const map: Record<string, Silo> = {
    ASD: Silo.ASD,
    SD: Silo.SD,
    NC: Silo.NC,
    DHH: Silo.DHH,
    MD: Silo.MD,
    OT: Silo.OT,
  }
  return map[s] ?? null
}

/**
 * Generate a unique confirmation number for imported records.
 * Format: IMPORT-{SHEET}-{ZERO_PADDED_INDEX}
 */
function makeConfirmationNumber(sheet: string, index: number): string {
  return `IMPORT-${sheet}-${String(index).padStart(3, '0')}`
}

// ── Excel Extraction (via Python) ────────────────────────────────────────────

function extractExcelToJson(): Record<string, unknown[]> {
  const pythonScript = `
import msoffcrypto, io, json
from openpyxl import load_workbook
from datetime import datetime

encrypted = open(${JSON.stringify(EXCEL_FILE.replace(/\\/g, '/'))}, 'rb')
decrypted = io.BytesIO()
f = msoffcrypto.OfficeFile(encrypted)
f.load_key(password=${JSON.stringify(EXCEL_PASSWORD)})
f.decrypt(decrypted)
encrypted.close()
decrypted.seek(0)
wb = load_workbook(decrypted, data_only=True)

result = {}
for sheet_name in wb.sheetnames:
    ws = wb[sheet_name]
    headers = [cell.value for cell in ws[1]]
    rows = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        row_dict = {}
        for h, v in zip(headers, row):
            if h is None:
                continue
            if isinstance(v, datetime):
                row_dict[h] = v.isoformat()
            else:
                row_dict[h] = v
        rows.append(row_dict)
    result[sheet_name] = rows

with open(${JSON.stringify(TEMP_JSON.replace(/\\/g, '/'))}, 'w') as out:
    json.dump(result, out)
print("OK")
`

  const tmpPy = path.join(__dirname, '..', 'scripts', '_extract.py')
  fs.writeFileSync(tmpPy, pythonScript)
  execSync(`python "${tmpPy}"`, { stdio: 'inherit' })
  fs.unlinkSync(tmpPy)

  const raw = fs.readFileSync(TEMP_JSON, 'utf-8')
  fs.unlinkSync(TEMP_JSON)
  return JSON.parse(raw)
}

// ── Row Transformers ─────────────────────────────────────────────────────────

interface ReferralInsert {
  confirmationNumber: string
  status: ReferralStatus
  formType: FormType
  pipIndicator: boolean
  submittedAt: Date
  deadlineDate: Date
  daysElapsed: number
  studentName: string
  dateOfBirth: Date
  grade: string
  classroomTeacher: string | null
  districtOfResidence: string | null
  silo: Silo | null
  programTrack: ProgramTrack
  dateStudentStartedSchool: Date | null
  referringParty: string | null
  serviceProvider: string | null
  cumRequestedDate: Date | null
  cumReceivedDate: Date | null
  cumNotes: string | null
  inSEIS: boolean
  inSEISDate: Date | null
  inAeries: boolean
  inAeriesDate: Date | null
  additionalComments: string | null
}

function transformSDCRow(row: Record<string, unknown>, sheet: 'SDC' | 'BX', index: number): ReferralInsert | null {
  const last = row['Student Last Name']
  const first = row['Student First Name']
  const dob = parseDate(row['Students DOB'])

  if (!last || !dob) return null

  const studentName = `${String(first || '').trim()} ${String(last).trim()}`.trim()
  const refDate = parseDate(row['Date of Referral']) ?? new Date()
  const isPip = !!row['PIP']
  const formType = resolveFormType(row['Interim'], row['Level 2 Ref'])

  // CUM Requested column = name of school CUM was requested from (store in cumNotes)
  const cumRequestedFrom = row['CUM Requested '] ?? row['CUM Requested']
  let cumRequestedNote: string | null = null
  let cumRequestedDate: Date | null = null

  if (cumRequestedFrom) {
    const d = parseDate(cumRequestedFrom)
    if (d) {
      // BX sheet stores actual date here
      cumRequestedDate = d
    } else {
      // SDC stores school name — put in notes
      cumRequestedNote = `CUM requested from: ${cumRequestedFrom}`
    }
  }

  // "Date CUM Received and Sent to" = string like "8/25/25 AB"
  const { date: cumReceivedDate, initials } = parseCumReceivedString(row['Date CUM Received and Sent to'])

  const noteParts: string[] = []
  if (cumRequestedNote) noteParts.push(cumRequestedNote)
  if (initials) noteParts.push(`CUM processed by: ${initials}`)
  if (!parseDate(row['Date of Referral'])) noteParts.push('[IMPORT: referral date missing — verify]')

  const silo = normalizeSilo(row['Silo'])
  const grade = row['Grade'] != null ? String(row['Grade']).trim() : ''

  // deadlineDate: referral date + 60 days (placeholder — staff should update manually)
  const deadline = new Date(refDate)
  deadline.setDate(deadline.getDate() + 60)

  return {
    confirmationNumber: makeConfirmationNumber(sheet, index),
    status: ReferralStatus.SUBMITTED,
    formType,
    pipIndicator: isPip,
    submittedAt: refDate,
    deadlineDate: deadline,
    daysElapsed: 0,
    studentName,
    dateOfBirth: dob,
    grade,
    classroomTeacher: row['Teacher'] ? String(row['Teacher']).trim() : null,
    districtOfResidence: row['DOR'] ? String(row['DOR']).trim() : null,
    silo,
    programTrack: sheet === 'BX' ? ProgramTrack.BEHAVIOR : ProgramTrack.GENERAL,
    dateStudentStartedSchool: parseDate(row['Date Student Started School']),
    referringParty: null,
    serviceProvider: null,
    cumRequestedDate,
    cumReceivedDate,
    cumNotes: noteParts.length > 0 ? noteParts.join(' | ') : null,
    inSEIS: false,
    inSEISDate: null,
    inAeries: false,
    inAeriesDate: null,
    additionalComments: '[IMPORTED from Excel Referral Log 2025-2026 — deadline date is estimated +60 days, verify manually]',
  }
}

function transformSCIPRow(row: Record<string, unknown>, index: number): ReferralInsert | null {
  const last = row[' Last Name']
  const first = row[' First Name']
  const dob = parseDate(row['DOB'])

  if (!last || !dob) return null

  const studentName = `${String(first || '').trim()} ${String(last).trim()}`.trim()
  const refDate = parseDate(row['Referral Date']) ?? new Date()

  const seisRaw = row['In SEIS']
  const aeriesRaw = row['In Aeries']
  const inSEIS = typeof seisRaw === 'string' && seisRaw.trim().toLowerCase() === 'x'
  const inAeries = typeof aeriesRaw === 'string' && aeriesRaw.trim().toLowerCase() === 'x'
  const importDate = new Date()

  const noteParts: string[] = []
  if (row['Notes']) noteParts.push(String(row['Notes']))
  if (inSEIS) noteParts.push('[IMPORT: inSEIS date is import date — verify actual entry date]')
  if (inAeries) noteParts.push('[IMPORT: inAeries date is import date — verify actual entry date]')

  const deadline = new Date(refDate)
  deadline.setDate(deadline.getDate() + 60)

  return {
    confirmationNumber: makeConfirmationNumber('SCIP', index),
    status: ReferralStatus.SUBMITTED,
    formType: FormType.INTERIM,
    pipIndicator: false,
    submittedAt: refDate,
    deadlineDate: deadline,
    daysElapsed: 0,
    studentName,
    dateOfBirth: dob,
    grade: '',
    classroomTeacher: null,
    districtOfResidence: row['DOR'] ? String(row['DOR']).trim() : null,
    silo: null,
    programTrack: ProgramTrack.SCIP,
    dateStudentStartedSchool: null,
    referringParty: row['Referring Party'] ? String(row['Referring Party']).trim() : null,
    serviceProvider: null,
    cumRequestedDate: null,
    cumReceivedDate: null,
    cumNotes: null,
    inSEIS,
    inSEISDate: inSEIS ? importDate : null,
    inAeries,
    inAeriesDate: inAeries ? importDate : null,
    additionalComments: noteParts.length > 0 ? noteParts.join(' | ') : '[IMPORTED from Excel Referral Log 2025-2026 — deadline date is estimated +60 days, verify manually]',
  }
}

function transformVIPRow(row: Record<string, unknown>, index: number): ReferralInsert | null {
  const last = row[' Last Name']
  const first = row[' First Name']
  const dob = parseDate(row['DOB'])

  if (!last || !dob) return null

  const studentName = `${String(first || '').trim()} ${String(last).trim()}`.trim()
  const refDate = parseDate(row['Referral Date']) ?? new Date()

  const seisRaw = row['In SEIS']
  const inSEIS = typeof seisRaw === 'string' && seisRaw.trim().toLowerCase() === 'x'
  const importDate = new Date()

  const noteParts: string[] = []
  if (inSEIS) noteParts.push('[IMPORT: inSEIS date is import date — verify actual entry date]')

  const deadline = new Date(refDate)
  deadline.setDate(deadline.getDate() + 60)

  return {
    confirmationNumber: makeConfirmationNumber('VIP', index),
    status: ReferralStatus.SUBMITTED,
    formType: FormType.INTERIM,
    pipIndicator: false,
    submittedAt: refDate,
    deadlineDate: deadline,
    daysElapsed: 0,
    studentName,
    dateOfBirth: dob,
    grade: '',
    classroomTeacher: null,
    districtOfResidence: row['DOR'] ? String(row['DOR']).trim() : null,
    silo: null,
    programTrack: ProgramTrack.VIP,
    dateStudentStartedSchool: null,
    referringParty: row['Referring Party'] ? String(row['Referring Party']).trim() : null,
    serviceProvider: row['Providers'] ? String(row['Providers']).trim() : null,
    cumRequestedDate: null,
    cumReceivedDate: null,
    cumNotes: null,
    inSEIS,
    inSEISDate: inSEIS ? importDate : null,
    inAeries: false,
    inAeriesDate: null,
    additionalComments: noteParts.length > 0 ? noteParts.join(' | ') : '[IMPORTED from Excel Referral Log 2025-2026 — deadline date is estimated +60 days, verify manually]',
  }
}

function transformDHHRow(row: Record<string, unknown>, index: number): ReferralInsert | null {
  const last = row[' Last Name']
  const first = row[' First Name']
  const dob = parseDate(row['DOB'])

  if (!last || !dob) return null

  const studentName = `${String(first || '').trim()} ${String(last).trim()}`.trim()
  const refDate = parseDate(row['Referral Date']) ?? new Date()

  const noteParts: string[] = []
  if (row['Notes']) noteParts.push(String(row['Notes']))

  const deadline = new Date(refDate)
  deadline.setDate(deadline.getDate() + 60)

  return {
    confirmationNumber: makeConfirmationNumber('DHH', index),
    status: ReferralStatus.SUBMITTED,
    formType: FormType.DHH_ITINERANT,
    pipIndicator: false,
    submittedAt: refDate,
    deadlineDate: deadline,
    daysElapsed: 0,
    studentName,
    dateOfBirth: dob,
    grade: '',
    classroomTeacher: null,
    districtOfResidence: row['DOR'] ? String(row['DOR']).trim() : null,
    silo: Silo.DHH,
    programTrack: ProgramTrack.DHH,
    dateStudentStartedSchool: null,
    referringParty: row['Referring Party'] ? String(row['Referring Party']).trim() : null,
    serviceProvider: null,
    cumRequestedDate: null,
    cumReceivedDate: null,
    cumNotes: null,
    inSEIS: false,
    inSEISDate: null,
    inAeries: false,
    inAeriesDate: null,
    additionalComments: noteParts.length > 0 ? noteParts.join(' | ') : '[IMPORTED from Excel Referral Log 2025-2026 — deadline date is estimated +60 days, verify manually]',
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`  SPED Referral Log Import — ${DRY_RUN ? 'DRY RUN' : 'LIVE IMPORT'}`)
  console.log(`${'='.repeat(60)}\n`)

  // 1. Extract Excel → JSON via Python
  console.log('Extracting Excel data...')
  const sheets = extractExcelToJson()
  console.log(`Sheets loaded: ${Object.keys(sheets).join(', ')}\n`)

  const allRecords: ReferralInsert[] = []

  // 2. Process SDC
  console.log('Processing SDC (General)...')
  let sdcIdx = 0
  for (const row of sheets['SDC'] as Record<string, unknown>[]) {
    const r = transformSDCRow(row, 'SDC', ++sdcIdx)
    if (r) allRecords.push(r)
    else skipped++
  }
  console.log(`  SDC: ${sdcIdx - skipped} added (${skipped} skipped so far)`)

  // 3. Process BX
  console.log('Processing BX (Behavior)...')
  let bxIdx = 0
  const bxSkippedBefore = skipped
  for (const row of sheets['BX'] as Record<string, unknown>[]) {
    const r = transformSDCRow(row, 'BX', ++bxIdx)
    if (r) allRecords.push(r)
    else skipped++
  }
  console.log(`  BX: ${bxIdx - (skipped - bxSkippedBefore)} added (${skipped - bxSkippedBefore} skipped)`)

  // 4. Process SCIP
  console.log('Processing SCIP...')
  let scipIdx = 0
  const scipSkippedBefore = skipped
  for (const row of sheets['SCIP'] as Record<string, unknown>[]) {
    const r = transformSCIPRow(row, ++scipIdx)
    if (r) allRecords.push(r)
    else skipped++
  }
  console.log(`  SCIP: ${scipIdx - (skipped - scipSkippedBefore)} added (${skipped - scipSkippedBefore} skipped)`)

  // 5. Process VIP
  console.log('Processing VIP...')
  let vipIdx = 0
  const vipSkippedBefore = skipped
  for (const row of sheets['VIP'] as Record<string, unknown>[]) {
    const r = transformVIPRow(row, ++vipIdx)
    if (r) allRecords.push(r)
    else skipped++
  }
  console.log(`  VIP: ${vipIdx - (skipped - vipSkippedBefore)} added (${skipped - vipSkippedBefore} skipped)`)

  // 6. Process DHH
  console.log('Processing DHH...')
  let dhhIdx = 0
  const dhhSkippedBefore = skipped
  for (const row of sheets['DHH'] as Record<string, unknown>[]) {
    const r = transformDHHRow(row, ++dhhIdx)
    if (r) allRecords.push(r)
    else skipped++
  }
  console.log(`  DHH: ${dhhIdx - (skipped - dhhSkippedBefore)} added (${skipped - dhhSkippedBefore} skipped)`)

  console.log(`\nTotal records to import: ${allRecords.length}`)
  console.log(`Total rows skipped (blank/invalid): ${skipped}`)

  // 7. Check for duplicate confirmation numbers within batch
  const cnSet = new Set<string>()
  for (const r of allRecords) {
    if (cnSet.has(r.confirmationNumber)) {
      logError(`Duplicate confirmation number in batch: ${r.confirmationNumber}`)
    }
    cnSet.add(r.confirmationNumber)
  }

  // 8. Dry run: print first 10 records and exit
  if (DRY_RUN) {
    console.log('\n--- DRY RUN: First 10 records ---')
    for (const r of allRecords.slice(0, 10)) {
      console.log(JSON.stringify(r, null, 2))
    }
    console.log(`\n✅ Dry run complete. ${allRecords.length} records would be inserted. ${errors} errors.`)
    return
  }

  // 9. Live import — insert in batches of 20
  console.log('\nInserting records...')
  const BATCH = 20
  for (let i = 0; i < allRecords.length; i += BATCH) {
    const batch = allRecords.slice(i, i + BATCH)
    for (const record of batch) {
      try {
        await prisma.referral.create({ data: record })
        inserted++
        if (inserted % 20 === 0) console.log(`  ${inserted}/${allRecords.length} inserted...`)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        logError(`Failed to insert ${record.confirmationNumber} (${record.studentName}): ${msg}`)
      }
    }
  }

  // 10. Final summary
  console.log(`\n${'='.repeat(60)}`)
  console.log(`  IMPORT COMPLETE`)
  console.log(`  ✅ Inserted:  ${inserted}`)
  console.log(`  ⏭️  Skipped:   ${skipped} (blank/invalid rows)`)
  console.log(`  ❌ Errors:    ${errors}`)
  console.log(`${'='.repeat(60)}\n`)

  if (errorLines.length > 0) {
    fs.writeFileSync(LOG_FILE, errorLines.join('\n') + '\n')
    console.log(`Error log written to: ${LOG_FILE}`)
  }
}

main()
  .catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
