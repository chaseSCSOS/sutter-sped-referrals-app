# Referral Log Digitization - Sprint Breakdown

This folder contains the sprint breakdown for the Referral Log Digitization & Spreadsheet Elimination PRD. The implementation is organized into 4 sequential sprints that build upon each other.

---

## Overview

The PRD aims to eliminate the manual "Referral Log 2025-2026" Excel workbook by building its entire functionality into SPEDex. This includes:

- Program classification and caseload management
- CUM records workflow automation
- SEIS/Aeries compliance tracking
- Comprehensive reporting and analytics
- Automated email reminders and alerts

---

## Sprint Structure

### 🏗️ Sprint 1: Foundation and Schema Changes (1 week)
**Focus:** Data foundation and basic API structure

**Key Deliverables:**
- Database schema changes (new fields, enums, indexes)
- Extended API endpoints with new fields
- Basic UI foundation components
- Permission and security framework

**Why First:** Without the data foundation, no other features can be built. This sprint enables all subsequent work.

---

### 🔧 Sprint 2: Core Workflow Panels (2 weeks)
**Focus:** Main user-facing workflow components

**Key Deliverables:**
- Program Classification panel
- CUM Records workflow panel (3-step state machine)
- System Sync panel for SEIS/Aeries tracking
- Enhanced status management

**Why Second:** These panels are the core functionality that replaces spreadsheet manual processes.

---

### 📋 Sprint 3: List View and Filtering (1.5 weeks)
**Focus:** Spreadsheet-like navigation and data access

**Key Deliverables:**
- Filter preset tabs (replicate spreadsheet tabs)
- Conditional column visibility
- Enhanced filtering options
- Performance optimization

**Why Third:** Once data can be entered and managed, staff need efficient ways to view and navigate it.

---

### 🤖 Sprint 4: Automation and Reporting (2 weeks)
**Focus:** Eliminate remaining manual tasks and provide insights

**Key Deliverables:**
- Automated CUM request emails
- SEIS/Aeries reminder system
- Comprehensive caseload reporting
- Settings configuration
- Spreadsheet data migration

**Why Last:** Automation builds on the foundation of manual workflows being fully functional.

---

## Total Timeline: 6.5 weeks

---

## Dependencies and Prerequisites

### Before Starting
- [ ] Review and approve sprint breakdown with stakeholders
- [ ] Confirm production data analysis for silo field migration
- [ ] Set up development environment with latest codebase
- [ ] Verify email service access and configuration

### Cross-Sprint Dependencies
- **Sprint 1 → 2:** Schema and API foundation required for workflow panels
- **Sprint 2 → 3:** Workflow data needed for list view filtering
- **Sprint 3 → 4:** Complete data model needed for reporting and automation

---

## Risk Summary

| Risk | Impact | Mitigation |
|------|--------|------------|
| Silo field migration failure | High | Production data analysis; rollback plan |
| Email service reliability | Medium | Retry logic; manual fallback |
| Performance with large datasets | Medium | Virtual scrolling; query optimization |
| Permission security gaps | High | Comprehensive testing; code review |

---

## Success Criteria

The project is successful when:

1. **Staff can fully manage referrals in SPEDex** without needing the spreadsheet
2. **All 5 spreadsheet tabs are replaced** by filter presets with equivalent functionality
3. **CUM workflow is automated** with email generation and tracking
4. **Compliance reporting is available** for SEIS/Aeries requirements
5. **Historical data is preserved** through successful migration
6. **Performance meets staff expectations** for daily usage

---

## How to Use This Breakdown

1. **Review each sprint** in detail before starting implementation
2. **Confirm dependencies** are met before beginning each sprint
3. **Follow the Definition of Done** for each user story
4. **Conduct sprint reviews** using the provided criteria
5. **Track progress** through the acceptance criteria checklists

---

## Files in This Folder

- `sprint-1-foundation-and-schema.md` - Data foundation and API setup
- `sprint-2-core-workflow-panels.md` - Main workflow components  
- `sprint-3-list-view-and-filtering.md` - Navigation and data access
- `sprint-4-automation-and-reporting.md` - Automation and insights
- `README.md` - This overview file

---

## Questions for Implementation

Before starting, confirm with stakeholders:

1. Are the sprint durations realistic for your team capacity?
2. Are there any dependencies not captured in this breakdown?
3. Should any features be prioritized differently?
4. Are there any regulatory or compliance requirements to consider?
5. What is the go-live strategy and training plan?

---

**Last Updated:** March 7, 2026  
**PRD Reference:** `docs/plans/2026-03-07-referral-log-digitization.md`
