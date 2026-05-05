import { Empty, Loading, Error } from "../../../components/states/StateContainers";
import Badge from "../../../components/common/Badge";
import type { PatientContract } from "../../../types/contracts";
import { formatDate } from "../../../utils/format";
import "./PatientList.css";

interface PatientListProps {
  patients: PatientContract[] | undefined;
  isLoading: boolean;
  isError: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRetry: () => void;
}

const getStatusVariant = (status: string): "success" | "warning" | "info" => {
  switch (status) {
    case "active":
      return "success";
    case "deceased":
      return "warning";
    case "inactive":
      return "info";
    default:
      return "info";
  }
};

export default function PatientList({
  patients,
  isLoading,
  isError,
  selectedId,
  onSelect,
  onRetry,
}: PatientListProps) {
  if (isLoading) return <Loading />;
  if (isError) return <Error onRetry={onRetry} />;
  if (!patients || patients.length === 0) return <Empty message="Sin pacientes" />;

  return (
    <div className="patient-list">
      <div className="patient-list-header">
        <h2>Pacientes ({patients.length})</h2>
      </div>

      <div className="patient-list-items">
        {patients.map((patient) => (
          <button
            key={patient.id}
            className={`patient-list-item ${selectedId === patient.id ? "selected" : ""}`}
            onClick={() => onSelect(patient.id)}
          >
            <div className="patient-list-item-row name">
              <span className="label">Nombre</span>
              <span className="value">{patient.name}</span>
            </div>
            <div className="patient-list-item-row doc">
              <span className="label">Documento</span>
              <span className="value">{patient.document}</span>
            </div>
            <div className="patient-list-item-row">
              <span className="label">Doctor</span>
              <span className="value">{patient.assignedDoctor || "—"}</span>
            </div>
            <div className="patient-list-item-row">
              <span className="label">Estado</span>
              <Badge variant={getStatusVariant(patient.status)}>
                {patient.status.toUpperCase()}
              </Badge>
            </div>
            <div className="patient-list-item-row">
              <span className="label">Actualizado</span>
              <span className="value" style={{ fontSize: "0.75rem" }}>
                {formatDate(patient.updatedAt)}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
