import { header, bottomNav, emptyState } from '../components/layout.js';

export const render = () => `
${header({ title: 'Page Not Found', back: true })}
<main class="flex-1 flex flex-col relative w-full pt-16 pb-24 bg-surface min-h-screen justify-center">
  ${emptyState({
    icon: 'travel_explore',
    title: "This page doesn't exist",
    message: 'The link you followed may be broken, or the page may have been moved.',
    actionLabel: 'Back to Home',
    actionHref: '#/home',
  })}
</main>
${bottomNav('home')}
`;
