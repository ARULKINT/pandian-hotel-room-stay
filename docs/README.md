# Pandian Hotel & Room Stay — Documentation

Complete technical and product documentation for the Pandian Hotel & Room Stay booking application: a South Indian moderate-hotel direct-booking web app (guest-facing SPA + a password-gated staff operations panel).

This documentation was produced by reading the actual source code, exercising the running application (both tiers, locally), and verifying every screen and API route described — not written speculatively. Where something is not implemented, that is stated explicitly rather than omitted.

## At a Glance

| | |
|---|---|
| **Project status** | Functionally complete for a single-property hotel; payment is simulated (not a real gateway) — see [24-known-issues.md](24-known-issues.md) |
| **Live deployment** | Frontend: `https://eloquent-blancmange-9d37ea.netlify.app` · Backend: `https://pandian-hotel-room-stay.onrender.com` · Repo: `github.com/ARULKINT/pandian-hotel-room-stay` |
| **Technology summary** | Vanilla JS SPA (Vite + Tailwind CDN) frontend; Express.js backend; Postgres (Neon) or local JSON-file bookings storage — see [04-technology-stack.md](04-technology-stack.md) |
| **Architecture summary** | Two independently-hosted tiers communicating over HTTPS/CORS — see the diagrams in [03-system-architecture.md](03-system-architecture.md) |
| **Important diagrams** | High-level architecture, request lifecycle, and auth flow: [03-system-architecture.md](03-system-architecture.md) · ER diagram: [10-database-documentation.md](10-database-documentation.md) · Workflows: [07-user-workflows.md](07-user-workflows.md) |
| **Last documentation update** | 2026-09-08 |

## How to Use This Documentation

| I am a... | Start here |
|---|---|
| **New developer** | [19-developer-setup.md](19-developer-setup.md) → [05-project-structure.md](05-project-structure.md) → [03-system-architecture.md](03-system-architecture.md) |
| **Tester / QA** | [17-testing.md](17-testing.md) → [15-error-handling.md](15-error-handling.md) → [09-api-documentation.md](09-api-documentation.md) |
| **Hotel administrator / front-desk staff** | [21-admin-manual.md](21-admin-manual.md) |
| **Guest / end user** | [20-user-manual.md](20-user-manual.md) |
| **Stakeholder / product owner** | [01-project-overview.md](01-project-overview.md) → [02-requirements.md](02-requirements.md) → [25-roadmap.md](25-roadmap.md) |
| **DevOps / deploying this app** | [18-deployment.md](18-deployment.md) (and the step-by-step runbook at `../deploy/README.md`) |
| **Security reviewer** | [14-authentication-security.md](14-authentication-security.md) → [24-known-issues.md](24-known-issues.md) |

## Table of Contents

1. [Project Overview](01-project-overview.md)
2. [Requirements](02-requirements.md)
3. [System Architecture](03-system-architecture.md)
4. [Technology Stack](04-technology-stack.md)
5. [Project Structure](05-project-structure.md)
6. [User Roles & Permissions](06-user-roles-permissions.md)
7. [User Workflows](07-user-workflows.md)
8. [UI / UX Documentation](08-ui-ux.md)
9. [API Documentation](09-api-documentation.md)
10. [Database Documentation](10-database-documentation.md)
11. [Business Logic](11-business-logic.md)
12. [Data Processing](12-data-processing.md)
13. [AI / ML](13-ai-ml.md)
14. [Authentication & Security](14-authentication-security.md)
15. [Error Handling](15-error-handling.md)
16. [External Integrations](16-integrations.md)
17. [Testing](17-testing.md)
18. [Deployment](18-deployment.md)
19. [Developer Setup](19-developer-setup.md)
20. [User Manual](20-user-manual.md)
21. [Administrator Manual](21-admin-manual.md)
22. [Performance & Scalability](22-performance-scalability.md)
23. [Maintenance](23-maintenance.md)
24. [Known Issues & Technical Debt](24-known-issues.md)
25. [Roadmap](25-roadmap.md)
26. [FAQ](26-faq.md)
27. [Glossary](27-glossary.md)

## Quick Reference Tables

### Features

