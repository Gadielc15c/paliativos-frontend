import { createBrowserRouter, Navigate } from "react-router-dom";
import AppLayout from "../layouts/AppLayout";
import PatientsPage from "../../modules/patients/pages";
import BillingPage from "../../modules/billing/pages";
import EpisodesPage from "../../modules/episodes/pages";
import DocumentsPage from "../../modules/documents/pages";
import ReportsPage from "../../modules/reports/pages";
import AuditPage from "../../modules/audit/pages";
import ConfigPage from "../../modules/config/pages";
import EpiPage from "../../modules/epi/pages/EpiPage";
import ConsultationPage from "../../modules/consultations/pages/ConsultationPage";
import StaffPage from "../../modules/staff/pages/StaffPage";
import HomePage from "../../modules/home/pages/HomePage";
import AdminPage from "../../modules/admin/pages/AdminPage";
import AssistantPage from "../../modules/assistant/pages/AssistantPage";
import { RequirePermission } from "../../utils/usePermission";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "patients",
        element: <PatientsPage />,
      },
      {
        path: "billing",
        element: <BillingPage />,
      },
      {
        path: "episodes",
        element: <EpisodesPage />,
      },
      {
        // Movimientos now lives under Facturación as a tab.
        path: "finance",
        element: <Navigate to="/billing?tab=movimientos" replace />,
      },
      {
        path: "documents",
        element: <DocumentsPage />,
      },
      {
        path: "reports",
        element: <ReportsPage />,
      },
      {
        path: "audit",
        element: <AuditPage />,
      },
      {
        // Secretaries are managed in Equipo (one list for doctors and secretaries).
        path: "secretaries",
        element: <Navigate to="/equipo?role=secretary" replace />,
      },
      {
        path: "admin",
        element: <AdminPage />,
      },
      {
        path: "config",
        element: <ConfigPage />,
      },
      {
        path: "epidemiologia",
        element: <RequirePermission permissions={["epi:read"]}><EpiPage /></RequirePermission>,
      },
      {
        path: "consultations/:consultationId",
        element: <RequirePermission permissions={["clinical:read"]}><ConsultationPage /></RequirePermission>,
      },
      {
        // Asistente (agent chat) at full page; the same chat opens as a side panel anywhere.
        path: "asistente",
        element: <AssistantPage />,
      },
      {
        path: "equipo",
        element: <RequirePermission permissions={["staff:manage"]}><StaffPage /></RequirePermission>,
      },
    ],
  },
]);
