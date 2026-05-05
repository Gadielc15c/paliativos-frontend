import { FormEvent, useLayoutEffect, useRef, useState } from "react";
import { Loader, LogIn, AlertTriangle, HeartPulse, Mail, Lock } from "lucide-react";
import gsap from "gsap";
import { login, restoreSession } from "../../services/auth";
import type { AuthSession } from "../../services/auth";
import "./LoginPage.css";

interface LoginPageProps {
  onSuccess: (session: AuthSession) => void;
}

export function LoginPage({ onSuccess }: LoginPageProps) {
  const pageRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLFormElement | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(() => {
    const page = pageRef.current;
    const card = cardRef.current;
    if (!page || !card) {
      return;
    }

    const prefersReducedMotion = globalThis.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) {
      return;
    }

    const ctx = gsap.context(() => {
      const intro = gsap.timeline({ defaults: { ease: "power3.out" } });
      intro
        .from(".login-card", { y: 18, opacity: 0, duration: 0.54 }, 0)
        .from(".login-brand-mark", { scale: 0.88, opacity: 0, duration: 0.32 }, 0.1)
        .from(".login-brand-name", { y: 6, opacity: 0, duration: 0.28 }, 0.15)
        .from(".login-title", { y: 10, opacity: 0, duration: 0.32 }, 0.16)
        .from(".login-subtitle", { y: 8, opacity: 0, duration: 0.28 }, 0.2)
        .from(
          ".login-field",
          { y: 10, opacity: 0, duration: 0.32, stagger: 0.06 },
          0.22
        )
        .from(".login-submit", { y: 8, opacity: 0, duration: 0.28 }, 0.34);

      const inputs = Array.from(
        card.querySelectorAll<HTMLInputElement>(".login-field input")
      );
      const cleanupHandlers: Array<{
        input: HTMLInputElement;
        focusIn: () => void;
        focusOut: () => void;
      }> = [];

      inputs.forEach((input) => {
        const field = input.closest<HTMLElement>(".login-field");
        if (!field) {
          return;
        }

        const focusIn = () => {
          gsap.to(field, {
            y: -1,
            duration: 0.16,
            ease: "power2.out",
          });
        };

        const focusOut = () => {
          gsap.to(field, {
            y: 0,
            duration: 0.16,
            ease: "power2.out",
          });
        };

        input.addEventListener("focus", focusIn);
        input.addEventListener("blur", focusOut);
        cleanupHandlers.push({ input, focusIn, focusOut });
      });

      return () => {
        cleanupHandlers.forEach(({ input, focusIn, focusOut }) => {
          input.removeEventListener("focus", focusIn);
          input.removeEventListener("blur", focusOut);
        });
      };
    }, page);

    return () => {
      ctx.revert();
    };
  }, []);

  useLayoutEffect(() => {
    if (!error) {
      return;
    }

    const card = cardRef.current;
    if (!card) {
      return;
    }

    const ctx = gsap.context(() => {
      const timeline = gsap.timeline();
      timeline
        .fromTo(
          ".login-error",
          { opacity: 0, y: -8, scale: 0.98 },
          { opacity: 1, y: 0, scale: 1, duration: 0.25, ease: "power2.out" }
        )
        .fromTo(
          ".login-card",
          { x: 0 },
          {
            x: -8,
            duration: 0.08,
            ease: "power1.inOut",
            yoyo: true,
            repeat: 3,
          },
          0
        );
    }, card);

    return () => {
      ctx.revert();
    };
  }, [error]);

  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) {
      return;
    }

    const button = card.querySelector<HTMLButtonElement>(
      ".login-submit"
    );
    if (!button) {
      return;
    }

    const ctx = gsap.context(() => {
      if (submitting) {
        gsap.to(button, {
          scale: 0.985,
          duration: 0.12,
          ease: "power2.out",
          yoyo: true,
          repeat: 1,
        });
      } else {
        gsap.to(button, {
          scale: 1,
          duration: 0.2,
          ease: "power2.out",
        });
      }
    }, card);

    return () => {
      ctx.revert();
    };
  }, [submitting]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
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
    <div className="login-page" ref={pageRef}>
      <form className="login-card" onSubmit={handleSubmit} ref={cardRef}>
        <div className="login-brand" aria-hidden>
          <div className="login-brand-mark">
            <HeartPulse size={18} />
          </div>
          <span className="login-brand-name">Paliativos</span>
        </div>

        <div className="login-header">
          <h1 className="login-title">Iniciar sesión</h1>
          <p className="login-subtitle">Accede con tu usuario institucional</p>
        </div>

        <label className="login-field">
          <span className="login-label">Usuario</span>
          <div className="login-input-wrap">
            <Mail size={16} className="login-input-icon" />
            <input
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={submitting}
              placeholder="admin@example.com"
            />
          </div>
        </label>

        <label className="login-field">
          <span className="login-label">Contraseña</span>
          <div className="login-input-wrap">
            <Lock size={16} className="login-input-icon" />
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={submitting}
              placeholder="Ingresa tu contraseña"
            />
          </div>
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
          disabled={submitting || !username || !password}
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
