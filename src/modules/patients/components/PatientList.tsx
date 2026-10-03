import { Empty, Loading, Error } from "../../../components/states/StateContainers";
import Pill from "../../../components/common/Pill";
import DataList from "../../../components/common/DataList";
import type { PatientContract } from "../../../types/contracts";
import { formatDate } from "../../../utils/format";
import { label } from "../../../utils/labels";
import "./PatientList.css";

interface PatientListProps {
  patients: PatientContract[] | undefined;
  isLoading: boolean;
  isError: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRetry: () => void;
  /** Per-patient note from an alert filter (e.g. "hace 64 días"); replaces "Actualizado …". */
  notes?: Map<string, string>;
  emptyMessage?: string;
  /** Next step for the empty list (e.g. "Nuevo paciente"). */
  emptyAction?: { label: string; onClick: () => void; icon?: React.ReactNode };
}

const getStatusVariant = (status: string): "success" | "warning" | "neutral" =>
  status === "active" ? "success" : status === "deceased" ? "warning" : "neutral";

export default function PatientList({ patients, isLoading, isError, selectedId, onSelect, onRetry, notes, emptyMessage, emptyAction }: PatientListProps) {
  if (isLoading) return <Loading />;
  if (isError) return <Error message="No se pudo cargar la lista de pacientes." onRetry={onRetry} />;
  if (!patients || patients.length === 0) return <Empty message={emptyMessage ?? (emptyAction ? "Aún no hay pacientes. Agrega el primero con «Nuevo paciente»." : "Aún no hay pacientes registrados. Cuando el equipo registre el primero aparecerá aquí.")} action={emptyAction} />;

  return (
    <div className="patient-list">
      <DataList
        label="Pacientes"
        layout="cards"
        rows={patients}
        rowKey={(p) => p.id}
        selectedKey={selectedId}
        onRowClick={(p) => onSelect(p.id)}
        title={(p) => p.name}
        subtitle={(p) => [p.document, p.assignedDoctor].filter(Boolean).join(" · ")}
        detail={(p) => {
          const note = notes?.get(p.id);
          return note ? <span className="patient-list-note">{note}</span> : <span className="patient-list-updated">Actualizado {formatDate(p.updatedAt)}</span>;
        }}
        // Only non-default states get a pill: "Activo" on every row is noise.
        status={(p) => (p.status !== "active" ? <Pill tone={getStatusVariant(p.status)}>{label("patientStatus", p.status)}</Pill> : undefined)}
        columns={[]}
      />
    </div>
  );
}
