import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import {
  AccentMode,
  AccentPreset,
  AppTheme,
  ButtonStyle,
  ElevationLevel,
  FontFamilyOption,
  FontScaleOption,
  MotionLevel,
  RadiusMode,
  TransitionEffect,
  useTheme,
} from "../../../app/providers/ThemeProvider";
import { systemEndpoints } from "../../../services/endpoints";
import type { SystemStatusResponse } from "../../../types/api";
import Button from "../../../components/common/Button";
import "./ConfigPage.css";

const themeOptions: Array<{ id: AppTheme; label: string; description: string }> = [
  { id: "light", label: "Claro", description: "Mayor contraste para ambientes bien iluminados." },
  { id: "dark", label: "Oscuro", description: "Reduce fatiga visual en jornadas largas." },
  { id: "calm", label: "Calma", description: "Paleta suave enfocada en lectura clinica." },
];

const accentOptions: Array<{ id: AccentPreset; label: string }> = [
  { id: "electric", label: "Electrico" },
  { id: "teal", label: "Turquesa" },
  { id: "violet", label: "Violeta" },
  { id: "sunset", label: "Ambar" },
];

const fontOptions: Array<{ id: FontFamilyOption; label: string }> = [
  { id: "inter", label: "Inter" },
  { id: "ibm", label: "IBM Plex Sans" },
  { id: "system", label: "System UI" },
];

const fontScaleOptions: Array<{ id: FontScaleOption; label: string }> = [
  { id: "compact", label: "Compacta" },
  { id: "normal", label: "Estandar" },
  { id: "large", label: "Amplia" },
];

const buttonStyleOptions: Array<{ id: ButtonStyle; label: string }> = [
  { id: "elevated", label: "Elevados" },
  { id: "flat", label: "Planos" },
  { id: "glass", label: "Cristal" },
];

const radiusOptions: Array<{ id: RadiusMode; label: string }> = [
  { id: "soft", label: "Suave" },
  { id: "round", label: "Redondeado" },
];

const elevationOptions: Array<{ id: ElevationLevel; label: string }> = [
  { id: "subtle", label: "Sutil" },
  { id: "balanced", label: "Balanceado" },
  { id: "strong", label: "Marcado" },
];

const motionOptions: Array<{ id: MotionLevel; label: string }> = [
  { id: "off", label: "Sin animacion" },
  { id: "soft", label: "Suave" },
  { id: "full", label: "Completa" },
];

const transitionOptions: Array<{ id: TransitionEffect; label: string }> = [
  { id: "none", label: "Instantaneo" },
  { id: "fade", label: "Transicion suave" },
];

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

