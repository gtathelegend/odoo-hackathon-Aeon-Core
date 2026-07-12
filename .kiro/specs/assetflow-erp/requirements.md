# Requirements Document

## Introduction

AssetFlow is an Enterprise Asset & Resource Management System built on Odoo, designed for the Odoo Hackathon. It provides a centralized platform for organizations to track, allocate, and maintain physical assets and shared resources. The system is industry-agnostic — applicable to offices, schools, hospitals, and factories — and differentiates itself through a smart conflict engine, full lifecycle state machines, role-based progressive disclosure UI, and structured audit cycles.

---

## Glossary

- **AssetFlow**: The system being specified in this document.
- **Asset**: A trackable physical item registered in the system (e.g., laptop, projector, vehicle).
- **Asset_Tag**: An auto-generated unique identifier in the format `AF-XXXX` assigned at registration.
- **Asset_Lifecycle_State**: One of the discrete states an asset can occupy: Available, Allocated, Reserved, Under_Maintenance, Lost, Retired, Disposed.
- **Allocation**: The assignment of an asset to an Employee or Department for use over a defined or open-ended period.
- **Booking**: A time-slot reservation of a shared/bookable asset by an Employee.
- **Transfer_Request**: A formal request to move an allocated asset from its current holder to a new holder.
- **Audit_Cycle**: A scoped, time-bounded review process in which auditors verify the physical presence and condition of assets.
- **Discrepancy_Report**: An auto-generated report produced at the close of an Audit_Cycle listing assets marked Missing or Damaged.
- **Maintenance_Request**: A formal request to perform maintenance work on an asset.
- **Admin**: The highest-privileged user role responsible for organization setup and role promotion.
- **Asset_Manager**: A user role responsible for registering assets, managing allocations, approving transfers, maintenance, and returns.
- **Department_Head**: A user role with visibility into department assets and authority to approve department-level allocations and transfers, and to book resources.
- **Employee**: The base user role with access to own assets, resource booking, maintenance request creation, and return/transfer initiation.
- **KPI_Dashboard**: The home screen displaying key performance indicators and quick actions.
- **Conflict_Engine**: The subsystem responsible for detecting and guiding resolution of allocation and booking conflicts.
- **Overlap_Validator**: The subsystem that checks time-slot bookings for overlapping reservations.
- **Condition**: The physical state of an asset at a point in time: Good, Fair, Poor, Damaged.
- **Department**: An organizational unit within the system with a designated Department_Head.

---

## Requirements

---

### Requirement 1: User Authentication

**User Story:** As a user, I want to log in with my email and password, so that I can access the system securely with my assigned role.

#### Acceptance Criteria

1. WHEN a user submits a valid email and password, THE AssetFlow SHALL authenticate the user and redirect them to the KPI_Dashboard.
2. IF a user submits an invalid email or incorrect password, THEN THE AssetFlow SHALL display a single generic authentication error message that does not distinguish between an unrecognized email and an incorrect password.
3. WHEN a new user completes the signup form with a valid email and password, THE AssetFlow SHALL create an account with the Employee role by default.
4. THE AssetFlow SHALL enforce a password length between 8 and 128 characters and require at least one uppercase letter, one lowercase letter, one digit, and one special character during signup.
5. IF a user attempts to submit the signup form with an email already registered in the system, THEN THE AssetFlow SHALL display an error indicating the email is already in use.
6. WHEN a user logs out, THE AssetFlow SHALL invalidate the active session and redirect the user to the login page.
7. IF a user fails authentication 5 consecutive times for the same email address, THEN THE AssetFlow SHALL lock the account for 15 minutes and display a message indicating the account is temporarily locked.
8. IF an authenticated user's session has been inactive for more than 30 minutes, THEN THE AssetFlow SHALL invalidate the session and redirect the user to the login page.
9. THE AssetFlow SHALL validate that the email field conforms to a standard email format (local-part@domain with a valid domain containing at least one dot) during both signup and login submission.

---

### Requirement 2: Role-Based Access Control

**User Story:** As an Admin, I want to promote users to higher roles, so that the correct personnel have the appropriate level of access within the system.

