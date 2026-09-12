const fs = require('fs');
let content = fs.readFileSync('src/pages/Home.jsx', 'utf8');
content = content.replace(/<h2 style=\{\{ fontSize: '28px' \}\}>/g, '<h2>');
fs.writeFileSync('src/pages/Home.jsx', content);
