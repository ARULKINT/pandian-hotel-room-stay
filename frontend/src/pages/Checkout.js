import { fetchRoom, fetchAddons, fetchQuote } from '../api.js';
import { getDraft, updateDraft, toggleAddon } from '../state.js';
import { header, loading, emptyState, toastMarkup, showToast } from '../components/layout.js';
import { formatINR, formatDate, nightsBetween, escapeHtml } from '../format.js';

export const steps = (current) => `
<div class="px-gutter-mobile pt-space-sm pb-space-xs">
  <div class="flex items-center justify-between relative">
    ${[
      { n: 1, label: 'Stay' },
      { n: 2, label: 'Details' },
      { n: 3, label: 'Payment' },
    ]
      .map((step, i) => {
        const done = step.n < current;
        const active = step.n === current;
        return `${i > 0 ? `<div class="h-px ${done || active ? 'bg-secondary/30' : 'bg-surface-container-highest'} flex-1 mx-2"></div>` : ''}
        <div class="flex items-center gap-space-2xs ${!done && !active ? 'opacity-40' : ''}">
          <span class="w-5 h-5 rounded-full flex items-center justify-center font-label-sm text-label-sm ${
            done
              ? 'bg-secondary text-surface'
              : active
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-high text-on-surface-variant'
          }">${done ? '<span class="material-symbols-outlined text-[12px] leading-none">check</span>' : step.n}</span>
          <span class="font-label-sm text-label-sm uppercase ${active ? 'text-on-surface font-semibold' : done ? 'text-secondary' : 'text-on-surface-variant'}">${step.label}</span>
        </div>`;
      })
      .join('')}
  </div>
</div>`;

export const render = () => `
${header({ title: 'Your Details', back: true })}
<main class="flex-1 flex flex-col relative w-full pt-16 bg-surface">
  <div class="flex flex-col w-full pb-32" id="checkout-root">
    ${steps(2)}
    ${loading('Loading your booking…')}
  </div>
</main>
${toastMarkup()}
`;

