const fs = require('fs');
const file = 'src/lib/db.js';
let content = fs.readFileSync(file, 'utf8');

// Just remove "\\n" if it literally exists in the code
content = content.replace(/\\n/g, '\n');

fs.writeFileSync(file, content);
console.log('Fixed syntax error');
