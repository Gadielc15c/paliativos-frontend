import { NavLink, useLocation, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { clearSession } from "../../services/auth";
import { NAV_ITEMS, isNavActive } from "./navigation";
import BrandMark from "./BrandMark";

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, setUser, setPermissions, permissions } = useAppStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const showLabels = !sidebarCollapsed;

  const handleLogout = () => {
    clearSession();
    setPermissions([]);
    setUser(null);
    navigate("/");
  };

  return (
    <aside className={clsx("sidebar", sidebarCollapsed && "collapsed")}>
      <div className="sidebar-header">
        <NavLink to="/" className="sidebar-brand" aria-label="Paliativos · Inicio">
          <BrandMark />
          {showLabels && <span className="sidebar-brand-name">Paliativos</span>}
        </NavLink>
        <button className="sidebar-toggle-btn" onClick={toggleSidebar} title={sidebarCollapsed ? "Mostrar nombres" : "Contraer menú"} aria-label={sidebarCollapsed ? "Expandir menú" : "Contraer menú"}>
          {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <nav className="sidebar-nav" aria-label="Navegación principal">
        {NAV_ITEMS.filter((item) => !item.permission || permissions.includes(item.permission)).map((item) => {
          const active = isNavActive(item, pathname);
          return (
            <NavLink key={item.path} to={item.path} end={item.path === "/"} className={clsx("sidebar-nav-item", active && "active")}
              aria-current={active ? "page" : undefined} title={item.label}>
              <span className="sidebar-nav-item-icon"><item.icon size={20} aria-hidden="true" /></span>
              {showLabels && <span className="sidebar-nav-item-label">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <button type="button" className="sidebar-role-button sidebar-logout-button" onClick={handleLogout} title="Cerrar sesión">
          <LogOut size={18} />
          {showLabels && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  );
}
