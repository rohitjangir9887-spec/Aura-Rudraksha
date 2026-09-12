const fs = require('fs');
let code = fs.readFileSync('server/controllers/auraAiController.js', 'utf8');

code = code.replace(/res\.write\(\`data: \$\{JSON\.stringify\(\{ type: "start", conversationId \}\)\}\n\n\`\);/g, 'res.write(`data: ${JSON.stringify({ type: "start", conversationId })}\\n\\n`);');
code = code.replace(/res\.write\(\`data: \$\{JSON\.stringify\(\{ type: "chunk", delta: fallbackText \}\)\}\n\n\`\);/g, 'res.write(`data: ${JSON.stringify({ type: "chunk", delta: fallbackText })}\\n\\n`);');
code = code.replace(/res\.write\(\`data: \$\{JSON\.stringify\(\{ type: "final", data: \{ text: fallbackText, products: \[\], coupons: \[\], quickReplies \} \}\)\}\n\n\`\);/g, 'res.write(`data: ${JSON.stringify({ type: "final", data: { text: fallbackText, products: [], coupons: [], quickReplies } })}\\n\\n`);');
code = code.replace(/res\.write\(\`data: \$\{JSON\.stringify\(\{ type: "chunk", delta \}\)\}\n\n\`\);/g, 'res.write(`data: ${JSON.stringify({ type: "chunk", delta })}\\n\\n`);');

fs.writeFileSync('server/controllers/auraAiController.js', code);
