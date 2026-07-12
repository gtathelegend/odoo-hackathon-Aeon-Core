# AssetFlow

AssetFlow is an enterprise asset and shared-resource management platform built for hackathon submission and real-world extensibility. It covers the full asset lifecycle from registration to disposal, with role-based workflows, auditability, guided conflict resolution, and analytics.

## Hackathon Submission Summary

AssetFlow is designed to demonstrate the kind of enterprise software judges expect from a strong hackathon project:

- a clear business problem with broad organizational relevance
- a complete asset lifecycle and custody model
- role-aware access and progressive disclosure
- fast conflict handling for allocations and bookings
- audit trails, notifications, reports, and dashboard visibility
- a split frontend/backend architecture that is ready for deployment

The authoritative product brief lives in [docs/prd.md](./docs/prd.md).

## What AssetFlow Solves

AssetFlow gives organizations a single place to manage:

- assets and their lifecycle state
- allocations to employees or departments
- shared-resource bookings with overlap checks
- maintenance requests and approvals
- transfer requests for reassignment
- audit cycles and discrepancy reporting
- activity logs and notifications
- KPI dashboards and analytics
- AI-assisted search and reporting support

The platform is industry-agnostic and fits offices, schools, hospitals, factories, and similar environments.

## Core Features

### Authentication and Access Control

- email/password authentication
- signup flow with default Employee role
- password policy enforcement
- login failure lockout behavior
- session timeout handling
- role-based access control for Employee, Department Head, Asset Manager, and Admin
- access-denied logging for forbidden actions

### Dashboard and Visibility

- role-scoped KPI dashboard
- cards for available assets, allocated assets, maintenance today, active bookings, pending transfers, and upcoming returns
- overdue return highlighting
- quick actions based on role
- activity feed and timeline views
- dashboard polling and time-series endpoints

### Organization Setup

- department management with hierarchy
- department head assignment
- department activation and deactivation controls
- employee directory management
- employee role promotion and reassignment flows
- asset category management
- category-specific custom fields

### Asset Management

- asset registration with generated asset tags
- asset lifecycle state machine
- serial number uniqueness
- required metadata validation
- attachment handling for asset records
- searchable asset directory
- asset history across allocations, bookings, maintenance, and audit events

### Allocation and Transfers

- allocation to employees or departments
- expected return date validation
- return processing with condition capture
- overdue allocation tracking
- transfer request workflow
- conflict-first allocation guidance
- re-allocation after transfer approval

### Booking and Conflict Resolution

- shared resource booking
- overlap validation using half-open intervals
- minimum booking duration enforcement
- booking cancellation and rescheduling
- booking reminders
- guided conflict resolution with context-rich messages
- suggested next-slot behavior for booking conflicts

### Maintenance

- maintenance request creation
- approval, rejection, technician assignment, in-progress, and resolution states
- resolution notes and completion tracking
- maintenance history on the asset record
- in-app notifications for status changes

### Audit and Reporting

- audit cycle creation and closure
- audit marks for verified, missing, and damaged assets
- discrepancy report generation
- locked closed-cycle behavior
- utilization reports
- maintenance frequency reporting
- assets due for maintenance
- assets due for retirement
- department allocation summary
- booking heatmap
- CSV and PDF export support

### Notifications and Logging

- activity log for state-changing actions
- in-app notifications for major workflow events
- unread notification indicator
- retry behavior for failed notification delivery

### AI and Productivity

- AI assistant entry point
- natural language asset search direction
- report summaries and dashboard insights
- recommendation-oriented workflows

## Unique Selling Points

AssetFlow stands out because it is not just an inventory list. It is a workflow-heavy enterprise system with deliberate UX and operational controls.

1. Conflict-first workflow design that guides users instead of only blocking them.
2. Full lifecycle governance for assets, allocations, bookings, maintenance, and audits.
3. Role-based progressive disclosure so each user sees only what they can act on.
4. Traceability through activity logs, notifications, and timeline/history views.
5. Split frontend and backend architecture ready for deployment on modern platforms.
6. Hackathon-friendly scope that still feels like a real enterprise product.

## Architecture

AssetFlow is split into two deployable applications:

- [frontend](./frontend) - Next.js user interface
- [backend](./backend) - Express + TypeScript REST API

Supporting project folders:

- [docs](./docs) - product requirements and planning
- [DEPLOYMENT.md](./DEPLOYMENT.md) - deployment instructions

### Backend Structure

The backend follows a modular service architecture:

- controllers
- services
- repositories
- routes
- middleware
- validators
- config
- socket
- jobs
- prisma schema and seed data

### Request Flow

Request -> Route -> Controller -> Service -> Repository -> Prisma -> PostgreSQL

## Technology Stack

### Frontend

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Zustand
- Next.js App Router

### Backend

- Express.js
- TypeScript
- Prisma ORM
- PostgreSQL on Neon
- JWT authentication
- Bcrypt password hashing
- Helmet security headers
- CORS
- Winston logging
- Multer file uploads
- Socket.IO
- Swagger / OpenAPI docs
- Zod validation

### Tooling and Quality

- ESLint
- Prettier
- Vitest
- Supertest
- Conventional Commits

### Deployment and Services

- Frontend: Vercel
- Backend: Render
- Database: Neon PostgreSQL
- Storage: Cloudinary
- Email: Resend
- AI: Grok API

## Repository Layout

```
assetflow/
  backend/      Express + TypeScript API and Prisma backend
  frontend/     Next.js application and UI shell
  docs/         PRD and related product documents
  .kiro/        Detailed specs, tasks, and design docs
```

## Local Development

### Backend

```bash
cd backend
npm install
npm run prisma:generate
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Set `NEXT_PUBLIC_API_URL` to the backend URL in your frontend environment file.

## API and Ops

- API docs are exposed through Swagger UI at `/api/docs`.
- Health, version, and status endpoints are available in the backend.
- Notifications and dashboard updates use Socket.IO namespaces.
- Files are handled through the backend upload pipeline and stored through configured media services.

## Specs

Authoritative project specifications live in:

- [docs/prd.md](./docs/prd.md)
- [.kiro/specs/assetflow-erp/requirements.md](./.kiro/specs/assetflow-erp/requirements.md)
- [.kiro/specs/assetflow-erp/design.md](./.kiro/specs/assetflow-erp/design.md)
- [.kiro/specs/assetflow-erp/tasks.md](./.kiro/specs/assetflow-erp/tasks.md)
- [.kiro/specs/assetflow-erp/technical-implementation.md](./.kiro/specs/assetflow-erp/technical-implementation.md)

## Deployment

Split hosting is configured for:

- backend on Render
- frontend on Vercel
- PostgreSQL on Neon

Full setup details are documented in [DEPLOYMENT.md](./DEPLOYMENT.md).

## Submission Goal

AssetFlow is meant to feel like a complete hackathon submission: clear problem statement, strong user roles, visible business value, polished architecture, and a credible path from demo to production.
