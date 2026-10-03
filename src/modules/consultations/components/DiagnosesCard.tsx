import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Star, X } from "lucide-react";
import clsx from "clsx";
import Icd10Search from "../../../components/clinical/Icd10Search";
import InlineState from "../../../components/clinical/InlineState";
import { diagnosesEndpoints } from "../../../services/endpoints";
import type { ConsultationDiagnosis } from "../../../types/clinical";
import type { ApiError } from "../../../types/common";

/** CIE-10 diagnoses of a consultation: cmdk search, removable rows, one primary. */
export default function DiagnosesCard({ consultationId, readOnly }: { consultationId: string; readOnly: boolean }) {
  const qc = useQueryClient();
  const key = ["consultation-diagnoses", consultationId];
  const { data = [], isLoading, isError, refetch } = useQuery({ queryKey: key, queryFn: () => diagnosesEndpoints.list(consultationId) });
  const onList = (list: ConsultationDiagnosis[]) => qc.setQueryData(key, list);
  const onError = (e: unknown) => toast.error((e as unknown as ApiError)?.message || "No se pudo actualizar el diagnóstico.");

  const add = useMutation({ mutationFn: (code: string) => diagnosesEndpoints.add(consultationId, code), onSuccess: (list, code) => { onList(list); toast.success(`${code} agregado`); }, onError });
  const primary = useMutation({ mutationFn: (id: string) => diagnosesEndpoints.setPrimary(consultationId, id), onSuccess: onList, onError });
  const remove = useMutation({ mutationFn: (id: string) => diagnosesEndpoints.remove(consultationId, id), onSuccess: onList, onError });
  const busy = add.isPending || primary.isPending || remove.isPending;

  return (
    <section className="data-card consult-dx" aria-labelledby="consult-dx-title">
      <div className="data-card-header">
        <div>
          <h2 id="consult-dx-title" className="data-card-title">Diagnósticos CIE-10</h2>
          <p className="data-card-subtitle">{data.length ? `${data.length} ${data.length === 1 ? "código" : "códigos"} · el principal va primero` : "El primero que agregues será el principal."}</p>
        </div>
      </div>
      <div className="data-card-body consult-dx-body">
        {!readOnly && <Icd10Search variant="inline" placeholder="Buscar CIE-10: código o término" exclude={data.map((d) => d.code)} onSelect={(c) => add.mutate(c.code)} disabled={add.isPending} />}
        {isLoading ? <span className="skeleton" style={{ height: 56 }} /> : isError ? (
          <InlineState kind="error" message="No se pudieron cargar los diagnósticos." onRetry={() => void refetch()} />
        ) : data.length === 0 ? (
          <p className="consult-dx-empty">Sin diagnósticos codificados todavía.</p>
        ) : (
          <ul className="consult-dx-list">
            {data.map((d) => (
              <li key={d.id} className={clsx("consult-dx-row", d.is_primary && "is-primary")}>
                <span className="code-pill">{d.code}</span>
                <span className="consult-dx-desc">{d.description}</span>
                {readOnly ? (
                  d.is_primary && <span className="consult-dx-flag">Principal</span>
                ) : (
                  <span className="consult-dx-actions">
                    <button type="button" className="consult-dx-star" aria-pressed={d.is_primary} disabled={busy || d.is_primary}
                      onClick={() => primary.mutate(d.id)} title={d.is_primary ? "Diagnóstico principal" : "Marcar como principal"}
                      aria-label={d.is_primary ? `${d.code} es el principal` : `Marcar ${d.code} como principal`}>
                      <Star size={18} aria-hidden="true" fill={d.is_primary ? "currentColor" : "none"} />
                      <span className="consult-dx-star-label">{d.is_primary ? "Principal" : "Principal"}</span>
                    </button>
                    <button type="button" className="consult-dx-remove" disabled={busy} onClick={() => remove.mutate(d.id)} aria-label={`Quitar ${d.code}`}>
                      <X size={18} aria-hidden="true" />
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