#### Acceptance Criteria

1. THE AssetFlow SHALL restrict role promotion exclusively to Admin users.
2. WHEN an Admin promotes a user from any lower role (Employee, Asset_Manager, or Department_Head) to a higher role (Asset_Manager, Department_Head, or Admin), THE AssetFlow SHALL update the user's role and apply the new permissions to all subsequent requests within 5 seconds of the promotion action.
3. THE AssetFlow SHALL prevent any user from assigning the Admin role to themselves during signup or profile update.
4. WHILE a user is authenticated, THE AssetFlow SHALL display only the navigation items and actions permitted for that user's current role, refreshing visible permissions upon the next page navigation after a role change.
5. IF a user attempts to access a route or action outside their role's permission scope, THEN THE AssetFlow SHALL return an access-denied response and log the attempt in the Activity_Log.
6. IF a non-Admin user attempts to perform a role promotion action, THEN THE AssetFlow SHALL reject the request with an access-denied response and log the attempt in the Activity_Log.

---

### Requirement 3: KPI Dashboard

**User Story:** As a user, I want to see a real-time summary of asset and resource status on my home screen, so that I can quickly understand the current state of the organization's assets.

#### Acceptance Criteria

1. WHEN an authenticated user accesses the KPI_Dashboard, THE AssetFlow SHALL display the following KPI cards: Assets Available, Assets Allocated, Maintenance Today, Active Bookings, Pending Transfers, and Upcoming Returns (returns with an Expected_Return_Date within the next 7 calendar days).
2. WHEN any asset or booking record changes state, THE AssetFlow SHALL refresh the affected KPI card values within 5 seconds.
3. WHEN the KPI_Dashboard loads, THE AssetFlow SHALL highlight overdue returns (allocations whose Expected_Return_Date is earlier than the current date) in a visually distinct color (red or amber) within the Upcoming Returns card.
4. THE AssetFlow SHALL display quick-action buttons on the KPI_Dashboard limited to the actions permitted for the authenticated user's role: Employee actions are Book Resource and Request Maintenance; Department_Head actions are Book Resource, Request Maintenance, and Approve Transfer; Asset_Manager actions are Register Asset, Allocate Asset, and Create Audit Cycle; Admin actions are Register Asset, Allocate Asset, Create Audit Cycle, and Manage Departments.
5. WHERE the authenticated user's role is Employee, THE AssetFlow SHALL restrict KPI_Dashboard data to assets and bookings associated with that Employee.
6. WHERE the authenticated user's role is Department_Head, THE AssetFlow SHALL restrict KPI_Dashboard data to assets and bookings associated with that Department_Head's department.
7. WHERE the authenticated user's role is Admin or Asset_Manager, THE AssetFlow SHALL display KPI_Dashboard data aggregated across all departments and assets in the organization.
8. IF the KPI_Dashboard fails to load data for one or more KPI cards, THEN THE AssetFlow SHALL display an error indicator on the affected card and retain the last successfully loaded values until fresh data is available.

---

### Requirement 4: Organization Setup — Department Management

**User Story:** As an Admin, I want to create and manage departments with hierarchy, so that assets and employees can be organized into meaningful organizational units.

#### Acceptance Criteria

1. THE AssetFlow SHALL restrict access to the Organization Setup module to Admin users only.
2. WHEN an Admin creates a new department with a unique name (between 2 and 100 characters) and assigns an active user as Department_Head, THE AssetFlow SHALL persist the department record with an Active status.
3. IF an Admin attempts to create or rename a department with a name that already exists in the system, THEN THE AssetFlow SHALL reject the action and display an error indicating the department name is already in use.
4. WHEN an Admin edits an existing department's name, parent department, or Department_Head, THE AssetFlow SHALL update the record and log the change in the Activity_Log.
5. WHEN an Admin deactivates a department, THE AssetFlow SHALL set the department status to Inactive, prevent new asset allocations or employee assignments to that department, and flag any employees currently assigned to that department for reassignment.
6. IF an Admin attempts to deactivate a department that has active allocated assets, THEN THE AssetFlow SHALL display a warning listing the allocated assets and their current holders before allowing confirmation.
7. THE AssetFlow SHALL support up to 5 levels of department hierarchy by allowing an Admin to designate a parent department for each department.
8. IF an Admin attempts to set a parent department that would create a circular reference in the hierarchy, THEN THE AssetFlow SHALL reject the action and display an error indicating the circular dependency.

