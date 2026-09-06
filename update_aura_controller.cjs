const fs = require('fs');
const file = 'server/controllers/auraAiController.js';
let content = fs.readFileSync(file, 'utf8');

const settingsCheck = `
    let settings = inMemoryStore.aiSettings || { enabled: true };
    if (isDbConnected()) {
      const existing = await AuraAISetting.findOne({ id: "AURA_AI_SETTINGS" }).lean();
      if (existing) settings = existing;
    }

    if (settings.enabled === false) {
      const restingMessage = "🙏 **Namaste! Main Aura AI hoon — Aura Rudraksha ka Vedic shopping aur spiritual guide.**\\nMain aapki sacred rudraksha choose karne mein help karne ke liye abhi rest kar rahi hoon. Kripya hamare support se sampark karein:\\n\\n📞 **Phone/WhatsApp:** +91 98765 00001\\n✉️ **Email:** care@aurarudraksha-test.com\\n\\nHum jald hi wapas aayenge. Om Namah Shivaya! 🕉️";
      return res.json({
        success: true,
        data: {
          text: restingMessage,
          products: [],
          coupons: [],
          quickReplies: [],
          requiresHuman: false,
          conversationId: targetConversationId,
          guestSessionId: effectiveGuestSessionId
        }
      });
    }

    const isHumanEscalation = /(human support|customer care|talk to human|call someone|contact details|phone number)/i.test(message);
`;

content = content.replace('    if (userIsAuthenticated) {', settingsCheck + '\n    if (userIsAuthenticated) {');

fs.writeFileSync(file, content);
