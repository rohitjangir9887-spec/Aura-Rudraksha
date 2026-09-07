const fs = require('fs');
const file = 'server/controllers/reviewController.js';
let content = fs.readFileSync(file, 'utf8');

// Wait, let's actually implement the regenerate logic.
// The user says:
// If duplicate: reject and regenerate.
// If similar: regenerate with a different angle.
// So we should make a recursive call or a while loop to regenerate if duplicate/similar, but since we're generating a batch, it might be easier to just remove duplicates and let the API fetch more if needed, or since it's a mock test environment and we can't reliably call the API, just mark them and the UI will reject. Wait, I can make an async call to NIM inside the loop.

const exactMatch = `      // If duplicate or similar, it means the batch contains duplicates.
      // We should ideally call the API again (regenerate), but that's async inside a loop.
      // For now, if we have a duplicate/similar we will just mark it as such and UI will reject, OR we can try to re-prompt the AI in reality.
      // The instructions say "If duplicate: reject and regenerate. If similar: regenerate with a different angle."
      // Since we generated them in a batch, if one is a duplicate, we can either skip it or regenerate it.
      // We are instructed NOT to fabricate fake customer reviews, so we CANNOT use buildDiverseFallbackDrafts.
      // To satisfy "reject and regenerate", we can just let it stay marked as duplicate and the user can request another batch, or we fetch a new one from AI here.
      // Given it's a batch, we will just flag it, and if they are all duplicates, we return error.
      // Wait, let's just make an API call if it's a duplicate.
      if (finalSimResult.similarityStatus === "Duplicate" || finalSimResult.similarityStatus === "Similar") {
          // In a real scenario we might re-call NIM. For simplicity, we just mark it as duplicate so the UI knows it's a duplicate and won't use it,
          // because we've removed the fallback data generation as per user request.
          // We will preserve the status so the UI knows.
      }`;

const regenerateCode = `
      if (finalSimResult.similarityStatus === "Duplicate" || finalSimResult.similarityStatus === "Similar") {
        if (nvidiaApiKey) {
          try {
             let anglePrompt = finalSimResult.similarityStatus === "Similar" ? "Use a completely different experience angle and sentence structure." : "Regenerate entirely.";
             const nimRes = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
               method: "POST",
               headers: {
                 "Content-Type": "application/json",
                 "Authorization": \`Bearer \${nvidiaApiKey}\`,
                 "Accept": "application/json"
               },
               body: JSON.stringify({
                 model: "nvidia/nemotron-3-super-120b-a12b",
                 messages: [
                   { role: "system", content: "You are an authentic Indian customer review generator for Aura Rudraksha.\\nCRITICAL POLICY:\\nAI-generated text MUST be clearly marked. EVERY generated review MUST start with exactly: 'AI DRAFT — HUMAN REVIEW REQUIRED'. Do not silence this.\\nReturn ONLY a valid JSON object with keys: name, city, title, text, rating, language." },
                   { role: "user", content: \`Generate 1 unique customer review for Product: "\${resolvedProductName}".\\nRating Mode: "\${effectiveRatingMode}".\\nLanguage: "\${effectiveLanguage}".\\n\${anglePrompt}\\nOutput pure JSON object only.\` }
                 ],
                 temperature: 0.95,
                 max_tokens: 500
               })
             });
             if (nimRes.ok) {
               const nimData = await nimRes.json();
               let cleaned = (nimData.choices?.[0]?.message?.content || "").replace(/^\`\`\`json\\s*/i, "").replace(/^\`\`\`\\s*/i, "").replace(/\\s*\`\`\`$/i, "").trim();
               const parsedSingle = JSON.parse(cleaned);
               if (parsedSingle && parsedSingle.text) {
                 finalDraft.text = parsedSingle.text;
                 if (!finalDraft.text.startsWith("AI DRAFT — HUMAN REVIEW REQUIRED")) {
                   finalDraft.text = \`AI DRAFT — HUMAN REVIEW REQUIRED - \${finalDraft.text}\`;
                 }
                 finalDraft.title = parsedSingle.title || finalDraft.title;
                 finalDraft.name = parsedSingle.name || finalDraft.name;
                 usedBatchNames.add(finalDraft.name);
                 finalSimResult = evaluateDraftSimilarity(finalDraft.text, runningBatchCorpus, { duplicateThreshold: 70, duplicateSemanticThreshold: 80, similarThreshold: 35, similarSemanticThreshold: 50 });
               }
             }
          } catch(e) {}
        }
      }
`;

content = content.replace(exactMatch, regenerateCode);
fs.writeFileSync(file, content);
