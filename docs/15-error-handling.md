# 15. Error Handling

## 15.1 Backend Error Handling Layers

1. **Per-field validation** inside each route handler — returns a specific 400 with a human-readable message the moment the first invalid field is found (fail-fast, not an aggregate error list).
2. **Express 5's native async error forwarding** — every route handler in `server.js` is an `async` function; Express 5 automatically catches a rejected promise and forwards it to the error middleware (no manual `try/catch`-and-`next(err)` boilerplate is needed, and none was added).
3. **Global error-handling middleware** (last-registered in `server.js`):
   ```js
   app.use((err, req, res, next) => {
     console.error(err);
     res.status(500).json({ error: 'Internal server error' });
   });
   ```
   Logs the full error server-side; returns a deliberately generic message to the client (no stack trace or internal detail is ever leaked in a response body).
4. **404 fallback** for any unmatched route: `{ error: 'Not found' }`.

## 15.2 Backend Error Reference

| Error | Cause | System Behaviour | Guest/Staff Experience | Recovery |
|---|---|---|---|---|
| Invalid date format | `checkIn`/`checkOut` not `YYYY-MM-DD` or unparsable | 400, specific field named | Toast/inline error on the form | Re-enter a valid date |
| Check-in in the past | Date before "today" (UTC) | 400 | "checkIn cannot be in the past" | Pick a future date |
| Check-out not after check-in | Inverted/equal range | 400 | "checkOut must be after checkIn" | Adjust dates |
| Stay exceeds 30 nights | `nights > MAX_NIGHTS` | 400 | "Stay cannot exceed 30 nights" | Shorten the stay |
| Room not found | Unknown `roomId` in URL or body | 404 | Redirected to an empty-state screen ("Browse Rooms") | Pick a valid room |
| Guests exceed room capacity | `guests > room.maxGuests` | 400 (server) / blocked earlier client-side | Empty-state screen naming the limit | Reduce party size or pick a bigger room |
| Invalid guest contact info | Name/email/phone fail their respective patterns | 400 | Inline field error + toast + auto-scroll to first error | Correct the field |
| Unknown add-on ID | Tampered/stale request | 400, names the unknown ID(s) | Not user-facing in normal use (only reachable by directly calling the API) | N/A |
| Room sold out at booking time | Availability re-check fails at the final step | 409 | Empty-state: "just sold out," link to Availability | Choose another room/dates |
| Missing/invalid staff session | No/expired/garbage bearer token | 401 | Admin panel drops to sign-in form with an explanatory message | Sign in again |
| Wrong admin password | Hash mismatch | 401, remaining-attempts count shown | Inline error on the login form | Retry (until locked out) |
| Too many login attempts | 5th consecutive failure from one IP | 429, minutes-remaining shown | Inline error | Wait out the 15-minute lockout |
| Invalid `status` value on PATCH | Not one of the 4 known statuses | 400, lists valid values | N/A (not reachable via the UI, only direct API use) | N/A |
| Booking ID not found | Unknown ID in URL | 404 | Confirmation page shows "Booking not found" empty state | Verify the ID |
| Unhandled server exception | Any uncaught error (e.g. a database connectivity issue) | 500, generic message, full detail logged server-side | Empty state naming the generic message; page remains navigable | Retry; if persistent, a staff/developer needs to check server logs |
| Network unreachable | `fetch()` throws (offline, DNS failure, CORS misconfiguration) | N/A (never reaches the server) | `api.js`'s `request()` catches this and throws "Cannot reach the server. Please check your connection." | Check connectivity; if it's actually a CORS misconfiguration, see [18-deployment.md](18-deployment.md) |

## 15.3 Frontend Error Handling Patterns

| Pattern | Where used |
|---|---|
| `try/catch` around every `fetch`-based page load, rendering an `emptyState()` on failure | Every page module's `mount()` |
| A dedicated `AuthError` subclass thrown specifically on a 401, caught separately from generic errors so the UI can redirect to sign-in rather than showing a generic error screen | `api.js`, `Admin.js` |
| A router-level catch-all: `main.js`'s `render()` wraps `page.render()`/`mount()` in `try/catch`; any uncaught exception falls back to the 404 page rather than leaving a blank/broken screen | `main.js` |
| Toasts for transient, non-blocking errors (e.g. a failed booking-cancel action) | `showToast()`, used across Checkout, Dashboard, Payment, Admin |
| Inline field-level errors that clear as soon as the field becomes valid | Checkout's guest-detail form, Admin's login form |

## 15.4 What Is Not Handled

- **No retry logic** — a failed `fetch` (e.g. a transient network blip) is surfaced immediately as an error; the guest must manually retry (usually by reloading or re-navigating).
- **No offline support** — no service worker, no offline queue; the app is entirely non-functional without a live connection to the backend.
- **No client-side error reporting/monitoring** (e.g. Sentry) — errors are only visible in the browser console (`console.error`) and, server-side, in the process's stdout/stderr.
- **No structured error codes** — every error is a free-text message string; there is no machine-readable error code the frontend switches on (it switches on HTTP status code only, plus the one `AuthError` special case).
