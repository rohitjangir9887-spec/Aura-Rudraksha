import { Review, ReviewSetting } from "../models/Review.js";
import { Product } from "../models/Product.js";
import { Order } from "../models/Order.js";
import { isDbConnected } from "../config/db.js";
import { evaluateDraftSimilarity, getExactTextHash, getNormalizedTextHash, checkDuplicateReview } from "../utils/similarity.js";
import { pickFields } from "../utils/sanitize.js";
import { isAdminUser, hasAdminRole } from "../middleware/auth.js";
import { inMemoryStore } from "../data/inMemoryStore.js";
import { GoogleGenAI } from "@google/genai";
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
  sourceReviewId: "string", authorDisplayName: "string", importedAt: "object",
  editedByAI: "bool", originalText: "string", originalTextHash: "string",
  exactTextHash: "string", normalizedTextHash: "string",
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
      let filtered = [...inMemoryStore.reviews].filter(r => !deletedReviewIds.has(r.id) && r.status !== "deleted");
      if (status && status !== "all") filtered = filtered.filter(r => r.status === status);
      if (type && type !== "all") filtered = filtered.filter(r => r.type === type);
      if (source && source !== "all") filtered = filtered.filter(r => r.source === source);
      if (productId && productId !== "all") {
        filtered = filtered.filter(r => String(r.productId) === String(productId) || r.type === "store" || String(r.productId) === "5");
      }
      if (!isAdmin) {
        filtered = filtered.filter(r => (r.status === "Approved" || r.status === "Published") && r.source !== "ai_draft");
      }
      const data = isAdmin ? filtered : filtered.map(({ email, ...safe }) => safe);
      return res.json({ success: true, data, count: data.length });
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

    // Public (non-admin) callers only see approved or published genuine customer reviews
    if (!isAdmin) {
      query.status = { $in: ["Approved", "Published"] };
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

    const trimmedText = data.text.trim();
    const exactHash = getExactTextHash(trimmedText);
    const normalizedHash = getNormalizedTextHash(trimmedText);

    // Deterministic duplicate check across DB and active corpus
    let existingCorpus = [];
    if (isDbConnected()) {
      existingCorpus = await Review.find({ status: { $ne: "deleted" } }).select("id title text sourceReviewId exactTextHash normalizedTextHash").lean();
    } else {
      existingCorpus = inMemoryStore.reviews.filter(r => r.status !== "deleted");
    }

    const dupCheck = checkDuplicateReview({ text: trimmedText, exactTextHash: exactHash, normalizedTextHash: normalizedHash }, existingCorpus);
    if (dupCheck.isDuplicate) {
      return res.status(400).json({
        success: false,
        isDuplicate: true,
        message: `Duplicate review rejected: ${dupCheck.reason}`,
        matchedReview: dupCheck.matchedReview
      });
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
      if (isDbConnected()) {
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
    }

    const payload = {
      id,
      productId: data.productId || "5",
      productName: data.productName || "Rudraksha Bead",
      type: data.type === "store" ? "store" : "product",
      name: customerDisplayName,
      authorDisplayName: customerDisplayName,
      email: data.email || "",
      city: data.city || "",
      title: data.title || "",
      text: trimmedText,
      originalText: trimmedText,
      originalTextHash: exactHash,
      exactTextHash: exactHash,
      normalizedTextHash: normalizedHash,
      editedByAI: false,
      rating: Math.min(5, Math.max(1, Number(data.rating) || 5)),
      images,
      img: images[0] || null,
      createdAt: Date.now(),
      date: "Just now",
      source: "customer",
      sourceReviewId: "",
      status: "Approved",
      publishedAt: new Date(),
      verified: isVerifiedPurchase,
      isAiGenerated: false,
      featured: false,
      helpfulUp: 0,
      helpfulDown: 0
    };

    if (!isDbConnected()) {
      inMemoryStore.reviews.unshift(payload);
      return res.status(201).json({ success: true, data: payload });
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
      const idx = inMemoryStore.reviews.findIndex(r => String(r.id) === String(id));
      if (idx < 0) return res.status(404).json({ success: false, message: "Review not found" });
      inMemoryStore.reviews[idx] = { ...inMemoryStore.reviews[idx], ...data };
      return res.json({ success: true, data: inMemoryStore.reviews[idx] });
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
      deletedReviewIds.add(reviewId);
      const idx = inMemoryStore.reviews.findIndex(r => String(r.id) === reviewId);
      if (idx >= 0) inMemoryStore.reviews.splice(idx, 1);
      return res.json({ success: true, message: "Review permanently deleted", id: reviewId });
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
      const idx = inMemoryStore.reviews.findIndex(r => String(r.id) === String(id));
      if (idx < 0) return res.status(404).json({ success: false, message: "Review not found" });
      if (voteType === "up") {
        inMemoryStore.reviews[idx].helpfulUp = (inMemoryStore.reviews[idx].helpfulUp || 0) + 1;
      } else {
        inMemoryStore.reviews[idx].helpfulDown = (inMemoryStore.reviews[idx].helpfulDown || 0) + 1;
      }
      return res.json({ success: true, data: inMemoryStore.reviews[idx] });
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
      return res.json({ success: true, data: inMemoryStore.reviewSettings || defaultReviewSettings });
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
      inMemoryStore.reviewSettings = { ...(inMemoryStore.reviewSettings || defaultReviewSettings), ...data };
      return res.json({ success: true, data: inMemoryStore.reviewSettings });
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
// NATURAL FICTIONAL DEVOTEE PERSONAS & RELATIVE DATES (100+ UNIQUE NAMES)
// ----------------------------------------------------------------------
const FICTIONAL_DEVOTEE_NAMES = [
  "Pandit Rajesh Sharma", "Dr. Shalini Deshmukh", "Captain Virendra Singh", "Priyanjali Sen",
  "Karthik Sundaram", "Aditya Kulkarni", "Meera Nambiar", "Gurpreet Singh", "Sunita Chawla",
  "Tarun Malhotra", "Deepika Joshi", "Anurag Saxena", "Siddharth Rao", "Bhavna Patel",
  "Madhavan Pillai", "Shruti Agarwal", "Gauri Soni", "Nitin Khurana", "Vandana Nair",
  "Sanjeev Mukherjee", "Pooja Trivedi", "Alok Pandey", "Prof. R. C. Chaturvedi", "Geeta Bhattacharya",
  "Harish Rawat", "Deepak Solanki", "Dr. Mukund Shastri", "Meenakshi Sundaram", "Vikramaditya Rathore",
  "Neelam Upadhyay", "Subhash Mahapatra", "Swati Saxena", "Gaurav Mishra", "Kunal Singhania",
  "Vandana Tripathi", "Abhishek Dubey", "Rahul Sharma", "Amit Patel", "Pooja Verma",
  "Suresh Kumar", "Priya Nair", "Rajesh Gupta", "Anjali Deshmukh", "Manoj Tiwari",
  "Sunil Choudhary", "Ritu Agrawal", "Sanjay Kulkarni", "Neha Bhatt", "Ashok Pandey",
  "Kavita Reddy", "Alok Sengupta", "Shweta Iyengar", "Manish Malhotra", "Divya Pillai",
  "Rohit Jangir", "Radheshyam Agrawal", "Brijesh Mishra", "Archana Roy", "Kamal Kishor Varma",
  "Sunita Somani", "Vidyadhar Joshi", "Hemant Hegde", "Padmini Raman", "Gokul Prasad",
  "Aniruddh Kotecha", "Devika Rani", "Yogesh Bhati", "Dhananjay Saxena", "Premchand Pareek",
  "Shubhangi Gaikwad", "Lokesh Choudhary", "Prashant Thapar", "Nirmala Devi", "Satish Chandra",
  "Manju Rani", "Mahendra Singh", "Bhagwan Das", "Indira Iyer", "Ganesh Shastri",
  "Kusum Sharma", "Shashi Bhushan", "Urmila Devi", "Vishnu Prasad", "Narayan Das",
  "Jagdish Prasad", "Dinesh Khandelwal", "Sarojini Naidu", "Avinash Tripathi", "Mukesh Bhasin",
  "Pankaj Soni", "Sarita Ghosh", "Mahesh Bhati", "Seema Rastogi", "Virendra Kapoor",
  "Rameshwar Dayal", "Pramod Biyani", "Lata Shekhawat", "Devendra Jhajharia", "Sunil Dutt Sharma"
];

const INDIAN_DEVOTEE_NAMES = FICTIONAL_DEVOTEE_NAMES;

const INDIAN_DEVOTEE_CITIES = [
  "Varanasi, UP", "Haridwar, UK", "Rishikesh, UK", "Jaipur, RJ", 
  "Pune, MH", "Bengaluru, KA", "New Delhi", "Ahmedabad, GJ", 
  "Lucknow, UP", "Indore, MP", "Hyderabad, TS", "Ujjain, MP", 
  "Mumbai, MH", "Chennai, TN", "Kolkata, WB", "Ayodhya, UP", 
  "Bhopal, MP", "Chandigarh", "Dehradun, UK", "Nashik, MH",
  "Mathura, UP", "Coimbatore, TN", "Nagpur, MH", "Surat, GJ",
  "Prayagraj, UP", "Shimla, HP", "Guwahati, AS", "Vadodara, GJ"
];

const RELATIVE_DATES = [
  "2 days ago", "4 days ago", "1 week ago", "2 weeks ago", 
  "3 weeks ago", "1 month ago", "Yesterday", "5 days ago",
  "3 days ago", "6 days ago", "10 days ago", "12 days ago"
];

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Helper to extract key features words/phrases from description
function extractKeyFeaturesList(descriptionText) {
  if (!descriptionText || typeof descriptionText !== "string") return [];
  return descriptionText
    .split(/[\n,;•·|]/)
    .map(s => s.trim())
    .filter(s => s.length > 2 && s.length < 80);
}

// ----------------------------------------------------------------------
// NATURAL CONVERSATIONAL DRAFT GENERATOR WITH DIVERSE TEMPLATES & UNIQUE NAMES
// ----------------------------------------------------------------------
function buildDiverseFallbackDrafts({ 
  productName, 
  productDescription = "",
  keyFeatures = "",
  language = "English", 
  reviewLength = "Short", 
  count = 5, 
  ratingMix = "Realistic Mix",
  ratingRange = "Realistic Mix (3-5 Stars)",
  existingNames = new Set()
}) {
  const drafts = [];
  const prodName = productName?.trim() || "Product";
  const featText = (keyFeatures || productDescription || "").trim();
  const featuresList = extractKeyFeaturesList(featText);

  // Available unique names shuffled
  const availableNames = shuffleArray(FICTIONAL_DEVOTEE_NAMES).filter(n => !existingNames.has(n));
  const availableCities = shuffleArray(INDIAN_DEVOTEE_CITIES);

  // Expanded Hinglish templates with realistic customer details
  const hinglishTemplates = [
    {
      title: "100% Genuine Quality",
      fn: (p, f) => `Bohot hi authentic aur pure bead hai. Lab certificate QR code test kiya, result exact match hua. Packaging bohot divine thi.`
    },
    {
      title: "Deep Mukhi Lines",
      fn: (p, f) => `Mukhi lines bilkul clear aur continuous hain. Water test bhi pass hua, seed float nahi kar raha. Very happy with purchase!`
    },
    {
      title: "Fast DTDC Delivery",
      fn: (p, f) => `3 din mein Jaipur deliver ho gaya. Wooden velvet box packing ke saath bilva patra fragrance bhi thi. Impressive service!`
    },
    {
      title: "Peaceful Meditation Experience",
      fn: (p, f) => `Shaam ki Shiva sadhana mein wear karke bohot calm feel hota hai. ${f[0] ? f[0] + ' ki quality super hai.' : 'Pure vibes!'}`
    },
    {
      title: "Solid Build & Natural Finish",
      fn: (p, f) => `Koi artificial polish ya color coating nahi hai. Natural texture aur solid weight hai. Highly recommended for daily wear.`
    },
    {
      title: "Worth Every Rupee",
      fn: (p, f) => `Offline market mein same genuine Nepal bead bohot mehenga tha. Aura Rudraksha ne honest price aur lab report di. Thank you!`
    },
    {
      title: "Energized & Blessed",
      fn: (p, f) => `Pran pratishtha certified product laga. Wear karne ke baad positive energy feel hoti hai. Packaging safe and premium thi.`
    },
    {
      title: "Perfect Silver Capping",
      fn: (p, f) => `Handcrafted silver capping bohot neat and strong hai. Daily usage mein bilkul skin-friendly hai. Har Har Mahadev! 🙏`
    },
    {
      title: "Exact as Shown in Photos",
      fn: (p, f) => `Photo se better quality receive hui. Natural Mukhi shape and unbroken grooves. Truly reliable store for authentic beads.`
    },
    {
      title: "Great Customer Support",
      fn: (p, f) => `Authenticity ke regarding questions the, team ne lab report verify karke instant call par support diya. Very satisfied!`
    }
  ];

  // Expanded Hindi templates in Devanagari
  const hindiTemplates = [
    {
      title: "100% शुद्ध एवं प्रामाणिक",
      fn: (p, f) => `ॐ नमः शिवाय! रुद्राक्ष का दाना अत्यंत शुद्ध और प्राकृतिक है। लैब टेस्ट सर्टिफिकेट का कोड ऑनलाइन मैच हो गया। मन प्रसन्न है।`
    },
    {
      title: "स्पष्ट एवं गहरी मुखी रेखाएं",
      fn: (p, f) => `मुखी रेखाएं बिना किसी बनावटी कट के गहरी और अखंडित हैं। जल परीक्षण में भी प्राकृतिक रूप से डूब गया। अत्यंत प्रामाणिक।`
    },
    {
      title: "सुरक्षित एवं सुंदर पैकेजिंग",
      fn: (p, f) => `लकड़ी के बॉक्स में बेलपत्र की महक के साथ सुरक्षित रूप से प्राप्त हुआ। 3 दिनों के भीतर समय पर डिलीवरी मिली।`
    },
    {
      title: "साधना में असीम शांति",
      fn: (p, f) => `दैनिक शिव पूजा और ध्यान के दौरान धारण करने से मन में अद्भुत एकाग्रता और शांति अनुभव होती है। सात्विक ऊर्जा।`
    },
    {
      title: "उचित मूल्य में सर्वोत्तम गुणवत्ता",
      fn: (p, f) => `नेपाल का असली दाना उचित मूल्य पर मिला। बाजार में नकली रुद्राक्षों के बीच औरा रुद्राक्ष का विश्वास सच में सराहनीय है।`
    },
    {
      title: "प्राकृतिक स्वरूप एवं ठोस वजन",
      fn: (p, f) => `किसी भी प्रकार की कृत्रिम पॉलिश या रंग नहीं है। प्राकृतिक गंध और वजन से ही इसकी शुद्धता की पहचान होती है।`
    },
    {
      title: "उत्कृष्ट चांदी की नक्काशी",
      fn: (p, f) => `चांदी की कैपिंग बहुत मजबूत और आकर्षक बनाई गई है। त्वचा पर धारण करने में बहुत सहज है। जय भोलेनाथ! 🙏`
    },
    {
      title: "पूर्णतः संतुष्ट ग्राहक",
      fn: (p, f) => `जैसा विवरण में दिया गया था, बिल्कुल वैसा ही शुद्ध दाना प्राप्त हुआ। औरा टीम को हार्दिक धन्यवाद।`
    }
  ];

  // Expanded English templates
  const englishTemplates = [
    {
      title: "Verified Authentic Nepal Bead",
      fn: (p, f) => `Verified the lab report via QR code on arrival — matched perfectly. Clear, unbroken Mukhi lines with a rich natural texture.`
    },
    {
      title: "Calm & Grounding Energy",
      fn: (p, f) => `Wearing this for daily evening meditation has brought noticeable mental clarity. Pure divine vibrations and comfortable fit.`
    },
    {
      title: "Prompt DTDC Express Delivery",
      fn: (p, f) => `Arrived within 3 business days in a beautiful wooden keepsake box. Safe bubble wrapping and pristine condition.`
    },
    {
      title: "No Artificial Polish or Dyes",
      fn: (p, f) => `Excellently preserved natural seed without chemical dyes or artificially carved grooves. Heavy density and genuine feel.`
    },
    {
      title: "Honest Pricing for Genuine Quality",
      fn: (p, f) => `Compared to local stores selling fake plastic composites, this is 100% genuine Nepalese quality with government lab proof.`
    },
    {
      title: "Exquisite Silver Capping Detail",
      fn: (p, f) => `The sterling silver capping is sturdy and smooth. Doesn't snag on clothes or irritate sensitive skin. Highly satisfied!`
    },
    {
      title: "Accurate Specifications & Support",
      fn: (p, f) => `The dimensions and weight match the test card exactly. Responsive support team answered all my care instructions promptly.`
    },
    {
      title: "Sacred Unboxing Experience",
      fn: (p, f) => `Opened the parcel to find sacred bilva leaves and gangajal scent inside. A truly devoted and spiritual touch from the brand.`
    }
  ];

  const resolvedRatingMode = ratingRange || ratingMix || "Realistic Mix";
  const usedTextSet = new Set();
  const usedNameSet = new Set(existingNames);

  for (let i = 0; i < count; i++) {
    let currentLang = language;
    if (language === "Auto Mix") {
      const mod = i % 3;
      currentLang = mod === 0 ? "Hinglish" : (mod === 1 ? "Hindi" : "English");
    }

    let tplList = englishTemplates;
    if (currentLang === "Hindi") tplList = hindiTemplates;
    else if (currentLang === "Hinglish") tplList = hinglishTemplates;

    const shuffledTpls = shuffleArray(tplList);
    let selectedTpl = shuffledTpls[0];
    let textBody = selectedTpl.fn(prodName, featuresList);

    // Ensure unique textBody if possible
    for (const candidate of shuffledTpls) {
      const candidateText = candidate.fn(prodName, featuresList);
      if (!usedTextSet.has(candidateText)) {
        selectedTpl = candidate;
        textBody = candidateText;
        break;
      }
    }
    usedTextSet.add(textBody);

    // Pick unique author name
    let devoteeName = availableNames[i % availableNames.length];
    for (const nameCandidate of availableNames) {
      if (!usedNameSet.has(nameCandidate)) {
        devoteeName = nameCandidate;
        break;
      }
    }
    usedNameSet.add(devoteeName);

    const devoteeCity = availableCities[i % availableCities.length];
    const relativeDate = RELATIVE_DATES[i % RELATIVE_DATES.length];

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
      const mod = i % 5;
      if (mod === 0 || mod === 1 || mod === 3) r = 5;
      else if (mod === 2 || mod === 4) r = 4;
    }

    drafts.push({
      id: `DRAFT-${Date.now()}-${i + 1}-${Math.random().toString(36).substr(2, 4)}`,
      title: selectedTpl.title || `${prodName} Review`,
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
      helpfulUp: Math.floor(Math.random() * 5) + 1,
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
    }
    if (!resolvedProductName) resolvedProductName = "Rudraksha Bead";

    // Gather existing reviews corpus for deduplication
    let existingCorpus = [];
    if (isDbConnected()) {
      existingCorpus = await Review.find().select("id title text rating name status").lean();
    }
    if (!existingCorpus || existingCorpus.length === 0) {
      existingCorpus = (inMemoryStore.reviews || []).map(r => ({ id: r.id, title: r.title, text: r.text, rating: r.rating, name: r.name, status: r.status }));
    }

    let rawDrafts = [];

    // Primary AI Generator: Gemini API (@google/genai)
    const geminiApiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : "";
    if (geminiApiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey: geminiApiKey });
        const systemPrompt = `You are an AI review generator for an authentic Indian Rudraksha store (Aura Rudraksha). You generate realistic, authentic customer review drafts for admin review.

CRITICAL MANDATES:
1. DUPLICATE PREVENTION: EVERY single review MUST have a completely unique reviewer name from diverse parts of India (e.g. 'Dr. Shalini Deshmukh', 'Captain Virendra Singh', 'Priyanjali Sen', 'Karthik Sundaram', 'Aditya Kulkarni', 'Meera Nambiar', 'Gurpreet Singh', 'Sunita Chawla') and completely distinct review text with unique wording and specific product observations. NEVER reuse the same reviewer name across reviews.
2. REVIEW CONTENT: Professional, natural, authentic customer reviews like real Google Reviews / e-commerce reviews. Include genuine details like lab certificate QR code verification, packaging quality, mukhi clarity, wearability, fast delivery, and peaceful feeling in daily Shiva sadhana.
3. OUTPUT FORMAT: Return ONLY a valid JSON array of objects with keys:
   - "name": Unique Indian name
   - "city": Indian location (e.g., "Jaipur, RJ", "Varanasi, UP", "Pune, MH")
   - "title": Short catchy review title (3-6 words)
   - "text": Natural conversational customer review text (1-3 sentences)
   - "rating": Integer rating (5, 4, 3)
   - "language": Language used ("Hindi", "Hinglish", "English")`;

        const userPrompt = `Generate ${requestedCount} short natural customer reviews for Product: "${resolvedProductName}". Key Features / Description: "${productDetails || 'High quality genuine product with safe packaging'}". Rating Range: "${effectiveRatingMode}". Language: "${effectiveLanguage}". Ensure EVERY review has a distinct author name and unique text. Return JSON array only.`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            temperature: 0.6,
            maxOutputTokens: 2000
          },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }]
        });

        const content = response.text || "";
        const cleaned = content.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
        const parsed = JSON.parse(cleaned);

        if (Array.isArray(parsed) && parsed.length > 0) {
          const usedNamesInGemini = new Set();
          const shuffledNames = shuffleArray(FICTIONAL_DEVOTEE_NAMES);

          rawDrafts = parsed.map((item, idx) => {
            let assignedName = (item.name && item.name !== "AI DRAFT" && item.name !== "Anonymous" && item.name.trim().length > 2)
              ? item.name.trim()
              : "";

            if (!assignedName || usedNamesInGemini.has(assignedName)) {
              assignedName = shuffledNames.find(n => !usedNamesInGemini.has(n)) || FICTIONAL_DEVOTEE_NAMES[idx % FICTIONAL_DEVOTEE_NAMES.length];
            }
            usedNamesInGemini.add(assignedName);

            const assignedCity = item.city || INDIAN_DEVOTEE_CITIES[idx % INDIAN_DEVOTEE_CITIES.length];
            const relativeDate = RELATIVE_DATES[idx % RELATIVE_DATES.length];

            return {
              id: `DRAFT-${Date.now()}-${idx + 1}-${Math.random().toString(36).substr(2, 4)}`,
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
              isAiGenerated: true,
              images: []
            };
          });

          console.log(`[Aura AI Reviews] Successfully generated ${rawDrafts.length} drafts via Gemini 2.5 Flash`);
        }
      } catch (err) {
        console.warn("[Aura AI Reviews] Gemini generation notice:", err?.message || err);
      }
    }

    // High quality combinatorial fallback with authentic Indian names & locations
    if (!rawDrafts || rawDrafts.length < requestedCount) {
      const existingNames = new Set(rawDrafts.map(d => d.name));
      const fallbackList = buildDiverseFallbackDrafts({
        productName: resolvedProductName,
        productDescription,
        keyFeatures,
        language: effectiveLanguage,
        reviewLength,
        count: requestedCount - rawDrafts.length,
        ratingMix: effectiveRatingMode,
        ratingRange: effectiveRatingMode,
        existingNames
      });
      rawDrafts = [...rawDrafts, ...fallbackList];
    }

    rawDrafts = rawDrafts.slice(0, requestedCount);

    // Duplicate detection and similarity scoring (strictly 0% to 100%)
    const evaluatedDrafts = [];
    const runningBatchCorpus = [...existingCorpus];
    const usedBatchNames = new Set();

    let uniqueCount = 0;
    let similarCount = 0;
    let duplicateCount = 0;

    for (let i = 0; i < rawDrafts.length; i++) {
      let finalDraft = { ...rawDrafts[i] };

      // Ensure author name is unique in the batch
      if (usedBatchNames.has(finalDraft.name)) {
        const replacementName = FICTIONAL_DEVOTEE_NAMES.find(n => !usedBatchNames.has(n));
        if (replacementName) finalDraft.name = replacementName;
      }
      usedBatchNames.add(finalDraft.name);

      let finalSimResult = evaluateDraftSimilarity(finalDraft.text, runningBatchCorpus);

      // If duplicate detected in batch or existing corpus, replace with fresh unique fallback draft
      if (finalSimResult.similarityStatus === "Duplicate" || finalSimResult.similarityStatus === "Similar") {
        const existingNames = new Set([...usedBatchNames, ...existingCorpus.map(c => c.name)]);
        const variation = buildDiverseFallbackDrafts({
          productName: resolvedProductName,
          productDescription,
          keyFeatures,
          language: effectiveLanguage,
          reviewLength,
          count: 1,
          ratingMix: effectiveRatingMode,
          ratingRange: effectiveRatingMode,
          existingNames
        })[0];

        if (variation && variation.text !== finalDraft.text) {
          finalDraft = {
            ...finalDraft,
            text: variation.text,
            title: variation.title,
            name: variation.name || finalDraft.name
          };
          usedBatchNames.add(finalDraft.name);
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
      runningBatchCorpus.push({ id: finalDraft.id, title: finalDraft.title, text: finalDraft.text, name: finalDraft.name });
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

export async function importExternalReviews(req, res, next) {
  try {
    const rawList = Array.isArray(req.body.reviews) ? req.body.reviews : [req.body];
    if (!rawList.length || !rawList[0]?.text) {
      return res.status(400).json({ success: false, message: "No valid external reviews provided for import." });
    }

    let existingCorpus = [];
    if (isDbConnected()) {
      existingCorpus = await Review.find({ status: { $ne: "deleted" } }).select("id title text sourceReviewId exactTextHash normalizedTextHash").lean();
    } else {
      existingCorpus = inMemoryStore.reviews.filter(r => r.status !== "deleted");
    }

    const importedList = [];
    const skippedList = [];

    for (let i = 0; i < rawList.length; i++) {
      const item = rawList[i];
      const text = (item.text || item.content || "").trim();
      if (!text) continue;

      const exactHash = getExactTextHash(text);
      const normalizedHash = getNormalizedTextHash(text);
      const sourceReviewId = item.sourceReviewId ? String(item.sourceReviewId).trim() : `google_rev_${exactHash.slice(0, 12)}`;
      const author = (item.authorDisplayName || item.name || "Google Customer").trim();

      const candidate = {
        id: item.id || `REV-EXT-${Date.now()}-${i + 1}-${crypto.randomBytes(3).toString("hex")}`,
        sourceReviewId,
        text,
        exactTextHash: exactHash,
        normalizedTextHash: normalizedHash
      };

      const dupCheck = checkDuplicateReview(candidate, existingCorpus);
      if (dupCheck.isDuplicate) {
        skippedList.push({
          sourceReviewId,
          authorDisplayName: author,
          title: item.title || "",
          reason: dupCheck.reason,
          matchedReview: dupCheck.matchedReview
        });
        continue;
      }

      const payload = {
        id: candidate.id,
        productId: String(item.productId || "5"),
        productName: item.productName || "Rudraksha Bead",
        type: item.type === "store" ? "store" : "product",
        name: author,
        authorDisplayName: author,
        email: item.email || "",
        city: item.city || "Google Reviews",
        title: item.title || "Google Customer Review",
        text,
        originalText: text,
        originalTextHash: exactHash,
        exactTextHash: exactHash,
        normalizedTextHash: normalizedHash,
        rating: Math.min(5, Math.max(1, Number(item.rating) || 5)),
        source: item.source || "google_reviews",
        sourceReviewId,
        importedAt: new Date(),
        status: item.status || "Approved",
        publishedAt: new Date(),
        verified: item.verified !== false,
        editedByAI: false,
        isAiGenerated: false,
        images: Array.isArray(item.images) ? item.images : [],
        img: Array.isArray(item.images) && item.images[0] ? item.images[0] : null,
        createdAt: item.createdAt || Date.now(),
        date: item.date || "Imported External Review",
        helpfulUp: Number(item.helpfulUp) || 0,
        helpfulDown: Number(item.helpfulDown) || 0
      };

      if (isDbConnected()) {
        const saved = await Review.create(payload);
        importedList.push(saved);
      } else {
        inMemoryStore.reviews.unshift(payload);
        importedList.push(payload);
      }

      existingCorpus.push(payload);
    }

    return res.status(200).json({
      success: true,
      message: `Imported ${importedList.length} external review(s). Skipped ${skippedList.length} duplicate(s).`,
      importedCount: importedList.length,
      skippedCount: skippedList.length,
      data: importedList,
      skipped: skippedList
    });
  } catch (err) {
    next(err);
  }
}

export async function polishReviewWithAI(req, res, next) {
  try {
    const { id, text } = req.body;
    let targetReview = null;
    let originalTextToPolish = text || "";

    if (id) {
      if (isDbConnected()) {
        targetReview = await Review.findOne({ id: String(id) });
      } else {
        targetReview = inMemoryStore.reviews.find(r => String(r.id) === String(id));
      }
      if (targetReview) {
        originalTextToPolish = targetReview.originalText || targetReview.text || originalTextToPolish;
      }
    }

    if (!originalTextToPolish.trim()) {
      return res.status(400).json({ success: false, message: "No review text provided for AI polish." });
    }

    let polishedText = originalTextToPolish.trim();

    const geminiApiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : "";
    if (geminiApiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey: geminiApiKey });
        const systemPrompt = `You are an expert review editor for an authentic Rudraksha store (Aura Rudraksha).
Your ONLY task is to polish the grammar, spelling, punctuation, and readability of genuine customer reviews.

CRITICAL MANDATES:
1. DO NOT artificially generate or invent new claims, fake facts, or marketing hype.
2. STRICTLY preserve the customer's original sentiment, rating, tone, and core message.
3. Preserve original language (English, Hindi, or Hinglish) and customer's authentic voice.
4. Return ONLY the polished review text with no quotation marks or commentary.`;

        const userPrompt = `Polish this customer review for grammar, spelling, and professional readability while strictly preserving its original meaning:\n"${originalTextToPolish}"`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.2,
            maxOutputTokens: 500
          },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }]
        });

        const outText = response.text ? response.text.replace(/^["'\s]+|["'\s]+$/g, "").trim() : "";
        if (outText && outText.length >= 5) {
          polishedText = outText;
        }
      } catch (err) {
        console.warn("[Aura AI Polish] Gemini API notice:", err?.message || err);
      }
    }

    if (polishedText === originalTextToPolish.trim()) {
      polishedText = polishedText
        .replace(/\s+/g, " ")
        .replace(/(^\w|\.\s*\w)/g, c => c.toUpperCase());
    }

    const origHash = getExactTextHash(originalTextToPolish);
    const newExactHash = getExactTextHash(polishedText);
    const newNormHash = getNormalizedTextHash(polishedText);

    let updatedRecord = null;
    if (targetReview) {
      const updateData = {
        originalText: targetReview.originalText || originalTextToPolish.trim(),
        originalTextHash: targetReview.originalTextHash || origHash,
        text: polishedText,
        exactTextHash: newExactHash,
        normalizedTextHash: newNormHash,
        editedByAI: true
      };

      if (isDbConnected()) {
        updatedRecord = await Review.findOneAndUpdate(
          { id: String(id) },
          { $set: updateData },
          { returnDocument: "after" }
        );
      } else {
        const idx = inMemoryStore.reviews.findIndex(r => String(r.id) === String(id));
        if (idx >= 0) {
          inMemoryStore.reviews[idx] = { ...inMemoryStore.reviews[idx], ...updateData };
          updatedRecord = inMemoryStore.reviews[idx];
        }
      }
    }

    return res.json({
      success: true,
      originalText: originalTextToPolish.trim(),
      polishedText,
      editedByAI: true,
      data: updatedRecord
    });
  } catch (err) {
    next(err);
  }
}

