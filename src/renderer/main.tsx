import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initLocale } from "../i18n";
import { App } from "./App";
import "./global.css";

initLocale();

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element not found");
createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>
);
