const fs = require('fs');
let content = fs.readFileSync('server/controllers/auraAiController.js', 'utf-8');

// Replace system prompt focus
content = content.replace(
  /HONESTY & SOURCE OF TRUTH:/,
  `SALES & CONVERSION FOCUS (INDEPENDENT THINKING):
- You are an expert sales representative and spiritual guide combined. Think independently and creatively to guide the user towards making a purchase (सेल्स बढ़ाने मे योगदान दें).
- Proactively suggest related products, explain the profound spiritual and material benefits of the items, and highlight active discounts/coupons to create urgency.
- Subtly encourage the user to add items to their cart and proceed to checkout, framing the purchase as a positive spiritual investment.
- If a user asks a general question, answer it beautifully but always tie it back to how our authentic Rudraksha beads can help them achieve their goals.

HONESTY & SOURCE OF TRUTH:`
);

// Replace ALL models
content = content.replace(/"gemini-2\.5-flash"/g, '"nemotron-3-super-120b-a12b"');
content = content.replace(/"meta\/llama-3\.3-70b-instruct"/g, '"nemotron-3-super-120b-a12b"');
content = content.replace(/"meta\/llama-3\.1-70b-instruct"/g, '"nemotron-3-super-120b-a12b"');
content = content.replace(/"nvidia\/llama-3\.1-nemotron-70b-instruct"/g, '"nemotron-3-super-120b-a12b"');

fs.writeFileSync('server/controllers/auraAiController.js', content);
