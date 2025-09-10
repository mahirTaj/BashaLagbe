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
1. Push latest changes to GitHub (`main` or deployment branch).
2. On Render, create Web Service pointing to the repo root.
3. Build Command: `npm run render-build`  (builds React + installs backend deps)
4. Start Command: `npm start` (launches Express which can also serve the built frontend)
5. Add env vars (see sections above) and click Deploy.
6. After first deploy validate:
  - GET `/` returns JSON with `ok: true`.
  - Visiting the base URL serves the React SPA.
  - Login / Register works (user redirected appropriately).
  - Admin login (use admin credentials) loads Admin Panel.
  - Image upload & viewing works (Cloudinary URLs visible in Network tab if configured).
  - No mixed-content warnings in browser console (all HTTPS).

## 10) Production checklist
| Area | Action | Status |
|------|--------|--------|
| Secrets | `JWT_SECRET` is long & random | ✅ |
| Database | `MONGO_URI` uses SRV string + user with least privileges | ☐ |
| Images | Cloudinary configured OR local `/uploads` tested | ☐ |
| CORS | Empty for single-service (preferred) | ✅ |
| Rate limiting | Enabled for `/api/auth` & `/api/admin` | ✅ |
| Logging | Morgan combined format in production | ✅ |
| Frontend build | Included in single service (`SERVE_FRONTEND=true`) | ✅ |
| Proxy trust | `TRUST_PROXY=true` set on Render | ☐ |
| Dev bypass | `DEV_ADMIN_BYPASS` disabled (false / unset) | ☐ |
| Node version | Engines field `>=18 <21` ensures compatible runtime | ✅ |

## 11) Environment variable reference
| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| MONGO_URI | Yes | mongodb+srv://user:pass@cluster/db | Must be set before start |
| JWT_SECRET | Yes | (64+ random chars) | Rotate if leaked |
| NODE_ENV | Yes | production | Enables prod CORS logic |
| SERVE_FRONTEND | Recommended | true | Serve React build from Express |
| TRUST_PROXY | Recommended | true | Needed for correct IP + secure cookies behind Render proxy |
| CORS_ALLOWED_ORIGINS | Conditional | https://app.example.com | Only if separate frontend |
| CLOUDINARY_URL | Optional | cloudinary://key:secret@cloud | Simplest Cloudinary config |
| CLOUDINARY_CLOUD_NAME | Optional | mycloud | Use with API_KEY/API_SECRET alternative |
| CLOUDINARY_API_KEY | Optional | 123456789 |  |
| CLOUDINARY_API_SECRET | Optional | abcdefghijkl |  |
| DEV_ADMIN_BYPASS | Dev only | false | Don’t enable in production |

## 12) Logs & troubleshooting on Render
Use the Render dashboard Logs tab:
* Startup: Ensure you see `MongoDB connected` then `Server running on port`.
* Health: Hitting base URL prints JSON. Non-200 indicates crash or mismatch of Start command.
* Crashes: Look for unhandled rejections (we log them). Common causes: bad `MONGO_URI`, missing env vars.

## 13) Scaling considerations
* Instance size: Start with Starter; upgrade if CPU-bound (image processing) or memory climbs.
* Horizontal scaling: For multiple instances you will need a shared / persistent storage or fully Cloudinary for media (avoid local `/uploads`).
* Database connection pool: Mongoose defaults are fine initially; monitor Atlas connection count when scaling workers.

## 14) Zero-downtime deploy tips
* Keep migrations (if any future schema changes) idempotent.
* Because frontend build is static, keep `render-build` script stable; big dependencies slow build.
* Avoid writing to local disk except `/uploads` in single-instance mode.

## 15) Local production simulation
You can simulate production locally before pushing:
```bash
set NODE_ENV=production
set SERVE_FRONTEND=true
set MONGO_URI=your_local_or_atlas_uri
set JWT_SECRET=some_long_secret
npm run render-build
npm start
```
Visit http://localhost:5000 and verify the SPA loads.

## 16) Cloudinary migration script (optional)
`backend/scripts/migrateToCloudinary.js` provides a starting point for moving legacy local assets. Implement real upload logic before enabling.

## 17) Security hardening (future)
* Add stricter `helmet` CSP once domains (Cloudinary, maps tiles) are finalized.
* Consider adding request body size reductions or per-route limits for large file uploads.
* Implement refresh tokens & short-lived access tokens for higher security (current setup is basic JWT).

---
Deployment guide complete. Use this as the authoritative source when configuring Render.
