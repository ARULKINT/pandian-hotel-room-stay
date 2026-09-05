import { fetchRooms } from '../api.js';
import { getDraft, updateDraft, getCompareList, toggleCompare, clearCompare } from '../state.js';
import { header, bottomNav, loading, emptyState, toastMarkup } from '../components/layout.js';
import { formatINR, nightsBetween, escapeHtml } from '../format.js';

const ROWS = [
  { label: 'Price / night', get: (r) => formatINR(r.price), highlight: true },
  { label: 'Total for stay', get: (r, n) => (n ? formatINR(r.price * n) : '—') },
  { label: 'Room type', get: (r) => (r.type === 'ac' ? 'Air Conditioned' : 'Non-AC') },
  { label: 'Max guests', get: (r) => `${r.maxGuests} guests` },
  { label: 'Bed', get: (r) => r.bedType },
  { label: 'Size', get: (r) => `${r.sizeSqft} sq.ft` },
  { label: 'Floor', get: (r) => r.floor },
  { label: 'Rating', get: (r) => `${r.rating} (${r.reviewCount})` },
  {
    label: 'Availability',
    get: (r) =>
      r.availableUnits === undefined
        ? '—'
        : r.availableUnits === 0
          ? 'Sold out'
          : `${r.availableUnits} left`,
  },
];

const AMENITY_ROWS = [
  'AC',
  'Free WiFi',
  'TV',
  'Breakfast Included',
  'Complimentary Filter Coffee',
  'Work Desk',
  'Attached Bathroom',
];

export const render = () => `
${header({ title: 'Compare Rooms', back: true })}
<main class="flex-1 flex flex-col relative w-full pt-16 pb-24 bg-surface">
  <div class="flex flex-col w-full" id="compare-root">
    ${loading('Loading comparison…')}
  </div>
</main>
${toastMarkup()}
${bottomNav('rooms')}
`;

const tableMarkup = (rooms, nights) => `
  <section class="px-gutter-mobile pt-space-md pb-space-sm flex items-center justify-between gap-space-xs">
    <div class="min-w-0">
      <span class="font-label-sm text-label-sm uppercase tracking-widest text-secondary block">Side by side</span>
      <h2 class="font-headline-lg text-headline-lg text-on-surface tracking-tight">Compare ${rooms.length} Rooms</h2>
    </div>
    <button class="font-label-sm text-label-sm uppercase tracking-wider text-secondary hover:text-on-surface flex-shrink-0" id="clear-compare">Clear</button>
  </section>

  <div class="overflow-x-auto pb-space-md">
    <table class="w-max min-w-full border-separate border-spacing-0 px-gutter-mobile">
      <thead>
        <tr>
          <th class="sticky left-0 z-10 bg-surface text-left align-bottom pb-space-sm pr-space-sm w-28"></th>
          ${rooms
            .map(
              (room) => `
            <th class="text-left align-bottom pb-space-sm px-space-2xs w-56">
              <div class="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm">
                <div class="relative h-28 bg-surface-container">
                  <img class="w-full h-full object-cover" alt="${escapeHtml(room.name)}" src="${escapeHtml(room.image)}"/>
                  <button class="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-surface-container-lowest/90 backdrop-blur-md flex items-center justify-center text-on-surface shadow-sm" data-remove="${escapeHtml(room.id)}" aria-label="Remove ${escapeHtml(room.name)}">
                    <span class="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
                <div class="p-space-sm">
                  <h3 class="font-headline-sm text-headline-sm text-on-surface leading-snug whitespace-normal">${escapeHtml(room.name)}</h3>
                </div>
              </div>
            </th>`
            )
            .join('')}
        </tr>
      </thead>
      <tbody>
        ${ROWS.map(
          (row, i) => `
          <tr class="${i % 2 ? 'bg-surface-container-low/40' : ''}">
            <td class="sticky left-0 z-10 ${i % 2 ? 'bg-surface-container-low' : 'bg-surface'} font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant py-space-sm pr-space-sm align-middle">${row.label}</td>
            ${rooms
              .map(
                (room) => `
              <td class="py-space-sm px-space-2xs align-middle font-body-md text-body-md ${row.highlight ? 'text-secondary font-semibold' : 'text-on-surface'}">${escapeHtml(String(row.get(room, nights)))}</td>`
              )
              .join('')}
          </tr>`
        ).join('')}

        <tr>
          <td class="sticky left-0 z-10 bg-surface pt-space-md pb-space-2xs font-label-sm text-label-sm uppercase tracking-widest text-secondary" colspan="${rooms.length + 1}">Amenities</td>
        </tr>
        ${AMENITY_ROWS.map(
          (amenity, i) => `
          <tr class="${i % 2 ? 'bg-surface-container-low/40' : ''}">
            <td class="sticky left-0 z-10 ${i % 2 ? 'bg-surface-container-low' : 'bg-surface'} font-body-sm text-body-sm text-on-surface-variant py-space-xs pr-space-sm align-middle">${amenity}</td>
            ${rooms
              .map(
                (room) => `
              <td class="py-space-xs px-space-2xs align-middle">
                ${
                  room.amenities.includes(amenity)
                    ? '<span class="material-symbols-outlined text-lg text-on-tertiary-container">check_circle</span>'
                    : '<span class="material-symbols-outlined text-lg text-outline-variant">remove</span>'
                }
              </td>`
              )
              .join('')}
          </tr>`
        ).join('')}

        <tr>
          <td class="sticky left-0 z-10 bg-surface"></td>
          ${rooms
            .map(
              (room) => `
            <td class="pt-space-md px-space-2xs align-top">
              ${
                room.availableUnits === 0
                  ? `<span class="block text-center px-space-sm py-2.5 rounded-xl bg-surface-container text-on-surface-variant font-label-sm text-label-sm uppercase tracking-widest">Sold out</span>`
                  : `<button class="w-full px-space-sm py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-sm text-label-sm uppercase tracking-widest transition-colors shadow-sm" data-book="${escapeHtml(room.id)}">Book Now</button>`
              }
            </td>`
            )
            .join('')}
        </tr>
      </tbody>
    </table>
  </div>

  <section class="px-gutter-mobile pb-space-xl">
    <a class="w-full py-3 px-space-md rounded-xl bg-surface-container-lowest text-on-surface font-label-md text-label-md uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm" href="#/rooms">
      <span class="material-symbols-outlined text-lg">add</span>
      <span>Add Another Room</span>
    </a>
  </section>`;

