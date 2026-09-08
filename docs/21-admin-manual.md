# 21. Administrator Manual (Front-Desk Operations Guide)

This guide is for hotel staff using the **Operations** panel (`#/admin`) to manage bookings.

## 21.1 Signing In

1. Go to the hotel website and open **Operations** (or navigate directly to the site's `/#/admin` address).
2. Enter the front-desk password and tap **Sign In**.
3. Your session stays active for **8 hours**, or until you sign out, close the browser tab, or the server restarts (whichever comes first).

> If you get logged out unexpectedly, it's most likely because the server restarted (this happens on every code deployment) or your 8-hour session simply expired — just sign in again.

## 21.2 The Dashboard at a Glance

When you sign in, you'll see:

| Card | What it tells you |
|---|---|
| **Occupancy** | What % of total rooms are occupied today |
| **Available** | How many rooms are free today, across all room types |
| **Arrivals** | How many guests are checking in today |
| **Departures** | How many guests are checking out today |
| **Revenue & Bookings** | Total revenue (all-time, excluding cancelled bookings), confirmed count, cancelled count |
| **Rooms Occupied Today** | A bar per room type showing how full each one is |

## 21.3 Managing Bookings

Below the dashboard is the full booking register, filterable by tapping a chip:

- **All** — every booking, in date order
- **Arrivals Today** — guests checking in today (confirmed only)
- **In House** — guests currently checked in
- **Confirmed** — all confirmed (not yet checked-in) bookings
- **Cancelled** — cancelled bookings

Each booking card shows the booking ID, guest name, room, guest count, price, dates, phone number, and any special request the guest left.

### Checking a Guest In
On a **Confirmed** booking, tap **Check In**. Its status updates immediately and it moves into the "In House" filter.

### Checking a Guest Out
On a **Checked In** booking, tap **Check Out**.

### Cancelling a Booking (Staff-Initiated)
On a **Confirmed** booking, tap **Cancel**. Use this for no-shows or hotel-initiated cancellations — a guest can also cancel their own booking from their end without your involvement.

### Reinstating a Cancelled Booking
On a **Cancelled** booking, tap **Reinstate** to set it back to Confirmed (e.g. if it was cancelled by mistake).

> **Note**: the system does not stop you from, say, checking out a booking that was never checked in — the buttons offered always match the expected order, but nothing blocks an unusual transition if you tap through it deliberately.

## 21.4 Signing Out

Tap **Sign out** at the top of the dashboard. This immediately invalidates your session on the server — the same password will need to be re-entered to sign in again.

## 21.5 What This Panel Does *Not* Do

- It does not send anything to the guest (no email/SMS is triggered by any action here).
- It does not process or refund any payment (no real payment was ever taken — see [20-user-manual.md](20-user-manual.md)).
- It does not let you edit a booking's dates, room, or guest count — only its status.
- It does not show *who on staff* performed an action (there's one shared staff password, not individual staff logins).
- It does not delete bookings — cancellation is the only "removal" available; the record itself is kept indefinitely.

## 21.6 Password Management

The front-desk password is set by whoever manages the hosting (the `ADMIN_PASSWORD` value on the server) — it cannot be changed from within the Operations panel itself. If you need it changed, contact whoever manages the deployment (see [18-deployment.md](18-deployment.md) and [23-maintenance.md](23-maintenance.md)).

## 21.7 Troubleshooting

| Problem | What it means | What to do |
|---|---|---|
| "Your session expired. Please sign in again." appears mid-use | Your 8-hour session ended, or the server restarted | Sign in again — nothing was lost, this is just a re-authentication |
| "Too many attempts. Locked for 15 minutes." | 5 wrong password attempts in a row from this connection | Wait 15 minutes, or contact whoever manages the deployment if the password itself may have changed |
| A booking's numbers look wrong right after you make a change | Rare — try refreshing the page | The dashboard reloads both stats and the register together after every action, so this shouldn't normally happen |
