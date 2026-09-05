import { fetchBooking } from '../api.js';
import { header, bottomNav, loading, emptyState, toastMarkup, showToast } from '../components/layout.js';
import { formatINR, formatDateFull, escapeHtml } from '../format.js';

export const render = () => `
${header({ title: 'Booking Confirmed' })}
<main class="flex-1 flex flex-col relative w-full pt-16 pb-24 bg-surface">
  <div class="flex flex-col w-full" id="confirmation-root">
    ${loading('Fetching your booking…')}
  </div>
</main>
${toastMarkup()}
${bottomNav('stays')}
`;

const bodyMarkup = (booking) => `
  <section class="px-gutter-mobile pt-space-lg pb-space-md text-center">
    <div class="w-16 h-16 mx-auto rounded-full bg-tertiary-fixed flex items-center justify-center mb-space-sm">
      <span class="material-symbols-outlined text-3xl text-on-tertiary-fixed" style="font-variation-settings: 'FILL' 1;">check_circle</span>
    </div>
    <h2 class="font-headline-lg text-headline-lg text-on-surface tracking-tight">Booking Confirmed</h2>
    <p class="font-body-md text-body-md text-on-surface-variant mt-space-2xs max-w-sm mx-auto">
      Thank you, ${escapeHtml(booking.guestName.split(' ')[0])}! We've sent the details to ${escapeHtml(booking.guestEmail)}.
    </p>
    <div class="inline-flex items-center gap-2 mt-space-sm px-space-md py-2 rounded-full bg-surface-container-low">
      <span class="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Booking ID</span>
      <span class="font-label-lg text-label-lg text-on-surface font-semibold">${escapeHtml(booking.id)}</span>
      <button class="text-secondary hover:text-on-surface" id="copy-id" aria-label="Copy booking ID">
        <span class="material-symbols-outlined text-base">content_copy</span>
      </button>
    </div>
  </section>

  <section class="px-gutter-mobile mb-space-md">
    <div class="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm">
      <div class="relative w-full h-40 bg-surface-container">
        <img class="w-full h-full object-cover" alt="${escapeHtml(booking.roomName)}" src="${escapeHtml(booking.roomImage)}"/>
        <div class="absolute inset-0 bg-gradient-to-t from-primary/70 to-transparent"></div>
        <div class="absolute bottom-3 left-4 right-4">
          <h3 class="font-headline-md text-headline-md text-on-primary leading-tight">${escapeHtml(booking.roomName)}</h3>
        </div>
      </div>
      <div class="p-space-md space-y-space-sm">
        <div class="grid grid-cols-2 gap-space-sm">
          <div>
            <span class="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant block">Check-in</span>
            <span class="font-body-md text-body-md text-on-surface">${formatDateFull(booking.checkIn)}</span>
            <span class="font-body-sm text-body-sm text-on-surface-variant block">From 12:00 noon</span>
          </div>
          <div>
            <span class="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant block">Check-out</span>
            <span class="font-body-md text-body-md text-on-surface">${formatDateFull(booking.checkOut)}</span>
            <span class="font-body-sm text-body-sm text-on-surface-variant block">By 11:00 AM</span>
          </div>
        </div>
        <div class="pt-space-sm border-t border-surface-container-high grid grid-cols-2 gap-space-sm">
          <div>
            <span class="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant block">Guests</span>
            <span class="font-body-md text-body-md text-on-surface">${booking.guests} guest${booking.guests === 1 ? '' : 's'}</span>
          </div>
          <div>
            <span class="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant block">Nights</span>
            <span class="font-body-md text-body-md text-on-surface">${booking.nights}</span>
          </div>
        </div>
        ${
          booking.requests
            ? `<div class="pt-space-sm border-t border-surface-container-high">
                 <span class="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant block">Your requests</span>
                 <span class="font-body-sm text-body-sm text-on-surface-variant">${escapeHtml(booking.requests)}</span>
               </div>`
            : ''
        }
      </div>
    </div>
  </section>

  <section class="px-gutter-mobile mb-space-md">
    <div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm">
      <h4 class="font-headline-sm text-headline-sm text-on-surface mb-space-sm">Amount ${booking.paymentMethod === 'cash' ? 'Due at Hotel' : 'Paid'}</h4>
      <div class="space-y-2 font-body-md text-body-md">
        <div class="flex items-center justify-between text-on-surface-variant">
          <span>Room (${booking.pricing.nights} × ${formatINR(booking.pricing.nightlyRate)})</span>
          <span class="text-on-surface font-medium">${formatINR(booking.pricing.roomTotal)}</span>
        </div>
        ${booking.pricing.addons
          .map(
            (line) => `
          <div class="flex items-center justify-between text-on-surface-variant">
            <span class="pr-2">${escapeHtml(line.name)}${line.quantity > 1 ? ` × ${line.quantity}` : ''}</span>
            <span class="text-on-surface font-medium flex-shrink-0">${formatINR(line.total)}</span>
          </div>`
          )
          .join('')}
        ${
          booking.pricing.discount
            ? `<div class="flex items-center justify-between text-secondary font-body-sm text-body-sm"><span>Welcome offer</span><span>- ${formatINR(booking.pricing.discount)}</span></div>`
            : ''
        }
        <div class="flex items-center justify-between text-on-surface-variant">
          <span>GST (${booking.pricing.gstPercentLabel})</span>
          <span class="text-on-surface font-medium">${formatINR(booking.pricing.tax)}</span>
        </div>
        <div class="flex items-center justify-between pt-2.5 border-t border-surface-container-highest">
          <span class="font-label-md text-label-md uppercase tracking-wider text-on-surface">Total</span>
          <span class="font-headline-sm text-headline-sm text-on-surface font-semibold">${formatINR(booking.pricing.total)}</span>
        </div>
      </div>
    </div>
  </section>

  <section class="px-gutter-mobile mb-space-lg">
    <div class="bg-surface-container-low rounded-xl p-space-md">
      <h4 class="font-label-md text-label-md uppercase tracking-wider text-on-surface mb-space-xs">Before you arrive</h4>
      <ul class="space-y-1.5">
        ${[
          'Carry a valid photo ID (Aadhaar / Passport / DL) for every guest.',
          'Free cancellation up to 48 hours before check-in.',
          'Call the front desk if you will arrive after 10 PM.',
        ]
          .map(
            (tip) => `<li class="font-body-sm text-body-sm text-on-surface-variant flex items-start gap-1.5">
              <span class="material-symbols-outlined text-sm text-secondary flex-shrink-0">check_small</span>
              <span>${tip}</span>
            </li>`
          )
          .join('')}
      </ul>
    </div>
  </section>

  <section class="px-gutter-mobile mb-space-2xl flex flex-col gap-space-xs">
    <a class="w-full py-3 px-space-md rounded-xl bg-primary text-on-primary font-label-md text-label-md uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm" href="#/dashboard">
      <span class="material-symbols-outlined text-lg">calendar_today</span>
      <span>View My Stays</span>
    </a>
    <a class="w-full py-3 px-space-md rounded-xl bg-surface-container-lowest text-on-surface font-label-md text-label-md uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm" href="#/home">
      <span>Back to Home</span>
    </a>
  </section>`;

export const mount = (bookingId) => {
  const root = document.getElementById('confirmation-root');

  if (!bookingId) {
    root.innerHTML = emptyState({
      icon: 'receipt_long',
      title: 'No booking to show',
      message: 'Open a booking from My Stays to see its confirmation.',
      actionLabel: 'My Stays',
      actionHref: '#/dashboard',
    });
    return;
  }

  fetchBooking(bookingId)
    .then((booking) => {
      root.innerHTML = bodyMarkup(booking);
      document.getElementById('copy-id')?.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(booking.id);
          showToast('Booking ID copied');
        } catch {
          showToast(booking.id);
        }
      });
    })
    .catch((err) => {
      console.error('Could not load booking:', err);
      root.innerHTML = emptyState({
        icon: 'error_outline',
        title: 'Booking not found',
        message: err.message,
        actionLabel: 'My Stays',
        actionHref: '#/dashboard',
      });
    });
};
