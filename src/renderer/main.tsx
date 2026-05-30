import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./global.css";
import { AppBootstrap } from "./components/AppBootstrap";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element not found");
createRoot(rootEl).render(
	<StrictMode>
		<AppBootstrap />
	</StrictMode>,
);
