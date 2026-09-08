# 8. User Interface Documentation

## 8.1 Visual Verification Note

Every screen described below was loaded and visually inspected in a live browser against the running application (local dev servers, `backend` on port 3000 and `frontend` on port 5173) while writing this documentation, so the descriptions reflect the actual rendered UI, not the source markup alone. Static screenshot **files** are not embedded in this Markdown package (this delivery format has no image-asset pipeline attached); instead each screen is documented as an accurate layout table plus the real copy text observed on screen. If image files are needed for a slide deck or printed report, they can be captured again on request and exported separately.

## 8.2 Global Layout Shell

Every page shares three fixed elements, defined once in `components/layout.js`:

| Element | Behaviour |
|---|---|
| **Header** (`fixed top-0`) | Logo + wordmark (or page title on inner pages) + a back button (inner pages) + an account icon linking to My Stays. Capped to the app's 428px column and centered — it does not span the full browser width on desktop. |
| **Bottom navigation** (`fixed bottom-0`) | Four tabs: Explore (Home), Rooms, My Stays, Facilities. Highlights the active tab. Present on Home, Rooms, Availability, RoomDetails, Compare, Dashboard, Confirmation, Facilities — **not** shown on Checkout/Payment/Admin (replaced by a step indicator or omitted to keep focus on the task). |
| **Toast** | A single reusable bottom-floating message (`#app-toast`), shown for ~2.4s, used for validation errors and confirmations ("Booking cancelled", "Link copied", etc.). |

The whole app renders inside `<div id="app">` capped at `max-w-[428px]`, centered on a light-grey page background — a deliberate "phone-in-browser" presentation on every screen size, per [01-project-overview.md](01-project-overview.md) §1.6.

## 8.3 Screen-by-Screen Reference

### Home — `#/home`

| | |
|---|---|
| **Access** | Public |
| **Purpose** | Landing page; quick-start a search, build trust, preview rooms and facilities |
| **Key elements** | Full-bleed hero photo (Thanjavur-style gopuram temple) with a "VANAKKAM!" badge and the headline "Clean Rooms, Warm Welcome"; a floating card showing current Dates/Guests (tap to change) and a "Check Availability" CTA; four trust badges (Free Cancellation, Best Rate Assured, Instant Confirm, Room Service); an "Our Rooms" section with AC/Non-AC/All filter chips and room-card previews; a facilities preview further down |
| **Data source** | `GET /api/rooms` (preview, first few rooms), `GET /api/facilities` (preview) |
| **States** | Loading (skeleton text), populated. No dedicated error state was observed — a failed fetch degrades to an empty list rather than a full-page error |

### Availability — `#/availability`

