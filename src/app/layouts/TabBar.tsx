import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { LogOut, MoreHorizontal, Sparkles, Stethoscope, UserPlus } from "lucide-react";
import { openNewConsultation, openNewPatient } from "../../modules/patients/quick/store";
import { useAppStore } from "../store/useAppStore";
import { openAssistant } from "../../modules/assistant/store";
import { clearSession } from "../../services/auth";
import { ADMIN_GROUPS, NAV_ITEMS, isNavActive } from "./navigation";
import "../../components/common/ActionMenu.css";
import "./TabBar.css";

/**
 * Phone navigation: Inicio, Pacientes, Epidemiología, Facturación + "Más" (the Administración hub).
 * Translucent, safe-area aware. Hidden above 768px.
 */
export default function TabBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { permissions, setUser, setPermissions } = useAppStore();
  const tabs = NAV_ITEMS.filter((i) => i.path !== "/admin" && (!i.permission || permissions.includes(i.permission)));
  const admin = NAV_ITEMS.find((i) => i.path === "/admin")!;
  const more = ADMIN_GROUPS.flatMap((g) => g.items).filter((m) => !m.permission || permissions.includes(m.permission));
  const moreActive = isNavActive(admin, pathname);

  return (
    <>
      <nav className="tab-bar" aria-label="Navegación principal" style={{ gridTemplateColumns: `repeat(${tabs.length + 1}, minmax(0, 1fr))` }}>
        {tabs.map((item) => {
          const active = isNavActive(item, pathname);
          return (
            <NavLink key={item.path} to={item.path} end={item.path === "/"} className={clsx("tab-bar-item", active && "is-active")} aria-current={active ? "page" : undefined}>
              <item.icon size={22} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
        <button type="button" className={clsx("tab-bar-item", moreActive && "is-active")} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(true)}>
          <MoreHorizontal size={22} aria-hidden="true" />
          <span>Más</span>
        </button>
      </nav>
      {open && createPortal(
        <div className="action-menu-layer is-sheet" onClick={() => setOpen(false)}>
          <div className="action-menu-panel" role="menu" aria-label="Más opciones" onClick={(e) => e.stopPropagation()}>
            <p className="action-menu-title">Más</p>
            {(permissions.includes("clinical:write") || permissions.includes("patients:write")) && (
              <div className="action-menu-group tab-bar-more">
                {permissions.includes("clinical:write") && (
                  <button type="button" role="menuitem" className="action-menu-item" onClick={() => { setOpen(false); openNewConsultation(); }}>
                    <span className="action-menu-icon" aria-hidden="true"><Stethoscope size={20} /></span>
                    <span className="action-menu-label">Nueva consulta</span>
                  </button>
                )}
                {permissions.includes("patients:write") && (
                  <button type="button" role="menuitem" className="action-menu-item" onClick={() => { setOpen(false); openNewPatient(); }}>
                    <span className="action-menu-icon" aria-hidden="true"><UserPlus size={20} /></span>
                    <span className="action-menu-label">Nuevo paciente</span>
                  </button>
                )}
              </div>
            )}
            <div className="action-menu-group tab-bar-more">
              <button type="button" role="menuitem" className="action-menu-item tab-bar-more-ai"
                onClick={() => { setOpen(false); openAssistant(); }}>
                <span className="action-menu-icon" aria-hidden="true"><Sparkles size={20} /></span>
                <span className="action-menu-label">Asistente</span>
              </button>
              {more.map(({ label, path, icon: Icon }) => (
                <button key={path} type="button" role="menuitem"
                  className={clsx("action-menu-item", pathname.startsWith(path) && "is-current")}
                  onClick={() => { setOpen(false); navigate(path); }}>
                  <span className="action-menu-icon" aria-hidden="true"><Icon size={20} /></span>
                  <span className="action-menu-label">{label}</span>
                </button>
              ))}
              <button type="button" role="menuitem" className="action-menu-item is-destructive"
                onClick={() => { setOpen(false); clearSession(); setPermissions([]); setUser(null); navigate("/"); }}>
                <span className="action-menu-icon" aria-hidden="true"><LogOut size={20} /></span>
                <span className="action-menu-label">Cerrar sesión</span>
              </button>
            </div>
            <button type="button" className="action-menu-cancel" onClick={() => setOpen(false)}>Cancelar</button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
