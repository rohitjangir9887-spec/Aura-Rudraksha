const fs = require('fs');

let content = fs.readFileSync('server/controllers/reviewController.js', 'utf8');

const conflictBlock = `<<<<<<< HEAD
        const response = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            temperature: 0.95,
            maxOutputTokens: 2500
          },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }]
        });
=======
Existing Review Insights (Use these to understand general sentiment, DO NOT copy phrasing):
\${insightsStr}
>>>>>>> 112cdaf (feat: improve evidence-grounded AI review studio)`;

const resolution = `Existing Review Insights (Use these to understand general sentiment, DO NOT copy phrasing):
\${insightsStr}`;

content = content.replace(conflictBlock, resolution);

// Also we need to fix the gemini model name further down if it was bumped to gemini-3.6-flash on main.
content = content.replace(/model: "gemini-2\.5-flash"/g, 'model: "gemini-3.6-flash"');

fs.writeFileSync('server/controllers/reviewController.js', content);
