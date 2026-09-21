import { GoogleGenAI } from "@google/genai";

/**
 * Service for Google Search Grounding using Gemini API
 * Allows research-backed context synthesis for current, obscure, or source-sensitive astrological queries.
 */

// Heuristic to detect whether web research is necessary
export function shouldPerformWebResearch(userQuery = "") {
  if (!userQuery || typeof userQuery !== "string") return false;
  const q = userQuery.toLowerCase().trim();

  // Exclude simple greetings or direct birth data submissions
  if (q.length < 8) return false;
  if (/^(namaste|pranam|hello|hi|har har mahadev|jai shree ram)$/i.test(q)) return false;
  if (/(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})/.test(q)) return false; // Contains DOB pattern

  // Trigger web research for current transits, specific festival Muhurtas, obscure scriptures, or current astronomical news
  const researchTriggers = [
    /gochar/i, /transit/i, /2026/i, /2025/i, /muhurta/i, /panchang/i,
    /festival/i, /grahan/i, /eclipse/i, /shastra/i, /purana/i, /shloka/i,
    /verse/i, /citation/i, /research/i, /astronomy/i, /ephemeris/i,
    /aaj ka/i, /aaj ki/i, /choghadiya/i, /rahu kalam/i, /latest/i
  ];

  return researchTriggers.some(pattern => pattern.test(q));
}

/**
 * Execute Google Search Grounding with Gemini API
 */
export async function performGoogleSearchGrounding(query = "", customApiKey = "") {
  const apiKey = (customApiKey || process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const modelsToTry = [
      process.env.GEMINI_MODEL,
      "gemini-2.5-flash",
      "gemini-1.5-flash",
      "gemini-2.5-pro"
    ].filter(Boolean);

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Provide accurate, source-grounded research regarding this Vedic astrology / astronomical inquiry:\n\n"${query}"\n\nFocus on authoritative classical sources, accurate planetary transit timelines, and authentic Panchanga details.`
                }
              ]
            }
          ],
          config: {
            tools: [{ googleSearch: {} }],
            temperature: 0.2
          }
        });

        const text = response.text || "";
        const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
        const searchChunks = groundingMetadata?.groundingChunks || [];

        const citations = searchChunks
          .map(chunk => chunk.web?.uri ? `• ${chunk.web.title || 'Source'}: ${chunk.web.uri}` : null)
          .filter(Boolean);

        if (text.trim()) {
          return {
            researchSummary: text.trim(),
            citations: citations.length > 0 ? citations : [],
            grounded: true,
            modelUsed: modelName
          };
        }
      } catch (mErr) {
        // Try next model if search tool fails on specific model version
        console.warn(`[Grounding Service] Notice on ${modelName}:`, mErr?.message || mErr);
      }
    }
  } catch (err) {
    console.warn("[Grounding Service] Grounding error:", err?.message || err);
  }

  return null;
}
