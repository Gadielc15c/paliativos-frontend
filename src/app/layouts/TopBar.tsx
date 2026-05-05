import { useAppStore } from "../store/useAppStore";
import { User, LogOut, Menu, SunMedium, Moon, Waves } from "lucide-react";
import { ReactNode, useEffect, useRef, useState } from "react";
import { AppTheme, useTheme } from "../providers/ThemeProvider";

export default function TopBar() {
  const { user, toggleSidebarMobile } = useAppStore();
  const { theme, setTheme } = useTheme();
  const [showMenu, setShowMenu] = useState(false);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);
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

  const themeOptions: Array<{
    id: AppTheme;
    label: string;
    description: string;
    icon: ReactNode;
  }> = [
    {
      id: "light",
      label: "Claro",
      description: "Interfaz limpia",
      icon: <SunMedium size={14} />,
    },
    {
      id: "dark",
      label: "Oscuro",
      description: "Menor fatiga visual",
      icon: <Moon size={14} />,
    },
    {
      id: "calm",
      label: "Calma",
      description: "Tonos suaves clínicos",
      icon: <Waves size={14} />,
    },
  ];

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
              <button type="button" className="top-bar-dropdown-item">
                <User size={16} /> Mi sesión
              </button>

              <div className="top-bar-dropdown-theme">
                <span className="top-bar-dropdown-theme-label">Tema</span>
                <div className="top-bar-theme-options">
                  {themeOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={`top-bar-theme-option ${
                        theme === option.id ? "active" : ""
                      }`}
                      onClick={() => setTheme(option.id)}
                    >
                      <span className="top-bar-theme-option-icon">{option.icon}</span>
                      <span className="top-bar-theme-option-copy">
                        <span className="top-bar-theme-option-title">{option.label}</span>
                        <span className="top-bar-theme-option-description">
                          {option.description}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <button type="button" className="top-bar-dropdown-item logout">
                <LogOut size={16} /> Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
