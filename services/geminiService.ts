import { GoogleGenAI } from "@google/genai";
import { Picker } from "../types";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });

// =============================================
// TYPES
// =============================================
export interface HarvestPrediction {
  estimatedCompletionTime: string;
  probabilityOfSuccess: number;
  predictedFinalTons: number;
  riskFactors: string[];
  recommendations: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface PredictionParams {
  currentTons: number;
  targetTons: number;
  velocity: number; // buckets per hour
  hoursRemaining: number;
  crewSize: number;
  weatherConditions?: string;
  blockProgress?: number;
}

// =============================================
// GEMINI SERVICE
// =============================================

/**
 * Generate crew performance insight
 */
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
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    return response.text || "Unable to generate insight.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "AI Insight unavailable offline.";
  }
};

/**
 * Generate harvest prediction using AI
 */
export const generateHarvestPrediction = async (params: PredictionParams): Promise<HarvestPrediction> => {
  const {
    currentTons,
    targetTons,
    velocity,
    hoursRemaining,
    crewSize,
    weatherConditions = 'clear',
    blockProgress = 50,
  } = params;

  // Calculate baseline predictions
  const tonsPerBucket = 0.005; // ~5kg per bucket
  const projectedBuckets = velocity * hoursRemaining;
  const projectedTons = currentTons + (projectedBuckets * tonsPerBucket);
  const progressPercent = (currentTons / targetTons) * 100;

  try {
    const prompt = `
You are an expert agricultural analyst for cherry orchards in New Zealand.
Analyze this harvest data and provide a prediction in JSON format.

Current Data:
- Current harvest: ${currentTons.toFixed(2)} tons
- Target: ${targetTons} tons
- Progress: ${progressPercent.toFixed(1)}%
- Current velocity: ${velocity} buckets/hour
- Hours remaining: ${hoursRemaining}
- Active pickers: ${crewSize}
- Weather: ${weatherConditions}
- Block completion: ${blockProgress}%
- Projected total (linear): ${projectedTons.toFixed(2)} tons

Respond ONLY with valid JSON in this exact format:
{
  "estimatedCompletionTime": "HH:MM format or 'Not achievable'",
  "probabilityOfSuccess": 0-100,
  "predictedFinalTons": number,
  "riskFactors": ["factor1", "factor2"],
  "recommendations": ["action1", "action2"],
  "confidence": "high" | "medium" | "low"
}

Consider:
- Cherry picking velocity typically decreases 15-20% after lunch
- Weather impacts: rain stops work, heat > 30°C reduces efficiency
- Minimum wage compliance affects sustainable pace
- Block progress indicates remaining easy vs difficult areas
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    const text = response.text || '';

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        estimatedCompletionTime: parsed.estimatedCompletionTime || calculateFallbackETA(params),
        probabilityOfSuccess: Math.min(100, Math.max(0, parsed.probabilityOfSuccess || 50)),
        predictedFinalTons: parsed.predictedFinalTons || projectedTons,
        riskFactors: parsed.riskFactors || [],
        recommendations: parsed.recommendations || [],
        confidence: parsed.confidence || 'medium',
      };
    }

    throw new Error('Invalid JSON response');
  } catch (error) {
    console.error("Gemini Prediction Error:", error);
    // Fallback to local calculation
    return generateFallbackPrediction(params);
  }
};

/**
 * Fallback prediction when AI is unavailable
 */
function generateFallbackPrediction(params: PredictionParams): HarvestPrediction {
  const { currentTons, targetTons, velocity, hoursRemaining, crewSize } = params;

  const tonsPerBucket = 0.005;
  const projectedBuckets = velocity * hoursRemaining * 0.85; // 15% fatigue factor
  const projectedTons = currentTons + (projectedBuckets * tonsPerBucket);
  const progressPercent = (currentTons / targetTons) * 100;

  const willComplete = projectedTons >= targetTons;
  const probability = Math.min(100, Math.round((projectedTons / targetTons) * 100));

  const riskFactors: string[] = [];
  const recommendations: string[] = [];

  if (velocity < 10) {
    riskFactors.push('Low team velocity');
    recommendations.push('Consider reassigning pickers to easier rows');
  }

  if (hoursRemaining < 3 && progressPercent < 70) {
    riskFactors.push('Limited time remaining');
    recommendations.push('Focus on high-density areas');
  }

  if (crewSize < 5) {
    riskFactors.push('Small crew size');
    recommendations.push('Request additional pickers if available');
  }

  return {
    estimatedCompletionTime: calculateFallbackETA(params),
    probabilityOfSuccess: probability,
    predictedFinalTons: Math.round(projectedTons * 100) / 100,
    riskFactors,
    recommendations,
    confidence: 'low',
  };
}

/**
 * Calculate simple ETA
 */
function calculateFallbackETA(params: PredictionParams): string {
  const { currentTons, targetTons, velocity } = params;

  if (velocity <= 0) return 'Unable to calculate';

  const remainingTons = targetTons - currentTons;
  if (remainingTons <= 0) return 'Target achieved';

  const tonsPerBucket = 0.005;
  const bucketsNeeded = remainingTons / tonsPerBucket;
  const hoursNeeded = bucketsNeeded / velocity;

  const now = new Date();
  const eta = new Date(now.getTime() + hoursNeeded * 60 * 60 * 1000);

  return eta.toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' });
}

export default {
  generateCrewInsight,
  generateHarvestPrediction,
};