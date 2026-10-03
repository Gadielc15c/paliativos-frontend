import { Toaster } from "sonner";
import { useTheme } from "../providers/ThemeProvider";
import { useAssistant } from "../../modules/assistant/store";

export default function NotificationToaster() {
  const { theme } = useTheme();
  // The assistant composer lives bottom-right: toasts move to the top while it is visible.
  const assistant = useAssistant((s) => s.open) || (typeof location !== "undefined" && location.pathname === "/asistente");
  return <Toaster theme={theme === "dark" ? "dark" : "light"} richColors closeButton
    position={assistant ? "top-center" : "bottom-right"} duration={6000} containerAriaLabel="Notificaciones"
    offset={{ top: "max(16px, env(safe-area-inset-top, 0px))", bottom: "max(24px, env(safe-area-inset-bottom, 0px))", right: "max(24px, env(safe-area-inset-right, 0px))" }}
    mobileOffset={{ top: "max(12px, env(safe-area-inset-top, 0px))", bottom: "max(16px, env(safe-area-inset-bottom, 0px))", left: "max(16px, env(safe-area-inset-left, 0px))", right: "max(16px, env(safe-area-inset-right, 0px))" }}
    toastOptions={{ style: { fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)" } }} />;
}
