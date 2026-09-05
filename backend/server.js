const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const store = require('./store');

// Load backend/.env when present (Node 20.6+). Optional — env vars work too.
try {
  process.loadEnvFile?.(path.join(__dirname, '.env'));
} catch {
  /* no .env file — fall back to real environment variables */
}

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// ---------------------------------------------------------------------------
// Admin authentication
//
// The staff endpoints expose every guest's name, email and phone, so the gate
// lives here on the server. Hiding the page in the UI alone would leave the
// data one curl away.
// ---------------------------------------------------------------------------
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

const hashPassword = (password, salt) =>
  crypto.scryptSync(password, salt, 64).toString('hex');

const adminSalt = crypto.randomBytes(16).toString('hex');

// A password is never hard-coded. Set ADMIN_PASSWORD (see .env.example);
// otherwise a random one is generated per boot and printed once below.
let generatedPassword = null;
if (!process.env.ADMIN_PASSWORD) {
  generatedPassword = crypto.randomBytes(9).toString('base64url');
}
const adminPasswordHash = hashPassword(
  process.env.ADMIN_PASSWORD || generatedPassword,
  adminSalt
);

const sessions = new Map(); // token -> expiry timestamp
const loginAttempts = new Map(); // ip -> { count, lockedUntil }

const issueToken = () => {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, Date.now() + SESSION_TTL_MS);
  return token;
};

const isValidToken = (token) => {
  const expiry = sessions.get(token);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    sessions.delete(token);
    return false;
  }
  return true;
};

/** Drops expired sessions so the map cannot grow without bound. */
setInterval(() => {
  const now = Date.now();
  sessions.forEach((expiry, token) => {
    if (now > expiry) sessions.delete(token);
  });
}, 60 * 60 * 1000).unref();

const requireAdmin = (req, res, next) => {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token || !isValidToken(token)) {
    return res.status(401).json({ error: 'Staff sign-in required' });
  }
  next();
};

app.post('/api/admin/login', (req, res) => {
  const ip = req.ip || 'unknown';
  const record = loginAttempts.get(ip);

  if (record?.lockedUntil && Date.now() < record.lockedUntil) {
    const minutes = Math.ceil((record.lockedUntil - Date.now()) / 60000);
    return res
      .status(429)
      .json({ error: `Too many attempts. Try again in ${minutes} minute(s).` });
  }

  const { password } = req.body || {};
  if (typeof password !== 'string' || !password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  const candidate = Buffer.from(hashPassword(password, adminSalt), 'hex');
  const expected = Buffer.from(adminPasswordHash, 'hex');
  const ok =
    candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);

  if (!ok) {
    const count = (record?.count || 0) + 1;
    loginAttempts.set(ip, {
      count,
      lockedUntil: count >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MS : undefined,
    });
    const left = MAX_ATTEMPTS - count;
    return res.status(401).json({
      error: left > 0 ? `Incorrect password. ${left} attempt(s) left.` : 'Too many attempts. Locked for 15 minutes.',
    });
  }

  loginAttempts.delete(ip);
  res.json({ token: issueToken(), expiresIn: SESSION_TTL_MS });
});

app.post('/api/admin/logout', requireAdmin, (req, res) => {
  const token = (req.get('authorization') || '').slice(7);
  sessions.delete(token);
  res.json({ ok: true });
});

app.get('/api/admin/session', requireAdmin, (req, res) => res.json({ valid: true }));

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------
const readJson = (file, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
  } catch (err) {
    console.error(`Could not read ${file}:`, err.message);
    return fallback;
  }
};

const rooms = readJson('rooms.json', []);
const facilities = readJson('facilities.json', []);
const addons = readJson('addons.json', []);

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_NIGHTS = 30;

