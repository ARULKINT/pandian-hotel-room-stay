# 23. Maintenance & Operations

## 23.1 Routine Maintenance Tasks

| Task | Frequency | How |
|---|---|---|
| Redeploy after a code change | Per change | `git push` to the default branch — both Render and Netlify auto-deploy (see [18-deployment.md](18-deployment.md)) |
| Rotate the staff password | As needed (e.g. staff turnover) | Update `ADMIN_PASSWORD` in the Render dashboard's environment variables → triggers a redeploy |
| Review/update room inventory or pricing | As needed | Edit `backend/data/rooms.json` directly and redeploy — there is no admin UI for this (see §23.5) |
| Review/update facilities or add-ons | As needed | Edit `backend/data/facilities.json` / `addons.json` and redeploy |
| Check for stuck/stale bookings | Periodic, manual | Review the "All" filter in the Operations panel |
| Dependency updates | As needed (no automated tooling configured) | `npm outdated` / `npm update` in `backend/` and `frontend/`, then verify locally before deploying |

## 23.2 Monitoring

There is no dedicated monitoring/alerting stack configured for this application. Available signals:

| Signal | Where to find it |
|---|---|
| Backend startup/runtime logs | Render dashboard → the service's Logs tab (also viewable locally in the terminal running `node server.js`) |
| Frontend build logs | Netlify dashboard → the site's Deploys tab |
| Database health/usage | Neon dashboard (connection count, storage used, compute hours against the free-tier limits) |
| Errors | `console.error` output only — no error-tracking service is integrated (see [16-integrations.md](16-integrations.md)) |

## 23.3 Backups

| Data | Backup status |
|---|---|
| Bookings (Postgres mode) | Whatever automatic backup/point-in-time-recovery Neon's free tier provides at the infrastructure level; the application itself performs no explicit backup/export |
| Bookings (JSON-file mode) | None — this mode is explicitly documented as at-risk on Render's free tier (no persistent disk); see [18-deployment.md](18-deployment.md) |
| Reference data (`rooms.json`, `facilities.json`, `addons.json`) | Versioned in git — the repository itself is the backup/history for this data |
| Source code | GitHub repository, with full commit history |

There is no scheduled export/dump job, and no disaster-recovery runbook beyond "redeploy from the last known-good commit."

## 23.4 Incident Response (Informal)

No formal incident-response process exists (appropriate for the current scale). A practical checklist for common failure modes:

1. **Site is down**: check Render's and Netlify's status/deploy logs first — most likely a failed deploy or a Render free-tier cold start being mistaken for downtime (wait ~50s and retry).
2. **Bookings are missing/reset**: check whether `DATABASE_URL` is actually set on Render (if not, a redeploy would have wiped the JSON-file fallback — see [18-deployment.md](18-deployment.md)).
3. **Staff can't sign in**: confirm `ADMIN_PASSWORD` on Render matches what's being entered; check for an active IP lockout (429 response, 15-minute window).
4. **CORS errors reported by users**: confirm `CORS_ORIGIN` on Render matches the exact live Netlify URL.

## 23.5 Known Manual/Operational Gaps (Named for Planning)

- **No admin UI for editing rooms/facilities/add-ons** — every catalogue change requires editing a JSON file and redeploying, which is a real friction point for actual day-to-day hotel operation (price changes, seasonal inventory adjustments) beyond a demo/initial-launch context. See [25-roadmap.md](25-roadmap.md).
- **No scheduled task/cron** exists anywhere in this codebase (e.g. nothing automatically flags no-shows or expires stale unconfirmed holds — though note there is no "hold" concept at all; every booking is immediately `CONFIRMED`).
- **No log retention policy** beyond whatever Render's free-tier log retention provides.
