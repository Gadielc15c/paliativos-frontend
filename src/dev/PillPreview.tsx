import { useState } from "react";
import { toast } from "sonner";
import Pill, { type PillTone } from "../components/common/Pill";
import Badge from "../components/common/Badge";
import Button from "../components/common/Button";
import NotificationToaster from "../app/layouts/NotificationToaster";
import { ThemeProvider, useTheme } from "../app/providers/ThemeProvider";
import "../styles/global.css";

const worst = [
  "Aleksandra Wiśniewska-Kowalczyk",
  "bartholomew.fitzgerald@northwind-industries-holdings.example.com",
  "J", "王秀英", "👩🏽‍💻 Priya", "1.000.000", "—",
  "I10 · Hipertensión esencial pendiente de revisión por el equipo médico",
  "<script>alert(1)</script>",
];
const tones: PillTone[] = ["neutral", "success", "warning", "danger", "info", "ai"];
const modes = ["Demo data", "Worst case", "Empty", "One", "1,000 rows"];

function Preview() {
  const [mode, setMode] = useState(new URLSearchParams(location.search).get("data") || "Demo data");
  const [selected, setSelected] = useState(false);
  const [removed, setRemoved] = useState(false);
  const { theme, setTheme } = useTheme();
  const values = mode === "Empty" ? [] : mode === "One" ? ["J"] : mode === "Worst case"
    ? [...worst, ...Array.from({ length: 15 }, (_, i) => `Diagnóstico ${i + 1}`)]
    : mode === "1,000 rows" ? Array.from({ length: 1000 }, (_, i) => `Etiqueta ${i + 1}`)
    : ["Activo", "Pendiente", "Médico"];
  return <main style={{ padding: 16, paddingBottom: 120, maxWidth: 960, margin: "auto" }}>
    <NotificationToaster />
    <h1>Prueba de componentes</h1>
    <div className="data-screen-actions"><Button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>Cambiar tema</Button>
    <Button onClick={() => toast.success("Operación completada", { id: "preview" })}>Probar aviso</Button></div>
    <label>Campo de prueba<input aria-label="Campo de prueba" /></label>
    <section aria-label="Variantes" style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBlock: 24 }}>
      {tones.map(tone => <Pill key={tone} tone={tone} size="md">{tone}</Pill>)}
      <Badge variant="error">Alias compatible</Badge>
      <Pill selected={selected} onClick={() => setSelected(!selected)}>Filtro</Pill>
      {!removed && <Pill removable onRemove={() => setRemoved(true)}>Etiqueta removible</Pill>}
    </section>
    <section aria-label="Datos" style={{ display: "flex", gap: 12, flexWrap: "wrap", maxWidth: 280 }}>
      {values.length ? values.map((value, i) => <Pill key={`${mode}-${i}`} tone={tones[i % tones.length]}
        removable onRemove={() => toast.info("Quitar etiqueta de prueba")}>{value}</Pill>) : <p>Sin etiquetas</p>}
    </section>
    <nav aria-label="Datos de prueba" style={{ position: "fixed", bottom: 8, left: 8, right: 8,
      display: "flex", flexWrap: "wrap", justifyContent: "center", background: "var(--surface-muted)", gap: 8, padding: 8, borderRadius: 12 }}>
      {modes.map(value => <button key={value} aria-pressed={mode === value} onClick={() => {
        setMode(value);
        const url = new URL(location.href);
        url.searchParams.set("data", value);
        history.replaceState(null, "", url);
      }}>{value}</button>)}
    </nav>
  </main>;
}

export default function PillPreview() {
  return <ThemeProvider><Preview /></ThemeProvider>;
}
