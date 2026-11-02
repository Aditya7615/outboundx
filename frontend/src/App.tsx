import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { GuestRoute, ProtectedRoute } from "./components/RouteGuards";
import { PageLoader } from "./components/ui/Spinner";

const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const ContactsPage = lazy(() => import("./pages/ContactsPage"));
const CampaignsPage = lazy(() => import("./pages/CampaignsPage"));
const CampaignBuilderPage = lazy(() => import("./pages/CampaignBuilderPage"));
const CampaignDetailPage = lazy(() => import("./pages/CampaignDetailPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

export default function App() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <PageLoader />
        </div>
      }
    >
      <Routes>
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/campaigns" element={<CampaignsPage />} />
            <Route path="/campaigns/new" element={<CampaignBuilderPage />} />
            <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
            <Route path="/audiences" element={<ContactsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
