import fs from 'fs';

let content = fs.readFileSync('server/services/nemotronSeoEngine.js', 'utf8');

// The new SDK uses client.models.generateContent instead of client.getGenerativeModel
if (content.includes('client.getGenerativeModel')) {
  // We already checked and it seems the implementation is using geminiClient.models.generateContent
  console.log("No need to patch getGenerativeModel");
}

console.log("Done");
