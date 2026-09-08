# 3. System Architecture

## 3.1 Architecture Style

The system is a **client-rendered single-page application backed by a stateless-per-request REST API**, split across two independently deployed processes:

- **Frontend**: a vanilla-JavaScript SPA (no framework) built and bundled by Vite, served as static files.
- **Backend**: a single Express.js process exposing a JSON REST API, with a pluggable persistence layer (local JSON file or Postgres).

There is no server-side rendering, no message queue, no microservices, and no background worker — this is a deliberately small, monolithic-per-tier design appropriate for a single-property hotel.

## 3.2 High-Level Architecture

```mermaid
flowchart LR
    Guest["Guest browser"] -->|HTTPS| FE["Frontend (Netlify)\nStatic SPA — Vite build"]
    Staff["Staff browser"] -->|HTTPS| FE
    FE -->|fetch() JSON, CORS| API["Backend API (Render)\nExpress.js — single process"]
    API --> Store{"store.js"}
    Store -->|DATABASE_URL set| PG[("Postgres\n(Neon / Supabase)")]
    Store -->|DATABASE_URL unset| JSON[("bookings.json\nlocal file")]
    API --> RoomsData[("rooms.json\nfacilities.json\naddons.json\n(static reference data)")]
```

**Why split hosting:** Render's and Netlify's free tiers are each best-in-class for one half of the app (Render runs a persistent Node process; Netlify serves static files with zero cold start). The two communicate purely over public HTTPS + CORS — there is no shared filesystem or private network between them. See [18-deployment.md](18-deployment.md).

## 3.3 Component Architecture

```mermaid
flowchart TB
    subgraph Frontend["frontend/src"]
        Main["main.js\nhash router"]
        Pages["pages/*.js\n11 page modules"]
        Components["components/\nlayout.js, roomCard.js"]
        State["state.js\nsessionStorage draft"]
        Api["api.js\nfetch wrapper"]
        Format["format.js\ndates, currency, escaping"]
        Main --> Pages
        Pages --> Components
        Pages --> State
        Pages --> Api
        Pages --> Format
    end

    subgraph Backend["backend/"]
        Server["server.js\nroutes, validation, auth, pricing"]
        StoreMod["store.js\nbookings persistence"]
        Data["data/*.json\nrooms, facilities, addons"]
        Server --> StoreMod
        Server --> Data
    end

    Api -->|"fetch(`${VITE_API_BASE_URL}${path}`)"| Server
```

## 3.4 Request Lifecycle (typical read)

```mermaid
sequenceDiagram
    participant U as Guest
    participant SPA as Frontend SPA
    participant API as Express API
    participant S as store.js

    U->>SPA: navigate to #/rooms
    SPA->>SPA: render() looks up route, calls page.mount()
    SPA->>API: GET /api/rooms?checkIn=...&checkOut=...
    API->>API: validateStay(), filter rooms.json
    API->>S: list() — current bookings
    S-->>API: bookings array
    API->>API: availabilityFor() per room
    API-->>SPA: JSON room list with availableUnits
    SPA->>SPA: paint room cards into #room-list
```

## 3.5 Request Lifecycle (booking creation — the critical path)

```mermaid
sequenceDiagram
    participant U as Guest
    participant SPA as Frontend SPA
    participant API as Express API
    participant S as store.js

    U->>SPA: tap "Confirm Booking" (Payment.js)
    SPA->>API: POST /api/bookings {roomId, dates, guests, contact, addons}
    API->>API: validateStay(), validate guest fields, validate addon ids
    API->>S: list() — re-check availability NOW, not at search time
    alt room sold out since search
        API-->>SPA: 409 "fully booked for those dates"
        SPA-->>U: toast error, stays on Payment
    else room still available
        API->>API: buildQuote() — server computes final price
        API->>S: create(booking)
        S-->>API: booking persisted (Postgres or JSON file)
        API-->>SPA: 201 booking (with id, pricing)
        SPA->>SPA: clear draft, keep guest identity, navigate to #/confirmation/:id
    end
```

