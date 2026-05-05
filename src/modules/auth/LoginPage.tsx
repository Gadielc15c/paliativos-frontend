import { FormEvent, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Loader, LogIn, AlertTriangle, HeartPulse, Mail, Lock } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { login, restoreSession } from "../../services/auth";
import type { AuthSession } from "../../services/auth";
import "./LoginPage.css";

gsap.registerPlugin(ScrollTrigger);

interface LoginPageProps {
  onSuccess: (session: AuthSession) => void;
}

interface FieldErrors {
  username?: string;
  password?: string;
}

const CARE_VALUES = [
  "acompañamiento",
  "dignidad",
  "alivio",
  "familia",
  "presencia",
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
      return {
        tone: "info" as const,
        message: "Verificando credenciales...",
      };
    }
    if (error) {
      return {
        tone: "error" as const,
        message: error,
      };
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
        .from(".care-stage", { y: 20, opacity: 0, duration: 0.7 }, 0)
        .from(".breath-circle", { scale: 0.85, opacity: 0, duration: 0.8 }, 0.06)
        .from(".hero-title", { y: 22, opacity: 0, filter: "blur(10px)", duration: 0.8 }, 0.14)
        .from(".hero-subtitle", { y: 14, opacity: 0, duration: 0.6 }, 0.2)
        .from(".care-card", { y: 18, opacity: 0, stagger: 0.1, duration: 0.56 }, 0.25)
        .from(".hands-shell", { y: 14, opacity: 0, duration: 0.52 }, 0.32)
        .from(".login-card", { y: 22, opacity: 0, duration: 0.62 }, 0.18);

      gsap.to(".breath-circle", {
        scale: 1.24,
        opacity: 0.62,
        duration: 3.8,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.to(".background-wave.wave-a", {
        xPercent: -8,
        yPercent: 4,
        duration: 9.5,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
      gsap.to(".background-wave.wave-b", {
        xPercent: 6,
        yPercent: -3,
        duration: 11,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      const particles = gsap.utils.toArray<HTMLElement>(".particle");
      particles.forEach((particle, index) => {
        gsap.to(particle, {
          x: index % 2 === 0 ? 8 : -8,
          y: -18 - index * 1.6,
          opacity: 0.28,
          duration: 2.8 + index * 0.35,
          delay: index * 0.1,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      });

      const handPaths = gsap.utils.toArray<SVGPathElement>(".hand-path");
      handPaths.forEach((path, index) => {
        const length = path.getTotalLength();
        gsap.set(path, { strokeDasharray: length, strokeDashoffset: length, opacity: 1 });
        gsap.to(path, {
          strokeDashoffset: 0,
          duration: 1.45,
          delay: 0.75 + index * 0.16,
          ease: "power2.out",
        });
      });

      gsap.from(".care-card", {
        opacity: 0,
        y: 34,
        filter: "blur(8px)",
        duration: 0.86,
        stagger: 0.14,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".care-section",
          start: "top 78%",
        },
      });

      const hoverCapable = globalThis.matchMedia("(hover: hover) and (pointer: fine)").matches;
      if (hoverCapable) {
        const moveCard = (event: MouseEvent) => {
          const bounds = card.getBoundingClientRect();
          const offsetX = (event.clientX - bounds.left) / bounds.width - 0.5;
          const offsetY = (event.clientY - bounds.top) / bounds.height - 0.5;
          gsap.to(card, {
            rotateY: offsetX * 5.5,
            rotateX: -offsetY * 5.5,
            transformPerspective: 900,
            transformOrigin: "50% 50%",
            boxShadow: `${offsetX * -16}px ${26 + offsetY * 8}px 58px rgba(17, 24, 39, 0.2)`,
            duration: 0.34,
            ease: "power2.out",
          });
        };

        const resetCard = () => {
          gsap.to(card, {
            rotateX: 0,
            rotateY: 0,
            boxShadow: "0 22px 54px rgba(17, 24, 39, 0.18)",
            duration: 0.42,
            ease: "power2.out",
          });
        };

        card.addEventListener("mousemove", moveCard);
        card.addEventListener("mouseleave", resetCard);

        return () => {
          card.removeEventListener("mousemove", moveCard);
          card.removeEventListener("mouseleave", resetCard);
        };
      }
    }, page);

    return () => {
      ctx.revert();
    };
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
        { opacity: 1, y: 0, scale: 1, duration: 0.25, ease: "power2.out" }
      );

      if (status.tone === "error") {
        gsap.fromTo(
          ".login-card",
          { x: 0 },
          {
            x: -6,
            duration: 0.08,
            ease: "power1.inOut",
            repeat: 3,
            yoyo: true,
          }
        );
      }
    }, card);

    return () => {
      ctx.revert();
    };
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
      <div className="background-wave wave-a" aria-hidden />
      <div className="background-wave wave-b" aria-hidden />

      <section className="care-stage" aria-hidden>
        <div className="breath-circle" />

        <svg className="care-path" viewBox="0 0 640 240" role="presentation">
          <path
            d="M20 134 C 150 40, 230 220, 340 120 C 430 44, 510 164, 620 98"
            fill="none"
            stroke="rgba(80, 129, 186, 0.42)"
            strokeWidth="2"
          />
        </svg>

        <div className="particles-layer">
          {Array.from({ length: 8 }).map((_, index) => (
            <span className={`particle particle-${index + 1}`} key={index} />
          ))}
        </div>

        <header className="hero-copy">
          <h1 className="hero-title">Cuidar también es estar</h1>
          <p className="hero-subtitle">
            Plataforma clínica para una atención paliativa digna, humana y continua.
          </p>
        </header>

        <div className="care-section care-values">
          {CARE_VALUES.map((value) => (
            <article className="care-card" key={value}>
              {value}
            </article>
          ))}
        </div>

        <div className="hands-shell">
          <svg className="hands-illustration" viewBox="0 0 420 180" role="presentation">
            <path
              className="hand-path"
              d="M25 120 C 58 108, 78 100, 110 84 C 140 69, 172 66, 206 84 C 240 102, 266 112, 316 110"
            />
            <path
              className="hand-path"
              d="M110 84 C 122 64, 136 52, 156 44 C 179 34, 205 33, 232 45 C 256 56, 278 76, 296 102"
            />
            <path
              className="hand-path"
              d="M209 83 C 220 88, 230 95, 239 106 C 252 121, 268 131, 292 133 C 320 136, 349 126, 373 112"
            />
          </svg>
        </div>
      </section>

      <section className="login-shell">
        <form className="login-card" onSubmit={handleSubmit} ref={cardRef} noValidate>
          <div className="login-brand">
            <div className="login-brand-mark" aria-hidden>
              <HeartPulse size={18} />
            </div>
            <span className="login-brand-name">Paliativos</span>
          </div>

          <div className="login-header">
            <h2 className="login-title">Iniciar sesión</h2>
            <p className="login-subtitle">Accede con tus credenciales institucionales</p>
          </div>

          {status && (
            <div
              className={`login-status login-status--${status.tone}`}
              role="status"
              aria-live="polite"
            >
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
      </section>
    </div>
  );
}

export default LoginPage;
