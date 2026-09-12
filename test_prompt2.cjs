async function run() {
  const systemPrompt = "You are a JSON generator. You output ONLY valid JSON objects and absolutely nothing else. You do not explain, you do not think, you do not output conversational text.";

  const userPrompt = `Generate a product description for:
Title: 7 Mukhi Rudraksha
Category: Spiritual

Return EXACTLY this JSON schema:
{
  "title": "7 Mukhi Rudraksha",
  "intro": "...",
  "highlights": ["...", "..."],
  "about": "...",
  "suitableFor": "...",
  "closing": "..."
}`;

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
      temperature: 0.1,
      max_tokens: 800
    })
  });
  
  const data = await res.json();
  console.log("Raw Response:");
  console.log(data.choices?.[0]?.message?.content);
}
run();
