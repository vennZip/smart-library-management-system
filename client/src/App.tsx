import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";

const LoginPage = lazy(() =>
  import("./pages/LoginPage").then((module) => ({ default: module.LoginPage })),
);
const UnauthorizedPage = lazy(() =>
  import("./pages/UnauthorizedPage").then((module) => ({
    default: module.UnauthorizedPage,
  })),
);
const DashboardPage = lazy(() =>
  import("./pages/DashboardPage").then((module) => ({
    default: module.DashboardPage,
  })),
);
const CatalogPage = lazy(() =>
  import("./pages/CatalogPage").then((module) => ({
    default: module.CatalogPage,
  })),
);
const BookDetailsPage = lazy(() =>
  import("./pages/BookDetailsPage").then((module) => ({
    default: module.BookDetailsPage,
  })),
);
const CirculationPage = lazy(() =>
  import("./pages/CirculationPage").then((module) => ({
    default: module.CirculationPage,
  })),
);
const ReservationsPage = lazy(() =>
  import("./pages/ReservationsPage").then((module) => ({
    default: module.ReservationsPage,
  })),
);
const FinesPage = lazy(() =>
  import("./pages/FinesPage").then((module) => ({ default: module.FinesPage })),
);
const DsaLabPage = lazy(() =>
  import("./pages/DsaLabPage").then((module) => ({
    default: module.DsaLabPage,
  })),
);
const AdminAnalyticsPage = lazy(() =>
  import("./pages/AdminAnalyticsPage").then((module) => ({
    default: module.AdminAnalyticsPage,
  })),
);
const AccountManagementPage = lazy(() =>
  import("./pages/AccountManagementPage").then((module) => ({
    default: module.AccountManagementPage,
  })),
);

function RouteFallback() {
  return (
    <main
      className="grid min-h-screen place-items-center bg-paper px-5"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="w-full max-w-sm border border-line bg-surface p-6">
        <div className="h-2 w-20 animate-pulse bg-gold" />
        <p className="mt-4 font-serif text-xl">Loading library workspace</p>
        <p className="mt-2 text-sm text-muted">Preparing the requested page…</p>
      </div>
    </main>
  );
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="catalog" element={<CatalogPage />} />
          <Route path="catalog/:id" element={<BookDetailsPage />} />
          <Route path="borrowing" element={<CirculationPage />} />
          <Route path="reservations" element={<ReservationsPage />} />
          <Route path="fines" element={<FinesPage />} />
          <Route
            path="analytics"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminAnalyticsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="accounts"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AccountManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="collection-intelligence"
            element={
              <ProtectedRoute allowedRoles={["admin", "librarian"]}>
                <DsaLabPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="dsa-lab"
            element={<Navigate to="/collection-intelligence" replace />}
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
