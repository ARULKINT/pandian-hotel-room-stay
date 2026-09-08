# 11. Business Logic

## 11.1 Availability Rule

A room is available for a given date range if `totalUnits − unitsBooked(roomId, checkIn, checkOut) > 0`, where `unitsBooked` counts every **active** (`status === 'CONFIRMED'`) booking for that room whose stay **overlaps** the requested range.

```
overlaps(booking, checkIn, checkOut) = booking.checkIn < checkOut AND checkIn < booking.checkOut
```

This is a standard half-open interval overlap test — a check-out on the same day as another booking's check-in does **not** count as an overlap (the room turns over same-day), matching real hotel operating practice.

**Important nuance**: only bookings with `status === 'CONFIRMED'` count against availability. A `CHECKED_IN` booking is, by the letter of this logic, no longer counted as blocking the room for other date ranges — this is very unlikely to matter in practice (a checked-in guest is physically in the room for their exact stay window, which is what's being checked against), but it is worth naming: `isActive()` checks the string `'CONFIRMED'` specifically, not "any non-cancelled status." See [24-known-issues.md](24-known-issues.md).

## 11.2 Pricing Rule (GST)

Indian hotel GST is charged on the **declared tariff (nightly rate)**, using slab rates rather than a single flat percentage:

| Nightly rate | GST rate |
|---|---|
| Under ₹1,000 | 0% (exempt) |
| ₹1,000 – ₹7,500 | 12% |
| Above ₹7,500 | 18% |

Applied in `gstRateFor(nightlyRate)`. Because the slab is keyed to the **room's** nightly rate specifically (not the blended total including add-ons), a room priced at ₹899/night (e.g. Standard Non-AC) is GST-exempt even after add-ons push the total bill above ₹1,000 — this matches how Indian hotel GST is actually assessed (on the declared room tariff), and is a case worth knowing about explicitly since it's a common source of confusion/bugs in booking systems that GST on the *total bill* instead.

## 11.3 Discount Rule

A flat ₹50 "Welcome Offer" discount is applied to every quote, capped so it can never make the taxable amount negative:

```
discount = min(₹50, roomTotal + addonsTotal)
```

This is unconditional (not tied to a promo code, first booking, or any guest attribute) — effectively a small blanket incentive baked into every price shown. There is no discount-code or coupon system.

## 11.4 Add-on Pricing Rule

Each add-on has a `unit` of either `"per stay"` (charged once regardless of nights) or `"per night"` (multiplied by the stay length):

| Add-on | Price | Unit |
|---|---|---|
| Railway Station / Bus Stand Pickup | ₹300 | per stay |
| Ayurveda Massage | ₹800 | per stay |
| Filter Coffee & Banana Chips Welcome | ₹100 | per stay |
| Add Breakfast for Two | ₹250 | per night |
| Extra Mattress | ₹400 | per night |

## 11.5 Guest Capacity Rule

`guests > room.maxGuests` is rejected both at booking creation (400, server-enforced) and pre-emptively in the Checkout page (an empty-state screen before the guest even reaches the form) — this is a case of the same business rule being enforced in two layers for UX quality (fail fast, before typing contact details) without weakening the authoritative server-side check.

## 11.6 Stay-Window Validation Rules

| Rule | Enforcement |
|---|---|
| `checkIn` and `checkOut` must be valid `YYYY-MM-DD` dates | `parseDate()` / `DATE_RE` |
| `checkIn` cannot be in the past (compared to UTC "today") | `validateStay()` |
| `checkOut` must be strictly after `checkIn` | `validateStay()` |
| Stay cannot exceed 30 nights | `MAX_NIGHTS = 30` |

## 11.7 Booking Status Rules

See the state diagram in [07-user-workflows.md](07-user-workflows.md) §7.5. Business rule summary:

- Any guest who knows a booking ID can cancel it (no ownership check) as long as it isn't already something other than transitioning to `CANCELLED`.
- Every transition **other than** cancellation requires staff authentication.
- The server does not enforce that transitions follow a sensible order (e.g. it will accept `CHECKED_OUT` on a booking that was never `CHECKED_IN`) — the UI is the only thing constraining which buttons are offered in which state.

## 11.8 Booking ID Generation

`'PHR-' + crypto.randomUUID().split('-')[0].toUpperCase()` — an 8-character uppercase hex fragment taken from a v4 UUID's first segment, prefixed `PHR-` (Pandian Hotel & Room). This is short enough to read aloud at a front desk while retaining enough entropy (32 bits) that collisions are not a practical concern at this application's scale; it is **not** guaranteed globally unique (no database uniqueness check is performed before insert — the primary key constraint on Postgres would reject a literal collision, but the JSON-file mode has no such guard).

## 11.9 Edge Cases Explicitly Handled

| Edge case | Handling |
|---|---|
| Guest re-searches after a room sells out mid-session | Re-checked live at booking time (409), not just at initial search |
| Corrupted/hand-edited `sessionStorage` | `sanitise()` discards anything invalid and falls back to defaults, per-field |
| Stored draft's check-in date has passed (stale tab) | Silently rolled forward to tomorrow on next read |
| Pluralisation ("1 guest" vs "2 guests") | Explicitly conditioned wherever a count is shown, both frontend and backend messages |
| Add-on selected that doesn't exist (tampered request) | 400 rejected, naming the unknown ID(s) |
