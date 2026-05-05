import { create } from "zustand";
import type { ReactNode } from "react";

export interface ContextAction {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  title?: string;
}

export interface ContextSummaryItem {
  label: string;
  value: string;
}

export interface ContextAlert {
  tone: "info" | "warning" | "error" | "success";
  message: string;
}

interface ContextActionsState {
  actions: ContextAction[];
  message: string | null;
  error: string | null;
  summaryTitle: string | null;
  summary: ContextSummaryItem[];
  alerts: ContextAlert[];
  setContextActions: (actions: ContextAction[]) => void;
  setContextFeedback: (feedback: { message?: string | null; error?: string | null }) => void;
  setContextSummary: (title: string | null, items: ContextSummaryItem[]) => void;
  setContextAlerts: (alerts: ContextAlert[]) => void;
  clearContextActions: () => void;
}

export const useContextActions = create<ContextActionsState>((set) => ({
  actions: [],
  message: null,
  error: null,
  summaryTitle: null,
  summary: [],
  alerts: [],
  setContextActions: (actions) => set({ actions }),
  setContextFeedback: (feedback) =>
    set({
      message: feedback.message ?? null,
      error: feedback.error ?? null,
    }),
  setContextSummary: (summaryTitle, summary) => set({ summaryTitle, summary }),
  setContextAlerts: (alerts) => set({ alerts }),
  clearContextActions: () =>
    set({
      actions: [],
      message: null,
      error: null,
      summaryTitle: null,
      summary: [],
      alerts: [],
    }),
}));
