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
        filtered = filtered.filter(r => String(r.productId) === String(productId));
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
      query.productId = String(productId);
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
      status: "Pending",
      publishedAt: null,
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
// ----------------------------------------------------------------------
// NATURAL FICTIONAL DEVOTEE PERSONAS & RELATIVE DATES (MASSIVE DIVERSE POOL)
// ----------------------------------------------------------------------
const INDIAN_FIRST_NAMES = [
  "Aarav", "Advait", "Aditya", "Ajay", "Alok", "Amit", "Anand", "Anil", "Aniruddh", "Ankush", 
  "Anshul", "Anurag", "Arjun", "Arun", "Arvind", "Ashish", "Ashok", "Avinash", "Balram", "Bhagwan",
  "Bhanu", "Bharat", "Bhaskar", "Brijesh", "Chandan", "Chetan", "Darshan", "Deepak", "Devendra", "Dhananjay",
  "Dharmendra", "Dinesh", "Divyansh", "Gajendra", "Ganesh", "Gaurav", "Girish", "Gokul", "Gopal", "Govind",
  "Gurpreet", "Harish", "Harishankar", "Hemant", "Himanshu", "Ishwar", "Jagdish", "Jayant", "Jitendra", "Kailash",
  "Kamal", "Karan", "Karthik", "Keshav", "Kishore", "Krishan", "Kuldeep", "Kunal", "Lalit", "Lokesh",
  "Madhav", "Madhavan", "Mahendra", "Mahesh", "Manish", "Manoj", "Mayank", "Mukesh", "Mukund", "Nandkishor",
  "Naresh", "Navin", "Neeraj", "Nikhil", "Nilesh", "Nirmal", "Nitin", "Omkar", "Pankaj", "Parag",
  "Pawan", "Prabhat", "Prakash", "Pramod", "Pranav", "Prashant", "Prateek", "Praveen", "Prem", "Raghav",
  "Rahul", "Rajeev", "Rajendra", "Rajesh", "Rakesh", "Ramakant", "Raman", "Ramesh", "Ratan", "Ravindra",
  "Ritesh", "Rohit", "Sachin", "Samir", "Sandeep", "Sanjay", "Sanjeev", "Santosh", "Satish", "Saurabh",
  "Shailendra", "Shashi", "Shiva", "Shivendra", "Shravan", "Shrikant", "Shubham", "Siddharth", "Somesh", "Subhash",
  "Sudhir", "Sumit", "Sundaram", "Sunil", "Suresh", "Surya", "Tarun", "Trilok", "Uday", "Umang",
  "Umesh", "Utkarsh", "Vaibhav", "Varun", "Vasant", "Vedant", "Venkatesh", "Vidur", "Vidyadhar", "Vijay",
  "Vikas", "Vikram", "Vikramaditya", "Vimal", "Vinay", "Vinod", "Vipin", "Virendra", "Vishal", "Vishnu",
  "Vivek", "Yash", "Yashwant", "Yogendra", "Yogesh",
  // Female Devotee Names
  "Aarti", "Aditi", "Alka", "Amrita", "Ananya", "Anjali", "Anita", "Anupama", "Aparna", "Archana",
  "Asha", "Babita", "Bhavna", "Chhavi", "Deepa", "Deepika", "Devika", "Divya", "Gayatri", "Geeta",
  "Gauri", "Hemlata", "Indira", "Jyoti", "Kalyani", "Kamini", "Kanchan", "Kavita", "Kiran", "Komal",
  "Kusum", "Lata", "Madhu", "Madhuri", "Mamta", "Manju", "Meena", "Meenakshi", "Meera", "Mona",
  "Monika", "Nandini", "Neelam", "Neelima", "Neha", "Nirmala", "Nisha", "Pallavi", "Pooja", "Prabha",
  "Prachi", "Pratibha", "Preeti", "Priya", "Priyanjali", "Priyanka", "Pushpa", "Rachna", "Radha", "Rajni",
  "Rakhi", "Rashmi", "Rekha", "Renu", "Richa", "Ritu", "Rupa", "Sakshi", "Sandhya", "Sangeeta",
  "Sapna", "Sarita", "Saroj", "Seema", "Shalini", "Sharda", "Shashi", "Shikha", "Shilpa", "Shivani",
  "Shobha", "Shraddha", "Shreya", "Shruti", "Sneha", "Sonia", "Sudha", "Suman", "Sunita", "Surabhi",
  "Sushila", "Sushma", "Swati", "Tanuja", "Uma", "Urmila", "Usha", "Vandana", "Varsha", "Vidya"
];

