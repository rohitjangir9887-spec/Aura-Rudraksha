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

    if (isDbConnected()) {
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
    }

    // Fallback mode
    let result = defaultReviews.filter(r => !deletedReviewIds.has(String(r.id)) && r.status !== "deleted" && r.status !== "draft");
    if (status && status !== "all") result = result.filter(r => r.status === status);
    if (type && type !== "all") result = result.filter(r => r.type === type);
    if (source && source !== "all") result = result.filter(r => r.source === source);
    if (productId && productId !== "all") {
      result = result.filter(r => String(r.productId) === String(productId) || r.type === "store" || r.productId === "5");
    }
    if (!isAdmin) {
      result = result.filter(r => r.status === "Approved" && r.source !== "ai_draft");
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

    if (data.status === "Approved" && !data.publishedAt) {
      data.publishedAt = new Date();
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
    deletedReviewIds.add(reviewId);

    if (isDbConnected()) {
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
    }

    return res.json({ success: true, message: "Review deleted (demo mode)", id: reviewId, demoMode: true });
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

// ----------------------------------------------------------------------
// AUTHENTIC DEVOTEE PERSONAS & RELATIVE DATES FOR REALISTIC REVIEWS
// ----------------------------------------------------------------------
const INDIAN_DEVOTEE_NAMES = [
  "Rahul Sharma", "Amitabh Joshi", "Pooja Trivedi", "Rajeshwari Sharma", 
  "Vikas Malhotra", "Anand Kulkarni", "Deepak Verma", "Meenakshi Iyer", 
  "Suresh Nair", "Rohan Patel", "Sneha Mukherjee", "Dr. Manoj Saxena", 
  "Priya Kulkarni", "Sunita Agarwal", "Harish Chandra", "Neha Deshmukh",
  "Aarav Singhania", "Divya Raghavan", "Aditya Swaminathan", "Ritu Bhandari",
  "Alok Pandey", "Sanjay Bhattacharya", "Kavita Menon", "Prateek Goswami",
  "Shalini Upadhyay", "Gaurav Sen", "Ananya Chaturvedi", "Tarun Rathore",
  "Vikramaditya Roy", "Anuradha Hegde", "Kishore Somani", "Manish Purohit"
];

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

// ----------------------------------------------------------------------
// NATURAL MULTI-ANGLE DRAFT GENERATOR (SHORT, 1-3 LINES, PRODUCT SPECIFIC)
// ----------------------------------------------------------------------
function buildDiverseFallbackDrafts({ productName, language = "English", reviewLength = "Short", count = 5, ratingMix = "Mostly Positive" }) {
  const drafts = [];
  const prodName = productName || "Rudraksha Bead";
  const isHindi = language === "Hindi";
  const isHinglish = language === "Hinglish";

  // Length word constraints: Short (8-20 words), Medium (20-35 words), Long (35-60 words)
  const isShort = reviewLength === "Short";
  const isMedium = reviewLength === "Medium";

  // Distinct 6 Authentic Devotee Angles:
  // Angle 1: Product Appearance / Mukhi Grooves & Natural Clefts
  // Angle 2: Packaging, Red Velvet Pouch & Lab Certificate
  // Angle 3: Bead Texture, Natural Weight & Sandalwood Aroma
  // Angle 4: Craftsmanship, Durable Threading & Daily Japa Wear
  // Angle 5: Spiritual Meditation Peace & Daily Sadhana Feel
  // Angle 6: Authentic Quality & Accurate Description

  const englishAngles = [
    // Angle 1: Appearance & Ridges
    {
      title: "Clear mukhi lines & natural organic shape",
      short: `The contours on the ${prodName} are distinct and neatly formed. Good natural shape.`,
      medium: `The mukhi grooves on this ${prodName} are clearly defined with an unpolished natural finish. Feels authentic and well-centered.`,
      long: `Received the ${prodName} with sharply defined mukhi lines and balanced proportions. The natural seed structure has no artificial glossy coating, preserving the traditional feel.`
    },
    // Angle 2: Packaging & Certificate
    {
      title: "Neat packaging with sacred pouch & certificate",
      short: `Arrived safely in a neat box with a red sacred pouch and lab card. Packing was very tidy.`,
      medium: `Packaging was dignified and secure with a red velvet pouch. The ${prodName} came with an authentic testing certificate.`,
      long: `The packaging was handled with care and respect. The ${prodName} arrived securely packed in a traditional pouch with clear care guidelines and certificate.`
    },
    // Angle 3: Bead Texture & Density
    {
      title: "Solid natural weight and authentic woody texture",
      short: `Natural seed texture feels sturdy in hand. No chemical odor or fake shine.`,
      medium: `The tactile density of the ${prodName} is reassuring. The surface grooves are organic and smooth against skin.`,
      long: `Holding the ${prodName} feels grounded due to its organic weight. The natural woody texture has good depth and absorbs sandalwood oil evenly without losing its color.`
    },
    // Angle 4: Craftsmanship & Fit
    {
      title: "Durable thread & comfortable for daily wear",
      short: `Threading is sturdy and sits comfortably. Very convenient for daily use.`,
      medium: `The cord binding is durable and properly aligned through the center. Comfortable for daily wearing and japa.`,
      long: `The knotting and hole alignment on this ${prodName} are cleanly done. It sits easily against the collarbone without twisting or pulling during daily movement.`
    },
    // Angle 5: Meditation & Spiritual Feel
    {
      title: "Peaceful energy during daily japa & meditation",
      short: `Brings a very calm and grounded feeling during morning meditation. Very pleased with the quality.`,
      medium: `Holding this ${prodName} during daily 108 mantra chanting feels deeply calming and peaceful. Genuine sacred energy.`,
      long: `Using this ${prodName} during morning prayers has been a wonderful spiritual experience. The bead feels energized and natural.`
    },
    // Angle 6: Concise Opinion
    {
      title: "Satisfied with product quality & authentic feel",
      short: `Simple, genuine and matches the product photo exactly. Satisfied with the purchase.`,
      medium: `Matches the store photos and description accurately. A reliable, well-crafted sacred bead for daily contemplation.`,
      long: `Overall a very smooth experience with accurate product representation. The ${prodName} matches the website specifications faithfully with honest craftsmanship.`
    }
  ];

  const hindiAngles = [
    // Angle 1: Appearance & Ridges
    {
      title: "स्पष्ट मुखी रेखाएं एवं प्राकृतिक बनावट",
      short: `${prodName} की मुखी रेखाएं बिल्कुल स्पष्ट और प्राकृतिक हैं। दिखने में सुंदर है।`,
      medium: `इस ${prodName} का प्राकृतिक गठन और मुखी का विभाजन साफ नजर आता है। कोई बनावटी पॉलिश नहीं है।`,
      long: `${prodName} की प्राकृतिक धारियां बहुत सुडौल और संतुलित हैं। दाने का आकार और प्राकृतिक स्वरूप वैदिक मर्यादा के अनुकूल है।`
    },
    // Angle 2: Packaging & Certificate
    {
      title: "सुरक्षित एवं सुंदर सात्विक पैकेजिंग व प्रमाण पत्र",
      short: `लाल कपड़े की पोटली, लैब सर्टिफिकेट और मजबूत बॉक्स में सुरक्षित प्राप्त हुआ। पैकेजिंग बहुत अच्छी थी।`,
      medium: `पैकेजिंग अत्यंत सात्विक और सुरक्षित थी। ${prodName} के साथ प्रामाणिकता प्रमाण पत्र भी मिला।`,
      long: `पैकेजिंग में सात्विकता और सुरक्षा का पूरा ध्यान रखा गया है। लाल थैली, सर्टिफिकेट और बॉक्स बहुत व्यवस्थित हैं।`
    },
    // Angle 3: Texture & Density
    {
      title: "प्राकृतिक भार और शुद्ध स्पर्श",
      short: `दाने का प्राकृतिक वजन और स्पर्श अत्यंत संतोषप्रद है। रासायनिक गंध बिल्कुल नहीं है।`,
      medium: `हाथ में लेने पर ${prodName} का प्राकृतिक घनत्व और भार महसूस होता है। दाने की सतह एकदम स्वाभाविक है।`,
      long: `${prodName} का प्राकृतिक गठन और स्पर्श बहुत सुखद है। चंदन के तेल के साथ इसका प्राकृतिक रंग और बनावट और भी निखर कर आती है।`
    },
    // Angle 4: Craftsmanship & Fit
    {
      title: "मजबूत धागा एवं आरामदायक धारण",
      short: `धागे की बनावट मजबूत है और धारण करने में काफी सहज रहता है।`,
      medium: `दाने का केंद्र छेद बिल्कुल सीधा है और धागा मजबूत है। नित्य पूजा और साधना के लिए उपयुक्त है।`,
      long: `${prodName} की गुंथावट और धागे की मजबूती बहुत अच्छी है। दैनिक दिनचर्या में धारण करने पर कोई असुविधा नहीं होती।`
    },
    // Angle 5: Spiritual Feel
    {
      title: "दैनिक पूजा और जप में असीम शांति का अनुभव",
      short: `नित्य पूजा एवं ध्यान के समय मन को बहुत शांति मिलती है। अत्यंत प्रामाणिक रुद्राक्ष।`,
      medium: `प्रातः काल 108 महामृत्युंजय मंत्र जप के समय इस ${prodName} को धारण करने से मन एकाग्र रहता है।`,
      long: `${prodName} की दिव्यता और सात्विक ऊर्जा अद्भुत है। दैनिक साधना में इसे धारण करने से आत्मिक शांति का अनुभव होता है।`
    },
    // Angle 6: Concise Opinion
    {
      title: "तस्वीर के अनुसार ही उत्पाद प्राप्त हुआ",
      short: `जैसा विवरण में देखा था वैसा ही मिला। गुणवत्ता से पूरा संतोष है।`,
      medium: `वेबसाइट पर दिखाए गए चित्र के अनुसार ही ${prodName} प्राप्त हुआ। गुणवत्ता और सेवा दोनों सराहनीय हैं।`,
      long: `उत्पाद का विवरण पूरी तरह प्रामाणिक निकला। ${prodName} की गुणवत्ता और सात्विक स्वरूप मन को प्रसन्नता देता है।`
    }
  ];

  const hinglishAngles = [
    // Angle 1: Appearance & Ridges
    {
      title: "Clear mukhi lines aur natural shape",
      short: `${prodName} ki mukhi lines ekdum naturally formed hain. Finishing kaafi neat hai.`,
      medium: `${prodName} ka natural texture aur clear mukhi ridges bohot achhi quality ke lag rahe hain. No fake polish.`,
      long: `${prodName} ki natural ridges bilkul distinct aur well-formed hain. Photo ke jaisa hi natural look mila without any artificial shine.`
    },
    // Angle 2: Packaging
    {
      title: "Neat packaging aur lab certificate ke sath mila",
      short: `Red sacred pouch, lab card aur safe box packing ke sath mila. Packing kaafi neat thi.`,
      medium: `Packaging bohot respectful aur safe thi. ${prodName} testing certificate ke sath securely deliver hua.`,
      long: `Packaging kaafi neat aur dignified thi. Red pouch ke sath safely pack kiya gaya tha, overall unboxing experience achha raha.`
    },
    // Angle 3: Texture & Density
    {
      title: "Natural weight aur organic feel",
      short: `Bead ka solid natural weight feel hota hai. Surface texture bilkul authentic hai.`,
      medium: `${prodName} ka density aur organic feel genuine Himalayan seed jaisa hai. Skin pe touch comfortable hai.`,
      long: `Bead ka natural weight aur texture bohot solid hai. Sandalwood oil apply karne ke baad natural look aur better lagta hai.`
    },
    // Angle 4: Craftsmanship & Fit
    {
      title: "Sturdy threading aur daily wear mein comfortable",
      short: `Thread binding strong hai aur daily wear mein kaafi comfortable rehta hai.`,
      medium: `Hole alignment center mein hai aur thread ka knot strong hai. Daily use ke liye lightweight aur durable.`,
      long: `${prodName} ka thread work durable hai aur neck pe bilkul natural fit baithta hai. Daily meditation ke waqt comfortable rehta hai.`
    },
    // Angle 5: Spiritual Feel
    {
      title: "Daily morning japa ke liye perfect bead",
      short: `Subah meditation aur japa ke waqt kaafi positive aur calm feel hota hai. Genuine product.`,
      medium: `Daily 108 times mantra japa ke waqt yeh ${prodName} bohot soothing vibration deta hai. Fully satisfied.`,
      long: `Mera daily routine is ${prodName} ke sath shuru hota hai. Authentic bead hai, puja altar pe bhi aesthetic lagta hai.`
    },
    // Angle 6: Concise Opinion
    {
      title: "Product photo ke jaisa hi mila",
      short: `Product photo ke jaisa hi mila. Quality aur packing dono achhe lage.`,
      medium: `Photo aur description ke exact match mila. Simple, honest quality and completely satisfied.`,
      long: `Overall experience kaafi smooth raha. ${prodName} exactly description ke hisaab se receive hua, reliable purchase.`
    }
  ];

  for (let i = 0; i < count; i++) {
    const angleIndex = i % 6;
    let angleData;

    if (isHindi) {
      angleData = hindiAngles[angleIndex];
    } else if (isHinglish) {
      angleData = hinglishAngles[angleIndex];
    } else {
      angleData = englishAngles[angleIndex];
    }

    let textBody = isShort ? angleData.short : (isMedium ? angleData.medium : angleData.long);

    // Natural rating assignment based on distribution
    let r = 5;
    if (ratingMix === "Mostly Positive") {
      r = (i % 4 === 3) ? 4 : 5;
    } else if (ratingMix === "Balanced") {
      if (i % 3 === 0) r = 5;
      else if (i % 3 === 1) r = 4;
      else r = 3;
    } else {
      // Natural mix
      const rnd = (i * 17 + 7) % 100;
      if (rnd < 65) r = 5;
      else if (rnd < 90) r = 4;
      else if (rnd < 96) r = 3;
      else r = 5;
    }

    const devoteeName = INDIAN_DEVOTEE_NAMES[i % INDIAN_DEVOTEE_NAMES.length];
    const devoteeCity = INDIAN_DEVOTEE_CITIES[i % INDIAN_DEVOTEE_CITIES.length];
    const relativeDate = RELATIVE_DATES[i % RELATIVE_DATES.length];
    const helpfulVotes = (i % 3 === 0) ? Math.floor(Math.random() * 6) + 2 : Math.floor(Math.random() * 3) + 1;

    drafts.push({
      id: `DRAFT-${Date.now()}-${i + 1}`,
      title: angleData.title,
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
      productId: productName ? "5" : "5",
      productName: prodName,
      type: "product",
      language: language,
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
      ratingMix = "Mostly Positive", // "Mostly Positive" | "Balanced" | "Natural Mix" | "Custom"
      customRatings,
      languageMix = "English", // "English" | "Hindi" | "Hinglish" | "Auto Mix"
      customLanguages,
      reviewLength = "Short", // "Short" (8-20 words) | "Medium" (20-35 words) | "Long" (35-60 words)
      tone = "Authentic & Practical",
      count = 5,
      verified = true,
      useRAG = true
    } = req.body;

    const requestedCount = Math.max(1, Math.min(50, Number(count) || 5));
    
    // Resolve product name and attributes
    let resolvedProductName = productName;
    let productDetails = "";
    if (productId && productId !== "all") {
      if (isDbConnected()) {
        const p = await Product.findOne({ id: String(productId) }).lean();
        if (p) {
          resolvedProductName = p.name;
          productDetails = `Product Name: ${p.name}, Category: ${p.category || 'Rudraksha'}, Bead Type: ${p.mukhi || ''} Mukhi, Material: Natural Himalayan Seed.`;
        }
      }
      if (!resolvedProductName) {
        const dp = defaultProducts.find(p => String(p.id) === String(productId));
        if (dp) {
          resolvedProductName = dp.name;
          productDetails = `Product Name: ${dp.name}, Category: ${dp.category || 'Rudraksha'}.`;
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
        const lengthGuideline = reviewLength === "Short" 
          ? "CRITICAL LENGTH: Each review MUST be SHORT (1 to 2 lines, strictly 8 to 20 words)."
          : (reviewLength === "Medium" 
            ? "CRITICAL LENGTH: Each review MUST be concise (2 to 3 lines, strictly 20 to 35 words)."
            : "CRITICAL LENGTH: Each review MUST be 3 to 4 lines, strictly 35 to 55 words. Never generate huge paragraphs.");

        const systemPrompt = `You are an expert review generator for an authentic Indian sacred Rudraksha and spiritual store (Aura Rudraksha).
Generate realistic, authentic-sounding customer reviews written by genuine Indian devotees across India.

MANDATORY RULES:
1. ${lengthGuideline}
2. REALISTIC INDIAN DEVOTEE NAMES & CITIES: Generate diverse realistic Indian customer names (e.g., "Rahul Sharma", "Pooja Trivedi", "Amitabh Joshi", "Ananya Iyer", "Vikas Malhotra", "Rajeshwari Sharma", "Deepak Verma", "Meenakshi Sundaram", "Sneha Mukherjee") and realistic Indian cities/states (e.g. "Varanasi, UP", "Haridwar, UK", "Jaipur, RJ", "Pune, MH", "Bengaluru, KA", "New Delhi", "Ahmedabad, GJ", "Indore, MP", "Rishikesh, UK", "Ujjain, MP").
3. REALISTIC TOPICS COVERED:
   - Clear natural mukhi lines and unpolished raw bead texture
   - Red sacred velvet pouch, Ganga Jal / sandalwood touch, and safe packaging
   - Lab testing certificate card received
   - Daily japa (108 mantra chanting) and peaceful meditation feel
   - Durable thread knotting and comfortable daily wearing
4. LANGUAGE: Generate in "${languageMix}". For Hindi use clean respectful Devanagari, for Hinglish use natural conversational phrasing (e.g., "mukhi lines kaafi clear hain", "safe packing ke sath mila", "daily meditation ke liye best").
5. RATINGS: Assign mostly 5 or 4 stars (according to "${ratingMix}").
6. NO ROBOTIC CLICHES: Strictly avoid repetitive phrases like "Very good product", "I am very satisfied". Use natural vocabulary.

OUTPUT FORMAT: Return ONLY a valid JSON array of objects without markdown backticks:
[
  {
    "name": "Rahul Sharma",
    "city": "Varanasi, UP",
    "title": "Clear mukhi lines & natural shape",
    "text": "The bead has distinct mukhi lines and natural unpolished texture. Safe red pouch packaging.",
    "rating": 5,
    "language": "${languageMix}"
  }
]`;

        const userPrompt = `Generate ${requestedCount} realistic customer reviews for: ${resolvedProductName}. Details: ${productDetails}. Tone: ${tone}.`;

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
                : INDIAN_DEVOTEE_NAMES[idx % INDIAN_DEVOTEE_NAMES.length];

              const assignedCity = item.city || INDIAN_DEVOTEE_CITIES[idx % INDIAN_DEVOTEE_CITIES.length];
              const relativeDate = RELATIVE_DATES[idx % RELATIVE_DATES.length];

              return {
                id: `DRAFT-${Date.now()}-${idx + 1}`,
                title: item.title || `Authentic Devotee Review #${idx + 1}`,
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
                productId: String(productId),
                productName: resolvedProductName,
                type: "product",
                language: item.language || languageMix,
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
        language: languageMix === "Auto Mix" ? "English" : languageMix,
        reviewLength,
        count: requestedCount,
        ratingMix
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
          language: languageMix === "Auto Mix" ? "English" : languageMix,
          reviewLength,
          count: 1,
          ratingMix
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
