# 16. External Integrations

## 16.1 Overview

This application has a deliberately small integration surface. It does not call any third-party API at runtime from its own backend code — every "integration" is either an infrastructure dependency (hosting/database) or a browser-native capability, not an API the app's own code calls over the network at request time.

## 16.2 Infrastructure Integrations

| Service | Purpose | Authentication | Data exchanged | Failure handling |
|---|---|---|---|---|
| **Neon** (Postgres, optional) | Durable bookings storage | Connection string (`DATABASE_URL`), TLS (`sslmode=require`) | Full booking documents (JSONB) | If unreachable at boot, `store.init()`'s promise rejects and the process exits with a logged error rather than silently falling back — see `server.js`'s startup `.catch()` |
| **Render** | Hosts the backend Node process | N/A (deploy-time, via GitHub connection) | Full source deploy on every push | Render's own platform-level retry/health-check behaviour; outside this application's control |
| **Netlify** | Hosts the built frontend as static files | N/A (deploy-time, via GitHub connection) | Built `dist/` output on every push | Same as above |
| **GitHub** | Source of truth; deploy trigger for both Render and Netlify | Git over HTTPS, `gh` CLI OAuth for repo creation | Full repository contents | N/A |

## 16.3 Browser-Native Integrations (Not Third-Party APIs)

| Capability | Used for | Fallback if unavailable |
|---|---|---|
| `navigator.clipboard.writeText()` | Copying the booking ID (Confirmation page), copying a room's share link (Room Details) | Falls back to showing the value in a toast instead (Confirmation page); silently no-ops on share (the `catch` treats a dismissed share sheet the same as an unsupported one) |
| `navigator.share()` (Web Share API) | Native share sheet for a room link | Falls back to clipboard copy if `navigator.share` doesn't exist |
| `<input type="date">` | Availability page's date pickers | Browser-native — inherits whatever calendar UI the guest's own browser/OS provides; no custom date-picker library is used |
| `window.confirm()` | Confirming a booking cancellation | Native browser dialog — no custom modal component exists in this app |
| `tel:` links | Front-desk phone number (Dashboard) | Standard `mailto:`-style protocol link; opens the device's phone/dialer app if one is registered |

## 16.4 Fonts & Icons (CDN, Not an API)

| Resource | Source | Notes |
|---|---|---|
| Playfair Display, Plus Jakarta Sans | `fonts.googleapis.com` / `fonts.gstatic.com` | Loaded via `<link>` tags in `index.html`; a network failure degrades to the browser's fallback font stack, no JS dependency |
| Material Symbols Outlined | `fonts.googleapis.com` (as a font, used as icon glyphs) | Same as above |
| Tailwind CSS | `cdn.tailwindcss.com` | The **entire CSS framework** is loaded from this CDN at runtime with an inline config script — see [24-known-issues.md](24-known-issues.md) for the production-readiness implications of this specific choice |

## 16.5 Explicitly NOT Integrated

| Would-be integration | Status |
|---|---|
| Payment gateway (Razorpay, Stripe, PayU, etc.) | **Not integrated.** The Payment page's UPI/Card/Cash selector is informational UI only — see [24-known-issues.md](24-known-issues.md) |
| Email/SMS provider (SendGrid, Twilio, etc.) | **Not integrated.** The Confirmation page states an email "has been sent," but no email is dispatched by any code path |
| Maps / geolocation | Not integrated — the hotel's location is not shown on a map anywhere in the app |
| Analytics (Google Analytics, PostHog, etc.) | Not integrated |
| Error monitoring (Sentry, etc.) | Not integrated |
| OAuth / social login | Not integrated — there is no guest account system to log into |
