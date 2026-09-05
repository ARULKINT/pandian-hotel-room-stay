import { fetchBookings, updateBookingStatus } from '../api.js';
import { getDraft, updateDraft } from '../state.js';
import { header, bottomNav, loading, emptyState, toastMarkup, showToast } from '../components/layout.js';
import { formatINR, formatDateFull, formatDate, todayISO, escapeHtml } from '../format.js';

export const render = () => {
  const draft = getDraft();
  return `
${header({ title: 'My Stays' })}
<main class="flex-1 flex flex-col relative w-full pt-16 pb-24 bg-surface">
<div class="flex flex-col w-full">

  <section class="px-gutter-mobile py-space-md bg-surface-container-lowest shadow-sm">
    <div class="flex items-center gap-space-sm">
      <div class="w-12 h-12 rounded-full bg-secondary/15 flex items-center justify-center text-secondary flex-shrink-0">
        <span class="material-symbols-outlined text-2xl">person</span>
      </div>
      <div class="min-w-0 flex-1">
        <h2 class="font-headline-sm text-headline-sm text-on-surface truncate">${draft.guestName ? escapeHtml(draft.guestName) : 'Welcome, Guest'}</h2>
        <p class="font-body-sm text-body-sm text-on-surface-variant truncate">${
          draft.guestEmail
            ? escapeHtml(draft.guestEmail)
            : 'Book a room to see your stays here'
        }</p>
      </div>
    </div>
  </section>

  <section class="px-gutter-mobile pt-space-md">
    <form class="bg-surface-container-lowest rounded-xl p-space-sm shadow-sm flex items-center gap-space-xs" id="lookup-form">
      <span class="material-symbols-outlined text-outline flex-shrink-0">search</span>
      <input class="flex-1 min-w-0 bg-transparent font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/70 outline-none" id="lookup-email" placeholder="Find bookings by email" type="email" value="${escapeHtml(draft.guestEmail)}"/>
      <button class="px-space-sm py-1.5 rounded-lg bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-wider flex-shrink-0" type="submit">Find</button>
    </form>
  </section>

  <section class="px-gutter-mobile pt-space-lg" id="stays-root">
    ${loading('Loading your stays…')}
  </section>

  <section class="px-gutter-mobile pt-space-xl pb-space-lg">
    <div class="bg-surface-container-low rounded-xl p-space-md flex items-start gap-space-sm">
      <span class="material-symbols-outlined text-secondary flex-shrink-0">support_agent</span>
      <div class="min-w-0">
        <h4 class="font-label-md text-label-md uppercase tracking-wider text-on-surface mb-space-2xs">Front Desk</h4>
        <p class="font-body-sm text-body-sm text-on-surface-variant">Need anything? Call us on <a class="text-secondary underline" href="tel:+914522345678">+91 452 234 5678</a> — someone is at the desk 24 hours.</p>
      </div>
    </div>
  </section>

</div>
</main>
${toastMarkup()}
${bottomNav('stays')}
`;
};

const statusChip = (status) => {
  const map = {
    CONFIRMED: ['Confirmed', 'bg-tertiary-fixed text-on-tertiary-fixed'],
    CANCELLED: ['Cancelled', 'bg-error-container text-on-error-container'],
    CHECKED_IN: ['Checked in', 'bg-secondary-fixed text-on-secondary-fixed'],
    CHECKED_OUT: ['Completed', 'bg-surface-container text-on-surface-variant'],
  };
  const [label, classes] = map[status] || [status, 'bg-surface-container text-on-surface-variant'];
  return `<span class="px-2 py-0.5 rounded font-label-sm text-label-sm ${classes} flex-shrink-0">${label}</span>`;
};

