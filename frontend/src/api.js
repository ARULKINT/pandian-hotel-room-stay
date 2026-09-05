const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const TOKEN_KEY = 'phr.admin.token';

// --- staff session -----------------------------------------------------------
// Held in sessionStorage so it dies with the tab rather than lingering on a
// shared front-desk machine.
export const getAdminToken = () => {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

const setAdminToken = (token) => {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
};

/** Thrown when the server rejects the staff session, so callers can re-prompt. */
export class AuthError extends Error {}

/**
 * Wraps fetch so every caller gets a real Error carrying the server's message
 * rather than an opaque failure.
 */
const request = async (path, options = {}) => {
  const { auth, ...rest } = options;
  const headers = { 'Content-Type': 'application/json', ...(rest.headers || {}) };

  if (auth) {
    const token = getAdminToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...rest, headers });
  } catch {
    throw new Error('Cannot reach the server. Please check your connection.');
  }

  let payload = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const message = payload?.error || `Request failed (${response.status})`;
    if (response.status === 401) {
      setAdminToken(null); // stale or missing session — force a fresh sign-in
      throw new AuthError(message);
    }
    throw new Error(message);
  }
  return payload;
};

const query = (params) => {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  });
  const str = search.toString();
  return str ? `?${str}` : '';
};

// Rooms
export const fetchRooms = (params) => request(`/api/rooms${query(params)}`);
export const fetchRoom = (id, params) => request(`/api/rooms/${id}${query(params)}`);

// Facilities & add-ons
export const fetchFacilities = () => request('/api/facilities');
export const fetchFacility = (id) => request(`/api/facilities/${id}`);
export const fetchAddons = () => request('/api/addons');

// Availability & pricing
export const fetchAvailability = (params) => request(`/api/availability${query(params)}`);
export const fetchQuote = (body) =>
  request('/api/quote', { method: 'POST', body: JSON.stringify(body) });

// Bookings
export const createBooking = (body) =>
  request('/api/bookings', { method: 'POST', body: JSON.stringify(body) });
// Without an email this is the staff register, so it carries the session token.
export const fetchBookings = (params) =>
  request(`/api/bookings${query(params)}`, { auth: !params?.email });
export const fetchBooking = (id) => request(`/api/bookings/${id}`);
export const updateBookingStatus = (id, status) =>
  request(`/api/bookings/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
    // Anything other than a guest self-cancellation needs the staff session.
    auth: status !== 'CANCELLED',
  });

// Admin
export const fetchAdminSummary = () => request('/api/admin/summary', { auth: true });

export const adminLogin = async (password) => {
  const result = await request('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
  setAdminToken(result.token);
  return result;
};

export const adminLogout = async () => {
  try {
    await request('/api/admin/logout', { method: 'POST', auth: true });
  } catch {
    /* token already gone server-side — clearing locally is enough */
  }
  setAdminToken(null);
};

export const verifyAdminSession = () => request('/api/admin/session', { auth: true });
