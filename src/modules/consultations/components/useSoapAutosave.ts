import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { soapEndpoints } from "../../../services/endpoints";
import { SOAP_FIELDS, type ConsultationRead, type SoapField, type SoapNote } from "../../../types/clinical";
import type { ApiError } from "../../../types/common";

export type SaveState = "idle" | "dirty" | "saving" | "saved" | "error" | "conflict";

const toDraft = (c: ConsultationRead): Record<SoapField, string> =>
  Object.fromEntries(SOAP_FIELDS.map((f) => [f, c[f] ?? ""])) as Record<SoapField, string>;

export const isConflict = (e: unknown) => {
  const err = e as ApiError;
  return err?.code === "CONFLICT" || err?.code === "409";
};

/**
 * Debounced autosave with the backend's optimistic `version`. Only changed fields are
 * sent. A 409 (stale version / already signed) stops autosaving and offers a reload.
 */
export function useSoapAutosave(consultation: ConsultationRead | undefined, onSaved: (c: ConsultationRead) => void, onReload: () => void) {
  const [draft, setDraft] = useState<Record<SoapField, string> | null>(null);
  const [state, setState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const server = useRef<Record<SoapField, string> | null>(null);
  const version = useRef<number>(0);
  const inflight = useRef<Promise<unknown> | null>(null);
  const loadedId = useRef<string | null>(null);

  // (Re)seed from the server when another consultation loads or after an external change (AI apply, reload).
  const reseed = useCallback((c: ConsultationRead) => {
    server.current = toDraft(c);
    version.current = c.version;
    setDraft(toDraft(c));
    setState("idle");
  }, []);
  useEffect(() => {
    if (consultation && loadedId.current !== consultation.id) { loadedId.current = consultation.id; reseed(consultation); }
  }, [consultation, reseed]);

  const changed = useCallback((): Partial<SoapNote> => {
    if (!draft || !server.current) return {};
    return Object.fromEntries(SOAP_FIELDS.filter((f) => draft[f] !== server.current![f]).map((f) => [f, draft[f] || null]));
  }, [draft]);

  const save = useCallback(async () => {
    if (!consultation || consultation.status !== "draft") return;
    if (inflight.current) await inflight.current;
    const fields = changed();
    if (!Object.keys(fields).length) return;
    setState("saving");
    const run = soapEndpoints.patch(consultation.id, version.current, fields)
      .then((next) => {
        version.current = next.version;
        server.current = { ...server.current!, ...Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, v ?? ""])) };
        setSavedAt(new Date());
        setState((s) => (s === "saving" ? "saved" : s));
        onSaved(next);
      })
      .catch((e) => {
        if (isConflict(e)) {
          setState("conflict");
          toast.error("La nota cambió en otro lugar", {
            description: "Recarga para ver la última versión. Tus cambios sin guardar se copiarán al portapapeles.",
            action: { label: "Recargar", onClick: () => { void navigator.clipboard?.writeText(Object.values(fields).filter(Boolean).join("\n\n")); onReload(); } },
            duration: 12000,
          });
        } else {
          setState("error");
          toast.error("No se pudo guardar el borrador", { description: (e as unknown as ApiError)?.message, action: { label: "Reintentar", onClick: () => void save() } });
        }
      })
      .finally(() => { inflight.current = null; });
    inflight.current = run;
    await run;
  }, [consultation, changed, onSaved, onReload]);

  // Debounce: 1.2 s after the last keystroke.
  useEffect(() => {
    if (!draft || state === "conflict") return;
    if (!Object.keys(changed()).length) return;
    setState((s) => (s === "saving" ? s : "dirty"));
    const t = setTimeout(() => void save(), 1200);
    return () => clearTimeout(t);
  }, [draft]); // eslint-disable-line react-hooks/exhaustive-deps

  const setField = (f: SoapField, v: string) => setDraft((d) => (d ? { ...d, [f]: v } : d));
  const flush = async () => { await save(); return version.current; };

  return { draft, setField, state, savedAt, flush, reseed, version };
}