const parseDate = (value) => {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const todayUtc = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

const nightsBetween = (checkIn, checkOut) =>
  Math.round((checkOut - checkIn) / (1000 * 60 * 60 * 24));

/**
 * Validates a stay window. Returns { checkIn, checkOut, nights } or { error }.
 */
const validateStay = (checkInRaw, checkOutRaw) => {
  const checkIn = parseDate(checkInRaw);
  const checkOut = parseDate(checkOutRaw);

  if (!checkIn) return { error: 'checkIn must be a date in YYYY-MM-DD format' };
  if (!checkOut) return { error: 'checkOut must be a date in YYYY-MM-DD format' };
  if (checkIn < todayUtc()) return { error: 'checkIn cannot be in the past' };
  if (checkOut <= checkIn) return { error: 'checkOut must be after checkIn' };

  const nights = nightsBetween(checkIn, checkOut);
  if (nights > MAX_NIGHTS) return { error: `Stay cannot exceed ${MAX_NIGHTS} nights` };

  return { checkIn, checkOut, nights };
};

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------
const isActive = (booking) => booking.status === 'CONFIRMED';

const overlaps = (booking, checkIn, checkOut) => {
  const bookedIn = parseDate(booking.checkIn);
  const bookedOut = parseDate(booking.checkOut);
  if (!bookedIn || !bookedOut) return false;
  // Two ranges overlap when each starts before the other ends.
  return bookedIn < checkOut && checkIn < bookedOut;
};

const unitsBooked = (allBookings, roomId, checkIn, checkOut) =>
  allBookings.filter(
    (b) => b.roomId === roomId && isActive(b) && overlaps(b, checkIn, checkOut)
  ).length;

const availabilityFor = (allBookings, room, checkIn, checkOut) => {
  const booked = unitsBooked(allBookings, room.id, checkIn, checkOut);
  return Math.max(0, room.totalUnits - booked);
};

// ---------------------------------------------------------------------------
// Pricing — the single source of truth for money in this app.
// Indian hotel GST slabs are based on the per-night tariff.
// ---------------------------------------------------------------------------
const gstRateFor = (nightlyRate) => {
  if (nightlyRate < 1000) return 0;
  if (nightlyRate <= 7500) return 0.12;
  return 0.18;
};

const WELCOME_DISCOUNT = 50;

/**
 * Builds a complete, itemised quote. Both the quote endpoint and the booking
 * endpoint go through here so the guest can never be charged a different
 * number from the one they were shown.
 */
const buildQuote = (room, nights, addonIds) => {
  const selected = addons.filter((a) => addonIds.includes(a.id));

  const roomTotal = room.price * nights;
  const addonLines = selected.map((addon) => ({
    id: addon.id,
    name: addon.name,
    unitPrice: addon.price,
    quantity: addon.unit === 'per night' ? nights : 1,
    total: addon.unit === 'per night' ? addon.price * nights : addon.price,
  }));
  const addonsTotal = addonLines.reduce((sum, line) => sum + line.total, 0);

  const discount = Math.min(WELCOME_DISCOUNT, roomTotal + addonsTotal);
  const taxableAmount = roomTotal + addonsTotal - discount;

  const gstRate = gstRateFor(room.price);
  const tax = Math.round(taxableAmount * gstRate);
  const total = taxableAmount + tax;

  return {
    roomId: room.id,
    roomName: room.name,
    nightlyRate: room.price,
    nights,
    roomTotal,
    addons: addonLines,
    addonsTotal,
    discount,
    gstRate,
    gstPercentLabel: `${Math.round(gstRate * 100)}%`,
    tax,
    total,
  };
};

// ---------------------------------------------------------------------------
// Reference endpoints
// ---------------------------------------------------------------------------
app.get('/api/rooms', async (req, res) => {
  const { type, checkIn, checkOut, guests } = req.query;
  let result = rooms;

  if (type && type !== 'all') {
    result = result.filter((room) => room.type === type);
  }

  if (guests) {
    const guestCount = Number(guests);
    if (!Number.isInteger(guestCount) || guestCount < 1) {
      return res.status(400).json({ error: 'guests must be a positive whole number' });
    }
    result = result.filter((room) => room.maxGuests >= guestCount);
  }

  // Availability is only meaningful when a stay window is supplied.
  if (checkIn || checkOut) {
    const stay = validateStay(checkIn, checkOut);
    if (stay.error) return res.status(400).json({ error: stay.error });

    const allBookings = await store.list();
    result = result.map((room) => ({
      ...room,
      availableUnits: availabilityFor(allBookings, room, stay.checkIn, stay.checkOut),
      nights: stay.nights,
      stayTotal: room.price * stay.nights,
    }));
  }

  res.json(result);
});

app.get('/api/rooms/:id', async (req, res) => {
  const room = rooms.find((r) => r.id === req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const { checkIn, checkOut } = req.query;
  if (checkIn || checkOut) {
    const stay = validateStay(checkIn, checkOut);
    if (stay.error) return res.status(400).json({ error: stay.error });
    const allBookings = await store.list();
    return res.json({
      ...room,
      availableUnits: availabilityFor(allBookings, room, stay.checkIn, stay.checkOut),
      nights: stay.nights,
      stayTotal: room.price * stay.nights,
    });
  }

  res.json(room);
});

app.get('/api/facilities', (req, res) => res.json(facilities));

app.get('/api/facilities/:id', (req, res) => {
  const facility = facilities.find((f) => f.id === req.params.id);
  if (!facility) return res.status(404).json({ error: 'Facility not found' });
  res.json(facility);
});

app.get('/api/addons', (req, res) => res.json(addons));

// ---------------------------------------------------------------------------
// Availability + quote
// ---------------------------------------------------------------------------
app.get('/api/availability', async (req, res) => {
  const { checkIn, checkOut, guests } = req.query;
  const stay = validateStay(checkIn, checkOut);
  if (stay.error) return res.status(400).json({ error: stay.error });

  const guestCount = guests === undefined ? 1 : Number(guests);
  if (!Number.isInteger(guestCount) || guestCount < 1) {
    return res.status(400).json({ error: 'guests must be a positive whole number' });
  }

  const allBookings = await store.list();
  const results = rooms
    .filter((room) => room.maxGuests >= guestCount)
    .map((room) => {
      const availableUnits = availabilityFor(allBookings, room, stay.checkIn, stay.checkOut);
      return {
        ...room,
        availableUnits,
        isAvailable: availableUnits > 0,
        nights: stay.nights,
        stayTotal: room.price * stay.nights,
      };
    });

  res.json({
    checkIn,
    checkOut,
    nights: stay.nights,
    guests: guestCount,
    totalMatching: results.length,
    availableCount: results.filter((r) => r.isAvailable).length,
    rooms: results,
  });
});

app.post('/api/quote', (req, res) => {
  const { roomId, checkIn, checkOut, addons: addonIds = [] } = req.body || {};

  const room = rooms.find((r) => r.id === roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const stay = validateStay(checkIn, checkOut);
  if (stay.error) return res.status(400).json({ error: stay.error });

  if (!Array.isArray(addonIds)) {
    return res.status(400).json({ error: 'addons must be an array of add-on ids' });
  }
  const unknown = addonIds.filter((id) => !addons.some((a) => a.id === id));
  if (unknown.length) {
    return res.status(400).json({ error: `Unknown add-on(s): ${unknown.join(', ')}` });
  }

  res.json(buildQuote(room, stay.nights, addonIds));
});

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+]?[\d\s-]{8,16}$/;

app.post('/api/bookings', async (req, res) => {
  const {
    roomId,
    checkIn,
    checkOut,
    guests,
    guestName,
    guestEmail,
    guestPhone,
    addons: addonIds = [],
    requests = '',
    paymentMethod = 'card',
  } = req.body || {};

  const room = rooms.find((r) => r.id === roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const stay = validateStay(checkIn, checkOut);
  if (stay.error) return res.status(400).json({ error: stay.error });

  const guestCount = Number(guests);
  if (!Number.isInteger(guestCount) || guestCount < 1) {
    return res.status(400).json({ error: 'guests must be a positive whole number' });
  }
  if (guestCount > room.maxGuests) {
    return res.status(400).json({
      error: `${room.name} allows a maximum of ${room.maxGuests} guest${room.maxGuests === 1 ? '' : 's'}`,
    });
  }

  if (!guestName || typeof guestName !== 'string' || guestName.trim().length < 2) {
    return res.status(400).json({ error: 'guestName is required' });
  }
  if (!guestEmail || !EMAIL_RE.test(guestEmail)) {
    return res.status(400).json({ error: 'A valid guestEmail is required' });
  }
  if (!guestPhone || !PHONE_RE.test(guestPhone)) {
    return res.status(400).json({ error: 'A valid guestPhone is required' });
  }

  if (!Array.isArray(addonIds)) {
    return res.status(400).json({ error: 'addons must be an array of add-on ids' });
  }
  const unknown = addonIds.filter((id) => !addons.some((a) => a.id === id));
  if (unknown.length) {
    return res.status(400).json({ error: `Unknown add-on(s): ${unknown.join(', ')}` });
  }

  // Re-check availability at the moment of booking, not just at search time.
  const allBookings = await store.list();
  if (availabilityFor(allBookings, room, stay.checkIn, stay.checkOut) < 1) {
    return res
      .status(409)
      .json({ error: `${room.name} is fully booked for those dates` });
  }

  const quote = buildQuote(room, stay.nights, addonIds);

  const booking = {
    id: 'PHR-' + crypto.randomUUID().split('-')[0].toUpperCase(),
    roomId: room.id,
    roomName: room.name,
    roomImage: room.image,
    checkIn,
    checkOut,
    nights: stay.nights,
    guests: guestCount,
    guestName: guestName.trim(),
    guestEmail: guestEmail.trim(),
    guestPhone: guestPhone.trim(),
    requests: String(requests).trim(),
    paymentMethod,
    pricing: quote,
    status: 'CONFIRMED',
    createdAt: new Date().toISOString(),
  };

  await store.create(booking);
  res.status(201).json(booking);
});

/**
 * Without `email` this is the full register (every guest's contact details),
 * so it is staff-only. With `email` it is the guest's own "find my booking"
 * lookup and stays open.
 */
app.get('/api/bookings', async (req, res) => {
  const { email, status } = req.query;

  if (!email) {
    const header = req.get('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token || !isValidToken(token)) {
      return res.status(401).json({ error: 'Staff sign-in required' });
    }
  }

  let result = await store.list();
  if (email) {
    result = result.filter(
      (b) => b.guestEmail.toLowerCase() === String(email).toLowerCase()
    );
  }
  if (status) {
    result = result.filter((b) => b.status === String(status).toUpperCase());
  }
  res.json([...result].sort((a, b) => a.checkIn.localeCompare(b.checkIn)));
});

app.get('/api/bookings/:id', async (req, res) => {
  const booking = await store.get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  res.json(booking);
});

app.patch('/api/bookings/:id', async (req, res) => {
  const { status } = req.body || {};
  const allowed = ['CONFIRMED', 'CANCELLED', 'CHECKED_IN', 'CHECKED_OUT'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });
  }

  // Guests may cancel their own booking; every other transition is a front-desk
  // operation and needs staff sign-in. This is checked before the booking is
  // looked up, so an unauthenticated caller cannot probe which ids exist.
  if (status !== 'CANCELLED') {
    const header = req.get('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token || !isValidToken(token)) {
      return res.status(401).json({ error: 'Staff sign-in required for this action' });
    }
  }

  const booking = await store.update(req.params.id, {
    status,
    updatedAt: new Date().toISOString(),
  });
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  res.json(booking);
});

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------
app.get('/api/admin/summary', requireAdmin, async (req, res) => {
  const today = todayUtc();
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  const bookings = await store.list();
  const active = bookings.filter(isActive);
  const occupiedToday = active.filter((b) => overlaps(b, today, tomorrow)).length;
  const totalUnits = rooms.reduce((sum, room) => sum + room.totalUnits, 0);

  const revenue = bookings
    .filter((b) => b.status !== 'CANCELLED')
    .reduce((sum, b) => sum + (b.pricing?.total || 0), 0);

  const todayStr = today.toISOString().slice(0, 10);

  res.json({
    totalRooms: totalUnits,
    occupiedToday,
    availableToday: totalUnits - occupiedToday,
    occupancyRate: totalUnits ? Math.round((occupiedToday / totalUnits) * 100) : 0,
    totalBookings: bookings.length,
    confirmedBookings: active.length,
    cancelledBookings: bookings.filter((b) => b.status === 'CANCELLED').length,
    revenue,
    arrivalsToday: active.filter((b) => b.checkIn === todayStr).length,
    departuresToday: active.filter((b) => b.checkOut === todayStr).length,
    roomBreakdown: rooms.map((room) => ({
      id: room.id,
      name: room.name,
      totalUnits: room.totalUnits,
      occupiedToday: active.filter(
        (b) => b.roomId === room.id && overlaps(b, today, tomorrow)
      ).length,
    })),
  });
});

// ---------------------------------------------------------------------------
// Fallbacks
// ---------------------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

store
  .init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend server running on http://localhost:${PORT}`);
      console.log(
        `Bookings storage: ${store.usingPostgres ? 'Postgres (DATABASE_URL)' : 'local file (backend/data/bookings.json)'}`
      );
      if (generatedPassword) {
        console.log('');
        console.log('  ┌─────────────────────────────────────────────────────┐');
        console.log('  │  ADMIN_PASSWORD not set — generated one for now.    │');
        console.log(`  │  Staff password:  ${generatedPassword.padEnd(34)}│`);
        console.log('  │  This changes on every restart. Set ADMIN_PASSWORD  │');
        console.log('  │  in backend/.env to keep it stable.                 │');
        console.log('  └─────────────────────────────────────────────────────┘');
        console.log('');
      }
    });
  })
  .catch((err) => {
    console.error('Failed to initialize the bookings store:', err);
    process.exit(1);
  });
