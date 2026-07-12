# Deployment Guide

AssetFlow deploys as two independent applications:

- **Backend** — Express + TypeScript API on Render
- **Frontend** — Next.js app on Vercel
- **Database** — PostgreSQL on Neon

## Quick Start (Docker)

```bash
# Copy environment template
cp backend/.env.example .env

# Edit .env with your credentials, then:
docker-compose up --build
```

The backend will be available at `http://localhost:5000` and the frontend at `http://localhost:3000`.

## Backend (Render)

### Automatic Deploy

1. Connect your GitHub repo to Render
2. The `render.yaml` at the project root defines the service blueprint
3. Click "New Blueprint Instance" on Render dashboard

### Manual Deploy

```bash
cd backend
npm ci
npx prisma generate
npm run build
npx prisma migrate deploy
npm start
```

### Required Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Access token signing key | Yes |
| `JWT_REFRESH_SECRET` | Refresh token signing key | Yes |
| `COOKIE_SECRET` | Cookie signing key | Yes |
| `CORS_ORIGIN` | Frontend URL (comma-separated) | Yes |
| `GROK_API_KEY` | xAI Grok API key for AI features | No |
| `NODE_ENV` | `production` | Yes |
| `PORT` | Server port (default: 5000) | No |

### Health Check

The backend exposes `GET /api/v1/health` which returns database connectivity, uptime, and memory usage. Use this for load balancer and orchestrator health probes.

### API Documentation

Swagger UI is available at `/api/docs` in non-production environments. The OpenAPI JSON spec is at `/api/docs.json`.

## Frontend (Vercel)

### Automatic Deploy

1. Import the repo on Vercel
2. Set root directory to `frontend`
3. Set `NEXT_PUBLIC_API_URL` environment variable

### Manual Deploy

```bash
cd frontend
npm ci
npm run build
npm start
```

### Required Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL (e.g., `https://api.example.com/api/v1`) |

## Database (Neon)

1. Create a project on [Neon](https://neon.tech)
2. Copy the connection string to `DATABASE_URL`
3. Run migrations: `cd backend && npx prisma migrate deploy`
4. Seed initial data: `cd backend && npm run prisma:seed`

## Docker

### Backend Only

```bash
cd backend
docker build -t assetflow-api .
docker run -p 5000:5000 --env-file .env assetflow-api
```

### Frontend Only

```bash
cd frontend
docker build -t assetflow-web --build-arg NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1 .
docker run -p 3000:3000 assetflow-web
```

### Full Stack

```bash
docker-compose up --build
```

## Production Checklist

- [ ] Set strong, unique values for JWT_SECRET, JWT_REFRESH_SECRET, COOKIE_SECRET
- [ ] Set CORS_ORIGIN to exact frontend domain (not `*`)
- [ ] Set NODE_ENV=production
- [ ] Run `npx prisma migrate deploy` before starting
- [ ] Configure GROK_API_KEY for AI features
- [ ] Set up monitoring on the /health endpoint
- [ ] Configure a CDN for static frontend assets (Vercel handles this)
- [ ] Enable Neon connection pooling for production workloads
