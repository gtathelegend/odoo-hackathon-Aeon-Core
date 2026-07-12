# AssetFlow

AssetFlow is an enterprise asset and shared-resource management system. It
covers the complete journey of an asset from registration to disposal with
role-based access, allocation and booking workflows, maintenance, audits, and
analytics.

This repository is a clean, modular foundation. Business features are built
incrementally in subsequent prompts.

## Architecture

AssetFlow is a split application:

- **Frontend** — Next.js (App Router) + TypeScript + Tailwind
- **Backend** — Express + TypeScript REST API (`/api/v1`)
- **Database** — PostgreSQL (Neon serverless) via Prisma
- **Realtime** — Socket.IO (initialized, wired in later prompts)

```
assetflow/
  frontend/     Next.js app (UI, services, stores, types)
  backend/      Express + TypeScript API (modular src/)
  database/     Database documentation (schema lives in backend/prisma)
  docs/         Product and technical documentation
  scripts/      Automation and developer scripts
  .github/      CI workflows
```

## Folder Structure

### Frontend (`frontend/`)

```
app/          Next.js routes (compose components only)
components/    Shared UI components
features/      Feature-scoped components and logic
hooks/         Reusable React hooks
services/      API service layer (grouped by domain)
store/         Zustand stores
types/         Shared TypeScript types
lib/           API client and low-level utilities
styles/        Global and shared styles
constants/     App-wide constants
utils/         Helper functions
```

### Backend (`backend/`)

```
src/
  config/       Environment, database, app config
  controllers/  Request handlers (later prompts)
  services/     Business logic (later prompts)
  repositories/ Data access (later prompts)
  routes/       Versioned route definitions (/api/v1)
  middleware/   auth, role, validation, error, logger, rateLimiter, upload
  validators/   Zod schemas (later prompts)
  types/        Shared types
  interfaces/   Shared interfaces
  models/       Domain models (later prompts)
  utils/        jwt, date, logger, response, pagination, errors, validators
  jobs/         Scheduled jobs (later prompts)
  socket/       Socket.IO setup
  docs/         API documentation
prisma/         schema.prisma + seed.ts
tests/          Test suites (later prompts)
uploads/        File upload target
logs/           error.log + combined.log
```

## Tech Stack

- Node.js + Express + TypeScript (strict)
- Prisma ORM + PostgreSQL (Neon)
- Zod, Helmet, CORS, Morgan, Winston
- bcrypt, jsonwebtoken, multer, socket.io
- Next.js 14, React 18, Tailwind CSS, Zustand
- ESLint + Prettier

## Getting Started

### Backend

```bash
cd backend
npm install
cp .env.example .env      # fill in DATABASE_URL, JWT secrets, etc.
npm run prisma:generate
npm run dev               # starts the API on PORT (default 5000)
```

Verify the health endpoint:

```bash
curl http://localhost:5000/api/v1/health
# {"status":"ok","version":"2.0.0","service":"AssetFlow API"}
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL
npm run dev                  # starts Next.js on port 3000
```

## Environment Variables

### Backend (`backend/.env`)

| Variable             | Description                                  |
| -------------------- | -------------------------------------------- |
| `PORT`               | API port (default 5000)                      |
| `DATABASE_URL`       | Neon PostgreSQL connection string            |
| `JWT_SECRET`         | Access token signing secret                  |
| `JWT_REFRESH_SECRET` | Refresh token signing secret                 |
| `GROK_API_KEY`       | AI assistant API key                         |
| `RESEND_API_KEY`     | Email delivery API key                       |
| `CLOUDINARY_URL`     | Media storage connection URL                 |
| `CORS_ORIGIN`        | Allowed origin(s) for CORS                   |
| `LOG_LEVEL`          | Winston log level                            |
| `NODE_ENV`           | `development` \| `test` \| `production`      |

### Frontend (`frontend/.env.local`)

| Variable                | Description                          |
| ----------------------- | ------------------------------------ |
| `NEXT_PUBLIC_API_URL`   | Base URL of the AssetFlow API        |
| `NEXT_PUBLIC_APP_NAME`  | Application name (default AssetFlow) |
| `NEXT_PUBLIC_GROK_MODEL`| AI model identifier                  |

Never hardcode secrets. Use `.env` files (git-ignored) based on `.env.example`.

## Development Workflow

1. Create a feature branch.
2. Backend: `npm run lint`, `npm run typecheck`, `npm run build`.
3. Frontend: `npm run lint`, `npm run build`.
4. Commit using conventional commits (e.g. `feat(assets): ...`).
5. Open a pull request. CI runs lint + build for both apps.

## Specifications

Authoritative specs live under [.kiro/specs/assetflow-erp](./.kiro/specs/assetflow-erp).
