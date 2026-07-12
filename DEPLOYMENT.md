# Deployment Guide

This repository is prepared for split deployment:

- backend: Odoo + AssetFlow module on Render
- frontend: Next.js shell on Vercel

## Backend on Render

Render Blueprint support is defined in [render.yaml](./render.yaml), which points to the backend source under [backend](./backend). Render documents that Blueprints are configured through a repo-root `render.yaml`, and that monorepos can scope a service with `rootDir` and Docker configuration. This repo uses a Docker web service plus a Render Postgres database. Source: Render Blueprint YAML Reference: https://render.com/docs/blueprint-spec

### What is included

- `render.yaml` for the web service and Postgres database
- `backend/deploy/render/Dockerfile`
- `backend/deploy/render/entrypoint.sh`
- `backend/deploy/render/odoo.conf`
- backend health endpoint at `/assetflow/health`

### Render setup

1. In Render, create a new Blueprint from this GitHub repository.
2. Confirm the generated `assetflow-backend` web service and `assetflow-postgres` database.
3. On first deploy, Render will build the Docker image and start Odoo with the `assetflow_erp` module initialized.
4. Use the public service URL as the frontend API base URL.

### Backend notes

- Persistent Odoo data is mounted at `/var/lib/odoo`.
- The backend reads `DATABASE_URL` from Render and converts it into Odoo DB arguments.
- The health check path is `/assetflow/health`.
- The Odoo module path is `backend/assetflow_erp`.

## Frontend on Vercel

The frontend is located in [frontend](./frontend). Vercel documents that project configuration can live in `vercel.json`, and framework/build settings can also be controlled through Project Settings. Source: Vercel project configuration docs: https://vercel.com/docs/project-configuration and https://vercel.com/docs/project-configuration/vercel-json

### What is included

- Next.js app in `frontend/`
- `frontend/vercel.json`
- backend URL environment variable support through `NEXT_PUBLIC_API_BASE_URL`

### Vercel setup

1. Create a new Vercel project from this repository.
2. Set the Root Directory to `frontend`.
3. Add environment variable `NEXT_PUBLIC_API_BASE_URL=https://<your-render-backend>`.
4. Deploy.

## Current architecture note

The backend still includes Odoo-native views because they are useful for admin workflows and fast hackathon delivery. The new `frontend/` app prepares the project for a separate Vercel-hosted user-facing frontend while the Render-hosted Odoo backend remains the source of truth.
