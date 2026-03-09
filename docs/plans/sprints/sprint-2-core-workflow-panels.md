# Sprint 2: Core Workflow Panels

**Status:** ✅ COMPLETE  
**Duration:** 2 weeks  
**Goal:** Build the three main workflow panels that replace spreadsheet functionality  

---

## Sprint Objectives

- Implement Program Classification panel for referral categorization
- Build CUM Records workflow panel with state machine
- Create System Sync panel for SEIS/Aeries tracking
- Enable staff to manage the complete referral lifecycle

---

## User Stories

### US-2.1: Program Classification Panel
**As a** SPED staff member, **I want to** classify referrals into program tracks and silos so that I can manage caseloads appropriately.

**Acceptance Criteria:**
- [ ] Create program classification panel component on referral detail page
- [ ] Include Program Track dropdown (GENERAL, BEHAVIOR, DHH, SCIP, VIP)
- [ ] Include Silo dropdown (ASD, SD, NC, DHH, MD, OT)
- [ ] Include District of Residence text input with autocomplete
- [ ] Include Date Student Started School date picker
- [ ] Conditionally show Referring Party field for DHH/SCIP/VIP tracks
- [ ] Conditionally show Service Provider field for VIP track
- [ ] All fields save via PATCH to referral API
- [ ] Panel respects permission settings (SPED_STAFF+ only)

**Technical Tasks:**
- Create `app/dashboard/referrals/components/program-classification-panel.tsx`
- Add district autocomplete functionality
- Implement conditional field rendering
- Add form validation and save logic
- Integrate with referral detail page layout

---

### US-2.2: CUM Records Workflow Panel
**As a** SPED staff member, **I want to** track CUM requests through a 3-step workflow so that I can ensure complete documentation is obtained.

**Acceptance Criteria:**
- [ ] Create CUM workflow panel with 3 sequential steps
- [ ] Step 1: CUM Requested with date picker and notes
- [ ] Step 2: CUM Received with date picker and notes (requires Step 1 complete)
- [ ] Step 3: CUM Sent with date picker, staff selector, and notes (requires Step 2 complete)
- [ ] Each step locks after completion but allows editing
- [ ] Generate email draft when Step 1 is marked complete
- [ ] Show email modal for staff review before sending
- [ ] Display CUM status badge in referral list
- [ ] All changes create audit trail entries

**Technical Tasks:**
- Create `app/dashboard/referrals/components/cum-workflow-panel.tsx`
- Implement state machine UI logic
- Create email draft modal component
- Integrate with CUM API endpoints
- Add audit logging for all CUM actions
- Update referral list to show CUM status badges

---

### US-2.3: System Sync Panel
**As a** SPED staff member, **I want to** track SEIS and Aeries entry so that I can ensure compliance for SCIP/VIP programs.

**Acceptance Criteria:**
- [ ] Create system sync panel component
- [ ] Only show for SCIP and VIP program tracks
- [ ] Include "Entered in SEIS" checkbox with timestamp display
- [ ] Include "Entered in Aeries" checkbox with timestamp display (hide for VIP)
- [ ] Checking box updates corresponding boolean and timestamp fields
- [ ] Unchecking clears timestamp field
- [ ] Show SEIS/Aeries status columns in referral list for appropriate presets
- [ ] Cancel pending reminders when boxes are checked

**Technical Tasks:**
- Create `app/dashboard/referrals/components/system-sync-panel.tsx`
- Implement checkbox/datetime synchronization logic
- Add conditional rendering based on program track
- Update referral table to show sync status columns
- Integrate with sync API endpoints

---

### US-2.4: Referral Detail Page Integration
**As a** SPED staff member, **I want to** access all workflow panels from the referral detail page so that I can manage referrals efficiently.

**Acceptance Criteria:**
- [ ] Add Program Classification section to referral detail page
- [ ] Add CUM Records panel to referral detail page
- [ ] Add System Sync panel to referral detail page
- [ ] Ensure proper layout and responsive design
- [ ] Add loading states and error handling
- [ ] Maintain existing page functionality

**Technical Tasks:**
- Modify `app/dashboard/referrals/[id]/page.tsx`
- Design panel layout and spacing
- Add responsive breakpoints
- Implement error boundaries
- Add accessibility features

---

### US-2.5: Enhanced Status Management
**As a** SPED staff member, **I want to** set referrals to NOT_ENROLLING or WITHDRAWN status so that I can accurately track referral outcomes.

**Acceptance Criteria:**
- [ ] Add NOT_ENROLLING and WITHDRAWN to status change dropdown
- [ ] Require reason text when selecting these statuses
- [ ] Display these statuses with appropriate styling in status badge
- [ ] Exclude from active filters but visible in specific status filters
- [ ] Log status changes with reasons to audit trail

**Technical Tasks:**
- Update `status-update-modal.tsx` with new statuses
- Add reason validation
- Update `status-badge.tsx` styling
- Modify list filtering logic
- Add audit logging for status changes

---

## Definition of Done

- All three workflow panels are fully functional
- Staff can classify referrals and manage complete CUM workflow
- SEIS/Aeries tracking works for SCIP/VIP referrals
- New statuses are available and properly styled
- All panels respect permission settings
- Mobile responsive design works correctly
- Comprehensive testing completed

---

## Risks and Mitigations

**Risk:** Complex state machine logic in CUM workflow could have bugs  
**Mitigation:** Thorough unit testing of state transitions; manual testing of edge cases

**Risk:** Email integration for CUM requests could fail  
**Mitigation:** Fallback to manual email sending; clear error messages

**Risk:** Performance impact on referral detail page loading  
**Mitigation:** Lazy loading of panels; efficient API calls

---

## Dependencies

- Sprint 1 completion (schema and API foundation)
- Email service integration testing
- User permission testing with different roles

---

## Sprint Review Criteria

- Can successfully classify a referral into correct program track
- Can complete full CUM workflow from request to sent
- Can track SEIS/Aeries status for SCIP/VIP referrals
- Can set referral to NOT_ENROLLING or WITHDRAWN with reason
- All panels work on mobile devices
- Permission restrictions work correctly
