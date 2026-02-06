import { Picker } from "../types";

// =============================================
// GEMINI SERVICE (FRONTEND-SAFE)
// =============================================
// Importante:
// - NO usamos la API key directamente en el frontend.
// - Este servicio llama a un backend seguro que debe exponer un endpoint
//   que hable con Gemini usando la GEMINI_API_KEY en servidor.
// - Configura la URL del backend en VITE_GEMINI_BACKEND_URL.
// =============================================

const GEMINI_BACKEND_URL = import.meta.env.VITE_GEMINI_BACKEND_URL;

export const generateCrewInsight = async (crew: Picker[], velocity: number): Promise<string> => {
  if (!GEMINI_BACKEND_URL) {
    console.warn(
      "[GeminiService] VITE_GEMINI_BACKEND_URL no está configurado. " +
      "La generación de insights de IA está desactivada para proteger la API key."
    );
    return "AI Insight not configured yet.";
  }

  try {
    const response = await fetch(GEMINI_BACKEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        crew: crew.map((p) => ({
          name: p.name,
          buckets: p.buckets,
          hours: (p as any).hours ?? 0,
        })),
        velocity,
      }),
    });

    if (!response.ok) {
      console.error("[GeminiService] Backend responded with error:", response.status, await response.text());
      return "AI Insight backend unavailable.";
    }

    const data = await response.json() as { insight?: string };
    return data.insight || "AI did not return any insight.";
  } catch (error) {
    console.error("[GeminiService] Error calling backend:", error);
    return "AI Insight unavailable (network error).";
  }
};