const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/AdminProducts.jsx', 'utf8');

if (!code.includes('authClient')) {
  code = code.replace(
    /import { emitToast } from "..\/..\/context\/ToastContext";/,
    `import { emitToast } from "../../context/ToastContext";\nimport { authClient } from "../../lib/authClient";`
  );
}

code = code.replace(
  /"Authorization": "Bearer " \+ localStorage.getItem\("aura_token"\)/,
  `"Authorization": "Bearer " + (await authClient.getToken())`
);

fs.writeFileSync('src/pages/admin/AdminProducts.jsx', code);
console.log("Patched token retrieval");
