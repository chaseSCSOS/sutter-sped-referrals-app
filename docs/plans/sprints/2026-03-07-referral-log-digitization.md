# PRD: Referral Log Digitization & Spreadsheet Elimination

**Date:** 2026-03-07
**Status:** Draft — Ready for implementation with open questions noted inline
**Author:** Derived from spreadsheet analysis + codebase review
**Goal:** Eliminate the manual "Referral Log 2025-2026" Excel workbook by building its entire function into SPEDex — and automate the parts that currently require manual entry.

---

## Problem Statement

Staff currently maintain a password-protected Excel workbook with 5 tabs to track the referral pipeline. This workbook exists entirely because the current intake process is email-based — there is no structured system of record once a referral arrives. Staff manually transcribe data from emails into the spreadsheet, chase CUM records, update statuses informally via text notes, and generate caseload counts by hand.

The workbook serves five functions today:

1. **Intake log** — a row per referral as it arrives
2. **CUM records tracker** — request/receive/forward workflow for educational history docs
3. **Program classifier** — which disability program a student belongs to
4. **Status tracker** — informal "on hold", "not coming", "paused" states
5. **Caseload snapshot** — aggregate counts by district and disability category

SPEDex already handles referral intake (forms exist for all 3 form types). This PRD covers the operational tracking layer that comes *after* intake — everything the spreadsheet does that SPEDex does not.

---

## Architecture Direction

> **CRITICAL FOR CODING LLM — READ THIS FIRST**

**Do not create new pages.** All features in this PRD are enhancements to existing pages. The three pages that collectively replace the spreadsheet are:

| Page | File | Current Role | Role After This PRD |
|---|---|---|---|
| Referral List | `app/dashboard/referrals/page.tsx` | Table of referrals | + filter presets, + new columns (CUM status, DOR, SEIS/Aeries) |
| Referral Detail | `app/dashboard/referrals/[id]/page.tsx` | View/manage one referral | + Program Classification section, + CUM workflow panel, + System Sync panel |
| Reports / Enrollment | `app/dashboard/reports/enrollment/page.tsx` | Enrollment reporting | + Caseload snapshot (replaces spreadsheet pivot) |
| Settings | `app/dashboard/settings/page.tsx` | Email notification config | + CUM reminder threshold, + SEIS/Aeries reminder threshold |

There is **no** new top-level route in this PRD. All UI additions slot into the section layout already established by those pages.

---

## Files to Modify

The following files require changes. No new files outside of the UI component layer should be necessary.

### Database / Schema
- `prisma/schema.prisma` — schema additions (see Schema Changes section)

### API Routes
- `app/api/referrals/route.ts` — add new filter query params (`programTrack`, `districtOfResidence`, `cumStatus`)
- `app/api/referrals/[id]/route.ts` — add new fields to `PATCH` handler
- `app/api/referrals/[id]/status/route.ts` — add `NOT_ENROLLING` and `WITHDRAWN` with required reason validation
- `app/api/settings/email/route.ts` — add `cumReminderDays` and `seisAeriesReminderDays` to GET/PATCH
- `app/api/referrals/[id]/` — **new subfolder**: `cum/route.ts` for the CUM workflow (3-step state machine)

### UI — List View
- `app/dashboard/referrals/components/referral-table.tsx` — new columns, preset tab rendering
- `app/dashboard/referrals/components/referral-list.tsx` — preset filter state, preset-conditional column visibility
- `app/dashboard/referrals/components/status-badge.tsx` — add `NOT_ENROLLING`, `WITHDRAWN` display

### UI — Detail View
- `app/dashboard/referrals/[id]/page.tsx` — new section slots
- `app/dashboard/referrals/components/edit-referral-modal.tsx` — add new fields to edit form
- `app/dashboard/referrals/components/detail-header.tsx` — overdue CUM alert (A-03)
- New component: `app/dashboard/referrals/components/program-classification-panel.tsx`
- New component: `app/dashboard/referrals/components/cum-workflow-panel.tsx`
- New component: `app/dashboard/referrals/components/system-sync-panel.tsx`

### Reports
- `app/dashboard/reports/enrollment/page.tsx` — add caseload summary cards, CUM funnel, SEIS/Aeries compliance

### Settings
- `app/dashboard/settings/page.tsx` — add threshold fields for CUM and SEIS/Aeries reminders

### Lib / Services
- `lib/email.ts` — add CUM request email template (A-01), SEIS/Aeries reminder template (A-02), overdue CUM alert template (A-03)
- `lib/auth/permissions.ts` — add permission checks for new CUM and sync panels (follow existing patterns)

