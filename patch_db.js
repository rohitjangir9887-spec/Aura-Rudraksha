import fs from 'fs';

let content = fs.readFileSync('server/config/db.js', 'utf8');

content = content.replace(
  `const uri = (process.env.MONGODB_URI || "").trim();`,
  `const uri = (process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGODB_URL || "").trim();`
);

content = content.replace(
  `const uri = (process.env.MONGODB_URI || "").trim();`, // In getMaskedMongoUri
  `const uri = (process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGODB_URL || "").trim();`
);

content = content.replace(
  `const raw = (process.env.MONGODB_URI || "").trim();`, // In connectDB
  `const raw = (process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGODB_URL || "").trim();`
);

content = content.replace(
  `const rawUri = (process.env.MONGODB_URI || "").trim();`, // In getDbDiagnostics
  `const rawUri = (process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGODB_URL || "").trim();`
);

fs.writeFileSync('server/config/db.js', content);
console.log("Patched db.js");
