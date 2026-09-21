import { GoogleGenAI } from "@google/genai";

async function testGeminiModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey });
  const models = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-flash-latest'];

  for (const m of models) {
    try {
      const res = await ai.models.generateContent({
        model: m,
        contents: [{ role: "user", parts: [{ text: "hii" }] }]
      });
      console.log(`SUCCESS [${m}]:`, res.text?.trim()?.slice(0, 80));
    } catch (err) {
      console.log(`FAIL [${m}]:`, err?.message);
    }
  }
}

testGeminiModels();
