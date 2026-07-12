# AssetFlow Frontend

Next.js + TypeScript + Tailwind frontend for AssetFlow.

## Environment

Copy `.env.example` to `.env.local` and set:

- `NEXT_PUBLIC_API_URL` - base URL of the AssetFlow Express API (e.g. `http://localhost:5000/api/v1`)
- `NEXT_PUBLIC_APP_NAME` - application name (defaults to `AssetFlow`)
- `NEXT_PUBLIC_GROK_MODEL` - AI model identifier used by the assistant feature

## Structure

```
app/         Next.js routes (compose components only)
components/   Shared UI components
features/     Feature-scoped components and logic
hooks/        Reusable React hooks
services/     API service layer (grouped by domain)
store/        Zustand stores
types/        Shared TypeScript types
lib/          API client and low-level utilities
styles/       Global and shared styles
constants/    App-wide constants
utils/        Helper functions
```

## Local run

```bash
npm install
npm run dev
```