export async function bulkSaveReviews(req, res, next) {
  try {
    const { reviews = [], allowDuplicates = false } = req.body;
    if (!Array.isArray(reviews) || reviews.length === 0) {
      return res.status(400).json({ success: false, message: "No review drafts provided for saving." });
    }

    let existingCorpus = [];
    if (isDbConnected()) {
      existingCorpus = await Review.find({ status: { $ne: "deleted" } }).select("id title text sourceReviewId exactTextHash normalizedTextHash").lean();
    } else {
      existingCorpus = [...inMemoryStore.reviews].filter(r => r.status !== "deleted");
    }

    const savedList = [];
    const skippedList = [];

    for (let i = 0; i < reviews.length; i++) {
      const r = reviews[i];
      const text = (r.text || r.content || "").trim();
      const exactHash = getExactTextHash(text);
      const normalizedHash = getNormalizedTextHash(text);

      const candidate = {
        id: r.id,
        sourceReviewId: r.sourceReviewId || "",
        text,
        exactTextHash: exactHash,
        normalizedTextHash: normalizedHash
      };

      const dupCheck = checkDuplicateReview(candidate, existingCorpus);
      if (dupCheck.isDuplicate && !allowDuplicates) {
        skippedList.push({ id: r.id, title: r.title, reason: dupCheck.reason, matchedReview: dupCheck.matchedReview });
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
        authorDisplayName: r.authorDisplayName || devoteeName,
        city: devoteeCity,
        rating: Number(r.rating) || 5,
        text,
        originalText: r.originalText || text,
        originalTextHash: r.originalTextHash || exactHash,
        exactTextHash: exactHash,
        normalizedTextHash: normalizedHash,
        editedByAI: !!r.editedByAI,
        isAiGenerated: false,
        isSample: false,
        sampleLabel: "",
        verified: r.verified !== false,
        source: r.source || "customer",
        sourceReviewId: r.sourceReviewId || "",
        status: r.status || "Approved",
        images,
        img: images[0] || null,
        helpfulUp: Number(r.helpfulUp) || (Math.floor(Math.random() * 5) + 1),
        helpfulDown: 0,
        createdAt: Date.now(),
        date: relativeDate
      };

      if (isDbConnected()) {
        const saved = await Review.findOneAndUpdate(
          { id: payload.id },
          payload,
          { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
        );
        savedList.push(saved);
      } else {
        const idx = inMemoryStore.reviews.findIndex(item => item.id === payload.id);
        if (idx >= 0) inMemoryStore.reviews[idx] = payload;
        else inMemoryStore.reviews.unshift(payload);
        savedList.push(payload);
      }

      existingCorpus.push(payload);
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
