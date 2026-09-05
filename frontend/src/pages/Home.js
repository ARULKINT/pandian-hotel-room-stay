import { fetchRooms, fetchFacilities } from '../api.js';
import { getDraft, updateDraft } from '../state.js';
import { header, bottomNav, loading, emptyState, toastMarkup } from '../components/layout.js';
import { roomCard, mountRoomCards } from '../components/roomCard.js';
import { formatDate, nightsBetween, escapeHtml } from '../format.js';

const TRUST_BADGES = [
  { icon: 'event_available', title: 'Free Cancellation', sub: 'Up to 48 hrs prior' },
  { icon: 'verified', title: 'Best Rate Assured', sub: 'Direct booking perks' },
  { icon: 'bolt', title: 'Instant Confirm', sub: 'Real-time room hold' },
  { icon: 'room_service', title: 'Room Service', sub: 'Available on call' },
];

const CATEGORIES = [
  { id: 'all', label: 'All Rooms' },
  { id: 'ac', label: 'AC' },
  { id: 'non-ac', label: 'Non-AC' },
];

export const render = () => {
  const draft = getDraft();
  const nights = nightsBetween(draft.checkIn, draft.checkOut);

  return `
${header()}
<main class="flex-1 flex flex-col relative w-full pt-16 pb-24 bg-surface">
<div class="flex flex-col w-full">

  <section class="relative w-full overflow-hidden px-gutter-mobile pt-space-xs pb-space-lg">
    <div class="relative w-full rounded-xl overflow-hidden shadow-xl bg-surface-container-high">
      <div class="w-full h-80 bg-cover bg-center flex flex-col justify-between p-space-md relative" role="img" aria-label="Traditional South Indian temple gopuram tower against a clear evening sky." style="background-image: url('/images/southindia/gopuram-temple.jpg')">
        <div class="absolute inset-0 bg-gradient-to-t from-primary/85 via-primary/35 to-transparent pointer-events-none"></div>
        <div class="relative z-10 flex items-start justify-between">
          <span class="inline-flex items-center gap-1.5 px-space-xs py-1 rounded-full bg-surface-container-lowest/80 backdrop-blur-md text-on-surface font-label-sm text-label-sm tracking-widest uppercase shadow-sm">
            <span class="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
            Vanakkam!
          </span>
        </div>
        <div class="relative z-10 space-y-space-2xs">
          <p class="font-label-sm text-label-sm tracking-[0.15em] uppercase text-secondary-fixed">Vanakkam, Welcome</p>
          <h1 class="font-headline-xl-mobile text-headline-xl-mobile text-on-primary leading-tight">Clean Rooms, Warm Welcome</h1>
          <p class="font-body-md text-body-md text-surface-container-highest/90 max-w-xs">
            A simple, comfortable stay with home-style South Indian meals, hot filter coffee, and hospitality that feels like family.
          </p>
        </div>
      </div>
    </div>
  </section>

  <section class="px-gutter-mobile -mt-space-2xl mb-space-lg relative z-20">
    <div class="bg-surface-container-lowest rounded-xl p-space-md shadow-xl">
      <a class="flex items-center justify-between gap-space-xs mb-space-sm" href="#/availability">
        <div class="flex-1 p-space-xs rounded-xl bg-surface-container-low flex flex-col">
          <div class="flex items-center gap-1 text-secondary">
            <span class="material-symbols-outlined text-base">calendar_month</span>
            <span class="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Dates</span>
          </div>
          <span class="font-label-lg text-label-lg text-on-surface mt-0.5" id="home-dates">${formatDate(draft.checkIn)} — ${formatDate(draft.checkOut)}</span>
          <span class="font-body-sm text-body-sm text-on-surface-variant" id="home-nights">${nights} Night${nights === 1 ? '' : 's'}</span>
        </div>
        <div class="flex-1 p-space-xs rounded-xl bg-surface-container-low flex flex-col">
          <div class="flex items-center gap-1 text-secondary">
            <span class="material-symbols-outlined text-base">group</span>
            <span class="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Guests</span>
          </div>
          <span class="font-label-lg text-label-lg text-on-surface mt-0.5" id="home-guests">${draft.guests} Guest${draft.guests === 1 ? '' : 's'}</span>
          <span class="font-body-sm text-body-sm text-on-surface-variant">Tap to change</span>
        </div>
      </a>
      <a class="w-full py-3.5 px-space-md rounded-xl bg-secondary hover:bg-on-secondary-container text-on-secondary font-label-md text-label-md uppercase tracking-wider flex items-center justify-center gap-space-xs transition-all shadow-md active:scale-[0.99]" href="#/availability">
        <span>Check Availability</span>
        <span class="material-symbols-outlined text-base">arrow_forward</span>
      </a>
    </div>
  </section>

  <section class="px-gutter-mobile mb-space-xl">
    <div class="grid grid-cols-2 gap-space-xs">
      ${TRUST_BADGES.map(
        (badge) => `
        <div class="p-space-xs rounded-xl bg-surface-container-low flex items-center gap-space-xs">
          <div class="w-8 h-8 rounded-full bg-surface-container-lowest flex items-center justify-center text-secondary shadow-sm flex-shrink-0">
            <span class="material-symbols-outlined text-lg">${badge.icon}</span>
          </div>
          <div class="flex flex-col min-w-0">
            <span class="font-label-sm text-label-sm font-semibold text-on-surface truncate">${badge.title}</span>
            <span class="font-body-sm text-[10px] text-on-surface-variant truncate">${badge.sub}</span>
          </div>
        </div>`
      ).join('')}
    </div>
  </section>

  <section class="mb-space-lg">
    <div class="px-gutter-mobile mb-space-xs flex items-center justify-between">
      <h2 class="font-headline-sm text-headline-sm text-on-surface">Our Rooms</h2>
      <a class="font-label-sm text-label-sm text-secondary hover:underline uppercase tracking-wider" href="#/rooms">View All</a>
    </div>
    <div class="flex items-center gap-space-xs overflow-x-auto px-gutter-mobile no-scrollbar py-1" id="category-chips">
      ${CATEGORIES.map(
        (cat, i) => `
        <button class="category-chip px-4 py-2 rounded-full font-label-sm text-label-sm tracking-wider uppercase whitespace-nowrap transition-colors ${
          i === 0 ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
        }" data-filter="${cat.id}">${cat.label}</button>`
      ).join('')}
    </div>
  </section>

  <section class="px-gutter-mobile space-y-space-md mb-space-2xl" id="featured-rooms">
    ${loading('Loading rooms…')}
  </section>

  <section class="px-gutter-mobile mb-space-2xl">
    <div class="flex items-end justify-between mb-space-md">
      <div>
        <span class="font-label-sm text-label-sm uppercase tracking-widest text-secondary">Hotel Facilities</span>
        <h2 class="font-headline-md text-headline-md text-on-surface">What We Offer</h2>
      </div>
      <a class="font-label-sm text-label-sm text-secondary hover:underline uppercase tracking-wider" href="#/facilities">See All</a>
    </div>
    <div class="space-y-space-sm" id="home-facilities">${loading('Loading…')}</div>
  </section>

  <section class="px-gutter-mobile mb-space-xl">
    <div class="bg-surface-container-low rounded-xl p-space-lg text-center relative overflow-hidden">
      <div class="w-10 h-10 mx-auto rounded-full bg-secondary/15 text-secondary flex items-center justify-center mb-space-xs">
        <span class="material-symbols-outlined text-xl">hotel_class</span>
      </div>
      <blockquote class="font-editorial-quote text-editorial-quote text-on-surface italic mb-space-xs">
        “Simple rooms, honest prices, and a warm welcome every single time.”
      </blockquote>
      <p class="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant mb-space-md">
        The Pandian Promise
      </p>
      <div class="flex justify-center">
        <a class="px-space-md py-2.5 rounded-xl bg-surface-container-lowest text-on-surface font-label-sm text-label-sm uppercase tracking-wider flex items-center gap-2 shadow-sm hover:bg-surface-container-high transition-colors" href="#/dashboard">
          <span class="material-symbols-outlined text-base text-secondary">support_agent</span>
          <span>Talk to the Front Desk</span>
        </a>
      </div>
    </div>
  </section>

