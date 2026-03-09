# Sprint Backlog and Task Tracking

This document tracks all user stories and tasks across the 4 sprints. Use this to monitor progress and assign work.

---

## Sprint 1: Foundation and Schema Changes

### US-1.1: Database Schema Implementation
**Status:** 🔴 Not Started  
**Assignee:** TBD  
**Estimated Effort:** 3 days

**Tasks:**
- [ ] Modify `prisma/schema.prisma` with new Referral fields
- [ ] Add ProgramTrack enum
- [ ] Add Silo enum (with migration warning)
- [ ] Extend ReferralStatus enum
- [ ] add EmailSettings fields
- [ ] Add database indexes
- [ ] Create and test Prisma migration
- [ ] Verify existing data compatibility

---

### US-1.2: API Foundation
**Status:** 🔴 Not Started  
**Assignee:** TBD  
**Estimated Effort:** 2 days

**Tasks:**
- [ ] Extend `GET /api/referrals` with new filters
- [ ] Extend `PATCH /api/referrals/[id]` with new fields
- [ ] Add permission validation for operational fields
- [ ] Extend status endpoint for new statuses
- [ ] Extend email settings endpoints
- [ ] Update `lib/auth/permissions.ts`

---

### US-1.3: CUM Workflow API
**Status:** 🔴 Not Started  
**Assignee:** TBD  
**Estimated Effort:** 2 days

**Tasks:**
- [ ] Create `POST /api/referrals/[id]/cum` endpoint
- [ ] Implement state machine validation
- [ ] Create `POST /api/referrals/[id]/cum/email` endpoint
- [ ] Create `PATCH /api/referrals/[id]/sync` endpoint
- [ ] Add audit logging functionality

---

### US-1.4: Basic UI Foundation
**Status:** 🔴 Not Started  
**Assignee:** TBD  
**Estimated Effort:** 2 days

**Tasks:**
- [ ] Update referral table with new columns
- [ ] Create status badge variants
- [ ] Update edit referral modal
- [ ] Add permission-based visibility

---

## Sprint 2: Core Workflow Panels

### US-2.1: Program Classification Panel
**Status:** 🔴 Not Started  
**Assignee:** TBD  
**Estimated Effort:** 3 days

**Tasks:**
- [ ] Create program-classification-panel.tsx component
- [ ] Implement Program Track dropdown
- [ ] Implement Silo dropdown
- [ ] Add District of Residence with autocomplete
- [ ] Add Date Student Started School picker
- [ ] Add conditional Referring Party field
- [ ] Add conditional Service Provider field
- [ ] Implement save logic and validation

---

### US-2.2: CUM Records Workflow Panel
**Status:** 🔴 Not Started  
**Assignee:** TBD  
**Estimated Effort:** 4 days

**Tasks:**
- [ ] Create cum-workflow-panel.tsx component
- [ ] Implement 3-step state machine UI
- [ ] Add date pickers and notes for each step
- [ ] Implement step locking and editing
- [ ] Create email draft modal
- [ ] Integrate with CUM API endpoints
- [ ] Add audit logging
- [ ] Update referral list with CUM status badges

---

### US-2.3: System Sync Panel
**Status:** 🔴 Not Started  
**Assignee:** TBD  
**Estimated Effort:** 2 days

**Tasks:**
- [ ] Create system-sync-panel.tsx component
- [ ] Implement SEIS checkbox with timestamp
- [ ] Implement Aeries checkbox with timestamp
- [ ] Add conditional rendering for SCIP/VIP
- [ ] Update referral table with sync columns
- [ ] Integrate with sync API endpoints

---

### US-2.4: Referral Detail Page Integration
**Status:** 🔴 Not Started  
**Assignee:** TBD  
**Estimated Effort:** 1 day

**Tasks:**
- [ ] Modify referral detail page layout
- [ ] Add all three panels to page
- [ ] Ensure responsive design
- [ ] Add loading states and error handling

---

### US-2.5: Enhanced Status Management
**Status:** 🔴 Not Started  
**Assignee:** TBD  
**Estimated Effort:** 1 day

**Tasks:**
- [ ] Update status-update-modal.tsx
- [ ] Add reason validation for new statuses
- [ ] Update status-badge.tsx styling
- [ ] Modify list filtering logic
- [ ] Add audit logging

---

## Sprint 3: List View and Filtering

### US-3.1: Filter Preset Implementation
**Status:** 🔴 Not Started  
**Assignee:** TBD  
**Estimated Effort:** 3 days

**Tasks:**
- [ ] Create preset tab component
- [ ] Implement 6 presets (All, General, BX, DHH, SCIP, VIP)
- [ ] Add URL state management
- [ ] Apply filter logic to referral list
- [ ] Design tab styling and animations
- [ ] Add mobile responsive layout

