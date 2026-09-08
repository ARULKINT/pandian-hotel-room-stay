# 6. User Roles & Permissions

## 6.1 Roles

The application recognises exactly two roles. There is no guest account/login system — "Guest" identity is simply an email address supplied at booking time, not an authenticated identity.

| Role | How identity is established | Session mechanism |
|---|---|---|
| **Guest** | None — anonymous. Self-identifies with an email address when booking or looking up "My Stays". | None (stateless); the email is stored client-side in `sessionStorage` purely for convenience (pre-filling the lookup field) |
| **Staff / Admin** | Knowledge of the single shared `ADMIN_PASSWORD` | Server-issued bearer token, 8-hour TTL, held in `sessionStorage` (`phr.admin.token`) |

There is no per-staff-member account, no role hierarchy (e.g. manager vs. front-desk), and no permission granularity within the staff role — anyone with the password has full staff access. This matches the scale of the product (one shared front-desk password for a single small hotel), not an oversight to be read as a multi-tenant gap.

## 6.2 Permission Matrix

| Feature / Action | Guest (anonymous) | Guest (knows their own booking email) | Staff (authenticated) |
|---|---|---|---|
| Browse rooms, facilities, check availability | ✅ | ✅ | ✅ |
| Get a price quote | ✅ | ✅ | ✅ |
| Create a booking | ✅ | ✅ | ✅ |
| View a specific booking by ID (`GET /api/bookings/:id`) | ✅ (if they have the ID) | ✅ | ✅ |
| List bookings by email (`GET /api/bookings?email=`) | ❌ | ✅ (own email only) | ✅ |
| List **all** bookings (`GET /api/bookings`, no email) | ❌ (401) | ❌ (401) | ✅ |
| Cancel a `CONFIRMED` booking | ❌ (must know the booking ID; not authenticated) | ✅ (any booking ID they know) | ✅ |
| Check a guest in / out | ❌ | ❌ | ✅ |
| Reinstate a cancelled booking | ❌ | ❌ | ✅ |
| View occupancy / revenue dashboard (`GET /api/admin/summary`) | ❌ (401) | ❌ (401) | ✅ |
| Sign in / out of the operations panel | N/A | N/A | ✅ |

## 6.3 Important Nuance: Cancellation Is Not Email-Scoped

`PATCH /api/bookings/:id` with `{ status: 'CANCELLED' }` requires **no authentication at all** — only knowledge of the booking ID (see [09-api-documentation.md](09-api-documentation.md) and [14-authentication-security.md](14-authentication-security.md)). This is an intentional design choice (a guest who lost their session but has the ID from a confirmation email/screenshot can still cancel), but it means the permission boundary for cancellation is "possession of the booking ID," not "ownership of the email on the booking." All other status transitions (`CHECKED_IN`, `CHECKED_OUT`, reinstating to `CONFIRMED`) do require the staff token.

## 6.4 Protected Routes (Frontend)

The frontend does not implement route guards in the router itself — `#/admin` is reachable by anyone, but `Admin.js` immediately checks for a stored token and calls `verifyAdminSession()` against the server before rendering anything sensitive; an invalid/expired/missing token always falls back to the sign-in form (`showLogin()`). This means the **real** access boundary is enforced server-side (`requireAdmin` middleware), and the client-side check is purely a UX convenience — consistent with the rule that hiding a page client-side is never sufficient by itself (this is explicitly called out in a code comment in `server.js`).
