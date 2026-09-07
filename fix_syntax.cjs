const fs = require('fs');
const file = 'src/lib/db.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/\\n\\nif \\(typeof window/g, '\n\nif (typeof window');
content = content.replace(/replace\(\/\\\\\/\\$\/, ""\);\\n/g, 'replace(/\\/\\$/, "");\n');

fs.writeFileSync(file, content);
console.log('Fixed \\n syntax error');
