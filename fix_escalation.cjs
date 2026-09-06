const fs = require('fs');
const file = 'server/controllers/auraAiController.js';
let content = fs.readFileSync(file, 'utf8');

const interception = `
    if (isHumanEscalation) {
      const restingMessage = \`🙏 **Namaste! Main Aura AI hoon — Aura Rudraksha ka Vedic shopping aur spiritual guide.**\\nMain aapki sacred rudraksha choose karne mein help kar sakta hoon. Yadi aapko kisi vishesh sahayata ya manushya (human) support ki aavashyakta hai, to kripya hamare support se sampark karein:\\n\\n📞 **Phone/WhatsApp:** \${storeSettings.supportPhone}\\n✉️ **Email:** \${storeSettings.supportEmail}\\n\\nHum jald hi wapas aayenge. Om Namah Shivaya! 🕉️\`;
      return res.json({
        success: true,
        data: {
          text: restingMessage,
          products: [],
          coupons: [],
          quickReplies: [],
          requiresHuman: true,
          conversationId: targetConversationId,
          guestSessionId: effectiveGuestSessionId
        }
      });
    }

    let fullRawContent = "";
`;

content = content.replace('let fullRawContent = "";', interception);

fs.writeFileSync(file, content);