const INDIAN_LAST_NAMES = [
  "Sharma", "Verma", "Gupta", "Malhotra", "Kapoor", "Mishra", "Pandey", "Tiwari", "Dubey", "Shukla",
  "Chaturvedi", "Tripathi", "Upadhyay", "Joshi", "Bhatt", "Shastri", "Vashishtha", "Saxena", "Srivastava", "Mathur",
  "Agarwal", "Agrawal", "Goyal", "Bansal", "Mittal", "Singhal", "Garg", "Jindal", "Singhania", "Khandelwal",
  "Somani", "Biyani", "Pareek", "Maheshwari", "Patel", "Shah", "Mehta", "Desai", "Amin", "Panchal",
  "Choudhary", "Rathore", "Shekhawat", "Chauhan", "Solanki", "Bhati", "Sisodia", "Jhala", "Tanwar", "Gehlot",
  "Deshmukh", "Kulkarni", "Patil", "Pawar", "Gaikwad", "Shinde", "Jadhav", "Bhosale", "Kadam", "Sawant",
  "Nair", "Pillai", "Menon", "Kurup", "Nambiar", "Iyer", "Iyengar", "Sundaram", "Subramanian", "Raman",
  "Swaminathan", "Venkatesan", "Reddy", "Rao", "Chowdary", "Naidu", "Varma", "Raju", "Hegde", "Bhat",
  "Shetty", "Gowda", "Mukherjee", "Banerjee", "Chatterjee", "Bhattacharya", "Sengupta", "Dey", "Ghosh", "Roy",
  "Mahapatra", "Pradhan", "Patnaik", "Singh", "Kaur", "Rawat", "Negi", "Thakur", "Chawla", "Khurana",
  "Soni", "Ahuja", "Bhasin", "Kohli", "Seth", "Bhatia", "Dhawan", "Suri", "Arora", "Taneja"
];

const RESPECTFUL_TITLES = [
  "", "", "", "", "", // Weighted towards regular names
  "Dr. ", "Adv. ", "Prof. ", "Pt. ", "Acharya ", "Capt. ", "Er. ", "Shri "
];

function generateUniqueDevoteeName(usedSet) {
  for (let attempt = 0; attempt < 50; attempt++) {
    const title = RESPECTFUL_TITLES[Math.floor(Math.random() * RESPECTFUL_TITLES.length)];
    const first = INDIAN_FIRST_NAMES[Math.floor(Math.random() * INDIAN_FIRST_NAMES.length)];
    const last = INDIAN_LAST_NAMES[Math.floor(Math.random() * INDIAN_LAST_NAMES.length)];
    const fullName = `${title}${first} ${last}`.trim();
    if (!usedSet.has(fullName)) {
      usedSet.add(fullName);
      return fullName;
    }
  }
  const fallback = `Devotee ${Math.floor(Math.random() * 9000) + 1000}`;
  usedSet.add(fallback);
  return fallback;
}

const INDIAN_DEVOTEE_CITIES = [
  "Varanasi, UP", "Haridwar, UK", "Rishikesh, UK", "Jaipur, RJ", 
  "Pune, MH", "Bengaluru, KA", "New Delhi", "Ahmedabad, GJ", 
  "Lucknow, UP", "Indore, MP", "Hyderabad, TS", "Ujjain, MP", 
  "Mumbai, MH", "Chennai, TN", "Kolkata, WB", "Ayodhya, UP", 
  "Bhopal, MP", "Chandigarh", "Dehradun, UK", "Nashik, MH",
  "Mathura, UP", "Coimbatore, TN", "Nagpur, MH", "Surat, GJ",
  "Prayagraj, UP", "Shimla, HP", "Guwahati, AS", "Vadodara, GJ",
  "Jodhpur, RJ", "Udaipur, RJ", "Kota, RJ", "Bhubaneswar, OD",
  "Puri, OD", "Kochi, KL", "Madurai, TN", "Tirupati, AP",
  "Visakhapatnam, AP", "Mysuru, KA", "Patna, BR", "Gaya, BR",
  "Ranchi, JH", "Jammu, JK", "Amritsar, PB", "Gurugram, HR"
];