const bodyMarkup = (room, addons, draft, nights) => `
  <div class="px-gutter-mobile mt-space-sm">
    <div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm">
      <div class="flex gap-space-sm items-start">
        <div class="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-surface-container-low">
          <img class="w-full h-full object-cover" alt="${escapeHtml(room.name)}" src="${escapeHtml(room.image)}"/>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between gap-1">
            <div class="min-w-0">
              <span class="font-label-sm text-label-sm text-secondary uppercase tracking-wider block">Selected Room</span>
              <h2 class="font-headline-sm text-headline-sm text-on-surface truncate">${escapeHtml(room.name)}</h2>
            </div>
            <a class="text-secondary hover:text-on-surface font-label-sm text-label-sm uppercase tracking-wider py-1 px-2 rounded hover:bg-surface-container-low transition-colors flex-shrink-0" href="#/rooms">Change</a>
          </div>
          <a class="flex items-center gap-2 mt-1 text-on-surface-variant font-body-sm text-body-sm" href="#/availability">
            <span class="material-symbols-outlined text-[15px] text-secondary">calendar_today</span>
            <span>${formatDate(draft.checkIn)} – ${formatDate(draft.checkOut)} · ${nights} night${nights === 1 ? '' : 's'}</span>
          </a>
          <div class="flex items-center gap-2 mt-0.5 text-on-surface-variant font-body-sm text-body-sm">
            <span class="material-symbols-outlined text-[15px] text-secondary">group</span>
            <span>${draft.guests} guest${draft.guests === 1 ? '' : 's'} · ${escapeHtml(room.bedType)}</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <section class="px-gutter-mobile mt-space-md">
    <div class="flex items-baseline justify-between mb-space-xs">
      <h3 class="font-headline-sm text-headline-sm text-on-surface">Add-ons, If You'd Like</h3>
      <span class="font-label-sm text-label-sm text-secondary uppercase">Optional</span>
    </div>
    <p class="font-body-sm text-body-sm text-on-surface-variant mb-space-sm">Pick what you fancy, skip what you don't.</p>
    <div class="space-y-space-xs">
      ${addons
        .map(
          (addon) => `
        <label class="block cursor-pointer bg-surface-container-lowest rounded-xl p-space-sm shadow-sm transition-all hover:shadow-md">
          <div class="flex items-start gap-space-sm">
            <input class="mt-1 w-4 h-4 accent-secondary rounded cursor-pointer flex-shrink-0" data-addon="${escapeHtml(addon.id)}" type="checkbox" ${draft.addons.includes(addon.id) ? 'checked' : ''}/>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-space-xs">
                <div class="flex items-center gap-1.5 min-w-0">
                  <span class="font-body-md text-body-md font-medium text-on-surface">${escapeHtml(addon.name)}</span>
                  ${addon.popular ? '<span class="bg-secondary-container text-on-secondary-container font-label-sm text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold flex-shrink-0">Popular</span>' : ''}
                </div>
                <span class="font-label-lg text-label-lg text-secondary flex-shrink-0">+${formatINR(addon.price)}</span>
              </div>
              <p class="font-body-sm text-body-sm text-on-surface-variant mt-0.5">${escapeHtml(addon.description)}${addon.unit === 'per night' ? ` <span class="text-outline">(per night)</span>` : ''}</p>
            </div>
          </div>
        </label>`
        )
        .join('')}
    </div>
  </section>

  <section class="px-gutter-mobile mt-space-lg">
    <div class="flex items-baseline justify-between mb-space-xs">
      <h3 class="font-headline-sm text-headline-sm text-on-surface">Guest Details</h3>
      <span class="font-label-sm text-label-sm text-on-surface-variant">Step 2 of 3</span>
    </div>
    <form class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-space-sm" id="guest-form" novalidate>
      <div>
        <label class="block font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant mb-1" for="guest-name">Full Name <span class="text-error">*</span></label>
        <div class="relative">
          <span class="material-symbols-outlined absolute left-3 top-3 text-outline text-lg pointer-events-none">person</span>
          <input class="w-full pl-10 pr-3 py-2.5 bg-surface-container-low rounded-lg text-on-surface font-body-md text-body-md focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-secondary transition-all" id="guest-name" placeholder="e.g. Ananya Deshmukh" type="text" value="${escapeHtml(draft.guestName)}" required/>
        </div>
        <p class="font-body-sm text-body-sm text-error mt-1 hidden" data-error="guest-name"></p>
      </div>
      <div>
        <label class="block font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant mb-1" for="guest-email">Email <span class="text-error">*</span></label>
        <div class="relative">
          <span class="material-symbols-outlined absolute left-3 top-3 text-outline text-lg pointer-events-none">mail</span>
          <input class="w-full pl-10 pr-3 py-2.5 bg-surface-container-low rounded-lg text-on-surface font-body-md text-body-md focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-secondary transition-all" id="guest-email" placeholder="name@example.com" type="email" value="${escapeHtml(draft.guestEmail)}" required/>
        </div>
        <p class="font-body-sm text-body-sm text-error mt-1 hidden" data-error="guest-email"></p>
      </div>
      <div>
        <label class="block font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant mb-1" for="guest-phone">Mobile Number <span class="text-error">*</span></label>
        <div class="relative">
          <span class="material-symbols-outlined absolute left-3 top-3 text-outline text-lg pointer-events-none">call</span>
          <input class="w-full pl-10 pr-3 py-2.5 bg-surface-container-low rounded-lg text-on-surface font-body-md text-body-md focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-secondary transition-all" id="guest-phone" placeholder="+91 98765 43210" type="tel" value="${escapeHtml(draft.guestPhone)}" required/>
        </div>
        <p class="font-body-sm text-body-sm text-error mt-1 hidden" data-error="guest-phone"></p>
      </div>
      <div>
        <label class="block font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant mb-1" for="guest-requests">Special Requests</label>
        <textarea class="w-full p-3 bg-surface-container-low rounded-lg text-on-surface font-body-md text-body-md focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-secondary transition-all" id="guest-requests" placeholder="Extra bed, less spicy food, early check-in — just let us know..." rows="2">${escapeHtml(draft.requests)}</textarea>
      </div>
    </form>
  </section>

  <section class="px-gutter-mobile mt-space-lg mb-space-sm">
    <div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm">
      <h4 class="font-headline-sm text-headline-sm text-on-surface mb-space-sm">Bill Summary</h4>
      <div class="space-y-2.5 font-body-md text-body-md" id="quote-lines">${loading('Calculating…')}</div>
    </div>
  </section>

  <div class="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[428px] z-40 bg-surface-container-lowest/95 backdrop-blur-md pb-safe shadow-[0_-8px_30px_rgba(0,0,0,0.06)]">
    <div class="max-w-container-max mx-auto px-gutter-mobile py-space-sm flex items-center justify-between gap-space-sm">
      <div class="flex flex-col min-w-0">
        <span class="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Total</span>
        <span class="font-headline-md text-headline-md text-on-surface font-medium leading-none" id="sticky-total">—</span>
        <span class="font-body-sm text-[11px] text-secondary mt-0.5">${nights} night${nights === 1 ? '' : 's'} · ${draft.guests} guest${draft.guests === 1 ? '' : 's'}</span>
      </div>
      <button class="flex-1 max-w-[220px] bg-secondary hover:bg-on-secondary-container text-on-secondary py-3 px-space-md rounded-lg font-label-lg text-label-lg uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-colors" id="continue-btn" type="button">
        <span>Continue</span>
        <span class="material-symbols-outlined text-lg">arrow_forward</span>
      </button>
    </div>
  </div>`;

