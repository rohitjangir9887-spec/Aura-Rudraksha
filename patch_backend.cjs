const fs = require('fs');
let code = fs.readFileSync('server/controllers/auraAiController.js', 'utf8');

const newFn = `export async function generateProductDescription(req, res, next) {
  try {
    const { name, category, price, mrp, stock } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Product name is required" });

    const aiClient = getNvidiaClient();
    if (!aiClient) {
      return res.status(500).json({ success: false, message: "NVIDIA AI client could not be initialized." });
    }

    const priceText = price ? \\\`₹\\\${price}\\\` : 'Not specified';
    const mrpText = mrp ? \\\`₹\\\${mrp}\\\` : 'Not specified';

    const prompt = \\\`You are a premium human e-commerce copywriter for Aura Rudraksha. 
Write a professional, trustworthy, and elegant product description for the following product:

Title: \\\${name}
Category: \\\${category || 'Spiritual'}
Price: \\\${priceText}
MRP: \\\${mrpText}

INSTRUCTIONS:
1. Brand Tone: Premium, Spiritual, Trustworthy, Elegant, Indian heritage inspired, Simple, Natural, Professional.
2. Structure: 
   - Opening paragraph (spiritual/traditional significance).
   - Product highlights (what it is, who it is for).
   - Suitable-for section or closing CTA.
3. Keep it between 120 and 220 words.
4. No generic AI wording, overly dramatic language, keyword stuffing, fake claims, emojis, Markdown garbage, or unfinished sentences. Do NOT output asterisks at the beginning.
5. Do NOT invent medical claims, origins, or certifications unless they are standard for this type of product.
6. The exact product name ("\\\${name}") MUST be naturally highlighted within the description using safe Markdown bold: **\\\${name}**. Do not highlight other random keywords.
7. Output MUST be clean text ONLY. Do NOT wrap in JSON. Do NOT include phrases like "Here is your description". Do NOT output markdown code blocks.

Product Description:\\\`;

    const completion = await aiClient.chat.completions.create({
      model: "nvidia/llama-3.1-nemotron-70b-instruct",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 350
    });

    let description = completion.choices[0]?.message?.content || "";
    // Clean up any potential markdown code blocks
    description = description.replace(/\\\`\\\`\\\`(markdown)?/g, '').trim();

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
console.log("Patched auraAiController.js");
