import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./components/App";
import { GalaxyStoreProvider } from "./store/galaxyStore";
import "./global.css";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Missing #root");

createRoot(rootEl).render(
  <StrictMode>
    <GalaxyStoreProvider>
      <App />
    </GalaxyStoreProvider>
  </StrictMode>
);
