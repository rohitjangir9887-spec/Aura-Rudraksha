import fs from 'fs';

let content = fs.readFileSync('server/config/db.js', 'utf8');

// Strip quotes from URI just in case
content = content.replace(
  `const uri = (process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGODB_URL || "").trim();`,
  `const uri = (process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGODB_URL || "").trim().replace(/^['"]|['"]$/g, '');`
);
content = content.replace(
  `const uri = (process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGODB_URL || "").trim();`,
  `const uri = (process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGODB_URL || "").trim().replace(/^['"]|['"]$/g, '');`
);
content = content.replace(
  `const raw = (process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGODB_URL || "").trim();`,
  `const raw = (process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGODB_URL || "").trim().replace(/^['"]|['"]$/g, '');`
);
content = content.replace(
  `const rawUri = (process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGODB_URL || "").trim();`,
  `const rawUri = (process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGODB_URL || "").trim().replace(/^['"]|['"]$/g, '');`
);

fs.writeFileSync('server/config/db.js', content);
console.log("Patched db.js 2");
