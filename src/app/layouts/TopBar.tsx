import Pill from "../../components/common/Pill";
import { useAppStore } from "../store/useAppStore";
import { User, LogOut } from "lucide-react";
import { NavLink } from "react-router-dom";
import BrandMark from "./BrandMark";
import { label } from "../../utils/labels";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearSession } from "../../services/auth";

export default function TopBar() {
  const { user, setUser, setPermissions } = useAppStore();
  const [showMenu, setShowMenu] = useState(false);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const roleLabel = user?.role ? label("role", user.role) : "Sesión";

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
    navigate("/admin");
  };

  const handleLogout = () => {
    clearSession();
    setPermissions([]);
    setUser(null);
    setShowMenu(false);
  };

  return (
    <header className="top-bar">
      {/* Phones have no sidebar: the app name lives here. On desktop the sidebar shows it. */}
      <NavLink to="/" className="top-bar-branding" aria-label="Paliativos · Inicio">
        <BrandMark size={28} />
        <span className="top-bar-title">Paliativos</span>
      </NavLink>

      <div className="top-bar-spacer" />

      <div className="top-bar-user-section">
        <div className="top-bar-user-info">
          <span className="top-bar-user-name" title={user?.name}>{user?.name || "Sesión activa"}</span>
          <Pill tone="info">{roleLabel}</Pill>
        </div>
        <div className="top-bar-user-menu-container" ref={menuContainerRef}>
          <button
            className="top-bar-user-button"
            title="Menú de sesión"
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