const RELATIVE_DATES = [
  "Yesterday", "2 days ago", "3 days ago", "4 days ago", "5 days ago",
  "6 days ago", "1 week ago", "10 days ago", "2 weeks ago", "3 weeks ago",
  "1 month ago", "5 weeks ago", "Recently"
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
  productId = "all",
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
  const prodName = productName?.trim() || "Rudraksha Bead";
  const targetProductId = String(productId || "all");

  const usedTextSet = new Set();
  const usedNameSet = new Set(existingNames);

  // Dynamic review generator components for varied natural text
  const openersHindi = [
    "ॐ नमः शिवाय! ", "हर हर महादेव! ", "जय भोलेनाथ! ", "अत्यंत दिव्य अनुभव। ", "प्रणाम, ",
    "मैंने यह पावन रुद्राक्ष मंगवाया। ", "दर्शन मात्र से ही मन प्रसन्न हो गया। ", "उत्कृष्ट सात्विक उत्पाद। "
  ];
  const bodiesHindi = [
    `रुद्राक्ष का दाना 100% प्राकृतिक और ठोस है। लैब सर्टिफिकेट का QR कोड तुरंत मैच हुआ।`,
    `गहरी और स्पष्ट मुखी रेखाएं हैं। जल परीक्षण में भी यह प्राकृतिक रूप से डूब गया।`,
    `दैनिक शिव पूजा और ध्यान के समय इसे धारण करने से अद्भुत मानसिक शांति और सकारात्मक ऊर्जा महसूस होती है।`,
    `पैकेजिंग बहुत ही सुरक्षित और पवित्र थी, साथ में बेलपत्र की महक भी थी।`,
    `नेपाल का असली दाना उचित मूल्य में मिला। बाजार के नकली दानों से बिल्कुल अलग और शुद्ध है।`,
    `चांदी की नक्काशी और फिनिशिंग बहुत मजबूत और आकर्षक है। त्वचा पर धारण करने में बहुत आरामदायक है।`,
    `उत्पाद की गुणवत्ता और वजन दोनों बहुत उत्तम हैं। किसी भी रासायनिक पॉलिश या बनावटी रंग से मुक्त है।`
  ];
  const closersHindi = [
    "औरा रुद्राक्ष का हृदय से धन्यवाद।", "पूर्णतः संतुष्ट ग्राहक!", "सभी शिव भक्तों को अवश्य धारण करना चाहिए।",
    "समय पर डिलीवरी के लिए धन्यवाद।", "अत्यंत अनुशंसित!", "जय शिव शंभू! 🙏"
  ];

  const openersHinglish = [
    "Har Har Mahadev! ", "Om Namah Shivaya! ", "Truly blessed experience. ", "Namaste! ",
    "Received this sacred bead today. ", "Superb authentic quality! ", "Honest review: "
  ];
  const bodiesHinglish = [
    `Product 100% genuine aur authentic Nepal origin ka hai. Lab test report QR code perfect match hua.`,
    `Mukhi lines bilkul clear aur continuous hain. Density aur weight se hi original Nepali bead lagta hai.`,
    `Daily morning pooja aur meditation ke time wear karke bohot peace aur positive vibrations feel hoti hain.`,
    `DTDC express delivery bohot fast thi aur velvet keepsake box packaging truly royal aur safe thi.`,
    `Market mein local shops fake bechte hain, but Aura Rudraksha ne original certificate ke saath authentic bead provide kiya.`,
    `Sterling silver capping bohot sturdy hai aur skin par comfortable fit hoti hai. No rough edges.`,
    `Natural texture, no artificial chemicals or synthetic polish. Pure Himalayan energy!`
  ];
  const closersHinglish = [
    "Highly recommended to all devotees!", "Very happy with this divine purchase.", "Thank you Aura Rudraksha team.",
    "Worth every single rupee!", "Will definitely order again. 🙏"
  ];

  const openersEnglish = [
    "Om Namah Shivaya! ", "Genuine & Divine. ", "Outstanding Vedic quality. ", "Authentic Himalayan Bead. ",
    "Verified Purchase Review: ", "Blessed experience. "
  ];
  const bodiesEnglish = [
    `The Mukhi lines are deep, clear, and naturally formed without any artificial carving. Lab QR report verified instantly.`,
    `Wearing this during evening meditation has brought deep mental clarity, calm focus, and positive grounding aura.`,
    `Arrived safely within 3 business days in a beautiful velvet wooden box with sacred Gangajal aroma.`,
    `Heavy density, unpolished natural surface, and passed the pure water test with flying colors.`,
    `Superior craftsmanship on the sterling silver capping. It rests smoothly against the chest without irritation.`,
    `Honest pricing for an authenticated Nepal seed with valid government gemological lab certification.`
  ];
  const closersEnglish = [
    "Extremely satisfied with this purchase!", "Highly recommended for serious spiritual practitioners.",
    "A trustworthy brand for genuine Rudraksha.", "Har Har Mahadev! 🙏"
  ];

  const resolvedRatingMode = ratingRange || ratingMix || "Realistic Mix";

  for (let i = 0; i < count; i++) {
    let currentLang = language;
    if (language === "Auto Mix") {
      const mod = (i + Math.floor(Math.random() * 3)) % 3;
      currentLang = mod === 0 ? "Hinglish" : (mod === 1 ? "Hindi" : "English");
    }

    let textBody = "";
    let title = "";

    if (currentLang === "Hindi") {
      const op = openersHindi[Math.floor(Math.random() * openersHindi.length)];
      const bd = bodiesHindi[(i + Math.floor(Math.random() * bodiesHindi.length)) % bodiesHindi.length];
      const cl = closersHindi[Math.floor(Math.random() * closersHindi.length)];
      textBody = `${op}${bd} ${cl}`;
      title = ["100% शुद्ध एवं प्रामाणिक", "अद्भुत सात्विक ऊर्जा", "स्पष्ट मुखी रेखाएं", "उत्कृष्ट पैकेजिंग", "पूर्णतः संतुष्ट ग्राहक"][i % 5];
    } else if (currentLang === "Hinglish") {
      const op = openersHinglish[Math.floor(Math.random() * openersHinglish.length)];
      const bd = bodiesHinglish[(i + Math.floor(Math.random() * bodiesHinglish.length)) % bodiesHinglish.length];
      const cl = closersHinglish[Math.floor(Math.random() * closersHinglish.length)];
      textBody = `${op}${bd} ${cl}`;
      title = ["100% Genuine Quality", "Deep Mukhi Lines", "Fast Express Delivery", "Peaceful Meditation", "Worth Every Rupee"][i % 5];
    } else {
      const op = openersEnglish[Math.floor(Math.random() * openersEnglish.length)];
      const bd = bodiesEnglish[(i + Math.floor(Math.random() * bodiesEnglish.length)) % bodiesEnglish.length];
      const cl = closersEnglish[Math.floor(Math.random() * closersEnglish.length)];
      textBody = `${op}${bd} ${cl}`;
      title = ["Verified Authentic Nepal Bead", "Deep Calming Energy", "Pristine Sacred Packaging", "Natural & Pure Finish", "Exquisite Craftsmanship"][i % 5];
    }

    // Pick unique author name
    const devoteeName = generateUniqueDevoteeName(usedNameSet);
    const devoteeCity = INDIAN_DEVOTEE_CITIES[Math.floor(Math.random() * INDIAN_DEVOTEE_CITIES.length)];
    const relativeDate = RELATIVE_DATES[Math.floor(Math.random() * RELATIVE_DATES.length)];

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
      const mod = (i + Math.floor(Math.random() * 5)) % 5;
      if (mod === 0 || mod === 1 || mod === 3) r = 5;
      else if (mod === 2 || mod === 4) r = 4;
    }

    drafts.push({
      id: `DRAFT-${Date.now()}-${i + 1}-${Math.random().toString(36).substr(2, 5)}`,
      title: title || `${prodName} Review`,
      text: textBody,
      rating: r,
      isAiGenerated: true,
      isSample: false,
      name: devoteeName,
      city: devoteeCity,
      date: relativeDate,
      verified: false,
      featured: false,
      status: "draft",
      source: "ai_draft",
      helpfulUp: 0,
      helpfulDown: 0,
      productId: targetProductId,
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
      productId = "all",
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

    const targetProductId = String(productId || "all");
    const requestedCount = Math.max(1, Math.min(50, Number(count) || 5));
    const effectiveLanguage = language || languageMix || "Hinglish";
    const effectiveRatingMode = ratingRange || ratingMix || "Realistic Mix";
    
    // Resolve product name and attributes
    let resolvedProductName = productName?.trim();
    let productDetails = (keyFeatures || productDescription || "").trim();

    if (!resolvedProductName && targetProductId !== "all") {
      if (isDbConnected()) {
        const p = await Product.findOne({ id: targetProductId }).lean();
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
        const randomEntropy = Date.now() + "-" + Math.random().toString(36).substring(2, 7);
        const systemPrompt = `You are an authentic Indian customer review generator for Aura Rudraksha.
Generate realistic, completely distinct customer reviews for e-commerce products.

CRITICAL MANDATES:
1. DIVERSE & UNIQUE CUSTOMER NAMES: Every review MUST have a realistic, different Indian full name from different regions of India (North, South, East, West - e.g., 'Advocate Hemant Trivedi', 'Dr. Shalini Deshmukh', 'Captain Virendra Singh', 'Priyanjali Sen', 'Karthik Sundaram', 'Ananya Kulkarni', 'Meera Nambiar', 'Gurpreet Singh', 'Sunita Chawla', 'Siddharth Rao', 'Deepika Pillai', 'Manoj Khandelwal', 'Archana Bhattacharya'). NEVER repeat customer names.
2. DIVERSE & UNIQUE CONTENT: Every single review text must be unique with different sentence phrasing, personal experiences, observation on delivery, lab testing certificate QR verification, daily Shiva meditation, packaging in sacred wooden box, or silver capping quality.
3. OUTPUT FORMAT: Return ONLY a valid JSON array of objects with keys:
   - "name": Unique Indian name
   - "city": Indian location (e.g., "Jaipur, RJ", "Varanasi, UP", "Pune, MH", "Bengaluru, KA")
   - "title": Short catchy review title (3-6 words)
   - "text": Natural conversational customer review text (1-3 sentences)
   - "rating": Integer rating (5, 4, 3)
   - "language": Language used ("Hindi", "Hinglish", "English")`;

        const userPrompt = `Generate ${requestedCount} unique customer reviews for Product: "${resolvedProductName}".
Key Features / Details: "${productDetails || 'High quality genuine Rudraksha bead with lab certificate and sacred packaging'}".
Rating Mode: "${effectiveRatingMode}".
Language: "${effectiveLanguage}".
Seed/Entropy: ${randomEntropy}.
Ensure 100% variety in customer names, locations, and review sentences. Output pure JSON array only.`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            temperature: 0.95,
            maxOutputTokens: 2500
          },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }]
        });

        const content = response.text || "";
        const cleaned = content.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
        const parsed = JSON.parse(cleaned);

        if (Array.isArray(parsed) && parsed.length > 0) {
          const usedNamesInGemini = new Set();

          rawDrafts = parsed.map((item, idx) => {
            let assignedName = (item.name && item.name !== "AI DRAFT" && item.name !== "Anonymous" && item.name.trim().length > 2)
              ? item.name.trim()
              : "";

            if (!assignedName || usedNamesInGemini.has(assignedName)) {
              assignedName = generateUniqueDevoteeName(usedNamesInGemini);
            }
            usedNamesInGemini.add(assignedName);

            const assignedCity = item.city || INDIAN_DEVOTEE_CITIES[Math.floor(Math.random() * INDIAN_DEVOTEE_CITIES.length)];
            const relativeDate = RELATIVE_DATES[Math.floor(Math.random() * RELATIVE_DATES.length)];

            return {
              id: `DRAFT-${Date.now()}-${idx + 1}-${Math.random().toString(36).substr(2, 5)}`,
              title: item.title || `${resolvedProductName} Review`,
              text: (item.text || item.body || "").trim(),
              rating: Number(item.rating) || 5,
              name: assignedName,
              city: assignedCity,
              date: relativeDate,
              verified: false,
              featured: false,
              status: "draft",
              source: "ai_draft",
              helpfulUp: 0,
              helpfulDown: 0,
              productId: targetProductId,
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
        productId: targetProductId,
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
        finalDraft.name = generateUniqueDevoteeName(usedBatchNames);
      }
      usedBatchNames.add(finalDraft.name);

      let finalSimResult = evaluateDraftSimilarity(finalDraft.text, runningBatchCorpus);

      // If duplicate detected in batch or existing corpus, replace with fresh unique fallback draft
      if (finalSimResult.similarityStatus === "Duplicate" || finalSimResult.similarityStatus === "Similar") {
        const existingNames = new Set([...usedBatchNames, ...existingCorpus.map(c => c.name)]);
        const variation = buildDiverseFallbackDrafts({
          productName: resolvedProductName,
          productId: targetProductId,
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

      const isDraftOrAi = Boolean(r.isAiGenerated || r.source === "ai_draft" || (r.id && r.id.startsWith("DRAFT-")));
      const status = r.status ? r.status : (isDraftOrAi ? "draft" : "Approved");
      const source = isDraftOrAi ? "ai_draft" : (r.source || "customer");

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
        isAiGenerated: isDraftOrAi,
        isSample: false,
        sampleLabel: "",
        verified: !isDraftOrAi && r.verified !== false,
        source,
        sourceReviewId: r.sourceReviewId || "",
        status,
        images,
        img: images[0] || null,
        helpfulUp: isDraftOrAi ? 0 : (Number(r.helpfulUp) || (Math.floor(Math.random() * 5) + 1)),
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