---

### Requirement 5: Organization Setup — Asset Category Management

**User Story:** As an Admin, I want to create and manage asset categories with optional custom fields, so that assets are organized and carry category-relevant metadata.

#### Acceptance Criteria

1. WHEN an Admin creates a new asset category with a unique name between 1 and 100 characters, THE AssetFlow SHALL persist the category record with an Active status.
2. WHEN an Admin edits an existing asset category, THE AssetFlow SHALL update the record and log the change in the Activity_Log.
3. WHERE a category is configured with category-specific fields (e.g., Warranty_Expiry, License_Key), THE AssetFlow SHALL present those fields during asset registration for assets belonging to that category.
4. IF an Admin attempts to delete a category that has one or more assets assigned to it, THEN THE AssetFlow SHALL reject the deletion and display an error indicating the category must be deactivated instead.
5. IF an Admin attempts to create or rename a category with a name that already exists in the system, THEN THE AssetFlow SHALL reject the operation and display an error indicating the category name is already in use.
6. WHEN an Admin deactivates an asset category, THE AssetFlow SHALL set the category status to Inactive, prevent new assets from being registered under that category, and retain all existing assets previously assigned to that category unchanged.
7. WHEN an Admin creates or edits a category, THE AssetFlow SHALL allow a maximum of 20 category-specific custom fields per category.

---

### Requirement 6: Organization Setup — Employee Directory

**User Story:** As an Admin, I want to manage the employee directory and promote roles, so that the correct users have appropriate access and are associated with the right departments.

#### Acceptance Criteria

1. WHEN an Admin views the Employee Directory, THE AssetFlow SHALL display a paginated list (25 records per page) showing each employee's name, email, department, role, and active/inactive status.
2. WHEN an Admin updates an employee's department assignment to an Active department, THE AssetFlow SHALL persist the change and log it in the Activity_Log.
3. IF an Admin attempts to assign an employee to an Inactive department, THEN THE AssetFlow SHALL reject the assignment and display an error indicating the selected department is inactive.
4. WHEN an Admin promotes an employee's role from the Employee Directory, THE AssetFlow SHALL immediately apply the new role permissions as specified in Requirement 2 and log the change in the Activity_Log.
5. WHEN an Admin deactivates an employee account, THE AssetFlow SHALL revoke the employee's login access, cancel any Upcoming bookings held by that employee, and transition each asset currently allocated to that employee to a Pending_Reassignment state visible to Asset_Managers in the KPI_Dashboard and Asset Directory.
6. IF an Admin attempts to deactivate their own account, THEN THE AssetFlow SHALL reject the action and display an error indicating that self-deactivation is not permitted.

---

### Requirement 7: Asset Registration

**User Story:** As an Asset_Manager, I want to register physical assets with full metadata, so that every asset has a traceable, searchable record in the system.

#### Acceptance Criteria

1. WHEN an Asset_Manager submits a valid asset registration form, THE AssetFlow SHALL create an asset record with the following mandatory fields: Name (maximum 150 characters), Category, Serial_Number (maximum 100 characters), Acquisition_Date, Acquisition_Cost (numeric value between 0.01 and 999,999,999.99 with up to 2 decimal places), Condition, and Location.
2. WHEN a new asset is registered, THE AssetFlow SHALL auto-generate a unique Asset_Tag in the format `AF-XXXX` where XXXX is a zero-padded sequential integer starting from 0001.
3. THE AssetFlow SHALL set the initial Asset_Lifecycle_State of every newly registered asset to Available.
4. WHERE a category has category-specific fields configured, THE AssetFlow SHALL require those fields to be completed during asset registration for assets in that category.
5. WHEN an Asset_Manager uploads a photo or document attachment during registration, THE AssetFlow SHALL accept files of type JPEG, PNG, or PDF with a maximum size of 10 MB per file and a maximum of 5 attachments per asset, and store each file associated with the asset record.
6. WHEN an Asset_Manager marks an asset as shared or bookable during registration, THE AssetFlow SHALL make that asset available for time-slot booking.
7. IF an Asset_Manager submits a registration form with a Serial_Number already present in the system, THEN THE AssetFlow SHALL reject the submission and display a duplicate Serial_Number error.
8. IF an Asset_Manager submits a registration form with any mandatory field missing or outside its defined constraints, THEN THE AssetFlow SHALL reject the submission, highlight the invalid fields, and display an error message indicating which fields require correction.

