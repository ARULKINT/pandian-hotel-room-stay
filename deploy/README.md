# Deploying for free — Render (backend) + Netlify (frontend)

No credit card required for either service at this scale. Total cost: $0.

The app splits across two free services because that's how the free tiers
work: Render runs your Node process, Netlify serves the built static site.
They talk to each other over the public internet (CORS_ORIGIN /
VITE_API_BASE_URL below), not a local proxy like a single-server VPS setup
would use.

Looking for the single-server / paid VPS version instead? See
`deploy/vps-alternative/README.md`.

---

## Before you start: bookings need a real database on Render's free tier

Render's free web-service plan has no persistent disk — anything written to
`backend/data/bookings.json` would be wiped on every redeploy. So the
backend now supports a second storage mode: set `DATABASE_URL` and it
stores bookings in Postgres instead ([backend/store.js](../backend/store.js)).
Leave `DATABASE_URL` unset locally and it keeps using the JSON file — no
database needed for local dev.

**Step 2 below has you create a free Neon Postgres database and wire it up**
— it takes about 3 minutes and there's no credit card involved. Room/
facility/add-on data (`rooms.json`, `facilities.json`, `addons.json`) is
fine as a plain file either way — it ships with the code and is never
written to at runtime.

---

## 1. Get the code on GitHub

Render and Netlify both deploy by connecting to a git repo.

```bash
# from the project root
git init
git add .
git commit -m "Initial commit"
```

Then either use the GitHub CLI (`gh repo create`) or create an empty repo
on github.com and follow its "push an existing repo" instructions.

## 2. Create a free Postgres database (Neon)

1. [neon.tech](https://neon.tech) → sign up free (GitHub login is easiest) → **Create a project**
2. On the project dashboard, copy the **Connection string** (starts with `postgresql://...`, includes `?sslmode=require`) — you'll paste this into Render in step 3.
3. That's it — no need to run any SQL yourself; the backend creates its `bookings` table automatically on first boot ([backend/store.js](../backend/store.js)).

(Supabase's free Postgres works the same way if you'd rather use that — same one connection-string env var either way.)

## 3. Deploy the backend to Render

1. [render.com](https://render.com) → sign up free (GitHub login is easiest) → **New +** → **Web Service**
2. Connect your GitHub repo
3. Render should detect `render.yaml` at the repo root and pre-fill everything. If not, set manually:
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm ci --omit=dev`
   - **Start Command**: `node server.js`
   - **Instance Type**: Free
4. Add environment variables (Render dashboard → Environment):
   - `ADMIN_PASSWORD` = a real password (not the local demo one)
   - `DATABASE_URL` = the Neon connection string from step 2.2
   - `CORS_ORIGIN` = leave as `*` for now — you'll come back and tighten this in step 5
5. Deploy. Once live, copy the URL Render gives you, e.g. `https://pandian-hotel-api.onrender.com`
6. Confirm it's up: `curl https://pandian-hotel-api.onrender.com/api/rooms` should return the 6 rooms as JSON. Check the deploy logs for the line `Bookings storage: Postgres (DATABASE_URL)` to confirm it picked up the database rather than falling back to the file.

**Free-tier cold start**: the first request after 15 minutes of inactivity takes 30-50 seconds while the service wakes up. Every request after that is normal speed until it idles out again. This is normal, not a bug — and bookings themselves are unaffected by it now that they live in Postgres.

## 4. Deploy the frontend to Netlify

1. [netlify.com](https://netlify.com) → sign up free → **Add new site** → **Import an existing project**
2. Connect the same GitHub repo. Netlify should detect `netlify.toml` and pre-fill Base directory / Build command / Publish directory. If not:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`
3. Add an environment variable (Site settings → Environment variables):
   - `VITE_API_BASE_URL` = the Render URL from step 3.5, e.g. `https://pandian-hotel-api.onrender.com`
4. Deploy. Netlify gives you a URL like `https://pandian-hotel.netlify.app` (you can rename this in site settings, or attach a real domain later, still free).

## 5. Lock CORS down to your real frontend URL

Go back to Render → your service → Environment → set:
```
CORS_ORIGIN=https://pandian-hotel.netlify.app
```
(your actual Netlify URL from step 3.4) → save, which triggers a redeploy.

Leaving `CORS_ORIGIN=*` "works" but means any website could call your API
from a visitor's browser — fine while testing, worth tightening once you
have the real frontend URL.

## 6. Verify

- [ ] `https://YOUR-SITE.netlify.app` loads, images load, rooms list populates
- [ ] Complete a full test booking end to end
- [ ] Redeploy the backend (e.g. push an empty commit) and confirm the test booking from above is still there — proves Postgres is actually wired up
- [ ] `https://YOUR-SITE.netlify.app/#/admin` shows the sign-in gate
- [ ] Sign in with the real `ADMIN_PASSWORD` you set in step 3.4
- [ ] From your own machine: `curl https://pandian-hotel-api.onrender.com/api/admin/summary` → `401` (confirms the gate holds over the real internet)

---

## Redeploying after a code change

Both services redeploy automatically on every `git push` to your default
branch — that's the entire workflow:

```bash
git add -A
git commit -m "..."
git push
```

Render rebuilds the backend; Netlify rebuilds the frontend. Nothing else to run.

## What "free" actually costs you here

| | Render free | Netlify free | Neon free |
|---|---|---|---|
| Price | $0 | $0 | $0 |
| Credit card | Not required | Not required | Not required |
| Sleeps when idle | Yes (~15 min) | No (static files, always on) | Auto-suspends, wakes on query (adds a similar cold-start delay) |
| Data persistence | N/A (stateless once DATABASE_URL is set) | N/A (no backend logic here) | Yes — this is what makes bookings durable |
| Custom domain + HTTPS | Free | Free | N/A |

If this ever needs to be always-warm with zero cold starts and real disk
persistence, the next step up is Render's paid tier (~$7/mo) or the VPS
path in `deploy/vps-alternative/` — not needed for a demo, worth knowing
it's there.
