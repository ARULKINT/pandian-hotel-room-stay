import { fetchRoom, fetchQuote, createBooking } from '../api.js';
import { getDraft, updateDraft, resetDraft } from '../state.js';
import { header, loading, emptyState, toastMarkup, showToast } from '../components/layout.js';
import { steps } from './Checkout.js';
import { formatINR, formatDateFull, nightsBetween, escapeHtml } from '../format.js';

const PAYMENT_METHODS = [
  { id: 'upi', icon: 'qr_code_2', label: 'UPI', note: 'GPay, PhonePe, Paytm' },
  { id: 'card', icon: 'credit_card', label: 'Card', note: 'Debit / Credit' },
  { id: 'cash', icon: 'payments', label: 'Pay at Hotel', note: 'Cash on arrival' },
];

export const render = () => `
${header({ title: 'Payment', back: true })}
<main class="flex-1 flex flex-col relative w-full pt-16 bg-surface">
  <div class="flex flex-col w-full pb-32" id="payment-root">
    ${steps(3)}
    ${loading('Preparing your bill…')}
  </div>
</main>
${toastMarkup()}
`;

const bodyMarkup = (room, draft, quote, nights) => `
  <section class="px-gutter-mobile mt-space-sm">
    <div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm">
      <div class="flex gap-space-sm items-start">
        <div class="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-surface-container-low">
          <img class="w-full h-full object-cover" alt="${escapeHtml(room.name)}" src="${escapeHtml(room.image)}"/>
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="font-headline-sm text-headline-sm text-on-surface truncate">${escapeHtml(room.name)}</h2>
          <p class="font-body-sm text-body-sm text-on-surface-variant mt-0.5">${formatDateFull(draft.checkIn)}</p>
          <p class="font-body-sm text-body-sm text-on-surface-variant">to ${formatDateFull(draft.checkOut)}</p>
          <p class="font-body-sm text-body-sm text-secondary mt-0.5">${nights} night${nights === 1 ? '' : 's'} · ${draft.guests} guest${draft.guests === 1 ? '' : 's'}</p>
        </div>
      </div>
      <div class="mt-space-sm pt-space-sm border-t border-surface-container-high">
        <p class="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant mb-1">Booking for</p>
        <p class="font-body-md text-body-md text-on-surface">${escapeHtml(draft.guestName)}</p>
        <p class="font-body-sm text-body-sm text-on-surface-variant">${escapeHtml(draft.guestEmail)} · ${escapeHtml(draft.guestPhone)}</p>
        <a class="font-label-sm text-label-sm text-secondary uppercase tracking-wider inline-block mt-space-2xs" href="#/checkout/${escapeHtml(room.id)}">Edit details</a>
      </div>
    </div>
  </section>

  <section class="px-gutter-mobile mt-space-lg">
    <div class="flex items-center justify-between mb-space-xs">
      <h3 class="font-headline-sm text-headline-sm text-on-surface">How would you like to pay?</h3>
    </div>
    <div class="grid grid-cols-3 gap-2" id="payment-methods">
      ${PAYMENT_METHODS.map(
        (method) => `
        <label class="flex flex-col items-center justify-center p-2.5 rounded-lg bg-surface-container-low cursor-pointer hover:bg-surface-container transition-colors has-[:checked]:bg-secondary/10 has-[:checked]:ring-1 has-[:checked]:ring-secondary text-center">
          <input class="sr-only" name="payment-method" type="radio" value="${method.id}" ${draft.paymentMethod === method.id ? 'checked' : ''}/>
          <span class="material-symbols-outlined text-2xl mb-1 text-on-surface">${method.icon}</span>
          <span class="font-label-sm text-[11px] font-semibold tracking-wider uppercase text-on-surface">${method.label}</span>
          <span class="font-body-sm text-[10px] text-on-surface-variant leading-tight mt-0.5">${method.note}</span>
        </label>`
      ).join('')}
    </div>
    <div class="mt-space-sm bg-surface-container-lowest rounded-xl p-space-md shadow-sm" id="payment-detail"></div>
  </section>

  <section class="px-gutter-mobile mt-space-lg mb-space-sm">
    <div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm">
      <h4 class="font-headline-sm text-headline-sm text-on-surface mb-space-sm">Bill Summary</h4>
      <div class="space-y-2.5 font-body-md text-body-md">
        <div class="flex items-center justify-between text-on-surface-variant">
          <span>${escapeHtml(quote.roomName)} (${quote.nights} × ${formatINR(quote.nightlyRate)})</span>
          <span class="text-on-surface font-medium">${formatINR(quote.roomTotal)}</span>
        </div>
        ${quote.addons
          .map(
            (line) => `
          <div class="flex items-center justify-between text-on-surface-variant">
            <span class="pr-2">${escapeHtml(line.name)}${line.quantity > 1 ? ` × ${line.quantity}` : ''}</span>
            <span class="text-on-surface font-medium flex-shrink-0">${formatINR(line.total)}</span>
          </div>`
          )
          .join('')}
        ${
          quote.discount
            ? `<div class="flex items-center justify-between text-secondary font-body-sm text-body-sm">
                 <span>Welcome offer discount</span><span>- ${formatINR(quote.discount)}</span>
               </div>`
            : ''
        }
        <div class="flex items-center justify-between text-on-surface-variant">
          <span class="flex items-center gap-1">GST (${quote.gstPercentLabel})
            <span class="material-symbols-outlined text-[14px] text-outline" title="As applicable under Indian tax law">info</span>
          </span>
          <span class="text-on-surface font-medium">${formatINR(quote.tax)}</span>
        </div>
      </div>
      <div class="mt-4 pt-3 bg-surface-container-low/70 -mx-space-md -mb-space-md p-space-md rounded-b-xl flex items-center justify-between">
        <div>
          <span class="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant block">Total Payable</span>
          <span class="font-body-sm text-body-sm text-outline">Inclusive of all taxes</span>
        </div>
        <span class="font-headline-md text-headline-md text-on-surface font-semibold">${formatINR(quote.total)}</span>
      </div>
    </div>
  </section>

  <section class="px-gutter-mobile mb-space-md">
    <div class="flex items-start gap-2 text-on-surface-variant font-body-sm text-body-sm">
      <span class="material-symbols-outlined text-base text-secondary flex-shrink-0">verified_user</span>
      <span>Free cancellation up to 48 hours before check-in. Please carry a valid photo ID for all guests at check-in.</span>
    </div>
  </section>

  <div class="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[428px] z-40 bg-surface-container-lowest/95 backdrop-blur-md pb-safe shadow-[0_-8px_30px_rgba(0,0,0,0.06)]">
    <div class="max-w-container-max mx-auto px-gutter-mobile py-space-sm flex items-center justify-between gap-space-sm">
      <div class="flex flex-col min-w-0">
        <span class="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Due Now</span>
        <span class="font-headline-md text-headline-md text-on-surface font-medium leading-none">${formatINR(quote.total)}</span>
      </div>
      <button class="flex-1 max-w-[220px] bg-secondary hover:bg-on-secondary-container text-on-secondary py-3 px-space-md rounded-lg font-label-lg text-label-lg uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-colors" id="pay-btn" type="button">
        <span class="material-symbols-outlined text-lg">lock</span>
        <span id="pay-label">Confirm Booking</span>
      </button>
    </div>
  </div>`;

