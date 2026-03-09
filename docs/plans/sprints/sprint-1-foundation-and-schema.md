# Sprint 1: Foundation and Schema Changes

**Status:** ✅ COMPLETE  
**Duration:** 1 week  
**Goal:** Establish the data foundation and basic structure for all subsequent features  

---

## Sprint Objectives

- Implement all database schema changes required for the referral log digitization
- Set up basic API endpoints with new fields
- Ensure data integrity and migration safety
- Create foundation UI components

---

## User Stories

### US-1.1: Database Schema Implementation
**As a** developer, **I want to** implement all schema changes so that the application can support the new referral tracking features.

**Acceptance Criteria:**
- [ ] Add all new fields to `Referral` model (programTrack, districtOfResidence, referringParty, dateStudentStartedSchool, CUM workflow fields, SEIS/Aeries fields, serviceProvider)
- [ ] Add reverse relation to `User` model for CUM processing
- [ ] Create new enums: `ProgramTrack`, extended `ReferralStatus`, `Silo`
- [ ] Add database indexes for new filterable fields
- [ ] Add new fields to `EmailSettings` model
- [ ] Run successful migration that doesn't break existing data

**Technical Tasks:**
- Modify `prisma/schema.prisma`
- Create and test Prisma migration
- Verify existing data compatibility

---

### US-1.2: API Foundation
**As a** developer, **I want to** extend existing API endpoints to handle new fields so that the frontend can interact with the enhanced data model.

**Acceptance Criteria:**
- [ ] Extend `GET /api/referrals` with new filter parameters (programTrack, districtOfResidence, cumStatus, inSEIS, inAeries)
- [ ] Extend `PATCH /api/referrals/[id]` to accept new operational fields
- [ ] Add permission validation for operational fields (SPED_STAFF+ only)
- [ ] Extend status endpoint to handle NOT_ENROLLING and WITHDRAWN with reason validation
- [ ] Extend email settings endpoints for new threshold fields

**Technical Tasks:**
- Modify `app/api/referrals/route.ts`
- Modify `app/api/referrals/[id]/route.ts`
- Modify `app/api/referrals/[id]/status/route.ts`
- Modify `app/api/settings/email/route.ts`
- Update `lib/auth/permissions.ts`

---

### US-1.3: CUM Workflow API
**As a** SPED staff member, **I want to** manage CUM record requests through a dedicated API so that I can track the complete CUM workflow.

**Acceptance Criteria:**
- [ ] Create `POST /api/referrals/[id]/cum` endpoint for 3-step CUM workflow
- [ ] Implement state machine validation (steps must be completed in order)
- [ ] Create `POST /api/referrals/[id]/cum/email` for sending CUM requests
- [ ] Create `PATCH /api/referrals/[id]/sync` for SEIS/Aeries status updates
- [ ] Add audit logging for all CUM and sync actions

**Technical Tasks:**
- Create `app/api/referrals/[id]/cum/route.ts`
- Create `app/api/referrals/[id]/sync/route.ts`
- Implement state machine logic
- Add audit trail functionality

---

### US-1.4: Basic UI Foundation
**As a** developer, **I want to** create the basic UI components so that the enhanced referral data can be displayed and edited.

**Acceptance Criteria:**
- [ ] Update referral table component to display new fields as columns
- [ ] Create status badge variants for NOT_ENROLLING and WITHDRAWN
- [ ] Update edit referral modal to include new operational fields
- [ ] Add basic permission-based visibility controls

**Technical Tasks:**
- Modify `app/dashboard/referrals/components/referral-table.tsx`
- Modify `app/dashboard/referrals/components/status-badge.tsx`
- Modify `app/dashboard/referrals/components/edit-referral-modal.tsx`
- Add permission checks to UI components

---

## Definition of Done

- All schema changes migrated successfully
- API endpoints return correct data and enforce permissions
- New fields are visible in the referral list and edit forms
- All automated tests pass
- Manual testing confirms basic CRUD operations work
- No regressions in existing functionality

---

## Risks and Mitigations

**Risk:** Silo field migration could fail if existing data doesn't match enum values  
**Mitigation:** Run production data analysis before migration; have rollback plan ready

**Risk:** Permission logic could expose internal fields to external users  
**Mitigation:** Comprehensive testing with different user roles; code review focused on security

---

## Dependencies

- Database access for migration execution
- Production data analysis for silo field values
- Email service integration testing (for CUM emails)

---

## Sprint Review Criteria

- Can successfully create a referral and see all new fields
- API permissions correctly restrict access to operational fields
- CUM workflow API accepts valid state transitions
- No performance degradation in referral list loading
