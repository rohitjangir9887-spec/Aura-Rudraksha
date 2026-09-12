const fs = require('fs');
let content = fs.readFileSync('server/controllers/paymentController.js', 'utf-8');

content = content.replace(/\} catch \(_\) \{\}/g, '} catch (err) { console.warn("PaymentTransaction update warning:", err.message); }');

fs.writeFileSync('server/controllers/paymentController.js', content);