const methodDetail = (methodId) => {
  if (methodId === 'upi') {
    return `<div class="flex items-center gap-space-sm">
      <span class="material-symbols-outlined text-3xl text-secondary">qr_code_2</span>
      <div>
        <p class="font-body-md text-body-md text-on-surface">Pay via any UPI app</p>
        <p class="font-body-sm text-body-sm text-on-surface-variant">You'll get a payment request on confirming. UPI ID: <span class="text-on-surface">pandianstay@upi</span></p>
      </div>
    </div>`;
  }
  if (methodId === 'card') {
    return `<div class="flex items-center gap-space-sm">
      <span class="w-9 h-9 rounded bg-primary text-on-primary flex items-center justify-center font-bold text-[10px] flex-shrink-0">RuPay</span>
      <div>
        <p class="font-body-md text-body-md text-on-surface">Card payment at confirmation</p>
        <p class="font-body-sm text-body-sm text-on-surface-variant">You'll be taken to your bank's secure page. We never store card details.</p>
      </div>
    </div>`;
  }
  return `<div class="flex items-center gap-space-sm">
    <span class="material-symbols-outlined text-3xl text-secondary">payments</span>
    <div>
      <p class="font-body-md text-body-md text-on-surface">Pay at the hotel</p>
      <p class="font-body-sm text-body-sm text-on-surface-variant">Your room is held free of charge. Settle the bill in cash or card at check-in.</p>
    </div>
  </div>`;
};

