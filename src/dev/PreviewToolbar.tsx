import { useState } from "react";
import "./preview.css";
export default function PreviewToolbar() {
  const [open, setOpen] = useState(false);
  const mode = new URLSearchParams(location.search).get("data") || "demo";
  return <aside className="preview-toolbar" aria-label="Previsualización de desarrollo">
    <button onClick={() => setOpen(!open)} aria-expanded={open}>Datos de ejemplo · {mode} {open ? "−" : "+"}</button>
    {open && <div className="preview-options">
      <p>Previsualización local. Los cambios no se guardan.</p>
      <div className="segmented-control" aria-label="Datos de prueba">{[["demo","Demo data"],["worst","Worst case"],["empty","Empty"],["one","One"],["huge","1,000 rows"]].map(([value,label]) => <button key={value} aria-pressed={mode===value} onClick={() => { const url = new URL(location.href); url.searchParams.set("mock","1"); url.searchParams.set("data",value); location.href=url.href; }}>{label}</button>)}</div>
      <button onClick={() => { localStorage.setItem("app_theme",document.documentElement.dataset.theme === "dark" ? "light" : "dark"); location.reload(); }}>Cambiar tema</button>
    </div>}
  </aside>;
}