---

## Scope

**In scope:**
- Schema additions for CUM workflow, program classification, enrollment date, SEIS/Aeries sync, and service provider
- New `ReferralStatus` values to replace informal text states
- New program track classification tied to the 5 spreadsheet tabs
- Staff-side UI enhancements on the referral detail page
- Referral list view filter presets matching the spreadsheet's 5-tab structure
- Caseload reporting additions (by district, by silo)
- Automated CUM request email drafting
- Automated SEIS/Aeries reminder notifications

**Out of scope:**
- Changes to the 3 existing intake forms (Interim, Level II, DHH Itinerant)
- Public-facing submitter experience
- Order management system

---

## Data Entry Flow

Understanding how data enters each field is essential — **do not prompt external submitters for internal operational fields**.

### Path A — Intake Form Submission (existing, unchanged)
External submitters (districts, schools) complete one of the 3 intake forms. This auto-populates:
- `studentName`, `dateOfBirth`, `grade`, `formType`, `submittedAt`, `deadlineDate`
- `schoolOfAttendance`, `schoolOfResidence`, `nativeLanguage`, `primaryDisability`
- `parentGuardianName`, contact fields
- `leaRepresentativeName`, `submittedByEmail`

These fields are set at creation time and should not be modified by internal staff under normal circumstances.

### Path B — Staff Enrichment (new, internal-only)
After a referral arrives, SPED staff (role `SPED_STAFF`, `ADMIN`, `SUPER_ADMIN`) enrich it on the detail page. These fields are NOT on intake forms:
- `programTrack` — staff classifies into the correct program caseload
- `silo` — staff assigns the disability category
- `districtOfResidence` — staff enters the DOR (may differ from school of residence)
- `dateStudentStartedSchool` — staff enters when student physically arrived
- `referringParty` — staff enters for DHH/SCIP/VIP tracks
- `serviceProvider` — staff enters for VIP track
- `cumRequestedDate`, `cumReceivedDate`, `cumSentDate`, `cumProcessedByStaffId`, `cumNotes` — via CUM workflow panel
- `inSEIS`, `inSEISDate`, `inAeries`, `inAeriesDate` — via System Sync panel
- Status transitions to `NOT_ENROLLING` / `WITHDRAWN` — via status change UI with required reason

**Key rule:** External submitters never see or fill these fields. They are internal operational fields surfaced only on the staff-facing detail page.

---

## Spreadsheet → SPEDex Mapping

### Tab structure → Filter presets

The 5 Excel tabs are caseload views, not separate workflows. They become saved filter presets in the referral list:

| Spreadsheet Tab | Filter Preset in SPEDex | Logic |
|---|---|---|
| Main | General Caseload | `programTrack = GENERAL` |
| BX | Behavior Caseload | `programTrack = BEHAVIOR` |
| DHH | DHH Caseload | `programTrack = DHH` |
| SCIP | SCIP Program | `programTrack = SCIP` |
| VIP | Early Intervention | `programTrack = VIP` |

### Column → field mapping

| Spreadsheet Column | Current Schema Field | Gap / Action |
|---|---|---|
| Interim / Level 2 / DHH checkbox | `formType` enum | Already exists — no change |
| Date of Referral | `submittedAt` | Already exists |
| Student Last/First Name | `studentName` | Already exists |
| DOB | `dateOfBirth` | Already exists |
| Grade | `grade` | Already exists |
| Teacher | Assigned via `assignedToStaffId` | Partial — teacher is separate from assigned reviewer; see F-02 |
| Date Student Started School | — | **Missing — add `dateStudentStartedSchool`** |
| CUM Requested | — | **Missing — add `cumRequestedDate`** |
| Date CUM Received and Sent to | — | **Missing — add `cumReceivedDate`, `cumSentDate`, `cumProcessedByStaffId`, `cumNotes`** |
| DOR (District of Residence) | `schoolOfResidence` (school name, not district) | **Gap — add `districtOfResidence String?`** |
| Silo | `silo String?` | Field exists but untyped — convert to enum (see migration warning) |
| In SEIS | — | **Missing — add `inSEIS Boolean`, `inSEISDate DateTime?`** |
| In Aeries | — | **Missing — add `inAeries Boolean`, `inAeriesDate DateTime?`** |
| Providers | — | **Missing — add `serviceProvider String?`** |
| Referring Party | — | **Missing — add `referringParty String?`** |
| Status notes (on hold, not coming...) | `ReferralStatus.ON_HOLD` exists | Add `NOT_ENROLLING`, `WITHDRAWN` |

