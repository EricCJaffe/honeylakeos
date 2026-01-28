import * as React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Vercel/static-host fallback: if we were routed through /404.html, restore the original path
// before React Router mounts.
const params = new URLSearchParams(window.location.search);
const redirect = params.get("redirect");
if (redirect) {
  // Replace URL so BrowserRouter sees the intended path.
  window.history.replaceState(null, "", redirect);
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
