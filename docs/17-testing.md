# 17. Testing Documentation

## 17.1 Current State: No Automated Test Suite

There is no test framework configured in either `package.json`. The root and `frontend` package files contain no test dependency; `backend/package.json`'s `"test"` script is the npm-generated placeholder (`echo "Error: no test specified" && exit 1`) and has never been replaced. **This is a real, honestly-reported gap** — not a case of tests existing but being undocumented.

What functional verification exists instead:
- **Manual exploratory testing** performed repeatedly during development (documented in this project's development history): full booking-flow walkthroughs, automated-looking regression passes over every route via direct `curl` calls against the running dev server, and live browser verification of every screen while building this documentation package.
- **Runtime assertions via validation logic** (e.g. `validateStay`, `sanitise`) act as a lightweight defensive layer against bad input, but these are production code paths, not tests.

## 17.2 Recommended Test Cases

Presented as a starting backlog — **none of these exist today**; all are recommendations.

### Backend — API / Business Logic

| Test ID | Feature | Preconditions | Steps | Expected Result | Priority |
|---|---|---|---|---|---|
| T-01 | GST slab calculation | None | Quote a room priced ₹899, ₹1499, ₹8000 | 0%, 12%, 18% respectively | High |
| T-02 | Availability overlap logic | A room with `totalUnits=1` has one `CONFIRMED` booking 10–12 Sep | Request availability for 11–13 Sep (partial overlap) | `availableUnits = 0` | High |
| T-03 | Availability — same-day turnover | Booking A checks out 12 Sep | Request availability starting 12 Sep | Room counted as available (no overlap) | Medium |
| T-04 | Double-booking race | Room has 1 unit left; two `POST /api/bookings` fire concurrently for the same dates | Send both requests near-simultaneously | Exactly one succeeds (201); the other gets 409 | High |
| T-05 | Auth ordering on PATCH | No token supplied | `PATCH /api/bookings/DOES-NOT-EXIST {status: CHECKED_IN}` | 401, **not** 404 (proves the enumeration fix holds) | High |
| T-06 | Guest self-cancel without auth | A real `CONFIRMED` booking exists | `PATCH /api/bookings/:id {status: CANCELLED}`, no `Authorization` header | 200, status becomes `CANCELLED` | High |
| T-07 | Admin lockout | 4 prior failed login attempts from one IP | Submit a 5th wrong password | 429 with a lockout message; a 6th attempt (even correct) is also 429 until 15 minutes pass | High |
| T-08 | Timing-safe password comparison | N/A | Verify `crypto.timingSafeEqual` is actually used (code review / static check) rather than `===` | Confirmed present | Medium |
| T-09 | Quote/booking price parity | A room + 2 add-ons | Call `/api/quote`, then `/api/bookings` with identical inputs | `pricing.total` on the booking exactly equals the quote's `total` | High |
| T-10 | Unknown add-on rejected | N/A | `POST /api/quote` with a fabricated add-on id | 400, names the unknown id | Medium |
| T-11 | Store parity (JSON vs Postgres) | Run the same test suite twice — once with `DATABASE_URL` unset, once set to a test Postgres instance | Identical `store.js` operations | Identical observable behaviour from every route | High |

### Frontend — UI / State

| Test ID | Feature | Preconditions | Steps | Expected Result | Priority |
|---|---|---|---|---|---|
| T-12 | Draft sanitisation | `sessionStorage` manually set to `{"checkIn": "not-a-date"}` | Load any page that reads the draft | Falls back to the default date range rather than crashing | High |
| T-13 | Compare cap | 3 rooms already selected for comparison | Tick a 4th room's Compare box | Oldest selection is evicted; exactly 3 remain selected | Medium |
| T-14 | Checkout guard: sold-out room | Room has `availableUnits: 0` for the current draft dates | Navigate to `#/checkout/:id` | Empty state shown; guest cannot reach the guest-details form | High |
| T-15 | Session expiry mid-session (admin) | A valid token that has since expired server-side | Perform any admin action | Dropped to the sign-in form with an explanatory message, not a raw error | Medium |
| T-16 | Form validation scroll-to-error | Checkout form submitted with an invalid email | Tap Continue | Toast shown, view scrolls to the invalid field | Low |
| T-17 | 404 fallback | Navigate to an unmapped hash (e.g. `#/nonsense`) | Load the URL directly | NotFound page renders without a console error/blank screen | Medium |

### End-to-End

| Test ID | Feature | Preconditions | Steps | Expected Result | Priority |
|---|---|---|---|---|---|
| T-18 | Full booking journey | Fresh session | Home → pick dates → Rooms → Room Details → Checkout (fill details + 1 add-on) → Payment → Confirm | Booking appears in Confirmation with correct itemised total; the same booking is retrievable via My Stays by the entered email | High |
| T-19 | Cancellation journey | A booking created via T-18 | Dashboard → find by email → Cancel → confirm | Status becomes `CANCELLED`; room's availability count increases by 1 for those dates | High |
| T-20 | Admin check-in/out journey | A `CONFIRMED` booking exists | Admin sign-in → Check In → Check Out | Status transitions visible immediately in both the register and the stats cards | Medium |

## 17.3 Suggested Tooling (Not Installed)

| Layer | Suggested tool | Rationale |
|---|---|---|
| Backend unit/integration | `node:test` (built-in, zero new dependency) or Vitest | Fast, no framework dependency conflict with the existing minimal `backend/package.json` |
| Frontend unit | Vitest (pairs naturally with the existing Vite setup) | Already using Vite for the build; no new bundler to introduce |
| End-to-end | Playwright | Can drive the real dev server + real backend, matching how this app was manually verified during development |
