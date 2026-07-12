# AssetFlow

**Enterprise Asset & Shared-Resource Management Platform**

AssetFlow is a full-stack enterprise platform that covers the complete asset lifecycle — from registration to disposal — with role-based workflows, auditability, guided conflict resolution, real-time notifications, and analytics.

---

## Table of Contents

- [What AssetFlow Solves](#what-assetflow-solves)
- [Technology Stack](#technology-stack)
- [Repository Layout](#repository-layout)
- [Prerequisites](#prerequisites)
- [Code Setup](#code-setup)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Backend Setup](#2-backend-setup)
  - [3. Frontend Setup](#3-frontend-setup)
  - [4. Database Setup](#4-database-setup)
  - [5. Seed Data](#5-seed-data)
  - [6. Run the Application](#6-run-the-application)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Architecture Overview](#architecture-overview)
- [User Roles & Permissions](#user-roles--permissions)
- [User Flows](#user-flows)
  - [Authentication Flow](#authentication-flow)
  - [Asset Management Flow](#asset-management-flow)
  - [Allocation Flow](#allocation-flow)
  - [Booking Flow](#booking-flow)
  - [Maintenance Flow](#maintenance-flow)
  - [Audit Flow](#audit-flow)
  - [AI Assistant Flow](#ai-assistant-flow)
- [Real-Time Features](#real-time-features)
- [Testing](#testing)
- [CI/CD](#cicd)
- [Deployment](#deployment)
- [Seed Accounts](#seed-accounts)
- [Contributing](#contributing)

---

## What AssetFlow Solves

AssetFlow gives organizations a single platform to manage:

- **Assets** — registration, lifecycle state tracking, QR codes, attachments
- **Allocations** — assign assets to employees/departments with return tracking
- **Bookings** — shared-resource scheduling with overlap detection and conflict resolution
- **Maintenance** — request, assign, track, and resolve maintenance workflows
- **Transfers** — reassignment requests with approval chains
- **Audits** — audit cycles, asset verification, discrepancy reporting
- **Notifications** — real-time in-app alerts, email, and push notifications
- **Dashboards** — role-scoped KPIs, analytics, and time-series data
- **AI Assistant** — natural language search, report summaries, and recommendations
- **Reports** — utilization, maintenance frequency, booking heatmaps, CSV/PDF exports

The platform is industry-agnostic and fits offices, schools, hospitals, factories, and similar environments.

---

## Technology Stack

### Frontend

| Layer         | Technology                          |
| ------------- | ----------------------------------- |
| Framework     | Next.js 14 (App Router)             |
| Language      | TypeScript                          |
| Styling       | Tailwind CSS + @tailwindcss/forms   |
| State         | Zustand                             |
| Runtime       | React 18                            |

### Backend

| Layer         | Technology                          |
| ------------- | ----------------------------------- |
| Framework     | Express.js 4                        |
| Language      | TypeScript                          |
| ORM           | Prisma 5                            |
| Database      | PostgreSQL (Neon serverless)        |
| Auth          | JWT (access + refresh tokens)       |
| Real-time     | Socket.IO                           |
| API Docs      | Swagger / OpenAPI 3.0               |
| Validation    | Zod                                 |
| File Uploads  | Multer                              |
| Logging       | Winston                             |
| AI            | Grok API (OpenAI-compatible)        |
| Email         | Resend                              |
| Storage       | Cloudinary                          |
| QR Codes      | qrcode                              |

### DevOps & Tooling

| Tool          | Purpose                             |
| ------------- | ----------------------------------- |
| Vitest        | Unit & integration testing          |
| Supertest     | HTTP testing                        |
| ESLint        | Linting                             |
| Prettier      | Code formatting                     |
| GitHub Actions| CI pipeline                         |
| Vercel        | Frontend hosting                    |
| Render        | Backend hosting                     |
| Neon          | Managed PostgreSQL                  |

---

## Repository Layout

```
assetflow/
├── backend/                 Express + TypeScript API
│   ├── prisma/              Schema, migrations, seed
│   ├── src/
│   │   ├── config/          Environment, server, swagger, socket, logger
│   │   ├── constants/       Roles, routes, HTTP codes, messages
│   │   ├── controllers/     Request handlers
│   │   ├── interfaces/      TypeScript interfaces
│   │   ├── jobs/            Scheduled tasks
│   │   ├── middleware/      Auth, CORS, rate-limit, validation, uploads
│   │   ├── repositories/    Data access (Prisma queries)
│   │   ├── routes/v1/       Versioned API routes
│   │   ├── services/        Business logic
│   │   ├── utils/           Helpers, JWT, errors, response
│   │   └── validators/      Zod schemas per module
│   └── package.json
├── frontend/                Next.js application
│   ├── app/                 Pages (App Router)
│   ├── components/          Shared UI components
│   ├── features/            Feature-scoped components
│   ├── hooks/               Custom React hooks
│   ├── services/            API service layer
│   ├── store/               Zustand stores
│   ├── types/               Shared TypeScript types
│   ├── lib/                 API client & utilities
│   └── package.json
├── database/                Pure SQL schema & DB docs
├── docs/                    Product requirements (PRD)
├── .github/workflows/       CI pipeline
├── DEPLOYMENT.md            Deployment instructions
└── README.md                ← You are here
```

---

## Prerequisites

- **Node.js** >= 20.x
- **npm** >= 9.x
- **PostgreSQL** (local or Neon cloud instance)
- **Git**

Optional (for full feature set):
- Neon account (managed Postgres)
- Cloudinary account (file storage)
- Resend account (transactional email)
- Grok API key (AI assistant)

---

## Code Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/assetflow.git
cd assetflow
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create your environment file:

```bash
cp .env.example .env
```

Edit `.env` and fill in the required values (see [Environment Variables](#environment-variables) below).

Generate the Prisma client:

```bash
npm run prisma:generate
```

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Create your environment file:

```bash
cp .env.example .env.local
```

Set the values:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_APP_NAME=AssetFlow
NEXT_PUBLIC_GROK_MODEL=<your-grok-model-id>
```

### 4. Database Setup

You need a PostgreSQL database. Options:

**Option A: Neon (recommended for production-like setup)**

1. Create a free project at [neon.tech](https://neon.tech)
2. Copy the pooled connection string → `DATABASE_URL`
3. Copy the direct connection string → `DIRECT_URL`

**Option B: Local PostgreSQL**

```bash
createdb assetflow
# Then set DATABASE_URL=postgresql://user:pass@localhost:5432/assetflow
```

Run migrations:

```bash
cd backend
npm run prisma:migrate
```

### 5. Seed Data

Populate the database with realistic sample data (departments, users, assets, allocations, bookings, etc.):

```bash
cd backend
npm run prisma:seed
```

This creates users across all roles with the password `Password123!` (see [Seed Accounts](#seed-accounts)).

### 6. Run the Application

**Backend** (runs on port 5000 by default):

```bash
cd backend
npm run dev
```

**Frontend** (runs on port 3000 by default):

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable               | Required | Default        | Description                                    |
| ---------------------- | -------- | -------------- | ---------------------------------------------- |
| `NODE_ENV`             | No       | `development`  | Runtime environment                            |
| `PORT`                 | No       | `5000`         | HTTP server port                               |
| `API_PREFIX`           | No       | `/api`         | Base path for API routes                       |
| `DATABASE_URL`         | **Yes**  | —              | Pooled PostgreSQL connection string            |
| `DIRECT_URL`           | No       | —              | Direct connection for Prisma Migrate           |
| `JWT_SECRET`           | **Yes**  | —              | Access token signing key                       |
| `JWT_REFRESH_SECRET`   | **Yes**  | —              | Refresh token signing key                      |
| `JWT_ACCESS_TTL`       | No       | `15m`          | Access token lifetime                          |
| `JWT_REFRESH_TTL`      | No       | `7d`           | Refresh token lifetime                         |
| `COOKIE_SECRET`        | **Yes**  | —              | Signed cookie encryption key                   |
| `CORS_ORIGIN`          | No       | `*`            | Allowed origins (comma-separated or `*`)       |
| `CORS_CREDENTIALS`     | No       | `true`         | Allow credentials in CORS                      |
| `RATE_LIMIT_WINDOW_MS` | No       | `60000`        | Rate limit window (ms)                         |
| `RATE_LIMIT_MAX`       | No       | `100`          | Max requests per window                        |
| `BODY_LIMIT`           | No       | `10mb`         | Request body size limit                        |
| `LOG_LEVEL`            | No       | `info`         | Winston log level                              |
| `GROK_API_KEY`         | No       | —              | Grok/xAI API key for AI assistant              |
| `RESEND_API_KEY`       | No       | —              | Resend API key for emails                      |
| `CLOUDINARY_URL`       | No       | —              | Cloudinary connection string for file uploads  |
| `UPLOAD_DIR`           | No       | `uploads`      | Local upload directory                         |
| `UPLOAD_MAX_SIZE`      | No       | `10485760`     | Max upload size in bytes (10 MB)               |

### Frontend (`frontend/.env.local`)

| Variable                | Required | Description                             |
| ----------------------- | -------- | --------------------------------------- |
| `NEXT_PUBLIC_API_URL`   | **Yes**  | Backend API base URL                    |
| `NEXT_PUBLIC_APP_NAME`  | No       | Application display name                |
| `NEXT_PUBLIC_GROK_MODEL`| No       | AI model identifier for assistant       |

---

## API Reference

The backend auto-generates Swagger/OpenAPI documentation:

- **Swagger UI:** [http://localhost:5000/api/docs](http://localhost:5000/api/docs)
- **JSON spec:** [http://localhost:5000/api/docs.json](http://localhost:5000/api/docs.json)

### API Endpoints Summary

All endpoints are prefixed with `/api/v1`.

| Module            | Base Path            | Description                              |
| ----------------- | -------------------- | ---------------------------------------- |
| Health            | `/health`            | Liveness and readiness probes            |
| Version           | `/version`           | API version information                  |
| Status            | `/status`            | System status                            |
| Auth              | `/auth`              | Register, login, logout, password flows  |
| Users             | `/users`             | User management (admin)                  |
| Departments       | `/departments`       | Department CRUD and hierarchy            |
| Assets            | `/assets`            | Asset CRUD, lifecycle, search            |
| Asset Categories  | `/asset-categories`  | Category management and custom fields    |
| Asset Locations   | `/asset-locations`   | Location management                      |
| Allocation        | `/allocation`        | Allocate, return, transfer assets        |
| Booking           | `/booking`           | Shared resource booking and conflicts    |
| Maintenance       | `/maintenance`       | Request, assign, resolve maintenance     |
| Audit             | `/audit`             | Audit cycles, records, discrepancies     |
| Reports           | `/reports`           | Analytics, exports, saved reports        |
| Activity          | `/activity`          | Activity logs and timeline               |
| Notifications     | `/notifications`     | In-app notifications                     |
| Assistant         | `/assistant`         | AI-powered search and recommendations    |
| Dashboard         | `/dashboard`         | KPIs, widgets, time-series data          |
| Settings          | `/settings`          | Organization and app settings            |

### Authentication

All protected routes require a `Bearer` token in the `Authorization` header or an `af_access` signed cookie:

```
Authorization: Bearer <access_token>
```

---

## Architecture Overview

### Request Flow

```
Client → Next.js Frontend → API Service Layer → Express Backend
                                                      ↓
Request → Route → Middleware (auth, validation, rate-limit)
                       ↓
              Controller → Service → Repository → Prisma → PostgreSQL
                                         ↓
                              Socket.IO (real-time events)
```

### Backend Architecture

The backend follows a clean layered architecture:

- **Routes** — endpoint definitions and middleware wiring
- **Controllers** — handle HTTP request/response, delegate to services
- **Services** — business logic, validations, orchestration
- **Repositories** — data access layer using Prisma
- **Middleware** — cross-cutting concerns (auth, validation, rate-limiting, uploads)
- **Validators** — Zod schemas for request validation

### Frontend Architecture

- **App Router** — Next.js 14 file-based routing
- **Services** — typed API client wrappers per domain
- **Stores** — Zustand stores for client state
- **Components** — reusable UI building blocks
- **Hooks** — custom React hooks for shared logic

---

## User Roles & Permissions

AssetFlow uses a hierarchical role-based access control system:

| Role              | Level | Capabilities                                                              |
| ----------------- | ----- | ------------------------------------------------------------------------- |
| **Employee**      | 1     | View assets, book shared resources, view own allocations                  |
| **Department Head** | 2   | All Employee permissions + manage department allocations, approve transfers, view department reports |
| **Asset Manager** | 3     | All Dept Head permissions + full asset CRUD, manage allocations/bookings/maintenance, run audits, view all reports |
| **Admin**         | 4     | Full system access — user management, settings, all modules               |

### Permission Keys

```
asset:create, asset:read, asset:update, asset:delete
allocation:manage, booking:manage, maintenance:manage
audit:manage, report:view, user:manage
```

---

## User Flows

### Authentication Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Signup    │────▶│  /auth/register │──▶│ JWT tokens issued │
└─────────────┘     └──────────────┘     └─────────────────┘

┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Login     │────▶│  /auth/login   │──▶│ Access + Refresh  │
└─────────────┘     └──────────────┘     │ tokens in cookies │
                                          └─────────────────┘

┌──────────────────┐     ┌────────────────┐     ┌──────────────┐
│ Forgot Password  │────▶│/auth/forgot-pwd│────▶│ Email with    │
└──────────────────┘     └────────────────┘     │ reset token   │
                                                 └──────┬───────┘
                                                        ▼
                                          ┌────────────────────┐
                                          │ /auth/reset-password│
                                          └────────────────────┘
```

**Endpoints:**

| Action           | Method | Endpoint                  | Auth Required |
| ---------------- | ------ | ------------------------- | ------------- |
| Register         | POST   | `/auth/register`          | No            |
| Login            | POST   | `/auth/login`             | No            |
| Refresh tokens   | POST   | `/auth/refresh`           | No            |
| Logout           | POST   | `/auth/logout`            | No            |
| Get profile      | GET    | `/auth/me`                | Yes           |
| Update profile   | PATCH  | `/auth/me`                | Yes           |
| Change password  | POST   | `/auth/change-password`   | Yes           |
| Forgot password  | POST   | `/auth/forgot-password`   | No            |
| Reset password   | POST   | `/auth/reset-password`    | No            |

**Token lifecycle:**
- Access token expires in 15 minutes (configurable)
- Refresh token expires in 7 days (configurable)
- Tokens are stored in httpOnly signed cookies and also returned in the response body
- Login is rate-limited to 20 attempts per 15 minutes per IP

### Asset Management Flow

```
Register Asset → Assign Category & Location → Generate QR Code
       ↓
Available → Allocated/Reserved → Maintenance → Retired → Disposed
       ↑                              ↓
       └──── Returned ◄──────────── Resolved
```

**Asset statuses:** `AVAILABLE`, `ALLOCATED`, `RESERVED`, `MAINTENANCE`, `LOST`, `RETIRED`, `DISPOSED`

**Key operations:**
1. Admin/Asset Manager registers new asset with metadata (serial number, category, location, purchase cost)
2. System generates unique asset tag and QR code
3. Asset enters `AVAILABLE` state
4. Lifecycle transitions are logged in asset history
5. Attachments (photos, documents) can be uploaded to asset records
6. Full search and filtering by status, category, department, location

### Allocation Flow

```
┌─────────────┐    ┌──────────────┐    ┌───────────────┐
│ Create      │───▶│   PENDING    │───▶│    ACTIVE     │
│ Allocation  │    └──────────────┘    └───────┬───────┘
└─────────────┘                                │
                                    ┌──────────┼──────────┐
                                    ▼          ▼          ▼
                              ┌──────────┐ ┌────────┐ ┌──────────┐
                              │ RETURNED │ │OVERDUE │ │CANCELLED │
                              └──────────┘ └────────┘ └──────────┘
```

**Flow details:**
1. Manager allocates an asset to an employee/department
2. Expected return date is validated
3. Asset status changes to `ALLOCATED`
4. Overdue allocations are tracked automatically
5. Returns capture condition assessment
6. Transfer requests follow an approval workflow

### Booking Flow

```
┌──────────────┐    ┌───────────────┐    ┌──────────────┐
│ Request      │───▶│   PENDING     │───▶│  CONFIRMED   │
│ Booking      │    └───────────────┘    └──────┬───────┘
└──────────────┘                                │
                         ┌──────────────────────┼─────────────┐
                         ▼                      ▼             ▼
                   ┌──────────┐          ┌──────────┐   ┌──────────┐
                   │ ACTIVE   │─────────▶│COMPLETED │   │CANCELLED │
                   └──────────┘          └──────────┘   └──────────┘
                                                              ▲
                                                              │
                                                         ┌─────────┐
                                                         │ NO_SHOW │
                                                         └─────────┘
```

**Conflict resolution:**
- Half-open interval overlap detection (`startTime < existingEnd AND endTime > existingStart`)
- Minimum booking duration enforcement
- When conflicts occur, the system provides:
  - Context-rich messages explaining the conflict
  - Suggested next available time slots
  - Alternative resource recommendations

### Maintenance Flow

```
┌──────────────┐    ┌───────────────┐    ┌──────────────┐    ┌──────────────┐
│ Submit       │───▶│   PENDING     │───▶│   ASSIGNED   │───▶│ IN_PROGRESS  │
│ Request      │    └───────────────┘    └──────────────┘    └──────┬───────┘
└──────────────┘           │                                        │
                           ▼                                        ▼
                    ┌──────────────┐                         ┌──────────────┐
                    │  REJECTED    │                         │   RESOLVED   │
                    └──────────────┘                         └──────────────┘
```

**Flow details:**
1. Any user creates a maintenance request with priority (LOW, MEDIUM, HIGH, CRITICAL)
2. Asset Manager reviews and either approves or rejects
3. Approved requests get a technician assigned
4. Technician marks progress and submits resolution notes
5. Asset returns to `AVAILABLE` after resolution
6. Complete maintenance history is preserved on the asset record

### Audit Flow

```
┌──────────────┐    ┌───────────────┐    ┌──────────────┐    ┌──────────────┐
│ Create       │───▶│   PLANNED     │───▶│ IN_PROGRESS  │───▶│  COMPLETED   │
│ Audit Cycle  │    └───────────────┘    └──────────────┘    └──────┬───────┘
└──────────────┘                                                    │
                                                                    ▼
                                                             ┌──────────────┐
                                                             │    CLOSED    │
                                                             └──────────────┘
```

**Flow details:**
1. Admin/Asset Manager creates an audit cycle
2. Assets are assigned for verification
3. Auditors mark each asset as: verified, missing, or damaged
4. System generates discrepancy reports for mismatches
5. Completed audits are locked and cannot be modified
6. Reports show trends across audit cycles

### AI Assistant Flow

```
User question → /assistant endpoint → Grok API → Contextual response
                                         ↓
                              Natural language asset search
                              Report summaries
                              Dashboard insights
                              Maintenance recommendations
```

The AI assistant uses conversation history and can:
- Search assets using natural language queries
- Summarize reports and highlight anomalies
- Provide maintenance scheduling recommendations
- Answer questions about asset utilization patterns

---

## Real-Time Features

AssetFlow uses Socket.IO for real-time updates across three namespaces:

| Namespace        | Purpose                                                    |
| ---------------- | ---------------------------------------------------------- |
| `/notifications` | Push in-app notifications for workflow events              |
| `/dashboard`     | Live KPI updates, widget refresh                           |
| `/activity`      | Real-time activity feed for state changes                  |

Connect with:
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000/notifications', {
  auth: { token: '<access_token>' },
  transports: ['websocket', 'polling'],
});
```

---

## Testing

### Backend

```bash
cd backend

# Run all tests once
npm run test

# Watch mode (for development)
npm run test:watch

# With coverage report
npm run test:coverage
```

### Code Quality

```bash
cd backend

# Lint
npm run lint
npm run lint:fix

# Format
npm run format
npm run format:check

# Type check
npm run typecheck
```

---

## CI/CD

GitHub Actions runs on every push to `main`/`master` and on pull requests:

**Backend job:**
1. Install dependencies
2. Generate Prisma client
3. Lint check
4. Format check
5. Build (TypeScript compilation)

**Frontend job:**
1. Install dependencies
2. Lint check
3. Build (Next.js production build)

---

## Deployment

### Backend (Render)

```bash
cd backend
npm install
npm run prisma:generate
npm run build
npm start                 # runs dist/server.js
```

Health check endpoint: `GET /api/v1/health`

### Frontend (Vercel)

```bash
cd frontend
npm install
npm run build
npm start
```

Set `NEXT_PUBLIC_API_URL` to your deployed backend URL (e.g., `https://assetflow-api.onrender.com/api/v1`).

### Database (Neon)

- Point-in-time recovery and instant restore
- Branch for safe migration testing
- Apply migrations in production: `npx prisma migrate deploy`

Full deployment details: [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## Seed Accounts

After running `npm run prisma:seed`, these accounts are available (all use password `Password123!`):

| Email                   | Name          | Role            | Department | Access Level |
| ----------------------- | ------------- | --------------- | ---------- | ------------ |
| admin@assetflow.io      | Aria Nolan    | ADMIN           | IT         | Full system access — all modules, all data |
| manager@assetflow.io    | Marcus Reed   | ASSET_MANAGER   | Operations | Assets, allocations, maintenance, audit, reports |
| ithead@assetflow.io     | Priya Shah    | DEPARTMENT_HEAD | IT         | Department-scoped: assets, allocations, bookings, reports |
| hrhead@assetflow.io     | Diego Marin   | DEPARTMENT_HEAD | HR         | Department-scoped: assets, allocations, bookings, reports |
| liam@assetflow.io       | Liam Carter   | EMPLOYEE        | IT         | View assets, create bookings, personal allocations |
| sofia@assetflow.io      | Sofia Rossi   | EMPLOYEE        | HR         | View assets, create bookings, personal allocations |
| noah@assetflow.io       | Noah Kim      | EMPLOYEE        | Operations | View assets, create bookings, personal allocations |
| emma@assetflow.io       | Emma Novak    | EMPLOYEE        | Finance    | View assets, create bookings, personal allocations |

### Recommended Demo Flow

1. **Login as Admin** (`admin@assetflow.io` / `Password123!`) — full visibility
2. **Dashboard** — view live KPIs (Available, Allocated, Maintenance, Bookings, Overdue)
3. **Assets** — browse 12 seeded assets across 5 categories with status badges
4. **Allocation** — view active/overdue allocations (1 overdue flagged)
5. **Booking** — see scheduled resource bookings for meeting rooms
6. **Maintenance** — review open requests with priority and status tracking
7. **Audit** — inspect the ongoing Q1 2026 audit cycle with discrepancy
8. **Reports** — generate utilization, maintenance, and department reports
9. **AI Assistant** — click the floating bot icon (bottom-right) for Grok AI chat
10. **Activity Log** — see all system-wide actions with timestamps
11. **Role switching** — log in as `liam@assetflow.io` to see reduced Employee view

### Seeded Data Summary

- 12 assets across 5 categories (Laptops, Monitors, Projectors, Furniture, Vehicles)
- 4 departments with hierarchy (IT, HR, Operations, Finance under Head Office)
- 3 allocations (2 active, 1 overdue)
- 2 bookings (1 confirmed meeting room, 1 pending projector)
- 2 maintenance requests (1 in-progress, 1 resolved)
- 1 audit cycle with 3 records (2 verified, 1 discrepancy)
- Notifications, dashboard widgets, and organization settings

---

## Frontend Pages

| Route               | Description                                |
| ------------------- | ------------------------------------------ |
| `/login`            | Sign in page                               |
| `/signup`           | Self-registration for new users            |
| `/forgot-password`  | Request password reset email               |
| `/reset-password`   | Complete password reset with token          |
| `/change-password`  | Change password (authenticated)            |
| `/dashboard`        | Role-scoped KPI dashboard with live data   |
| `/assets`           | Asset directory with search and filtering  |
| `/allocation`       | Allocation & transfer management           |
| `/booking`          | Resource booking with calendar view        |
| `/maintenance`      | Maintenance request tracking               |
| `/audit`            | Audit cycle management and records         |
| `/reports`          | Analytics and report generation            |
| `/activity`         | System-wide activity log with pagination   |
| `/organization`     | Organization and department management     |
| `/admin/users`      | User management (Admin only)               |
| `/profile`          | User profile and preferences               |

---

## Database Commands

Run from the `backend/` directory:

```bash
# Generate Prisma Client
npm run prisma:generate

# Create a new migration
npm run prisma:migrate

# Apply migrations (CI/production)
npx prisma migrate deploy

# Seed sample data (idempotent)
npm run prisma:seed

# Reset database (DESTRUCTIVE — drops and recreates)
npx prisma migrate reset

# Open Prisma Studio (visual DB browser)
npx prisma studio
```

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit using [Conventional Commits](https://www.conventionalcommits.org/): `git commit -m "feat: add asset bulk import"`
4. Push to your branch: `git push origin feature/my-feature`
5. Open a Pull Request

### Code Standards

- TypeScript strict mode
- ESLint + Prettier enforced in CI
- Zod validation on all request inputs
- Repository pattern for data access
- Soft deletes on all core entities (never hard-delete)
- UUID primary keys throughout

---

## License

MIT
