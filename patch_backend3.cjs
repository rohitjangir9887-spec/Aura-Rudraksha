const fs = require('fs');
let code = fs.readFileSync('server/controllers/auraAiController.js', 'utf8');

const newFn = `export async function generateProductDescription(req, res, next) {
  try {
    const { name, category, price, mrp, stock } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Product name is required" });

    const nvidiaApiKey = process.env.NVIDIA_API_KEY ? process.env.NVIDIA_API_KEY.trim() : "";
    if (!nvidiaApiKey) {
      return res.status(500).json({ success: false, message: "NVIDIA API Key is missing." });
    }

    const priceText = price ? ('₹' + price) : 'Not specified';
    const mrpText = mrp ? ('₹' + mrp) : 'Not specified';

    const prompt = "You are a premium human e-commerce copywriter for Aura Rudraksha. \\n" +
"Write a professional, trustworthy, and elegant product description for the following product:\\n\\n" +
"Title: " + name + "\\n" +
"Category: " + (category || 'Spiritual') + "\\n" +
"Price: " + priceText + "\\n" +
"MRP: " + mrpText + "\\n\\n" +
"INSTRUCTIONS:\\n" +
"1. Brand Tone: Premium, Spiritual, Trustworthy, Elegant, Indian heritage inspired, Simple, Natural, Professional.\\n" +
"2. Structure: \\n" +
"   - Opening paragraph (spiritual/traditional significance).\\n" +
"   - Product highlights (what it is, who it is for).\\n" +
"   - Suitable-for section or closing CTA.\\n" +
"3. Keep it between 120 and 220 words.\\n" +
"4. No generic AI wording, overly dramatic language, keyword stuffing, fake claims, emojis, Markdown garbage, or unfinished sentences. Do NOT output asterisks at the beginning.\\n" +
"5. Do NOT invent medical claims, origins, or certifications unless they are standard for this type of product.\\n" +
"6. The exact product name (\\"" + name + "\\") MUST be naturally highlighted within the description using safe Markdown bold: **" + name + "**. Do not highlight other random keywords.\\n" +
"7. Output MUST be clean text ONLY. Do NOT wrap in JSON. Do NOT include phrases like \\"Here is your description\\". Do NOT output markdown code blocks.\\n\\n" +
"Product Description:";

    const nimRes = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + nvidiaApiKey,
        "Accept": "application/json"
      },
      body: JSON.stringify({
        model: "nvidia/nemotron-3-super-120b-a12b",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 350,
        reasoning_effort: "none"
      })
    });

    if (!nimRes.ok) {
      const errBody = await nimRes.text();
      console.error("NIM API Error:", errBody);
      return res.status(500).json({ success: false, message: "AI description could not be generated. Please try again." });
    }

    const nimData = await nimRes.json();
    let description = nimData.choices?.[0]?.message?.content || "";
    
    // Clean up any potential markdown code blocks
    description = description.replace(/\`\`\`(markdown)?/g, '').trim();

    if (!description) {
      return res.status(500).json({ success: false, message: "AI description could not be generated. Please try again." });
    }

    return res.json({ success: true, description });
  } catch (error) {
    console.error("Aura AI Description Generation Error:", error);
    return res.status(500).json({ success: false, message: "AI description could not be generated. Please try again." });
  }
}
`;

code = code.replace(
  /export async function generateProductDescription[\s\S]*?^}/m,
  newFn
);

fs.writeFileSync('server/controllers/auraAiController.js', code);
console.log("Patched auraAiController.js for fetch safely");
