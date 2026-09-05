import { fetchRoom } from '../api.js';
import { getDraft, updateDraft } from '../state.js';
import { header, bottomNav, loading, emptyState, toastMarkup, showToast } from '../components/layout.js';
import { formatINR, nightsBetween, escapeHtml } from '../format.js';

const AMENITY_ICONS = {
  AC: 'ac_unit',
  'Non-AC': 'air',
  'Free WiFi': 'wifi',
  TV: 'tv',
  'Attached Bathroom': 'bathtub',
  '24-Hour Hot Water': 'water_drop',
  'Complimentary Filter Coffee': 'local_cafe',
  'Work Desk': 'desk',
  'Breakfast Included': 'bakery_dining',
  'Garden View': 'yard',
  '2 Double Beds': 'king_bed',
  'Single Bed': 'single_bed',
};

const POLICIES = [
  {
    id: 'checkin',
    icon: 'schedule',
    title: 'Check-in &amp; Check-out',
    body: 'Check-in from 12:00 noon, check-out by 11:00 AM. Kindly carry a valid government photo ID (Aadhaar, Passport or Driving Licence) for all guests — mandatory as per local police rules. Early check-in and late check-out can be arranged, subject to availability.',
  },
  {
    id: 'cancellation',
    icon: 'verified_user',
    title: 'Cancellation Policy',
    body: 'Free cancellation up to 48 hours before check-in, no questions asked. Cancel within 48 hours and a 1-night charge applies — it converts into hotel credit valid for 12 months.',
  },
  {
    id: 'house',
    icon: 'home',
    title: 'House Rules',
    body: 'Quiet hours from 10 PM to 7 AM. Strictly non-smoking rooms; smoking area available on request. Outside food is not permitted, but our kitchen is happy to cook anything on request.',
  },
];

export const render = () => `
${header({ title: 'Room Details', back: true })}
<main class="flex-1 flex flex-col relative w-full pt-16 bg-surface">
  <div class="flex flex-col w-full pb-32" id="room-detail-root">
    ${loading('Loading room…')}
  </div>
</main>
${toastMarkup()}
${bottomNav('rooms')}
`;