| | |
|---|---|
| **Access** | Public |
| **Purpose** | Explicit date/guest search entry point |
| **Key elements** | Native HTML `<input type="date">` for check-in/out (browser-native date picker, so it inherits the OS/browser's own calendar UI), a guest-count `<select>`, a computed "Wed, 9 Sep 2026 → Fri, 11 Sep 2026 · 2 nights" summary line, "Search Rooms" button, then live "Available Rooms" results (e.g. "5 of 5 free") |
| **Data source** | `GET /api/availability` |
| **Validation** | Server rejects a past check-in, a check-out not after check-in, and stays over 30 nights (`MAX_NIGHTS`) — surfaced as an inline/toast error |

### Rooms — `#/rooms`

| | |
|---|---|
| **Access** | Public |
| **Purpose** | Full catalogue with filtering, sorting, and multi-select comparison |
| **Key elements** | "Your stay" summary bar (tap to jump to Availability), All/AC/Non-AC filter chips, a result-count + Sort dropdown (Recommended / Price ↑ / Price ↓ / Rating), a card per room (photo, rating badge, Compare checkbox, name, price/night, description, size/guests/AC-type chips, stay total, "Room Details" link, "Book Now" button), and — once 2+ rooms are ticked for comparison — a sticky bottom compare bar |
| **Data source** | `GET /api/rooms` with the current stay window |
| **Client-side behaviour** | Filtering and sorting happen entirely in the browser against the already-fetched list (no re-fetch per filter/sort change) |

### Room Details — `#/room-details/:id`

| | |
|---|---|
| **Access** | Public |
| **Purpose** | Full information on one room before committing to book |
| **Key elements** | Swipeable photo gallery with dot indicators, favorite/share icon buttons, floor + category + star rating, room name, size/guests/bed-type chips, a live "N rooms left for your dates" or "Fully booked" line, a price card with a "Taxes info" toggle (shows the exact GST slab for this room's tariff), a 2-column amenities grid, an "About This Room" description, three expandable policy accordions (Check-in/out, Cancellation, House Rules), and a sticky bottom bar showing the stay total with a "Book Now" button |
| **Data source** | `GET /api/rooms/:id` with the current stay window |
| **Notable interaction** | The favorite button is a pure client-side UI toggle (no persistence, no API call) — see [24-known-issues.md](24-known-issues.md) |

### Compare — `#/compare`

| | |
|---|---|
| **Access** | Public (requires 2–3 rooms already selected on Rooms) |
| **Purpose** | Side-by-side decision aid |
| **Key elements** | A horizontally-scrollable table: sticky row-label column, one column per selected room (photo + remove button + name), then rows for price/night, total for stay, room type, max guests, bed, size, floor, rating, availability, followed by a 7-item amenity checklist (✓/—), and a bottom row of "Book Now" buttons per column |
| **Empty state** | Fewer than 2 rooms selected → "Pick at least two rooms" with a link back to Rooms |

### Checkout ("Your Details") — `#/checkout/:id` — step 2 of 3

| | |
|---|---|
| **Access** | Public |
| **Purpose** | Add-on selection + guest contact details + live price build-up |
| **Key elements** | A 3-step progress indicator (Stay → Details → Payment, current step highlighted); a selected-room summary card with a "Change" link; an add-ons list (checkbox cards showing name, optional "Popular" badge, price, description, per-night note where relevant); a guest-details form (Full Name, Email, Mobile, optional Special Requests) with inline error text under each field; a live "Bill Summary" card that refreshes on every add-on toggle; a sticky bottom bar showing the running total and a "Continue" button |
| **Validation (client, mirrored server-side)** | Name ≥ 2 characters; email matches a standard pattern; phone matches `+?[\d\s-]{8,16}`. On failure: inline messages, a toast, and the view auto-scrolls to the first invalid field |
| **Guard states** | No room selected → empty state directing back to Rooms; room sold out for the dates → empty state directing to Availability; guest count exceeds the room's `maxGuests` → empty state explaining the limit |

### Payment — `#/payment/:id` — step 3 of 3

| | |
|---|---|
| **Access** | Public (requires Checkout's guest details to already be filled) |
| **Purpose** | Payment method selection and final booking confirmation |
| **Key elements** | Room + stay + "Booking for" summary card with an "Edit details" link back to Checkout; a 3-choice payment method picker (UPI / Card / Pay at Hotel) with method-specific explanatory text below; a full itemised Bill Summary (room, each add-on, discount if any, GST, total); a security/ID reminder note; a sticky bottom bar with "Due Now" total and a "Confirm Booking" button |
| **On submit** | Button enters a disabled "Confirming…" state; on success, navigates to Confirmation; on failure (e.g. sold out in the intervening seconds), shows a toast and re-enables the button without losing any entered data |

### Confirmation — `#/confirmation/:bookingId`

| | |
|---|---|
| **Access** | Public (anyone with the booking ID/link) |
| **Purpose** | Proof of booking + full receipt |
| **Key elements** | A green check-mark badge, "Booking Confirmed" headline, a personalised thank-you naming the guest and the email "sent to" (see [24-known-issues.md](24-known-issues.md) — no email is actually sent), a copyable Booking ID chip; a room-photo card with check-in/out dates, guest count, nights, and any special request; a full "Amount Paid" / "Amount Due at Hotel" itemised breakdown; a short arrival checklist (photo ID, cancellation window, late-arrival note); "View My Stays" and "Back to Home" buttons |

### My Stays (Dashboard) — `#/dashboard`

| | |
|---|---|
| **Access** | Public; content is scoped by whatever email is entered |
| **Purpose** | Guest self-service: find, view, and cancel bookings without an account |
| **Key elements** | A welcome card (name/email if already known this session), an email lookup form, then either an empty state ("No stays yet") or two sections — **Upcoming** (large photo cards with status chip, total, check-in block, "View Details"/"Cancel" buttons) and **Past & Cancelled** (compact rows with "View Details"/"Book Again"); a persistent Front Desk contact card with a tap-to-call phone number |

### Facilities — `#/facilities`

| | |
|---|---|
| **Access** | Public |
| **Purpose** | Browse hotel amenities beyond the room itself |
| **Key elements** | An accordion list — each row shows a thumbnail, category label (Meals/Refreshments/Wellness/Convenience/Service), name, and a one-line summary; expanding a row (chevron) reveals the full description, timings, and 2–3 highlight chips |
| **Data source** | `GET /api/facilities` |

### Operations (Admin) — `#/admin`

| | |
|---|---|
| **Access** | Staff only — password-gated |
| **Sign-in state** | A centered card: lock icon, "Staff Sign In" heading, explanatory text, (in local dev only) a demo-mode banner stating the password is prefilled, a password field (prefilled in dev, empty in production), inline error text on failure (e.g. "Incorrect password. 3 attempt(s) left."), a "Sign In" button, and a "Back to guest site" link |
| **Dashboard state** | "Front Desk Operations" heading with a Sign-out button; four stat cards (Occupancy %, Available rooms, Arrivals today, Departures today); a Revenue & Bookings summary (revenue, confirmed count, cancelled count); a per-room occupancy bar-list; a horizontally-scrollable filter chip row (All / Arrivals Today / In House / Confirmed / Cancelled); a register of booking cards (ID, status chip, guest name, room, guest count, price, check-in/out dates, phone, any special request, and 1–2 status-action buttons depending on current status) |
| **Session handling** | On load, an existing stored token is re-verified against the server (`GET /api/admin/session`) before the dashboard is trusted; any 401 from any admin call drops straight back to the sign-in form with an explanatory message |

### Not Found — (fallback route)

Renders for any hash that doesn't match a known route. Not deeply themed; exists purely so an invalid/stale link doesn't crash the router (`main.js`'s `render()` also wraps every page render in a `try/catch` that falls back to this same component on a runtime error).

## 8.4 Responsive Behaviour

The layout is intentionally **not** a traditional responsive design that reflows into a multi-column desktop layout. On any viewport, the app renders as a fixed-max-width (428px) single column, centered with grey letterboxing on either side on wider screens — the product is explicitly designed and tested as a mobile web experience first, matching how guests are expected to actually book (from a phone). See [22-performance-scalability.md](22-performance-scalability.md) for the CSS mechanism (`position: fixed` elements capped and centered independently of `#app`'s own width) and the history of a real bug this caused (nav bars visually "moving" during scroll, since fixed).

## 8.5 Accessibility Notes (Observed, Not Audited)

- Icon-only buttons generally carry `aria-label` (back button, favorite, share, remove-from-compare).
- The active bottom-nav tab is marked `aria-current="page"`.
- Accordions toggle `aria-expanded` on their trigger button.
- Form inputs have associated `<label for>` elements.
- No formal WCAG 2.1 audit has been performed — color contrast, focus-order, and screen-reader flow have not been systematically verified. See [24-known-issues.md](24-known-issues.md).
