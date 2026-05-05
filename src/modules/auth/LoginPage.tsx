import { FormEvent, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Loader, LogIn, AlertTriangle, HeartPulse, Mail, Lock } from "lucide-react";
import gsap from "gsap";
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

const BACKGROUND_PARTICLES = [
  { left: "12%", top: "22%", size: 10, delay: 0 },
  { left: "24%", top: "72%", size: 8, delay: 0.2 },
  { left: "34%", top: "34%", size: 12, delay: 0.4 },
  { left: "48%", top: "18%", size: 9, delay: 0.7 },
  { left: "56%", top: "76%", size: 11, delay: 0.3 },
  { left: "68%", top: "30%", size: 8, delay: 0.5 },
  { left: "74%", top: "64%", size: 10, delay: 0.8 },
  { left: "82%", top: "24%", size: 7, delay: 0.6 },
  { left: "88%", top: "48%", size: 9, delay: 0.1 },
];

export function LoginPage({ onSuccess }: LoginPageProps) {
  const pageRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLFormElement | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
        .from(".login-card", { y: 20, opacity: 0, duration: 0.58 }, 0)
        .from(".login-brand", { y: 10, opacity: 0, duration: 0.35 }, 0.1)
        .from(".login-title", { y: 12, opacity: 0, duration: 0.35 }, 0.14)
        .from(".login-subtitle", { y: 8, opacity: 0, duration: 0.3 }, 0.18)
        .from(".login-field", { y: 8, opacity: 0, duration: 0.3, stagger: 0.06 }, 0.2)
        .from(".login-submit", { y: 8, opacity: 0, duration: 0.28 }, 0.34);

      gsap.to(".breath-circle", {
        scale: 1.2,
        opacity: 0.55,
        duration: 3.2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.to(".ambient-a", {
        xPercent: -8,
        yPercent: 4,
        duration: 10,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
      gsap.to(".ambient-b", {
        xPercent: 7,
        yPercent: -4,
        duration: 12,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
      gsap.to(".ambient-c", {
        xPercent: -5,
        yPercent: -6,
        scale: 1.12,
        duration: 13.5,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      const particles = gsap.utils.toArray<HTMLElement>(".ambient-particle");
      particles.forEach((particle, index) => {
        gsap.to(particle, {
          y: index % 2 === 0 ? -18 : -12,
          x: index % 3 === 0 ? 8 : -6,
          opacity: 0.62,
          scale: 1.18,
          duration: 3.6 + index * 0.25,
          delay: Number(particle.dataset.delay || 0),
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      });

      const inputs = Array.from(
        card.querySelectorAll<HTMLInputElement>(".login-field input")
      );
      const listeners: Array<{ input: HTMLInputElement; onFocus: () => void; onBlur: () => void }> =
        [];

      inputs.forEach((input) => {
        const field = input.closest<HTMLElement>(".login-field");
        if (!field) {
          return;
        }
        const onFocus = () =>
          gsap.to(field, { y: -1, duration: 0.16, ease: "power2.out" });
        const onBlur = () => gsap.to(field, { y: 0, duration: 0.16, ease: "power2.out" });
        input.addEventListener("focus", onFocus);
        input.addEventListener("blur", onBlur);
        listeners.push({ input, onFocus, onBlur });
      });

      const hoverCapable = globalThis.matchMedia("(hover: hover) and (pointer: fine)").matches;
      let moveCard: ((event: MouseEvent) => void) | null = null;
      let resetCard: (() => void) | null = null;

      if (hoverCapable) {
        moveCard = (event: MouseEvent) => {
          const bounds = card.getBoundingClientRect();
          const offsetX = (event.clientX - bounds.left) / bounds.width - 0.5;
          const offsetY = (event.clientY - bounds.top) / bounds.height - 0.5;

          gsap.to(card, {
            rotateY: offsetX * 4.8,
            rotateX: -offsetY * 4.8,
            transformPerspective: 900,
            transformOrigin: "50% 50%",
            duration: 0.3,
            ease: "power2.out",
          });
        };

        resetCard = () => {
          gsap.to(card, {
            rotateX: 0,
            rotateY: 0,
            duration: 0.35,
            ease: "power2.out",
          });
        };

        card.addEventListener("mousemove", moveCard);
        card.addEventListener("mouseleave", resetCard);
      }

      return () => {
        listeners.forEach(({ input, onFocus, onBlur }) => {
          input.removeEventListener("focus", onFocus);
          input.removeEventListener("blur", onBlur);
        });
        if (moveCard) {
          card.removeEventListener("mousemove", moveCard);
        }
        if (resetCard) {
          card.removeEventListener("mouseleave", resetCard);
        }
      };
    }, page);

    return () => ctx.revert();
  }, []);

  useLayoutEffect(() => {
    if (!status) {
      return;
    }
    const card = cardRef.current;
    if (!card) {
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".login-status",
        { opacity: 0, y: -8, scale: 0.985 },
        { opacity: 1, y: 0, scale: 1, duration: 0.24, ease: "power2.out" }
      );

      if (status.tone === "error") {
        gsap.fromTo(
          ".login-card",
          { x: 0 },
          { x: -6, duration: 0.08, ease: "power1.inOut", repeat: 3, yoyo: true }
        );
      }
    }, card);

    return () => ctx.revert();
  }, [status]);

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
      setError(normalizedMessage);
      setFieldErrors({
        username: "Revisa el usuario.",
        password: "Revisa la contraseña.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page" ref={pageRef}>
      <div className="ambient ambient-a" aria-hidden />
      <div className="ambient ambient-b" aria-hidden />
      <div className="ambient ambient-c" aria-hidden />
      <div className="breath-circle" aria-hidden />
      <div className="ambient-particles" aria-hidden>
        {BACKGROUND_PARTICLES.map((particle, index) => (
          <span
            key={index}
            className="ambient-particle"
            data-delay={particle.delay}
            style={{
              left: particle.left,
              top: particle.top,
              width: particle.size,
              height: particle.size,
            }}
          />
        ))}
      </div>

      <form className="login-card" onSubmit={handleSubmit} ref={cardRef} noValidate>
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
              type="password"
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
          </div>
          {fieldErrors.password && (
            <span id="password-error" className="login-field-error">
              {fieldErrors.password}
            </span>
          )}
        </label>

        <button type="submit" className="login-submit" disabled={submitting}>
          {submitting ? <Loader size={16} className="login-spinner" /> : <LogIn size={16} />}
          <span>{submitting ? "Verificando..." : "Iniciar sesión"}</span>
        </button>
      </form>
    </div>
  );
}

export default LoginPage;
