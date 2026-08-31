import { GoogleGenAI } from "@google/genai";
import { Review, ReviewSetting } from "../models/Review.js";
import { Product } from "../models/Product.js";
import { isDbConnected } from "../config/db.js";
import { defaultReviews, defaultProducts } from "../data/defaultData.js";
import { evaluateDraftSimilarity } from "../utils/similarity.js";
import { pickFields } from "../utils/sanitize.js";
import { isAdminUser, hasAdminRole } from "../middleware/auth.js";
import crypto from "crypto";

// Fields a public customer is ever allowed to submit on a new review.
// status/verified/isAiGenerated/featured/id/customerId are always
// server-controlled and can never be set by the client.
const CUSTOMER_REVIEW_FIELDS = {
  productId: "string",
  productName: "string",
  type: "string",
  name: "string",
  email: "string",
  city: "string",
  rating: "number",
  title: "string",
  text: "string"
  // images are handled separately by validateReviewImages() below - a
  // plain pickFields "string[]" type caps each entry at 500 chars, which
  // would silently truncate away real base64 photo uploads.
};

// Fields an authenticated admin (route is requireAdmin-gated) may update.
// Still an allowlist for defense-in-depth against operator-injection payloads.
const ADMIN_REVIEW_FIELDS = {
  productId: "string", productName: "string", type: "string",
  name: "string", email: "string", city: "string", rating: "number",
  title: "string", text: "string", img: "nullableString",
  status: "string", verified: "bool", featured: "bool", isAiGenerated: "bool",
  isSample: "bool", sampleLabel: "string", adminReply: "object",
  helpfulUp: "number", helpfulDown: "number"
};

const MAX_REVIEW_IMAGES = 5;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4MB decoded
const ALLOWED_IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

// Validate customer/admin-submitted review photos server-side. Frontend
// validation alone is never trusted. Accepts either http(s) URLs (already
// hosted images) or base64 data URLs, and enforces a real MIME allowlist +
// size + count limit on the latter so non-image/executable payloads
// disguised as images are rejected.
function validateReviewImages(input) {
  if (!Array.isArray(input)) return [];
  const out = [];
  for (const raw of input) {
    if (out.length >= MAX_REVIEW_IMAGES) break;
    if (typeof raw !== "string") continue;
    const value = raw.trim();
    if (/^https?:\/\//i.test(value) && value.length <= 2000) {
      out.push(value);
      continue;
    }
    const match = value.match(/^data:(image\/[a-zA-Z+.-]+);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) continue;
    const mime = match[1].toLowerCase();
    if (!ALLOWED_IMAGE_MIME.has(mime)) continue;
    // Rough decoded-size check without a full base64 decode: 4 chars ~ 3 bytes.
    const approxBytes = Math.floor((match[2].length * 3) / 4);
    if (approxBytes > MAX_IMAGE_BYTES) continue;
    out.push(value);
  }
  return out;
}

const defaultReviewSettings = {
  enabled: true,
  photoGalleryEnabled: true,
  writeReviewEnabled: true,
  verifiedBadgeEnabled: true,
  helpfulVotingEnabled: true,
  perPage: 6,
  defaultSort: "recent",
  cardStyle: {
    borderRadius: "18px",
    bgColor: "#fffdf9",
    borderColor: "#eadecd",
    textColor: "#2b1810",
    accentColor: "#b45309"
  }
};

