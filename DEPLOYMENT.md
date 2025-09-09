# Deploying BashaLagbe to Render

This app is a monorepo with a React frontend and an Express/MongoDB backend. The backend can optionally serve the built frontend (recommended for Render single service).

## 1) Prerequisites
- A MongoDB connection string (MongoDB Atlas recommended).
- Cloudinary account (optional but recommended) for image hosting.
- A GitHub repo connected to Render.

## 2) Repo layout
- backend/server.js (Express API; can serve frontend build when `SERVE_FRONTEND=true`)
- frontend/ (React app; built with CRA to `frontend/build`)

## 3) Render service (Web Service)
- Create a new Web Service from this GitHub repo.
- Root directory: repository root (not `backend/`).
- Build Command:
  - `npm run render-build`
- Start Command:
  - `npm start`
- Instance: Use at least a Starter instance. Node 18+ runtime.

## 4) Environment Variables
Required
- `MONGO_URI` = your MongoDB connection string
- `JWT_SECRET` = a long random string
- `NODE_ENV` = `production`

Recommended
- `SERVE_FRONTEND` = `true` (backend will serve React build)
- `TRUST_PROXY` = `true` (Render is behind a proxy)
- `CORS_ALLOWED_ORIGINS` = leave empty if serving same origin; set only if you use separate frontend

Cloudinary (optional, for public image hosting)
- Either set one var:
  - `CLOUDINARY_URL` = `cloudinary://<api_key>:<api_secret>@<cloud_name>`
- Or set three vars:
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`

Dev-only (disable on production)
- `DEV_ADMIN_BYPASS` = `false`

## 5) Static files
- Local uploads are served from `/uploads`. In production, prefer Cloudinary.

## 6) Health check
- Render health check path: `/` returns JSON.

## 7) Separate frontend and backend (alternative)
If you prefer two Render services:
- Service A (backend)
  - Root: `backend`
  - Build: `npm ci`
  - Start: `npm start`
  - Env: same as above; set `SERVE_FRONTEND=false`
- Service B (static site for frontend)
  - Root: `frontend`
  - Build Command: `npm ci && npm run build`
  - Publish Directory: `build`
  - Set frontend env: `REACT_APP_API_BASE_URL` = Backend service URL

## 8) Notes
- Helmet is configured to allow cross-origin images when needed.
- Axios uses same-origin by default in production; no frontend API base needed when co-hosted.
- Admin-only routes are protected; use the same `/login` page for admins and users.

## 9) Deploy steps summary
1. Push latest changes to GitHub.
2. On Render, create Web Service pointing to this repo.
3. Configure Build: `npm run render-build`; Start: `npm start`.
4. Add environment variables listed above.
5. Deploy. After the first successful deploy, verify:
   - `/` returns service JSON
   - React app loads at the same domain
   - Login works; Admin Panel accessible for admin users
   - Images load (Cloudinary URLs preferred)
