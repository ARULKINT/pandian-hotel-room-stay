import { formatINR, escapeHtml } from '../format.js';

/**
 * One room card. Used on Home, Rooms and Availability so the three screens can
 * never drift apart.
 *
 * `nights` renders a stay total; `availableUnits` (when present) drives the
 * sold-out state.
 */
export const roomCard = (room, { nights = 0, showCompare = false } = {}) => {
  const soldOut = room.availableUnits === 0;
  const lowStock = room.availableUnits > 0 && room.availableUnits <= 2;
  const stayTotal = nights > 0 ? room.price * nights : 0;

  return `
  <article class="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm flex flex-col ${soldOut ? 'opacity-60' : ''}" data-room-id="${escapeHtml(room.id)}">
    <div class="relative w-full h-48 overflow-hidden bg-surface-container">
      <img class="w-full h-full object-cover" alt="${escapeHtml(room.name)}" src="${escapeHtml(room.image)}" loading="lazy"/>
      <div class="absolute top-3 left-3 px-space-xs py-1 rounded-full bg-surface-container-lowest/90 backdrop-blur-md font-label-sm text-label-sm text-on-surface flex items-center gap-1 shadow-sm">
        <span class="material-symbols-outlined text-xs text-secondary" style="font-variation-settings: 'FILL' 1;">star</span>
        <span>${room.rating} (${room.reviewCount})</span>
      </div>
      ${
        soldOut
          ? `<div class="absolute bottom-3 left-3 px-2.5 py-1 rounded bg-primary/85 text-on-primary font-label-sm text-label-sm uppercase tracking-wider">Sold out</div>`
          : lowStock
            ? `<div class="absolute bottom-3 left-3 px-2.5 py-1 rounded bg-secondary text-on-secondary font-label-sm text-label-sm uppercase tracking-wider">Only ${room.availableUnits} left</div>`
            : ''
      }
      ${
        showCompare
          ? `<label class="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-surface-container-lowest/90 backdrop-blur-md shadow-sm cursor-pointer select-none">
               <input class="w-3.5 h-3.5 accent-primary" type="checkbox" data-compare="${escapeHtml(room.id)}"/>
               <span class="font-label-sm text-label-sm uppercase tracking-wider text-on-surface">Compare</span>
             </label>`
          : ''
      }
    </div>
    <div class="p-space-md flex flex-col flex-1">
      <div class="flex items-baseline justify-between gap-space-xs mb-space-2xs">
        <h3 class="font-headline-sm text-headline-sm text-on-surface">${escapeHtml(room.name)}</h3>
        <div class="text-right flex-shrink-0">
          <span class="font-headline-sm text-headline-sm text-secondary font-semibold">${formatINR(room.price)}</span>
          <span class="font-body-sm text-body-sm text-on-surface-variant">/night</span>
        </div>
      </div>
      <p class="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 mb-space-sm">${escapeHtml(room.description)}</p>
      <div class="flex items-center gap-space-xs flex-wrap mb-space-sm">
        <span class="px-2.5 py-1 rounded-xl bg-surface-container-low text-on-surface font-body-sm text-body-sm flex items-center gap-1">
          <span class="material-symbols-outlined text-sm text-on-surface-variant">group</span> Up to ${room.maxGuests}
        </span>
        <span class="px-2.5 py-1 rounded-xl bg-surface-container-low text-on-surface font-body-sm text-body-sm flex items-center gap-1">
          <span class="material-symbols-outlined text-sm text-on-surface-variant">square_foot</span> ${room.sizeSqft} sq.ft
        </span>
        <span class="px-2.5 py-1 rounded-xl bg-surface-container-low text-on-surface font-body-sm text-body-sm flex items-center gap-1">
          <span class="material-symbols-outlined text-sm text-on-surface-variant">${room.type === 'ac' ? 'ac_unit' : 'air'}</span> ${room.type === 'ac' ? 'AC' : 'Non-AC'}
        </span>
      </div>
      ${
        stayTotal
          ? `<p class="font-body-sm text-body-sm text-on-surface-variant mb-space-sm">${formatINR(stayTotal)} for ${nights} night${nights === 1 ? '' : 's'} <span class="text-outline">+ taxes</span></p>`
          : ''
      }
      <div class="flex items-center justify-between gap-space-xs pt-space-xs mt-auto">
        <a class="font-label-sm text-label-sm uppercase tracking-wider text-on-surface hover:text-secondary underline decoration-1 underline-offset-4" href="#/room-details/${escapeHtml(room.id)}">Room Details</a>
        ${
          soldOut
            ? `<span class="px-space-md py-2.5 rounded-xl bg-surface-container text-on-surface-variant font-label-sm text-label-sm uppercase tracking-widest">Unavailable</span>`
            : `<button class="px-space-md py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-sm text-label-sm uppercase tracking-widest transition-colors shadow-sm" data-book="${escapeHtml(room.id)}">Book Now</button>`
        }
      </div>
    </div>
  </article>`;
};

/** Wires Book buttons and Compare checkboxes inside `container`. */
export const mountRoomCards = (container, { onBook, onCompare } = {}) => {
  if (!container) return;

  container.querySelectorAll('[data-book]').forEach((btn) => {
    btn.addEventListener('click', () => onBook?.(btn.dataset.book));
  });

  container.querySelectorAll('[data-compare]').forEach((box) => {
    box.addEventListener('change', () => onCompare?.(box.dataset.compare, box.checked));
  });
};
