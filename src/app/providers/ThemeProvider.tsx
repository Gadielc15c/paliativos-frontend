import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface ThemeProviderProps {
  children: ReactNode;
}

export type AppTheme = "light" | "dark" | "calm";
export type FontFamilyOption = "inter" | "ibm" | "system";
export type FontScaleOption = "compact" | "normal" | "large";
export type AccentPreset = "electric" | "teal" | "violet" | "sunset";
export type AccentMode = "preset" | "custom";
export type GradientMode = "gradient" | "solid";
export type ButtonStyle = "elevated" | "flat" | "glass";
export type RadiusMode = "soft" | "round";
export type MotionLevel = "off" | "soft" | "full";
export type TransitionEffect = "none" | "fade";

export interface UiPreferences {
  fontFamily: FontFamilyOption;
  fontScale: FontScaleOption;
  accentPreset: AccentPreset;
  accentMode: AccentMode;
  customAccent: string;
  customAccentSecondary: string;
  gradientMode: GradientMode;
  buttonStyle: ButtonStyle;
  radiusMode: RadiusMode;
  glassOpacity: number;
  motionLevel: MotionLevel;
  transitionEffect: TransitionEffect;
}

interface ThemeContextValue {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  preferences: UiPreferences;
  setPreference: <K extends keyof UiPreferences>(
    key: K,
    value: UiPreferences[K]
  ) => void;
  resetPreferences: () => void;
}

const THEME_STORAGE_KEY = "app_theme";
const PREFERENCES_STORAGE_KEY = "app_ui_preferences";

const ThemeContext = createContext<ThemeContextValue | null>(null);

const isAppTheme = (value: string | null): value is AppTheme =>
  value === "light" || value === "dark" || value === "calm";

const DEFAULT_PREFERENCES: UiPreferences = {
  fontFamily: "inter",
  fontScale: "normal",
  accentPreset: "electric",
  accentMode: "preset",
  customAccent: "#0052FF",
  customAccentSecondary: "#4D7CFF",
  gradientMode: "gradient",
  buttonStyle: "elevated",
  radiusMode: "soft",
  glassOpacity: 0.82,
  motionLevel: "full",
  transitionEffect: "fade",
};

const fontFamilyOptions = new Set<FontFamilyOption>(["inter", "ibm", "system"]);
const fontScaleOptions = new Set<FontScaleOption>(["compact", "normal", "large"]);
const accentPresetOptions = new Set<AccentPreset>([
  "electric",
  "teal",
  "violet",
  "sunset",
]);
const accentModeOptions = new Set<AccentMode>(["preset", "custom"]);
const gradientModeOptions = new Set<GradientMode>(["gradient", "solid"]);
const buttonStyleOptions = new Set<ButtonStyle>(["elevated", "flat", "glass"]);
const radiusModeOptions = new Set<RadiusMode>(["soft", "round"]);
const motionLevelOptions = new Set<MotionLevel>(["off", "soft", "full"]);
const transitionEffectOptions = new Set<TransitionEffect>(["none", "fade"]);

const ACCENT_PRESET_VALUES: Record<
  AccentPreset,
  { accent: string; secondary: string }
> = {
  electric: { accent: "#0052FF", secondary: "#4D7CFF" },
  teal: { accent: "#0B8F8A", secondary: "#39BFB9" },
  violet: { accent: "#5B4DFF", secondary: "#8A7CFF" },
  sunset: { accent: "#D97706", secondary: "#F59E0B" },
};

const FONT_FAMILY_VALUES: Record<FontFamilyOption, string> = {
  inter: "\"Inter\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
  ibm: "\"IBM Plex Sans\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
  system: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
};

const FONT_SCALE_VALUES: Record<FontScaleOption, string> = {
  compact: "0.94",
  normal: "1",
  large: "1.08",
};

const MOTION_FACTOR_VALUES: Record<MotionLevel, string> = {
  off: "0",
  soft: "0.7",
  full: "1",
};

const isHexColor = (value: string) => /^#([0-9a-fA-F]{6})$/.test(value);

const normalizeHexColor = (value: unknown, fallback: string) => {
  if (typeof value !== "string") {
    return fallback;
  }
  const normalized = value.trim().toUpperCase();
  return isHexColor(normalized) ? normalized : fallback;
};