---

## Schema Changes

### 1. Referral model additions

Add the following fields to the `Referral` model in `prisma/schema.prisma`:

```prisma
  // Program Classification (internal staff fields — not set by external submitters)
  programTrack              ProgramTrack   @default(GENERAL)
  districtOfResidence       String?        // e.g. "YCUSD", "LOUSD", "Brittan" — DOR, not school name
  referringParty            String?        // Person/org who initiated — populated for DHH, SCIP, VIP tracks
  dateStudentStartedSchool  DateTime?      // When student physically started at the school site

  // CUM Records Workflow
  cumRequestedDate          DateTime?      // Date staff sent CUM request to previous school
  cumReceivedDate           DateTime?      // Date CUM docs arrived
  cumSentDate               DateTime?      // Date CUM docs forwarded to receiving school/staff
  cumProcessedByStaffId     String?        // FK → User — who handled the CUM workflow
  cumProcessedByStaff       User?          @relation("CumProcessedByStaff", fields: [cumProcessedByStaffId], references: [id])
  cumNotes                  String?        // Free text for CUM edge cases

  // External System Sync (SCIP and VIP programs)
  inSEIS                    Boolean        @default(false)
  inSEISDate                DateTime?      // Timestamp when inSEIS was checked
  inAeries                  Boolean        @default(false)
  inAeriesDate              DateTime?      // Timestamp when inAeries was checked

  // Service Provider (VIP / early intervention programs)
  serviceProvider           String?        // e.g. "L. Huck", "E. LaGue"
```

Also add indexes for new filterable fields:

```prisma
  @@index([programTrack])
  @@index([districtOfResidence])
  @@index([silo])
```

### 2. User model — reverse relation for CUM

Add the following relation to the `User` model:

```prisma
  cumProcessedReferrals     Referral[]     @relation("CumProcessedByStaff")
```

Without this, Prisma will error on the bidirectional relation defined on `Referral.cumProcessedByStaff`.

### 3. New enums

```prisma
enum ProgramTrack {
  GENERAL     // Main tab — general SPED caseload
  BEHAVIOR    // BX tab — behavior-specific Level II cases
  DHH         // DHH tab — Deaf/Hard of Hearing
  SCIP        // SCIP tab — School Community Intervention & Prevention
  VIP         // VIP tab — Early Intervention (birth to 3)
}
```

> **Validation note:** `ProgramTrack.DHH` will always align with `formType = DHH_ITINERANT`. Enforce this in the API layer (`app/api/referrals/[id]/route.ts`) — not as a DB constraint — to keep the schema flexible.

```prisma
// Add to existing ReferralStatus enum:
enum ReferralStatus {
  SUBMITTED
  UNDER_REVIEW
  MISSING_DOCUMENTS
  PENDING_ADDITIONAL_INFO
  PENDING_APPROVAL
  APPROVED
  ACCEPTED_AWAITING_PLACEMENT
  REJECTED
  ON_HOLD           // already exists
  COMPLETED
  NOT_ENROLLING     // NEW — student will not be enrolling; treated as soft-close
  WITHDRAWN         // NEW — parent/guardian paused or withdrew; may reactivate
}
```

### 4. Silo — convert String to enum

> **⚠️ MIGRATION WARNING — READ BEFORE RUNNING THIS MIGRATION**
>
> The `silo` field currently exists in production as `silo String?`. Converting it to an enum is a **breaking migration**. If any existing row contains a `silo` value that doesn't match the enum (including case differences, typos, or values not in the enum list), the `ALTER TABLE` will fail and leave your DB in a bad state.
>
> **Required steps before running this migration:**
> 1. Run: `SELECT DISTINCT silo FROM "Referral" WHERE silo IS NOT NULL;` against production
> 2. Map every returned value to a valid enum member or `NULL`
> 3. Run an `UPDATE` to normalize all values: `UPDATE "Referral" SET silo = 'ASD' WHERE silo ILIKE 'asd';` etc.
> 4. Only then run `prisma migrate deploy` to change the column type
>
> Alternatively, use a two-step migration: add a new `siloEnum Silo?` column, backfill it, then drop `silo String?`.

```prisma
enum Silo {
  ASD    // Autism Spectrum Disorder
  SD     // Specific Disability (Learning Disability / SLD)
  NC     // Non-Categorical
  DHH    // Deaf / Hard of Hearing
  MD     // Multiple Disabilities
  OT     // Other — catch-all; resolve to specific value when possible
}

// On Referral model, replace: silo String?
// With:
silo    Silo?
```

