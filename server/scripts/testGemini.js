import { GoogleGenAI } from "@google/genai";

async function testGeminiModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey });
  const models = ['gemini-4-hydrogen', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'];

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
