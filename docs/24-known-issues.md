# 24. Known Issues & Technical Debt

Issues are categorized by actual impact, based on reading the implementation — not speculative.

## 24.1 Critical

| Issue | Location | Impact | Recommended Solution |
|---|---|---|---|
| No real payment processing | `Payment.js` / `POST /api/bookings` | Every booking is created as `CONFIRMED` regardless of the chosen payment method — there is no way to actually collect payment through the app today; a hotel using this in production would need to collect payment out-of-band | Integrate a real gateway (Razorpay is the natural fit for an Indian hotel) behind the existing payment-method selection UI, gating booking confirmation on payment success for UPI/Card |
| Bookings can be lost on redeploy (JSON-file mode) | `backend/store.js`, Render free tier | If `DATABASE_URL` is not configured, every redeploy risks wiping all booking history | Always set `DATABASE_URL` in any real deployment — this is already documented as a required step in [18-deployment.md](18-deployment.md), but nothing in the code *enforces* it (the app runs "successfully" either way, silently accepting the risk) |

## 24.2 High

| Issue | Location | Impact | Recommended Solution |
|---|---|---|---|
| No email/SMS is actually sent | `Confirmation.js` copy: "We've sent the details to ${email}" | Misleading to guests — they're told an email was sent when none was | Either integrate a real email provider, or change the copy to not claim an email was sent |
| Tailwind CSS loaded from a public CDN at runtime | `frontend/index.html` (`<script src="https://cdn.tailwindcss.com">`) | Tailwind's own documentation explicitly discourages the CDN build for production: it's slower (JIT-compiles in the browser on every load) and creates an external runtime dependency the app has no control over | Move to a proper Tailwind build step (PostCSS + a real `tailwind.config.js`) as part of the Vite build, producing a static, purged CSS file |
| No automated tests | Entire codebase | Regressions rely entirely on manual verification | See [17-testing.md](17-testing.md) for a concrete starting backlog |
| Single Node process, in-memory session state | `server.js` | Cannot horizontally scale without breaking staff sessions/rate-limiting | See [22-performance-scalability.md](22-performance-scalability.md) §22.3–22.4 |

## 24.3 Medium

| Issue | Location | Impact | Recommended Solution |
|---|---|---|---|
| `isActive()` only counts `CONFIRMED` toward availability | `server.js` | A `CHECKED_IN` booking's overlap window is not counted against future availability checks the way a `CONFIRMED` one is — unlikely to cause real double-booking (the checked-in guest's exact window is what would be checked), but worth a deliberate second look before relying on it for anything overlap-sensitive | Consider treating both `CONFIRMED` and `CHECKED_IN` as "active" in `isActive()` for full correctness |
| `PATCH /api/bookings/:id` doesn't enforce the booking-status state machine | `server.js` | The API will accept any of the 4 statuses as a direct value regardless of the booking's current status (e.g. `CHECKED_OUT` on a booking that was never `CHECKED_IN`) — the UI is the only thing constraining sensible transitions | Add an explicit allowed-transitions map server-side if this system is ever exposed to more than the trusted, single-shared-password staff UI |
| No admin UI for catalogue changes | N/A (doesn't exist) | Every room/price/facility/add-on change requires a JSON edit + redeploy | See [25-roadmap.md](25-roadmap.md) |
| Favorite button is not persisted | `RoomDetails.js` | Purely a client-side visual toggle — reloading the page or revisiting later loses the "favorited" state | Persist to `sessionStorage`/`localStorage` at minimum, or a real backend field if guest accounts are ever added |
| Booking ID uniqueness not enforced at the application layer | `server.js`, `store.js` (JSON-file mode) | 8 hex characters from a UUID is extremely unlikely to collide in practice, but nothing explicitly checks for a collision before insert in JSON-file mode (Postgres mode would reject it via the primary key) | Low-priority given the entropy involved; could add an explicit existence check before insert if ever deemed necessary |
| No accessibility audit performed | Entire frontend | Unknown WCAG conformance level | Run an automated audit (e.g. axe) plus manual keyboard/screen-reader passes |

## 24.4 Low

| Issue | Location | Impact | Recommended Solution |
|---|---|---|---|
| No linter/formatter configured | Entire codebase | Style consistency relies on manual discipline, not tooling | Add ESLint + Prettier |
| No structured logging | `server.js` | Only plain `console.log`/`console.error`; harder to search/filter at scale | Not worth the added dependency at current traffic; revisit if traffic grows |
| No OpenAPI/Swagger spec | Backend | API consumers must read [09-api-documentation.md](09-api-documentation.md) or the source directly | Low priority for a single first-party frontend consumer |
| Exposed third-party API key found in `.agents/mcp_config.json` during development | Repository history (now gitignored) | Was flagged and excluded from version control; the key itself has not been confirmed rotated by its owner | Rotate the key if it hasn't been already — this is an operational follow-up outside the codebase itself |

## 24.5 Limitations (Not Bugs — By Design)

- Single-property data model — no multi-hotel support.
- No guest accounts — identity is just an email address.
- Mobile-first, fixed-width layout on all screen sizes (a deliberate product decision, not a responsive-design gap — see [08-ui-ux.md](08-ui-ux.md) §8.4).
- No search/filter beyond AC/Non-AC type and basic sort — no full-text room search, no date-range calendar picker beyond the native browser one.
