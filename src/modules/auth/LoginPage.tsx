import { toast } from "sonner";
import { FormEvent, useMemo, useState } from "react";
import { Loader, LogIn, AlertTriangle, HeartPulse, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { login, restoreSession } from "../../services/auth";
import type { AuthSession } from "../../services/auth";
import "./LoginPage.css";

interface LoginPageProps {
  onSuccess: (session: AuthSession) => void;
}

interface FieldErrors {
  username?: string;
  password?: string;
}

export function LoginPage({ onSuccess }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const status = useMemo(() => {
    if (submitting) {
      return { tone: "info" as const, message: "Verificando credenciales..." };
    }
    if (error) {
      return { tone: "error" as const, message: error };
    }
    return null;
  }, [error, submitting]);

  const validateFields = (values: { username: string; password: string }): FieldErrors => {
    const nextErrors: FieldErrors = {};
    if (!values.username.trim()) {
      nextErrors.username = "El usuario es obligatorio.";
    }
    if (!values.password) {
      nextErrors.password = "La contraseña es obligatoria.";
    }
    return nextErrors;
  };

  const handleFieldBlur = (field: keyof FieldErrors) => {
    if (!hasSubmitted) {
      return;
    }
    const nextErrors = validateFields({ username, password });
    setFieldErrors((previous) => ({
      ...previous,
      [field]: nextErrors[field],
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasSubmitted(true);
    setError(null);

    const nextErrors = validateFields({ username, password });
    setFieldErrors(nextErrors);
    if (nextErrors.username || nextErrors.password) {
      setError("Completa los campos requeridos para continuar.");
      return;
    }

    setSubmitting(true);
    try {
      await login({ username: username.trim(), password });
      const session = await restoreSession();
      if (!session) {
        throw new Error("No se pudo cargar el usuario tras el login.");
      }
      onSuccess(session);
    } catch (err) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data
              ?.error?.message
          : null;
      const normalizedMessage =
        message ||
        (err instanceof globalThis.Error ? err.message : "Credenciales inválidas");
      toast.error(normalizedMessage);
      setFieldErrors({
        username: "Revisa el usuario.",
        password: "Revisa la contraseña.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit} noValidate>

        <div className="login-brand">
          <div className="login-brand-mark" aria-hidden>
            <HeartPulse size={18} />
          </div>
          <span className="login-brand-name">Paliativos</span>
        </div>

        <header className="login-header">
          <h1 className="login-title">Iniciar sesión</h1>
          <p className="login-subtitle">
            Accede con tus credenciales institucionales para continuar.
          </p>
        </header>

        {status && (
          <div className={`login-status login-status--${status.tone}`} role="status" aria-live="polite">
            {status.tone === "error" ? (
              <AlertTriangle size={16} />
            ) : (
              <Loader size={16} className="login-spinner" />
            )}
            <span>{status.message}</span>
          </div>
        )}

        <label className="login-field">
          <span className="login-label">Usuario</span>
          <div className={`login-input-wrap${fieldErrors.username ? " is-invalid" : ""}`}>
            <Mail size={16} className="login-input-icon" />
            <input
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                if (fieldErrors.username) {
                  setFieldErrors((previous) => ({ ...previous, username: undefined }));
                }
              }}
              onBlur={() => handleFieldBlur("username")}
              aria-invalid={Boolean(fieldErrors.username)}
              aria-describedby={fieldErrors.username ? "username-error" : undefined}
              disabled={submitting}
              placeholder="usuario@centro-salud.org"
            />
          </div>
          {fieldErrors.username && (
            <span id="username-error" className="login-field-error">
              {fieldErrors.username}
            </span>
          )}
        </label>

        <label className="login-field">
          <span className="login-label">Contraseña</span>
          <div className={`login-input-wrap${fieldErrors.password ? " is-invalid" : ""}`}>
            <Lock size={16} className="login-input-icon" />
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (fieldErrors.password) {
                  setFieldErrors((previous) => ({ ...previous, password: undefined }));
                }
              }}
              onBlur={() => handleFieldBlur("password")}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? "password-error" : undefined}
              disabled={submitting}
              placeholder="Ingresa tu contraseña"
            />
            <button
              type="button"
              className="login-password-toggle"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              disabled={submitting}
            >
              <span key={showPassword ? "visible" : "hidden"} className="login-password-icon">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </span>
            </button>
          </div>
          {fieldErrors.password && (
            <span id="password-error" className="login-field-error">
              {fieldErrors.password}
            </span>
          )}
        </label>

        <button
          type="submit"
          className="login-submit glow-border"
          disabled={submitting}
        >
          {submitting ? <Loader size={16} className="login-spinner" /> : <LogIn size={16} />}
          <span>{submitting ? "Verificando..." : "Iniciar sesión"}</span>
        </button>
      </form>
    </div>
  );
}

export default LoginPage;