---

### Requirement 8: Asset Directory & Search

**User Story:** As an Asset_Manager, I want to search and filter the asset directory, so that I can quickly locate assets by various criteria.

#### Acceptance Criteria

1. THE AssetFlow SHALL provide a searchable, filterable asset directory accessible to Asset_Manager, Admin, and Department_Head roles.
2. WHEN a user submits a search query, THE AssetFlow SHALL return assets whose Asset_Tag, Name, Serial_Number, Category, or Location fields contain the query as a case-insensitive substring match, and display results within 2 seconds.
3. THE AssetFlow SHALL support filtering the asset directory by Asset_Lifecycle_State, Category, Department, and Location, where multiple active filters are combined using AND logic.
4. WHEN a user selects an asset from the directory, THE AssetFlow SHALL display the full asset record including all registration fields, current Asset_Lifecycle_State, current holder (if allocated), and the chronological history of allocations, maintenance events, bookings, and audit records.
5. WHERE the authenticated user's role is Department_Head, THE AssetFlow SHALL restrict asset directory results to assets allocated to or located within that Department_Head's department.
6. IF a search query or filter combination yields no matching assets, THEN THE AssetFlow SHALL display an empty-state message indicating no assets matched the criteria and retain the applied filters for modification.

---

### Requirement 9: Asset Lifecycle State Machine

**User Story:** As an Asset_Manager, I want the system to enforce valid asset lifecycle transitions, so that assets always reflect an accurate and trustworthy state.

#### Acceptance Criteria

1. THE AssetFlow SHALL enforce the following valid state transitions for every asset:
   - Available → Allocated
   - Available → Reserved
   - Available → Under_Maintenance
   - Allocated → Available (on return)
   - Allocated → Under_Maintenance (on maintenance approval)
   - Allocated → Lost (on audit marking or loss report)
   - Reserved → Allocated (on booking start)
   - Reserved → Available (on booking cancellation)
   - Under_Maintenance → Available (on resolution)
   - Under_Maintenance → Retired (on irreparable determination)
   - Available → Lost
   - Available → Retired
   - Retired → Disposed
   - Lost → Disposed
   - Lost → Available (on recovery)
2. THE AssetFlow SHALL treat Disposed as a terminal state; no outgoing transitions from Disposed SHALL be permitted.
3. IF an action would trigger an invalid state transition, THEN THE AssetFlow SHALL reject the action and display an error message indicating the asset's current state, the attempted target state, and the reason the transition is not permitted.
4. WHEN an asset's state changes, THE AssetFlow SHALL record the previous state, new state, triggering action, timestamp, and responsible user in the asset's history.
5. IF two or more users attempt to transition the same asset concurrently, THEN THE AssetFlow SHALL process only the first valid transition and reject subsequent conflicting attempts with an error message indicating the asset's state has changed.

---

### Requirement 10: Asset Allocation

**User Story:** As an Asset_Manager, I want to allocate assets to employees or departments, so that asset custody is formally tracked.

#### Acceptance Criteria

