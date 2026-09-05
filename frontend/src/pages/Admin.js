import {
  fetchAdminSummary,
  fetchBookings,
  updateBookingStatus,
  adminLogin,
  adminLogout,
  verifyAdminSession,
  getAdminToken,
  AuthError,
} from '../api.js';
import { header, loading, emptyState, toastMarkup, showToast } from '../components/layout.js';
import { formatINR, formatDate, todayISO, escapeHtml } from '../format.js';

/**
 * DEMO-ONLY convenience: prefills the staff password so a local walkthrough
 * doesn't need the password read out loud. Must match backend/.env's
 * ADMIN_PASSWORD for the prefill to actually sign in.
 *
 * Gated on `import.meta.env.DEV` — Vite statically replaces this with
 * `false` in a production build (`vite build`) and dead-code-eliminates the
 * branch, so this value never ships. Remove entirely before any real
 * deployment regardless.
 */
const DEMO_PASSWORD = import.meta.env.DEV ? 'pandian@2026' : null;

export const render = () => `
${header({ title: 'Operations', back: true })}
<main class="flex-1 flex flex-col relative w-full pt-16 pb-space-2xl bg-surface" id="admin-main">
  ${loading('Checking your session…')}
</main>
${toastMarkup()}
`;

const loginMarkup = () => `
<div class="flex flex-col items-center justify-center px-gutter-mobile py-space-3xl">
  <div class="w-full max-w-sm bg-surface-container-lowest rounded-xl p-space-lg shadow-sm">
    <div class="w-14 h-14 rounded-full bg-secondary/15 flex items-center justify-center text-secondary mx-auto mb-space-md">
      <span class="material-symbols-outlined text-3xl">lock</span>
    </div>
    <h2 class="font-headline-md text-headline-md text-on-surface text-center">Staff Sign In</h2>
    <p class="font-body-md text-body-md text-on-surface-variant text-center mt-space-2xs mb-space-md">
      The Operations panel is for hotel staff. Please enter the front-desk password.
    </p>
    ${
      DEMO_PASSWORD
        ? `<div class="flex items-center gap-1.5 bg-secondary-container/40 text-on-secondary-container rounded-lg px-space-sm py-2 mb-space-sm">
             <span class="material-symbols-outlined text-base flex-shrink-0">info</span>
             <span class="font-body-sm text-body-sm">Demo mode: password is prefilled below. Just tap Sign In.</span>
           </div>`
        : ''
    }
    <form id="admin-login-form" novalidate>
      <label class="block font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant mb-1" for="admin-password">Password</label>
      <div class="relative">
        <span class="material-symbols-outlined absolute left-3 top-3 text-outline text-lg pointer-events-none">key</span>
        <input class="w-full pl-10 pr-3 py-2.5 bg-surface-container-low rounded-lg text-on-surface font-body-md text-body-md focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-secondary transition-all" id="admin-password" type="password" autocomplete="current-password" placeholder="Enter password" value="${escapeHtml(DEMO_PASSWORD || '')}" required/>
      </div>
      <p class="font-body-sm text-body-sm text-error mt-2 hidden" id="admin-login-error" role="alert"></p>
      <button class="w-full mt-space-md py-3 px-space-md rounded-xl bg-secondary hover:bg-on-secondary-container text-on-secondary font-label-md text-label-md uppercase tracking-wider flex items-center justify-center gap-space-xs transition-all shadow-md" type="submit" id="admin-login-btn">
        <span id="admin-login-label">Sign In</span>
        <span class="material-symbols-outlined text-base">arrow_forward</span>
      </button>
    </form>
    <a class="block text-center mt-space-md font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant hover:text-on-surface" href="#/home">Back to guest site</a>
  </div>
</div>`;

