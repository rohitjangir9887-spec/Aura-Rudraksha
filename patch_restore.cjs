const fs = require('fs');
let content = fs.readFileSync('server/controllers/auraAiController.js', 'utf-8');

const replacement = `export async function generateProductDescription(req, res, next) {
  try {
    const { name, category, language, details } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Product name is required" });

    const targetLanguage = language || "English";
    const cleanName = name.trim();

    // Helper: Infer category from title
    const inferCategoryFromTitle = (title) => {
      const lower = title.toLowerCase();
      if (lower.includes("mala") || lower.includes("rosary") || lower.includes("108")) return "Malas";
      if (lower.includes("bracelet") || lower.includes("kada") || lower.includes("wrist")) return "Bracelets";
      if (lower.includes("gauri shankar") || lower.includes("gaurishankar")) return "Gauri Shankar";
      if (lower.includes("puja") || lower.includes("pooja") || lower.includes("samagri") || lower.includes("havan") || lower.includes("incense") || lower.includes("dhoop")) return "Puja Samagri";
      if (lower.includes("crystal") || lower.includes("pyramid") || lower.includes("quartz") || lower.includes("stone") || lower.includes("sphatik") || lower.includes("yantra")) return "Crystals";
      return "Rudraksha";
    };

    const suggestedCategory = category && category !== "Rudraksha" ? category : inferCategoryFromTitle(cleanName);

    // AI Model Integration (nemotron-3-super-120b-a12b)
    const nvidiaApiKey = process.env.NVIDIA_API_KEY ? process.env.NVIDIA_API_KEY.trim() : "";
    if (nvidiaApiKey) {
      try {
        const nimRes = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": \`Bearer \${nvidiaApiKey}\`,
            "Accept": "application/json"
          },
          body: JSON.stringify({
            model: "nemotron-3-super-120b-a12b",
            messages: [{
              role: "system",
              content: "You are an expert sales representative and spiritual guide combined. Think independently and creatively to guide the user towards making a purchase. Write persuasive product descriptions."
            }, {
              role: "user",
              content: \`Generate a professional, highly readable product description in clean HTML for \${cleanName} (\${suggestedCategory}) in \${targetLanguage}.
Use the following structured headings exactly (enclosed in h2):
<h2>✨ About the Product</h2>
<h2>📿 Product Highlights</h2>
<h2>🌿 Spiritual Significance</h2>
<h2>🙏 Suitable For</h2>
<h2>🕉️ How to Wear & Care</h2>

Output ONLY the pure HTML body itself, no markdown code fences.\`
            }],
            temperature: 0.7,
            max_tokens: 1000
          })
        });

        if (nimRes.ok) {
          const nimData = await nimRes.json();
          let cleanHtml = (nimData.choices?.[0]?.message?.content || "").replace(/^\`\`\`(?:html)?\s*/i, "").replace(/\s*\`\`\`$/i, "").trim();
          if (cleanHtml && cleanHtml.includes("<h2>")) {
            return res.json({ 
              success: true, 
              description: cleanHtml,
              category: suggestedCategory,
              highlight: "100% Consecrated • Authentic Nepal Bead",
              badge: "Best Seller",
              tags: [suggestedCategory, "Authentic", "Consecrated"]
            });
          }
        }
      } catch (nimErr) {
        console.warn("NVIDIA NIM description notice:", nimErr?.message || nimErr);
      }
    }

    // No Mock Fallback! Throw error if AI fails to enforce AI-only usage
    throw new Error("AI Description Generation Failed - Mock Data is Disabled.");

  } catch (error) {
    console.error("Aura AI Description Generation Error:", error);
    return res.status(500).json({ success: false, message: "AI description could not be generated. Please check AI API configuration." });
  }
}`;

content = content.replace(/export async function generateProductDescription[\s\S]*?^}$/m, replacement);
fs.writeFileSync('server/controllers/auraAiController.js', content);