1. WHEN an Asset_Manager submits an allocation request for an Available asset to an Employee or Department, THE AssetFlow SHALL create the allocation record containing the asset reference, holder (Employee or Department), allocating Asset_Manager, allocation date, and optional Expected_Return_Date, update the Asset_Lifecycle_State to Allocated, and log the event in the Activity_Log.
2. WHEN an allocation is created with an Expected_Return_Date, THE AssetFlow SHALL validate that the Expected_Return_Date is later than the current date before storing it; IF the Expected_Return_Date is not later than the current date, THEN THE AssetFlow SHALL reject the allocation and display an error indicating the date must be in the future.
3. IF an Asset_Manager attempts to allocate an asset that is not in the Available state, THEN THE Conflict_Engine SHALL block the allocation, display the current holder's name and allocation date, and offer the option to initiate a Transfer_Request.
4. WHEN an allocated asset is returned, THE Asset_Manager SHALL record the return Condition (Good, Fair, Poor, or Damaged), and THE AssetFlow SHALL set the allocation status to Closed with the current date as the return date, update the Asset_Lifecycle_State to Available, and log the event in the Activity_Log.
5. THE AssetFlow SHALL check all active allocations with an Expected_Return_Date at least once every 24 hours; WHEN the current date exceeds an allocation's Expected_Return_Date, THE AssetFlow SHALL flag the allocation as Overdue and deliver an in-app notification to the Asset_Manager and the current holder within 10 seconds of detection.
6. IF an Asset_Manager attempts to allocate an asset to an Employee whose account is inactive or a Department whose status is Inactive, THEN THE AssetFlow SHALL reject the allocation and display an error indicating the selected holder is inactive.

---

### Requirement 11: Transfer Request Workflow

**User Story:** As an Asset_Manager or Department_Head, I want to initiate and manage asset transfer requests, so that allocated assets can be formally reassigned without bypassing oversight.

#### Acceptance Criteria

1. WHEN an Employee, Asset_Manager, or Department_Head initiates a Transfer_Request for an Allocated asset, THE AssetFlow SHALL create a transfer record with status Requested, recording the requester, current holder, intended recipient, reason (1–500 characters), and request timestamp.
2. WHEN an Asset_Manager or Department_Head approves a Transfer_Request, THE AssetFlow SHALL update the transfer status to Approved and immediately transition the status to Re-allocated, re-allocating the asset to the new recipient and logging the event in the Activity_Log.
3. IF a Transfer_Request is rejected, THEN THE AssetFlow SHALL update the transfer status to Rejected, notify the requester with the rejection reason, and leave the asset with its current holder.
4. THE AssetFlow SHALL enforce the transfer status progression: Requested → Approved → Re-allocated, or Requested → Rejected.
5. WHEN a Transfer_Request transitions to Re-allocated, THE AssetFlow SHALL close the previous allocation record and create a new allocation record for the new holder.
6. IF a user attempts to approve a Transfer_Request that they themselves initiated, THEN THE AssetFlow SHALL reject the approval and display an error indicating that self-approval is not permitted.
7. IF a user initiates a Transfer_Request with a recipient that is inactive or is the same as the current holder, THEN THE AssetFlow SHALL reject the request and display an error indicating the recipient is invalid.

---

### Requirement 12: Resource Booking

**User Story:** As an Employee or Department_Head, I want to book a shared asset for a specific time slot, so that resource access is fairly scheduled without conflicts.

#### Acceptance Criteria

1. THE AssetFlow SHALL present a calendar view of all bookable assets to authenticated users with the Employee role or higher.
2. WHEN a user submits a booking request with a start time and end time for a bookable asset, THE Overlap_Validator SHALL check whether the requested slot overlaps with any existing booking with status Upcoming or Ongoing for the same asset.
3. THE Overlap_Validator SHALL define two bookings as overlapping when the intervals `[start1, end1)` and `[start2, end2)` share any common time; adjacent bookings (end1 == start2) SHALL be considered non-overlapping and permitted.
4. IF the Overlap_Validator detects an overlap with an existing booking, THEN THE AssetFlow SHALL reject the booking request and display the conflicting booking's time slot and holder to the requester.
5. WHEN a booking is successfully created, THE AssetFlow SHALL set its status to Upcoming and update the asset's lifecycle state to Reserved.
6. THE AssetFlow SHALL enforce a minimum booking duration of 15 minutes; IF a user submits a booking with a duration shorter than 15 minutes, THEN THE AssetFlow SHALL reject the request.
7. IF a user submits a booking request with a start time in the past, THEN THE AssetFlow SHALL reject the request and display an error indicating the booking must be in the future.
8. WHEN the current time reaches a booking's start time, THE AssetFlow SHALL automatically transition the booking status from Upcoming to Ongoing.
9. WHEN the current time reaches a booking's end time, THE AssetFlow SHALL automatically transition the booking status from Ongoing to Completed and the asset's lifecycle state to Available.
10. WHEN a user cancels an Upcoming booking they own, THE AssetFlow SHALL set the booking status to Cancelled, release the Reserved asset back to Available, and log the cancellation.
11. WHEN a user reschedules a booking they own, THE Overlap_Validator SHALL validate the new time slot before applying the change; IF a conflict is detected, THEN THE AssetFlow SHALL reject the reschedule and retain the original booking.
12. THE AssetFlow SHALL send a reminder notification to the booking holder at least 30 minutes before a booking's start time.