## 3.6 Data Flow — Pricing (single source of truth)

```mermaid
flowchart LR
    Room["room.price\n(rooms.json)"] --> BuildQuote["buildQuote(room, nights, addonIds)"]
    Addons["addons.json"] --> BuildQuote
    BuildQuote --> RoomTotal["roomTotal = price × nights"]
    BuildQuote --> AddonsTotal["addonsTotal (per-stay or per-night)"]
    RoomTotal --> Taxable["taxableAmount = roomTotal + addonsTotal − discount"]
    AddonsTotal --> Taxable
    Taxable --> GST["gstRateFor(room.price): 0% / 12% / 18%"]
    GST --> Total["total = taxableAmount + tax"]
    BuildQuote -.->|used by both| QuoteEndpoint["POST /api/quote"]
    BuildQuote -.->|used by both| BookingEndpoint["POST /api/bookings"]
```

`buildQuote()` is called from exactly two places in `backend/server.js` — the live quote endpoint the checkout page polls on every add-on change, and the booking-creation endpoint. This is what guarantees the guest is never charged a different number than the one they were shown.

## 3.7 Authentication Flow (staff)

```mermaid
sequenceDiagram
    participant S as Staff browser
    participant API as Express API

    S->>API: POST /api/admin/login {password}
    API->>API: check IP lockout (5 attempts / 15 min)
    API->>API: scrypt hash candidate, timingSafeEqual vs stored hash
    alt wrong password
        API-->>S: 401, attempts-remaining message
    else correct password
        API->>API: issueToken() — random 32-byte hex, 8h TTL, stored in memory Map
        API-->>S: 200 {token, expiresIn}
        S->>S: store token in sessionStorage
    end
    S->>API: GET /api/admin/summary  (Authorization: Bearer <token>)
    API->>API: requireAdmin — isValidToken()
    API-->>S: 200 dashboard data
```

Full detail (hashing, lockout, token lifecycle) is in [14-authentication-security.md](14-authentication-security.md).

## 3.8 Deployment Architecture

```mermaid
flowchart TB
    Dev["Developer"] -->|git push| GH["GitHub repo\nARULKINT/pandian-hotel-room-stay"]
    GH -->|auto-deploy on push| Render["Render (free web service)\nbackend/ — node server.js"]
    GH -->|auto-deploy on push| Netlify["Netlify (free static hosting)\nfrontend/ — vite build → dist/"]
    Render <-->|DATABASE_URL, sslmode=require| Neon[("Neon Postgres\n(free tier)")]
    Browser["Guest / Staff browser"] --> Netlify
    Netlify -->|VITE_API_BASE_URL, CORS| Render
```

See [18-deployment.md](18-deployment.md) for the full runbook, environment variables, and the free-tier tradeoffs (cold starts, why Postgres is optional-but-recommended).

## 3.9 Why This Architecture

| Decision | Reasoning |
|---|---|
| No frontend framework | The app is 11 pages with straightforward server-driven state; a `render()`/`mount()` convention per page module (see [05](05-project-structure.md)) gives predictable behavior without a build-time framework dependency, at the cost of more manual DOM wiring than React/Vue would need. |
| Hash-based routing (`#/rooms`) | Works on any static host with zero server-side routing configuration — critical for Netlify's static-file free tier, and it means no SPA catch-all redirect is even required (the browser never asks the server for `/rooms`, only for `/`). |
| Server computes all pricing | Prevents the classic "client price vs. server price" booking-fraud/bug class entirely, at the cost of an extra round-trip on every add-on toggle (mitigated by only refetching the quote, not the whole page). |
| Pluggable bookings store (`store.js`) | Lets the same codebase run with zero external dependencies locally (JSON file) and durably in production (Postgres), without branching the route handlers themselves. |
| In-memory sessions/rate-limiting | Simple and sufficient for a single Node process; explicitly documented as **not** safe under horizontal scaling (see [22-performance-scalability.md](22-performance-scalability.md)) rather than silently broken. |
