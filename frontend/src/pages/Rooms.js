import { fetchRooms } from '../api.js';
import { getDraft, updateDraft, getCompareList, toggleCompare } from '../state.js';
import { header, bottomNav, loading, emptyState, toastMarkup, showToast } from '../components/layout.js';
import { roomCard, mountRoomCards } from '../components/roomCard.js';
import { formatDate, nightsBetween } from '../format.js';

const FILTERS = [
  { id: 'all', label: 'All Rooms' },
  { id: 'ac', label: 'AC' },
  { id: 'non-ac', label: 'Non-AC' },
];

export const render = () => {
  const draft = getDraft();
  const nights = nightsBetween(draft.checkIn, draft.checkOut);

  return `
${header({ title: 'All Rooms', back: true })}
<main class="flex-1 flex flex-col relative w-full pt-16 pb-24 bg-surface">
<div class="flex flex-col w-full">

  <section class="px-gutter-mobile pt-space-md pb-space-sm">
    <span class="font-label-sm text-label-sm uppercase tracking-widest text-secondary block mb-space-2xs">Pandian Hotel &amp; Room Stay</span>
    <h2 class="font-headline-lg text-headline-lg text-on-surface tracking-tight">Choose Your Room</h2>
    <p class="font-body-md text-body-md text-on-surface-variant mt-space-2xs">Simple, clean rooms at honest prices. Free WiFi in every room.</p>
  </section>

  <section class="px-gutter-mobile mb-space-sm">
    <a class="bg-surface-container-lowest rounded-xl p-space-sm shadow-sm flex items-center justify-between gap-space-sm" href="#/availability">
      <div class="flex items-center gap-space-sm min-w-0">
        <span class="material-symbols-outlined text-secondary">calendar_month</span>
        <div class="min-w-0">
          <span class="font-label-sm text-label-sm uppercase tracking-wider text-outline block">Your stay</span>
          <span class="font-label-lg text-label-lg text-on-surface truncate block">${formatDate(draft.checkIn)} – ${formatDate(draft.checkOut)} · ${nights} night${nights === 1 ? '' : 's'} · ${draft.guests} guest${draft.guests === 1 ? '' : 's'}</span>
        </div>
      </div>
      <span class="font-label-sm text-label-sm uppercase tracking-wider text-secondary flex-shrink-0">Change</span>
    </a>
  </section>

  <section class="px-gutter-mobile mb-space-sm">
    <div class="flex items-center gap-space-xs overflow-x-auto no-scrollbar py-1" id="room-filter-chips">
      ${FILTERS.map(
        (f, i) => `
        <button class="room-filter-chip px-4 py-2 rounded-full font-label-sm text-label-sm tracking-wider uppercase whitespace-nowrap transition-colors ${
          i === 0 ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
        }" data-filter="${f.id}">${f.label}</button>`
      ).join('')}
    </div>
  </section>

  <section class="px-gutter-mobile mb-space-sm">
    <div class="bg-surface-container-lowest rounded-xl p-space-sm shadow-sm flex items-center justify-between gap-space-sm">
      <span class="font-label-sm text-label-sm uppercase text-outline" id="room-count">—</span>
      <div class="flex items-center gap-space-xs">
        <label class="font-label-sm text-label-sm uppercase tracking-wider text-outline" for="room-sort">Sort</label>
        <select class="bg-surface-container-low text-on-surface font-label-sm text-label-sm px-space-sm py-space-2xs rounded-lg outline-none focus:ring-1 focus:ring-secondary" id="room-sort">
          <option value="recommended">Recommended</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="rating">Guest Rating</option>
        </select>
      </div>
    </div>
  </section>

  <section class="px-gutter-mobile space-y-space-md mb-space-xl" id="room-list">
    ${loading('Loading rooms…')}
  </section>

</div>
</main>