| Feature | Description | Status | Location |
|---|---|---|---|
| Room browsing & filtering | AC/Non-AC filter, sort by price/rating | Implemented | `Rooms.js` |
| Live availability | Per-date, per-room unit counting | Implemented | `server.js`, `Availability.js` |
| Room comparison | 2–3 rooms side by side | Implemented | `Compare.js` |
| Add-ons | 5 optional paid extras | Implemented | `Checkout.js` |
| Server-side pricing / GST | Single pricing function, real Indian GST slabs | Implemented | `buildQuote()` |
| Booking creation | With a race-condition-safe availability re-check | Implemented | `POST /api/bookings` |
| Guest self-service | Lookup by email, self-cancel | Implemented | `Dashboard.js` |
| Staff operations panel | Occupancy dashboard, booking register, status actions | Implemented | `Admin.js` |
| Staff authentication | scrypt + timing-safe compare, bearer tokens, brute-force lockout | Implemented | `server.js` |
| Real payment processing | — | **Not implemented** | see [24-known-issues.md](24-known-issues.md) |
| Email/SMS notifications | — | **Not implemented** | see [24-known-issues.md](24-known-issues.md) |
| Guest accounts/login | — | **Not implemented** (by design) | see [01-project-overview.md](01-project-overview.md) |
| AI/ML functionality | — | **Not implemented** | see [13-ai-ml.md](13-ai-ml.md) |

### Pages

| Page | Route | Purpose | Access |
|---|---|---|---|
| Home | `#/home` | Landing, quick search | Public |
| Availability | `#/availability` | Date/guest search | Public |
| Rooms | `#/rooms` | Full catalogue | Public |
| Room Details | `#/room-details/:id` | Full room info | Public |
| Compare | `#/compare` | Side-by-side comparison | Public |
| Checkout | `#/checkout/:id` | Add-ons + guest details | Public |
| Payment | `#/payment/:id` | Payment method + confirm | Public |
| Confirmation | `#/confirmation/:id` | Receipt | Public |
| Dashboard (My Stays) | `#/dashboard` | Self-service lookup/cancel | Public (email-scoped) |
| Facilities | `#/facilities` | Hotel amenities | Public |
| Admin (Operations) | `#/admin` | Staff dashboard | Staff only |

### APIs (see [09-api-documentation.md](09-api-documentation.md) for full detail)

| Method | Endpoint | Auth |
|---|---|---|
| GET | `/api/rooms`, `/api/rooms/:id` | No |
| GET | `/api/facilities`, `/api/facilities/:id`, `/api/addons` | No |
| GET | `/api/availability` | No |
| POST | `/api/quote` | No |
| POST | `/api/bookings` | No |
| GET | `/api/bookings` | Conditional (staff, unless `?email=`) |
| GET | `/api/bookings/:id` | No |
| PATCH | `/api/bookings/:id` | Conditional (staff, unless cancelling) |
| GET | `/api/admin/summary`, `/api/admin/session` | Yes |
| POST | `/api/admin/login` | No |
| POST | `/api/admin/logout` | Yes |

### Database

| Store | Type | Primary key | Notes |
|---|---|---|---|
| `rooms.json` | Static file | `id` | 6 rooms, 46 total physical units |
| `facilities.json` | Static file | `id` | 6 facilities |
| `addons.json` | Static file | `id` | 5 add-ons |
| `bookings` | Postgres `JSONB` table **or** `bookings.json` file | `id` | Mode selected by `DATABASE_URL` presence |

### Components

| Component | Purpose | Location |
|---|---|---|
| `header()` | Fixed top bar — logo/title, back button, account link | `frontend/src/components/layout.js` |
| `bottomNav()` | Fixed 4-tab bottom navigation | `frontend/src/components/layout.js` |
| `emptyState()` / `loading()` | Shared empty/loading placeholders used on every async page | `frontend/src/components/layout.js` |
| `toastMarkup()` / `showToast()` | Single reusable toast notification | `frontend/src/components/layout.js` |
| `roomCard()` / `mountRoomCards()` | Shared room-card markup + event wiring | `frontend/src/components/roomCard.js` |
| `steps()` | 3-step Checkout/Payment progress indicator | `frontend/src/pages/Checkout.js` (exported, reused by `Payment.js`) |
| `store.js` | Bookings persistence abstraction (Postgres or JSON file) | `backend/store.js` |
| `requireAdmin` middleware | Server-side auth gate for staff-only routes | `backend/server.js` |
| `buildQuote()` | Single pricing function (room + add-ons + GST + discount) | `backend/server.js` |

