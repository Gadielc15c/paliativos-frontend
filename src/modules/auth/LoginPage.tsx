import { FormEvent, useState } from "react";
import { Loader, LogIn, AlertTriangle } from "lucide-react";
import { login, restoreSession } from "../../services/auth";
import type { AuthSession } from "../../services/auth";
import "./LoginPage.css";

interface LoginPageProps {
  onSuccess: (session: AuthSession) => void;
}

export function LoginPage({ onSuccess }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      const session = await restoreSession();
      if (!session) {
        throw new Error("No se pudo cargar el usuario tras el login.");
      }
      onSuccess(session);
    } catch (err) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: { message?: string } } } })
              .response?.data?.error?.message
          : null;
      setError(
        message ||
          (err instanceof globalThis.Error
            ? err.message
            : "Credenciales inválidas")
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-header">
          <h1 className="login-title">Paliativos</h1>
          <p className="login-subtitle">Inicia sesión para continuar</p>
        </div>

        <label className="login-field">
          <span className="login-label">Correo</span>
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={submitting}
            placeholder="admin@cascantelabs.com"
          />
        </label>

        <label className="login-field">
          <span className="login-label">Contraseña</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={submitting}
          />
        </label>

        {error && (
          <div className="login-error" role="alert">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          className="login-submit"
          disabled={submitting || !email || !password}
        >
          {submitting ? (
            <Loader size={16} className="login-spinner" />
          ) : (
            <LogIn size={16} />
          )}
          <span>{submitting ? "Verificando..." : "Iniciar sesión"}</span>
        </button>
      </form>
    </div>
  );
}

export default LoginPage;
