const fs = require('fs');
const file = 'server/controllers/auraAiController.js';
let content = fs.readFileSync(file, 'utf8');

const storeSettingsCode = `
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

// Remove original storeSettingsCode
content = content.replace(storeSettingsCode, '');

// Insert it before if (settings.enabled === false)
content = content.replace('if (settings.enabled === false) {', storeSettingsCode + '\n    if (settings.enabled === false) {');

fs.writeFileSync(file, content);
