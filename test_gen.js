import { generateProductDescription } from './server/controllers/auraAiController.js';

const req = {
  body: { name: "5 Mukhi Rudraksha", category: "Rudraksha", price: 899 },
  ip: "127.0.0.1"
};

const res = {
  status: (code) => { console.log("Status:", code); return res; },
  json: (data) => { console.log("JSON:", data); return data; }
};

async function run() {
  await generateProductDescription(req, res, () => {});
}
run();
