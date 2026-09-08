# 19. Installation & Developer Setup

## 19.1 Prerequisites

| Requirement | Version | Why |
|---|---|---|
| Node.js | 20.6 or later | Backend uses `process.loadEnvFile()`, added in Node 20.6 |
| npm | Bundled with Node | Package management for both tiers |
| A modern browser | Any recent Chrome/Firefox/Edge/Safari | No polyfills are shipped — the frontend uses native ES modules and modern fetch/clipboard/share APIs |
| (Optional) A Postgres database | Any (Neon/Supabase/local) | Only needed to exercise the Postgres persistence path locally; not required for basic development |

No Docker, no database server, and no build toolchain beyond Vite/npm is required for local development.

## 19.2 Repository Setup

```bash
git clone https://github.com/ARULKINT/pandian-hotel-room-stay.git
cd pandian-hotel-room-stay
```

## 19.3 Dependency Installation

```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install

# Root (optional — only needed for the combined `npm run dev`)
cd .. && npm install
```

## 19.4 Environment Configuration

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```dotenv
ADMIN_PASSWORD=choose-your-own-local-password
PORT=3000
CORS_ORIGIN=http://localhost:5173
# DATABASE_URL=postgresql://...   # optional — leave commented out to use the JSON-file fallback
```

If `ADMIN_PASSWORD` is left unset, the backend generates and prints a random one on every boot — check the terminal output.

No `.env` file is required on the frontend for local development; `VITE_API_BASE_URL` defaults to `http://localhost:3000` when unset.

## 19.5 Database Setup (Optional)

Not required for local development. If you want to exercise the Postgres code path locally:
1. Create a free Postgres database (Neon, Supabase, or a local instance).
2. Set `DATABASE_URL` in `backend/.env` to its connection string.
3. No migration step is needed — `store.js` creates the `bookings` table automatically on first boot (`CREATE TABLE IF NOT EXISTS`).

## 19.6 Running Locally

**Option A — both tiers at once (from the repo root):**
```bash
npm run dev
```
This runs `concurrently` over `dev:backend` (`node server.js`) and `dev:frontend` (`vite`, from `frontend/`).

**Option B — each tier separately (two terminals):**
```bash
# Terminal 1
cd backend && node server.js

# Terminal 2
cd frontend && npm run dev
```

Once running:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000` (verify with `curl http://localhost:3000/api/rooms`)
- Staff panel: `http://localhost:5173/#/admin`, using the `ADMIN_PASSWORD` from `backend/.env`

## 19.7 Verifying the Setup

```bash
# Confirm the backend booted and picked the expected storage mode
# (look for one of these two lines in the backend terminal):
#   Bookings storage: local file (backend/data/bookings.json)
#   Bookings storage: Postgres (DATABASE_URL)

curl http://localhost:3000/api/rooms          # should return 6 rooms as JSON
curl http://localhost:3000/api/facilities     # should return 6 facilities
```

Then open `http://localhost:5173/#/home` in a browser and confirm the hero image and room previews render — a broken image here usually means a `frontend/public/` asset path issue (see [18-deployment.md](18-deployment.md) §18.2 for the historical bug this class of issue caused).

## 19.8 Building for Production

```bash
cd frontend && npm run build      # outputs frontend/dist/
npm run preview                    # optional — serves dist/ locally to sanity-check the production build
```

The backend has no build step; it runs `server.js` directly via `node`.

## 19.9 Debugging Tips

| Symptom | Likely cause | Check |
|---|---|---|
| "Cannot reach the server" toast on every page | Backend not running, or `VITE_API_BASE_URL` pointing at the wrong origin | Confirm the backend terminal shows "Backend server running on…"; check `frontend/.env` if one exists |
| Admin login always fails | `ADMIN_PASSWORD` in `backend/.env` doesn't match what you're typing, or the backend restarted with a freshly-generated random password | Check the backend's boot log for the generated-password box |
| Images missing after a production build | Asset referenced as a raw string path rather than under `frontend/public/` | See [18-deployment.md](18-deployment.md) §18.2 |
| "Bookings storage: local file" in production | `DATABASE_URL` not set on Render | See [18-deployment.md](18-deployment.md) §18.5–18.6 |
| CORS error in the browser console | `CORS_ORIGIN` on the backend doesn't match the frontend's actual origin | Update the env var and redeploy/restart the backend |

## 19.10 Code Style

No linter or formatter (ESLint/Prettier) is configured in this repository. Code style consistency is maintained manually, following the existing patterns visible in `backend/server.js` and the `frontend/src/pages/*.js` modules (e.g. the `render()`/`mount()` convention — see [05-project-structure.md](05-project-structure.md)).
