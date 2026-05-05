import { ReactNode, useEffect, useState } from "react";
import { Error as ErrorState, Loading } from "../../components/states/StateContainers";
import { bootstrapSession, clearSession } from "../../services/auth";
import { useAppStore } from "../store/useAppStore";

interface AuthBootstrapProps {
  children: ReactNode;
}

export function AuthBootstrap({ children }: AuthBootstrapProps) {
  const { setPermissions, setUser } = useAppStore();
  const [isReady, setIsReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      setIsReady(false);
      setErrorMessage(null);

      try {
        const session = await bootstrapSession();
        if (!isMounted) {
          return;
        }

        setUser(session.user);
        setPermissions(session.permissions);
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
            : "No se pudo iniciar sesión con backend."
        );
      }
    };

    void run();

    return () => {
      isMounted = false;
    };
  }, [reloadKey, setPermissions, setUser]);

  if (errorMessage) {
    return (
      <ErrorState
        message={`Backend auth falló: ${errorMessage}`}
        onRetry={() => setReloadKey((value) => value + 1)}
      />
    );
  }

  if (!isReady) {
    return <Loading />;
  }

  return <>{children}</>;
}
