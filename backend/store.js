// Bookings persistence, in one of two modes:
//
// - DATABASE_URL set     -> Postgres (survives redeploys — use this in production,
//                           e.g. a free Neon/Supabase database on Render)
// - DATABASE_URL not set -> bookings.json on local disk (fine for local dev;
//                           on Render's free tier this resets on every redeploy)
//
// Every other route in server.js only ever calls the functions below — it
// never touches a file or a SQL client directly.
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json');

const usingPostgres = Boolean(process.env.DATABASE_URL);

let pool = null;
let jsonBookings = [];

if (usingPostgres) {
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Neon/Supabase both terminate TLS with certs that Node's default trust
    // store doesn't chase down; this matches what their own docs recommend
    // for a plain `pg` client.
    ssl: { rejectUnauthorized: false },
  });
} else {
  try {
    if (fs.existsSync(BOOKINGS_FILE)) {
      jsonBookings = JSON.parse(fs.readFileSync(BOOKINGS_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Could not read bookings.json, starting empty:', err.message);
  }
}

const persistJson = () => {
  try {
    fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(jsonBookings, null, 2));
  } catch (err) {
    console.error('Could not persist bookings:', err.message);
  }
};

/** Creates the bookings table on first boot. No-op in JSON-file mode. */
const init = async () => {
  if (!usingPostgres) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL
    )
  `);
};

const list = async () => {
  if (!usingPostgres) return jsonBookings;
  const { rows } = await pool.query('SELECT data FROM bookings ORDER BY id');
  return rows.map((row) => row.data);
};

const get = async (id) => {
  if (!usingPostgres) return jsonBookings.find((b) => b.id === id) || null;
  const { rows } = await pool.query('SELECT data FROM bookings WHERE id = $1', [id]);
  return rows[0]?.data || null;
};

const create = async (booking) => {
  if (!usingPostgres) {
    jsonBookings.push(booking);
    persistJson();
    return booking;
  }
  await pool.query('INSERT INTO bookings (id, data) VALUES ($1, $2::jsonb)', [
    booking.id,
    JSON.stringify(booking),
  ]);
  return booking;
};

/** Merges `patch` onto the existing booking and saves it. Returns null if `id` doesn't exist. */
const update = async (id, patch) => {
  if (!usingPostgres) {
    const booking = jsonBookings.find((b) => b.id === id);
    if (!booking) return null;
    Object.assign(booking, patch);
    persistJson();
    return booking;
  }
  const existing = await get(id);
  if (!existing) return null;
  const updated = { ...existing, ...patch };
  await pool.query('UPDATE bookings SET data = $2::jsonb WHERE id = $1', [
    id,
    JSON.stringify(updated),
  ]);
  return updated;
};

module.exports = { init, list, get, create, update, usingPostgres };
