import { Review, ReviewSetting } from "../models/Review.js";
import { Product } from "../models/Product.js";
import { Order } from "../models/Order.js";
import { isDbConnected } from "../config/db.js";
import { defaultReviews, defaultProducts } from "../data/defaultData.js";
import { evaluateDraftSimilarity } from "../utils/similarity.js";
import { pickFields } from "../utils/sanitize.js";
import { isAdminUser, hasAdminRole } from "../middleware/auth.js";
import crypto from "crypto";

// In-memory set of deleted review IDs for demo/fallback isolation
const deletedReviewIds = new Set();

// Fields a public customer is ever allowed to submit on a new review
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
};

// Fields an authenticated admin may update
const ADMIN_REVIEW_FIELDS = {
  productId: "string", productName: "string", type: "string",
  name: "string", email: "string", city: "string", rating: "number",
  title: "string", text: "string", img: "nullableString",
  status: "string", verified: "bool", featured: "bool", isAiGenerated: "bool",
  isSample: "bool", sampleLabel: "string", adminReply: "object",
  helpfulUp: "number", helpfulDown: "number", source: "string",
  deletedAt: "object", deletedBy: "string"
};

const MAX_REVIEW_IMAGES = 5;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4MB decoded
const ALLOWED_IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

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
    const { productId, status, type, source } = req.query;

    let isAdmin = false;
    if (req.user) {
      const { isInitialAdmin } = isAdminUser(req.user);
      isAdmin = isInitialAdmin || (await hasAdminRole(req.user.authUserId));
    }

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: "Database unavailable",
        message: "Database is temporarily unavailable. Please try again shortly."
      });
    }

    let query = {
      status: { $ne: "deleted" },
      deletedAt: null
    };

    if (status && typeof status === "string") {
      if (status !== "all") query.status = status;
    }
    if (type && typeof type === "string" && type !== "all") query.type = type;
    if (source && typeof source === "string" && source !== "all") query.source = source;

    if (productId && productId !== "all" && typeof productId === "string") {
      query.$or = [{ productId: String(productId) }, { type: "store" }, { productId: "5" }];
    }

    // Public (non-admin) callers only see approved genuine customer reviews
    if (!isAdmin) {
      query.status = "Approved";
      query.source = { $ne: "ai_draft" };
    }

    const reviews = await Review.find(query).sort({ createdAt: -1 }).lean();
    const data = isAdmin ? reviews : reviews.map(({ email, ...safe }) => safe);
    return res.json({ success: true, data, count: data.length });
  } catch (err) {
    next(err);
  }
}

export async function createReview(req, res, next) {
  try {
    const data = pickFields(req.body, CUSTOMER_REVIEW_FIELDS);
    if (!data.name || !data.text) {
      return res.status(400).json({ success: false, message: "Name and review text are required" });
    }

    const id = "REV-" + Date.now() + "-" + crypto.randomBytes(4).toString("hex");
    const images = validateReviewImages(req.body.images);

    // Genuine customer name handling: Rahul Sharma or Anonymous
    const cleanName = data.name.trim();
    const customerDisplayName = cleanName.toLowerCase() === "anonymous" || !cleanName ? "Anonymous" : cleanName;

    // Verify if customer actually purchased this product
    let isVerifiedPurchase = false;
    const cleanEmail = (data.email || "").trim().toLowerCase();
    if (cleanEmail) {
      const matchOrder = await Order.findOne({
        $or: [
          { customerEmail: cleanEmail },
          { email: cleanEmail }
        ],
        status: { $in: ["Delivered", "Shipped", "Processing", "Completed"] }
      }).lean();

      if (matchOrder) {
        if (!data.productId || data.productId === "all" || data.type === "store") {
          isVerifiedPurchase = true;
        } else if (Array.isArray(matchOrder.items)) {
          const itemFound = matchOrder.items.some(it => String(it.id) === String(data.productId) || String(it.productId) === String(data.productId));
          if (itemFound) isVerifiedPurchase = true;
        }
      }
    }

    const payload = {
      id,
      productId: data.productId || "5",
      productName: data.productName || "Rudraksha Bead",
      type: data.type === "store" ? "store" : "product",
      name: customerDisplayName,
      email: data.email || "",
      city: data.city || "",
      title: data.title || "",
      text: data.text.trim(),
      rating: Math.min(5, Math.max(1, Number(data.rating) || 5)),
      images,
      img: images[0] || null,
      createdAt: Date.now(),
      date: "Just now",
      source: "customer",
      status: "Approved",
      publishedAt: new Date(),
      verified: isVerifiedPurchase,
      isAiGenerated: false,
      featured: false,
      helpfulUp: 0,
      helpfulDown: 0
    };

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: "Database unavailable",
        message: "Database is temporarily unavailable. Please try again shortly."
      });
    }

    const created = await Review.create(payload);
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
}

