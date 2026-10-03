import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import ContextualPanel from "./ContextualPanel";
import TabBar from "./TabBar";
import QuickActionsHost from "../../modules/patients/quick/QuickActionsHost";
import { useAppStore } from "../store/useAppStore";
import AssistantPanel, { ASSISTANT_PATH } from "../../modules/assistant/components/AssistantPanel";
import { useAssistant } from "../../modules/assistant/store";
import "../../styles/global.css";
import "./layouts.css";

export default function AppLayout() {
  const { sidebarCollapsed, sidebarMobileOpen, closeSidebarMobile } = useAppStore();
  const location = useLocation();
  const showContextualPanel = location.pathname !== "/config";
  const assistantOpen = useAssistant((s) => s.open) && location.pathname !== ASSISTANT_PATH;
  const assistantWidth = useAssistant((s) => s.panelWidth);

  return (
    <div
      className={`app-layout-container ${sidebarCollapsed ? "sidebar-collapsed" : ""} ${
        sidebarMobileOpen ? "sidebar-mobile-open" : ""
      } ${assistantOpen ? "assistant-open" : ""}`}
      style={{ "--assistant-w": `${assistantWidth}px` } as React.CSSProperties}
    >
      <Sidebar />
      {sidebarMobileOpen && (
        <button
          className="sidebar-backdrop"
          onClick={closeSidebarMobile}
          aria-label="Cerrar menú lateral"
        />
      )}
      <div className="app-layout-main-content">
        <TopBar />
        <div className="app-layout-content-area">
          <div className="app-layout-center-panel">
            <Outlet />
          </div>
          {showContextualPanel && <ContextualPanel />}
        </div>
      </div>
      <AssistantPanel />
      <TabBar />
      <QuickActionsHost />
    </div>
  );
}