export async function getReviews(req, res, next) {
  try {
    const { productId, status, type } = req.query;

    let isAdmin = false;
    if (req.user) {
      const { isInitialAdmin } = isAdminUser(req.user);
      isAdmin = isInitialAdmin || (await hasAdminRole(req.user.authUserId));
    }

    if (isDbConnected()) {
      let query = {};
      // status/type are coerced to plain strings before use, so a crafted
      // query param shaped like an object (e.g. ?status[$ne]=x, which
      // Express's query parser turns into a real object) can never reach
      // Mongoose as a raw operator.
      if (status && typeof status === "string") query.status = status;
      if (type && typeof type === "string") query.type = type;
      if (productId && productId !== "all" && typeof productId === "string") {
        query.$or = [{ productId: String(productId) }, { type: "store" }, { productId: "5" }];
      }

      // Public (non-admin) callers only ever see Approved reviews, and never
      // a status filter that would let them page through Pending/Hidden/
      // Rejected moderation queue items - the admin dashboard is the only
      // place that data belongs. An admin caller keeps full access,
      // including an explicit status filter for the moderation queue.
      if (!isAdmin) {
        query.status = "Approved";
      }

      // Live data only - empty review list must stay empty (no demo fallback)
      const reviews = await Review.find(query).sort({ createdAt: -1 }).lean();
      const data = isAdmin ? reviews : reviews.map(({ email, ...safe }) => safe);
      return res.json({ success: true, data, count: data.length });
    }

    let result = [...defaultReviews];
    if (status) result = result.filter(r => r.status === status);
    if (type) result = result.filter(r => r.type === type);
    if (productId && productId !== "all") {
      result = result.filter(r => String(r.productId) === String(productId) || r.type === "store" || r.productId === "5");
    }
    return res.json({ success: true, data: result, count: result.length, demoMode: true });
  } catch (err) {
    next(err);
  }
}

export async function createReview(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database unavailable. Cannot submit review without a connected MongoDB database."
      });
    }

    // Strict allowlist: client can never set status/verified/isAiGenerated/
    // featured/id/customerId or any other admin-controlled field.
    const data = pickFields(req.body, CUSTOMER_REVIEW_FIELDS);
    if (!data.name || !data.text) {
      return res.status(400).json({ success: false, message: "Name and review text are required" });
    }

    // Server always generates the review ID - a client can never overwrite
    // an existing review by supplying its ID.
    const id = "REV-" + Date.now() + "-" + crypto.randomBytes(4).toString("hex");
    const images = validateReviewImages(req.body.images);
    const payload = {
      productId: data.productId,
      productName: data.productName,
      type: data.type === "store" ? "store" : "product",
      name: data.name,
      email: data.email,
      city: data.city,
      title: data.title,
      text: data.text,
      id,
      rating: Math.min(5, Math.max(1, Number(data.rating) || 5)),
      images,
      img: images[0] || null,
      createdAt: Date.now(),
      date: "Just now",
      // Customer-submitted reviews always start Pending, unverified, and are
      // never marked AI-generated - these are server-controlled defaults.
      status: "Pending",
      verified: false,
      isAiGenerated: false,
      featured: false,
      helpfulUp: 0,
      helpfulDown: 0
    };

    // Plain insert only - never upsert against a client-influenced key, so a
    // review can never be used to overwrite another existing document.
    const created = await Review.create(payload);
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
}

export async function updateReview(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database unavailable. Cannot update review without a connected MongoDB database."
      });
    }

    const { id } = req.params;
    const data = pickFields(req.body, ADMIN_REVIEW_FIELDS);
    if (Array.isArray(req.body.images)) {
      data.images = validateReviewImages(req.body.images);
      if (!data.img) data.img = data.images[0] || null;
    }

    const updated = await Review.findOneAndUpdate(
      { id: String(id) },
      { $set: data },
      { returnDocument: "after" }
    );
    if (!updated) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteReview(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database unavailable. Cannot delete review without a connected MongoDB database."
      });
    }

    const { id } = req.params;
    await Review.findOneAndDelete({ id: String(id) });
    return res.json({ success: true, message: "Review deleted", id });
  } catch (err) {
    next(err);
  }
}

export async function voteReview(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database unavailable. Cannot vote without a connected MongoDB database."
      });
    }

    const { id } = req.params;
    const { voteType = "up" } = req.body;

    const inc = voteType === "up" ? { helpfulUp: 1 } : { helpfulDown: 1 };
    const updated = await Review.findOneAndUpdate(
      { id: String(id) },
      { $inc: inc },
      { returnDocument: "after" }
    );
    if (!updated) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function getReviewSettings(req, res, next) {
  try {
    if (isDbConnected()) {
      let settings = await ReviewSetting.findOne({ id: "DEFAULT_REVIEW_SETTINGS" }).lean();
      if (!settings) {
        settings = await ReviewSetting.create(defaultReviewSettings);
      }
      return res.json({ success: true, data: settings });
    }

    return res.json({ success: true, data: defaultReviewSettings, demoMode: true });
  } catch (err) {
    next(err);
  }
}

