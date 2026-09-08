# 26. Frequently Asked Questions

## For Guests

**Do I need an account to book?**
No. You just provide your name, email, and phone number at booking time. Your email is later used to look up your bookings under "My Stays."

**Is my payment actually charged?**
No — this version of the application does not connect to a real payment gateway. See [24-known-issues.md](24-known-issues.md).

**Will I receive a confirmation email?**
No email is currently sent by the system, even though the confirmation screen references one — save your Booking ID from the confirmation page instead. See [24-known-issues.md](24-known-issues.md).

**Why does the room I want show "Sold Out"?**
The hotel has a limited number of physical rooms of that type (shown as `totalUnits` internally); once every unit is booked for your date range, it shows as sold out until a booking in that range is cancelled.

**Can I change my booking's dates?**
Not directly — there is no "edit booking" feature. You'd need to cancel (free up to 48 hours before check-in) and create a new booking.

**Is GST really calculated correctly?**
Yes — the app applies the real Indian hotel GST slabs based on the nightly room tariff (0% under ₹1,000, 12% up to ₹7,500, 18% above), not a flat rate. See [11-business-logic.md](11-business-logic.md).

## For Hotel Staff

**I forgot the Operations panel password — what do I do?**
Contact whoever manages the hosting/deployment; the password is an environment variable (`ADMIN_PASSWORD`) set on the hosting platform, not something recoverable from within the app itself.

**Why did I get logged out of the Operations panel unexpectedly?**
Either your 8-hour session expired, or the server restarted (which happens on every code deployment) — staff sessions are held in server memory and don't survive a restart. Just sign in again.

**Can I see who on staff made a change?**
No — there is currently only one shared staff password, not individual staff accounts, so actions aren't attributed to a specific person.

**How do I change a room's price?**
There's no admin UI for this today — it requires editing `backend/data/rooms.json` in the code repository and redeploying. See [23-maintenance.md](23-maintenance.md) and [25-roadmap.md](25-roadmap.md).

## For Developers / Technical Stakeholders

**Why no framework (React/Vue) on the frontend?**
A deliberate choice for this project's size — 11 pages with a consistent `render()`/`mount()` convention were judged simple enough not to need a framework's build tooling and dependency weight. See [03-system-architecture.md](03-system-architecture.md) §3.9.

**Why is there no automated test suite?**
Honestly: none has been written yet. See [17-testing.md](17-testing.md) for a concrete, prioritised backlog of what should exist.

**Why does the backend support two different storage modes for bookings?**
To let the same codebase run with zero external dependencies locally (a JSON file) while being production-durable when deployed (Postgres) — see [10-database-documentation.md](10-database-documentation.md) and [18-deployment.md](18-deployment.md).

**Can this run as multiple backend instances for higher availability?**
No — not without first moving session/rate-limit state out of process memory. See [22-performance-scalability.md](22-performance-scalability.md) §22.3.

**Is this using any AI/ML functionality?**
No. See [13-ai-ml.md](13-ai-ml.md).

**How much does this cost to run?**
$0/month on the documented stack (Render free web service + Netlify free static hosting + Neon free Postgres) — see [18-deployment.md](18-deployment.md) for the tradeoffs that come with that.
