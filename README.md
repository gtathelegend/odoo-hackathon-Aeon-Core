# AssetFlow ERP

AssetFlow ERP is an Odoo-based Enterprise Asset and Resource Management System built for the Odoo Hackathon. It is designed to help organizations register, allocate, book, maintain, audit, and analyze physical assets from a single role-aware platform.

## Project Scope

The project covers the full operational lifecycle of shared and assigned assets across offices, schools, hospitals, factories, and similar organizations. The intended scope includes:

- secure user authentication with role-based access control
- organization setup through department, category, and employee administration
- asset registration, lifecycle tracking, and searchable directory views
- employee and department allocations with overdue monitoring
- guided transfer workflows for already-allocated assets
- shared resource booking with overlap detection and slot suggestions
- maintenance request handling with approval and technician workflows
- audit cycle management with discrepancy reporting
- KPI dashboards, analytics, exports, notifications, and activity logs

## Core Features

### Role-Based Experience

AssetFlow supports four primary roles:

- `Employee`: manages own bookings, maintenance requests, and personal asset visibility
- `Department Head`: gains department-scoped visibility plus transfer approval and reporting capabilities
- `Asset Manager`: controls asset registration, allocation, returns, maintenance approvals, and audit operations
- `Admin`: manages departments, categories, employee roles, and global oversight

### Asset Lifecycle Management

Assets move through a controlled lifecycle:

- `Available`
- `Allocated`
- `Reserved`
- `Under Maintenance`
- `Lost`
- `Retired`
- `Disposed`

Transitions are validated so the system always reflects a trustworthy operational state.

### Smart Conflict Handling

Instead of only blocking invalid actions, AssetFlow is designed to guide users through resolution:

- allocation conflicts can lead directly into a pre-filled transfer request
- booking conflicts show overlapping reservations and suggest the nearest available slot
- users keep the data they already entered when resolving conflicts

### Operational Visibility

The system provides:

- KPI dashboard cards for availability, allocation, maintenance, bookings, transfers, and returns
- activity logs for state-changing actions and failed access attempts
- in-app notifications for allocations, overdue items, booking reminders, maintenance progress, audits, and promotions
- reports for utilization, maintenance frequency, retirement planning, department allocation, and booking heatmaps

## Functional Modules

- `Authentication and RBAC`
- `Departments and Employee Directory`
- `Asset Categories and Custom Fields`
- `Asset Registry and Directory`
- `Lifecycle State Machine`
- `Allocation and Return Tracking`
- `Transfer Requests`
- `Shared Resource Booking`
- `Maintenance Workflow`
- `Audit Cycles and Discrepancy Reports`
- `Reports, Analytics, Notifications, and Logs`

## Specification Documents

Detailed planning documents for the project live in:

- [requirements.md](./.kiro/specs/assetflow-erp/requirements.md)
- [design.md](./.kiro/specs/assetflow-erp/design.md)
- [tasks.md](./.kiro/specs/assetflow-erp/tasks.md)
- [technical-implementation.md](./.kiro/specs/assetflow-erp/technical-implementation.md)

## Target Stack

- `Odoo 17 Community`
- `Python 3.10+`
- `PostgreSQL 14+`
- `OWL / QWeb` for Odoo web UI customizations

## Outcome

The goal of AssetFlow ERP is to deliver a practical, audit-friendly, and scalable asset management solution that goes beyond simple inventory tracking by combining lifecycle governance, guided conflict resolution, and real-time operational insight.
