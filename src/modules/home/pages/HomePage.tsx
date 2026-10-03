import { useNavigate } from "react-router-dom";
import PageHeader from "../../../components/common/PageHeader";
import { useAppStore } from "../../../app/store/useAppStore";
import { usePermission } from "../../../utils/usePermission";
import { useDashboardAlerts } from "../../../components/clinical/alerts";
import AlertsSection from "../components/AlertsSection";
import TodaySection from "../components/TodaySection";
import AnalyticsSection from "../components/AnalyticsSection";
import { fmt } from "../components/format";
import "../../../components/clinical/clinical.css";
import "./HomePage.css";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
}

/**
 * Inicio: answers "what do I do first?" — alerts (one action each), then today's work,
 * then the analytics. Secretaries only see the operational part.
 */
export default function HomePage() {
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const canClinical = usePermission("clinical:read");
  const isAdmin = user?.role === "admin";
  const { data: alerts } = useDashboardAlerts();
  const date = new Date().toLocaleDateString("es-DO", { weekday: "long", day: "numeric", month: "long" });
  const urgent = alerts ? alerts.counts.alert + alerts.counts.watch : 0;

  const lead = !alerts ? "Revisando lo que necesita tu atención…"
    : urgent === 0 ? "No hay nada urgente. Puedes seguir con tus pacientes de hoy."
    : `${fmt(urgent)} ${urgent === 1 ? "asunto necesita" : "asuntos necesitan"} tu atención. Empieza por el botón azul de la primera alerta.`;

  return (
    <div className="data-screen home-page">
      <PageHeader
        eyebrow={<span className="home-date">Inicio · {date}</span>}
        title={`${greeting()}${user?.name ? `, ${user.name}` : ""}`}
        description={lead}
      />
      <AlertsSection onEmptyAction={() => navigate("/patients")} />
      <TodaySection />
      {canClinical && <AnalyticsSection isAdmin={isAdmin} />}
    </div>
  );
}