> **⚠️ Open question (OQ-2):** Confirm the complete set of valid Silo values with program staff before locking this enum. The spreadsheet shows ASD, SD, NC, DHH, MD. `OT` is provided as an escape hatch.

### 5. EmailSettings model additions

Add threshold fields to the `EmailSettings` model for automation configuration:

```prisma
model EmailSettings {
  id                       String   @id @default(cuid())
  orderNotifyEmails        String[]
  referralNotifyEmails     String[]
  cumReminderDays          Int      @default(10)   // NEW — days before overdue CUM alert fires
  seisAeriesReminderDays   Int      @default(5)    // NEW — days before SEIS/Aeries reminder fires
  updatedAt                DateTime @updatedAt
  updatedById              String?
}
```

---

## API Changes

### `GET /api/referrals` — `app/api/referrals/route.ts`

Add the following optional query parameters to the existing filter logic:

| New Param | Type | Behavior |
|---|---|---|
| `programTrack` | `ProgramTrack` enum string | Filter by program track (drives list presets) |
| `districtOfResidence` | string | Filter by DOR (exact match or partial) |
| `cumStatus` | `none \| requested \| received \| sent` | Derived filter: `none` = cumRequestedDate null, `requested` = cumRequestedDate set + cumReceivedDate null, etc. |
| `inSEIS` | boolean string | Filter by SEIS sync status |
| `inAeries` | boolean string | Filter by Aeries sync status |

The response shape for each referral in the list should include these new fields when present: `programTrack`, `districtOfResidence`, `cumRequestedDate`, `cumReceivedDate`, `cumSentDate`, `inSEIS`, `inAeries`.

### `PATCH /api/referrals/[id]` — `app/api/referrals/[id]/route.ts`

Extend the PATCH body to accept the following new fields. All are optional:

```typescript
{
  programTrack?: ProgramTrack
  districtOfResidence?: string
  referringParty?: string
  dateStudentStartedSchool?: string // ISO date string
  serviceProvider?: string
  silo?: Silo
  // CUM fields are handled by the dedicated CUM endpoint, not this one
  // SEIS/Aeries fields are also handled by the dedicated endpoint
}
```

Permission check: Only `SPED_STAFF`, `ADMIN`, `SUPER_ADMIN` may write these fields. Reject with 403 if role is `EXTERNAL_ORG` or `TEACHER`. Follow the existing permission pattern in `lib/auth/permissions.ts`.

### `POST /api/referrals/[id]/cum` — **new file**: `app/api/referrals/[id]/cum/route.ts`

Handles the 3-step CUM workflow as a state machine. Steps must be completed in order.

```typescript
// POST body:
{
  step: 'requested' | 'received' | 'sent'
  date: string         // ISO date string
  notes?: string
  staffId?: string     // Only for 'sent' step — sets cumProcessedByStaffId
}
```

Behavior:
- `step: 'requested'` — Sets `cumRequestedDate`. Triggers A-01 (returns email draft in response body for modal display). Does NOT send email — that's a separate action.
- `step: 'received'` — Sets `cumReceivedDate`. Requires `cumRequestedDate` to already be set; return 400 if not.
- `step: 'sent'` — Sets `cumSentDate` and optionally `cumProcessedByStaffId`. Requires `cumReceivedDate` to already be set; return 400 if not.

Each step writes a `StatusHistory` or `Note` record for auditability.

### `POST /api/referrals/[id]/cum/email` — new sub-route

Sends the CUM request email draft after staff reviews/edits it in the modal. Calls the Microsoft Graph email integration in `lib/email.ts`. Logs the send as a `Note` with `noteType = EMAIL`.

### `PATCH /api/referrals/[id]/status` — `app/api/referrals/[id]/status/route.ts`

Add handling for new statuses:
- `NOT_ENROLLING` and `WITHDRAWN` require a `reason` string in the request body — return 400 if missing
- These statuses should be logged to `StatusHistory` with the reason in the `reason` field

### `GET /api/settings/email` and `PATCH /api/settings/email` — `app/api/settings/email/route.ts`

Extend both GET and PATCH to include `cumReminderDays` and `seisAeriesReminderDays` from the `EmailSettings` model.

### `PATCH /api/referrals/[id]/sync` — **new file**: `app/api/referrals/[id]/sync/route.ts`

Handles SEIS/Aeries checkbox updates:

```typescript
// PATCH body:
{
  field: 'inSEIS' | 'inAeries'
  value: boolean
}
```

