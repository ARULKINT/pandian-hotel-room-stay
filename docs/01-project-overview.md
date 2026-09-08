# 1. Project Overview

## 1.1 Executive Summary

| | |
|---|---|
| **Project name** | Pandian Hotel & Room Stay |
| **Project type** | Web application — direct hotel booking platform (guest-facing SPA + staff operations panel) |
| **Purpose** | Let guests of a moderate, independently-run South Indian hotel search, compare, and book rooms directly — without a third-party OTA (Online Travel Agency) commission — and let front-desk staff manage the resulting bookings. |
| **Target users** | (1) Leisure/business travellers booking a short stay in a South Indian town/city; (2) hotel front-desk staff who need a live occupancy view and a way to check guests in/out. |
| **Business objective** | Replace phone/walk-in-only booking with a self-serve web flow that shows real availability and a transparent, tax-correct price before the guest commits. |
| **Implementation status** | Functionally complete for a single-property hotel: browsing, live availability, quote calculation, checkout, guest self-service, and a password-gated admin panel are all implemented and exercised end-to-end. Payment is **simulated** (see [14-authentication-security.md](14-authentication-security.md) and [24-known-issues.md](24-known-issues.md)) — no real payment gateway is integrated. |

## 1.2 What the Software Does

The application is a two-sided system built around one shared source of truth: a small Express API.

- **Guest side** — a mobile-first single-page app where a visitor picks dates and guest count, browses rooms with live per-date availability, compares up to three rooms side by side, adds optional extras (pickup, massage, breakfast, extra mattress), enters contact details, chooses a payment method, and receives a confirmed booking with an itemised, GST-correct bill.
- **Staff side** — a separate route (`#/admin`) behind a server-verified password gate, showing today's occupancy, arrivals/departures, total revenue, and the full booking register with check-in / check-out / cancel / reinstate actions.

## 1.3 Why It Exists

Small and mid-sized Indian hotels commonly rely on phone bookings or third-party aggregators (which take a commission and control the guest relationship). This project is a self-hosted alternative: the hotel owns the booking data, the guest sees the same live inventory the front desk sees, and pricing is computed once on the server so the amount shown while browsing, the amount confirmed at payment, and the amount on the final receipt can never disagree.

## 1.4 Primary Workflows

1. **Browse → Book** — Home → Rooms/Availability → Room Details → Checkout (guest details + add-ons) → Payment → Confirmation.
2. **Compare rooms** — select 2–3 rooms from the Rooms list → side-by-side comparison table → book directly from the comparison.
3. **Self-service after booking** — "My Stays" lookup by email → view booking → cancel (guest-initiated, no login required).
4. **Front-desk operations** — staff sign-in → live dashboard → filter the booking register → check guests in/out or cancel/reinstate a booking.

## 1.5 Scope

**In scope (implemented):**
- Room catalogue, facilities catalogue, optional paid add-ons
- Date-range availability checked against real per-room unit counts
- Server-side pricing with Indian GST slabs
- Guest booking creation, lookup by email, self-cancellation
- Staff authentication, session management, and a full booking register with status transitions
- Split-hosting deployment (static frontend + API backend + optional Postgres) for a free-tier hosting stack

**Out of scope (not implemented — see [24-known-issues.md](24-known-issues.md) for the full list):**
- Real payment processing (UPI/card/gateway integration)
- Guest accounts / login (guest identity is just an email address, not an authenticated account)
- Multi-property / multi-hotel support (the data model assumes one hotel)
- Email or SMS notifications (the confirmation screen states an email "has been sent" but no email is actually dispatched)
- Photo uploads, review/rating submission, loyalty programs
- Any AI/ML functionality

## 1.6 Assumptions & Constraints

- Single-property deployment: one hotel, one set of rooms, one admin password.
- Designed and styled specifically as a **moderate South Indian hotel** (not luxury, not North Indian) — this is a deliberate branding constraint reflected in copy, imagery, and amenities (filter coffee, idli/dosa, Ayurveda massage, temple imagery) rather than a generic template.
- Mobile-first: the UI is built and constrained to a 428px-wide phone-frame layout even on desktop browsers (see [08-ui-ux.md](08-ui-ux.md)).
- Runs on free-tier hosting by design (Render + Netlify + optional Neon Postgres) — see [18-deployment.md](18-deployment.md) for the resulting tradeoffs (cold starts, ephemeral disk).

## 1.7 Goals & Objectives

| Goal | Type | Success criteria (as implemented) |
|---|---|---|
| Show only real availability | Technical | Room list and quote both call the same server-side `availabilityFor()` logic; a sold-out room cannot be booked, re-checked again at the moment of booking |
| Never disagree on price | Technical | `buildQuote()` in `backend/server.js` is the single function used by both `/api/quote` and booking creation |
| Correct Indian tax treatment | Business | GST slabs (0% / 12% / 18%) applied by nightly room rate, per current government norms |
| Guests never lose progress | UX | In-progress booking (dates, guests, room, add-ons, contact details) persists in `sessionStorage` across every step |
| Staff data is not publicly exposed | Security | Every endpoint returning guest PII or revenue requires a valid server-issued session token (see [14-authentication-security.md](14-authentication-security.md)) |
| Runs for $0/month | Operational | Render (backend) + Netlify (frontend) + Neon (Postgres) free tiers, documented in [18-deployment.md](18-deployment.md) |
