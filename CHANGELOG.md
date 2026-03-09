# Changelog

All notable changes to the Sutter SPED Referrals system will be documented in this file.

## [1.3.0] - 2026-03-09

### ✨ Added
- **Save Draft feature** for all three referral forms (Interim, DHH Itinerant, Level II)
  - "Save Draft" button on every form opens a dialog prompting for an email address
  - Draft form data stored in a new `ReferralDraft` database table with a 30-day expiry
  - Confirmation email sent to the submitter with the draft number (`DFT-YYYYMMDD-XXXX` format)
  - Subsequent saves on the same session update the existing draft rather than creating a new one
- **Resume a Draft** tab on the `/referrals/status` page
  - Submitter enters their email and draft number to retrieve a saved draft
  - On success, form data is loaded via `sessionStorage` and the submitter is redirected to the correct form with all fields pre-populated
  - Amber banner displayed on resume reminding user to re-attach documents
- **`sendDraftSavedEmail()`** in `lib/email.ts` using the existing MS Graph / SCSOS template
- **`generateDraftNumber()`** in `lib/utils.ts`
- **`app/api/referrals/draft/route.ts`** — `POST` (create/update draft) and `GET` (retrieve by email + draft number) endpoints
- **`app/components/save-draft-dialog.tsx`** — reusable modal component shared across all three forms

### 🗄️ Database
- New `ReferralDraft` model in `prisma/schema.prisma` with `draftNumber`, `email`, `formType`, `formData` (JSON), and `expiresAt` fields
- Migration: `20260309180958_add_referral_draft`

### 📝 Updated
- `/referrals/status` page: added tabbed interface — "Check Referral Status" | "Resume a Draft"
- All three referral form components: added `getValues`/`reset` to React Hook Form, draft state management, and `useEffect` sessionStorage load on mount

---

## [1.2.0] - 2026-03-09

### ✨ Added
- Added **DHH Itinerant referral form** as a dedicated intake workflow
- Added **Level II referral form** as a dedicated intake workflow
- Added **staff changelog page** at `/dashboard/changelog` backed by `USER-CHANGES.md`

### 📝 Updated
- Updated changelog content/year references to reflect 2026 updates

---

## [1.1.0] - 2025-03-06

### 🎯 **Major Updates**
- **Rebranded from "Interim Placement Services" to "DHH Interim"** throughout the application
- **Enhanced form layout optimization** with improved 3-column grid layouts
- **Added new English Learner tracking fields** for better demographic data collection

### 🔄 **Changed**
#### Homepage Updates
- Updated main heading from "Interim Placement Services" to "DHH Interim"
- Updated referral description to mention "DHH interim referral packets"
- Maintained existing functionality and visual design

#### Referral Form Updates
- **Placement Type**: Renamed "FRA placement (Functionally Related Academic)" to "DHH Interim"
- **Disability Options**: Added "Tertiary" as a third option alongside "Primary" and "Secondary" for all disability categories
- **Field Layout Optimization**: 
  - Moved "Service Provider" field next to "End Date" in 2-column layout
  - Moved "Position" field next to "LEA Representative Name" in 2-column layout
  - Converted Special Education Services section to 3-column grid layout for better space utilization
- **Removed Fields**: Eliminated "Silo (Organizational Grouping)" field to streamline form

### ✨ **Added**
#### Language & Demographics Section
- **"When they became an English learner"** date field (appears when English Learner = "Yes")
- **"Reclassified?"** radio button group (appears when English Learner = "Yes")
- **Conditional "Reclassification Date"** field (appears when Reclassified = "Yes")

#### Special Education Services Section
- **Service Type Selection**: Added "Individual" vs "Group" radio buttons for each service
- **Duration Field Helper**: Added placeholder text "days" to guide user input
- **Improved 3-Column Layout**: Better organization of service fields

### 🗑️ **Removed**
- **Silo Field**: Removed "Silo (Organizational Grouping)" input field and label
- **Interim Placement Form Upload**: Removed redundant upload field since users fill out the form online
- **Interim Placement Review Date Input**: Removed "Interim Placement to be Reviewed" from the Special Education Dates section

### 🔧 **Form Validation Updates**
- Added grade-based upload rules for referral packet documents:
  - **Home Language Survey** is required for **TK and above**
  - **Home Language Survey** is hidden for **Preschool**
  - **Transcripts** are required for **9th grade and above**
  - **Transcripts** are hidden for grades **below 9th**
- Made document date fields optional (Current IEP Date, Psychoeducational Report Date)
- Synced frontend field visibility with backend checklist requirement logic

### 📧 **Email Notifications System**
- **Automated Email Delivery**: Integrated Microsoft Graph API for reliable email sending from `no-reply@sutter.k12.ca.us`
- **Order Notifications**: 
  - SPED staff notified when new orders are submitted
  - Requestors receive confirmation and status change updates
- **Referral Notifications**:
  - Submitters receive confirmation emails with prominent confirmation numbers
  - Staff notified on new referrals and status changes
  - Submitters notified when referral status updates
- **Beautiful HTML Templates**: All emails use the existing SCSOS design theme with responsive layouts, status badges, and clear CTAs
- **Admin Settings Page**: `/dashboard/settings` allows admins to configure who receives order and referral notifications
- **Multiple Recipients**: Support for multiple email addresses per notification type with tag-style UI

### 🏗️ **Technical Improvements**
- **Schema Updates**: Extended TypeScript schema to include new fields:
  - `elBecameDate` - Date when student became English learner
  - `serviceType` - Individual/Group service classification
- **Database**: Added `EmailSettings` model for configurable notification recipients
- **Microsoft Graph Integration**: Client credentials flow using Entra app registration for email sending
- **Validation Logic**: Added conditional grade-based requirement helpers for document upload checklist items
- **Data Model Update**: `interimPlacementReviewDate` is now nullable, replacing the temporary triennial fallback with proper null handling
- **Form State Management**: Updated default values and form functions to support new fields
- **Layout Optimization**: Implemented responsive 3-column grids where appropriate

### 🎨 **User Experience Improvements**
- **Better Field Grouping**: Related fields are now positioned closer together
- **Conditional Logic**: Smarter field showing/hiding based on user responses
- **Placeholder Guidance**: Added helpful placeholder text for duration inputs
- **Streamlined Layout**: Reduced vertical scrolling with optimized 3-column layouts

### 🔧 **Backend Compatibility**
- All new fields are properly integrated with existing form submission system
- Database schema supports new optional fields without breaking existing data
- API endpoints handle new form data structure seamlessly

---

## [1.0.0] - Previous Release
- Initial release of Sutter SPED Referrals system
- Basic interim placement referral functionality
- Document upload system
- Staff authentication and referral management

---

## 📋 **Summary of Impact**

### For District Staff
- **More Efficient Data Entry**: 3-column layouts reduce scrolling and improve workflow
- **Better English Learner Tracking**: New fields provide more comprehensive demographic data
- **Clearer Service Classification**: Individual vs Group selection improves service documentation

### For SCSOS Staff
- **Enhanced Data Quality**: Additional fields provide more complete student information
- **Improved Disability Tracking**: Tertiary option allows for more precise disability classification
- **Streamlined Processing**: Removed unnecessary fields reduce form completion time

### For System Administrators
- **Cleaner Branding**: DHH Interim branding provides clearer service identification
- **Maintained Compatibility**: All changes are backward compatible with existing data
- **Improved Validation**: Better form validation reduces data entry errors

---

*This changelog follows the [Keep a Changelog](https://keepachangelog.com/) format and is based on [Semantic Versioning](https://semver.org/).*