### Configuration

| Variable | Purpose | Required | Sensitive |
|---|---|---|---|
| `ADMIN_PASSWORD` | Staff sign-in password | Recommended (else a random one is generated per boot) | Yes |
| `PORT` | Backend listen port | No (defaults to 3000) | No |
| `CORS_ORIGIN` | Allowed frontend origin | Recommended in production | No |
| `DATABASE_URL` | Postgres connection string | Recommended in production | Yes |
| `VITE_API_BASE_URL` | Backend URL, baked into the frontend at build time | Required in production | No |

### Dependencies

| Package | Version | Purpose |
|---|---|---|
| express | ^5.2.1 | HTTP server/routing (backend) |
| cors | ^2.8.6 | Cross-origin control (backend) |
| pg | ^8.13.1 | Postgres driver (backend) |
| vite | ^5.0.0 | Build/dev server (frontend) |
| concurrently | ^8.2.2 | Runs both dev servers together (root) |

### Integrations

| Service | Purpose | Data Exchanged |
|---|---|---|
| Neon (Postgres) | Durable bookings storage | Full booking documents (JSONB) over a TLS connection string |
| Render | Hosts the backend process | Full source deploy on every push |
| Netlify | Hosts the built frontend | Built `dist/` output on every push |
| GitHub | Source of truth, deploy trigger | Full repository contents |
| Google Fonts / Tailwind CDN | Typography, icons, CSS framework | Font files and CSS, loaded client-side |

No payment gateway, email/SMS provider, analytics, or AI/ML service is integrated — see [16-integrations.md](16-integrations.md) §16.5.

### Test Coverage

| Area | Existing Tests | Gaps |
|---|---|---|
| Backend API / business logic | None | Pricing/GST, availability overlap, auth ordering, race-condition handling — all untested (see [17-testing.md](17-testing.md) for the recommended backlog) |
| Frontend UI / state | None | Draft sanitisation, compare-list cap, guard states — all untested |
| End-to-end booking flow | None | Full journey (browse → book → cancel) — untested |
| Manual verification | Performed during development and this documentation pass | Not repeatable/automated |

## Documentation Completeness Audit

| Area | Inspected | Documented | Complete | Missing Information |
|---|---|---|---|---|
| Frontend source (all 11 pages + shared modules) | ✅ | ✅ | ✅ | None |
| Backend source (`server.js`, `store.js`) | ✅ | ✅ | ✅ | None |
| Reference data files | ✅ | ✅ | ✅ | None |
| Deployment configuration (`render.yaml`, `netlify.toml`, `deploy/`) | ✅ | ✅ | ✅ | None |
| Live application UI (all screens) | ✅ (loaded and interacted with in a live browser) | ✅ | ✅ (described in structured tables; no raster screenshot files embedded — see [08-ui-ux.md](08-ui-ux.md) §8.1) | Static image assets, if needed for a slide deck |
| Automated tests | ✅ (confirmed none exist) | ✅ | ✅ | N/A — accurately reported as absent |
| Git/deployment history context | Partial (session-scoped) | ✅ (where relevant, e.g. the CSS bug, the auth-ordering fix) | Partial | Full commit-by-commit history beyond what's directly relevant to explaining current behaviour |

### Fully Verified
Every API route's validation logic, the pricing formula, the availability algorithm, the authentication/session mechanism, the full page inventory and their `render()`/`mount()` behaviour, the persistence-layer dual-mode design, and the deployment configuration files — all confirmed by direct source inspection and, for the UI, live interaction with the running application.

### Partially Verified
The exact behaviour of Neon's/Render's free-tier infrastructure-level backup and auto-suspend mechanics is described based on the platforms' documented behaviour and this project's deployment runbook, not independently load-tested against real production traffic.

### Not Found
A payment gateway integration, an email/SMS dispatch mechanism, an admin UI for catalogue editing, and any automated test suite — all confirmed absent, not merely undocumented (see [24-known-issues.md](24-known-issues.md)).

### Potential Risks
See [24-known-issues.md](24-known-issues.md) §24.1–24.2 (Critical/High) for the full list — the two most consequential are the absence of real payment processing and the conditional risk of booking-data loss when `DATABASE_URL` is not configured in production.

### Recommended Next Steps
See [25-roadmap.md](25-roadmap.md) §25.1 (Immediate).