export const mount = (roomIdParam) => {
  const root = document.getElementById('payment-root');
  const draft = getDraft();
  const roomId = roomIdParam || draft.roomId;
  const nights = nightsBetween(draft.checkIn, draft.checkOut);

  // Guard: never allow payment without the details step completed.
  if (!roomId) {
    root.innerHTML = steps(3) + emptyState({
      icon: 'bed',
      title: 'No room selected',
      message: 'Pick a room and fill in your details before paying.',
      actionLabel: 'Browse Rooms',
      actionHref: '#/rooms',
    });
    return;
  }
  if (!draft.guestName || !draft.guestEmail || !draft.guestPhone) {
    root.innerHTML = steps(3) + emptyState({
      icon: 'assignment_late',
      title: 'Your details are missing',
      message: 'We need your name, email and mobile number before confirming the booking.',
      actionLabel: 'Enter Details',
      actionHref: `#/checkout/${roomId}`,
    });
    return;
  }

  Promise.all([
    fetchRoom(roomId, { checkIn: draft.checkIn, checkOut: draft.checkOut }),
    fetchQuote({
      roomId,
      checkIn: draft.checkIn,
      checkOut: draft.checkOut,
      addons: draft.addons,
    }),
  ])
    .then(([room, quote]) => {
      if (room.availableUnits === 0) {
        root.innerHTML = steps(3) + emptyState({
          icon: 'event_busy',
          title: `${room.name} just sold out`,
          message: 'Someone booked the last room for those dates. Please choose another room.',
          actionLabel: 'See Available Rooms',
          actionHref: '#/availability',
        });
        return;
      }

      root.innerHTML = steps(3) + bodyMarkup(room, draft, quote, nights);

      const detailEl = document.getElementById('payment-detail');
      detailEl.innerHTML = methodDetail(draft.paymentMethod);

      document.querySelectorAll('input[name="payment-method"]').forEach((radio) => {
        radio.addEventListener('change', () => {
          updateDraft({ paymentMethod: radio.value });
          detailEl.innerHTML = methodDetail(radio.value);
        });
      });

      const payBtn = document.getElementById('pay-btn');
      payBtn?.addEventListener('click', async () => {
        const current = getDraft();
        payBtn.disabled = true;
        payBtn.classList.add('opacity-80', 'pointer-events-none');
        document.getElementById('pay-label').textContent = 'Confirming…';

        try {
          const booking = await createBooking({
            roomId: room.id,
            checkIn: current.checkIn,
            checkOut: current.checkOut,
            guests: current.guests,
            guestName: current.guestName,
            guestEmail: current.guestEmail,
            guestPhone: current.guestPhone,
            addons: current.addons,
            requests: current.requests,
            paymentMethod: current.paymentMethod,
          });

          // Keep the guest's identity for "My Stays", clear the rest of the draft.
          const { guestName, guestEmail, guestPhone } = current;
          resetDraft();
          updateDraft({ guestName, guestEmail, guestPhone });

          window.location.hash = `#/confirmation/${booking.id}`;
        } catch (err) {
          console.error('Booking failed:', err);
          showToast(err.message);
          payBtn.disabled = false;
          payBtn.classList.remove('opacity-80', 'pointer-events-none');
          document.getElementById('pay-label').textContent = 'Confirm Booking';
        }
      });
    })
    .catch((err) => {
      console.error('Payment page failed:', err);
      root.innerHTML = steps(3) + emptyState({
        icon: 'error_outline',
        title: 'Could not load payment',
        message: err.message,
        actionLabel: 'Back to Rooms',
        actionHref: '#/rooms',
      });
    });
};
