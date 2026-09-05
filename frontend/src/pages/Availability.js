import { fetchAvailability } from '../api.js';
import { getDraft, updateDraft } from '../state.js';
import { header, bottomNav, loading, emptyState, toastMarkup, showToast } from '../components/layout.js';
import { roomCard, mountRoomCards } from '../components/roomCard.js';
import { todayISO, addDays, nightsBetween, formatDateFull, escapeHtml } from '../format.js';

export const render = () => {
  const draft = getDraft();
  const today = todayISO();

  return `
${header({ title: 'Check Availability', back: true })}
<main class="flex-1 flex flex-col relative w-full pt-16 pb-24 bg-surface">
  <section class="px-gutter-mobile pt-space-md pb-space-sm">
    <span class="font-label-sm text-label-sm uppercase tracking-widest text-secondary block mb-space-2xs">Plan your stay</span>
    <h2 class="font-headline-lg text-headline-lg text-on-surface tracking-tight">When are you coming?</h2>
  </section>

  <section class="px-gutter-mobile mb-space-md">
    <form class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-space-sm" id="availability-form" novalidate>
      <div class="grid grid-cols-2 gap-space-sm">
        <div>
          <label class="block font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant mb-1" for="check-in">Check-in</label>
          <input class="w-full px-3 py-2.5 bg-surface-container-low rounded-lg text-on-surface font-body-md text-body-md focus:outline-none focus:ring-1 focus:ring-secondary transition-all" id="check-in" type="date" min="${today}" value="${escapeHtml(draft.checkIn)}" required/>
        </div>
        <div>
          <label class="block font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant mb-1" for="check-out">Check-out</label>
          <input class="w-full px-3 py-2.5 bg-surface-container-low rounded-lg text-on-surface font-body-md text-body-md focus:outline-none focus:ring-1 focus:ring-secondary transition-all" id="check-out" type="date" min="${addDays(today, 1)}" value="${escapeHtml(draft.checkOut)}" required/>
        </div>
      </div>
      <div>
        <label class="block font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant mb-1" for="guest-count">Guests</label>
        <select class="w-full px-3 py-2.5 bg-surface-container-low rounded-lg text-on-surface font-body-md text-body-md focus:outline-none focus:ring-1 focus:ring-secondary transition-all" id="guest-count">
          ${[1, 2, 3, 4, 5]
            .map(
              (n) =>
                `<option value="${n}" ${n === draft.guests ? 'selected' : ''}>${n} Guest${n === 1 ? '' : 's'}</option>`
            )
            .join('')}
        </select>
      </div>
      <p class="font-body-sm text-body-sm text-error hidden" id="availability-error" role="alert"></p>
      <p class="font-body-sm text-body-sm text-on-surface-variant" id="stay-summary"></p>
      <button class="w-full py-3.5 px-space-md rounded-xl bg-secondary hover:bg-on-secondary-container text-on-secondary font-label-md text-label-md uppercase tracking-wider flex items-center justify-center gap-space-xs transition-all shadow-md active:scale-[0.99]" type="submit">
        <span>Search Rooms</span>
        <span class="material-symbols-outlined text-base">search</span>
      </button>
    </form>
  </section>

  <section class="px-gutter-mobile mb-space-xs flex items-center justify-between" id="results-header" hidden>
    <h3 class="font-headline-sm text-headline-sm text-on-surface">Available Rooms</h3>
    <span class="font-label-sm text-label-sm text-on-surface-variant" id="results-count"></span>
  </section>
  <section class="px-gutter-mobile space-y-space-md mb-space-xl" id="availability-results"></section>
</main>
${toastMarkup()}
${bottomNav('rooms')}
`;
};

export const mount = () => {
  const form = document.getElementById('availability-form');
  const checkInEl = document.getElementById('check-in');
  const checkOutEl = document.getElementById('check-out');
  const guestsEl = document.getElementById('guest-count');
  const errorEl = document.getElementById('availability-error');
  const summaryEl = document.getElementById('stay-summary');
  const resultsEl = document.getElementById('availability-results');
  const headerEl = document.getElementById('results-header');
  const countEl = document.getElementById('results-count');

  const showError = (message) => {
    if (!errorEl) return;
    errorEl.textContent = message;
    errorEl.classList.toggle('hidden', !message);
  };

  const updateSummary = () => {
    const nights = nightsBetween(checkInEl.value, checkOutEl.value);
    if (summaryEl) {
      summaryEl.textContent = nights
        ? `${formatDateFull(checkInEl.value)} → ${formatDateFull(checkOutEl.value)} · ${nights} night${nights === 1 ? '' : 's'}`
        : '';
    }
  };

  // Keep check-out strictly after check-in as the guest changes dates.
  checkInEl?.addEventListener('change', () => {
    const minOut = addDays(checkInEl.value, 1);
    checkOutEl.min = minOut;
    if (checkOutEl.value <= checkInEl.value) checkOutEl.value = minOut;
    showError('');
    updateSummary();
  });
  checkOutEl?.addEventListener('change', () => {
    showError('');
    updateSummary();
  });

  const search = async () => {
    const checkIn = checkInEl.value;
    const checkOut = checkOutEl.value;
    const guests = Number(guestsEl.value);

    if (!checkIn || !checkOut) return showError('Please choose both dates.');
    if (checkIn < todayISO()) return showError('Check-in cannot be in the past.');
    if (nightsBetween(checkIn, checkOut) < 1) return showError('Check-out must be after check-in.');

    showError('');
    updateDraft({ checkIn, checkOut, guests });
    resultsEl.innerHTML = loading('Checking availability…');
    headerEl.hidden = false;

    try {
      const data = await fetchAvailability({ checkIn, checkOut, guests });
      countEl.textContent = `${data.availableCount} of ${data.totalMatching} free`;

      if (!data.rooms.length) {
        resultsEl.innerHTML = emptyState({
          icon: 'group_off',
          title: 'No rooms fit that many guests',
          message: 'Try reducing the number of guests, or book two rooms for a larger group.',
        });
        return;
      }

      // Available rooms first so the guest sees bookable options immediately.
      const sorted = [...data.rooms].sort(
        (a, b) => Number(b.isAvailable) - Number(a.isAvailable) || a.price - b.price
      );
      resultsEl.innerHTML = sorted
        .map((room) => roomCard(room, { nights: data.nights }))
        .join('');

      mountRoomCards(resultsEl, {
        onBook: (roomId) => {
          updateDraft({ roomId });
          window.location.hash = `#/checkout/${roomId}`;
        },
      });
    } catch (err) {
      console.error('Availability search failed:', err);
      resultsEl.innerHTML = emptyState({
        icon: 'wifi_off',
        title: 'Could not check availability',
        message: err.message,
      });
      showToast(err.message);
    }
  };

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    search();
  });

  updateSummary();
  search(); // show results straight away using the saved stay
};
