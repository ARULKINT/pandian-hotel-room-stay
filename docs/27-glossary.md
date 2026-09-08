# 27. Glossary

## Business / Domain Terms

| Term | Definition |
|---|---|
| **Guest** | A visitor to the site who browses and books a room; not an authenticated user — identified only by the email they supply |
| **Staff** | A hotel employee with the shared front-desk password, able to access the Operations panel |
| **Booking** | A confirmed (or cancelled/checked-in/checked-out) reservation of one room for a date range, created via the guest-facing flow |
| **Draft** | The guest's in-progress, not-yet-submitted booking selections (dates, guests, room, add-ons, contact info), held in the browser's `sessionStorage` |
| **Add-on** | An optional paid extra attached to a booking (e.g. airport pickup, breakfast, extra mattress), priced either "per stay" or "per night" |
| **Quote** | A computed, itemised price breakdown for a room + add-on selection, produced by the same function used to price the final booking |
| **GST** | Goods and Services Tax — India's tax on goods/services, applied here to the room's nightly tariff at a slab rate (0%/12%/18%) |
| **Total Units (`totalUnits`)** | The physical count of rooms of a given type the hotel has (e.g. 8 Deluxe AC rooms) — the denominator for availability |
| **Available Units (`availableUnits`)** | `totalUnits` minus currently-overlapping active bookings for a given date range — computed live, never stored |
| **Welcome Offer** | A flat ₹50 discount applied to every quote |
| **Operations Panel** | The staff-only, password-gated dashboard at `#/admin` |
| **My Stays** | The guest-facing self-service page (`#/dashboard`) for looking up and cancelling bookings by email |

## Technical Terms

| Term | Definition |
|---|---|
| **SPA (Single-Page Application)** | A web app that loads once and re-renders content client-side as the user navigates, rather than requesting a new HTML page from the server on every navigation |
| **Hash routing** | Client-side routing that uses the URL fragment (`#/rooms`) rather than the server-recognised path, so a static file host can serve the same `index.html` for every "route" with no server-side routing configuration |
| **`render()` / `mount()`** | This codebase's convention: `render()` returns an HTML string for a page, `mount()` wires up event listeners after that string is injected into the DOM |
| **CORS (Cross-Origin Resource Sharing)** | The browser security mechanism controlling whether JavaScript on one origin (the Netlify frontend) may call an API on a different origin (the Render backend); configured here via the `CORS_ORIGIN` env var |
| **Bearer token** | An opaque credential sent in the `Authorization: Bearer <token>` HTTP header, used here for staff session authentication |
| **scrypt** | A memory-hard password-hashing algorithm (Node's built-in `crypto.scryptSync`), used here to hash `ADMIN_PASSWORD` before comparison |
| **Timing-safe comparison** | A comparison function (`crypto.timingSafeEqual`) that takes constant time regardless of where two byte sequences first differ, preventing an attacker from inferring a password's correctness byte-by-byte via response-time measurement |
| **JSONB** | PostgreSQL's binary JSON column type, used here to store each booking as a single semi-structured document rather than normalised columns |
| **Connection pooling (Neon)** | Neon's pooled connection endpoint (the `-pooler` hostname in the connection string), which multiplexes many short-lived connections efficiently — appropriate for a serverless-style Node backend |
| **Cold start** | The delay before a sleeping free-tier service (Render, and separately Neon) responds to its first request after a period of inactivity |
| **Vite** | The frontend build tool/dev server used in this project; provides fast local development and produces the optimised `dist/` bundle for production |
| **`import.meta.env.DEV`** | A Vite-provided constant, `true` in the dev server and statically replaced with `false` (enabling dead-code elimination) in a production build — used here to strip the demo admin-password prefill from production builds |
| **Sanitisation (`sanitise()`)** | This codebase's term for validating and repairing untrusted client-stored state (`sessionStorage`) field-by-field before it's used, rather than trusting it wholesale |
| **Race condition (booking context)** | The scenario where two guests attempt to book the last unit of a room at nearly the same time; mitigated here by re-checking availability at the moment of booking creation, not only at search time |
| **Enumeration vulnerability** | A security flaw where an attacker can determine which resource IDs are valid by observing differences in error responses (e.g. 404 vs 401); specifically guarded against in this codebase's booking-status-update route (see [14-authentication-security.md](14-authentication-security.md)) |

## Product / Regional Terms

| Term | Definition |
|---|---|
| **Vanakkam** | A Tamil greeting ("welcome"/"hello"), used in the site's hero copy to reinforce the South Indian setting |
| **Filter coffee** | South Indian brewed coffee, served traditionally in a davara-tumbler set — offered as a complimentary hotel amenity and as a paid welcome add-on |
| **Ayurveda massage** | A traditional Indian therapeutic massage, offered here as a hotel wellness facility and a bookable add-on |
| **PHR** | The booking-ID prefix used throughout the system, short for "Pandian Hotel & Room [Stay]" |
