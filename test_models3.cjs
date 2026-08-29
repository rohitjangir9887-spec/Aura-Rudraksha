const { default: fetch } = require('node-fetch');

const models = [
  "google/gemma-3-12b-it",
  "mistralai/mistral-large-2-instruct",
  "nvidia/nemotron-3-super-120b-a12b"
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
        }),
        timeout: 10000
      });
      console.log(`${m}: ${res.status}`);
      if (res.status !== 200) {
        console.log(`  -> ${await res.text()}`);
      }
    } catch (e) {
      console.error(`${m} error:`, e.message);
    }
  }
}
run();
