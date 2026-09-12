async function run() {
  const systemPrompt = "You are a premium human e-commerce copywriter for Aura Rudraksha. You must output a JSON object containing the product description parts. Do NOT output any reasoning, instructions, markdown code blocks, or thoughts.";

  const userPrompt = `Write a professional, trustworthy, and elegant product description for the following product:

Title: 7 Mukhi Rudraksha
Category: Spiritual
Language: English

INSTRUCTIONS:
1. Brand Tone: Premium, Spiritual, Trustworthy, Elegant, Indian heritage inspired, Simple, Natural, Professional.
2. Provide a JSON response EXACTLY matching this schema, with no additional text:
{
  "title": "7 Mukhi Rudraksha",
  "intro": "Short premium introduction paragraph.",
  "highlights": ["Highlight 1", "Highlight 2", "Highlight 3", "Highlight 4"],
  "about": "2-3 natural paragraphs explaining the product.",
  "suitableFor": "Short natural section explaining who may choose the product.",
  "closing": "One short premium closing sentence."
}
3. Keep the total description between 120 and 220 words.
4. No generic AI wording, overly dramatic language, keyword stuffing, fake claims, emojis, or unfinished sentences. Do not include price/MRP unless essential.
5. Do NOT invent medical claims, origins, or certifications unless they are standard for this type of product. Use conservative terms like "traditionally associated with".
6. The title MUST be exact.
7. Return ONLY valid JSON. No backticks, no "Here is your JSON".`;

  const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.NVIDIA_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "nvidia/nemotron-3-super-120b-a12b",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.4,
      max_tokens: 800
    })
  });
  
  let aiContent = (await res.json()).choices?.[0]?.message?.content || "";
  console.log("Raw Response:");
  console.log(aiContent);
  const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      aiContent = jsonMatch[0];
    }
  console.log("Extracted JSON:", aiContent);
  try {
      let parsed = JSON.parse(aiContent);
      console.log(parsed.title);
  } catch (e) {
      console.error(e.message);
  }
}
run();