---

### US-3.2: Conditional Column Visibility
**Status:** 🔴 Not Started  
**Assignee:** TBD  
**Estimated Effort:** 2 days

**Tasks:**
- [ ] Modify referral-table.tsx for conditional columns
- [ ] Implement column config per preset
- [ ] Add smooth column transitions
- [ ] Update responsive behavior
- [ ] Add column header tooltips

---

### US-3.3: CUM Status Display
**Status:** 🔴 Not Started  
**Assignee:** TBD  
**Estimated Effort:** 2 days

**Tasks:**
- [ ] Create CUM status badge component
- [ ] Implement status calculation logic
- [ ] Add overdue detection and styling
- [ ] Make status badges interactive
- [ ] Add CUM status to filters

---

### US-3.4: Enhanced Filtering Options
**Status:** 🔴 Not Started  
**Assignee:** TBD  
**Estimated Effort:** 2 days

**Tasks:**
- [ ] Extend filter component with new options
- [ ] Add DOR autocomplete
- [ ] Add CUM, SEIS, Aeries status filters
- [ ] Implement filter state management
- [ ] Add filter reset functionality

---

### US-3.5: Performance Optimization
**Status:** 🔴 Not Started  
**Assignee:** TBD  
**Estimated Effort:** 2 days

**Tasks:**
- [ ] Implement virtual scrolling
- [ ] Add memoization optimizations
- [ ] Optimize API calls
- [ ] Add loading skeletons
- [ ] Implement client-side caching

---

## Sprint 4: Automation and Reporting

### US-4.1: CUM Request Email Automation
**Status:** 🔴 Not Started  
**Assignee:** TBD  
**Estimated Effort:** 3 days

**Tasks:**
- [ ] Create email template in lib/email.ts
- [ ] Implement email draft generation
- [ ] Create email review modal
- [ ] Integrate Microsoft Graph sending
- [ ] Add email logging and error handling
- [ ] Update CUM panel to trigger email flow

---

### US-4.2: SEIS/Aeries Reminder System
**Status:** 🔴 Not Started  
**Assignee:** TBD  
**Estimated Effort:** 3 days

**Tasks:**
- [ ] Create scheduled job infrastructure
- [ ] Implement reminder logic and deduplication
- [ ] Create reminder email template
- [ ] Add job logging and monitoring
- [ ] Create admin interface for reminders
- [ ] Test various reminder scenarios

---

### US-4.3: Overdue CUM Alerts
**Status:** 🔴 Not Started  
**Assignee:** TBD  
**Estimated Effort:** 2 days

**Tasks:**
- [ ] Create overdue detection logic
- [ ] Add alert banner to detail header
- [ ] Update referral list with overdue badges
- [ ] Implement email alert system
- [ ] Add threshold configuration

---

### US-4.4: Caseload Reporting Dashboard
**Status:** 🔴 Not Started  
**Assignee:** TBD  
**Estimated Effort:** 4 days

**Tasks:**
- [ ] Extend enrollment reports page
- [ ] Create summary card components
- [ ] Implement CUM funnel chart
- [ ] Build compliance tracking tables
- [ ] Add CSV export functionality
- [ ] Design responsive layout

---

### US-4.5: Settings Configuration
**Status:** 🔴 Not Started  
**Assignee:** TBD  
**Estimated Effort:** 1 day

**Tasks:**
- [ ] Modify settings page
- [ ] Add threshold input fields
- [ ] Update settings API endpoints
- [ ] Add permission checks
- [ ] Include help text and validation

---

### US-4.6: Spreadsheet Data Migration
**Status:** 🔴 Not Started  
**Assignee:** TBD  
**Estimated Effort:** 3 days

**Tasks:**
- [ ] Create import script
- [ ] Implement data transformation logic
- [ ] Add error handling and validation
- [ ] Create verification tools
- [ ] Document rollback procedure
- [ ] Test with sample data

---

## Progress Summary

### Overall Progress: 0% Complete

**Sprint 1:** 0/4 user stories complete  
**Sprint 2:** 0/5 user stories complete  
**Sprint 3:** 0/5 user stories complete  
**Sprint 4:** 0/6 user stories complete  

### Total Estimated Effort: 47 days

---

## Legend

- 🔴 Not Started
- 🟡 In Progress  
- 🟢 Complete
- ⚠️ Blocked
- 🔄 Ready for Review

---

## Notes

- Update status as work progresses
- Assign team members to specific tasks
- Track actual effort vs estimated
- Note any blockers or dependencies
- Use this for sprint planning and progress reviews
