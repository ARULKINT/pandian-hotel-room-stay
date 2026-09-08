# 18. Deployment Documentation

## 18.1 Environments

| Environment | Frontend | Backend | Database |
|---|---|---|---|
| **Local development** | Vite dev server, `http://localhost:5173` | `node server.js`, `http://localhost:3000` | `backend/data/bookings.json` (no `DATABASE_URL` needed) |
| **Production (free tier, current target)** | Netlify static hosting | Render free web service | Neon free Postgres (recommended) or the same JSON-file fallback (data at risk of loss on redeploy) |
| **Alternative: single VPS** | Same origin as backend, served by nginx | PM2-managed Node process | Either mode | — see `deploy/vps-alternative/` (archived, not the current recommended path) |

There is no separate staging environment configured; the deployment runbook treats "production" as the only non-local target.

## 18.2 Build Process

| Tier | Command | Output |
|---|---|---|
| Frontend | `vite build` (run from `frontend/`) | Static `dist/` — HTML, JS, CSS, and copied assets from `public/` |
| Backend | None — the backend ships as plain Node source; `npm ci --omit=dev` only installs production dependencies | No transpilation/bundling step; `node server.js` runs the source directly |

**A resolved historical bug worth noting**: image/logo paths were originally referenced as raw JS strings (`/src/assets/images/...`), which Vite's static-analysis-based asset pipeline never sees or copies (only `import` statements or HTML-attribute references are processed). This meant a production build shipped **zero images**. Fixed by moving all assets into `frontend/public/` (Vite's "serve as-is" convention) and updating all references to root-absolute paths (`/images/...`, `/logos/...`). Verified by inspecting the actual `dist/` output after rebuilding.

## 18.3 Environment Variables

| Variable | Tier | Required | Purpose |
|---|---|---|---|
| `ADMIN_PASSWORD` | Backend | Recommended (else a random one is generated per boot and logged) | Staff sign-in credential |
| `PORT` | Backend | No (defaults to 3000) | HTTP listen port |
| `CORS_ORIGIN` | Backend | Recommended in production | Restricts which frontend origin may call the API (`*` during initial bring-up, tightened afterward) |
| `DATABASE_URL` | Backend | Optional but recommended in production | Postgres connection string; switches `store.js` from the JSON-file fallback to durable storage |
| `VITE_API_BASE_URL` | Frontend (build-time) | Required in production | The backend's public URL, baked into the static bundle at build time (Vite env vars are compile-time, not runtime) |

`backend/.env.example` documents the backend variables with placeholder values; `backend/.env` (gitignored) holds real local values.

## 18.4 Deployment Architecture

See [03-system-architecture.md](03-system-architecture.md) §3.8 for the deployment diagram. In summary: GitHub push → Render auto-builds/deploys the backend, Netlify auto-builds/deploys the frontend, independently and in parallel; the two communicate only over public HTTPS.

## 18.5 Free-Tier Hosting: Deliberate Tradeoffs

| Tradeoff | Detail |
|---|---|
| **Cold starts** | Render's free web service spins down after ~15 minutes idle; the first request afterward takes 30–50 seconds while it wakes. Netlify's static hosting has no equivalent — the frontend is always instantly available. |
| **No persistent disk on Render's free plan** | This is *why* `store.js` supports Postgres as an alternative — without `DATABASE_URL` set, `bookings.json` on Render's filesystem is at risk of being reset on every redeploy. |
| **Neon also sleeps/auto-suspends** | Wakes on the next query with a cold-start delay of its own; acceptable for a demo/small hotel's traffic pattern. |
| **No cost** | The entire stack (Render + Netlify + Neon, all free tiers) runs at $0/month, which was an explicit, deliberate hosting requirement for this project, not a temporary placeholder. |

## 18.6 Deployment Order (Why It Matters)

The two services need each other's URLs to configure correctly, which forces a specific bring-up order — fully detailed in `deploy/README.md` (the canonical, step-by-step runbook; this section summarises it):

1. Create the Neon Postgres project → copy its connection string.
2. Deploy the backend to Render with `DATABASE_URL` set → note the resulting Render URL.
3. Deploy the frontend to Netlify with `VITE_API_BASE_URL` set to that Render URL.
4. Go back to Render and set `CORS_ORIGIN` to the now-known Netlify URL (tightening it from the initial `*`).
5. Verify: a fresh test booking survives a backend redeploy (proves Postgres, not the ephemeral disk, is actually in use).

## 18.7 SSL/TLS, Domains, CDN

- Both Render and Netlify provision HTTPS automatically on their `*.onrender.com` / `*.netlify.app` subdomains at no cost; a custom domain can be attached to either, also free.
- Netlify's static hosting inherently functions as a CDN for the frontend assets (immutable long-cache headers are set on `/assets/*` in `netlify.toml`; `index.html` itself is set `no-cache` so a new deploy is picked up immediately).
- No CDN sits in front of the backend API.

## 18.8 Rollback

Both Render and Netlify keep a history of previous deploys in their dashboards and support redeploying an older build with a few clicks — this is platform-native behaviour, not something implemented in this codebase. There is no application-level rollback tooling (e.g. no database migration-down scripts, since the Postgres schema is a single `CREATE TABLE IF NOT EXISTS`).

## 18.9 The Alternative VPS Path (Archived, Not Recommended by Default)

`deploy/vps-alternative/` retains a complete single-server deployment path (nginx reverse proxy + PM2 process manager + a `deploy.sh` pull-and-reload script) from before the hosting decision was revisited in favour of a free-tier split-hosting stack. It remains available and documented for a future point where the free tier's cold-start/sleep behaviour becomes a real problem and a small always-on VPS (~$5–7/month) is worth the cost — but it is not the currently deployed path.
