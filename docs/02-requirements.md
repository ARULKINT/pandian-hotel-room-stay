# 2. Requirements

## 2.1 Functional Requirements

Requirements below were extracted directly from the implemented routes, page modules, and validation logic — not written speculatively.

| ID | Requirement | Description | Priority | Status | Related Feature |
|---|---|---|---|---|---|
| FR-01 | Browse rooms | List all rooms with type/AC filter and sort (recommended, price, rating) | Must | Implemented | `Rooms.js`, `GET /api/rooms` |
| FR-02 | View room detail | Photo gallery, amenities, description, live availability, price, cancellation/house-rule policies | Must | Implemented | `RoomDetails.js`, `GET /api/rooms/:id` |
| FR-03 | Check date-range availability | Given check-in/out + guest count, return per-room available units | Must | Implemented | `Availability.js`, `GET /api/availability` |
| FR-04 | Compare rooms | Select 2–3 rooms, view a side-by-side attribute/amenity/price table | Should | Implemented | `Compare.js` |
| FR-05 | Persist an in-progress booking | Dates, guests, room, add-ons, and contact details survive navigation | Must | Implemented | `state.js` (`sessionStorage`) |
| FR-06 | Select optional add-ons | Pickup, massage, welcome snack, breakfast, extra mattress; per-stay or per-night pricing | Should | Implemented | `Checkout.js`, `GET /api/addons` |
| FR-07 | Get a live price quote | Server-computed itemised total (room, add-ons, discount, GST, grand total) before payment | Must | Implemented | `POST /api/quote` |
| FR-08 | Enter guest details | Name, email, phone (validated), optional special requests | Must | Implemented | `Checkout.js` |
| FR-09 | Choose a payment method | UPI / Card / Pay-at-Hotel — informational only, no real transaction | Must | Implemented (simulated) | `Payment.js` |
| FR-10 | Create a booking | Server re-validates availability at the moment of booking (race-condition guard), then persists | Must | Implemented | `POST /api/bookings` |
| FR-11 | View booking confirmation | Booking ID, dates, itemised bill, arrival checklist | Must | Implemented | `Confirmation.js` |
| FR-12 | Look up bookings by email | No login required — matches by `guestEmail` | Must | Implemented | `Dashboard.js`, `GET /api/bookings?email=` |
| FR-13 | Self-cancel a booking | Guest can cancel their own `CONFIRMED` booking without authentication | Must | Implemented | `PATCH /api/bookings/:id` (status `CANCELLED`) |
| FR-14 | Browse hotel facilities | Accordion list with timings, location, highlights | Should | Implemented | `Facilities.js`, `GET /api/facilities` |
| FR-15 | Staff sign-in | Password-gated access to the operations panel | Must | Implemented | `Admin.js`, `POST /api/admin/login` |
| FR-16 | View live occupancy dashboard | Occupancy %, arrivals/departures today, revenue, per-room occupancy | Must | Implemented | `GET /api/admin/summary` |
| FR-17 | Manage the booking register | Filter by status/arrivals/in-house; check in, check out, cancel, reinstate any booking | Must | Implemented | `PATCH /api/bookings/:id` (staff-authenticated) |
| FR-18 | Staff sign-out | Invalidate the current session token server-side | Must | Implemented | `POST /api/admin/logout` |
| FR-19 | Persist bookings across restarts | Bookings survive a server restart/redeploy | Must | Implemented (mode-dependent — see NFR-08) | `backend/store.js` |

## 2.2 Non-Functional Requirements

| Category | Requirement | Status | Notes |
|---|---|---|---|
| **Security** | Guest PII and revenue data require server-verified staff authentication | Implemented | scrypt password hash, timing-safe comparison, random session tokens (see [14](14-authentication-security.md)) |
| **Security** | Brute-force protection on staff login | Implemented | 5 attempts / 15-minute IP lockout |
| **Security** | No enumeration of booking IDs via auth-vs-404 timing/response differences | Implemented | Auth check runs before the booking lookup on `PATCH /api/bookings/:id` |
| **Data integrity** | Client-supplied prices are never trusted | Implemented | All totals are recomputed server-side from `rooms.json`/`addons.json` at quote and booking time |
| **Data integrity** | Stored client state cannot corrupt the app | Implemented | `sanitise()` in `state.js` validates every field read from `sessionStorage` |
| **Reliability** | Booking creation re-checks availability immediately before persisting | Implemented | Closes the window between "search" and "book" |
| **Usability** | Mobile-first, single-column layout | Implemented | Hard-capped at 428px width via CSS, centered on wider viewports |
| **Usability** | Every async view has a loading, empty, and error state | Implemented | `loading()` / `emptyState()` helpers used consistently across all page modules |
| **Availability** | Runs at zero cost | Implemented | Render + Netlify + Neon free tiers |
| **Availability** | No cold-start guarantee | Accepted limitation | Render's free web service sleeps after ~15 min idle; first request after that takes 30–50s |
| **Persistence** | NFR-08: Booking data must survive a redeploy | Conditional | True only when `DATABASE_URL` (Postgres) is configured; the JSON-file fallback used for local development does **not** survive a Render redeploy (no persistent disk on the free plan) |
| **Portability** | Frontend/backend origins are independently configurable | Implemented | `VITE_API_BASE_URL` (build-time) / `CORS_ORIGIN` (runtime) |
| **Maintainability** | Single source of truth for pricing logic | Implemented | `buildQuote()` used by both the quote and booking endpoints |
| **Accessibility** | Not formally audited | Not verified | Semantic buttons/links, `aria-label`s on icon-only controls, and `aria-current`/`aria-expanded` are used in places, but no WCAG audit has been performed — see [24-known-issues.md](24-known-issues.md) |
| **Scalability** | Single Node process, in-memory session/rate-limit state | Implemented (by design) | Explicitly NOT safe to run as multiple instances/clusters — see [22-performance-scalability.md](22-performance-scalability.md) |
| **Observability** | Structured logging / metrics / alerting | Not implemented | Only `console.log`/`console.error` to stdout |

## 2.3 Requirement Traceability Notes

- Every functional requirement above maps to a route in [09-api-documentation.md](09-api-documentation.md) and a page in [08-ui-ux.md](08-ui-ux.md).
- "Implemented" means verified by reading the actual route handler and/or exercising it against the running local server during this documentation pass, not inferred from naming.
