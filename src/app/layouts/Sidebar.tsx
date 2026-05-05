import { useMemo } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";
import { clearSession } from "../../services/auth";
import {
  Users,
  FileText,
  DollarSign,
  TrendingUp,
  Folder,
  BarChart3,
  Eye,
  UserSquare2,
  SlidersHorizontal,
  Menu,
  LogOut,
} from "lucide-react";

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  tooltip: string;
}

const navItems: NavItem[] = [
  { label: "PACIENTES", path: "/patients", icon: <Users size={20} />, tooltip: "Ver pacientes" },
  { label: "EPISODIOS", path: "/episodes", icon: <FileText size={20} />, tooltip: "Eventos clínicos" },
  { label: "FACTURACIÓN", path: "/billing", icon: <DollarSign size={20} />, tooltip: "Facturas emitidas" },
  { label: "MOVIMIENTOS", path: "/finance", icon: <TrendingUp size={20} />, tooltip: "Entradas y salidas" },
  { label: "DOCUMENTOS", path: "/documents", icon: <Folder size={20} />, tooltip: "Registro documental" },
  { label: "REPORTES", path: "/reports", icon: <BarChart3 size={20} />, tooltip: "Cortes y agregados" },
  { label: "TRAZAS", path: "/audit", icon: <Eye size={20} />, tooltip: "Historial de acciones" },
  { label: "SECRETARIAS", path: "/secretaries", icon: <UserSquare2 size={20} />, tooltip: "Asignaciones por médico" },
];

export default function Sidebar() {
  const {
    sidebarCollapsed,
    sidebarMobileOpen,
    toggleSidebar,
    toggleSidebarMobile,
    closeSidebarMobile,
    setUser,
    setPermissions,
  } =
    useAppStore();
  const navigate = useNavigate();
  const isMobileViewport = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches,
    []
  );
  const showLabels = !sidebarCollapsed || sidebarMobileOpen;

  const handleToggle = () => {
    if (isMobileViewport) {
      toggleSidebarMobile();
      return;
    }
    toggleSidebar();
  };

  const handleLogout = () => {
    clearSession();
    setPermissions([]);
    setUser(null);
    if (isMobileViewport) {
      closeSidebarMobile();
    }
    navigate("/");
  };

  return (
    <aside
      className={`sidebar ${sidebarCollapsed ? "collapsed" : ""} ${
        sidebarMobileOpen ? "mobile-open" : ""
      }`}
    >
      <div className="sidebar-header">
        <button
          className="sidebar-toggle-btn"
          onClick={handleToggle}
          title="Toggle sidebar"
        >
          <Menu size={20} />
        </button>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `sidebar-nav-item ${isActive ? "active" : ""}`
            }
            title={item.tooltip}
            onClick={() => {
              if (isMobileViewport) {
                closeSidebarMobile();
              }
            }}
          >
            <span className="sidebar-nav-item-icon">{item.icon}</span>
            {showLabels && (
              <>
                <span className="sidebar-nav-item-label">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <NavLink
          to="/config"
          className={({ isActive }) =>
            `sidebar-role-button sidebar-config-link ${isActive ? "active" : ""}`
          }
          onClick={() => {
            if (isMobileViewport) {
              closeSidebarMobile();
            }
          }}
          title="Personalización visual"
        >
          <SlidersHorizontal size={18} />
          {showLabels && <span>Ajustes visuales</span>}
        </NavLink>

        <button
          type="button"
          className="sidebar-role-button sidebar-logout-button"
          onClick={handleLogout}
          title="Cerrar sesión"
        >
          <LogOut size={18} />
          {showLabels && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  );
}
