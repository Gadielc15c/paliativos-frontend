import { useEffect, useState } from "react";
import { Mic, ShieldCheck } from "lucide-react";
import Sheet from "../../../components/common/Sheet";
import Button from "../../../components/common/Button";
import SegmentedControl from "../../../components/common/SegmentedControl";
import AiPill from "../../../components/clinical/AiPill";

type Source = "free_text" | "transcript";

export const SAMPLE_NOTE = "Acude por dolor oncológico 8/10 en región lumbar y disnea de esfuerzo desde hace una semana. Niega náuseas. Refiere estreñimiento de 4 días y ansiedad nocturna. Antecedente de cáncer de pulmón estadio IV. TA 120/80, FC 92, SatO2 93%. Impresiona dolor oncológico mal controlado. Se indica aumentar morfina a 10 mg c/4h, iniciar lactulosa 15 ml c/12h y control en 7 días.";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (text: string, source: Source) => void;
  pending: boolean;
  initialText?: string;
  initialSource?: Source;
  /** Opens the consent dialog + recorder (closes this sheet). */
  onRecord?: () => void;
  /** Why recording is unavailable on this server (button disabled + explanation). */
  recordDisabledReason?: string;
}

/** Step 1 of the assistant: paste text or use the consultation transcript. Nothing is sent until "Generar borrador". */
export default function AiComposeSheet({ open, onClose, onSubmit, pending, initialText = "", initialSource = "free_text", onRecord, recordDisabledReason }: Props) {
  const [text, setText] = useState(initialText);
  const [source, setSource] = useState<Source>(initialSource);

  useEffect(() => { if (open && initialText && !text) { setText(initialText); setSource(initialSource); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const valid = text.trim().length >= 3;
  return (
    <Sheet open={open} onClose={onClose} size="lg"
      title={<span className="ai-sheet-title">Preparar nota con IA <AiPill /></span>}
      subtitle="Pega o escribe lo que ocurrió en la consulta. La IA propone un borrador SOAP y códigos CIE-10; tú decides qué se guarda."
      footer={<>
        <Button variant="gray" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" className="glow-border" disabled={!valid} isLoading={pending} onClick={() => onSubmit(text.trim(), source)}>Generar borrador</Button>
      </>}>
      <SegmentedControl label="Tipo de texto" value={source} onChange={setSource}
        segments={[{ value: "free_text", label: "Texto libre" }, { value: "transcript", label: "Transcripción" }]} />
      <label className="ai-compose-label">
        <span>Notas o transcripción</span>
        <textarea className="ai-compose-text" rows={9} value={text} maxLength={20000} onChange={(e) => setText(e.target.value)}
          placeholder="Ej.: Acude por dolor 8/10 y disnea de esfuerzo. Niega náuseas. TA 120/80, FC 92. Se indica aumentar morfina…" />
      </label>
      <div className="ai-compose-tools">
        {onRecord && (
          <Button variant="gray" onClick={onRecord} disabled={!!recordDisabledReason} title={recordDisabledReason ?? "Grabar la consulta con el consentimiento del paciente"}>
            <Mic size={18} aria-hidden="true" /><span>Grabar consulta</span>
          </Button>
        )}
        {import.meta.env.DEV && !text && <Button variant="plain" onClick={() => setText(SAMPLE_NOTE)}>Usar texto de ejemplo</Button>}
        <span className="ai-compose-count">{text.length.toLocaleString("es-DO")} / 20.000</span>
      </div>
      {onRecord && recordDisabledReason && <p className="ai-compose-hint">{recordDisabledReason}</p>}
      <p className="ai-privacy"><ShieldCheck size={16} aria-hidden="true" />Antes de enviarse, nombres, documentos, teléfonos y direcciones se sustituyen por marcadores. El borrador no se guarda en la consulta hasta que lo aceptes.</p>
    </Sheet>
  );
}
