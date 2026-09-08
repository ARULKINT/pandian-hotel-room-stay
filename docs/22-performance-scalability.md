# 22. Performance & Scalability

## 22.1 Current Performance Characteristics

| Aspect | Current state |
|---|---|
| Backend compute | Single Express process, no clustering, no worker threads |
| Database queries | Full-table `SELECT` on every list/availability check (Postgres mode) or full in-memory array scan (JSON-file mode) — no pagination, no indexing beyond the primary key |
| Frontend bundle | No code-splitting; Vite bundles the whole SPA (11 page modules + shared utilities) into the initial load |
| Images | Served as static files with long-cache headers on Netlify (`/assets/*` cached `immutable` for a year); not run through any resizing/optimization pipeline, so file sizes are whatever the source photos were |
| Caching | No server-side response caching, no CDN in front of the API, no HTTP caching headers set on API responses |
| Database round-trips per request | Availability-aware endpoints (`/api/rooms`, `/api/availability`, booking creation) call `store.list()` once, then compute everything else in memory — not N+1 |

At the traffic scale this application targets — a single small hotel — none of the above are practical bottlenecks. They are named here so a future maintainer scaling this beyond one property understands exactly what would need to change first.

## 22.2 The CSS Architecture Bug (Resolved) — A Real Performance/Correctness Lesson

Worth documenting because it's a subtle, easy-to-reintroduce class of bug: the app's fixed header and bottom navigation were originally kept visually "pinned" using a `transform: translateZ(0)` trick on the `#app` container (a common technique to force a new stacking/containing context). This has a CSS-spec consequence that isn't obvious from the technique's usual purpose: **any ancestor with a `transform` becomes the containing block for its `position: fixed` descendants**, meaning those "fixed" elements now scroll along with `#app`'s own internal scroll — the opposite of the intended effect.

**Symptom observed**: the header and bottom nav visually drifted during scroll instead of staying pinned to the viewport.

**Fix**: removed the `transform` entirely; `#app` was returned to being a normal in-flow block, and the header/bottom-nav/sticky-bars were made genuinely `position: fixed` against the real viewport, each independently capped to `max-w-[428px]` and centered with `left-1/2 -translate-x-1/2` (so they align with the phone-frame column rather than spanning the full browser width). Verified with `getBoundingClientRect()` comparisons before/after a programmatic `window.scrollTo()` — confirmed the header's `top` position stayed at `0` while `window.scrollY` genuinely changed.

## 22.3 Explicit Non-Scalability: In-Memory Session & Rate-Limit State

`server.js` holds two `Map`s in process memory: `sessions` (staff bearer tokens) and `loginAttempts` (per-IP lockout tracking). This has one hard consequence that must be respected by anyone deploying this application:

> **This backend must run as exactly one instance / one process.** Running it behind a load balancer with multiple instances, or under a process manager configured to cluster it (e.g. PM2 in cluster mode), would non-deterministically log staff out (a session token issued by instance A is invalid on instance B) and make the login-attempt lockout inconsistent (attempts split across instances never reach the threshold on any single one).

This is why the archived VPS deployment path (`deploy/vps-alternative/`) is explicitly pinned to a single PM2 instance, and why Render's free web service (also single-instance by default) is a natural fit rather than a limitation for this specific application.

## 22.4 What Would Need to Change to Scale Beyond One Property / High Traffic

| Bottleneck at scale | Fix, if ever needed |
|---|---|
| In-memory sessions | Move to a shared store (Redis, or the same Postgres database) so any instance can validate any token |
| In-memory login-attempt tracking | Same — shared store, or move rate-limiting to a reverse proxy / API gateway |
| Full-table booking scans | Add indexes on `(roomId)` and a date range once the Postgres schema is asked to hold more than a single hotel's history; consider a proper relational `bookings` table instead of one JSONB blob per row if querying needs grow beyond "fetch everything, filter in application code" |
| Single Node process | Horizontal scaling becomes viable **only after** the two items above are addressed |
| No CDN in front of the API | Add one if read traffic (room/facility browsing) ever significantly outgrows a single Render instance |
| Cold starts on Render's free tier | Upgrade to a paid, always-on Render plan (or the VPS path) once idle-then-burst traffic patterns become a real user complaint |

## 22.5 Load Testing

No load testing has been performed on this application. Given the target scale (a single hotel's booking traffic — realistically dozens, not thousands, of requests per day), this has not been identified as a priority; it's named here as an honest gap rather than a completed-and-passing activity.
