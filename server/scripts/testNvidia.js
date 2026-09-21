import OpenAI from "openai";

async function testNvidiaModels() {
  const apiKey = process.env.NVIDIA_API_KEY;
  console.log("NVIDIA_API_KEY present:", Boolean(apiKey));
  if (!apiKey) {
    console.log("No NVIDIA_API_KEY in process.env");
    return;
  }

  const client = new OpenAI({
    apiKey,
    baseURL: "https://integrate.api.nvidia.com/v1"
  });

  const testModels = [
    "nvidia/nemotron-3-super-120b-a12b",
    "nvidia/llama-3.1-nemotron-70b-instruct",
    "meta/llama-3.3-70b-instruct",
    "meta/llama-3.1-70b-instruct",
    "deepseek-ai/deepseek-r1"
  ];

  for (const m of testModels) {
    console.log(`Testing model: ${m}`);
    try {
      const res = await client.chat.completions.create({
        model: m,
        messages: [{ role: "user", content: "hii" }],
        max_tokens: 50
      });
      console.log(`SUCCESS [${m}]:`, res.choices?.[0]?.message?.content);
    } catch (err) {
      console.log(`FAIL [${m}]:`, err?.status, err?.message);
    }
  }
}

testNvidiaModels();
