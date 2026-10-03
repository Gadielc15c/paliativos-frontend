import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import "./styles/global.css";

async function start() {
  const root = ReactDOM.createRoot(document.getElementById("root")!);
  if (import.meta.env.DEV && new URLSearchParams(location.search).has("ui-check")) {
    const { default: PillPreview } = await import("./dev/PillPreview");
    root.render(<PillPreview />);
  } else if (import.meta.env.DEV && new URLSearchParams(location.search).get("mock") === "1") {
    const { installPreview } = await import("./dev/mock");
    const { default: PreviewToolbar } = await import("./dev/PreviewToolbar");
    installPreview();
    root.render(<React.StrictMode><App /><PreviewToolbar /></React.StrictMode>);
  } else root.render(<React.StrictMode><App /></React.StrictMode>);
}
void start();