const toRgba = (hexColor: string, alpha: number) => {
  const normalized = hexColor.replace("#", "");
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const validatePreferences = (value: unknown): UiPreferences => {
  if (!value || typeof value !== "object") {
    return DEFAULT_PREFERENCES;
  }
  const candidate = value as Partial<UiPreferences>;
  return {
    fontFamily: fontFamilyOptions.has(candidate.fontFamily as FontFamilyOption)
      ? (candidate.fontFamily as FontFamilyOption)
      : DEFAULT_PREFERENCES.fontFamily,
    fontScale: fontScaleOptions.has(candidate.fontScale as FontScaleOption)
      ? (candidate.fontScale as FontScaleOption)
      : DEFAULT_PREFERENCES.fontScale,
    accentPreset: accentPresetOptions.has(candidate.accentPreset as AccentPreset)
      ? (candidate.accentPreset as AccentPreset)
      : DEFAULT_PREFERENCES.accentPreset,
    accentMode: accentModeOptions.has(candidate.accentMode as AccentMode)
      ? (candidate.accentMode as AccentMode)
      : DEFAULT_PREFERENCES.accentMode,
    customAccent: normalizeHexColor(
      candidate.customAccent,
      DEFAULT_PREFERENCES.customAccent
    ),
    customAccentSecondary: normalizeHexColor(
      candidate.customAccentSecondary,
      DEFAULT_PREFERENCES.customAccentSecondary
    ),
    gradientMode: gradientModeOptions.has(candidate.gradientMode as GradientMode)
      ? (candidate.gradientMode as GradientMode)
      : DEFAULT_PREFERENCES.gradientMode,
    buttonStyle: buttonStyleOptions.has(candidate.buttonStyle as ButtonStyle)
      ? (candidate.buttonStyle as ButtonStyle)
      : DEFAULT_PREFERENCES.buttonStyle,
    radiusMode: radiusModeOptions.has(candidate.radiusMode as RadiusMode)
      ? (candidate.radiusMode as RadiusMode)
      : DEFAULT_PREFERENCES.radiusMode,
    glassOpacity:
      typeof candidate.glassOpacity === "number"
        ? clamp(candidate.glassOpacity, 0.55, 1)
        : DEFAULT_PREFERENCES.glassOpacity,
    motionLevel: motionLevelOptions.has(candidate.motionLevel as MotionLevel)
      ? (candidate.motionLevel as MotionLevel)
      : DEFAULT_PREFERENCES.motionLevel,
    transitionEffect: transitionEffectOptions.has(
      candidate.transitionEffect as TransitionEffect
    )
      ? (candidate.transitionEffect as TransitionEffect)
      : DEFAULT_PREFERENCES.transitionEffect,
  };
};

const resolveInitialTheme = (): AppTheme => {
  if (typeof window === "undefined") {
    return "light";
  }
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isAppTheme(storedTheme) ? storedTheme : "light";
};

const resolveInitialPreferences = (): UiPreferences => {
  if (typeof window === "undefined") {
    return DEFAULT_PREFERENCES;
  }
  const storedPreferences = window.localStorage.getItem(PREFERENCES_STORAGE_KEY);
  if (!storedPreferences) {
    return DEFAULT_PREFERENCES;
  }
  try {
    return validatePreferences(JSON.parse(storedPreferences));
  } catch {
    return DEFAULT_PREFERENCES;
  }
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<AppTheme>(resolveInitialTheme);
  const [preferences, setPreferences] =
    useState<UiPreferences>(resolveInitialPreferences);
  const isHydratedRef = useRef(false);
  const transitionTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    const accent =
      preferences.accentMode === "custom"
        ? {
            accent: preferences.customAccent,
            secondary: preferences.customAccentSecondary,
          }
        : ACCENT_PRESET_VALUES[preferences.accentPreset];
    const accentGradient =
      preferences.gradientMode === "solid"
        ? accent.accent
        : `linear-gradient(135deg, ${accent.accent}, ${accent.secondary})`;

    root.setAttribute("data-theme", theme);
    root.setAttribute("data-font-family", preferences.fontFamily);
    root.setAttribute("data-font-scale", preferences.fontScale);
    root.setAttribute("data-button-style", preferences.buttonStyle);
    root.setAttribute("data-radius-mode", preferences.radiusMode);
    root.setAttribute("data-gradient-mode", preferences.gradientMode);
    root.setAttribute("data-motion", preferences.motionLevel);

    root.style.setProperty("--font-sans", FONT_FAMILY_VALUES[preferences.fontFamily]);
    root.style.setProperty("--font-scale", FONT_SCALE_VALUES[preferences.fontScale]);
    root.style.setProperty("--accent", accent.accent);
    root.style.setProperty("--accent-secondary", accent.secondary);
    root.style.setProperty("--ring", accent.accent);
    root.style.setProperty("--accent-primary", accent.accent);
    root.style.setProperty("--accent-finance", accent.secondary);
    root.style.setProperty("--accent-gradient", accentGradient);
    root.style.setProperty("--accent-soft", toRgba(accent.accent, 0.16));
    root.style.setProperty("--accent-shadow", toRgba(accent.accent, 0.28));
    root.style.setProperty("--accent-shadow-strong", toRgba(accent.accent, 0.38));
    root.style.setProperty("--ui-glass-opacity", String(preferences.glassOpacity));
    root.style.setProperty("--motion-factor", MOTION_FACTOR_VALUES[preferences.motionLevel]);
    root.style.setProperty(
      "--theme-transition-ms",
      preferences.transitionEffect === "fade" ? "260ms" : "0ms"
    );

    if (preferences.transitionEffect === "fade" && isHydratedRef.current) {
      root.classList.add("theme-fade-transition");
      if (transitionTimerRef.current) {
        window.clearTimeout(transitionTimerRef.current);
      }
      transitionTimerRef.current = window.setTimeout(() => {
        root.classList.remove("theme-fade-transition");
      }, 280);
    }

    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    window.localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify(preferences)
    );
    isHydratedRef.current = true;

    return () => {
      if (transitionTimerRef.current) {
        window.clearTimeout(transitionTimerRef.current);
      }
    };
  }, [theme, preferences]);

  const setPreference: ThemeContextValue["setPreference"] = (key, value) => {
    setPreferences((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const resetPreferences = () => {
    setPreferences(DEFAULT_PREFERENCES);
  };

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, preferences, setPreference, resetPreferences }),
    [theme, preferences]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
