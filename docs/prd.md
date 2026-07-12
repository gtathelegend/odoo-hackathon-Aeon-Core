# MASTER_PRD.md

# AssetFlow
Enterprise Asset & Resource Management System

Version: 2.0
Architecture: Modern Full-Stack
Status: Rewrite from Existing Codebase

---

# Objective

Rebuild the existing AssetFlow project into a production-ready, modular Enterprise Asset Management platform using modern web technologies while preserving the existing frontend design language and business workflows.

The final application should demonstrate enterprise software engineering practices, scalability, security, modularity, maintainability, and deployment readiness suitable for the Odoo Hackathon and future real-world use.

---

# Primary Goals

- Remove all unnecessary Odoo/Python/XML/OWL implementation.
- Preserve and enhance the existing Next.js UI and design system.
- Build a clean REST API backend using Express + TypeScript.
- Use PostgreSQL (Neon) as the primary database.
- Implement modular service-based architecture following industry standards.
- Support concurrent multi-user operations safely.
- Deliver a production-ready application deployable on Vercel + Render.

---

# Technology Stack

## Frontend

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Hook Form
- Zod
- TanStack Query
- Zustand
- FullCalendar
- Recharts

## Backend

- Express.js
- TypeScript
- Prisma ORM
- PostgreSQL (Neon)
- JWT Authentication
- Bcrypt
- Helmet
- CORS
- Winston Logger
- Multer
- Socket.IO

## AI

- Grok API
- Function Calling
- Chat Assistant
- Smart Search
- Report Generation

## Deployment

Frontend
- Vercel

Backend
- Render

Database
- Neon PostgreSQL

Storage
- Cloudinary

Emails
- Resend

---

# Project Structure

```
assetflow/

frontend/
backend/
database/
docs/
scripts/
.github/
```

Backend must follow

```
controllers/
services/
repositories/
routes/
middleware/
utils/
validators/
types/
config/
```

Frontend must follow

```
app/
components/
features/
hooks/
lib/
services/
store/
types/
styles/
```

No business logic should exist inside UI components.

---

# Core Modules

- Authentication
- Role Based Access Control
- Dashboard
- Organization Setup
- Employee Directory
- Asset Management
- Allocation
- Transfers
- Resource Booking
- Maintenance
- Audit
- Reports
- Notifications
- Activity Logs
- AI Assistant
- Settings

Each module must remain independent and reusable.

---

# Frontend Requirements

Preserve the current design language.

Implement all pages completely with:

- Forms
- Tables
- Dashboards
- Charts
- Calendar Views
- Timeline Views
- Reports
- Filters
- Search
- Pagination
- Loading States
- Empty States
- Error Handling
- Responsive Design
- Accessibility

Every action must communicate with backend APIs only.

No mock data.

---

# Backend Requirements

Remove all legacy Odoo backend implementation.

Create a modular Express backend exposing REST APIs.

Implement

- Authentication
- Authorization
- Validation
- Rate Limiting
- Logging
- Audit Trails
- File Upload
- Notification Engine
- AI Integration
- Report Generation
- Dashboard APIs

Follow Controller → Service → Repository architecture.

---

# Database

Use Neon PostgreSQL.

Generate

- Complete SQL schema
- Prisma schema
- Foreign Keys
- Constraints
- Indexes
- Seed Data

Database credentials must be loaded only from backend `.env`.

---

# Environment Variables

Frontend

```
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_APP_NAME=
```

Backend

```
PORT=
DATABASE_URL=
JWT_SECRET=
JWT_REFRESH_SECRET=
GROK_API_KEY=
RESEND_API_KEY=
CLOUDINARY_URL=
CORS_ORIGIN=
```

Never hardcode secrets.

---

# Security

Implement

- JWT Authentication
- Refresh Tokens
- RBAC
- Password Hashing
- Input Validation
- File Validation
- Rate Limiting
- Helmet
- Secure Headers
- SQL Injection Protection
- XSS Protection
- Audit Logging

---

# Performance

Support concurrent multi-user access.

Use

- Database Transactions
- Optimistic Locking where required
- Proper Indexing
- Pagination
- Lazy Loading
- API Caching
- Query Optimization

Prevent race conditions during

- Asset Allocation
- Transfers
- Resource Booking
- Maintenance Approval

---

# AI Features

Integrate Grok API.

Implement

- AI Chat Assistant
- Natural Language Asset Search
- Report Summaries
- Dashboard Insights
- Recommendation Engine

AI configuration must be environment-driven.

---

# Deployment

Frontend

- Deploy on Vercel

Backend

- Deploy on Render

Database

- Neon PostgreSQL

The application must be production-ready with health checks, logging, environment validation, and error monitoring.

---

# Development Standards

- TypeScript Strict Mode
- ESLint
- Prettier
- Modular Components
- Clean Architecture
- Reusable Code
- Repository Pattern
- RESTful APIs
- Consistent Naming
- Feature-Based Folder Structure

---

# Git Workflow

Each implementation task must:

1. Complete the assigned module.
2. Verify build success.
3. Pass linting.
4. Pass type checking.
5. Update documentation if required.
6. Commit using Conventional Commits.

Example

```
feat(auth): implement JWT authentication
```

Each prompt should modify only its assigned module to minimize merge conflicts.

---

# Definition of Done

The project is complete only when:

- All required modules are functional.
- Frontend and backend are fully integrated.
- Database is normalized and deployed.
- APIs are documented.
- Authentication and RBAC are enforced.
- Reports and dashboards are operational.
- AI Assistant is integrated.
- Application passes build, lint, and type checks.
- Deployment on Vercel + Render is successful.
- Documentation is updated.