When `value = true`, also sets the corresponding date field (`inSEISDate` or `inAeriesDate`) to `now()`. When `value = false`, clears the date field. This keeps the boolean and timestamp always consistent.

---

## Feature Specifications

### F-01 — CUM Records Workflow Panel

**Problem:** Staff currently track the CUM sub-workflow (request → receive → forward) in a single dense spreadsheet column. There is no accountability, no timestamps beyond what staff type, and no automation.

**What to build:**

A collapsible "CUM Records" panel on the referral detail page (`/dashboard/referrals/[id]`), rendered by `app/dashboard/referrals/components/cum-workflow-panel.tsx`. Visible to `SPED_STAFF`, `ADMIN`, `SUPER_ADMIN` — not visible to `EXTERNAL_ORG` or `TEACHER`.

The panel has three sequential steps, each with a date field and optional notes:

```
Step 1: CUM Requested
  [ Date picker ]  [ Optional notes ]  [ Mark as Requested → POST /cum { step: 'requested' } ]

Step 2: CUM Received   ← only active once Step 1 complete
  [ Date picker ]  [ Optional notes ]  [ Mark as Received → POST /cum { step: 'received' } ]

Step 3: CUM Sent to School  ← only active once Step 2 complete
  [ Date picker ]  [ Staff selector → cumProcessedByStaffId ]  [ Optional notes ]  [ Mark as Sent → POST /cum { step: 'sent' } ]
```

Each step locks after completion but includes an Edit button to re-open for correction. All changes write a `Note` record for auditability.

**Email draft modal:** When Step 1 is marked, the API returns a pre-filled email draft. Display it in a modal (use existing modal component pattern) for staff to review/edit before confirming send. The send button calls `POST /api/referrals/[id]/cum/email`.

**Display in referral list:** The `referral-table.tsx` should show CUM status as a compact badge on each row: `—` (not started), `Requested`, `Received`, `Sent`. Color: neutral/gray progression.

---

### F-02 — Program Classification Panel

**Problem:** The `silo` field exists in the schema but is untyped, not enforced, and not surfaced in the UI. `programTrack` doesn't exist. Staff have no way to classify a referral into the correct program caseload.

**What to build:**

A "Program Classification" section on the referral detail page, rendered by `app/dashboard/referrals/components/program-classification-panel.tsx`. Visible to `SPED_STAFF+`. Writable only by `SPED_STAFF`, `ADMIN`, `SUPER_ADMIN`.

Fields:

| Field | Input Type | Visible When | API Field |
|---|---|---|---|
| Program Track | Select (ProgramTrack enum) | Always | `programTrack` |
| Silo | Select (Silo enum) | Always | `silo` |
| District of Residence | Text + autocomplete from existing DOR values | Always | `districtOfResidence` |
| Date Student Started School | Date picker | Always | `dateStudentStartedSchool` |
| Referring Party | Text | `programTrack IN (DHH, SCIP, VIP)` | `referringParty` |
| Service Provider | Text | `programTrack = VIP` | `serviceProvider` |

Fields that are program-track-specific show/hide based on the selected Program Track value using conditional rendering. All saves via `PATCH /api/referrals/[id]`.

**Note on intake:** External submitters do not see or fill these fields. `programTrack` defaults to `GENERAL` on creation. Staff classify it post-submission.

---

### F-03 — SEIS / Aeries Sync Tracking Panel

**Problem:** SCIP and VIP programs require staff to enter each student into SEIS and Aeries. Currently tracked with spreadsheet checkboxes with no timestamps or reminders.

**What to build:**

A "System Sync" panel rendered by `app/dashboard/referrals/components/system-sync-panel.tsx`. Only shown when `programTrack IN (SCIP, VIP)`.

```
[ ✓ ] Entered in SEIS      Checked: [date/time or "Not yet"]
[ ✓ ] Entered in Aeries    Checked: [date/time or "Not yet"]   ← hidden for VIP (no Aeries column in VIP spreadsheet)
```

Checking a box calls `PATCH /api/referrals/[id]/sync`. Unchecking clears the date. Dates are read-only once set (display only); only the checkbox is interactive.

**Automation trigger:** Checking either box also cancels any pending reminder for that field (A-02).

**Display in referral list:** When the `SCIP` or `VIP` preset is active in the list view, show SEIS and Aeries status as columns in the table. These columns should not appear in other presets.

---

### F-04 — Referral List Filter Presets

**Problem:** Staff switch Excel tabs to see different program views. The referral list has no equivalent.

