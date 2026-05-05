import { ReactNode, useEffect, useState } from "react";
import { Error as ErrorState, Loading } from "../../components/states/StateContainers";
import { LoginPage } from "../../modules/auth/LoginPage";
import { clearSession, restoreSession } from "../../services/auth";
import type { AuthSession } from "../../services/auth";
import { useAppStore } from "../store/useAppStore";

interface AuthBootstrapProps {
  children: ReactNode;
}

export function AuthBootstrap({ children }: AuthBootstrapProps) {
  const { isAuthenticated, setPermissions, setUser } = useAppStore();
  const [isReady, setIsReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      setIsReady(false);
      setErrorMessage(null);

      try {
        const session = await restoreSession();
        if (!isMounted) {
          return;
        }
        if (session) {
          setUser(session.user);
          setPermissions(session.permissions);
        } else {
          setUser(null);
          setPermissions([]);
        }
        setIsReady(true);
      } catch (error) {
        clearSession();
        if (!isMounted) {
          return;
        }

        setUser(null);
        setPermissions([]);
        setErrorMessage(
          error instanceof globalThis.Error
            ? error.message
            : "No se pudo contactar al backend."
        );
        setIsReady(true);
      }
    };

    void run();

    return () => {
      isMounted = false;
    };
  }, [reloadKey, setPermissions, setUser]);

  const handleLoginSuccess = (session: AuthSession) => {
    setUser(session.user);
    setPermissions(session.permissions);
  };

  if (!isReady) {
    return <Loading />;
  }

  if (errorMessage) {
    return (
      <ErrorState
        message={`Backend no disponible: ${errorMessage}`}
        onRetry={() => setReloadKey((value) => value + 1)}
      />
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onSuccess={handleLoginSuccess} />;
  }

  return <>{children}</>;
}
