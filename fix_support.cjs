const fs = require('fs');

// Fix buildAuthenticVedicResponse signature and usage
let vedic = fs.readFileSync('server/services/vedicKnowledgeService.js', 'utf8');
vedic = vedic.replace(
  'export function buildAuthenticVedicResponse({ message, userIntent, products = [], coupons = [], userIsAuthenticated = false, verifiedName = "", customerOrders = [] }) {',
  'export function buildAuthenticVedicResponse({ message, userIntent, products = [], coupons = [], userIsAuthenticated = false, verifiedName = "", customerOrders = [], supportPhone = "+91 98765 00001", supportEmail = "care@aurarudraksha-test.com" }) {'
);
vedic = vedic.replace('+91 98765 00001', '${supportPhone}');
vedic = vedic.replace('care@aurarudraksha-test.com', '${supportEmail}');
fs.writeFileSync('server/services/vedicKnowledgeService.js', vedic);

let aura = fs.readFileSync('server/controllers/auraAiController.js', 'utf8');

// Inject storeSettings lookup
const storeSettingsLookup = `
    let storeSettings = { supportPhone: "+91 98765 00001", supportEmail: "care@aurarudraksha-test.com" };
    if (isDbConnected()) {
      try {
        const mongoose = (await import("mongoose")).default;
        const SettingModel = mongoose.model("Setting");
        const ss = await SettingModel.findOne({ id: "STORE_SETTINGS" }).lean();
        if (ss) {
          if (ss.supportPhone) storeSettings.supportPhone = ss.supportPhone;
          if (ss.supportEmail) storeSettings.supportEmail = ss.supportEmail;
        }
      } catch(e) {}
    }
`;

aura = aura.replace('let existingConv = null;', storeSettingsLookup + '\n    let existingConv = null;');

// Pass to buildAuthenticVedicResponse
aura = aura.replace(
  'verifiedName,\n        customerOrders\n      });',
  'verifiedName,\n        customerOrders,\n        supportPhone: storeSettings.supportPhone,\n        supportEmail: storeSettings.supportEmail\n      });'
);

// Fix resting message
aura = aura.replace(
  'const restingMessage = "🙏 **Namaste! Main Aura AI hoon — Aura Rudraksha ka Vedic shopping aur spiritual guide.**\\nMain aapki sacred rudraksha choose karne mein help karne ke liye abhi rest kar rahi hoon. Kripya hamare support se sampark karein:\\n\\n📞 **Phone/WhatsApp:** +91 98765 00001\\n✉️ **Email:** care@aurarudraksha-test.com\\n\\nHum jald hi wapas aayenge. Om Namah Shivaya! 🕉️";',
  'const restingMessage = `🙏 **Namaste! Main Aura AI hoon — Aura Rudraksha ka Vedic shopping aur spiritual guide.**\\nMain aapki sacred rudraksha choose karne mein help karne ke liye abhi rest kar rahi hoon. Kripya hamare support se sampark karein:\\n\\n📞 **Phone/WhatsApp:** ${storeSettings.supportPhone}\\n✉️ **Email:** ${storeSettings.supportEmail}\\n\\nHum jald hi wapas aayenge. Om Namah Shivaya! 🕉️`;'
);

fs.writeFileSync('server/controllers/auraAiController.js', aura);
