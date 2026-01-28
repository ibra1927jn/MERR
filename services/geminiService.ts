import { GoogleGenAI } from "@google/genai";
import { Picker } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateCrewInsight = async (crew: Picker[], velocity: number): Promise<string> => {
  try {
    const crewData = crew.map(p => 
      `${p.name} (Buckets: ${p.buckets}, Hours: ${p.hours || 0})`
    ).join('\n');

    const prompt = `
      Analyze this orchard crew performance. 
      Current Team Velocity: ${velocity} buckets/hr.
      
      Crew Data:
      ${crewData}

      Identify 1 key bottleneck or underperforming picker and suggest 1 tactical move for the Team Leader.
      Keep it extremely brief (max 2 sentences).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Unable to generate insight.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "AI Insight unavailable offline.";
  }
};