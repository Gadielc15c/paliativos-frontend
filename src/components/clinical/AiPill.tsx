import Pill from "../common/Pill";

/** The single AI marker: "✦ IA" with the slow Apple-Intelligence glow. */
export default function AiPill({ children = "IA" }: { children?: string }) {
  return <Pill tone="ai" className="ai-pill">{`✦ ${children}`}</Pill>;
}
