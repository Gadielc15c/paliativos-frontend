import Pill from "../../components/common/Pill";
import { useAppStore } from "../store/useAppStore";
import { User, LogOut, Plus, Stethoscope, UserPlus } from "lucide-react";
import ActionMenu, { type MenuAction } from "../../components/common/ActionMenu";
import { openNewConsultation, openNewPatient } from "../../modules/patients/quick/store";
import { NavLink } from "react-router-dom";
import BrandMark from "./BrandMark";
import { label } from "../../utils/labels";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearSession } from "../../services/auth";
import { useAssistant } from "../../modules/assistant/store";
import { ASSISTANT_PATH } from "../../modules/assistant/components/AssistantPanel";

export default function TopBar() {
  const { user, setUser, setPermissions, permissions } = useAppStore();
  // Quick create from anywhere: "Nueva consulta" (patient picker) and "Nuevo paciente".
  const createActions: MenuAction[] = [
    ...(permissions.includes("clinical:write") ? [{ id: "new-consultation", label: "Nueva consulta", icon: <Stethoscope size={18} />, onClick: openNewConsultation }] : []),
    ...(permissions.includes("patients:write") ? [{ id: "new-patient", label: "Nuevo paciente", icon: <UserPlus size={18} />, onClick: () => openNewPatient() }] : []),
  ];
  const [showMenu, setShowMenu] = useState(false);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const roleLabel = user?.role ? label("role", user.role) : "Sesión";
  const assistantOpen = useAssistant((s) => s.open);
  const toggleAssistant = useAssistant((s) => s.toggleAssistant);
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

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

      <button type="button" className="top-bar-assistant glow-border" onClick={() => (window.location.pathname === ASSISTANT_PATH ? document.getElementById("as-input")?.focus() : toggleAssistant())}
        aria-expanded={assistantOpen} aria-keyshortcuts="Control+K Meta+K" title={`Asistente (${isMac ? "⌘" : "Ctrl"}+K)`}>
        <span className="top-bar-assistant-mark" aria-hidden="true">✦</span>
        <span>Asistente</span>
        <kbd className="top-bar-kbd" aria-hidden="true">{isMac ? "⌘K" : "Ctrl K"}</kbd>
      </button>

      {createActions.length > 0 && (
        <ActionMenu actions={createActions} label="Crear" text="Nuevo" icon={<Plus size={18} aria-hidden="true" />} className="top-bar-new" />
      )}

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