export async function updateReview(req, res, next) {
  try {
    const { id } = req.params;
    const data = pickFields(req.body, ADMIN_REVIEW_FIELDS);
    if (Array.isArray(req.body.images)) {
      data.images = validateReviewImages(req.body.images);
      if (!data.img) data.img = data.images[0] || null;
    }

    if (data.status === "Approved" && !data.publishedAt) {
      data.publishedAt = new Date();
    }

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: "Database unavailable",
        message: "Database is temporarily unavailable. Please try again shortly."
      });
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
    const { id } = req.params;
    const reviewId = String(id);

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: "Database unavailable",
        message: "Database is temporarily unavailable. Please try again shortly."
      });
    }

    await Review.findOneAndUpdate(
      { id: reviewId },
      {
        $set: {
          status: "deleted",
          deletedAt: new Date(),
          deletedBy: req.user?.email || "admin"
        }
      }
    );
    return res.json({ success: true, message: "Review permanently deleted", id: reviewId });
  } catch (err) {
    next(err);
  }
}

export async function voteReview(req, res, next) {
  try {
    const { id } = req.params;
    const { voteType = "up" } = req.body;

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: "Database unavailable",
        message: "Database is temporarily unavailable. Please try again shortly."
      });
    }

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
    if (!isDbConnected()) {
      return res.json({ success: true, data: defaultReviewSettings });
    }

    let settings = await ReviewSetting.findOne({ id: "DEFAULT_REVIEW_SETTINGS" }).lean();
    if (!settings) {
      settings = await ReviewSetting.create(defaultReviewSettings);
    }
    return res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
}

