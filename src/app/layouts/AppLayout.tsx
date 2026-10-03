import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import ContextualPanel from "./ContextualPanel";
import TabBar from "./TabBar";
import { useAppStore } from "../store/useAppStore";
import "../../styles/global.css";
import "./layouts.css";

export default function AppLayout() {
  const { sidebarCollapsed, sidebarMobileOpen, closeSidebarMobile } = useAppStore();
  const location = useLocation();
  const showContextualPanel = location.pathname !== "/config";

  return (
    <div
      className={`app-layout-container ${sidebarCollapsed ? "sidebar-collapsed" : ""} ${
        sidebarMobileOpen ? "sidebar-mobile-open" : ""
      }`}
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
      <TabBar />
    </div>
  );
}