---

### Requirement 13: Maintenance Request & Workflow

**User Story:** As an Employee, I want to raise a maintenance request for an asset, so that faults are formally tracked and resolved through an approval workflow.

#### Acceptance Criteria

1. WHEN an Employee submits a maintenance request with the target asset, issue description (between 10 and 2000 characters), priority level (Low, Medium, High, Critical), and an optional photo attachment (maximum 10 MB per file), THE AssetFlow SHALL create a Maintenance_Request record with status Pending.
2. WHEN an Asset_Manager approves a Maintenance_Request, THE AssetFlow SHALL update the request status to Approved and transition the asset's lifecycle state to Under_Maintenance.
3. IF an Asset_Manager rejects a Maintenance_Request, THEN THE AssetFlow SHALL update the status to Rejected, notify the requester with a rejection reason, and leave the asset's lifecycle state unchanged.
4. WHEN an Asset_Manager assigns a technician to an Approved Maintenance_Request, THE AssetFlow SHALL update the request status to Technician_Assigned and notify the assigned technician.
5. WHEN a technician begins work on a Maintenance_Request, THE AssetFlow SHALL update the status to In_Progress.
6. WHEN a technician marks a Maintenance_Request as resolved with resolution notes (minimum 10 characters), THE AssetFlow SHALL update the status to Resolved, record the resolution notes and date, and transition the asset's lifecycle state back to Available.
7. THE AssetFlow SHALL retain the complete history of all Maintenance_Request status transitions, including timestamps and responsible users, on the asset's record.
8. THE AssetFlow SHALL enforce the maintenance status progression: Pending → Approved → Technician_Assigned → In_Progress → Resolved, or Pending → Rejected.
9. IF an Employee submits a maintenance request for an asset that already has an open Maintenance_Request (status is Pending, Approved, Technician_Assigned, or In_Progress), THEN THE AssetFlow SHALL reject the submission and display an error indicating an active maintenance request already exists for that asset.
10. WHEN a Maintenance_Request transitions to Approved, Technician_Assigned, In_Progress, or Resolved, THE AssetFlow SHALL send an in-app notification to the original requester indicating the new status.
11. IF an Employee submits a maintenance request for an asset whose lifecycle state does not permit transition to Under_Maintenance (i.e., not in Available or Allocated state), THEN THE AssetFlow SHALL reject the submission and display an error indicating the asset's current state does not allow maintenance requests.

---

### Requirement 14: Asset Audit Cycle

**User Story:** As an Admin or Asset_Manager, I want to create and manage audit cycles, so that physical asset presence and condition can be formally verified against system records.

#### Acceptance Criteria