const detailMarkup = (room, nights) => {
  const gallery = room.gallery?.length ? room.gallery : [room.image];
  const soldOut = room.availableUnits === 0;

  return `
  <section class="relative w-full overflow-hidden">
    <div class="flex w-full overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar" id="gallery-carousel">
      ${gallery
        .map(
          (src, i) => `
        <div class="w-full flex-shrink-0 snap-center relative aspect-[4/3] max-h-[380px] bg-surface-container">
          <img class="w-full h-full object-cover" alt="${escapeHtml(room.name)} — photo ${i + 1}" src="${escapeHtml(src)}"/>
          <div class="absolute inset-0 bg-gradient-to-t from-primary/50 via-transparent to-primary/10 pointer-events-none"></div>
        </div>`
        )
        .join('')}
    </div>
    <div class="absolute top-4 right-4 flex items-center gap-space-2xs">
      <button class="h-9 w-9 rounded-full bg-surface/90 backdrop-blur-md flex items-center justify-center text-on-surface shadow-sm active:scale-90 transition-transform" id="favorite-btn" aria-label="Save room">
        <span class="material-symbols-outlined text-base" id="fav-icon">favorite_border</span>
      </button>
      <button class="h-9 w-9 rounded-full bg-surface/90 backdrop-blur-md flex items-center justify-center text-on-surface shadow-sm active:scale-90 transition-transform" id="share-btn" aria-label="Share room">
        <span class="material-symbols-outlined text-base">ios_share</span>
      </button>
    </div>
    ${
      gallery.length > 1
        ? `<div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/40 backdrop-blur-md">
            ${gallery
              .map(
                (_, i) =>
                  `<div class="h-1.5 rounded-full bg-surface-container-lowest transition-all ${i === 0 ? 'w-4' : 'w-1.5 opacity-50'}" data-dot="${i}"></div>`
              )
              .join('')}
          </div>`
        : ''
    }
  </section>

  <div class="px-gutter-mobile pt-space-lg flex flex-col gap-space-xs">
    <div class="flex items-center justify-between gap-space-xs">
      <span class="font-label-sm text-label-sm uppercase tracking-widest text-secondary font-semibold">${escapeHtml(room.floor)} · ${escapeHtml(room.category)}</span>
      <div class="flex items-center gap-1 bg-surface-container-low px-2 py-0.5 rounded-full flex-shrink-0">
        <span class="material-symbols-outlined text-xs text-secondary" style="font-variation-settings: 'FILL' 1;">star</span>
        <span class="font-label-sm text-label-sm text-on-surface font-medium">${room.rating}</span>
        <span class="font-label-sm text-label-sm text-on-surface-variant font-normal">(${room.reviewCount})</span>
      </div>
    </div>
    <h2 class="font-headline-xl-mobile text-headline-xl-mobile text-on-surface font-normal tracking-tight">${escapeHtml(room.name)}</h2>

    <div class="flex items-center flex-wrap gap-2 pt-1">
      <div class="flex items-center gap-1.5 bg-surface-container-low px-2.5 py-1 rounded-md">
        <span class="material-symbols-outlined text-sm text-outline">square_foot</span>
        <span class="font-label-sm text-label-sm text-on-surface">${room.sizeSqft} sq.ft</span>
      </div>
      <div class="flex items-center gap-1.5 bg-surface-container-low px-2.5 py-1 rounded-md">
        <span class="material-symbols-outlined text-sm text-outline">group</span>
        <span class="font-label-sm text-label-sm text-on-surface">Up to ${room.maxGuests} guests</span>
      </div>
      <div class="flex items-center gap-1.5 bg-surface-container-low px-2.5 py-1 rounded-md">
        <span class="material-symbols-outlined text-sm text-outline">bed</span>
        <span class="font-label-sm text-label-sm text-on-surface">${escapeHtml(room.bedType)}</span>
      </div>
    </div>

    ${
      room.availableUnits !== undefined
        ? `<p class="font-body-sm text-body-sm ${soldOut ? 'text-error' : 'text-on-tertiary-container'} flex items-center gap-1 mt-space-2xs">
             <span class="material-symbols-outlined text-sm">${soldOut ? 'event_busy' : 'event_available'}</span>
             ${soldOut ? 'Fully booked for your dates' : `${room.availableUnits} room${room.availableUnits === 1 ? '' : 's'} left for your dates`}
           </p>`
        : ''
    }

    <div class="mt-space-sm p-space-md bg-surface-container-lowest rounded-xl shadow-sm flex items-center justify-between gap-space-sm">
      <div class="flex flex-col min-w-0">
        <div class="flex items-baseline gap-1.5">
          <span class="font-headline-md text-headline-md text-on-surface font-normal">${formatINR(room.price)}</span>
          <span class="font-body-sm text-body-sm text-on-surface-variant">/ night</span>
        </div>
        <span class="font-label-sm text-label-sm text-on-surface-variant/80 tracking-wide mt-0.5">Plus GST, as per Government norms</span>
      </div>
      <button class="px-2.5 py-1 rounded bg-surface-container-low text-secondary font-label-sm text-label-sm uppercase tracking-wider hover:bg-surface-container transition-colors flex-shrink-0" id="tax-toggle">Taxes info</button>
    </div>
    <div class="hidden mt-2 p-space-sm bg-surface-container-low rounded-lg text-on-surface" id="tax-dialog">
      <div class="flex justify-between items-center pb-1">
        <span class="font-label-sm text-label-sm text-on-surface-variant">GST on room tariff</span>
        <span class="font-label-sm text-label-sm font-medium">${room.price < 1000 ? 'Nil (under ₹1,000)' : room.price <= 7500 ? '12%' : '18%'}</span>
      </div>
      <div class="flex justify-between items-center pt-1.5 mt-1 border-t border-surface-container-highest">
        <span class="font-label-sm text-label-sm font-semibold uppercase text-secondary">Final total</span>
        <span class="font-label-sm text-label-sm text-on-surface-variant">Shown at checkout</span>
      </div>
    </div>
  </div>

  <section class="px-gutter-mobile mt-space-xl flex flex-col gap-space-sm">
    <div class="flex items-center justify-between">
      <div>
        <span class="font-label-sm text-label-sm uppercase tracking-widest text-secondary font-semibold">Facilities</span>
        <h3 class="font-headline-sm text-headline-sm text-on-surface">Room Amenities</h3>
      </div>
      <span class="font-label-sm text-label-sm text-on-surface-variant">${room.amenities.length} included</span>
    </div>
    <div class="grid grid-cols-2 gap-space-xs">
      ${room.amenities
        .map(
          (amenity) => `
        <div class="p-space-sm bg-surface-container-lowest rounded-xl flex items-center gap-space-xs shadow-sm">
          <div class="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center flex-shrink-0 text-secondary">
            <span class="material-symbols-outlined text-lg">${AMENITY_ICONS[amenity] || 'check_circle'}</span>
          </div>
          <span class="font-label-md text-label-md text-on-surface">${escapeHtml(amenity)}</span>
        </div>`
        )
        .join('')}
    </div>
  </section>

  <section class="px-gutter-mobile mt-space-xl">
    <div class="p-space-md bg-surface-container-lowest rounded-xl shadow-sm flex flex-col gap-space-xs">
      <span class="font-label-sm text-label-sm uppercase tracking-widest text-secondary font-semibold">About This Room</span>
      <h3 class="font-headline-sm text-headline-sm text-on-surface font-normal">Simple, Clean &amp; Comfortable</h3>
      <p class="font-body-md text-body-md text-on-surface-variant leading-relaxed">${escapeHtml(room.description)}</p>
    </div>
  </section>

  <section class="px-gutter-mobile mt-space-md flex flex-col gap-2">
    ${POLICIES.map(
      (policy) => `
      <div class="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm">
        <button class="w-full p-space-md flex items-center justify-between text-left focus:outline-none" data-policy="${policy.id}" aria-expanded="false">
          <div class="flex items-center gap-space-xs">
            <span class="material-symbols-outlined text-secondary text-lg">${policy.icon}</span>
            <span class="font-label-md text-label-md text-on-surface uppercase tracking-wider font-semibold">${policy.title}</span>
          </div>
          <span class="material-symbols-outlined text-on-surface-variant transition-transform" data-policy-icon="${policy.id}">expand_more</span>
        </button>
        <div class="hidden px-space-md pb-space-md" data-policy-panel="${policy.id}">
          <p class="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">${policy.body}</p>
        </div>
      </div>`
    ).join('')}
  </section>

  <aside class="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[428px] z-40 bg-surface-container-lowest/95 backdrop-blur-xl border-t border-surface-container-high pb-safe shadow-[0_-8px_30px_rgba(0,0,0,0.06)]">
    <div class="max-w-md mx-auto px-gutter-mobile py-space-sm flex items-center justify-between gap-space-md">
      <div class="flex flex-col min-w-0">
        <div class="flex items-baseline gap-1">
          <span class="font-headline-sm text-headline-sm text-on-surface font-normal">${formatINR(room.price * (nights || 1))}</span>
          <span class="font-body-sm text-body-sm text-on-surface-variant">total</span>
        </div>
        <a class="text-left font-label-sm text-label-sm text-secondary underline tracking-wide" href="#/availability">
          ${nights} night${nights === 1 ? '' : 's'} · change dates
        </a>
      </div>
      ${
        soldOut
          ? `<span class="flex-1 max-w-[200px] h-12 bg-surface-container text-on-surface-variant rounded-lg font-label-md text-label-md uppercase tracking-wider flex items-center justify-center">Sold Out</span>`
          : `<button class="flex-1 max-w-[200px] h-12 bg-secondary text-on-secondary rounded-lg font-label-md text-label-md uppercase tracking-wider shadow-md hover:bg-on-secondary-container active:scale-[0.98] transition-all flex items-center justify-center gap-1.5" id="book-btn">
               <span>Book Now</span>
               <span class="material-symbols-outlined text-base">arrow_forward</span>
             </button>`
      }
    </div>
  </aside>`;
};

