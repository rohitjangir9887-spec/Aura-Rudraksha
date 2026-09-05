async function run() {
  const fs = require('fs');
  // Temporary fix the file to allow import in Node.js
  let content = fs.readFileSync('src/lib/authClient.js', 'utf8');
  if (!content.includes('with { type: "json" }')) {
    content = content.replace(/import firebaseAppletConfig from "..\/..\/firebase-applet-config.json";/g, 'import firebaseAppletConfig from "../../firebase-applet-config.json" with { type: "json" };');
    content = content.replace(/!!import\.meta\.env\.DEV/g, 'false');
    fs.writeFileSync('src/lib/authClient.js', content);
  }
  let contentDb = fs.readFileSync('src/lib/db.js', 'utf8');
  if (contentDb.includes('import.meta.env.VITE_API_BASE_URL')) {
    contentDb = contentDb.replace(/import\.meta\.env\.VITE_API_BASE_URL/g, '""');
    fs.writeFileSync('src/lib/db.js', contentDb);
  }
}
run();