**What to build:**

A preset tab strip at the top of `app/dashboard/referrals/page.tsx` (or a sidebar selector — match existing design language). Each preset applies a filter combination and optionally adjusts visible columns.

| Preset Label | `programTrack` Filter | Extra Visible Columns |
|---|---|---|
| All | (none) | — |
| General Caseload | `GENERAL` | DOR, CUM Status |
| Behavior (BX) | `BEHAVIOR` | DOR, CUM Status |
| DHH | `DHH` | Referring Party |
| SCIP | `SCIP` | In SEIS, In Aeries |
| Early Intervention | `VIP` | In SEIS, Provider |

Preset state drives the `?programTrack=` query param to `GET /api/referrals`. Persist selected preset in URL (not localStorage) so links are shareable.

---

### F-05 — New Status Values

**Problem:** Staff type "not coming to us", "Pause due to parents wanting to wait" as free text in the spreadsheet. These are real operational states that need to be filterable and reportable.

**What to add to `ReferralStatus`:**

- `NOT_ENROLLING` — Student will not be enrolling. Soft-close: preserves the record but removes from active queue filters.
- `WITHDRAWN` — Parent/guardian paused or withdrew. May reactivate. Distinct from `ON_HOLD` (which is operational, not parent-driven).

**UI behavior:**
- Both appear in the status change dropdown in `status-update-modal.tsx`
- Selecting either one requires a reason note before confirming (existing pattern in status modal — extend it)
- In `status-badge.tsx`: display `NOT_ENROLLING` and `WITHDRAWN` with a muted/gray color scheme distinct from active-state colors
- In list view: these statuses should be excluded from the "active" default filter (if one exists) but visible when filtering by specific status

---

### F-06 — Caseload Reporting Enhancements

**Problem:** The spreadsheet's bottom section has a manually-maintained pivot of counts by district and disability. This is the primary caseload snapshot.

**What to build:**

Extend `app/dashboard/reports/enrollment/page.tsx` with a "Caseload" section (or add a new tab within that page — do not create a new route):

**Summary cards** (current school year, all filterable by program track):
- Total active referrals
- Count by Silo (ASD, SD, NC, DHH, MD, Other)
- Count by District of Residence
- Count by Program Track

**CUM workflow funnel:**
- Referrals with CUM not yet requested
- Referrals with CUM requested but not received (+ avg days waiting)
- Referrals with CUM received but not forwarded

**SEIS/Aeries compliance** (SCIP/VIP only):
- Students not yet entered in SEIS
- Students not yet entered in Aeries

**CSV export:** All table views export to CSV. Target format should mirror the existing spreadsheet column structure for staff who need continuity during the transition period.

> This page should answer every question the spreadsheet pivot answered, so staff open SPEDex instead.

---

## Automation Specifications

### A-01 — CUM Request Email Draft

**Trigger:** Staff marks Step 1 (CUM Requested) on a referral via `POST /api/referrals/[id]/cum { step: 'requested' }`.

**Action:** API builds a pre-filled email draft using data from the referral:
- Student name and DOB
- Previous school (`lastPlacementSchool`) and district (`lastPlacementDistrict`)
- Standard CUM request language (template in `lib/email.ts`)
- SCSOS return address

The draft is returned in the API response body (not auto-sent). The frontend displays it in an editable modal. Staff confirm before sending. The actual send hits `POST /api/referrals/[id]/cum/email` which calls the Microsoft Graph integration (`lib/email.ts`). The send is logged as a `Note` with `noteType = EMAIL`.

**If `lastPlacementSchool` or `lastPlacementDistrict` is null**, the draft still generates but with `[UNKNOWN SCHOOL]` / `[UNKNOWN DISTRICT]` placeholders that staff must fill in.

---

### A-02 — SEIS/Aeries Entry Reminder

**Trigger:** Cron/scheduled job checks daily: referrals with `programTrack IN (SCIP, VIP)` where `inSEIS = false` or `inAeries = false` and `submittedAt < now() - seisAeriesReminderDays`.

**Action:** Send reminder email to `assignedToStaff` (if set) or fallback to `referralNotifyEmails` list from `EmailSettings`. Template in `lib/email.ts`.

**Configuration:** `seisAeriesReminderDays` in `EmailSettings` model (default: 5). Configurable at `/dashboard/settings`.

**Deduplication:** Do not re-send if a reminder was sent in the last `seisAeriesReminderDays` days. Track with a `lastReminderSentAt` field or check `Note` records with a specific type.

---

### A-03 — Overdue CUM Alert

