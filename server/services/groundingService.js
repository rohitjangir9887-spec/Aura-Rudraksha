import { GoogleGenAI } from "@google/genai";

/**
 * Service for Google Search Grounding using Gemini API
 * Allows research-backed context synthesis for current, obscure, or source-sensitive astrological queries.
 */

// Heuristic to detect whether web research is necessary
export function shouldPerformWebResearch(userQuery = "") {
  if (!userQuery || typeof userQuery !== "string") return false;
  const q = userQuery.toLowerCase().trim();

  // Exclude tiny greetings
  if (q.length < 6) return false;
  if (/^(namaste|pranam|hello|hi|har har mahadev|jai shree ram)$/i.test(q)) return false;

  // Trigger web research for Jyotish Shastra, Kundali diagnosis, Dasha, Gochar, Lal Kitab, Muhurta, or Shastra queries
  const researchTriggers = [
    /gochar/i, /transit/i, /2026/i, /2025/i, /muhurta/i, /panchang/i,
    /festival/i, /grahan/i, /eclipse/i, /shastra/i, /purana/i, /shloka/i,
    /verse/i, /citation/i, /research/i, /astronomy/i, /ephemeris/i,
    /aaj ka/i, /aaj ki/i, /choghadiya/i, /rahu kalam/i, /latest/i,
    /kundali/i, /kundli/i, /कुंडली/i, /ज्योतिष/i, /jyotish/i, /dasha/i, /महादशा/i,
    /अंतर्दशा/i, /साढ़े साती/i, /sade sati/i, /मांगलिक/i, /manglik/i, /कालसर्प/i,
    /लाल किताब/i, /lal kitab/i, /पाराशर/i, /जैमिनी/i, /परेशानी/i, /pareshani/i, /paresani/i
  ];

  return researchTriggers.some(pattern => pattern.test(q));
}

/**
 * Execute Google Search Grounding with Gemini API (non-blocking 4500ms timeout)
 */
export async function performGoogleSearchGrounding(query = "", customApiKey = "") {
  const apiKey = (customApiKey || process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) return null;

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } }
    });
    const modelsToTry = [
      process.env.GEMINI_MODEL,
      "gemini-3.8-flash",
      "gemini-3.1-flash-lite",
      "gemini-2.5-flash"
    ].filter(Boolean);

    for (const modelName of modelsToTry) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Grounding timeout (4500ms)")), 4500)
        );
        const response = await Promise.race([
          ai.models.generateContent({
            model: modelName,
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `Provide authoritative Vedic Jyotish Shastra (Brihat Parashara Hora Shastra, Phaladeepika, Jaimini Sutras, Lal Kitab, Shiva Purana, and current sidereal planetary Gochar transits) research for this astrological inquiry:\n\n"${query}"\n\nFocus on classical sutras, planetary causes of life obstacles (mental, career, financial, marriage, health), dasha timing rules, and authentic Vedic/Lal Kitab/Rudraksha remedies.`
                  }
                ]
              }
            ],
            config: {
              tools: [{ googleSearch: {} }],
              temperature: 0.2
            }
          }),
          timeoutPromise
        ]);

        const text = response?.text || "";
        const groundingMetadata = response?.candidates?.[0]?.groundingMetadata;
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
        // Try next model if search tool fails or times out
        console.warn(`[Grounding Service] Notice on ${modelName}:`, mErr?.message || mErr);
      }
    }
  } catch (err) {
    console.warn("[Grounding Service] Grounding error:", err?.message || err);
  }

  return null;
}
