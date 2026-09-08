# 9. API Documentation

## 9.1 Overview

- **Base URL**: `http://localhost:3000` locally; `https://pandian-hotel-room-stay.onrender.com` in the current production deployment (injected into the frontend at build time via `VITE_API_BASE_URL` — see [18-deployment.md](18-deployment.md))
- **Format**: JSON request/response bodies throughout (`express.json()`)
- **Request headers**: `Content-Type: application/json` on every request with a body; `Authorization: Bearer <token>` additionally required on the routes marked "Yes"/"Conditional" in §9.2 (see §9.3 auth scheme below). No other custom headers are read by any route.
- **Response headers**: standard Express/CORS defaults (`Content-Type: application/json`, `Access-Control-Allow-Origin` reflecting `CORS_ORIGIN`) — no custom response headers (e.g. rate-limit counters, request IDs) are set.
- **Auth scheme**: Bearer token in the `Authorization` header (`Authorization: Bearer <token>`), issued by `/api/admin/login`
- **CORS**: controlled by the `CORS_ORIGIN` environment variable — currently locked to the production frontend's exact origin (see [14-authentication-security.md](14-authentication-security.md) §14.5)
- **Error shape**: `{ "error": "human-readable message" }` on every non-2xx response

## 9.2 Endpoint Summary

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/api/rooms` | No | List rooms, optionally filtered/priced for a stay window |
| GET | `/api/rooms/:id` | No | One room, optionally with live availability for a stay window |
| GET | `/api/facilities` | No | List all facilities |
| GET | `/api/facilities/:id` | No | One facility |
| GET | `/api/addons` | No | List all optional add-ons |
| GET | `/api/availability` | No | Rooms matching a stay window + guest count, with availability |
| POST | `/api/quote` | No | Compute an itemised price quote |
| POST | `/api/bookings` | No | Create a booking |
| GET | `/api/bookings` | Conditional | List bookings — staff (all) or guest (own email) |
| GET | `/api/bookings/:id` | No | Fetch one booking by ID |
| PATCH | `/api/bookings/:id` | Conditional | Change a booking's status |
| GET | `/api/admin/summary` | Yes | Occupancy/revenue dashboard data |
| POST | `/api/admin/login` | No | Staff sign-in, issues a session token |
| POST | `/api/admin/logout` | Yes | Invalidate the current session token |
| GET | `/api/admin/session` | Yes | Verify a stored token is still valid |

## 9.3 Reference Data Endpoints

### `GET /api/rooms`
Query params: `type` (`ac`/`non-ac`/`all`), `checkIn`, `checkOut`, `guests`.
- If `guests` given: filters to rooms where `maxGuests >= guests` (400 if not a positive integer).
- If `checkIn`/`checkOut` given: each room gets `availableUnits`, `nights`, `stayTotal` computed live against current bookings; a bad date range returns 400.
- Response: array of room objects (see [10-database-documentation.md](10-database-documentation.md) for the room shape).

### `GET /api/rooms/:id`
Same date-window behaviour as above, for one room. 404 if the ID doesn't exist.

### `GET /api/facilities`, `GET /api/facilities/:id`
Plain read of `facilities.json`; 404 on an unknown ID.

### `GET /api/addons`
Plain read of `addons.json`.

## 9.4 Availability & Quote

### `GET /api/availability`
Query params: `checkIn`, `checkOut` (required — 400 if invalid/past/inverted/>30 nights), `guests` (default 1).
Response:
```json
{
  "checkIn": "2026-09-09", "checkOut": "2026-09-11", "nights": 2, "guests": 2,
  "totalMatching": 6, "availableCount": 6,
  "rooms": [ { "...room fields...", "availableUnits": 10, "isAvailable": true, "nights": 2, "stayTotal": 1798 } ]
}
```

### `POST /api/quote`
Body: `{ roomId, checkIn, checkOut, addons: string[] }`.
- 404 if `roomId` unknown; 400 for a bad stay window or an unknown add-on id.
- Response is a full quote object (see §9.7 Pricing Model) — **this exact function is reused, unmodified, by booking creation**, which is what guarantees quote and receipt always match.

Example response:
```json
{
  "roomId": "deluxe-ac", "roomName": "Deluxe AC Room", "nightlyRate": 1499, "nights": 2,
  "roomTotal": 2998,
  "addons": [{ "id": "breakfast", "name": "Add Breakfast for Two", "unitPrice": 250, "quantity": 2, "total": 500 }],
  "addonsTotal": 500, "discount": 50,
  "gstRate": 0.12, "gstPercentLabel": "12%", "tax": 415,
  "total": 3863
}
```

## 9.5 Bookings

### `POST /api/bookings`
Body: `{ roomId, checkIn, checkOut, guests, guestName, guestEmail, guestPhone, addons?, requests?, paymentMethod? }`.

Validation order (each returns 400/404/409 with an explicit message on failure):
1. `roomId` exists (404 if not)
2. Stay window valid (`validateStay`)
3. `guests` is a positive integer and ≤ `room.maxGuests`
4. `guestName` ≥ 2 chars (trimmed), `guestEmail` matches an email pattern, `guestPhone` matches `+?[\d\s-]{8,16}`
5. All `addons` ids are known
6. **Availability is re-checked at this exact moment** (`availabilityFor()` against current bookings) — 409 if the room sold out since it was last searched

On success (201): a full booking object is built — `id` is `PHR-` + 8 uppercase hex characters (from `crypto.randomUUID()`), `pricing` is the output of `buildQuote()`, `status` starts as `CONFIRMED`, `createdAt` is an ISO timestamp — and persisted via `store.create()`.

### `GET /api/bookings`
- **With `?email=...`**: open to anyone; returns bookings where `guestEmail` matches (case-insensitive). This is the "My Stays" lookup.
- **Without `email`**: requires a valid staff bearer token (401 otherwise); returns the full register.
- Optional `?status=` filters by status (case-insensitive, normalised to uppercase).
- Results are always sorted by `checkIn` ascending.

### `GET /api/bookings/:id`
Open to anyone who has the ID. 404 if unknown.

### `PATCH /api/bookings/:id`
Body: `{ status }`, one of `CONFIRMED | CANCELLED | CHECKED_IN | CHECKED_OUT` (400 for anything else).
- If `status === 'CANCELLED'`: **no authentication required**.
- Any other status: requires a valid staff bearer token (401 otherwise).
- **The auth check runs before the booking lookup** — this is a deliberate ordering (see [14-authentication-security.md](14-authentication-security.md)) so an unauthenticated caller gets a uniform 401 rather than being able to distinguish "booking doesn't exist" (404) from "booking exists but you're not staff" by probing IDs.
- On success: `booking.status` and `booking.updatedAt` are updated and persisted; returns the updated booking.

## 9.6 Admin

### `POST /api/admin/login`
Body: `{ password }`. Rate-limited per IP (5 attempts / 15-minute lockout — see [14](14-authentication-security.md)). On success: `{ token, expiresIn }` (token is a 64-char hex string, `expiresIn` is milliseconds, currently 8 hours).

### `POST /api/admin/logout`
Requires a valid token; deletes it from the server-side session map. Idempotent from the client's perspective (the frontend clears its local copy even if this call fails).

### `GET /api/admin/session`
Requires a valid token; returns `{ valid: true }` or 401. Used by the frontend to decide whether to trust a token still sitting in `sessionStorage` from a previous page load.

### `GET /api/admin/summary`
Requires a valid token. Returns:
```json
{
  "totalRooms": 46, "occupiedToday": 3, "availableToday": 43, "occupancyRate": 7,
  "totalBookings": 12, "confirmedBookings": 9, "cancelledBookings": 3,
  "revenue": 45820,
  "arrivalsToday": 2, "departuresToday": 1,
  "roomBreakdown": [ { "id": "deluxe-ac", "name": "Deluxe AC Room", "totalUnits": 8, "occupiedToday": 1 } ]
}
```
`totalRooms` is the sum of every room's `totalUnits` (physical inventory), not a count of room *types*. `revenue` sums `pricing.total` across every non-cancelled booking ever made (all-time, not date-scoped).

## 9.7 Pricing Model (implementation detail referenced by §9.4/9.5)

```
roomTotal    = room.price × nights
addonsTotal  = Σ (addon.unit === 'per night' ? addon.price × nights : addon.price)  for each selected addon
discount     = min(₹50, roomTotal + addonsTotal)          // flat "welcome offer", capped so it can't exceed the bill
taxableAmount = roomTotal + addonsTotal − discount
gstRate      = room.price < ₹1,000 ? 0%
             : room.price ≤ ₹7,500 ? 12%
             : 18%                                          // GST slab keyed to the *nightly rate*, per Indian hotel-tariff GST rules
tax          = round(taxableAmount × gstRate)
total        = taxableAmount + tax
```

## 9.8 Error Responses

| Status | Meaning | Example trigger |
|---|---|---|
| 400 | Bad request / validation failure | Invalid date format, guests not a positive integer, unknown add-on id, invalid `status` value |
| 401 | Missing/invalid/expired staff session | No `Authorization` header, expired token, wrong admin password |
| 404 | Resource not found | Unknown `roomId`, `facilityId`, or booking `id` |
| 409 | Conflict | Room has zero availability for the requested dates at the moment of booking |
| 429 | Too many requests | Admin login attempts exceeded (5 per 15 minutes per IP) |
| 500 | Unhandled server error | Caught by the final Express error-handling middleware; logged server-side, generic message returned to the client |

## 9.9 Not Implemented

There is no OpenAPI/Swagger spec, no `/api/health` endpoint, no API versioning (`/v1/...`), and no request-rate limiting beyond the admin-login-specific lockout described above.
