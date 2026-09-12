const { default: fetch } = require('node-fetch');

const models = [
  "nvidia/nemotron-3-super-120b-a12b",
  "meta/llama2-70b",
  "meta/llama-3.2-90b-vision-instruct",
  "meta/codellama-70b",
  "nvidia/llama-3.1-nemotron-51b-instruct",
  "nvidia/llama3-chatqa-1.5-70b",
  "mistralai/mistral-large-2-instruct",
  "mistralai/mixtral-8x22b-v0.1",
  "google/gemma-4-31b-it",
  "ibm/granite-3.0-8b-instruct"
];

async function run() {
  for (const m of models) {
    try {
      const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.NVIDIA_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: m,
          messages: [{role: "user", content: "hi"}],
          max_tokens: 10
        })
      });
      console.log(`${m}: ${res.status}`);
      if (res.status === 200) {
        // Success
      } else {
        const text = await res.text();
        console.log(`  -> ${text}`);
      }
    } catch (e) {
      console.error(`${m} error:`, e.message);
    }
  }
}
run();
