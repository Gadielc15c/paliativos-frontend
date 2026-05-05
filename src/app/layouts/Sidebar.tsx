import { ReactNode, useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";
import {
  AccentPreset,
  AppTheme,
  AccentMode,
  ButtonStyle,
  FontFamilyOption,
  FontScaleOption,
  MotionLevel,
  RadiusMode,
  TransitionEffect,
  useTheme,
} from "../providers/ThemeProvider";
import { systemEndpoints } from "../../services/endpoints";
import type { SystemStatusResponse } from "../../types/api";
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
  const { theme, setTheme, preferences, setPreference, resetPreferences } = useTheme();
  const [showSystemMenu, setShowSystemMenu] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatusResponse | null>(null);
  const [systemStatusLoading, setSystemStatusLoading] = useState(false);
  const [systemStatusError, setSystemStatusError] = useState<string | null>(null);

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
  const fontOptions: Array<{ id: FontFamilyOption; label: string }> = [
    { id: "inter", label: "Inter" },
    { id: "ibm", label: "IBM Plex Sans" },
    { id: "system", label: "System UI" },
  ];
  const fontScaleOptions: Array<{ id: FontScaleOption; label: string }> = [
    { id: "compact", label: "Compacto" },
    { id: "normal", label: "Normal" },
    { id: "large", label: "Grande" },
  ];
  const accentOptions: Array<{ id: AccentPreset; label: string }> = [
    { id: "electric", label: "Eléctrico" },
    { id: "teal", label: "Turquesa" },
    { id: "violet", label: "Violeta" },
    { id: "sunset", label: "Sunset" },
  ];
  const buttonStyleOptions: Array<{ id: ButtonStyle; label: string }> = [
    { id: "elevated", label: "Elevado" },
    { id: "flat", label: "Plano" },
    { id: "glass", label: "Cristal" },
  ];
  const accentModeOptions: Array<{ id: AccentMode; label: string }> = [
    { id: "preset", label: "Preset" },
    { id: "custom", label: "Custom" },
  ];
  const radiusOptions: Array<{ id: RadiusMode; label: string }> = [
    { id: "soft", label: "Suave" },
    { id: "round", label: "Redondo" },
  ];
  const motionOptions: Array<{ id: MotionLevel; label: string }> = [
    { id: "off", label: "Sin animación" },
    { id: "soft", label: "Suave" },
    { id: "full", label: "Completa" },
  ];
  const transitionOptions: Array<{ id: TransitionEffect; label: string }> = [
    { id: "none", label: "Sin fade" },
    { id: "fade", label: "Fade" },
  ];

  const handleToggle = () => {
    if (isMobileViewport) {
      toggleSidebarMobile();
      return;
    }
    toggleSidebar();
  };

  const loadSystemStatus = async () => {
    setSystemStatusLoading(true);
    setSystemStatusError(null);
    try {
      const payload = await systemEndpoints.getStatus();
      setSystemStatus(payload);
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message || "Error al consultar estado")
          : "Error al consultar estado";
      setSystemStatusError(message);
    } finally {
      setSystemStatusLoading(false);
    }
  };

  useEffect(() => {
    if (showSystemMenu && !systemStatus && !systemStatusLoading) {
      void loadSystemStatus();
    }
  }, [showSystemMenu]);

  const normalizeServiceStatus = (value: unknown): "ok" | "degraded" | "down" | "unknown" => {
    if (value && typeof value === "object" && "status" in (value as Record<string, unknown>)) {
      const nested = String((value as { status?: unknown }).status || "").toLowerCase();
      if (nested === "ok" || nested === "degraded" || nested === "down") {
        return nested;
      }
      return "unknown";
    }
    const raw = String(value || "").toLowerCase();
    if (["ok", "healthy", "up", "enabled", "ready"].includes(raw)) return "ok";
    if (["degraded", "warning", "partial"].includes(raw)) return "degraded";
    if (["down", "error", "disabled", "unavailable", "failed"].includes(raw)) return "down";
    return "unknown";
  };

  const statusRows = systemStatus
    ? [
        { label: "Backend", value: systemStatus.backend },
        { label: "Database", value: systemStatus.database },
        { label: "MinIO", value: systemStatus.minio },
        { label: "LLM", value: systemStatus.llm },
      ]
    : [];

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

            <div className="sidebar-config-group">
              <label className="sidebar-config-label" htmlFor="config-font-family">
                Fuente
              </label>
              <select
                id="config-font-family"
                className="sidebar-config-select"
                value={preferences.fontFamily}
                onChange={(event) =>
                  setPreference("fontFamily", event.target.value as FontFamilyOption)
                }
              >
                {fontOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sidebar-config-group">
              <label className="sidebar-config-label" htmlFor="config-font-scale">
                Tamaño UI
              </label>
              <select
                id="config-font-scale"
                className="sidebar-config-select"
                value={preferences.fontScale}
                onChange={(event) =>
                  setPreference("fontScale", event.target.value as FontScaleOption)
                }
              >
                {fontScaleOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sidebar-config-group">
              <label className="sidebar-config-label" htmlFor="config-accent">
                Acento
              </label>
              <select
                id="config-accent"
                className="sidebar-config-select"
                value={preferences.accentPreset}
                onChange={(event) =>
                  setPreference("accentPreset", event.target.value as AccentPreset)
                }
              >
                {accentOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sidebar-config-group">
              <label className="sidebar-config-label" htmlFor="config-accent-mode">
                Color base
              </label>
              <select
                id="config-accent-mode"
                className="sidebar-config-select"
                value={preferences.accentMode}
                onChange={(event) =>
                  setPreference("accentMode", event.target.value as AccentMode)
                }
              >
                {accentModeOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {preferences.accentMode === "custom" && (
              <>
                <div className="sidebar-config-group">
                  <label className="sidebar-config-label" htmlFor="config-accent-primary">
                    Accent primario
                  </label>
                  <div className="sidebar-config-color-row">
                    <input
                      id="config-accent-primary"
                      className="sidebar-config-color-input"
                      type="color"
                      value={preferences.customAccent}
                      onChange={(event) =>
                        setPreference("customAccent", event.target.value.toUpperCase())
                      }
                    />
                    <span className="sidebar-config-color-value">
                      {preferences.customAccent}
                    </span>
                  </div>
                </div>
                <div className="sidebar-config-group">
                  <label className="sidebar-config-label" htmlFor="config-accent-secondary">
                    Accent secundario
                  </label>
                  <div className="sidebar-config-color-row">
                    <input
                      id="config-accent-secondary"
                      className="sidebar-config-color-input"
                      type="color"
                      value={preferences.customAccentSecondary}
                      onChange={(event) =>
                        setPreference("customAccentSecondary", event.target.value.toUpperCase())
                      }
                    />
                    <span className="sidebar-config-color-value">
                      {preferences.customAccentSecondary}
                    </span>
                  </div>
                </div>
              </>
            )}

            <div className="sidebar-config-group">
              <label className="sidebar-config-label" htmlFor="config-button-style">
                Botones
              </label>
              <select
                id="config-button-style"
                className="sidebar-config-select"
                value={preferences.buttonStyle}
                onChange={(event) =>
                  setPreference("buttonStyle", event.target.value as ButtonStyle)
                }
              >
                {buttonStyleOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sidebar-config-group">
              <label className="sidebar-config-label" htmlFor="config-radius">
                Bordes
              </label>
              <select
                id="config-radius"
                className="sidebar-config-select"
                value={preferences.radiusMode}
                onChange={(event) =>
                  setPreference("radiusMode", event.target.value as RadiusMode)
                }
              >
                {radiusOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sidebar-config-group">
              <label className="sidebar-config-label" htmlFor="config-glass-opacity">
                Opacidad UI ({Math.round(preferences.glassOpacity * 100)}%)
              </label>
              <input
                id="config-glass-opacity"
                className="sidebar-config-range"
                type="range"
                min={55}
                max={100}
                value={Math.round(preferences.glassOpacity * 100)}
                onChange={(event) =>
                  setPreference("glassOpacity", Number(event.target.value) / 100)
                }
              />
            </div>

            <div className="sidebar-config-group">
              <label className="sidebar-config-label" htmlFor="config-motion">
                Animaciones
              </label>
              <select
                id="config-motion"
                className="sidebar-config-select"
                value={preferences.motionLevel}
                onChange={(event) =>
                  setPreference("motionLevel", event.target.value as MotionLevel)
                }
              >
                {motionOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sidebar-config-group">
              <label className="sidebar-config-label" htmlFor="config-transition">
                Cambio de tema
              </label>
              <select
                id="config-transition"
                className="sidebar-config-select"
                value={preferences.transitionEffect}
                onChange={(event) =>
                  setPreference("transitionEffect", event.target.value as TransitionEffect)
                }
              >
                {transitionOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <label className="sidebar-config-check">
              <input
                type="checkbox"
                checked={preferences.gradientMode === "gradient"}
                onChange={(event) =>
                  setPreference("gradientMode", event.target.checked ? "gradient" : "solid")
                }
              />
              <span>Usar degradados</span>
            </label>

            <button
              type="button"
              className="sidebar-config-reset"
              onClick={resetPreferences}
            >
              Restaurar estilos
            </button>

            <div className="sidebar-config-divider" />
            <div className="sidebar-role-menu-title">Estado del sistema</div>
            {systemStatusLoading && (
              <p className="sidebar-system-message">Consultando estado...</p>
            )}
            {systemStatusError && (
              <p className="sidebar-system-message error">{systemStatusError}</p>
            )}
            {!systemStatusLoading && !systemStatusError && statusRows.length > 0 && (
              <div className="sidebar-system-status-list">
                {statusRows.map((row) => {
                  const status = normalizeServiceStatus(row.value);
                  return (
                    <div className="sidebar-system-status-item" key={row.label}>
                      <span className={`sidebar-system-dot ${status}`} />
                      <span>{row.label}</span>
                      <strong>{status.toUpperCase()}</strong>
                    </div>
                  );
                })}
              </div>
            )}
            <button
              type="button"
              className="sidebar-config-reset"
              onClick={() => void loadSystemStatus()}
            >
              Refrescar estado
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
