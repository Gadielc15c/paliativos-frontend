import { createBrowserRouter } from "react-router-dom";
import AppLayout from "../layouts/AppLayout";
import PatientsPage from "../../modules/patients/pages";
import BillingPage from "../../modules/billing/pages";
import EpisodesPage from "../../modules/episodes/pages";
import FinancePage from "../../modules/finance/pages";
import DocumentsPage from "../../modules/documents/pages";
import ReportsPage from "../../modules/reports/pages";
import AuditPage from "../../modules/audit/pages";
import SecretariesPage from "../../modules/secretaries/pages";
import ConfigPage from "../../modules/config/pages";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <PatientsPage />,
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
        path: "finance",
        element: <FinancePage />,
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
        path: "secretaries",
        element: <SecretariesPage />,
      },
      {
        path: "config",
        element: <ConfigPage />,
      },
    ],
  },
]);
