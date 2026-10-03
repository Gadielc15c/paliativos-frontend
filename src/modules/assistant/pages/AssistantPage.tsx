import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useIsCompact } from "../../../components/common/useMediaQuery";
import { useAssistant } from "../store";
import AssistantChat from "../components/AssistantChat";
import History from "../components/History";

/** /asistente: the same conversation as the side panel, with the history in its own column. */
export default function AssistantPage() {
  const compact = useIsCompact();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  // The page replaces the panel while it is shown.
  useEffect(() => { useAssistant.setState({ open: false }); }, []);

  const collapse = () => {
    navigate(from ?? "/");
    useAssistant.getState().openAssistant();
  };

  return (
    <div className="assistant-page">
      {!compact && (
        <aside className="assistant-page-history" aria-label="Historial">
          <History />
        </aside>
      )}
      <section className="assistant-page-chat" aria-label="Asistente">
        <AssistantChat surface="page" historyColumn={!compact} onCollapse={collapse} autoFocus={!compact} />
      </section>
    </div>
  );
}
