# AssetFlow ERP

AssetFlow ERP is an enterprise asset and shared-resource management system built for Odoo Hackathon workflows. It combines Odoo-native backend operations with a dedicated frontend shell and covers the complete journey of an asset from registration to disposal.

## Vision and Scope

AssetFlow is designed for teams that need operational control, auditability, and role-based visibility for physical assets across offices, schools, hospitals, factories, and similar environments.

The intended functional scope includes:

- secure authentication and role-based access control
- organization setup through departments, categories, and employee directory administration
- asset registration, lifecycle governance, and searchable asset directory
- allocation and return workflows with overdue detection
- transfer-request workflows for re-assignment of allocated assets
- resource booking with overlap validation and guided conflict handling
- maintenance request and technician workflow management
- audit-cycle execution with discrepancy reporting
- KPI dashboard, notifications, activity logs, and analytics/reporting

## Current Architecture

This repository uses a split deployment model:

- backend: Odoo module and backend services in [backend](./backend)
- frontend: Next.js app in [frontend](./frontend)

Backend deployment blueprint is configured in [render.yaml](./render.yaml), and full deployment instructions are in [DEPLOYMENT.md](./DEPLOYMENT.md).

## Feature Coverage

### 1) Identity and Roles

- email-based signup with default Employee role
- password policy validation at user creation/update
- failed-login lockout tracking and lock window handling
- role hierarchy support for Employee, Department Head, Asset Manager, and Admin

### 2) Organization Setup

- department extension with hierarchy depth and circular-reference validation
- department activation/deactivation support with logging
- employee extension with active/inactive controls and reassignment handling
- category model with custom fields and limits

### 3) Asset Core

- asset registration with generated AF-XXXX tag sequence
- serial uniqueness and lifecycle transition validation
- attachment limits and file-type/size validation
- controlled state transitions across available, allocated, reserved, maintenance, lost, retired, and disposed

### 4) Allocation and Transfer

- allocation flow with expected-return checks and inactive-holder prevention
- return flow with condition capture and state restoration
- overdue detection cron with notifications
- transfer requests with progression enforcement and re-allocation handling

### 5) Booking and Conflicts

- time-window validation with minimum duration checks
- overlap detection using half-open interval semantics
- booking state transitions via scheduled jobs
- cancellation and reminder flows
- conflict messaging with holder and slot context

### 6) Maintenance and Audit

- maintenance request lifecycle from pending to resolved/rejected
- technician assignment and resolution notes enforcement
- audit-cycle and audit-mark models with scope checks
- discrepancy report generation and locked closed-cycle behavior

### 7) Visibility and Operations

- KPI dashboard aggregation model with role-aware scoping
- activity log model for state-change traceability
- in-app notification model with retry logic
- baseline reporting service classes for utilization, maintenance, and booking views

## Project Structure

- [backend/assetflow_erp](./backend/assetflow_erp): Odoo module source (models, views, security, wizards, reports, tests)
- [backend/deploy/render](./backend/deploy/render): backend container and entrypoint config
- [frontend/app](./frontend/app): Next.js app routes and UI shell
- [frontend/lib](./frontend/lib): frontend API utilities for backend connectivity
- [.kiro/specs/assetflow-erp](./.kiro/specs/assetflow-erp): requirements, design, tasks, and implementation specifications

## Technology Stack

- Odoo 17 Community Edition
- Python 3.10+
- PostgreSQL 14+
- QWeb and OWL for Odoo-native backend UI
- Next.js for the separate frontend shell

## Local Development

### Backend

Use the Odoo module under [backend/assetflow_erp](./backend/assetflow_erp) with an Odoo 17 + PostgreSQL setup.

### Frontend

From [frontend](./frontend):

1. install dependencies
2. set NEXT_PUBLIC_API_BASE_URL to your backend URL
3. run the Next.js dev server

## Specifications and Delivery Plan

Authoritative project specification files:

- [requirements.md](./.kiro/specs/assetflow-erp/requirements.md)
- [design.md](./.kiro/specs/assetflow-erp/design.md)
- [tasks.md](./.kiro/specs/assetflow-erp/tasks.md)
- [technical-implementation.md](./.kiro/specs/assetflow-erp/technical-implementation.md)

## Goal

AssetFlow ERP aims to deliver a practical, audit-friendly, and extensible operational platform that goes beyond inventory listing by enforcing lifecycle controls, guiding conflict resolution, and providing role-aware decision visibility.
