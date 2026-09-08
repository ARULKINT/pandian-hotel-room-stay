# 25. Future Roadmap

All items below are recommendations based on the gaps identified in [24-known-issues.md](24-known-issues.md) and the scope boundaries in [01-project-overview.md](01-project-overview.md) §1.5 — none are currently in progress or committed to.

## 25.1 Immediate (Critical Fixes)

- Integrate a real payment gateway (Razorpay is the natural fit for an India-based hotel) so bookings are only confirmed after actual payment for UPI/Card methods.
- Enforce `DATABASE_URL` being set before allowing a production deploy to proceed, or at minimum surface a loud warning in the Render deploy logs when running in JSON-file fallback mode outside local development.
- Correct or implement the "email sent" claim on the Confirmation screen (either send a real email, or stop claiming one was sent).

## 25.2 Short Term

- Replace the Tailwind CDN script with a proper build-time Tailwind pipeline (see [24-known-issues.md](24-known-issues.md) §24.2).
- Add an automated test suite starting with the high-priority cases listed in [17-testing.md](17-testing.md) (pricing/GST correctness, the auth-ordering fix, availability overlap logic).
- Add a lightweight admin UI (or at minimum an authenticated JSON-editing endpoint) for room pricing/inventory and facility/add-on management, so catalogue changes no longer require a code deploy.
- Run and act on an automated accessibility audit.

## 25.3 Medium Term

- Introduce a proper relational schema for bookings (or at least indexed columns) if booking volume grows beyond what a full-table scan comfortably handles.
- Move session/rate-limit state out of process memory (shared store) as a prerequisite for any horizontal scaling.
- Add structured error monitoring (e.g. Sentry) so production issues surface without someone manually checking Render logs.
- Add booking modification (change dates/room without a full cancel-and-rebook) if guest demand shows this is a common need.

## 25.4 Long Term

- Multi-property support, if the product is ever extended beyond a single hotel — this would be a significant data-model change (rooms/facilities/add-ons would need a `hotelId`, and staff auth would need to move from one shared password to real per-property accounts).
- Guest accounts with login, enabling booking history without re-entering an email each time, saved preferences, and a real "favorites" feature.
- A loyalty/repeat-guest program, building on the existing flat "Welcome Offer" discount mechanism.
- Native mobile app wrapper, if justified by guest usage patterns — the current mobile-first web design would translate reasonably well to a WebView-based wrapper with minimal rework.

## 25.5 Explicitly Out of Scope (Not on Any Horizon)

- AI/ML features of any kind (see [13-ai-ml.md](13-ai-ml.md)) — not requested, not planned.
- Multi-language / localisation beyond the current English-with-South-Indian-context copy.
