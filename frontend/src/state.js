import { todayISO, addDays, nightsBetween } from './format.js';

const KEY = 'phr.booking.draft';

const defaults = () => ({
  checkIn: addDays(todayISO(), 1),
  checkOut: addDays(todayISO(), 3),
  guests: 2,
  roomId: null,
  addons: [], // never pre-select a paid add-on the guest didn't choose

  guestName: '',
  guestEmail: '',
  guestPhone: '',
  requests: '',
  paymentMethod: 'card',
});

let draft = null;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Stored state is untrusted: it can be stale, hand-edited, or written by an
 * older version of the app. Anything that fails validation falls back to the
 * default rather than being passed on to the API.
 */
const sanitise = (raw) => {
  const base = defaults();
  if (!raw || typeof raw !== 'object') return base;

  const clean = { ...base };

  if (ISO_DATE.test(raw.checkIn) && ISO_DATE.test(raw.checkOut)) {
    clean.checkIn = raw.checkIn;
    clean.checkOut = raw.checkOut;
  }

  const guests = Number(raw.guests);
  if (Number.isInteger(guests) && guests >= 1 && guests <= 10) clean.guests = guests;

  if (typeof raw.roomId === 'string' && raw.roomId) clean.roomId = raw.roomId;
  if (Array.isArray(raw.addons)) clean.addons = raw.addons.filter((a) => typeof a === 'string');

  ['guestName', 'guestEmail', 'guestPhone', 'requests', 'paymentMethod'].forEach((key) => {
    if (typeof raw[key] === 'string') clean[key] = raw[key];
  });

  return clean;
};

const read = () => {
  try {
    const stored = sessionStorage.getItem(KEY);
    if (!stored) return defaults();
    return sanitise(JSON.parse(stored));
  } catch {
    return defaults();
  }
};

const write = (value) => {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode) — keep the in-memory copy */
  }
};

/**
 * The in-progress booking. Kept in sessionStorage so dates, guests, room and
 * add-ons survive navigation between pages instead of being re-hardcoded on
 * each screen.
 */
export const getDraft = () => {
  if (!draft) draft = read();

  // Never hand back a stay that has slipped into the past.
  if (draft.checkIn < todayISO()) {
    draft.checkIn = addDays(todayISO(), 1);
    draft.checkOut = addDays(todayISO(), 3);
    write(draft);
  }
  return { ...draft };
};

export const updateDraft = (patch) => {
  // Run the merged result through the same validation as stored state, so a
  // bad value from a caller can never reach the API.
  draft = sanitise({ ...getDraft(), ...patch });

  // Keep the window coherent: check-out always after check-in.
  if (nightsBetween(draft.checkIn, draft.checkOut) < 1) {
    draft.checkOut = addDays(draft.checkIn, 1);
  }
  write(draft);
  return { ...draft };
};

export const resetDraft = () => {
  draft = defaults();
  write(draft);
  return { ...draft };
};

export const getNights = () => {
  const { checkIn, checkOut } = getDraft();
  return nightsBetween(checkIn, checkOut);
};

export const toggleAddon = (id) => {
  const { addons } = getDraft();
  const next = addons.includes(id) ? addons.filter((a) => a !== id) : [...addons, id];
  return updateDraft({ addons: next });
};

// --- rooms selected for comparison -----------------------------------------
const COMPARE_KEY = 'phr.compare';

export const getCompareList = () => {
  try {
    return JSON.parse(sessionStorage.getItem(COMPARE_KEY) || '[]');
  } catch {
    return [];
  }
};

export const toggleCompare = (roomId) => {
  const list = getCompareList();
  const next = list.includes(roomId)
    ? list.filter((id) => id !== roomId)
    : [...list, roomId].slice(-3); // compare at most three
  try {
    sessionStorage.setItem(COMPARE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
};

export const clearCompare = () => {
  try {
    sessionStorage.removeItem(COMPARE_KEY);
  } catch {
    /* ignore */
  }
};
