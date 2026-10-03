import { Toaster } from "sonner";
import { useTheme } from "../providers/ThemeProvider";

export default function NotificationToaster() {
  const { theme } = useTheme();
  return <Toaster theme={theme === "dark" ? "dark" : "light"} richColors closeButton
    position="bottom-right" duration={6000} containerAriaLabel="Notificaciones"
    offset={{ bottom: "max(24px, env(safe-area-inset-bottom, 0px))", right: "max(24px, env(safe-area-inset-right, 0px))" }}
    mobileOffset={{ bottom: "max(16px, env(safe-area-inset-bottom, 0px))", left: "max(16px, env(safe-area-inset-left, 0px))", right: "max(16px, env(safe-area-inset-right, 0px))" }}
    toastOptions={{ style: { fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)" } }} />;
}
