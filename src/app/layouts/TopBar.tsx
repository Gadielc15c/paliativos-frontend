import { useAppStore } from "../store/useAppStore";
import { User, LogOut, Menu } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearSession } from "../../services/auth";

export default function TopBar() {
  const { user, toggleSidebarMobile, setUser, setPermissions } = useAppStore();
  const [showMenu, setShowMenu] = useState(false);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const roleLabel =
    user?.role === "admin"
      ? "Administrador"
      : user?.role === "doctor"
      ? "Médico"
      : user?.role === "secretary"
      ? "Secretaría"
      : "Sesión";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(event.target as Node)
      ) {
        setShowMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleOpenSession = () => {
    setShowMenu(false);
    navigate("/config");
  };

  const handleLogout = () => {
    clearSession();
    setPermissions([]);
    setUser(null);
    setShowMenu(false);
  };

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
        <div className="top-bar-user-menu-container" ref={menuContainerRef}>
          <button
            className="top-bar-user-button" 
            title="User menu"
            onClick={() => setShowMenu(!showMenu)}
          >
            <User size={18} />
          </button>
	          {showMenu && (
	            <div className="top-bar-dropdown">
	              <button type="button" className="top-bar-dropdown-item" onClick={handleOpenSession}>
	                <User size={16} /> Mi sesión
	              </button>

	              <button type="button" className="top-bar-dropdown-item logout" onClick={handleLogout}>
	                <LogOut size={16} /> Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