export const mount = () => {
  const root = document.getElementById('compare-root');
  const draft = getDraft();
  const nights = nightsBetween(draft.checkIn, draft.checkOut);
  const ids = getCompareList();

  if (ids.length < 2) {
    root.innerHTML = emptyState({
      icon: 'compare_arrows',
      title: 'Pick at least two rooms',
      message: 'Tick "Compare" on two or three rooms in the room list to see them side by side.',
      actionLabel: 'Browse Rooms',
      actionHref: '#/rooms',
    });
    return;
  }

  fetchRooms({ checkIn: draft.checkIn, checkOut: draft.checkOut })
    .then((allRooms) => {
      const rooms = ids
        .map((id) => allRooms.find((r) => r.id === id))
        .filter(Boolean);

      if (rooms.length < 2) {
        clearCompare();
        root.innerHTML = emptyState({
          icon: 'compare_arrows',
          title: 'Those rooms are no longer available',
          message: 'Pick two rooms again from the current list.',
          actionLabel: 'Browse Rooms',
          actionHref: '#/rooms',
        });
        return;
      }

      root.innerHTML = tableMarkup(rooms, nights);

      root.querySelectorAll('[data-book]').forEach((btn) => {
        btn.addEventListener('click', () => {
          updateDraft({ roomId: btn.dataset.book });
          window.location.hash = `#/checkout/${btn.dataset.book}`;
        });
      });

      root.querySelectorAll('[data-remove]').forEach((btn) => {
        btn.addEventListener('click', () => {
          toggleCompare(btn.dataset.remove);
          mount();
        });
      });

      document.getElementById('clear-compare')?.addEventListener('click', () => {
        clearCompare();
        window.location.hash = '#/rooms';
      });
    })
    .catch((err) => {
      console.error('Compare failed:', err);
      root.innerHTML = emptyState({
        icon: 'wifi_off',
        title: 'Could not load comparison',
        message: err.message,
        actionLabel: 'Browse Rooms',
        actionHref: '#/rooms',
      });
    });
};