</div>
</main>
${toastMarkup()}
${bottomNav('home')}
`;
};

export const mount = () => {
  const roomsEl = document.getElementById('featured-rooms');
  const facilitiesEl = document.getElementById('home-facilities');
  const draft = getDraft();
  const nights = nightsBetween(draft.checkIn, draft.checkOut);

  let allRooms = [];
  let activeFilter = 'all';

  const paint = () => {
    if (!roomsEl) return;
    const list =
      activeFilter === 'all' ? allRooms : allRooms.filter((r) => r.type === activeFilter);

    if (!list.length) {
      roomsEl.innerHTML = emptyState({
        icon: 'search_off',
        title: 'No rooms in this category',
        message: 'Try another category, or view all rooms.',
        actionLabel: 'View All Rooms',
        actionHref: '#/rooms',
      });
      return;
    }

    // Home shows a preview; the full list lives on the Rooms page.
    roomsEl.innerHTML = list
      .slice(0, 3)
      .map((room) => roomCard(room, { nights }))
      .join('');

    mountRoomCards(roomsEl, {
      onBook: (roomId) => {
        updateDraft({ roomId });
        window.location.hash = `#/checkout/${roomId}`;
      },
    });
  };

  fetchRooms({ checkIn: draft.checkIn, checkOut: draft.checkOut })
    .then((rooms) => {
      allRooms = rooms;
      paint();
    })
    .catch((err) => {
      console.error('Failed to load rooms:', err);
      if (roomsEl) {
        roomsEl.innerHTML = emptyState({
          icon: 'wifi_off',
          title: 'Could not load rooms',
          message: err.message,
        });
      }
    });

  fetchFacilities()
    .then((facilities) => {
      if (!facilitiesEl) return;
      facilitiesEl.innerHTML = facilities
        .slice(0, 3)
        .map(
          (f) => `
        <a class="bg-surface-container-lowest rounded-xl p-space-xs flex items-center gap-space-sm shadow-sm" href="#/facilities">
          <div class="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
            <img class="w-full h-full object-cover" alt="${escapeHtml(f.name)}" src="${escapeHtml(f.image)}" loading="lazy"/>
          </div>
          <div class="flex-1 min-w-0 pr-space-2xs">
            <div class="flex items-center gap-1 text-secondary font-label-sm text-label-sm uppercase tracking-widest mb-0.5">
              <span class="material-symbols-outlined text-sm">${escapeHtml(f.icon)}</span>
              <span>${escapeHtml(f.category)}</span>
            </div>
            <h4 class="font-headline-sm text-headline-sm text-on-surface leading-snug">${escapeHtml(f.name)}</h4>
            <p class="font-body-sm text-body-sm text-on-surface-variant line-clamp-1 mt-0.5">${escapeHtml(f.summary)}</p>
          </div>
          <span class="material-symbols-outlined text-base text-on-surface-variant flex-shrink-0">chevron_right</span>
        </a>`
        )
        .join('');
    })
    .catch((err) => {
      console.error('Failed to load facilities:', err);
      if (facilitiesEl) facilitiesEl.innerHTML = '';
    });

  document.querySelectorAll('.category-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.category-chip').forEach((c) => {
        c.classList.remove('bg-primary', 'text-on-primary', 'shadow-sm');
        c.classList.add('bg-surface-container-low', 'text-on-surface-variant');
      });
      chip.classList.remove('bg-surface-container-low', 'text-on-surface-variant');
      chip.classList.add('bg-primary', 'text-on-primary', 'shadow-sm');
      activeFilter = chip.dataset.filter;
      paint();
    });
  });
};