export async function saveReviewSettings(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database unavailable. Cannot save review settings without a connected MongoDB database."
      });
    }

    const data = req.body;
    const updated = await ReviewSetting.findOneAndUpdate(
      { id: "DEFAULT_REVIEW_SETTINGS" },
      { $set: data },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------
// DIVERSE MULTILINGUAL REVIEW DRAFT GENERATION ENGINE
// ----------------------------------------------------
function buildDiverseFallbackDrafts({ productName, category, language, tone, rating, count }) {
  const drafts = [];
  const prodName = productName || "Rudraksha Bead";
  const isHindi = language === "Hindi";
  const isHinglish = language === "Hinglish";
  const isEnglish = !isHindi && !isHinglish;

  // English perspective templates with high combinatorial variance
  const englishTitles = [
    `Authentic Natural Texture & Serene Feel`,
    `Genuine Himalayan Craftsmanship`,
    `Peaceful Daily Sadhana Experience`,
    `Distinct Natural Contours and Quality`,
    `Deep Sense of Calm and Focus`,
    `Sacred Energy & Beautiful Presentation`,
    `Subtle Grounding Presence in Daily Routine`,
    `True Vedic Essence and Purity`,
    `Impressive Natural Bead Symmetry`,
    `Reverent Packaging with Energization Note`,
    `Harmonious Meditation Companion`,
    `Natural Earthy Fragrance and Weight`,
    `Clear Mukhi Grooves & High Density`,
    `Heartfelt Spiritual Connection`,
    `Pure and Unadulterated Sacred Bead`
  ];

  const englishBodies = [
    `The ${prodName} possesses a deeply satisfying natural weight and well-defined mukhi contours. Holding it during morning contemplation brings a grounding, peaceful focus without any artificial gloss or polish.`,
    `I appreciate the natural, untreated form of this ${prodName}. The bead facets are clear and organically structured. The wooden box and sacred presentation reflect sincere reverence.`,
    `Wearing the ${prodName} daily has become an anchor for mindfulness. The natural texture feels soothing against the skin, and the craftsmanship of the threading is sturdy and respectful.`,
    `Remarkable structural density and clean mukhi lines. You can immediately feel that this is a genuine high-altitude Himalayan seed rather than a pressed imitation.`,
    `The packaging arrived neatly sealed with a sacred red pouch and energization guidelines. The ${prodName} itself has an authentic natural texture and a subtle, calming presence.`,
    `Subtle, earthy, and spiritually elevating. The bead maintains its natural moisture well with periodic drops of natural sandalwood oil. A very satisfying experience.`,
    `Clear, deep mukhi lines with no synthetic dyes or chemical smell. Sits comfortably around the neck and adds a quiet sense of steadiness to daily meditation.`,
    `From the sacred packaging to the palpable natural density of the bead, this ${prodName} feels authentic through and through. The grain and organic grooves are exceptionally distinct.`,
    `The ${prodName} arrived in pristine condition. The natural ridges are smooth yet tactilely distinct, making it a very serene bead for daily japa and contemplation.`,
    `Genuine organic seed with a balanced center. It feels reassuringly authentic, unvarnished, and carefully consecrated according to traditional Vedic norms.`
  ];

  // Hindi perspective templates (Devanagari)
  const hindiTitles = [
    `प्राकृतिक दिव्यता एवं मन की शांति`,
    `अत्यंत शुद्ध एवं स्पष्ट मुखी रेखाएं`,
    `दैनिक साधना एवं ध्यान में एकाग्रता`,
    `पवित्र वैदिक ऊर्जा का सुखद अहसास`,
    `प्रामाणिक हिमालयी रुद्राक्ष स्वरूप`,
    `सकारात्मक ऊर्जा एवं आत्मिक संतुलन`,
    `पारंपरिक विधि से अभिमंत्रित एवं शुद्ध`,
    `उत्कृष्ट प्राकृतिक बनावट और वजन`,
    `शांतिपूर्ण दैनिक अनुभव और पवित्रता`,
    `सच्ची श्रद्धा एवं वैदिक गरिमा`
  ];

  const hindiBodies = [
    `यह ${prodName} वास्तव में प्राकृतिक और दुर्लभ गुणवत्ता का अनुभव कराता है। इसकी मुखी रेखाएं स्पष्ट हैं और कोई कृत्रिम रंग या पॉलिश नहीं है। प्रातः काल ध्यान के समय इसे धारण करने से मन में शांति की अनुभूति होती है।`,
    `${prodName} का प्राकृतिक भार और स्पष्ट बनावट इसकी मूल शुद्धता को दर्शाती है। पैकेजिंग में वैदिक मर्यादा और पवित्रता का पूरा ध्यान रखा गया है।`,
    `दैनिक पूजा और जप के लिए यह ${prodName} अत्यंत सुखद और मन को एकाग्र करने वाला है। हिमालयी मूल की प्राकृतिक सुगंध और गठन स्पष्ट दिखाई देता है।`,
    `पवित्र लाल वस्त्र और गंगाजल अभिमंत्रण के साथ प्राप्त हुआ। ${prodName} की प्राकृतिक धारियां सुडौल हैं और धारण करने पर एक संतुलित, सकारात्मक ऊर्जा का संचार होता है।`,
    `इस ${prodName} की प्राकृतिक सघनता और बनावट बहुत प्रामाणिक है। किसी भी प्रकार की बनावटी चमक से रहित, शुद्ध रूप में प्राप्त हुआ जो मन को अत्यंत संतोष देता है।`,
    `नित्य साधना के दौरान इसे धारण करने से मानसिक चंचलता कम होती है और मन में स्थिरता आती है। रुद्राक्ष की प्रामाणिकता और स्पर्श दोनों ही अत्यंत सात्विक हैं।`,
    `प्राकृतिक रूप से परिपक्व दाना, जिस पर मुखी के विभाजन अत्यंत स्पष्ट हैं। सात्विक पैकेजिंग और सुरक्षा के साथ समय पर प्राप्त हुआ।`,
    `${prodName} के साथ दिया गया वैदिक विवरण और रखरखाव का मार्गदर्शन बहुत उपयोगी है। दाने की गुणवत्ता और ऊर्जा अत्यंत सात्विक और शांतिदायक है।`
  ];

  // Hinglish perspective templates (Romanized Hindi)
  const hinglishTitles = [
    `Natural Texture aur Calming Experience`,
    `100% Genuine Himalayan Bead Quality`,
    `Daily Meditation mein Bohot Peaceful`,
    `Clear Mukhi Lines aur Authentic Weight`,
    `Pure Consecrated Sacred Vibe`,
    `Peaceful Mind aur Grounded Feel`,
    `Authentic Packing aur Pure Quality`,
    `Daily Wear ke liye Perfect aur Sturdy`,
    `Natural Density aur Organic Texture`,
    `Spiritual Sadhana mein Positive Focus`
  ];

  const hinglishBodies = [
    `${prodName} ka natural density aur organic texture genuinely authentic feel deta hai. Isme koi artificial color ya chemical polish nahi hai, aur morning prayer ke waqt pehanna bohot peaceful lagta hai.`,
    `Product ki quality bohot genuine hai. Mukhi lines ekdum naturally formed hain aur bead ka weight bhi solid hai. Sacred packaging aur energization note ke sath safely deliver hua.`,
    `Daily wear aur meditation ke liye yeh ${prodName} kaafi calming companion hai. Skin pe touch hone par natural coolness feel hoti hai aur dhyan lagane mein focus banta hai.`,
    `High-altitude Himalayan origin ka natural seed hai, jo clearly iski density aur structure se samajh aata hai. Traditional Vedic vidhi se energized lagta hai.`,
    `Packaging kaafi respectful aur neat thi, red sacred pouch ke sath. ${prodName} par thoda pure sandalwood oil lagane se natural luster aur aroma bohot achha bana rehta hai.`,
    `Bead ki natural ridges clear aur distinct hain. Kisi tarah ka artificial shine nahi hai jo iski authenticity ko prove karta hai. Very satisfied with this sample draft.`,
    `Morning sadhana aur daily routine mein ek quiet steady grounding feel hoti hai. ${prodName} ka size aur natural hole alignment bilkul natural hai.`,
    `Ekdum original organic bead with distinct lines. Daily japa aur quiet contemplation ke liye divine feeling milti hai.`
  ];

  for (let i = 0; i < count; i++) {
    let t = "";
    let b = "";
    let r = 5;

    // Rating distribution
    if (rating && Number(rating) >= 1 && Number(rating) <= 5) {
      r = Number(rating);
    } else {
      // Natural mix (mostly 5s, some 4s, rare 3s)
      const rnd = (i * 7 + 13) % 100;
      if (rnd < 70) r = 5;
      else if (rnd < 92) r = 4;
      else r = 3;
    }

    if (isHindi) {
      const titleBase = hindiTitles[i % hindiTitles.length];
      const bodyBase = hindiBodies[i % hindiBodies.length];
      t = i >= hindiTitles.length ? `${titleBase} (${i + 1})` : titleBase;
      b = i >= hindiBodies.length ? `${bodyBase} दैनिक उपयोग में इसका प्राकृतिक स्वरूप अत्यंत संतोषप्रद रहता है।` : bodyBase;
    } else if (isHinglish) {
      const titleBase = hinglishTitles[i % hinglishTitles.length];
      const bodyBase = hinglishBodies[i % hinglishBodies.length];
      t = i >= hinglishTitles.length ? `${titleBase} #${i + 1}` : titleBase;
      b = i >= hinglishBodies.length ? `${bodyBase} Overall genuine experience with pure natural texture.` : bodyBase;
    } else {
      const titleBase = englishTitles[i % englishTitles.length];
      const bodyBase = englishBodies[i % englishBodies.length];
      t = i >= englishTitles.length ? `${titleBase} #${i + 1}` : titleBase;
      b = i >= englishBodies.length ? `${bodyBase} Its natural authenticity and serene tactile presence offer quiet reassurance in daily sadhana.` : bodyBase;
    }

    drafts.push({
      id: `DRAFT-${Date.now()}-${i + 1}`,
      title: t,
      text: b,
      rating: r,
      isAiGenerated: true,
      isSample: true,
      sampleLabel: "AI-generated sample",
      name: `Aura Sample Draft #${i + 1}`,
      city: "Aura Sacred Studio",
      verified: false,
      featured: false,
      status: "Approved",
      productId: productName ? "5" : "5",
      productName: prodName,
      type: "product",
      images: []
    });
  }

  return drafts;
}

// ----------------------------------------------------
// CONTROLLER: GENERATE REVIEW DRAFTS (ADMIN ONLY)
// ----------------------------------------------------
export async function generateReviewDrafts(req, res, next) {
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
            langPrompt = `Generate the reviews using this language distribution roughly: ${customLanguages.english}% English, ${customLanguages.hindi}% Hindi, and ${customLanguages.hinglish}% Hinglish.`;
        } else if (languageMix !== "Auto") {
            langPrompt = `Language required: ${languageMix}.`;
        }

        let ragPrompt = "";
        if (useRAG) {
            const approvedReviews = existingCorpus.filter(r => r.status === "Approved" && !r.isAiGenerated).slice(0, 15);
            if (approvedReviews.length > 0) {
               ragPrompt = `REFERENCE EXAMPLES (DO NOT COPY THESE OR CLOSELY PARAPHRASE THEM, JUST USE FOR STYLE/TONE INSPIRATION):\n` +
               approvedReviews.map(r => `- Rating: ${r.rating}, Title: ${r.title}, Text: ${r.text}`).join("\n");
            }
        }

        const systemPrompt = `You are an AI Review Studio assistant for "Aura Rudraksha".
Your task is to generate EXACTLY ${requestedCount} realistic customer review drafts.

REQUIREMENTS:
1. STAR MIX: We need exactly this breakdown of ratings (ensure the sum equals ${requestedCount}):
   5-Star: ${countsPerRating[5]} reviews
   4-Star: ${countsPerRating[4]} reviews
   3-Star: ${countsPerRating[3]} reviews
   2-Star: ${countsPerRating[2]} reviews
   1-Star: ${countsPerRating[1]} reviews
2. LANGUAGE MIX: ${langPrompt}
3. NATURAL STYLE: Different titles, openings, sentence structures, lengths, vocabulary, and review focus. Avoid repetitive AI templates like "I am so pleased" or "This changed my life." Act like a real, diverse customer base.
4. CUSTOMER NAME: All AI drafts MUST have the name exactly as "AI DRAFT".
5. VERIFIED PURCHASE: Do not invent fake specific order numbers, personal identities, or specific purchase dates.
6. PRODUCT: The product is "${resolvedProductName}". Tone: ${tone}. Focus authentically on natural bead texture, Himalayan origin, clear mukhi lines, packaging, etc.
7. SAFETY: NEVER make false medical, financial, or supernatural miracle claims (no "cured my illness", no "won lottery").

${ragPrompt}

OUTPUT FORMAT:
Provide the output strictly as a JSON array of objects. Do not include markdown codeblocks around the output.
[
  { "title": "...", "text": "...", "rating": 5, "name": "AI DRAFT", "language": "English" }
]`;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash-lite",
          contents: systemPrompt,
          config: {
            temperature: 0.7,
            maxOutputTokens: 8000,
          }
        });
        
        let content = response.text || "";
        const cleaned = content.replace(/^```jsons*/i, "").replace(/^```s*/i, "").replace(/s*```$/i, "").trim();
        const parsed = JSON.parse(cleaned);

        if (Array.isArray(parsed) && parsed.length > 0) {
          rawDrafts = parsed.map((item, idx) => ({
            id: `DRAFT-${Date.now()}-${idx + 1}`,
            title: item.title || `Sample Experience #${idx + 1}`,
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

export async function bulkSaveReviews(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database unavailable. Cannot save review samples without a connected MongoDB database."
      });
    }

    const { reviews = [], allowDuplicates = false } = req.body;
    if (!Array.isArray(reviews) || reviews.length === 0) {
      return res.status(400).json({ success: false, message: "No review drafts provided for saving." });
    }

    const savedList = [];
    const skippedList = [];

    for (const r of reviews) {
      // Safety check: block duplicates unless explicitly confirmed
      if (r.similarityStatus === "Duplicate" && !allowDuplicates) {
        skippedList.push({ id: r.id, title: r.title, reason: "Duplicate text detected." });
        continue;
      }

      const id = r.id && !r.id.startsWith("DRAFT-") ? r.id : `REV-SAMPLE-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      // Same server-side image allowlist as the customer/admin review paths
      // (validateReviewImages) - AI-drafted samples get no exemption from
      // MIME/size/count validation just because they're admin-authored.
      const images = validateReviewImages(Array.isArray(r.images) ? r.images : (r.img ? [r.img] : []));

      const payload = {
        ...r,
        id,
        name: r.name || "Aura Sample Draft",
        rating: Number(r.rating) || 5,
        isAiGenerated: true,
        isSample: true,
        sampleLabel: "AI-generated sample",
        verified: false, // Never fake verified buyer
        status: r.status || "Approved",
        images,
        img: images[0] || null,
        helpfulUp: 0,
        helpfulDown: 0,
        createdAt: Date.now(),
        date: "AI-generated sample"
      };

      const saved = await Review.findOneAndUpdate(
        { id: payload.id },
        payload,
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
      );
      savedList.push(saved);
    }

    return res.status(201).json({
      success: true,
      message: `Successfully saved ${savedList.length} review sample(s) to store database.`,
      savedCount: savedList.length,
      skippedCount: skippedList.length,
      data: savedList,
      skipped: skippedList
    });
  } catch (err) {
    next(err);
  }
}


