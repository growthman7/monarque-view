import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { FlowLayout, PublicLayout } from '../components/layout/Layouts';
import { PageLoader } from '../components/common';
import { useAuth } from '../contexts/AuthContext';
import { can, isStaff } from '../utils/permissions';

import HomePage from '../pages/public/HomePage';
const AboutPage = lazy(() => import('../pages/public/AboutPage'));
const NotFoundPage = lazy(() => import('../pages/public/NotFoundPage'));
const CinemaPage = lazy(() => import('../pages/cinema/CinemaPage'));
const FilmPage = lazy(() => import('../pages/cinema/FilmPage'));
const SeatSelectionPage = lazy(() => import('../pages/cinema/SeatSelectionPage'));
const RestaurantsPage = lazy(() => import('../pages/restaurants/RestaurantsPage'));
const RestaurantPage = lazy(() => import('../pages/restaurants/RestaurantPage'));
const TableSelectionPage = lazy(() => import('../pages/restaurants/TableSelectionPage'));
const CheckoutPage = lazy(() => import('../pages/reservation/CheckoutPage'));
const ConfirmationPage = lazy(() => import('../pages/reservation/ConfirmationPage'));
const FindReservationPage = lazy(() => import('../pages/reservation/FindReservationPage'));
const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('../pages/auth/RegisterPage'));
const AccountPage = lazy(() => import('../pages/auth/AccountPage'));
const AdminLayout = lazy(() => import('../pages/admin/AdminLayout'));
const DashboardPage = lazy(() => import('../pages/admin/DashboardPage'));
const FilmsAdminPage = lazy(() => import('../pages/admin/FilmsAdminPage'));
const SessionsAdminPage = lazy(() => import('../pages/admin/SessionsAdminPage'));
const HallsAdminPage = lazy(() => import('../pages/admin/HallsAdminPage'));
const RestaurantsAdminPage = lazy(() => import('../pages/admin/RestaurantsAdminPage'));
const PlanEditorPage = lazy(() => import('../pages/admin/PlanEditorPage'));
const ReservationsAdminPage = lazy(() => import('../pages/admin/ReservationsAdminPage'));
const TransactionsAdminPage = lazy(() => import('../pages/admin/TransactionsAdminPage'));
const UsersAdminPage = lazy(() => import('../pages/admin/UsersAdminPage'));

function RequireAuth({ children, staff = false, permission }) {
  const { user, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return <PageLoader />;
  if (!user) return <Navigate to="/connexion" replace state={{ from: loc.pathname }} />;
  if (staff && !isStaff(user)) return <Navigate to="/compte" replace />;
  if (permission && !can(user, permission)) return <Navigate to="/admin" replace />;
  return children;
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="a-propos" element={<AboutPage />} />
          <Route path="cinema" element={<CinemaPage />} />
          <Route path="cinema/films/:filmId" element={<FilmPage />} />
          <Route path="restaurants" element={<RestaurantsPage />} />
          <Route path="restaurants/:restaurantId" element={<RestaurantPage />} />
          <Route path="reservation/retrouver" element={<FindReservationPage />} />
          <Route path="connexion" element={<LoginPage />} />
          <Route path="inscription" element={<RegisterPage />} />
          <Route path="compte" element={<RequireAuth><AccountPage /></RequireAuth>} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route element={<FlowLayout />}>
          <Route path="cinema/seances/:sessionId" element={<SeatSelectionPage />} />
          <Route path="restaurants/:restaurantId/reserver" element={<TableSelectionPage />} />
          <Route path="reservation/:reservationId/paiement" element={<CheckoutPage />} />
          <Route path="reservation/:reservationId/confirmation" element={<ConfirmationPage />} />
        </Route>
        <Route path="admin" element={<RequireAuth staff><AdminLayout /></RequireAuth>}>
          <Route index element={<DashboardPage />} />
          <Route path="films" element={<RequireAuth permission="films:manage"><FilmsAdminPage /></RequireAuth>} />
          <Route path="seances" element={<RequireAuth permission="sessions:manage"><SessionsAdminPage /></RequireAuth>} />
          <Route path="salles" element={<RequireAuth permission="halls:manage"><HallsAdminPage /></RequireAuth>} />
          <Route path="restaurants" element={<RequireAuth permission="restaurants:manage"><RestaurantsAdminPage /></RequireAuth>} />
          <Route path="plans/:planId" element={<RequireAuth permission="plans:edit"><PlanEditorPage /></RequireAuth>} />
          <Route path="reservations" element={<RequireAuth permission="reservations:view"><ReservationsAdminPage /></RequireAuth>} />
          <Route path="transactions" element={<RequireAuth permission="payments:view"><TransactionsAdminPage /></RequireAuth>} />
          <Route path="utilisateurs" element={<RequireAuth permission="users:manage"><UsersAdminPage /></RequireAuth>} />
        </Route>
      </Routes>
    </Suspense>
  );
}
