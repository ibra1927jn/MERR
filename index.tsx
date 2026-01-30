import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { HarvestProvider, Role } from "@/context/HarvestContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { MessagingProvider } from "@/context/MessagingContext";
import Login from "@/pages/Login";
import TeamLeader from "@/pages/TeamLeader";
import Runner from "@/pages/Runner";
import Manager from "@/pages/Manager";

// =============================================
// APP PRINCIPAL - Router basado en estado
// =============================================
const App = () => {
  const { isAuthenticated, currentRole, isLoading } = useAuth();

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#d91e36] to-[#8b0000] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white/30 border-t-white mx-auto mb-4"></div>
          <p className="text-white font-bold text-lg">HarvestPro NZ</p>
          <p className="text-white/70 text-sm mt-1">Loading...</p>
        </div>
      </div>
    );
  }

  // Si no está autenticado, mostrar Login
  if (!isAuthenticated) {
    return <Login />;
  }

  // Routing basado en el rol
  switch (currentRole) {
    case Role.MANAGER:
      return <Manager />;
    case Role.TEAM_LEADER:
      return <TeamLeader />;
    case Role.RUNNER:
      return <Runner />;
    default:
      // Si por alguna razón no hay rol, mostrar login
      return <Login />;
  }
};

// =============================================
// RENDER
// =============================================
const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(
    <AuthProvider>
      <MessagingProvider>
        <HarvestProvider>
          <App />
        </HarvestProvider>
      </MessagingProvider>
    </AuthProvider>
  );
}
