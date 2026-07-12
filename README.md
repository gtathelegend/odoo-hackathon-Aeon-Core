# AssetFlow

AssetFlow is an enterprise asset and shared-resource management system. It
covers the complete journey of an asset from registration to disposal with
role-based access, allocation and booking workflows, maintenance, audits, and
analytics.

This repository holds the production-grade foundation. Business modules are
built incrementally by subsequent prompts and plug into the API architecture
established here.

## Architecture

AssetFlow is a split application:

- **Frontend** — Next.js (App Router) + TypeScript + Tailwind
- **Backend** — Express + TypeScript REST API (`/api/v1`)
- **Database** — PostgreSQL (Neon serverless) via Prisma
- **Realtime** — Socket.IO (notifications, dashboard, activity namespaces)
- **API Docs** — Swagger UI at `/api/docs`

```
assetflow/
  frontend/     Next.js app (UI, services, stores, types)
  backend/      Express + TypeScript API (Clean Architecture)
  database/     Database documentation (schema lives in backend/prisma)
  docs/         Product and technical documentation
  scripts/      Automation and developer scripts
  .github/      CI workflows
```

## Backend Folder Structure

```
backend/src/
  app.ts              Express app factory (middleware, routes, docs)
  server.ts           Bootstrap + graceful shutdown

  config/             Typed configuration + Prisma client + logger + swagger
  constants/          http / messages / roles / permissions / status / routes
  controllers/        Thin HTTP handlers (delegate to services)
  services/           Business logic (orchestrates repositories)
  repositories/       Data access (only layer allowed to touch Prisma)
  routes/             Versioned routers (/api/v1)
  middleware/         requestId, logger, error, notFound, cors, auth, rateLimiter, upload, validate
  validators/         Zod schemas (common + per-feature folders)
  models/             Prisma-derived domain model re-exports
  interfaces/         ApiResponse, Pagination, RequestUser, Repository, Service
  types/              Shared TypeScript types
  utils/              response, errors, pagination, asyncHandler, crypto, uuid, jwt, date, env, logger
  socket/             Socket.IO server + namespaces (notifications, dashboard, activity)
  jobs/               Scheduler + worker placeholders
  docs/               API documentation notes
prisma/               schema.prisma + migrations + seed.ts
tests/                unit/ + integration/
uploads/              File upload target (with uploads/temp for staging)
logs/                 error.log + combined.log
```

## Request Flow

```
Request → Route → Controller → Service → Repository → Prisma → PostgreSQL
```

- Controllers never touch Prisma.
- Repositories never import controllers or services.
- Utilities are shared across layers.

## Response Envelope

**Success**

```json
{ "success": true, "message": "…", "data": { … }, "meta": { … } }
```

**Failure**

```json
{ "success": false, "message": "…", "error": { … }, "code": "VALIDATION_ERROR" }
```

## Error Handling

All errors extend `BaseError` (`utils/errors.ts`):

- `ValidationError` → 400
- `AuthenticationError` → 401
- `AuthorizationError` → 403
- `NotFoundError` → 404
- `ConflictError` → 409
- `TooManyRequestsError` → 429
- `DatabaseError` / `InternalServerError` → 500
- `NotImplementedError` → 501

The global error handler maps everything (including ZodError) into the
standardized failure envelope and logs unexpected failures with the request id.

## Logging

Winston with two file transports plus a colorized console transport outside
production:

- `logs/error.log` — errors only
- `logs/combined.log` — all levels
- Morgan pipes HTTP access logs into Winston

## Swagger / OpenAPI

- UI: [http://localhost:5000/api/docs](http://localhost:5000/api/docs)
- Raw spec: [http://localhost:5000/api/docs.json](http://localhost:5000/api/docs.json)

The spec is generated at boot from `@openapi` JSDoc blocks in
`src/routes/**/*.ts` and `src/controllers/**/*.ts`.

## Health Endpoints

| Endpoint             | Purpose                                                |
| -------------------- | ------------------------------------------------------ |
| `GET /api/v1/health` | Liveness + readiness (database, uptime, memory)        |
| `GET /api/v1/version`| Service, API and Node runtime version                  |
| `GET /api/v1/status` | Extended runtime status                                |

## Tech Stack

- Node.js + Express + TypeScript (strict)
- Prisma ORM + PostgreSQL (Neon)
- Zod, Helmet, CORS, Compression, cookie-parser, express-rate-limit
- Morgan, Winston
- Socket.IO
- Swagger UI + swagger-jsdoc
- bcrypt, jsonwebtoken, multer
- Vitest + Supertest
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

Verify:

```bash
curl http://localhost:5000/api/v1/health
curl http://localhost:5000/api/v1/version
curl http://localhost:5000/api/v1/status
```

Run the test suite:

```bash
npm test
npm run test:coverage
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

| Variable                | Description                                     |
| ----------------------- | ----------------------------------------------- |
| `NODE_ENV`              | `development` \| `test` \| `production`         |
| `PORT`                  | API port (default 5000)                         |
| `API_PREFIX`            | API path prefix (default `/api`)                |
| `DATABASE_URL`          | Neon PostgreSQL pooled connection               |
| `DIRECT_URL`            | Neon direct connection (Prisma migrations)      |
| `JWT_SECRET`            | Access token signing secret                     |
| `JWT_REFRESH_SECRET`    | Refresh token signing secret                    |
| `JWT_ACCESS_TTL`        | Access token TTL (default 15m)                  |
| `JWT_REFRESH_TTL`       | Refresh token TTL (default 7d)                  |
| `COOKIE_SECRET`         | Signed-cookie secret                            |
| `CORS_ORIGIN`           | Comma-separated allowed origins (or `*`)        |
| `CORS_CREDENTIALS`      | Allow credentials on CORS (default `true`)      |
| `RATE_LIMIT_WINDOW_MS`  | Rate limit window in ms (default 60000)         |
| `RATE_LIMIT_MAX`        | Max requests per window (default 100)           |
| `BODY_LIMIT`            | Request body size limit (default 10mb)          |
| `LOG_LEVEL`             | Winston log level                               |
| `UPLOAD_DIR`            | Upload target (default `uploads`)               |
| `UPLOAD_TEMP_DIR`       | Temp upload staging (default `uploads/temp`)   |
| `UPLOAD_MAX_SIZE`       | Max upload size in bytes                        |
| `GROK_API_KEY`          | AI assistant API key (later prompts)            |
| `RESEND_API_KEY`        | Email delivery API key (later prompts)          |
| `CLOUDINARY_URL`        | Media storage URL (later prompts)               |

### Frontend (`frontend/.env.local`)

| Variable                | Description                          |
| ----------------------- | ------------------------------------ |
| `NEXT_PUBLIC_API_URL`   | Base URL of the AssetFlow API        |
| `NEXT_PUBLIC_APP_NAME`  | Application name (default AssetFlow) |
| `NEXT_PUBLIC_GROK_MODEL`| AI model identifier                  |

Never hardcode secrets. Use `.env` files (git-ignored) based on `.env.example`.

## Development Workflow

1. Create a feature branch.
2. Backend: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
3. Frontend: `npm run lint`, `npm run build`.
4. Commit using conventional commits (e.g. `feat(assets): …`).
5. Open a pull request. CI runs lint + build for both apps.

## Specifications

Authoritative specs live under [.kiro/specs/assetflow-erp](./.kiro/specs/assetflow-erp).