const quoteMarkup = (quote) => `
  <div class="flex items-center justify-between text-on-surface-variant">
    <span>${escapeHtml(quote.roomName)} (${quote.nights} night${quote.nights === 1 ? '' : 's'})</span>
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
    <span>GST (${quote.gstPercentLabel})</span>
    <span class="text-on-surface font-medium">${formatINR(quote.tax)}</span>
  </div>
  <div class="flex items-center justify-between pt-2.5 mt-1 border-t border-surface-container-highest">
    <span class="font-label-md text-label-md uppercase tracking-wider text-on-surface">Total payable</span>
    <span class="font-headline-sm text-headline-sm text-on-surface font-semibold">${formatINR(quote.total)}</span>
  </div>`;

export const mount = (roomIdParam) => {
  const root = document.getElementById('checkout-root');
  const draft = getDraft();
  const roomId = roomIdParam || draft.roomId;
  const nights = nightsBetween(draft.checkIn, draft.checkOut);

  if (!roomId) {
    root.innerHTML = steps(2) + emptyState({
      icon: 'bed',
      title: 'No room selected yet',
      message: 'Choose a room first, then we can take your details.',
      actionLabel: 'Browse Rooms',
      actionHref: '#/rooms',
    });
    return;
  }

  Promise.all([
    fetchRoom(roomId, { checkIn: draft.checkIn, checkOut: draft.checkOut }),
    fetchAddons(),
  ])
    .then(([room, addons]) => {
      // Guard the flow: a sold-out or too-small room must not reach payment.
      if (room.availableUnits === 0) {
        root.innerHTML = steps(2) + emptyState({
          icon: 'event_busy',
          title: `${room.name} is fully booked`,
          message: 'Those dates are taken for this room. Try different dates or another room.',
          actionLabel: 'See Available Rooms',
          actionHref: '#/availability',
        });
        return;
      }
      if (draft.guests > room.maxGuests) {
        root.innerHTML = steps(2) + emptyState({
          icon: 'group_off',
          title: 'Too many guests for this room',
          message: `${room.name} allows up to ${room.maxGuests} guest${room.maxGuests === 1 ? '' : 's'}. Pick a bigger room or reduce the party size.`,
          actionLabel: 'See Other Rooms',
          actionHref: '#/availability',
        });
        return;
      }

      updateDraft({ roomId: room.id });
      root.innerHTML = steps(2) + bodyMarkup(room, addons, getDraft(), nights);

      const linesEl = document.getElementById('quote-lines');
      const stickyEl = document.getElementById('sticky-total');

      const refreshQuote = async () => {
        const current = getDraft();
        try {
          const quote = await fetchQuote({
            roomId: room.id,
            checkIn: current.checkIn,
            checkOut: current.checkOut,
            addons: current.addons,
          });
          linesEl.innerHTML = quoteMarkup(quote);
          stickyEl.textContent = formatINR(quote.total);
        } catch (err) {
          console.error('Quote failed:', err);
          linesEl.innerHTML = `<p class="font-body-sm text-body-sm text-error">${escapeHtml(err.message)}</p>`;
          stickyEl.textContent = '—';
        }
      };

      document.querySelectorAll('[data-addon]').forEach((box) => {
        box.addEventListener('change', () => {
          toggleAddon(box.dataset.addon);
          refreshQuote();
        });
      });

      // Persist typed details so they survive a back-navigation.
      const fieldMap = {
        'guest-name': 'guestName',
        'guest-email': 'guestEmail',
        'guest-phone': 'guestPhone',
        'guest-requests': 'requests',
      };
      Object.entries(fieldMap).forEach(([id, key]) => {
        document.getElementById(id)?.addEventListener('input', (e) => {
          updateDraft({ [key]: e.target.value });
        });
      });

      const setError = (id, message) => {
        const el = document.querySelector(`[data-error="${id}"]`);
        if (!el) return;
        el.textContent = message || '';
        el.classList.toggle('hidden', !message);
      };

      document.getElementById('continue-btn')?.addEventListener('click', () => {
        const current = getDraft();
        let valid = true;

        if (!current.guestName || current.guestName.trim().length < 2) {
          setError('guest-name', 'Please enter your full name.');
          valid = false;
        } else setError('guest-name', '');

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(current.guestEmail || '')) {
          setError('guest-email', 'Please enter a valid email address.');
          valid = false;
        } else setError('guest-email', '');

        if (!/^[+]?[\d\s-]{8,16}$/.test(current.guestPhone || '')) {
          setError('guest-phone', 'Please enter a valid mobile number.');
          valid = false;
        } else setError('guest-phone', '');

        if (!valid) {
          showToast('Please complete the required fields');
          document.querySelector('[data-error]:not(.hidden)')?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
          return;
        }

        window.location.hash = `#/payment/${room.id}`;
      });

      refreshQuote();
    })
    .catch((err) => {
      console.error('Checkout failed to load:', err);
      root.innerHTML = steps(2) + emptyState({
        icon: 'error_outline',
        title: 'Could not load checkout',
        message: err.message,
        actionLabel: 'Browse Rooms',
        actionHref: '#/rooms',
      });
    });
};