<div class="fixed bottom-16 left-0 right-0 z-40 px-gutter-mobile pb-2 hidden" id="compare-bar">
  <a class="w-full bg-primary text-on-primary rounded-xl py-3 px-space-md flex items-center justify-between shadow-xl" href="#/compare">
    <span class="font-label-sm text-label-sm uppercase tracking-wider" id="compare-count">0 rooms selected</span>
    <span class="font-label-sm text-label-sm uppercase tracking-widest flex items-center gap-1">Compare <span class="material-symbols-outlined text-base">compare_arrows</span></span>
  </a>
</div>

${toastMarkup()}
${bottomNav('rooms')}
`;
};

export const mount = () => {
  const listEl = document.getElementById('room-list');
  const countEl = document.getElementById('room-count');
  const sortEl = document.getElementById('room-sort');
  const compareBar = document.getElementById('compare-bar');
  const compareCount = document.getElementById('compare-count');

  const draft = getDraft();
  const nights = nightsBetween(draft.checkIn, draft.checkOut);

  let allRooms = [];
  let activeFilter = 'all';

  const refreshCompareBar = () => {
    const list = getCompareList();
    if (!compareBar || !compareCount) return;
    compareBar.classList.toggle('hidden', list.length < 2);
    compareCount.textContent = `${list.length} room${list.length === 1 ? '' : 's'} selected`;
  };

  const paint = () => {
    if (!listEl) return;

    let list =
      activeFilter === 'all' ? [...allRooms] : allRooms.filter((r) => r.type === activeFilter);

    const sort = sortEl?.value || 'recommended';
    if (sort === 'price-asc') list.sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') list.sort((a, b) => b.price - a.price);
    else if (sort === 'rating') list.sort((a, b) => b.rating - a.rating);
    else list.sort((a, b) => Number(b.availableUnits > 0) - Number(a.availableUnits > 0));

    if (countEl) {
      countEl.textContent = `Showing ${list.length} room${list.length === 1 ? '' : 's'}`;
    }

    if (!list.length) {
      listEl.innerHTML = emptyState({
        icon: 'search_off',
        title: 'No rooms match',
        message: 'Try a different category or change your dates.',
      });
      return;
    }

    listEl.innerHTML = list
      .map((room) => roomCard(room, { nights, showCompare: true }))
      .join('');

    // Restore compare ticks after a re-render.
    const selected = getCompareList();
    listEl.querySelectorAll('[data-compare]').forEach((box) => {
      box.checked = selected.includes(box.dataset.compare);
    });

    mountRoomCards(listEl, {
      onBook: (roomId) => {
        updateDraft({ roomId });
        window.location.hash = `#/checkout/${roomId}`;
      },
      onCompare: (roomId) => {
        const next = toggleCompare(roomId);
        if (!next.includes(roomId)) showToast('Removed from comparison');
        else if (next.length === 3) showToast('Comparing 3 rooms (max)');
        // Re-sync every checkbox: the list is capped at three.
        listEl.querySelectorAll('[data-compare]').forEach((box) => {
          box.checked = next.includes(box.dataset.compare);
        });
        refreshCompareBar();
      },
    });
  };

  fetchRooms({ checkIn: draft.checkIn, checkOut: draft.checkOut })
    .then((rooms) => {
      allRooms = rooms;
      paint();
      refreshCompareBar();
    })
    .catch((err) => {
      console.error('Failed to load rooms:', err);
      if (listEl) {
        listEl.innerHTML = emptyState({
          icon: 'wifi_off',
          title: 'Could not load rooms',
          message: err.message,
        });
      }
    });

  document.querySelectorAll('.room-filter-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.room-filter-chip').forEach((c) => {
        c.classList.remove('bg-primary', 'text-on-primary', 'shadow-sm');
        c.classList.add('bg-surface-container-low', 'text-on-surface-variant');
      });
      chip.classList.remove('bg-surface-container-low', 'text-on-surface-variant');
      chip.classList.add('bg-primary', 'text-on-primary', 'shadow-sm');
      activeFilter = chip.dataset.filter;
      paint();
    });
  });

  sortEl?.addEventListener('change', paint);
};
