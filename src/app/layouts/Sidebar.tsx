import { ReactNode, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";
import { AppTheme, useTheme } from "../providers/ThemeProvider";
import {
  Users,
  FileText,
  DollarSign,
  TrendingUp,
  Folder,
  BarChart3,
  Eye,
  UserSquare2,
  Settings,
  Menu,
  SunMedium,
  Moon,
  Waves,
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
  const { sidebarCollapsed, sidebarMobileOpen, toggleSidebar, toggleSidebarMobile, closeSidebarMobile } =
    useAppStore();
  const { theme, setTheme } = useTheme();
  const [showSystemMenu, setShowSystemMenu] = useState(false);

  const isMobileViewport =
    typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches;
  const showLabels = !sidebarCollapsed || sidebarMobileOpen;
  const themeOptions: Array<{
    id: AppTheme;
    label: string;
    icon: ReactNode;
  }> = [
    { id: "light", label: "Tema claro", icon: <SunMedium size={15} /> },
    { id: "dark", label: "Tema oscuro", icon: <Moon size={15} /> },
    { id: "calm", label: "Tema calma", icon: <Waves size={15} /> },
  ];

  const handleToggle = () => {
    if (isMobileViewport) {
      toggleSidebarMobile();
      return;
    }
    toggleSidebar();
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
        <button
          className="sidebar-role-button"
          onClick={() => setShowSystemMenu(!showSystemMenu)}
          title="Configuración del sistema"
        >
          <Settings size={18} />
        </button>
        {showSystemMenu && (
          <div
            className={`sidebar-role-menu ${
              !showLabels ? "sidebar-role-menu-floating" : ""
            }`}
          >
            <div className="sidebar-role-menu-title">Configuración</div>
            <div className="sidebar-theme-options">
              {themeOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`sidebar-theme-option ${theme === option.id ? "active" : ""}`}
                  onClick={() => setTheme(option.id)}
                >
                  <span className="sidebar-theme-option-icon">{option.icon}</span>
                  {showLabels ? option.label : option.id}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
