# Sprint 3: List View and Filtering

**Status:** ✅ COMPLETE  
**Duration:** 1.5 weeks  
**Goal:** Implement spreadsheet-like filtering and column management in the referral list  

---

## Sprint Objectives

- Create filter preset tabs that replicate spreadsheet tab structure
- Implement conditional column visibility based on selected preset
- Add new columns for CUM status, DOR, and sync tracking
- Enable efficient navigation between different program caseloads

---

## User Stories

### US-3.1: Filter Preset Implementation
**As a** SPED staff member, **I want to** switch between program caseload views using preset tabs so that I can quickly access different referral groups like I did with spreadsheet tabs.

**Acceptance Criteria:**
- [ ] Add preset tab strip to referral list page
- [ ] Implement 6 presets: All, General Caseload, Behavior (BX), DHH, SCIP, Early Intervention (VIP)
- [ ] Each preset applies appropriate programTrack filter
- [ ] Preset selection persists in URL query parameters
- [ ] Active preset is visually indicated
- [ ] Shareable links work with preset state
- [ ] Responsive design works on mobile

**Technical Tasks:**
- Create preset tab component
- Implement URL state management
- Add filter logic to referral list
- Design tab styling and animations
- Add mobile-responsive tab layout

---

### US-3.2: Conditional Column Visibility
**As a** SPED staff member, **I want to** see relevant columns for each program track so that I can focus on the information that matters for each caseload type.

**Acceptance Criteria:**
- [ ] Base columns always visible: Student, Date, Status, School, etc.
- [ ] General/Behavior presets show: District of Residence, CUM Status
- [ ] DHH preset shows: Referring Party (instead of DOR/CUM)
- [ ] SCIP preset shows: In SEIS, In Aeries columns
- [ ] VIP preset shows: In SEIS, Service Provider columns
- [ ] Column transitions are smooth when switching presets
- [ ] Column preferences persist during session

**Technical Tasks:**
- Modify `referral-table.tsx` to support conditional columns
- Implement column configuration per preset
- Add smooth column transition animations
- Update table responsive behavior
- Add column header tooltips where needed

---

### US-3.3: CUM Status Display
**As a** SPED staff member, **I want to** see CUM workflow status in the referral list so that I can quickly identify which referrals need CUM attention.

**Acceptance Criteria:**
- [ ] Add CUM Status column to referral table
- [ ] Display status as: — (not started), Requested, Received, Sent
- [ ] Use color progression: gray → yellow → blue → green
- [ ] Show overdue CUM items with red highlighting
- [ ] Make CUM status clickable to filter by that status
- [ ] Add CUM status to filter options

**Technical Tasks:**
- Create CUM status badge component
- Implement status calculation logic
- Add overdue detection and styling
- Make status badges interactive
- Add CUM status to filter dropdown

---

### US-3.4: Enhanced Filtering Options
**As a** SPED staff member, **I want to** filter referrals by new operational fields so that I can find specific groups of referrals quickly.

**Acceptance Criteria:**
- [ ] Add District of Residence filter with autocomplete
- [ ] Add CUM Status filter (none, requested, received, sent)
- [ ] Add SEIS Status filter (true/false)
- [ ] Add Aeries Status filter (true/false)
- [ ] Add Program Track filter (in addition to presets)
- [ ] All filters work together with AND logic
- [ ] Filter state persists in URL
- [ ] Clear filters button resets to preset default

**Technical Tasks:**
- Extend filter component with new options
- Implement autocomplete for DOR filter
- Add filter state management
- Update API calls with new filter parameters
- Add filter reset functionality

---

### US-3.5: Performance Optimization
**As a** SPED staff member, **I want to** the referral list to load quickly even with many columns and filters so that I can work efficiently.

**Acceptance Criteria:**
- [ ] List loading time under 2 seconds with 100+ referrals
- [ ] Smooth transitions when switching presets
- [ ] Efficient re-rendering when filters change
- [ ] Virtual scrolling for large referral lists
- [ ] Caching of filter options and lookup data

**Technical Tasks:**
- Implement virtual scrolling
- Add memoization for expensive calculations
- Optimize API calls and data fetching
- Add loading skeletons
- Implement client-side caching

---

## Definition of Done

- Filter presets replicate spreadsheet tab functionality
- Conditional columns show relevant information per program track
- CUM status is clearly visible and filterable
- All new filters work correctly together
- Performance is acceptable with large datasets
- Mobile experience is fully functional
- URL sharing works with filter state

---

## Risks and Mitigations

**Risk:** Complex conditional column logic could cause rendering bugs  
**Mitigation:** Comprehensive testing of all preset combinations; code review focused on column logic

**Risk:** Performance degradation with many conditional columns  
**Mitigation:** Virtual scrolling implementation; efficient React rendering patterns

**Risk:** URL state management could become complex  
**Mitigation:** Use established URL state management library; keep state minimal

---

## Dependencies

- Sprint 1 and 2 completion (workflow panels and data foundation)
- Design approval for tab layout and column configuration
- Performance testing with realistic data volumes

---

## Sprint Review Criteria

- Can switch between all 6 presets smoothly
- Columns show/hide correctly for each preset
- CUM status badges are accurate and clickable
- Can combine multiple filters effectively
- Page loads quickly even with many referrals
- Mobile experience is fully functional
- URL sharing preserves filter state
