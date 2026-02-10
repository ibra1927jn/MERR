import React from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { AppProvider } from "./context";
import { router } from "./routes";
import ErrorBoundary from "./components/common/ErrorBoundary";
import "./index.css";
import "./premium.css";

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(
    <AppProvider>
      <ErrorBoundary>
        <RouterProvider router={router} />
      </ErrorBoundary>
    </AppProvider>
  );
}