const dashboardMarkup = () => `
<div class="flex flex-col w-full">

  <section class="px-gutter-mobile pt-space-md pb-space-sm flex items-start justify-between gap-space-sm">
    <div class="min-w-0">
      <span class="font-label-sm text-label-sm uppercase tracking-widest text-secondary block mb-space-2xs">Staff only</span>
      <h2 class="font-headline-lg text-headline-lg text-on-surface tracking-tight">Front Desk Operations</h2>
      <p class="font-body-md text-body-md text-on-surface-variant mt-space-2xs">Live occupancy, arrivals and the full booking register.</p>
    </div>
    <button class="flex-shrink-0 flex items-center gap-1 px-space-sm py-2 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors text-on-surface font-label-sm text-label-sm uppercase tracking-wider" id="admin-logout">
      <span class="material-symbols-outlined text-base">logout</span>
      <span>Sign out</span>
    </button>
  </section>

  <section class="px-gutter-mobile mb-space-md" id="admin-stats">${loading('Loading dashboard…')}</section>

  <section class="px-gutter-mobile mb-space-sm">
    <div class="flex items-center gap-space-xs overflow-x-auto no-scrollbar py-1" id="admin-filters">
      ${[
        { id: 'all', label: 'All' },
        { id: 'arrivals', label: 'Arrivals Today' },
        { id: 'inhouse', label: 'In House' },
        { id: 'CONFIRMED', label: 'Confirmed' },
        { id: 'CANCELLED', label: 'Cancelled' },
      ]
        .map(
          (f, i) => `
        <button class="admin-filter px-4 py-2 rounded-full font-label-sm text-label-sm tracking-wider uppercase whitespace-nowrap transition-colors ${
          i === 0 ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
        }" data-filter="${f.id}">${f.label}</button>`
        )
        .join('')}
    </div>
  </section>

  <section class="px-gutter-mobile space-y-space-sm mb-space-xl" id="admin-bookings">${loading('Loading bookings…')}</section>