1. WHEN an Admin or Asset_Manager creates an Audit_Cycle with a defined scope (department or location), date range, and at least one assigned auditor, THE AssetFlow SHALL persist the Audit_Cycle record with status Open.
2. WHEN an auditor marks an asset within the cycle, THE AssetFlow SHALL record the mark as one of: Verified, Missing, or Damaged, along with the auditor's identity and timestamp.
3. WHEN an Admin or Asset_Manager closes an Audit_Cycle, THE AssetFlow SHALL auto-generate a Discrepancy_Report listing all assets marked Missing or Damaged with their last known location and holder, and listing all in-scope assets that were not marked during the cycle as Unverified.
4. WHEN an Audit_Cycle is closed, THE AssetFlow SHALL lock the cycle (preventing further edits) and update asset records as follows: assets marked Missing whose current Asset_Lifecycle_State permits a transition to Lost SHALL transition to Lost; assets marked Missing whose current state does not permit transition to Lost SHALL be flagged for manual review in the Discrepancy_Report; and assets marked Damaged SHALL have their Condition updated to Damaged.
5. THE AssetFlow SHALL retain the complete history of all closed Audit_Cycles and their Discrepancy_Reports for a minimum of 12 months from the cycle closure date.
6. IF an auditor attempts to mark an asset that is not within the Audit_Cycle's defined scope, THEN THE AssetFlow SHALL reject the action and display a scope-mismatch error.
7. IF an auditor attempts to mark an asset in an Audit_Cycle that is not in the Open status, THEN THE AssetFlow SHALL reject the action and display an error indicating the cycle is closed.

---

### Requirement 15: Reports & Analytics

**User Story:** As an Admin or Asset_Manager, I want to view and export asset reports and analytics, so that I can make informed decisions about asset utilization, maintenance, and retirement.

#### Acceptance Criteria

1. THE AssetFlow SHALL provide a Reports module accessible to Admin, Asset_Manager, and Department_Head roles containing the following reports: Utilization_Trends, Maintenance_Frequency, Assets_Due_For_Maintenance, Assets_Due_For_Retirement, Department_Allocation_Summary, and Booking_Heatmap.
2. WHEN a user views Utilization_Trends, THE AssetFlow SHALL display asset utilization percentage over a user-selected date range with a minimum granularity of one week, where utilization percentage is calculated as the total time an asset spent in the Allocated or Reserved state divided by the total calendar time in the selected range, expressed as a percentage rounded to one decimal place.
3. WHEN a user views Department_Allocation_Summary, THE AssetFlow SHALL display the count of allocated, available, and under-maintenance assets grouped by department, reflecting the current state at the time of viewing.
4. WHEN a user views Booking_Heatmap, THE AssetFlow SHALL display a heatmap of booking frequency per bookable asset over a user-selected date range, with time divided into hourly slots across days of the week.
5. WHEN a user requests an export of any report, THE AssetFlow SHALL generate a downloadable file in the user-selected format (CSV or PDF) containing the full dataset for the selected report and date range within 30 seconds of the request.
6. WHERE the authenticated user's role is Department_Head, THE AssetFlow SHALL restrict report data to the assets and employees within that Department_Head's department.
7. WHEN a user views Assets_Due_For_Maintenance, THE AssetFlow SHALL display all assets whose time since last completed Maintenance_Request exceeds the maintenance interval configured for the asset's category, or that have never had a completed Maintenance_Request and were registered more than 90 days ago.
8. WHEN a user views Assets_Due_For_Retirement, THE AssetFlow SHALL display all assets whose age (current date minus Acquisition_Date) exceeds the useful life threshold configured for the asset's category, or whose Condition is Poor or Damaged.
9. IF a report query returns no matching records for the selected date range, THEN THE AssetFlow SHALL display an empty-state message indicating no data is available for the selected criteria.

---

### Requirement 16: Activity Logs & Notifications

**User Story:** As an Admin, I want a full audit log of all system events, so that every action is traceable and accountable.

#### Acceptance Criteria

