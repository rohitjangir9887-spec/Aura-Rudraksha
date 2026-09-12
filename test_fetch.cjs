const { default: fetch } = require('node-fetch');
require('dotenv').config();

async function run() {
  const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.NVIDIA_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "nvidia/nemotron-3-super-120b-a12b",
      messages: [{role: "user", content: "Write a 1-sentence product description for 5 Mukhi Rudraksha"}],
      max_tokens: 50,
      reasoning_effort: "none"
    })
  });
  console.log(await res.text());
}
run();
