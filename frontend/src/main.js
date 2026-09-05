import * as HomePage from './pages/Home.js';
import * as AvailabilityPage from './pages/Availability.js';
import * as RoomsPage from './pages/Rooms.js';
import * as RoomDetailsPage from './pages/RoomDetails.js';
import * as ComparePage from './pages/Compare.js';
import * as CheckoutPage from './pages/Checkout.js';
import * as PaymentPage from './pages/Payment.js';
import * as ConfirmationPage from './pages/Confirmation.js';
import * as DashboardPage from './pages/Dashboard.js';
import * as FacilitiesPage from './pages/Facilities.js';
import * as AdminPage from './pages/Admin.js';
import * as NotFoundPage from './pages/NotFound.js';
import { mountLayout } from './components/layout.js';

const app = document.getElementById('app');

const routes = {
  home: HomePage,
  availability: AvailabilityPage,
  rooms: RoomsPage,
  'room-details': RoomDetailsPage,
  compare: ComparePage,
  checkout: CheckoutPage,
  payment: PaymentPage,
  confirmation: ConfirmationPage,
  dashboard: DashboardPage,
  facilities: FacilitiesPage,
  admin: AdminPage,
};

const parseHash = () => {
  const raw = (window.location.hash || '#/home').replace(/^#\/?/, '');
  const [path, ...rest] = raw.split('/');
  return { path: path || 'home', param: rest.length ? decodeURIComponent(rest.join('/')) : undefined };
};

const render = () => {
  const { path, param } = parseHash();
  const page = routes[path] || NotFoundPage;

  try {
    app.innerHTML = page.render(param);
    mountLayout();
    page.mount?.(param);
  } catch (err) {
    console.error(`Failed to render "${path}":`, err);
    app.innerHTML = NotFoundPage.render();
    mountLayout();
  }

  window.scrollTo(0, 0);
};

window.addEventListener('hashchange', render);
render();
