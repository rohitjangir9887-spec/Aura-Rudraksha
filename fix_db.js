const fs = require('fs');
const file = 'src/lib/db.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/emitStoreUpdate\([^,]+:fetched.*?\);/g, '// emitStoreUpdate (removed to prevent infinite fetch loop)');

fs.writeFileSync(file, content);
console.log("Fixed db.js");