**Trigger:** Referral has `cumRequestedDate IS NOT NULL` and `cumReceivedDate IS NULL` and `cumRequestedDate < now() - cumReminderDays` (from `EmailSettings`).

**Two-level response:**
1. **In-app:** Surface an alert banner in `detail-header.tsx` for that referral. Badge the referral row in the list view.
2. **Email:** Optionally send a reminder to `assignedToStaff` or `referralNotifyEmails`.

**Configuration:** `cumReminderDays` in `EmailSettings` (default: 10). Configurable at `/dashboard/settings`.

---

## Permissions Reference

All new panels and fields follow the existing permission model in `lib/auth/permissions.ts`. The mapping for new features:

| Feature | Read | Write |
|---|---|---|
| Program Classification panel | `SPED_STAFF`, `ADMIN`, `SUPER_ADMIN` | `SPED_STAFF`, `ADMIN`, `SUPER_ADMIN` |
| CUM Workflow panel | `SPED_STAFF`, `ADMIN`, `SUPER_ADMIN` | `SPED_STAFF`, `ADMIN`, `SUPER_ADMIN` |
| System Sync panel | `SPED_STAFF`, `ADMIN`, `SUPER_ADMIN` | `SPED_STAFF`, `ADMIN`, `SUPER_ADMIN` |
| New status values (NOT_ENROLLING, WITHDRAWN) | All authenticated | `SPED_STAFF`, `ADMIN`, `SUPER_ADMIN` |
| Settings threshold fields | `ADMIN`, `SUPER_ADMIN` | `ADMIN`, `SUPER_ADMIN` |
| Caseload reporting page | `SPED_STAFF`, `ADMIN`, `SUPER_ADMIN` | N/A (read-only report) |

`EXTERNAL_ORG` and `TEACHER` roles must never see or be able to write operational fields like `programTrack`, `silo`, `districtOfResidence`, CUM dates, or SEIS/Aeries status. These are strictly internal.

Extend `lib/auth/permissions.ts` by adding named permission checks (e.g., `canWriteOperationalFields`, `canManageCUM`) following whatever pattern already exists in that file.

---

## UI Change Summary

### `app/dashboard/referrals/page.tsx` (list view)
- Add program track filter preset tab strip
- New columns: CUM Status badge, District of Residence (DOR)
- Conditional columns: SEIS / Aeries (SCIP/VIP presets), Referring Party (DHH preset), Service Provider (VIP preset)
- Preset state drives `?programTrack=` URL param

### `app/dashboard/referrals/[id]/page.tsx` (detail view)
- Add "Program Classification" section (`program-classification-panel.tsx`)
- Add "CUM Records" panel (`cum-workflow-panel.tsx`)
- Add "System Sync" panel (`system-sync-panel.tsx`) — conditionally rendered for SCIP/VIP tracks
- `status-update-modal.tsx`: add `NOT_ENROLLING` and `WITHDRAWN` with required reason input
- `detail-header.tsx`: overdue CUM alert banner

### `app/dashboard/reports/enrollment/page.tsx`
- Caseload summary cards (Silo, DOR, Program Track counts)
- CUM workflow funnel
- SEIS/Aeries compliance view
- CSV export for all tables

### `app/dashboard/settings/page.tsx`
- CUM reminder threshold (days) — maps to `EmailSettings.cumReminderDays`
- SEIS/Aeries reminder threshold (days) — maps to `EmailSettings.seisAeriesReminderDays`

---

## Open Questions

Resolve with program staff before or during implementation. None block starting — defaults are noted.

| # | Question | Impact | Default if unresolved |
|---|---|---|---|
| OQ-1 | What is PIP exactly — a program type, school site, or placement designation? Does it need its own `ProgramTrack`? | Determines if VIP/SCIP covers it or if PIP is separate | Treat as a site name in `districtOfResidence`; add track later if needed |
| OQ-2 | Complete set of valid Silo values — any beyond ASD, SD, NC, DHH, MD? | Locks the `Silo` enum | Build with current 5 + `OT` as escape hatch |
| OQ-3 | Do SCIP referrals use the Interim form or need a distinct 4th form type? | May require a new `FormType` value | Assume `FormType.INTERIM` + `programTrack = SCIP` is sufficient |
| OQ-4 | Do VIP referrals currently enter SPEDex at all, or come in through a different channel entirely? | **High impact** — if not in SPEDex yet, VIP is the largest gap | Build VIP track as staff-entered internal records if external intake doesn't apply yet |
| OQ-5 | Who are the staff members behind the "AB" / "AW" / "BH" CUM initials? Active SPEDex users? | Determines if `cumProcessedByStaffId` FK to User works or needs to be free-text | Build as `cumNotes String?` with initials for now; migrate to FK once confirmed |
| OQ-6 | What does the "Count" column represent — classroom count, sibling count, something else? | Low impact | Leave out of scope until clarified |
| OQ-7 | Should `districtOfResidence` be free-text or a managed `District` lookup model? | Affects reporting quality and query consistency | `String?` with autocomplete from existing values; migrate to FK if reporting demands it |
| OQ-8 | Should the CUM request email automation send directly to previous school, or draft to staff inbox only? | Integration depth of A-01 | Draft-only — staff confirms before send |

