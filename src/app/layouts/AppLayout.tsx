import { useLayoutEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { gsap } from "gsap";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import ContextualPanel from "./ContextualPanel";
import { useAppStore } from "../store/useAppStore";
import "../../styles/global.css";
import "./layouts.css";

export default function AppLayout() {
  const { sidebarCollapsed, sidebarMobileOpen, closeSidebarMobile } = useAppStore();
  const location = useLocation();
  const centerPanelRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const centerPanel = centerPanelRef.current;
    if (!centerPanel) return;

    const currentPage = centerPanel.firstElementChild as HTMLElement | null;
    if (!currentPage) return;

    const mm = gsap.matchMedia();
    mm.add(
      {
        reduceMotion: "(prefers-reduced-motion: reduce)",
      },
      (context) => {
        const prefersReducedMotion = Boolean(
          (context.conditions as { reduceMotion?: boolean }).reduceMotion
        );

        if (prefersReducedMotion) {
          gsap.set(currentPage, { opacity: 1, y: 0 });
          return;
        }

        const stagedBlocks = currentPage.querySelectorAll(
          ".data-screen-header, .data-stat-card, .data-card, .data-list-item, .data-table tbody tr, .patient-profile-section, .patient-list-item"
        );

        const timeline = gsap.timeline({
          defaults: { ease: "power2.out" },
        });

        timeline.fromTo(
          currentPage,
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.28 }
        );

        if (stagedBlocks.length > 0) {
          timeline.fromTo(
            stagedBlocks,
            { opacity: 0, y: 14 },
            {
              opacity: 1,
              y: 0,
              stagger: 0.03,
              duration: 0.34,
              overwrite: "auto",
            },
            0.06
          );
        }

        return () => {
          timeline.kill();
        };
      }
    );

    return () => {
      mm.revert();
    };
  }, [location.pathname, location.search]);

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
          <div className="app-layout-center-panel" ref={centerPanelRef}>
            <Outlet />
          </div>
          <ContextualPanel />
        </div>
      </div>
    </div>
  );
}
