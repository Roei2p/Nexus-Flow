# Nexus-Flow — Base44 Development Guide

## Project Overview
Nexus-Flow is a Hebrew-language (RTL) autonomous automation platform. It has two independent tiers:
- **Frontend (port 3000):** Express server (`server.ts`) running via `tsx`, with Vite in middleware mode serving a React 19 + Tailwind 4 SPA. The Express server also provides all `/api/*` routes using **in-memory mock data** — it does NOT call the Python backend.
- **Backend (port 8000):** Python FastAPI app in `backend/` with PostgreSQL, SQLAlchemy async, and an n8n service client. This is a separate API (`/api/v1/*`) not used by the frontend.

## Running the App
```bash
docker compose -f docker-compose.base44.yml up -d
```
Services: `web` (port 3000), `backend` (port 8000), `postgres` (internal). n8n is intentionally excluded — the backend handles its absence gracefully.

## Key Setup Notes
- **npm install requires `--legacy-peer-deps`** due to an esbuild/vite peer dependency conflict. This is already configured in the compose command.
- **Backend requires `sqlalchemy[asyncio]`** (not plain `sqlalchemy`) for the greenlet dependency. Fixed in `backend/requirements.txt`.
- **No lockfile exists** — dependencies install from `package.json` / `requirements.txt` on each container start.
- **HMR is disabled** (`DISABLE_HMR=true`) to prevent flickering during agent edits. Use `reload_preview` after changes to see updates.
- The frontend's Gemini AI calls have built-in fallbacks — the app works without `GEMINI_API_KEY`, but AI-powered workflow generation degrades to static blueprints.

## Secrets
- `GEMINI_API_KEY` — Google Gemini API key (primary AI feature). Get from Google AI Studio. A development placeholder is generated; replace with a real key for AI features.
- `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `N8N_API_KEY` — optional, used only by the Python backend.

## Verification
- Frontend health: `curl http://localhost:3000/api/health`
- Backend health: `curl http://localhost:8000/healthz`
- The preview at port 3000 shows the full React SPA with the Nexus-Flow dashboard.