</div>`;

const statCard = (label, value, sub, icon) => `
  <div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-space-2xs">
    <div class="flex items-center justify-between">
      <span class="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">${label}</span>
      <span class="material-symbols-outlined text-lg text-secondary">${icon}</span>
    </div>
    <span class="font-headline-lg text-headline-lg text-on-surface font-semibold leading-none">${value}</span>
    ${sub ? `<span class="font-body-sm text-body-sm text-on-surface-variant">${sub}</span>` : ''}
  </div>`;

const statsMarkup = (summary) => `
  <div class="grid grid-cols-2 gap-space-xs mb-space-sm">
    ${statCard('Occupancy', `${summary.occupancyRate}%`, `${summary.occupiedToday} of ${summary.totalRooms} rooms`, 'donut_large')}
    ${statCard('Available', summary.availableToday, 'rooms free today', 'meeting_room')}
    ${statCard('Arrivals', summary.arrivalsToday, 'checking in today', 'login')}
    ${statCard('Departures', summary.departuresToday, 'checking out today', 'logout')}
  </div>
  <div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm">
    <div class="flex items-center justify-between mb-space-sm">
      <h3 class="font-headline-sm text-headline-sm text-on-surface">Revenue &amp; Bookings</h3>
      <span class="font-label-sm text-label-sm uppercase tracking-wider text-secondary">All time</span>
    </div>
    <div class="grid grid-cols-3 gap-space-sm text-center">
      <div>
        <span class="font-headline-sm text-headline-sm text-on-surface font-semibold block">${formatINR(summary.revenue)}</span>
        <span class="font-body-sm text-body-sm text-on-surface-variant">Revenue</span>
      </div>
      <div>
        <span class="font-headline-sm text-headline-sm text-on-surface font-semibold block">${summary.confirmedBookings}</span>
        <span class="font-body-sm text-body-sm text-on-surface-variant">Confirmed</span>
      </div>
      <div>
        <span class="font-headline-sm text-headline-sm text-on-surface font-semibold block">${summary.cancelledBookings}</span>
        <span class="font-body-sm text-body-sm text-on-surface-variant">Cancelled</span>
      </div>
    </div>
  </div>
  <div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm mt-space-sm">
    <h3 class="font-headline-sm text-headline-sm text-on-surface mb-space-sm">Rooms Occupied Today</h3>
    <div class="space-y-space-xs">
      ${summary.roomBreakdown
        .map((room) => {
          const pct = room.totalUnits ? Math.round((room.occupiedToday / room.totalUnits) * 100) : 0;
          return `
          <div>
            <div class="flex items-center justify-between mb-1">
              <span class="font-body-sm text-body-sm text-on-surface truncate pr-2">${escapeHtml(room.name)}</span>
              <span class="font-label-sm text-label-sm text-on-surface-variant flex-shrink-0">${room.occupiedToday}/${room.totalUnits}</span>
            </div>
            <div class="h-1.5 rounded-full bg-surface-container-high overflow-hidden">
              <div class="h-full bg-secondary rounded-full" style="width: ${pct}%"></div>
            </div>
          </div>`;
        })
        .join('')}
    </div>
  </div>`;

const bookingRow = (booking) => {
  const statusStyles = {
    CONFIRMED: 'bg-tertiary-fixed text-on-tertiary-fixed',
    CANCELLED: 'bg-error-container text-on-error-container',
    CHECKED_IN: 'bg-secondary-fixed text-on-secondary-fixed',
    CHECKED_OUT: 'bg-surface-container text-on-surface-variant',
  };

  return `
  <div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm">
    <div class="flex items-start justify-between gap-space-xs mb-space-xs">
      <div class="min-w-0">
        <div class="flex items-center gap-space-xs mb-0.5">
          <span class="font-label-sm text-label-sm uppercase tracking-wider text-secondary">${escapeHtml(booking.id)}</span>
          <span class="px-2 py-0.5 rounded font-label-sm text-label-sm ${statusStyles[booking.status] || 'bg-surface-container'} flex-shrink-0">${booking.status.replace('_', ' ')}</span>
        </div>
        <h4 class="font-headline-sm text-headline-sm text-on-surface truncate">${escapeHtml(booking.guestName)}</h4>
        <p class="font-body-sm text-body-sm text-on-surface-variant truncate">${escapeHtml(booking.roomName)} · ${booking.guests} guest${booking.guests === 1 ? '' : 's'}</p>
      </div>
      <span class="font-label-lg text-label-lg text-on-surface font-medium flex-shrink-0">${formatINR(booking.pricing.total)}</span>
    </div>

    <div class="flex items-center gap-space-md font-body-sm text-body-sm text-on-surface-variant mb-space-sm">
      <span class="flex items-center gap-1"><span class="material-symbols-outlined text-sm text-secondary">login</span>${formatDate(booking.checkIn)}</span>
      <span class="flex items-center gap-1"><span class="material-symbols-outlined text-sm text-secondary">logout</span>${formatDate(booking.checkOut)}</span>
      <span class="flex items-center gap-1"><span class="material-symbols-outlined text-sm text-secondary">call</span>${escapeHtml(booking.guestPhone)}</span>
    </div>

    ${
      booking.requests
        ? `<p class="font-body-sm text-body-sm text-on-surface-variant bg-surface-container-low rounded-lg p-space-xs mb-space-sm"><span class="text-secondary">Request:</span> ${escapeHtml(booking.requests)}</p>`
        : ''
    }

    <div class="flex items-center gap-2 flex-wrap">
      ${
        booking.status === 'CONFIRMED'
          ? `<button class="flex-1 min-w-[120px] py-2 px-3 rounded-lg bg-primary text-on-primary font-label-sm text-label-sm flex items-center justify-center gap-1" data-status="CHECKED_IN" data-id="${escapeHtml(booking.id)}">
               <span class="material-symbols-outlined text-base">login</span><span>Check In</span>
             </button>
             <button class="flex-1 min-w-[120px] py-2 px-3 rounded-lg bg-surface-container hover:bg-error-container hover:text-on-error-container font-label-sm text-label-sm flex items-center justify-center gap-1 text-on-surface" data-status="CANCELLED" data-id="${escapeHtml(booking.id)}">
               <span class="material-symbols-outlined text-base">close</span><span>Cancel</span>
             </button>`
          : booking.status === 'CHECKED_IN'
            ? `<button class="flex-1 py-2 px-3 rounded-lg bg-primary text-on-primary font-label-sm text-label-sm flex items-center justify-center gap-1" data-status="CHECKED_OUT" data-id="${escapeHtml(booking.id)}">
                 <span class="material-symbols-outlined text-base">logout</span><span>Check Out</span>
               </button>`
            : `<button class="flex-1 py-2 px-3 rounded-lg bg-surface-container text-on-surface font-label-sm text-label-sm flex items-center justify-center gap-1" data-status="CONFIRMED" data-id="${escapeHtml(booking.id)}">
                 <span class="material-symbols-outlined text-base">undo</span><span>Reinstate</span>
               </button>`
      }
    </div>
  </div>`;
};

export const mount = () => {
  const main = document.getElementById('admin-main');
  let statsEl;
  let listEl;
  let allBookings = [];
  let activeFilter = 'all';

  const paint = () => {
    const today = todayISO();
    let list = allBookings;

    if (activeFilter === 'arrivals') list = list.filter((b) => b.checkIn === today && b.status === 'CONFIRMED');
    else if (activeFilter === 'inhouse') list = list.filter((b) => b.status === 'CHECKED_IN');
    else if (activeFilter !== 'all') list = list.filter((b) => b.status === activeFilter);

    if (!list.length) {
      listEl.innerHTML = emptyState({
        icon: 'inbox',
        title: 'Nothing here',
        message: 'No bookings match this filter right now.',
      });
      return;
    }

    listEl.innerHTML = list.map(bookingRow).join('');

    listEl.querySelectorAll('[data-status]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          await updateBookingStatus(btn.dataset.id, btn.dataset.status);
          showToast(`${btn.dataset.id} → ${btn.dataset.status.replace('_', ' ').toLowerCase()}`);
          await load();
        } catch (err) {
          if (err instanceof AuthError) return showLogin('Your session expired. Please sign in again.');
          console.error('Status update failed:', err);
          showToast(err.message);
          btn.disabled = false;
        }
      });
    });
  };

  const load = async () => {
    try {
      const [summary, bookings] = await Promise.all([fetchAdminSummary(), fetchBookings()]);
      statsEl.innerHTML = statsMarkup(summary);
      allBookings = bookings;
      paint();
    } catch (err) {
      if (err instanceof AuthError) return showLogin('Your session expired. Please sign in again.');
      console.error('Admin load failed:', err);
      statsEl.innerHTML = '';
      listEl.innerHTML = emptyState({
        icon: 'wifi_off',
        title: 'Could not load operations data',
        message: err.message,
      });
    }
  };

  /** Swaps the panel for the sign-in form. */
  function showLogin(message) {
    main.innerHTML = loginMarkup();

    const form = document.getElementById('admin-login-form');
    const input = document.getElementById('admin-password');
    const errorEl = document.getElementById('admin-login-error');
    const btn = document.getElementById('admin-login-btn');
    const label = document.getElementById('admin-login-label');

    const setError = (text) => {
      errorEl.textContent = text || '';
      errorEl.classList.toggle('hidden', !text);
    };
    if (message) setError(message);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const password = input.value;
      if (!password) return setError('Please enter the password.');

      setError('');
      btn.disabled = true;
      label.textContent = 'Signing in…';

      try {
        await adminLogin(password);
        showPanel();
      } catch (err) {
        setError(err.message);
        input.value = '';
        input.focus();
        btn.disabled = false;
        label.textContent = 'Sign In';
      }
    });

    input.focus();
  }

  /** Swaps the sign-in form for the panel and wires it up. */
  function showPanel() {
    main.innerHTML = dashboardMarkup();
    statsEl = document.getElementById('admin-stats');
    listEl = document.getElementById('admin-bookings');

    document.querySelectorAll('.admin-filter').forEach((chip) => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.admin-filter').forEach((c) => {
          c.classList.remove('bg-primary', 'text-on-primary', 'shadow-sm');
          c.classList.add('bg-surface-container-low', 'text-on-surface-variant');
        });
        chip.classList.remove('bg-surface-container-low', 'text-on-surface-variant');
        chip.classList.add('bg-primary', 'text-on-primary', 'shadow-sm');
        activeFilter = chip.dataset.filter;
        paint();
      });
    });

    document.getElementById('admin-logout')?.addEventListener('click', async () => {
      await adminLogout();
      showToast('Signed out');
      showLogin();
    });

    load();
  }

  // Revalidate any stored token with the server before trusting it.
  if (!getAdminToken()) {
    showLogin();
  } else {
    verifyAdminSession()
      .then(showPanel)
      .catch(() => showLogin('Your session expired. Please sign in again.'));
  }
};