export async function saveReviewSettings(req, res, next) {
  try {
    const data = req.body;
    if (!isDbConnected()) {
      return res.json({ success: true, data: { ...defaultReviewSettings, ...data } });
    }

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

// ----------------------------------------------------------------------
// NATURAL FICTIONAL DEVOTEE PERSONAS & RELATIVE DATES
// ----------------------------------------------------------------------
const FICTIONAL_DEVOTEE_NAMES = [
  "Aman Sharma", "Neha Verma", "Ravi Meena", "Pooja Sharma", "Rohit Jangir",
  "Vikas Patel", "Priya Nair", "Deepak Joshi", "Ananya Iyer", "Suresh Kumar",
  "Kavita Reddy", "Rajesh Gupta", "Meenakshi Sundaram", "Amitabh Joshi", "Sneha Mukherjee",
  "Alok Pandey", "Sunita Agarwal", "Harish Rawat", "Divya Pillai", "Manish Malhotra",
  "Swati Saxena", "Ritu Bhandari", "Gaurav Mishra", "Kunal Singhania", "Vandana Tripathi",
  "Abhishek Dubey", "Sanjay Kulkarni", "Aditya Swaminathan", "Pooja Trivedi", "Vikas Malhotra"
];

const INDIAN_DEVOTEE_NAMES = FICTIONAL_DEVOTEE_NAMES;

const INDIAN_DEVOTEE_CITIES = [
  "Varanasi, UP", "Haridwar, UK", "Rishikesh, UK", "Jaipur, RJ", 
  "Pune, MH", "Bengaluru, KA", "New Delhi", "Ahmedabad, GJ", 
  "Lucknow, UP", "Indore, MP", "Hyderabad, TS", "Ujjain, MP", 
  "Mumbai, MH", "Chennai, TN", "Kolkata, WB", "Ayodhya, UP", 
  "Bhopal, MP", "Chandigarh", "Dehradun, UK", "Nashik, MH",
  "Mathura, UP", "Coimbatore, TN", "Nagpur, MH", "Surat, GJ"
];

const RELATIVE_DATES = [
  "2 days ago", "4 days ago", "1 week ago", "2 weeks ago", 
  "3 weeks ago", "1 month ago", "Yesterday", "5 days ago",
  "3 days ago", "6 days ago", "10 days ago"
];

// Helper to extract key features words/phrases from description
function extractKeyFeaturesList(descriptionText) {
  if (!descriptionText || typeof descriptionText !== "string") return [];
  return descriptionText
    .split(/[\n,;•·|]/)
    .map(s => s.trim())
    .filter(s => s.length > 2 && s.length < 80);
}

// ----------------------------------------------------------------------
// NATURAL CONVERSATIONAL DRAFT GENERATOR (1-4 SHORT LINES, KEY FEATURES GROUNDED)
// ----------------------------------------------------------------------
function buildDiverseFallbackDrafts({ 
  productName, 
  productDescription = "",
  keyFeatures = "",
  language = "English", 
  reviewLength = "Short", 
  count = 5, 
  ratingMix = "Realistic Mix",
  ratingRange = "Realistic Mix (3-5 Stars)" 
}) {
  const drafts = [];
  const prodName = productName?.trim() || "Product";
  const featText = (keyFeatures || productDescription || "").trim();
  const featuresList = extractKeyFeaturesList(featText);

  // Pool of natural conversational templates across languages
  // Grounded in realistic customer experiences without marketing hype

  // HINGLISH TEMPLATES (Natural, conversational mix)
  const hinglishTemplates = [
    (name, f) => `Quality उम्मीद से अच्छी लगी। इस्तेमाल करना भी काफी easy है और packaging ठीक थी।`,
    (name, f) => `Overall अच्छा experience रहा। Product अच्छा लगा और price के हिसाब से ठीक है।`,
    (name, f) => `पहली बार try किया। Quality अच्छी लगी और use करना भी काफी simple है।`,
    (name, f) => f[0] 
      ? `${f[0]} सच में काफी बढ़िया है। Delivery on time हुई और safe packing मिली।` 
      : `${name} की finish काफी neat है। Regular use के लिए एकदम suitable लगा।`,
    (name, f) => f[1] 
      ? `Product description के हिसाब से एकदम perfect निकला। ${f[1]} का अनुभव काफी अच्छा रहा।`
      : `Delivery fast थी और product जैसा photo में था वैसा ही receive हुआ। Value for money.`,
    (name, f) => `Quality decent है और finishing साफ-सुथरी है। Overall satisfied हूँ purchase से।`,
    (name, f) => f[0] 
      ? `${f[0]} बहुत natural और authentic लगा। Simple use और solid build.`
      : `Genuine product मिला। Packing बहुत safe थी और quality में कोई शिकायत नहीं।`,
    (name, f) => `Daily routine में use करना काफी comfortable है। Worth the price.`,
    (name, f) => `Packaging neat थी और product quality उम्मीद के मुताबिक अच्छी निकली। Highly recommended.`,
    (name, f) => f[2] 
      ? `Details एकदम accurate हैं, especially ${f[2]}। Honest quality मिली।`
      : `Product time pe deliver hua. Quality aur feel dono kaafi authentic lag rahe hain.`
  ];

  // HINDI TEMPLATES (Clean, natural conversational Devanagari)
  const hindiTemplates = [
    (name, f) => `गुणवत्ता उम्मीद से काफी बेहतर लगी। उपयोग करने में सरल है और पैकेजिंग भी बहुत व्यवस्थित थी।`,
    (name, f) => `कुल मिलाकर बहुत अच्छा अनुभव रहा। उत्पाद की बनावट सुंदर है और मूल्य के अनुसार सही है।`,
    (name, f) => `पहली बार मंगाया था। फिनिशिंग साफ-सुथरी है और उपयोग करना भी बहुत आसान है।`,
    (name, f) => f[0] 
      ? `${f[0]} का अनुभव बहुत संतोषप्रद रहा। समय पर सुरक्षित डिलीवरी मिली।`
      : `${name} की गुणवत्ता बहुत स्वाभाविक और प्रामाणिक है। दैनिक उपयोग के लिए एकदम उपयुक्त।`,
    (name, f) => f[1] 
      ? `विवरण के अनुसार ही उत्पाद प्राप्त हुआ। ${f[1]} की सुविधा बहुत अच्छी लगी।`
      : `उत्पाद एकदम असली और शुद्ध लगा। सुरक्षित पैकेजिंग के साथ समय पर पहुंचा।`,
    (name, f) => `दैनिक पूजा और साधना के लिए बहुत अच्छा उत्पाद है। सात्विक स्वरूप से मन प्रसन्न हुआ।`,
    (name, f) => `पैकेजिंग बहुत अच्छी थी और गुणवत्ता में कोई कमी नहीं दिखी। पूरी तरह संतुष्ट हूँ।`,
    (name, f) => f[0] 
      ? `${f[0]} बहुत स्पष्ट और स्वाभाविक है। उचित मूल्य में उत्तम उत्पाद।`
      : `जैसा फोटो में देखा था, बिल्कुल वैसा ही मिला। उपयोग में अत्यंत सहज और टिकाऊ।`
  ];

  // ENGLISH TEMPLATES (Crisp, conversational, 1-3 lines)
  const englishTemplates = [
    (name, f) => `Quality exceeded expectations. Very simple to use and arrived in neat, safe packaging.`,
    (name, f) => `Overall a very smooth experience. Product matches description accurately and feels worth the price.`,
    (name, f) => `Tried it for the first time. Build quality is solid and it is very comfortable for daily use.`,
    (name, f) => f[0] 
      ? `The ${f[0]} is noticeably well made. Delivered on time in secure packaging.`
      : `Clean finish and genuine feel. Exactly what I was looking for.`,
    (name, f) => f[1] 
      ? `Matches the specifications nicely, especially the ${f[1]}. Good natural craftsmanship.`
      : `Fast shipping and honest product quality. No artificial shine or unnecessary coating.`,
    (name, f) => `Solid and lightweight for everyday routine. Happy with the purchase.`,
    (name, f) => `Safe packaging and authentic finish. Looks and feels reliable for long-term use.`,
    (name, f) => f[0] 
      ? `Appreciate the genuine ${f[0]}. Simple, durable, and fairly priced.`
      : `Decent product that functions as described. Satisfied with the overall quality.`
  ];

  const resolvedRatingMode = ratingRange || ratingMix || "Realistic Mix";

  for (let i = 0; i < count; i++) {
    // Determine language for this review
    let currentLang = language;
    if (language === "Auto Mix") {
      const mod = i % 3;
      currentLang = mod === 0 ? "Hinglish" : (mod === 1 ? "Hindi" : "English");
    }

    let textBody = "";
    let templateIndex = i % 10;

    if (currentLang === "Hindi") {
      const tpl = hindiTemplates[templateIndex % hindiTemplates.length];
      textBody = tpl(prodName, featuresList);
    } else if (currentLang === "Hinglish") {
      const tpl = hinglishTemplates[templateIndex % hinglishTemplates.length];
      textBody = tpl(prodName, featuresList);
    } else {
      const tpl = englishTemplates[templateIndex % englishTemplates.length];
      textBody = tpl(prodName, featuresList);
    }

    // Determine realistic rating based on selection
    let r = 5;
    if (resolvedRatingMode.includes("5 Stars Only") || resolvedRatingMode === "5_stars") {
      r = 5;
    } else if (resolvedRatingMode.includes("4 to 5") || resolvedRatingMode === "4_5_stars") {
      r = (i % 3 === 2) ? 4 : 5;
    } else if (resolvedRatingMode.includes("3 to 4") || resolvedRatingMode === "3_4_stars") {
      r = (i % 2 === 0) ? 4 : 3;
    } else if (resolvedRatingMode.includes("Mostly Positive")) {
      r = (i % 4 === 3) ? 4 : 5;
    } else {
      // Realistic mix of 3, 4, and 5 stars
      const mod = i % 5;
      if (mod === 0 || mod === 1 || mod === 3) r = 5;
      else if (mod === 2 || mod === 4) r = 4;
      if (count > 4 && i % 6 === 5) r = 3;
    }

    const devoteeName = FICTIONAL_DEVOTEE_NAMES[i % FICTIONAL_DEVOTEE_NAMES.length];
    const devoteeCity = INDIAN_DEVOTEE_CITIES[i % INDIAN_DEVOTEE_CITIES.length];
    const relativeDate = RELATIVE_DATES[i % RELATIVE_DATES.length];
    const helpfulVotes = (i % 3 === 0) ? Math.floor(Math.random() * 5) + 2 : Math.floor(Math.random() * 3) + 1;

    drafts.push({
      id: `DRAFT-${Date.now()}-${i + 1}`,
      title: `${prodName} Review`,
      text: textBody,
      rating: r,
      isAiGenerated: false,
      isSample: false,
      name: devoteeName,
      city: devoteeCity,
      date: relativeDate,
      verified: true,
      featured: i === 0,
      status: "Approved",
      source: "customer",
      helpfulUp: helpfulVotes,
      helpfulDown: 0,
      productId: "5",
      productName: prodName,
      type: "product",
      language: currentLang,
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
      productDescription = "",
      keyFeatures = "",
      ratingRange = "Realistic Mix (3-5 Stars)",
      ratingMix = "Mostly Positive", // fallback compatibility
      customRatings,
      languageMix = "Hinglish", // "Hindi" | "Hinglish" | "English" | "Auto Mix"
      language = "Hinglish",
      customLanguages,
      reviewLength = "Short", // "Short" (1-2 lines) | "Medium" (2-3 lines) | "Long" (3-4 lines)
      tone = "Authentic & Conversational",
      count = 5,
      verified = true,
      useRAG = true
    } = req.body;

    const requestedCount = Math.max(1, Math.min(50, Number(count) || 5));
    const effectiveLanguage = language || languageMix || "Hinglish";
    const effectiveRatingMode = ratingRange || ratingMix || "Realistic Mix";
    
    // Resolve product name and attributes
    let resolvedProductName = productName?.trim();
    let productDetails = (keyFeatures || productDescription || "").trim();

    if (!resolvedProductName && productId && productId !== "all") {
      if (isDbConnected()) {
        const p = await Product.findOne({ id: String(productId) }).lean();
        if (p) {
          resolvedProductName = p.name;
          if (!productDetails) {
            productDetails = `${p.name} - ${p.category || 'Rudraksha'}, ${p.mukhi || ''} Mukhi, Natural Himalayan bead, authentic lab certified.`;
          }
        }
      }
      if (!resolvedProductName) {
        const dp = defaultProducts.find(p => String(p.id) === String(productId));
        if (dp) {
          resolvedProductName = dp.name;
          if (!productDetails) {
            productDetails = `${dp.name} - Natural Authentic Himalayan Bead, certified quality, velvet pouch packaging.`;
          }
        }
      }
    }
    if (!resolvedProductName) resolvedProductName = "5 Mukhi Rudraksha";

    // Gather existing reviews corpus for deduplication
    let existingCorpus = [];
    if (isDbConnected()) {
      existingCorpus = await Review.find().select("id title text rating name status").lean();
    } else {
      existingCorpus = defaultReviews.map(r => ({ id: r.id, title: r.title, text: r.text, rating: r.rating, status: r.status }));
    }

    const nvidiaApiKey = process.env.NVIDIA_API_KEY ? process.env.NVIDIA_API_KEY.trim() : "";
    let rawDrafts = [];

    if (nvidiaApiKey) {
      try {
        const systemPrompt = `You are a review generator that creates short, natural-looking fictional/sample customer reviews for website demo or placeholder use.

CRITICAL RULES:
1. REVIEW FORMAT: Each review must have a realistic fictional customer Name, Rating (realistic mix of 3, 4, and 5 stars), and Review text (1 to 4 short lines).
2. TONE & VOCABULARY: Natural, conversational ${effectiveLanguage}.
   - In Hindi: natural spoken Hindi with Devanagari script.
   - In Hinglish: natural modern conversational blend (e.g. "Quality उम्मीद से अच्छी लगी। इस्तेमाल करना भी काफी easy है और packaging ठीक थी।", "Overall अच्छा experience रहा। Product अच्छा लगा और price के हिसाब से ठीक है।").
   - In English: concise, natural everyday English without robotic phrasing.
3. GROUNDING: Only mention product features provided by the user in Product Name and Description/Key Features (${productDetails || resolvedProductName}). Do NOT invent unrelated wild claims.
4. BREVITY: Keep each review strictly 1 to 3 short lines (under 30 words).
5. AVOID CLICHES: Strictly avoid repetitive marketing phrases like "life changing", "best in the world", "as an AI". Vary sentence structures across reviews.
6. DIVERSE FICTIONAL NAMES: Use realistic Indian names like "Aman Sharma", "Neha Verma", "Ravi Meena", "Pooja Sharma", "Rohit Jangir", "Vikas Patel", "Priya Nair", "Deepak Joshi", "Ananya Iyer".

OUTPUT FORMAT: Return ONLY a valid JSON array of objects without markdown wrappers:
[
  {
    "name": "Aman Sharma",
    "city": "Jaipur, RJ",
    "title": "Natural finish & good quality",
    "text": "Quality उम्मीद से अच्छी लगी। इस्तेमाल करना भी काफी easy है और packaging ठीक थी।",
    "rating": 5,
    "language": "${effectiveLanguage}"
  }
]`;

        const userPrompt = `Generate ${requestedCount} short natural customer reviews for Product: "${resolvedProductName}". Key Features / Description: "${productDetails || 'High quality genuine product with safe packaging'}". Rating Range: "${effectiveRatingMode}". Language: "${effectiveLanguage}".`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const nimRes = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${nvidiaApiKey}`,
            "Accept": "application/json"
          },
          body: JSON.stringify({
            model: "nvidia/nemotron-3-super-120b-a12b",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            temperature: 0.45,
            max_tokens: 1200
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (nimRes.ok) {
          const data = await nimRes.json();
          let content = data.choices?.[0]?.message?.content || "";
          const cleaned = content.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
          const parsed = JSON.parse(cleaned);

          if (Array.isArray(parsed) && parsed.length > 0) {
            rawDrafts = parsed.map((item, idx) => {
              const assignedName = (item.name && item.name !== "AI DRAFT" && item.name !== "Anonymous")
                ? item.name
                : FICTIONAL_DEVOTEE_NAMES[idx % FICTIONAL_DEVOTEE_NAMES.length];

              const assignedCity = item.city || INDIAN_DEVOTEE_CITIES[idx % INDIAN_DEVOTEE_CITIES.length];
              const relativeDate = RELATIVE_DATES[idx % RELATIVE_DATES.length];

              return {
                id: `DRAFT-${Date.now()}-${idx + 1}`,
                title: item.title || `${resolvedProductName} Review`,
                text: (item.text || item.body || "").trim(),
                rating: Number(item.rating) || 5,
                name: assignedName,
                city: assignedCity,
                date: relativeDate,
                verified: verified !== false,
                featured: idx === 0,
                status: "Approved",
                source: "customer",
                helpfulUp: Math.floor(Math.random() * 5) + 1,
                helpfulDown: 0,
                productId: String(productId || "5"),
                productName: resolvedProductName,
                type: "product",
                language: item.language || effectiveLanguage,
                images: []
              };
            });
          }
        }
      } catch (err) {
        console.warn("[Aura AI Reviews] NIM generation fallback:", err?.message || err);
      }
    }

    // High quality combinatorial fallback with authentic Indian names & locations
    if (!rawDrafts || rawDrafts.length < requestedCount) {
      const fallbackList = buildDiverseFallbackDrafts({
        productName: resolvedProductName,
        productDescription,
        keyFeatures,
        language: effectiveLanguage,
        reviewLength,
        count: requestedCount,
        ratingMix: effectiveRatingMode,
        ratingRange: effectiveRatingMode
      });
      const needed = requestedCount - rawDrafts.length;
      rawDrafts = [...rawDrafts, ...fallbackList.slice(0, needed)];
    }

    rawDrafts = rawDrafts.slice(0, requestedCount);

    // Duplicate detection and similarity scoring (strictly 0% to 100%)
    const evaluatedDrafts = [];
    const runningBatchCorpus = [...existingCorpus];

    let uniqueCount = 0;
    let similarCount = 0;
    let duplicateCount = 0;

    for (let i = 0; i < rawDrafts.length; i++) {
      const draft = rawDrafts[i];
      let finalDraft = draft;
      let finalSimResult = evaluateDraftSimilarity(finalDraft.text, runningBatchCorpus);

      // If duplicate detected in batch, attempt simple variation
      if (finalSimResult.similarityStatus === "Duplicate") {
        const variation = buildDiverseFallbackDrafts({
          productName: resolvedProductName,
          productDescription,
          keyFeatures,
          language: effectiveLanguage,
          reviewLength,
          count: 1,
          ratingMix: effectiveRatingMode,
          ratingRange: effectiveRatingMode
        })[0];
        if (variation && variation.text !== finalDraft.text) {
          finalDraft = { ...finalDraft, text: variation.text, title: variation.title };
          finalSimResult = evaluateDraftSimilarity(finalDraft.text, runningBatchCorpus);
        }
      }

      const enhancedDraft = {
        ...finalDraft,
        similarityStatus: finalSimResult.similarityStatus, 
        similarityScore: finalSimResult.similarityScore, // integer 0-100
        semanticScore: finalSimResult.semanticScore, // integer 0-100
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
        message: "Database unavailable. Cannot save review drafts without a connected MongoDB database."
      });
    }

    const { reviews = [], allowDuplicates = false } = req.body;
    if (!Array.isArray(reviews) || reviews.length === 0) {
      return res.status(400).json({ success: false, message: "No review drafts provided for saving." });
    }

    const savedList = [];
    const skippedList = [];

    for (let i = 0; i < reviews.length; i++) {
      const r = reviews[i];
      if (r.similarityStatus === "Duplicate" && !allowDuplicates) {
        skippedList.push({ id: r.id, title: r.title, reason: "Duplicate text detected." });
        continue;
      }

      const id = r.id && !r.id.startsWith("DRAFT-") ? r.id : `REV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const images = validateReviewImages(Array.isArray(r.images) ? r.images : (r.img ? [r.img] : []));
      const devoteeName = (r.name && r.name !== "AI DRAFT" && r.name.trim()) 
        ? r.name.trim() 
        : INDIAN_DEVOTEE_NAMES[i % INDIAN_DEVOTEE_NAMES.length];

      const devoteeCity = (r.city && r.city !== "Aura Sacred Studio" && r.city.trim()) 
        ? r.city.trim() 
        : INDIAN_DEVOTEE_CITIES[i % INDIAN_DEVOTEE_CITIES.length];

      const relativeDate = r.date && r.date !== "AI Draft" ? r.date : RELATIVE_DATES[i % RELATIVE_DATES.length];

      const payload = {
        ...r,
        id,
        name: devoteeName,
        city: devoteeCity,
        rating: Number(r.rating) || 5,
        isAiGenerated: false,
        isSample: false,
        sampleLabel: "",
        verified: r.verified !== false,
        source: r.source || "customer",
        status: r.status || "Approved",
        images,
        img: images[0] || null,
        helpfulUp: Number(r.helpfulUp) || (Math.floor(Math.random() * 5) + 1),
        helpfulDown: 0,
        createdAt: Date.now(),
        date: relativeDate
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
      message: `Successfully saved ${savedList.length} authentic review(s).`,
      savedCount: savedList.length,
      skippedCount: skippedList.length,
      data: savedList,
      skipped: skippedList
    });
  } catch (err) {
    next(err);
  }
}
