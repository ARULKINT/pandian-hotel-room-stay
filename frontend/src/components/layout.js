import { escapeHtml } from '../format.js';

export const HOTEL_NAME = 'Pandian Hotel & Room Stay';

/**
 * Fixed top bar. Pass `back: true` for inner pages, or `title` to replace the
 * brand wordmark with a page title.
 */
export const header = ({ title = '', back = false } = {}) => `
<header class="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[428px] z-50 pt-safe bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
  <div class="h-16 px-gutter-mobile flex items-center justify-between gap-space-xs">
    <div class="flex items-center gap-space-xs min-w-0">
      ${
        back
          ? `<button aria-label="Go back" class="min-h-[44px] min-w-[44px] -ml-2 flex items-center justify-center text-on-surface hover:text-secondary transition-colors" data-action="back"><span class="material-symbols-outlined text-xl">arrow_back_ios_new</span></button>`
          : ''
      }
      <a class="flex items-center gap-space-xs min-w-0" href="#/home">
        <img alt="${escapeHtml(HOTEL_NAME)} logo" class="h-8 w-auto object-contain flex-shrink-0" src="/logos/logo.svg"/>
        ${
          title
            ? `<h1 class="font-headline-sm text-headline-sm tracking-tight text-on-surface truncate">${escapeHtml(title)}</h1>`
            : `<span class="font-headline-sm text-headline-sm tracking-tight text-on-surface select-none truncate">${escapeHtml(HOTEL_NAME)}</span>`
        }
      </a>
    </div>
    <div class="flex items-center gap-space-xs flex-shrink-0">
      <a class="min-h-[44px] min-w-[44px] flex items-center justify-center text-on-surface-variant hover:text-secondary transition-colors" href="#/dashboard" aria-label="My stays">
        <span class="material-symbols-outlined text-xl">account_circle</span>
      </a>
    </div>
  </div>
</header>`;

const NAV_ITEMS = [
  { path: 'home', href: '#/home', icon: 'explore', label: 'Explore' },
  { path: 'rooms', href: '#/rooms', icon: 'bed', label: 'Rooms' },
  { path: 'stays', href: '#/dashboard', icon: 'calendar_today', label: 'My Stays' },
  { path: 'facilities', href: '#/facilities', icon: 'room_service', label: 'Facilities' },
];

/** Fixed bottom tab bar. `active` matches a NAV_ITEMS path. */
export const bottomNav = (active = 'home') => `
<nav class="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[428px] z-50 pb-safe bg-surface/90 backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
  <div class="flex justify-around items-center h-16 px-space-xs max-w-container-max mx-auto">
    ${NAV_ITEMS.map((item) => {
      const isActive = item.path === active;
      return `<a ${isActive ? 'aria-current="page"' : ''} class="flex flex-col items-center justify-center gap-1 min-h-[44px] min-w-[44px] flex-1 transition-colors ${
        isActive
          ? 'text-secondary font-semibold'
          : 'text-on-surface-variant hover:text-on-surface'
      }" href="${item.href}">
        <span class="material-symbols-outlined text-xl">${item.icon}</span>
        <span class="font-label-sm text-label-sm tracking-wider uppercase">${item.label}</span>
      </a>`;
    }).join('')}
  </div>
</nav>`;

/** Full-width message block for empty / error states. */
export const emptyState = ({ icon = 'info', title, message, actionLabel, actionHref }) => `
<div class="px-gutter-mobile py-space-2xl flex flex-col items-center text-center gap-space-xs">
  <div class="w-14 h-14 rounded-full bg-surface-container-low flex items-center justify-center text-outline mb-space-2xs">
    <span class="material-symbols-outlined text-3xl">${icon}</span>
  </div>
  <h3 class="font-headline-sm text-headline-sm text-on-surface">${escapeHtml(title)}</h3>
  <p class="font-body-md text-body-md text-on-surface-variant max-w-xs">${escapeHtml(message)}</p>
  ${
    actionLabel && actionHref
      ? `<a class="mt-space-sm px-space-lg py-2.5 rounded-xl bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-widest shadow-sm" href="${actionHref}">${escapeHtml(actionLabel)}</a>`
      : ''
  }
</div>`;

/** Inline loading placeholder. */
export const loading = (message = 'Loading…') => `
<p class="py-space-2xl text-center font-body-md text-body-md text-on-surface-variant">${escapeHtml(message)}</p>`;

/** Small toast, mounted once per page that needs it. */
export const toastMarkup = () => `
<div class="fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-2.5 bg-primary text-on-primary rounded-xl shadow-xl transition-opacity duration-300 opacity-0 pointer-events-none z-[60] flex items-center gap-2 font-label-sm text-label-sm whitespace-nowrap max-w-[90vw]" id="app-toast">
  <span class="material-symbols-outlined text-secondary-container text-base">check_circle</span>
  <span id="app-toast-message">Done</span>
</div>`;

export const showToast = (message) => {
  const toast = document.getElementById('app-toast');
  const label = document.getElementById('app-toast-message');
  if (!toast || !label) return;
  label.textContent = message;
  toast.classList.remove('opacity-0');
  toast.classList.add('opacity-100');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    toast.classList.remove('opacity-100');
    toast.classList.add('opacity-0');
  }, 2400);
};

/** Wires shared controls (currently the header back button). */
export const mountLayout = () => {
  document.querySelectorAll('[data-action="back"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (window.history.length > 1) window.history.back();
      else window.location.hash = '#/home';
    });
  });
};
