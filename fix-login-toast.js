import fs from 'fs';
let code = fs.readFileSync('src/pages/Login.jsx', 'utf8');
code = code.replace(/emitToast\("success", "([^"]+)"\)/g, 'emitToast("$1", "success")');
fs.writeFileSync('src/pages/Login.jsx', code);
