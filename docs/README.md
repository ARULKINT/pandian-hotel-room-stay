# Pandian Hotel & Room Stay — Documentation

Complete technical and product documentation for the Pandian Hotel & Room Stay booking application: a South Indian moderate-hotel direct-booking web app (guest-facing SPA + a password-gated staff operations panel).

This documentation was produced by reading the actual source code, exercising the running application (both tiers, locally), and verifying every screen and API route described — not written speculatively. Where something is not implemented, that is stated explicitly rather than omitted.

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

### Configuration

| Variable | Required | Purpose |
|---|---|---|
| `ADMIN_PASSWORD` | Recommended | Staff sign-in password |
| `PORT` | No | Backend port (default 3000) |
| `CORS_ORIGIN` | Recommended in prod | Allowed frontend origin |
| `DATABASE_URL` | Recommended in prod | Postgres connection string |
| `VITE_API_BASE_URL` | Required in prod | Backend URL, baked in at frontend build time |

### Dependencies

| Package | Where | Purpose |
|---|---|---|
| express | backend | HTTP server/routing |
| cors | backend | Cross-origin control |
| pg | backend | Postgres driver |
| vite | frontend | Build/dev server |
| concurrently | root | Run both dev servers together |

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
