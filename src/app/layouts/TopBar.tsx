import { useAppStore } from "../store/useAppStore";
import { User, LogOut, Menu } from "lucide-react";
import { useState } from "react";

export default function TopBar() {
  const { user, toggleSidebarMobile } = useAppStore();
  const [showMenu, setShowMenu] = useState(false);
  const roleLabel =
    user?.role === "admin"
      ? "Administrador"
      : user?.role === "doctor"
      ? "Médico"
      : user?.role === "secretary"
      ? "Secretaría"
      : "Sesión";

  return (
    <header className="top-bar">
      <div className="top-bar-branding">
        <button
          className="top-bar-menu-button"
          onClick={toggleSidebarMobile}
          aria-label="Abrir menú"
        >
          <Menu size={18} />
        </button>
        <h1 className="top-bar-title">PALIATIVOS</h1>
      </div>

      <div className="top-bar-spacer" />

      <div className="top-bar-user-section">
        <div className="top-bar-user-info">
          <span className="top-bar-user-name">{user?.name || "Sesión activa"}</span>
          <span className="top-bar-user-role">{roleLabel}</span>
        </div>
        <div className="top-bar-user-menu-container">
          <button 
            className="top-bar-user-button" 
            title="User menu"
            onClick={() => setShowMenu(!showMenu)}
          >
            <User size={18} />
          </button>
          {showMenu && (
            <div className="top-bar-dropdown">
              <a href="#profile" className="top-bar-dropdown-item">
                <User size={16} /> Mi sesión
              </a>
              <a href="#logout" className="top-bar-dropdown-item logout">
                <LogOut size={16} /> Cerrar sesión
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
