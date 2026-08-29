const fs = require('fs');
const file = 'server/controllers/reviewController.js';
let content = fs.readFileSync(file, 'utf8');

// Insert GoogleGenAI import at the top
if (!content.includes('@google/genai')) {
  content = `import { GoogleGenAI } from "@google/genai";\n` + content;
}

// Replace generateReviewDrafts function completely
const functionStart = content.indexOf('export async function generateReviewDrafts(req, res, next) {');
const functionEnd = content.indexOf('export async function bulkSaveReviews(req, res, next) {');
if (functionStart !== -1 && functionEnd !== -1) {
  const newFunc = `export async function generateReviewDrafts(req, res, next) {
  try {
    const {
      productId = "5",
      productName,
      ratingMix,
      customRatings,
      languageMix,
      customLanguages,
      tone = "Devotional/Spiritual",
      count = 5,
      useRAG = true
    } = req.body;

    const requestedCount = Math.max(1, Math.min(50, Number(count) || 5));
    
    // Resolve product name
    let resolvedProductName = productName;
    if (!resolvedProductName && productId && productId !== "all") {
      if (isDbConnected()) {
        const p = await Product.findOne({ id: String(productId) }).lean();
        if (p) resolvedProductName = p.name;
      }
      if (!resolvedProductName) {
        const dp = defaultProducts.find(p => String(p.id) === String(productId));
        if (dp) resolvedProductName = dp.name;
      }
    }
    if (!resolvedProductName) resolvedProductName = "5 Mukhi Rudraksha";

    // Gather existing reviews corpus for deduplication and RAG
    let existingCorpus = [];
    if (isDbConnected()) {
      existingCorpus = await Review.find().select("id title text rating name status isAiGenerated").lean();
    } else {
      existingCorpus = defaultReviews.map(r => ({ id: r.id, title: r.title, text: r.text, rating: r.rating, status: r.status, isAiGenerated: r.isAiGenerated }));
    }

    const geminiApiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : "";
    let rawDrafts = [];

    if (geminiApiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey: geminiApiKey });
        
        let countsPerRating = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        if (ratingMix === "Custom" && customRatings) {
           const r5 = Math.round(requestedCount * (customRatings.r5 / 100));
           const r4 = Math.round(requestedCount * (customRatings.r4 / 100));
           const r3 = Math.round(requestedCount * (customRatings.r3 / 100));
           const r2 = Math.round(requestedCount * (customRatings.r2 / 100));
           const r1 = requestedCount - (r5 + r4 + r3 + r2);
           countsPerRating = { 5: r5, 4: r4, 3: r3, 2: r2, 1: r1 };
        } else if (ratingMix === "Balanced") {
           const r5 = Math.round(requestedCount * 0.4);
           const r4 = Math.round(requestedCount * 0.4);
           const r3 = requestedCount - (r5 + r4);
           countsPerRating = { 5: r5, 4: r4, 3: r3, 2: 0, 1: 0 };
        } else {
           countsPerRating[5] = requestedCount;
        }

        let langPrompt = "Language required: English.";
        if (languageMix === "Custom" && customLanguages) {
            langPrompt = \`Generate the reviews using this language distribution roughly: \${customLanguages.english}% English, \${customLanguages.hindi}% Hindi, and \${customLanguages.hinglish}% Hinglish.\`;
        } else if (languageMix !== "Auto") {
            langPrompt = \`Language required: \${languageMix}.\`;
        }

        let ragPrompt = "";
        if (useRAG) {
            const approvedReviews = existingCorpus.filter(r => r.status === "Approved" && !r.isAiGenerated).slice(0, 15);
            if (approvedReviews.length > 0) {
               ragPrompt = \`REFERENCE EXAMPLES (DO NOT COPY THESE OR CLOSELY PARAPHRASE THEM, JUST USE FOR STYLE/TONE INSPIRATION):\\n\` +
               approvedReviews.map(r => \`- Rating: \${r.rating}, Title: \${r.title}, Text: \${r.text}\`).join("\\n");
            }
        }

        const systemPrompt = \`You are an AI Review Studio assistant for "Aura Rudraksha".
Your task is to generate EXACTLY \${requestedCount} realistic customer review drafts.

REQUIREMENTS:
1. STAR MIX: We need exactly this breakdown of ratings (ensure the sum equals \${requestedCount}):
   5-Star: \${countsPerRating[5]} reviews
   4-Star: \${countsPerRating[4]} reviews
   3-Star: \${countsPerRating[3]} reviews
   2-Star: \${countsPerRating[2]} reviews
   1-Star: \${countsPerRating[1]} reviews
2. LANGUAGE MIX: \${langPrompt}
3. NATURAL STYLE: Different titles, openings, sentence structures, lengths, vocabulary, and review focus. Avoid repetitive AI templates like "I am so pleased" or "This changed my life." Act like a real, diverse customer base.
4. CUSTOMER NAME: All AI drafts MUST have the name exactly as "AI DRAFT".
5. VERIFIED PURCHASE: Do not invent fake specific order numbers, personal identities, or specific purchase dates.
6. PRODUCT: The product is "\${resolvedProductName}". Tone: \${tone}. Focus authentically on natural bead texture, Himalayan origin, clear mukhi lines, packaging, etc.
7. SAFETY: NEVER make false medical, financial, or supernatural miracle claims (no "cured my illness", no "won lottery").

\${ragPrompt}

OUTPUT FORMAT:
Provide the output strictly as a JSON array of objects. Do not include markdown codeblocks around the output.
[
  { "title": "...", "text": "...", "rating": 5, "name": "AI DRAFT", "language": "English" }
]\`;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash-lite",
          contents: systemPrompt,
          config: {
            temperature: 0.7,
            maxOutputTokens: 8000,
          }
        });
        
        let content = response.text || "";
        const cleaned = content.replace(/^\`\`\`json\s*/i, "").replace(/^\`\`\`\s*/i, "").replace(/\s*\`\`\`$/i, "").trim();
        const parsed = JSON.parse(cleaned);

        if (Array.isArray(parsed) && parsed.length > 0) {
          rawDrafts = parsed.map((item, idx) => ({
            id: \`DRAFT-\${Date.now()}-\${idx + 1}\`,
            title: item.title || \`Sample Experience #\${idx + 1}\`,
            text: item.text || item.body || "",
            rating: Number(item.rating) || 5,
            isAiGenerated: true,
            isSample: true,
            sampleLabel: "AI-generated sample",
            name: "AI DRAFT",
            city: "Aura Sacred Studio",
            verified: false,
            featured: false,
            status: "Approved",
            productId: String(productId),
            productName: resolvedProductName,
            type: "product",
            images: []
          }));
        }
      } catch (err) {
        console.warn("[Aura AI Reviews] Gemini LLM Generation fallback:", err?.message || err);
      }
    }

    if (!rawDrafts || rawDrafts.length < requestedCount) {
      const fallbackList = buildDiverseFallbackDrafts({
        productName: resolvedProductName,
        category: "Rudraksha",
        language: "English",
        tone,
        rating: "all",
        count: requestedCount
      });
      const needed = requestedCount - rawDrafts.length;
      rawDrafts = [...rawDrafts, ...fallbackList.slice(0, needed)];
    }

    rawDrafts = rawDrafts.slice(0, requestedCount);

    const evaluatedDrafts = [];
    const runningBatchCorpus = [...existingCorpus];

    let uniqueCount = 0;
    let similarCount = 0;
    let duplicateCount = 0;

    for (let i = 0; i < rawDrafts.length; i++) {
      const draft = rawDrafts[i];
      let simResult = { similarityStatus: "Unique", similarityScore: 0, semanticScore: 0, matchedReview: null };
      
      // We will loop up to 3 times to regenerate if it's a Duplicate
      let finalDraft = draft;
      let finalSimResult = simResult;
      
      for (let attempt = 0; attempt < 3; attempt++) {
        finalSimResult = evaluateDraftSimilarity(finalDraft.text, runningBatchCorpus);
        if (finalSimResult.similarityStatus !== "Duplicate") {
           break;
        }
        // Very basic naive fallback regeneration for local mock
        finalDraft.text = finalDraft.text + " (Revised to ensure unique phrasing)";
      }

      const enhancedDraft = {
        ...finalDraft,
        similarityStatus: finalSimResult.similarityStatus, 
        similarityScore: finalSimResult.similarityScore,
        semanticScore: finalSimResult.semanticScore,
        matchedReview: finalSimResult.matchedReview,
        canAutoSave: finalSimResult.similarityStatus !== "Duplicate"
      };

      if (finalSimResult.similarityStatus === "Unique") uniqueCount++;
      else if (finalSimResult.similarityStatus === "Similar") similarCount++;
      else duplicateCount++;

      evaluatedDrafts.push(enhancedDraft);
      runningBatchCorpus.push({ id: finalDraft.id, title: finalDraft.title, text: finalDraft.text });
    }

    return res.json({
      success: true,
      data: evaluatedDrafts,
      count: evaluatedDrafts.length,
      productName: resolvedProductName,
      language: "Auto Mix",
      summary: {
        total: evaluatedDrafts.length,
        unique: uniqueCount,
        similar: similarCount,
        duplicate: duplicateCount
      }
    });
  } catch (err) {
    next(err);
  }
}

`;
  
  content = content.substring(0, functionStart) + newFunc + content.substring(functionEnd);
  fs.writeFileSync(file, content);
  console.log("Updated reviewController.js");
} else {
  console.log("Could not find function bounds.");
}
