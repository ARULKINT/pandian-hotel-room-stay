# 14. Authentication & Security

## 14.1 Authentication Model

There is exactly one authenticated identity in this system: **staff**, gated by a single shared password (no per-user accounts). Guests are never authenticated — see [06-user-roles-permissions.md](06-user-roles-permissions.md).

### Password Handling

| Aspect | Implementation |
|---|---|
| Storage | `ADMIN_PASSWORD` env var is **never** stored in plaintext in memory beyond the boot-time hash computation — only its scrypt hash + a random salt are retained |
| Hashing algorithm | Node's built-in `crypto.scryptSync(password, salt, 64)` — scrypt is a memory-hard KDF, deliberately expensive to brute-force |
| Salt | `crypto.randomBytes(16)`, generated fresh **per server boot** (not persisted — see §14.5 caveat) |
| No hard-coded password | If `ADMIN_PASSWORD` is unset, the server generates a random one (`crypto.randomBytes(9).toString('base64url')`) and prints it once to the console at startup — the app refuses to ship a default/guessable password |
| Comparison | `crypto.timingSafeEqual()` on the hashed candidate vs. the stored hash — prevents a timing side-channel from leaking how many leading bytes of the password guess were correct |

### Session Tokens

| Aspect | Implementation |
|---|---|
| Generation | `crypto.randomBytes(32).toString('hex')` — 256 bits of entropy, not guessable |
| Storage (server) | In-memory `Map<token, expiryTimestamp>` — no database table, no JWT, no signing key |
| Storage (client) | `sessionStorage` (`phr.admin.token`) — cleared when the browser tab closes, not persisted across sessions/devices |
| TTL | 8 hours (`SESSION_TTL_MS`) |
| Cleanup | An hourly `setInterval` sweeps expired entries out of the Map so it can't grow unbounded (`.unref()`'d so it doesn't keep the process alive on its own) |
| Transport | `Authorization: Bearer <token>` header on every protected request |

### Brute-Force Protection

Per-IP tracking (`loginAttempts` Map, also in-memory): after 5 failed attempts, that IP is locked out for 15 minutes, with the remaining-attempts count surfaced in the error message so a legitimate staff member gets useful feedback. A successful login clears the IP's attempt counter.

## 14.2 Authorization Model

Implemented as a single Express middleware, `requireAdmin`, applied per-route (not globally) to: `POST /api/admin/logout`, `GET /api/admin/session`, `GET /api/admin/summary`, `GET /api/bookings` (when no `email` query param is given), and `PATCH /api/bookings/:id` (when the target status is anything other than `CANCELLED`).

## 14.3 A Specific Fix Worth Documenting: Auth-Before-Lookup Ordering

In `PATCH /api/bookings/:id`, the authentication check runs **before** the database lookup for the booking:

```js
// Guests may cancel their own booking; every other transition is a front-desk
// operation and needs staff sign-in. This is checked before the booking is
// looked up, so an unauthenticated caller cannot probe which ids exist.
if (status !== 'CANCELLED') {
  // ...check token, 401 if missing/invalid...
}
const booking = await store.get(req.params.id);
if (!booking) return res.status(404).json({ error: 'Booking not found' });
```

If this were ordered the other way (lookup first, auth second), an unauthenticated caller could distinguish a real booking ID from a fake one purely from the response code (404 vs 401) without ever having valid credentials — a classic **user/resource enumeration** vulnerability. This ordering was identified and fixed proactively during development (not requested by a user), and is called out here because it's a pattern worth replicating anywhere else a resource lookup and an auth check combine.

## 14.4 Input Validation & Injection Surface

| Vector | Mitigation |
|---|---|
| SQL injection | All Postgres queries use parameterised placeholders (`$1`, `$2`) via the `pg` driver — no string-concatenated SQL exists anywhere in `store.js` |
| XSS via stored guest data (name, requests, etc.) | `escapeHtml()` is applied to every piece of dynamic string data before it's interpolated into an `innerHTML` template, across every page module |
| Prototype pollution / malformed client state | `sanitise()` in `state.js` validates every field of any object read from `sessionStorage` before it's trusted, falling back to safe defaults field-by-field |
| Oversized/malformed request bodies | Handled by Express's built-in `express.json()` body parser (default size limits apply); no custom hardening beyond that |
| CSRF | Not applicable in the traditional sense — the API is a stateless bearer-token JSON API (no cookies), which is inherently not vulnerable to classic cookie-based CSRF |

## 14.5 Known Security Limitations (Named Honestly)

| Limitation | Why it exists | Practical impact |
|---|---|---|
| Salt regenerates on every server restart | Simplicity — no persistent credential store needed for a single shared password | Harmless in itself (the hash is recomputed from the same `ADMIN_PASSWORD` env var each boot), but means the hash-on-disk approach some systems use for offline verification isn't available here |
| Sessions live only in server memory | No session store (Redis, DB-backed sessions) | **All staff are logged out on every server restart/redeploy** — acceptable for a low-traffic single hotel, but would be disruptive at higher scale or with rolling deploys. Also means the app cannot run as more than one instance (see [22-performance-scalability.md](22-performance-scalability.md)) |
| No password rotation / expiry policy | Out of scope for a single shared credential | Whoever knows the password has indefinite access until it's manually changed and redeployed |
| No audit log of staff actions | Not implemented | A check-in/check-out/cancel action doesn't record *which* staff member performed it (there's only one shared identity, so this wouldn't be attributable anyway without per-account login) |
| `CORS_ORIGIN=*` is the documented starting value during deployment | Simplifies the Render→Netlify bring-up order (see [18-deployment.md](18-deployment.md)) | Should be tightened to the real frontend origin once known — the deployment runbook explicitly calls this out as a required follow-up step, not a shipped default |
| Demo password prefill in `Admin.js` | `DEMO_PASSWORD` constant, gated behind `import.meta.env.DEV` | Vite statically eliminates this in a production build (`vite build` sets `import.meta.env.DEV` to `false`), so it cannot ship to production by normal means — but it is a reminder to never reuse the local demo password (`pandian@2026`) as a real `ADMIN_PASSWORD` |

## 14.6 Data Privacy

Guest PII collected: name, email, phone number, optional free-text special requests. This data is:
- Never sent to any third party (no analytics, no email service, no payment processor — see [16-integrations.md](16-integrations.md))
- Returned in full to any authenticated staff session (no field-level redaction)
- Returned in full to anyone who supplies the exact matching email via `?email=` (by design — this is the guest's own self-service lookup)
- Not encrypted at rest beyond whatever the hosting provider (Neon/Render) provides at the infrastructure level — the application itself does not encrypt PII fields before storage
