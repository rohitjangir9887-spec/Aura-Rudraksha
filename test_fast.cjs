require('dotenv').config();
async function run() {
  const { generateProductDescription } = await import('./server/controllers/auraAiController.js');
  const req = {
    body: { name: '5 Mukhi Rudraksha Mala', category: 'Rudraksha Mala', price: 1599 },
    ip: '127.0.0.1'
  };
  const res = {
    status: (code) => { console.log('Status:', code); return res; },
    json: (data) => { console.log('JSON:', data); process.exit(0); return data; }
  };
  await generateProductDescription(req, res, () => {});
}
run();