export const mount = (roomId) => {
  const root = document.getElementById('room-detail-root');
  const draft = getDraft();
  const nights = nightsBetween(draft.checkIn, draft.checkOut);

  if (!roomId) {
    root.innerHTML = emptyState({
      icon: 'bed',
      title: 'No room selected',
      message: 'Pick a room from the list to see its details.',
      actionLabel: 'Browse Rooms',
      actionHref: '#/rooms',
    });
    return;
  }

  fetchRoom(roomId, { checkIn: draft.checkIn, checkOut: draft.checkOut })
    .then((room) => {
      root.innerHTML = detailMarkup(room, nights);

      const carousel = document.getElementById('gallery-carousel');
      carousel?.addEventListener('scroll', () => {
        const index = Math.round(carousel.scrollLeft / carousel.offsetWidth);
        document.querySelectorAll('[data-dot]').forEach((dot, i) => {
          dot.classList.toggle('w-4', i === index);
          dot.classList.toggle('w-1.5', i !== index);
          dot.classList.toggle('opacity-50', i !== index);
        });
      });

      document.getElementById('favorite-btn')?.addEventListener('click', () => {
        const icon = document.getElementById('fav-icon');
        const saved = icon.textContent.trim() === 'favorite';
        icon.textContent = saved ? 'favorite_border' : 'favorite';
        icon.style.fontVariationSettings = saved ? "'FILL' 0" : "'FILL' 1";
        showToast(saved ? 'Removed from saved rooms' : 'Saved to your list');
      });

      document.getElementById('share-btn')?.addEventListener('click', async () => {
        try {
          if (navigator.share) {
            await navigator.share({
              title: `${room.name} · Pandian Hotel & Room Stay`,
              url: window.location.href,
            });
          } else {
            await navigator.clipboard.writeText(window.location.href);
            showToast('Link copied to clipboard');
          }
        } catch {
          /* guest dismissed the share sheet */
        }
      });

      document.getElementById('tax-toggle')?.addEventListener('click', () => {
        document.getElementById('tax-dialog')?.classList.toggle('hidden');
      });

      document.querySelectorAll('[data-policy]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.policy;
          const panel = document.querySelector(`[data-policy-panel="${id}"]`);
          const icon = document.querySelector(`[data-policy-icon="${id}"]`);
          const isOpen = panel && !panel.classList.contains('hidden');
          panel?.classList.toggle('hidden', isOpen);
          icon?.classList.toggle('rotate-180', !isOpen);
          btn.setAttribute('aria-expanded', String(!isOpen));
        });
      });

      document.getElementById('book-btn')?.addEventListener('click', () => {
        updateDraft({ roomId: room.id });
        window.location.hash = `#/checkout/${room.id}`;
      });
    })
    .catch((err) => {
      console.error('Failed to load room:', err);
      root.innerHTML = emptyState({
        icon: 'error_outline',
        title: 'Could not load this room',
        message: err.message,
        actionLabel: 'Browse Rooms',
        actionHref: '#/rooms',
      });
    });
};
