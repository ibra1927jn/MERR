import React from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { HarvestProvider } from "@/context/HarvestContext";
import { router } from "./routes";

// =============================================
// RENDER - React Router with HarvestProvider
// =============================================
const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(
    <HarvestProvider>
      <RouterProvider router={router} />
    </HarvestProvider>
  );
}
