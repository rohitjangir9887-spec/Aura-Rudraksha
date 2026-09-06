const fs = require('fs');
let content = fs.readFileSync('server/services/payuService.js', 'utf-8');

content = content.replace(/catch \(_\) \{(\s*)return \{/g, 'catch (err) {$1console.warn("PayU JSON Parse Error:", err.message);$1return {');
content = content.replace(/catch \(_\) \{(\s*)throw new Error/g, 'catch (err) {$1console.warn("PayU JSON Parse Error:", err.message);$1throw new Error');

fs.writeFileSync('server/services/payuService.js', content);
