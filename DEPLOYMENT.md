# Deployment Guide

AssetFlow deploys as two independent applications:

- **backend** — Express + TypeScript API, backed by a PostgreSQL (Neon) database
- **frontend** — Next.js app

Concrete provider configuration (Docker, platform blueprints) is added in a
later prompt once the API surface is implemented. This document describes the
build and runtime contract.

## Backend

Build and run:

```bash
cd backend
npm install
npm run prisma:generate
npm run build
npm start          # runs dist/server.js
```

Required environment variables are documented in `backend/.env.example`. The
service exposes a health check at `GET /api/v1/health`.

## Frontend

Build and run:

```bash
cd frontend
npm install
npm run build
npm start
```

Set `NEXT_PUBLIC_API_URL` to the deployed backend base URL, for example
`https://assetflow-api.example.com/api/v1`.

## Database

PostgreSQL is provisioned on Neon. The connection string is supplied to the
backend through `DATABASE_URL`. Prisma manages the schema and migrations from
`backend/prisma/`.
