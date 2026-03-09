# Sprint 4: Automation and Reporting

**Status:** ✅ COMPLETE  
**Duration:** 2 weeks  
**Goal:** Implement automated workflows and comprehensive reporting to eliminate manual spreadsheet tasks  

---

## Sprint Objectives

- Build automated CUM request email functionality
- Implement SEIS/Aeries reminder system
- Create comprehensive caseload reporting
- Add settings configuration for automation thresholds
- Complete data migration from spreadsheet

---

## User Stories

### US-4.1: CUM Request Email Automation
**As a** SPED staff member, **I want to** automatically generate CUM request emails so that I can save time and ensure consistent communication.

**Acceptance Criteria:**
- [ ] Generate email draft when CUM Requested step is marked
- [ ] Include student name, DOB, previous school/district in draft
- [ ] Use standard CUM request language template
- [ ] Show editable modal for staff review before sending
- [ ] Handle missing school/district info with placeholders
- [ ] Send email via Microsoft Graph integration
- [ ] Log sent emails as Note records for audit trail
- [ ] Handle email sending errors gracefully

**Technical Tasks:**
- Create email template in `lib/email.ts`
- Implement email draft generation API
- Create email review modal component
- Integrate Microsoft Graph email sending
- Add email logging and error handling
- Update CUM workflow panel to trigger email flow

---

### US-4.2: SEIS/Aeries Reminder System
**As a** SPED staff member, **I want to** receive automatic reminders for SEIS/Aeries entry so that I don't miss compliance deadlines.

**Acceptance Criteria:**
- [ ] Daily scheduled job checks for overdue SEIS/Aeries entries
- [ ] Send reminder emails to assigned staff or fallback email list
- [ ] Use configurable reminder threshold (default 5 days)
- [ ] Prevent duplicate reminders within threshold period
- [ ] Include referral details and direct link in reminder
- [ ] Log reminder sends for audit trail
- [ ] Allow manual reminder triggering from admin panel

**Technical Tasks:**
- Create scheduled job/cron functionality
- Implement reminder logic and deduplication
- Create reminder email template
- Add job logging and monitoring
- Create admin interface for reminder management
- Test with various reminder scenarios

---

### US-4.3: Overdue CUM Alerts
**As a** SPED staff member, **I want to** be alerted when CUM requests are overdue so that I can follow up promptly.

**Acceptance Criteria:**
- [ ] Show alert banner on referral detail page for overdue CUM
- [ ] Badge referral rows in list view for overdue items
- [ ] Send optional email alerts for overdue CUM
- [ ] Use configurable overdue threshold (default 10 days)
- [ ] Clear alerts when CUM is received
- [ ] Include urgency level based on days overdue

**Technical Tasks:**
- Create overdue detection logic
- Add alert banner component to detail header
- Update referral list to show overdue badges
- Implement email alert system
- Add threshold configuration to settings

---

### US-4.4: Caseload Reporting Dashboard
**As a** SPED administrator, **I want to** view comprehensive caseload reports so that I can understand referral volumes and workflow efficiency.

**Acceptance Criteria:**
- [ ] Add caseload section to enrollment reports page
- [ ] Summary cards: total active referrals, counts by silo/DOR/program track
- [ ] CUM workflow funnel showing stages and average wait times
- [ ] SEIS/Aeries compliance view for SCIP/VIP programs
- [ ] All tables filterable by date range and program track
- [ ] CSV export functionality for all report tables
- [ ] Responsive design for mobile viewing
- [ ] Print-friendly formatting

**Technical Tasks:**
- Extend `app/dashboard/reports/enrollment/page.tsx`
- Create summary card components
- Implement funnel chart for CUM workflow
- Build compliance tracking tables
- Add CSV export functionality
- Design responsive report layout

---

### US-4.5: Settings Configuration
**As a** SPED administrator, **I want to** configure automation thresholds so that I can adjust reminder timing to match our workflow.

**Acceptance Criteria:**
- [ ] Add CUM reminder threshold setting (days before overdue)
- [ ] Add SEIS/Aeries reminder threshold setting (days)
- [ ] Settings persist to EmailSettings model
- [ ] Include help text explaining each setting
- [ ] Validate input ranges (1-30 days)
- [ ] Show current values and last updated timestamp
- [ ] Restrict settings to ADMIN/SUPER_ADMIN roles

**Technical Tasks:**
- Modify `app/dashboard/settings/page.tsx`
- Add threshold input fields with validation
- Update settings API endpoints
- Add permission checks for settings access
- Include setting descriptions and help text

---

### US-4.6: Spreadsheet Data Migration
**As a** SPED administrator, **I want to** import existing spreadsheet data so that we can transition to SPEDex without losing historical information.

**Acceptance Criteria:**
- [ ] Create import script for 83 existing referral records
- [ ] Transform spreadsheet columns to SPEDex fields correctly
- [ ] Handle malformed dates with error flags
- [ ] Map spreadsheet tabs to program tracks
- [ ] Preserve CUM initials in notes field
- [ ] Flag imported records for staff verification
- [ ] Provide import summary and error report
- [ ] Create rollback procedure if needed

**Technical Tasks:**
- Create `scripts/import-referral-log.ts`
- Implement data transformation logic
- Add error handling and validation
- Create import verification tools
- Document rollback procedure
- Test import with sample data

---

## Definition of Done

- All automation features work correctly
- Email reminders are sent reliably
- Reporting dashboard provides comprehensive insights
- Settings are configurable and functional
- Historical data is successfully imported
- All features respect permission settings
- Performance is acceptable with full dataset
- Documentation is complete

---

## Risks and Mitigations

**Risk:** Email service integration could be unreliable  
**Mitigation:** Implement retry logic; fallback to manual sending; clear error messages

**Risk:** Scheduled jobs could fail silently  
**Mitigation:** Add job monitoring and logging; admin dashboard for job status

**Risk:** Data migration could corrupt existing data  
**Mitigation:** Full database backup before import; test import on staging; rollback plan

**Risk:** Reporting queries could be slow with large datasets  
**Mitigation:** Database indexing; query optimization; caching for expensive reports

---

## Dependencies

- All previous sprints completed
- Email service access and configuration
- Scheduled job infrastructure (cron/job scheduler)
- Production data backup for migration safety

---

## Sprint Review Criteria

- CUM request emails generate and send correctly
- SEIS/Aeries reminders are sent on schedule
- Overdue alerts appear appropriately
- Caseload reports provide valuable insights
- Settings can be configured by administrators
- Spreadsheet data imports successfully
- All automation features work reliably
- Performance is acceptable with full dataset