const bookingCard = (booking, { upcoming }) => `
  <div class="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm" data-booking="${escapeHtml(booking.id)}">
    ${
      upcoming
        ? `<div class="relative w-full h-40 bg-surface-container">
             <img class="w-full h-full object-cover" alt="${escapeHtml(booking.roomName)}" src="${escapeHtml(booking.roomImage)}"/>
             <div class="absolute inset-0 bg-gradient-to-t from-primary/70 via-transparent to-transparent"></div>
             <div class="absolute top-3 left-3 bg-surface-container-lowest/90 backdrop-blur-md px-2.5 py-1 rounded-full">
               <p class="font-label-sm text-label-sm text-on-surface tracking-wider uppercase font-medium">${escapeHtml(booking.id)}</p>
             </div>
             <div class="absolute bottom-3 left-4 right-4">
               <h3 class="font-headline-md text-headline-md text-on-primary leading-tight">${escapeHtml(booking.roomName)}</h3>
               <p class="font-body-sm text-body-sm text-on-primary/85 flex items-center gap-1 mt-0.5">
                 <span class="material-symbols-outlined text-xs">calendar_month</span>
                 ${formatDate(booking.checkIn)} – ${formatDate(booking.checkOut)} · ${booking.nights} night${booking.nights === 1 ? '' : 's'}
               </p>
             </div>
           </div>`
        : ''
    }
    <div class="p-space-md flex flex-col gap-space-sm">
      ${
        upcoming
          ? ''
          : `<div class="flex items-start justify-between gap-space-xs">
               <div class="min-w-0">
                 <h4 class="font-headline-sm text-headline-sm text-on-surface truncate">${escapeHtml(booking.roomName)}</h4>
                 <p class="font-body-sm text-body-sm text-on-surface-variant mt-0.5">${formatDate(booking.checkIn)} – ${formatDate(booking.checkOut)} · ${escapeHtml(booking.id)}</p>
               </div>
               ${statusChip(booking.status)}
             </div>`
      }

      ${
        upcoming
          ? `<div class="flex items-center justify-between gap-space-xs">
               ${statusChip(booking.status)}
               <span class="font-headline-sm text-headline-sm text-on-surface font-semibold">${formatINR(booking.pricing.total)}</span>
             </div>
             <div class="p-space-sm rounded-lg bg-surface-container-low">
               <p class="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant mb-0.5">Check-in</p>
               <p class="font-body-md text-body-md text-on-surface">${formatDateFull(booking.checkIn)}, from 12:00 noon</p>
               <p class="font-body-sm text-body-sm text-on-surface-variant mt-1">${booking.guests} guest${booking.guests === 1 ? '' : 's'} · ${booking.paymentMethod === 'cash' ? 'Pay at hotel' : 'Paid online'}</p>
             </div>`
          : `<div class="flex items-center justify-between">
               <span class="font-body-sm text-body-sm text-on-surface-variant">${booking.nights} night${booking.nights === 1 ? '' : 's'} · ${booking.guests} guest${booking.guests === 1 ? '' : 's'}</span>
               <span class="font-label-lg text-label-lg text-on-surface font-medium">${formatINR(booking.pricing.total)}</span>
             </div>`
      }

      <div class="flex items-center gap-2">
        <a class="flex-1 py-2 px-3 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors flex items-center justify-center gap-1 text-on-surface font-label-sm text-label-sm" href="#/confirmation/${escapeHtml(booking.id)}">
          <span class="material-symbols-outlined text-base">receipt_long</span>
          <span>View Details</span>
        </a>
        ${
          booking.status === 'CONFIRMED' && upcoming
            ? `<button class="flex-1 py-2 px-3 rounded-lg bg-surface-container hover:bg-error-container hover:text-on-error-container transition-colors flex items-center justify-center gap-1 text-on-surface font-label-sm text-label-sm" data-cancel="${escapeHtml(booking.id)}">
                 <span class="material-symbols-outlined text-base">close</span>
                 <span>Cancel</span>
               </button>`
            : `<button class="flex-1 py-2 px-3 rounded-lg bg-primary text-on-primary hover:bg-primary-container transition-colors flex items-center justify-center gap-1 font-label-sm text-label-sm shadow-sm" data-rebook="${escapeHtml(booking.roomId)}">
                 <span class="material-symbols-outlined text-base">repeat</span>
                 <span>Book Again</span>
               </button>`
        }
      </div>
    </div>
  </div>`;

const listMarkup = (bookings) => {
  const today = todayISO();
  const upcoming = bookings.filter((b) => b.checkOut >= today && b.status !== 'CANCELLED');
  const past = bookings.filter((b) => b.checkOut < today || b.status === 'CANCELLED');

  return `
    ${
      upcoming.length
        ? `<div class="mb-space-xl">
             <div class="flex items-center justify-between mb-space-xs">
               <h3 class="font-headline-sm text-headline-sm text-on-surface">Upcoming</h3>
               <span class="font-label-sm text-label-sm text-secondary uppercase tracking-wider">${upcoming.length}</span>
             </div>
             <div class="space-y-space-md">${upcoming.map((b) => bookingCard(b, { upcoming: true })).join('')}</div>
           </div>`
        : ''
    }
    ${
      past.length
        ? `<div>
             <div class="flex items-center justify-between mb-space-xs">
               <h3 class="font-headline-sm text-headline-sm text-on-surface">Past &amp; Cancelled</h3>
               <span class="font-label-sm text-label-sm text-on-surface-variant">${past.length}</span>
             </div>
             <div class="space-y-space-sm">${past.map((b) => bookingCard(b, { upcoming: false })).join('')}</div>
           </div>`
        : ''
    }`;
};

export const mount = () => {
  const root = document.getElementById('stays-root');
  const form = document.getElementById('lookup-form');
  const emailInput = document.getElementById('lookup-email');

  const load = async (email) => {
    if (!email) {
      root.innerHTML = emptyState({
        icon: 'luggage',
        title: 'No stays yet',
        message: 'Book a room and it will appear here. Already booked? Enter the email you used above.',
        actionLabel: 'Browse Rooms',
        actionHref: '#/rooms',
      });
      return;
    }

    root.innerHTML = loading('Loading your stays…');
    try {
      const bookings = await fetchBookings({ email });
      if (!bookings.length) {
        root.innerHTML = emptyState({
          icon: 'search_off',
          title: 'No bookings for that email',
          message: `We could not find any booking under ${email}. Check the spelling, or book a room.`,
          actionLabel: 'Browse Rooms',
          actionHref: '#/rooms',
        });
        return;
      }

      root.innerHTML = listMarkup(bookings);

      root.querySelectorAll('[data-cancel]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.cancel;
          if (!window.confirm('Cancel this booking? Free of charge up to 48 hours before check-in.')) {
            return;
          }
          btn.disabled = true;
          try {
            await updateBookingStatus(id, 'CANCELLED');
            showToast('Booking cancelled');
            load(email);
          } catch (err) {
            console.error('Cancel failed:', err);
            showToast(err.message);
            btn.disabled = false;
          }
        });
      });

      root.querySelectorAll('[data-rebook]').forEach((btn) => {
        btn.addEventListener('click', () => {
          updateDraft({ roomId: btn.dataset.rebook });
          window.location.hash = `#/room-details/${btn.dataset.rebook}`;
        });
      });
    } catch (err) {
      console.error('Could not load stays:', err);
      root.innerHTML = emptyState({
        icon: 'wifi_off',
        title: 'Could not load your stays',
        message: err.message,
      });
    }
  };

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const email = emailInput.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('Please enter a valid email address');
      return;
    }
    updateDraft({ guestEmail: email });
    load(email);
  });

  load(getDraft().guestEmail);
};