export default function ConfigPage() {
  const { theme, setTheme, preferences, setPreference, resetPreferences } = useTheme();
  const [systemStatus, setSystemStatus] = useState<SystemStatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const pageRef = useRef<HTMLDivElement | null>(null);

  const statusRows = useMemo(
    () =>
      systemStatus
        ? [
            { label: "Backend", value: systemStatus.backend },
            { label: "Base de datos", value: systemStatus.database },
            { label: "MinIO", value: systemStatus.minio },
            { label: "LLM", value: systemStatus.llm },
          ]
        : [],
    [systemStatus]
  );

  const loadSystemStatus = async () => {
    setStatusLoading(true);
    setStatusError(null);
    try {
      const payload = await systemEndpoints.getStatus();
      setSystemStatus(payload);
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message || "No se pudo consultar el estado.")
          : "No se pudo consultar el estado.";
      setStatusError(message);
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    void loadSystemStatus();
  }, []);

  useLayoutEffect(() => {
    const root = pageRef.current;
    if (!root) {
      return;
    }

    const prefersReducedMotion = globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const motionLevel = document.documentElement.getAttribute("data-motion") || "full";
    const motionFactor = motionLevel === "soft" ? 0.72 : motionLevel === "off" ? 0 : 1;
    if (prefersReducedMotion || motionFactor === 0) {
      return;
    }

    const t = (duration: number) => duration * motionFactor;
    const ctx = gsap.context(() => {
      gsap.from(".config-page .data-card", {
        opacity: 0,
        y: 12,
        duration: t(0.45),
        ease: "power2.out",
        stagger: t(0.05),
      });

      gsap.to(".config-ambient-orb.a", {
        xPercent: -8,
        yPercent: 6,
        scale: 1.08,
        duration: t(8.6),
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
      gsap.to(".config-ambient-orb.b", {
        xPercent: 7,
        yPercent: -8,
        scale: 1.1,
        duration: t(9.4),
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
      gsap.to(".config-ambient-orb.c", {
        xPercent: -6,
        yPercent: -5,
        duration: t(10.2),
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.to(".config-preview-badge-dot", {
        scale: 1.3,
        opacity: 0.62,
        duration: t(1.5),
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }, root);

    return () => ctx.revert();
  }, [preferences.motionLevel, theme]);

  return (
    <div className="data-screen config-page" ref={pageRef}>
      <div className="config-ambient" aria-hidden>
        <div className="config-ambient-orb a" />
        <div className="config-ambient-orb b" />
        <div className="config-ambient-orb c" />
      </div>

      <section className="data-screen-header">
        <div className="data-screen-copy">
          <span className="data-screen-eyebrow">Ajustes de interfaz</span>
          <h1>Centro de personalizacion visual</h1>
          <p className="data-screen-description">
            Ajusta tipografia, color, degradados, cristal y movimiento para adaptar la experiencia
            por usuario.
          </p>
        </div>
        <div className="data-screen-actions">
          <Button variant="secondary" onClick={resetPreferences}>
            Restaurar estilos base
          </Button>
        </div>
      </section>

      <section className="config-grid">
        <article className="data-card">
          <header className="data-card-header">
            <div>
              <h2 className="data-card-title">Tema global</h2>
              <p className="data-card-subtitle">Define la base cromatica principal de la app.</p>
            </div>
          </header>
          <div className="data-card-body">
            <div className="config-theme-grid">
              {themeOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`config-theme-option ${theme === option.id ? "active" : ""}`}
                  onClick={() => setTheme(option.id)}
                >
                  <strong>{option.label}</strong>
                  <span>{option.description}</span>
                </button>
              ))}
            </div>
          </div>
        </article>

        <article className="data-card">
          <header className="data-card-header">
            <div>
              <h2 className="data-card-title">Vista previa en vivo</h2>
              <p className="data-card-subtitle">
                Verifica contraste, botones y estilo antes de guardar.
              </p>
            </div>
          </header>
          <div className="data-card-body">
            <div className="config-preview-card">
              <div className="config-preview-badge">
                <span className="config-preview-badge-dot" />
                <span>preview activo</span>
              </div>
              <h3>Control premium aplicado</h3>
              <p>Este bloque replica paneles reales para validar color, profundidad y lectura.</p>
              <div className="config-preview-input-wrap">
                <label htmlFor="preview-input">Campo de ejemplo</label>
                <input
                  id="preview-input"
                  type="text"
                  value="Paciente · seguimiento"
                  readOnly
                />
              </div>
              <div className="config-preview-actions">
                <Button size="sm">Primario</Button>
                <Button size="sm" variant="secondary">
                  Secundario
                </Button>
                <Button size="sm" variant="ghost">
                  Ghost
                </Button>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="config-grid">
        <article className="data-card">
          <header className="data-card-header">
            <div>
              <h2 className="data-card-title">Color y degradado</h2>
              <p className="data-card-subtitle">
                Control fino sobre acentos, mezcla de color y direccion del gradiente.
              </p>
            </div>
          </header>
          <div className="data-card-body config-controls">
            <label className="config-field">
              <span>Origen del color</span>
              <select
                value={preferences.accentMode}
                onChange={(event) => setPreference("accentMode", event.target.value as AccentMode)}
              >
                <option value="preset">Preset</option>
                <option value="custom">Personalizado</option>
              </select>
            </label>

            {preferences.accentMode === "preset" ? (
              <label className="config-field">
                <span>Paleta de acento</span>
                <select
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
              </label>
            ) : (
              <div className="config-color-grid">
                <label className="config-field">
                  <span>Acento primario</span>
                  <input
                    type="color"
                    value={preferences.customAccent}
                    onChange={(event) => setPreference("customAccent", event.target.value.toUpperCase())}
                  />
                </label>
                <label className="config-field">
                  <span>Acento secundario</span>
                  <input
                    type="color"
                    value={preferences.customAccentSecondary}
                    onChange={(event) =>
                      setPreference("customAccentSecondary", event.target.value.toUpperCase())
                    }
                  />
                </label>
              </div>
            )}

            <label className="config-switch">
              <input
                type="checkbox"
                checked={preferences.gradientMode === "gradient"}
                onChange={(event) =>
                  setPreference("gradientMode", event.target.checked ? "gradient" : "solid")
                }
              />
              <span>Aplicar degradados en elementos de accion y resaltado</span>
            </label>

            {preferences.gradientMode === "gradient" && (
              <label className="config-field">
                <span>Angulo del degradado ({preferences.gradientAngle}deg)</span>
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={preferences.gradientAngle}
                  onChange={(event) => setPreference("gradientAngle", Number(event.target.value))}
                />
              </label>
            )}
          </div>
        </article>

        <article className="data-card">
          <header className="data-card-header">
            <div>
              <h2 className="data-card-title">Composicion visual</h2>
              <p className="data-card-subtitle">Controla fondo ambiental, transparencia y blur.</p>
            </div>
          </header>
          <div className="data-card-body config-controls">
            <label className="config-field">
              <span>Opacidad de paneles ({Math.round(preferences.glassOpacity * 100)}%)</span>
              <input
                type="range"
                min={55}
                max={100}
                value={Math.round(preferences.glassOpacity * 100)}
                onChange={(event) => setPreference("glassOpacity", Number(event.target.value) / 100)}
              />
            </label>

            <label className="config-field">
              <span>Blur de cristal ({Math.round(preferences.glassBlur)}px)</span>
              <input
                type="range"
                min={0}
                max={24}
                value={Math.round(preferences.glassBlur)}
                onChange={(event) => setPreference("glassBlur", Number(event.target.value))}
              />
            </label>

            <label className="config-field">
              <span>Intensidad de fondo ({Math.round(preferences.backgroundIntensity * 100)}%)</span>
              <input
                type="range"
                min={20}
                max={160}
                value={Math.round(preferences.backgroundIntensity * 100)}
                onChange={(event) =>
                  setPreference("backgroundIntensity", Number(event.target.value) / 100)
                }
              />
            </label>
          </div>
        </article>
      </section>

      <section className="config-grid">
        <article className="data-card">
          <header className="data-card-header">
            <div>
              <h2 className="data-card-title">Estilo de componentes</h2>
              <p className="data-card-subtitle">
                Ajusta densidad visual para tarjetas, bordes, vidrio y botones.
              </p>
            </div>
          </header>
          <div className="data-card-body config-controls">
            <label className="config-field">
              <span>Tipografia</span>
              <select
                value={preferences.fontFamily}
                onChange={(event) => setPreference("fontFamily", event.target.value as FontFamilyOption)}
              >
                {fontOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="config-field">
              <span>Escala de lectura</span>
              <select
                value={preferences.fontScale}
                onChange={(event) => setPreference("fontScale", event.target.value as FontScaleOption)}
              >
                {fontScaleOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="config-field">
              <span>Estilo de botones</span>
              <select
                value={preferences.buttonStyle}
                onChange={(event) => setPreference("buttonStyle", event.target.value as ButtonStyle)}
              >
                {buttonStyleOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="config-field">
              <span>Curvatura de bordes</span>
              <select
                value={preferences.radiusMode}
                onChange={(event) => setPreference("radiusMode", event.target.value as RadiusMode)}
              >
                {radiusOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="config-field">
              <span>Nivel de elevacion</span>
              <select
                value={preferences.elevationLevel}
                onChange={(event) =>
                  setPreference("elevationLevel", event.target.value as ElevationLevel)
                }
              >
                {elevationOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </article>

        <article className="data-card">
          <header className="data-card-header">
            <div>
              <h2 className="data-card-title">Movimiento y rendimiento visual</h2>
              <p className="data-card-subtitle">
                Define el ritmo de transiciones segun preferencia de cada usuario.
              </p>
            </div>
          </header>
          <div className="data-card-body config-controls">
            <label className="config-field">
              <span>Animaciones</span>
              <select
                value={preferences.motionLevel}
                onChange={(event) => setPreference("motionLevel", event.target.value as MotionLevel)}
              >
                {motionOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="config-field">
              <span>Cambio de tema</span>
              <select
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
            </label>
          </div>
        </article>
      </section>

      <section className="data-card">
        <header className="data-card-header">
          <div>
            <h2 className="data-card-title">Estado del sistema</h2>
            <p className="data-card-subtitle">
              Monitoreo rapido de servicios clave antes de iniciar tareas operativas.
            </p>
          </div>
          <Button variant="secondary" onClick={() => void loadSystemStatus()} isLoading={statusLoading}>
            Refrescar
          </Button>
        </header>
        <div className="data-card-body">
          {statusError && <p className="config-status-message error">{statusError}</p>}
          {!statusError && statusLoading && <p className="config-status-message">Consultando estado...</p>}
          {!statusLoading && !statusError && (
            <div className="config-status-grid">
              {statusRows.map((row) => {
                const status = normalizeServiceStatus(row.value);
                return (
                  <div className="config-status-item" key={row.label}>
                    <span className={`config-status-dot ${status}`} />
                    <span>{row.label}</span>
                    <strong>{status.toUpperCase()}</strong>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
