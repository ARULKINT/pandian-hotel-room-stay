# 5. Project Structure

## 5.1 Directory Tree

```
HOTEL-ECOM/
├── backend/
│   ├── data/
│   │   ├── rooms.json           # 6 room types — reference data, read-only at runtime
│   │   ├── facilities.json      # 6 hotel facilities — reference data
│   │   ├── addons.json          # 5 optional paid extras — reference data
│   │   └── bookings.json        # generated at runtime, gitignored (JSON-file mode only)
│   ├── server.js                # all routes, validation, pricing, auth
│   ├── store.js                 # bookings persistence: Postgres or JSON file
│   ├── .env.example              # template for local secrets
│   └── package.json
├── frontend/
│   ├── public/
│   │   ├── images/southindia/   # 10 photos — Vite "serve as-is" convention
│   │   └── logos/logo.svg
│   ├── src/
│   │   ├── main.js               # hash router — maps #/path to a page module
│   │   ├── api.js                # fetch wrapper, auth header injection, all endpoint calls
│   │   ├── state.js               # sessionStorage-backed booking draft + compare list
│   │   ├── format.js              # currency/date formatting, HTML-escaping
│   │   ├── components/
│   │   │   ├── layout.js          # header, bottom nav, empty/loading states, toast
│   │   │   └── roomCard.js        # shared room-card markup used on 4 pages
│   │   ├── pages/                 # one module per route — see 5.3
│   │   └── assets/styles/index.css
│   ├── index.html                 # Tailwind CDN + design-token config, #app mount point
│   ├── vite.config.js
│   └── package.json
├── deploy/
│   ├── README.md                  # Render + Netlify + Neon free-hosting runbook
│   └── vps-alternative/           # archived single-server (nginx + PM2) deployment path
├── docs/                          # this documentation package
├── render.yaml                    # Render Blueprint (backend auto-config)
├── netlify.toml                   # Netlify build config (frontend auto-config)
├── .gitignore
└── package.json                   # root: `npm run dev` runs both tiers via concurrently
```

## 5.2 Backend Files — Responsibility

| File | Responsibility |
|---|---|
| `backend/server.js` | Express app setup, CORS, admin authentication (login/logout/session), reference-data loading, date/availability/pricing utilities, all 15 API routes, 404 and error-handling middleware, startup sequencing (waits on `store.init()` before listening) |
| `backend/store.js` | Abstracts bookings persistence behind `init/list/get/create/update` — Postgres (`pg` pool, JSONB column) when `DATABASE_URL` is set, otherwise a JSON file on local disk. No other file touches booking storage directly. |
| `backend/data/*.json` | Static, hand-authored reference data (rooms, facilities, add-ons) — loaded once into memory at boot via `readJson()`, never mutated at runtime |

## 5.3 Frontend Page Modules

Each file in `frontend/src/pages/` exports the same shape: `render()` returning an HTML string, and `mount(param?)` wiring up events after that string is injected into the DOM.

| File | Route | Purpose |
|---|---|---|
| `Home.js` | `#/home` | Hero, quick date/guest picker, trust badges, room + facility previews |
| `Availability.js` | `#/availability` | Date/guest form, live search results |
| `Rooms.js` | `#/rooms` | Full room catalogue: AC/Non-AC filter, sort, compare selection |
| `RoomDetails.js` | `#/room-details/:id` | Photo gallery, amenities, pricing, tax breakdown, policies, sticky "Book Now" |
| `Compare.js` | `#/compare` | Side-by-side attribute/amenity comparison table for 2–3 selected rooms |
| `Checkout.js` | `#/checkout/:id` | Add-on selection, guest detail form, live quote (step 2 of 3) |
| `Payment.js` | `#/payment/:id` | Payment method selection, final bill, booking creation (step 3 of 3) |
| `Confirmation.js` | `#/confirmation/:bookingId` | Post-booking summary, copyable booking ID, itemised receipt |
| `Dashboard.js` | `#/dashboard` | Guest self-service: email lookup, upcoming/past stays, self-cancel |
| `Facilities.js` | `#/facilities` | Accordion list of hotel facilities |
| `Admin.js` | `#/admin` | Staff sign-in gate + operations dashboard (occupancy, register, status actions) |
| `NotFound.js` | (fallback) | 404 page for any unrecognised route |

## 5.4 Frontend Shared Modules

| File | Exports | Used by |
|---|---|---|
| `state.js` | `getDraft`, `updateDraft`, `resetDraft`, `getNights`, `toggleAddon`, `getCompareList`, `toggleCompare`, `clearCompare` | Every page that reads/writes the in-progress booking or the compare selection |
| `api.js` | One function per API endpoint, `AuthError`, `getAdminToken` | Every page module |
| `format.js` | `formatINR`, `formatDate`, `formatDateLong`, `formatDateFull`, `nightsBetween`, `toISODate`, `addDays`, `todayISO`, `escapeHtml` | Every page module |
| `components/layout.js` | `header`, `bottomNav`, `emptyState`, `loading`, `toastMarkup`/`showToast`, `mountLayout` | Every page module |
| `components/roomCard.js` | `roomCard`, `mountRoomCards` | `Home.js`, `Rooms.js`, `Availability.js` |

## 5.5 Configuration & Deployment Files

| File | Purpose |
|---|---|
| `render.yaml` | Render Blueprint: root directory `backend`, build/start commands, declares `ADMIN_PASSWORD`, `DATABASE_URL`, `CORS_ORIGIN`, `PORT` as service env vars |
| `netlify.toml` | Base directory `frontend`, build command `npm run build`, publish directory `dist`, cache headers |
| `.gitignore` | Excludes `node_modules/`, `backend/.env`, `backend/data/bookings.json`, `.agents/` (contains a third-party API key), and pre-rebuild scratch directories |
| `.claude/launch.json` | Local dev-server launch configuration (frontend on 5173, backend on 3000) used by the AI coding assistant's browser-preview tooling — not part of the production app |

## 5.6 Not Documented Further

`node_modules/`, `package-lock.json`, and the `frontend/docs/*.html` design-reference files (raw exports from the original Stitch design tool used early in the project) are excluded from this documentation as generated/non-authored artifacts.
