import { FormEvent, useLayoutEffect, useRef, useState } from "react";
import { Loader, LogIn, AlertTriangle } from "lucide-react";
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
  const [email, setEmail] = useState("");
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
      gsap.set(card, { transformPerspective: 900 });
      gsap.set(".login-aura", { transformOrigin: "50% 50%" });

      const intro = gsap.timeline({ defaults: { ease: "power3.out" } });
      intro
        .from(".login-aura", { scale: 0.8, opacity: 0, duration: 1 }, 0)
        .from(".login-card", { y: 36, opacity: 0, duration: 0.8 }, 0.08)
        .from(".login-title", { y: 20, opacity: 0, duration: 0.6 }, 0.18)
        .from(".login-subtitle", { y: 16, opacity: 0, duration: 0.5 }, 0.24)
        .from(
          ".login-field",
          { y: 18, opacity: 0, duration: 0.48, stagger: 0.09 },
          0.3
        )
        .from(".login-submit", { y: 14, opacity: 0, duration: 0.48 }, 0.52);

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
            y: -2,
            duration: 0.22,
            ease: "power2.out",
          });
          gsap.to(".login-aura", {
            opacity: 0.9,
            scale: 1.06,
            duration: 0.3,
            ease: "power2.out",
          });
        };

        const focusOut = () => {
          gsap.to(field, {
            y: 0,
            duration: 0.22,
            ease: "power2.out",
          });
          gsap.to(".login-aura", {
            opacity: 0.72,
            scale: 1,
            duration: 0.35,
            ease: "power2.out",
          });
        };

        input.addEventListener("focus", focusIn);
        input.addEventListener("blur", focusOut);
        cleanupHandlers.push({ input, focusIn, focusOut });
      });

      const moveCard = (event: MouseEvent) => {
        const bounds = card.getBoundingClientRect();
        const offsetX = (event.clientX - bounds.left) / bounds.width - 0.5;
        const offsetY = (event.clientY - bounds.top) / bounds.height - 0.5;

        gsap.to(card, {
          rotateY: offsetX * 7,
          rotateX: -offsetY * 7,
          transformOrigin: "50% 50%",
          duration: 0.35,
          ease: "power2.out",
        });
        gsap.to(".login-aura", {
          xPercent: offsetX * 10,
          yPercent: offsetY * 10,
          duration: 0.4,
          ease: "power2.out",
        });
      };

      const resetCard = () => {
        gsap.to(card, {
          rotateX: 0,
          rotateY: 0,
          duration: 0.45,
          ease: "power2.out",
        });
        gsap.to(".login-aura", {
          xPercent: 0,
          yPercent: 0,
          duration: 0.45,
          ease: "power2.out",
        });
      };

      card.addEventListener("mousemove", moveCard);
      card.addEventListener("mouseleave", resetCard);

      return () => {
        card.removeEventListener("mousemove", moveCard);
        card.removeEventListener("mouseleave", resetCard);
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
    const button = cardRef.current?.querySelector<HTMLButtonElement>(
      ".login-submit"
    );
    if (!button) {
      return;
    }

    const ctx = gsap.context(() => {
      if (submitting) {
        gsap.to(button, {
          scale: 0.98,
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
    }, cardRef);

    return () => {
      ctx.revert();
    };
  }, [submitting]);

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
    <div className="login-page" ref={pageRef}>
      <div className="login-aura" aria-hidden />
      <form className="login-card" onSubmit={handleSubmit} ref={cardRef}>
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
