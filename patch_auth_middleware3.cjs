const fs = require('fs');

let code = fs.readFileSync('server/middleware/auth.js', 'utf8');

code = code.replace(
  /import \{ initializeApp, apps \} from 'firebase-admin\/app';/g,
  "import { initializeApp, getApps } from 'firebase-admin/app';"
);

code = code.replace(
  /if \(\!apps\.length\) \{/g,
  "if (!getApps().length) {"
);

fs.writeFileSync('server/middleware/auth.js', code);