---

## Migration / Transition Notes

### Data Import from Spreadsheet

The spreadsheet contains ~83 active referral records for 2025-2026 that need to be imported into SPEDex so staff don't run parallel systems during rollout. Write a one-time import script (`scripts/import-referral-log.ts`) with these transforms:

| Spreadsheet Value | SPEDex Field | Transform |
|---|---|---|
| Checkbox: Interim | `formType = INTERIM` | Direct |
| Checkbox: Level 2 | `formType = LEVEL_II` | Direct |
| CUM date+initials string (e.g. `"8/25/25 AB"`) | `cumReceivedDate` + `cumNotes` | Split on space; parse date; put initials in `cumNotes` |
| Silo text (e.g. "ASD") | `silo = Silo.ASD` | Case-normalize then enum map |
| Status note "on hold" | `status = ON_HOLD` | Text match |
| Status note "not coming to us" | `status = NOT_ENROLLING` | Text match |
| Malformed dates (`6/925`, `10/32/25`, `1/726`) | flag for manual review | Parse best-effort; set a `cumNotes` flag like `"[IMPORT: date parse error — verify: 6/925"]` |
| Tab source (Main/BX/DHH/SCIP/VIP) | `programTrack` | Direct enum map per tab |
| "In SEIS" checkbox (x) | `inSEIS = true`, `inSEISDate` = import date | Flag imported records so staff know to verify actual date |
| "In Aeries" checkbox (x) | `inAeries = true`, `inAeriesDate` = import date | Same note |

After import, keep the spreadsheet read-only for 30 days as a reference, then archive it.

### Silo String → Enum Migration (Production DB)

> **⚠️ This is the highest-risk migration in this PRD. Do not skip this step.**

Before applying the `silo String? → Silo?` Prisma migration against production:

1. Query all distinct values: `SELECT DISTINCT silo FROM "Referral" WHERE silo IS NOT NULL;`
2. Confirm every value maps cleanly to the enum
3. Normalize with UPDATE statements
4. Run `prisma migrate deploy`

If any unmapped value exists at migration time, the `ALTER COLUMN` will fail. Plan for this with a pre-migration validation script.

---

## Implementation Priority

| Priority | Feature | File(s) | Rationale |
|---|---|---|---|
| P0 | Schema migrations — all new fields, enums, indexes | `prisma/schema.prisma` | Unblocks everything; do silo migration carefully |
| P0 | Program Classification panel | `program-classification-panel.tsx`, `PATCH /api/referrals/[id]` | Core classification that drives all filtering |
| P1 | CUM workflow panel | `cum-workflow-panel.tsx`, `POST /api/referrals/[id]/cum` | Highest-volume manual work today |
| P1 | Referral list filter presets | `referral-list.tsx`, `referral-table.tsx`, `GET /api/referrals` | Replaces daily tab-switching |
| P1 | New status values (NOT_ENROLLING, WITHDRAWN) | `status-update-modal.tsx`, `PATCH /api/referrals/[id]/status` | Closes the informal status note gap |
| P2 | SEIS/Aeries sync panel | `system-sync-panel.tsx`, `PATCH /api/referrals/[id]/sync` | Program compliance tracking |
| P2 | Caseload reporting enhancements | `reports/enrollment/page.tsx` | Replaces spreadsheet pivot |
| P2 | Data import from spreadsheet | `scripts/import-referral-log.ts` | Transition continuity |
| P3 | CUM request email draft (A-01) | `lib/email.ts`, `POST /api/referrals/[id]/cum/email` | High value but not blocking daily work |
| P3 | SEIS/Aeries reminder automation (A-02) | `lib/email.ts`, cron job | Requires cron infra setup |
| P3 | Overdue CUM alert (A-03) | `detail-header.tsx`, cron job | Nice-to-have once CUM workflow is live |
