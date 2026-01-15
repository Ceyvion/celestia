import { GoogleGenAI, Type, Schema } from "@google/genai";
import { z } from "zod";
import { BirthDetails, ChartData, SynastryData, CalculatedChart, ResolvedLocation, SynastryAspect } from "../types";
import { calculateChart, calculateAspects } from "./astronomyService";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const modelName = "gemini-3-flash-preview";

// --- Zod Schemas for Runtime Validation ---
const ResolvedLocationSchema = z.object({
  lat: z.number(),
  lon: z.number(),
  utcTime: z.string(),
  formattedAddress: z.string(),
});

const InterpretationSchema = z.object({
  planets: z.array(z.object({
    name: z.string(),
    interpretation: z.string(),
  })),
  summary: z.string(),
});

const SynastryAnalysisSchema = z.object({
  overview: z.string(),
  strengths: z.array(z.string()),
  challenges: z.array(z.string()),
  keyAspects: z.array(z.object({
    planetA: z.string(),
    planetB: z.string(),
    aspectType: z.string(),
    description: z.string()
  }))
});

// --- API Helpers ---

/**
 * Step 1: Resolve Natural Language Location & Time to Deterministic Coordinates
 */
async function resolveBirthDetails(details: BirthDetails): Promise<ResolvedLocation> {
  const prompt = `
    Task: Geocode and Timezone resolution.
    Input Name: ${details.name}
    Input Date: ${details.date}
    Input Time: ${details.time}
    Input Location: ${details.location}

    1. Identify the precise Latitude and Longitude for "${details.location}".
    2. Convert the local date/time to UTC ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ), accounting for historical timezones and daylight savings at that specific location and date.
    3. Return structured JSON.
  `;

  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          lat: { type: Type.NUMBER },
          lon: { type: Type.NUMBER },
          utcTime: { type: Type.STRING },
          formattedAddress: { type: Type.STRING },
        },
        required: ["lat", "lon", "utcTime", "formattedAddress"],
      },
    },
  });

  if (!response.text) throw new Error("Could not resolve location details.");
  
  const parsed = JSON.parse(response.text);
  // Runtime validation
  return ResolvedLocationSchema.parse(parsed);
}

/**
 * Step 2: Generate Interpretations for Calculated Data
 */
async function enrichChart(chart: CalculatedChart, name: string): Promise<ChartData> {
  const simplifiedChart = chart.planets.map(p => `${p.name} in ${p.sign} (House ${p.house})`).join(", ");
  const rising = `Rising: ${chart.rising.sign}`;

  const prompt = `
    Act as an editorial astrologer. Write poetic, high-fidelity interpretations for the following natal chart placements.
    Subject Name: ${name}
    Placements: ${simplifiedChart}, ${rising}.

    Requirements:
    1. For each planet, provide a deep, soulful, 2-sentence interpretation.
    2. Provide a "Soul Signature" summary (max 30 words) capturing the essence.
  `;

  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          planets: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                interpretation: { type: Type.STRING },
              },
              required: ["name", "interpretation"],
            },
          },
          summary: { type: Type.STRING },
        },
        required: ["planets", "summary"],
      },
    },
  });

  if (!response.text) throw new Error("Could not interpret chart.");
  const data = JSON.parse(response.text);
  const validated = InterpretationSchema.parse(data);

  // Merge interpretations back into the calculated chart
  const mergedPlanets = chart.planets.map(p => {
    const interpretation = validated.planets.find(ip => ip.name === p.name)?.interpretation || "A mysterious placement.";
    return { ...p, interpretation };
  });

  return {
    ...chart,
    name,
    planets: mergedPlanets,
    summary: validated.summary,
  };
}

/**
 * Public Method: Analyze Birth Chart
 */
export const analyzeBirthChart = async (details: BirthDetails): Promise<ChartData> => {
  // 1. Resolve
  const resolved = await resolveBirthDetails(details);
  
  // 2. Calculate (Deterministic)
  const calculated = calculateChart(new Date(resolved.utcTime), resolved.lat, resolved.lon);
  
  // 3. Interpret (AI)
  return enrichChart(calculated, details.name);
};

/**
 * Public Method: Analyze Synastry
 */
export const analyzeSynastry = async (d1: BirthDetails, d2: BirthDetails): Promise<SynastryData> => {
  // 1. Resolve Both
  const [r1, r2] = await Promise.all([resolveBirthDetails(d1), resolveBirthDetails(d2)]);

  // 2. Calculate Both
  const c1 = calculateChart(new Date(r1.utcTime), r1.lat, r1.lon);
  const c2 = calculateChart(new Date(r2.utcTime), r2.lat, r2.lon);

  // 3. Calculate Aspects (Deterministic)
  const aspects = calculateAspects(c1, c2);

  // 4. Enrich both natal charts (parallel)
  const [p1Enriched, p2Enriched] = await Promise.all([
    enrichChart(c1, d1.name),
    enrichChart(c2, d2.name)
  ]);

  // 5. Generate Synastry Analysis
  const aspectDescriptions = aspects.map(a => `${a.planetA} (${d1.name}) ${a.aspectType} ${a.planetB} (${d2.name})`).join("; ");
  
  const prompt = `
    Analyze the relationship alchemy between ${d1.name} and ${d2.name}.
    Key Aspects: ${aspectDescriptions}.
    
    1. Overview: A poetic synthesis of their bond.
    2. Strengths: 3 bullet points.
    3. Challenges: 3 bullet points.
    4. Interpret the Key Aspects provided.
  `;

  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overview: { type: Type.STRING },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          challenges: { type: Type.ARRAY, items: { type: Type.STRING } },
          keyAspects: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                planetA: { type: Type.STRING },
                planetB: { type: Type.STRING },
                aspectType: { type: Type.STRING },
                description: { type: Type.STRING },
              },
              required: ["planetA", "planetB", "aspectType", "description"],
            }
          }
        },
        required: ["overview", "strengths", "challenges", "keyAspects"],
      }
    }
  });

  if (!response.text) throw new Error("Could not analyze synastry.");
  const analysisRaw = JSON.parse(response.text);
  const analysis = SynastryAnalysisSchema.parse(analysisRaw);

  // Map AI results back to calculated aspects to preserve orb data which is required by SynastryAspect type
  const keyAspects: SynastryAspect[] = analysis.keyAspects.map(ka => {
    const original = aspects.find(a => 
      a.planetA === ka.planetA && 
      a.planetB === ka.planetB && 
      a.aspectType === ka.aspectType
    );
    return {
      ...ka,
      orb: original ? original.orb : 0
    };
  });

  return {
    personA: p1Enriched,
    personB: p2Enriched,
    analysis: {
      ...analysis,
      keyAspects
    }
  };
};