1. THE AssetFlow SHALL record every state-changing action in the Activity_Log with the following fields: Actor (user), Action, Target_Entity, Previous_State, New_State, and Timestamp. State-changing actions include: asset lifecycle transitions, allocation creation and closure, transfer request status changes, booking creation/cancellation/status transitions, maintenance request status changes, audit cycle creation and closure, role promotions, department changes, employee activation/deactivation, and failed access attempts.
2. WHEN a notifiable event occurs (allocation, transfer, maintenance status change, overdue flag, booking reminder, role promotion, audit closure), THE AssetFlow SHALL deliver an in-app notification to all affected users within 10 seconds of the event. Affected users are defined as: for allocations and overdue flags — the Asset_Manager and the assigned holder; for transfers — the requester, current holder, and intended recipient; for maintenance status changes — the requester and the assigned technician; for booking reminders — the booking holder; for role promotions — the promoted user; for audit closure — the assigned auditors and the cycle creator.
3. THE AssetFlow SHALL retain Activity_Log records for a minimum of 12 months from the date of the event.
4. WHEN an Admin queries the Activity_Log, THE AssetFlow SHALL support filtering by Actor, Action type, Target_Entity, and date range, and SHALL return results in reverse-chronological order with a maximum of 50 records per page.
5. IF a system error prevents a notification from being delivered, THEN THE AssetFlow SHALL retry delivery up to 3 times at 60-second intervals before marking the notification as Failed and logging the failure in the Activity_Log.
6. WHEN a user views their notification list, THE AssetFlow SHALL display each notification with its event description, timestamp, and read/unread status, and SHALL mark a notification as read when the user opens it.
7. WHEN an authenticated user has unread notifications, THE AssetFlow SHALL display a notification indicator showing the count of unread notifications, visible from any page in the system.
8. THE AssetFlow SHALL restrict Activity_Log query access to Admin and Asset_Manager roles only.

---

### Requirement 17: Conflict Engine — Guided Resolution

**User Story:** As an Asset_Manager, I want the system to guide me through conflict resolution rather than simply blocking actions, so that allocation decisions are smooth and productive.

#### Acceptance Criteria

1. WHEN the Conflict_Engine detects an allocation conflict (asset not Available), THE AssetFlow SHALL display the current holder's name, department, allocation date, and Expected_Return_Date alongside an offer to initiate a Transfer_Request. IF the allocation has no Expected_Return_Date, THEN THE AssetFlow SHALL display "Open-ended" in place of the return date.
2. WHEN the Conflict_Engine detects a booking overlap, THE AssetFlow SHALL display the conflicting booking's time slot, holder, and booking purpose, and suggest the nearest chronologically available time slot for the requested asset within 7 calendar days of the originally requested start time. IF no available time slot exists within that 7-day window, THEN THE AssetFlow SHALL display a message indicating no alternative slots are available and offer the "Choose Different Asset" resolution option.
3. WHEN the Conflict_Engine presents a conflict to the user, THE AssetFlow SHALL display conflict resolution options as actionable buttons ("Request Transfer" and "Choose Different Asset" for allocation conflicts; "Choose Different Asset" and "Select Suggested Slot" for booking conflicts) rather than only displaying a blocking error message.
4. WHEN a user selects a conflict resolution action, THE AssetFlow SHALL pre-populate the relevant form (Transfer_Request or Booking) with all field values the user had entered prior to conflict detection, so that the user does not need to re-enter data.

---

### Requirement 18: Data Integrity & System Constraints

**User Story:** As a system architect, I want core data integrity rules enforced at the system level, so that the database remains consistent regardless of user actions.

#### Acceptance Criteria

1. THE AssetFlow SHALL enforce Asset_Tag uniqueness across all asset records.
2. THE AssetFlow SHALL enforce Serial_Number uniqueness across all asset records.
3. IF a user or system process attempts to delete an asset record, THEN THE AssetFlow SHALL reject the operation and display an error indicating that assets cannot be deleted and must be retired or disposed via the lifecycle state machine.
4. IF a user or system process attempts to delete an Activity_Log record, THEN THE AssetFlow SHALL reject the operation and display an error indicating that Activity_Log records are immutable.
5. WHILE an Audit_Cycle is in Closed status, THE AssetFlow SHALL reject any request to modify that cycle's audit marks or Discrepancy_Report and display an error indicating the cycle is locked.
6. THE AssetFlow SHALL enforce referential integrity such that an asset cannot be assigned a Category, Department, or Location that does not exist in the system.
7. IF a user attempts to deactivate or delete a Department or Location that is currently referenced by one or more asset records, THEN THE AssetFlow SHALL reject the operation and display an error listing the number of assets still referencing that entity.
8. IF a uniqueness constraint violation occurs during record creation or update (duplicate Asset_Tag or Serial_Number), THEN THE AssetFlow SHALL reject the operation, preserve any user-entered data in the form, and display an error identifying the duplicated field.
