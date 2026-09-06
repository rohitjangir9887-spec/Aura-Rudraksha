const fs = require('fs');
const file = 'server/services/vedicKnowledgeService.js';
let content = fs.readFileSync(file, 'utf8');

const supportBlock = `
  // 6.5 Support / Human
  if (msgLower.includes("human") || msgLower.includes("support") || msgLower.includes("contact") || msgLower.includes("helpdesk") || msgLower.includes("customer care")) {
    let resp = "🙏 **Namaste! Main Aura AI hoon — Aura Rudraksha ka Vedic shopping aur spiritual guide.**\\n\\n";
    resp += "Main aapki sacred rudraksha choose karne mein help kar sakta hoon. Yadi aapko kisi vishesh sahayata ya manushya (human) support ki aavashyakta hai, to kripya hamare support se sampark karein:\\n\\n";
    resp += "📞 **Phone/WhatsApp:** +91 98765 00001\\n";
    resp += "✉️ **Email:** care@aurarudraksha-test.com\\n\\n";
    resp += "Hum jald hi wapas aayenge. Om Namah Shivaya! 🕉️";
    return resp;
  }

  // 7. General Greeting / Guidance
`;

content = content.replace('// 7. General Greeting / Guidance', supportBlock);
fs.writeFileSync(file, content);
