import React from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { HarvestProvider } from "@/context/HarvestContext";
import { AuthProvider } from "@/context/AuthContext";
import { router } from "./routes";

// =============================================
// RENDER - React Router with HarvestProvider
// =============================================
const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(
    <AuthProvider>
      <HarvestProvider>
        <RouterProvider router={router} />
      </HarvestProvider>
    </AuthProvider>
  );
}
