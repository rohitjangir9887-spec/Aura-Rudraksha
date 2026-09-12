const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminAnalytics.jsx', 'utf8');

content = content.replace(
  `    const analytics = db.getAnalytics();`,
  `    // Analytics fetched from DB
    db.getAnalyticsFromDB = async () => {
      const { apiRequest } = require("../../lib/db.js");
      // Actually we can't do require here.
    };`
);
// wait, better to edit it directly using sed or node script
