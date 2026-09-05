import { fetchFacilities } from '../api.js';
import { header, bottomNav, loading, emptyState, toastMarkup } from '../components/layout.js';
import { escapeHtml } from '../format.js';

export const render = () => `
${header({ title: 'Facilities', back: true })}
<main class="flex-1 flex flex-col relative w-full pt-16 pb-24 bg-surface">
  <section class="px-gutter-mobile pt-space-md pb-space-sm">
    <span class="font-label-sm text-label-sm uppercase tracking-widest text-secondary block mb-space-2xs">What we offer</span>
    <h2 class="font-headline-lg text-headline-lg text-on-surface tracking-tight">Hotel Facilities</h2>
    <p class="font-body-md text-body-md text-on-surface-variant mt-space-2xs">Everything available to you during your stay. Tap any item for timings and details.</p>
  </section>
  <section class="px-gutter-mobile space-y-space-sm mb-space-xl" id="facilities-list">
    ${loading('Loading facilities…')}
  </section>
</main>
${toastMarkup()}
${bottomNav('facilities')}
`;

const facilityCard = (facility) => `
<div class="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm">
  <button class="w-full text-left flex items-center gap-space-sm p-space-xs" data-toggle="${escapeHtml(facility.id)}" aria-expanded="false">
    <div class="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-surface-container">
      <img class="w-full h-full object-cover" alt="${escapeHtml(facility.name)}" src="${escapeHtml(facility.image)}" loading="lazy"/>
    </div>
    <div class="flex-1 min-w-0 pr-space-2xs">
      <div class="flex items-center gap-1 text-secondary font-label-sm text-label-sm uppercase tracking-widest mb-0.5">
        <span class="material-symbols-outlined text-sm">${escapeHtml(facility.icon)}</span>
        <span>${escapeHtml(facility.category)}</span>
      </div>
      <h3 class="font-headline-sm text-headline-sm text-on-surface leading-snug">${escapeHtml(facility.name)}</h3>
      <p class="font-body-sm text-body-sm text-on-surface-variant line-clamp-1 mt-0.5">${escapeHtml(facility.summary)}</p>
    </div>
    <span class="material-symbols-outlined text-on-surface-variant transition-transform flex-shrink-0" data-icon="${escapeHtml(facility.id)}">expand_more</span>
  </button>
  <div class="hidden px-space-md pb-space-md" data-panel="${escapeHtml(facility.id)}">
    <p class="font-body-md text-body-md text-on-surface-variant leading-relaxed mb-space-sm">${escapeHtml(facility.description)}</p>
    <div class="flex flex-wrap gap-space-xs mb-space-sm">
      <span class="px-2.5 py-1 rounded-xl bg-surface-container-low text-on-surface font-body-sm text-body-sm flex items-center gap-1">
        <span class="material-symbols-outlined text-sm text-secondary">schedule</span> ${escapeHtml(facility.timings)}
      </span>
      <span class="px-2.5 py-1 rounded-xl bg-surface-container-low text-on-surface font-body-sm text-body-sm flex items-center gap-1">
        <span class="material-symbols-outlined text-sm text-secondary">location_on</span> ${escapeHtml(facility.location)}
      </span>
    </div>
    <ul class="space-y-1">
      ${(facility.highlights || [])
        .map(
          (h) => `<li class="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1.5">
            <span class="material-symbols-outlined text-sm text-secondary">check_small</span> ${escapeHtml(h)}
          </li>`
        )
        .join('')}
    </ul>
  </div>
</div>`;

export const mount = () => {
  const list = document.getElementById('facilities-list');

  fetchFacilities()
    .then((facilities) => {
      if (!list) return;
      if (!facilities.length) {
        list.innerHTML = emptyState({
          icon: 'info',
          title: 'No facilities listed',
          message: 'Facility information is being updated. Please ask at the front desk.',
        });
        return;
      }
      list.innerHTML = facilities.map(facilityCard).join('');

      list.querySelectorAll('[data-toggle]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.toggle;
          const panel = list.querySelector(`[data-panel="${id}"]`);
          const icon = list.querySelector(`[data-icon="${id}"]`);
          const isOpen = panel && !panel.classList.contains('hidden');
          panel?.classList.toggle('hidden', isOpen);
          icon?.classList.toggle('rotate-180', !isOpen);
          btn.setAttribute('aria-expanded', String(!isOpen));
        });
      });
    })
    .catch((err) => {
      console.error('Failed to load facilities:', err);
      if (list) {
        list.innerHTML = emptyState({
          icon: 'wifi_off',
          title: 'Could not load facilities',
          message: err.message,
          actionLabel: 'Back to Home',
          actionHref: '#/home',
        });
      }
    });
};
