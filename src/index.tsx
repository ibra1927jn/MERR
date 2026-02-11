import React from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { AppProvider } from "./context";
import { router } from "./routes";
import "./index.css";

// Initialize Sentry for error tracking (must be before React)
import { initSentry } from './config/sentry';
initSentry();

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(
    <AppProvider>
      <RouterProvider router={router} />
    </AppProvider>
  );
}
