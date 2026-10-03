import { Link } from "react-router-dom";
import { ChevronRight, DollarSign } from "lucide-react";
import PageHeader from "../../../components/common/PageHeader";
import { useAppStore } from "../../../app/store/useAppStore";
import { ADMIN_GROUPS } from "../../../app/layouts/navigation";
import { label } from "../../../utils/labels";
import "./AdminPage.css";

/** Administración: one hub with grouped rows (iOS Settings). Each row says what is inside. */
export default function AdminPage() {
  const { permissions, user } = useAppStore();
  const groups = ADMIN_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => !i.permission || permissions.includes(i.permission)) }))
    .filter((g) => g.items.length > 0);
  const canBilling = permissions.includes("billing:read");

  return (
    <div className="data-screen admin-page">
      <PageHeader title="Administración"
        description={user ? `${user.name} · ${label("role", user.role)}` : "Equipo, registros y preferencias de la clínica."} />
      {groups.map((g) => (
        <section key={g.title} className="admin-group" aria-labelledby={`admin-${g.title}`}>
          <h2 id={`admin-${g.title}`} className="admin-group-title">{g.title}</h2>
          <ul className="admin-list">
            {g.items.map((item) => (
              <li key={item.path}>
                <Link to={item.path} className="admin-row">
                  <span className="admin-row-icon" aria-hidden="true"><item.icon size={20} /></span>
                  <span className="admin-row-copy">
                    <span className="admin-row-label">{item.label}</span>
                    <span className="admin-row-desc">{item.description}</span>
                  </span>
                  <ChevronRight size={18} className="admin-row-chevron" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {canBilling && (
        <p className="admin-hint"><DollarSign size={16} aria-hidden="true" /><span>Los pagos y gastos (Movimientos) ahora están en <Link to="/billing?tab=movimientos">Facturación › Movimientos</Link>.</span></p>
      )}
    </div>
  );
}
