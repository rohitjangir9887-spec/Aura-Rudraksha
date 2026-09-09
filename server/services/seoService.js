/**
 * Production SEO Engine & Metadata Generator for Aura Rudraksha
 * 
 * Features:
 * - Dynamic XML Sitemap (/sitemap.xml)
 * - Google Merchant Center Product Feed (/google-merchant-feed.xml)
 * - Strict Crawler Directives (/robots.txt)
 * - Full Server-Side Metadata & JSON-LD injection for initial HTML
 * - Schema.org Product, Offer, BreadcrumbList, WebSite, Organization, FAQPage, CollectionPage
 * - Absolute HTTPS OpenGraph & Twitter cards for WhatsApp / Social previews
 */

import { isDbConnected } from "../config/db.js";
import { Product } from "../models/Product.js";
import { Setting } from "../models/Setting.js";
import { Review } from "../models/Review.js";
import { VEDIC_BEADS_KNOWLEDGE } from "./vedicKnowledgeService.js";
import { getSiteBaseUrl } from "./indexNowService.js";

// Canonical Organization & Brand Details
export const SEO_BRAND = {
  name: "Aura Rudraksha",
  legalName: "Aura Rudraksha Enterprises",
  logo: "https://i.ibb.co/Q3C3gZTd/file-00000000fb188211907f8ce113ccb17a.png",
  defaultImage: "https://i.ibb.co/Pvb9qZy7/file-00000000310082118c0c939fa357349f.png",
  supportEmail: "aurarudrakshaofficial@gmail.com",
  supportPhone: "+91 9672996531",
  address: {
    streetAddress: "Aura Rudraksha Kendra, Station Road",
    addressLocality: "Sikar",
    addressRegion: "Rajasthan",
    postalCode: "332001",
    addressCountry: "IN"
  },
  socials: [
    "https://instagram.com/aurarudraksha",
    "https://facebook.com/aurarudraksha",
    "https://youtube.com/@aurarudraksha"
  ]
};

// Rich Vedic Categories & Search Intent Landing Page Definitions
export const CATEGORIES_SEO_REGISTRY = {
  "/rudraksha": {
    h1: "Authentic Sacred Rudraksha Beads & Japa Malas",
    title: "Sacred Rudraksha Beads (1 to 21 Mukhi) & Japa Malas | Aura Rudraksha",
    description: "Buy 100% genuine lab-certified Nepali and Indonesian Rudraksha beads (1-21 Mukhi), energized 108+1 Japa Malas, and protective wristlets. Free nationwide shipping.",
    categoryName: "All Rudraksha",
    changefreq: "daily",
    priority: "0.9",
    breadcrumbs: [
      { name: "Home", path: "/" },
      { name: "Sacred Rudraksha", path: "/rudraksha" }
    ],
    intro: "Explore our consecrated collection of natural Nepali and Indonesian Rudraksha beads. Every sacred bead is energized with Vedic rituals and tested for internal seed chambers and authenticity.",
    faqs: [
      { q: "What makes Aura Rudraksha beads authentic?", a: "All our Rudraksha beads are naturally harvested from authentic trees in Nepal and Java (Indonesia). Each bead undergoes rigorous X-ray density and laboratory testing to verify unbroken mukhi lines and internal seed compartments." },
      { q: "How are the Rudraksha beads energized before dispatch?", a: "Each sacred item is consecrated through traditional Vedic Prana Pratishtha rituals using holy Ganga jal, raw cow milk, sandalwood paste, and Beej mantra chanting by learned Vedic scholars." },
      { q: "Can anyone wear a Rudraksha bead?", a: "Yes. Ancient Vedic texts such as the Shiva Purana and Padma Purana state that Rudraksha can be worn by anyone regardless of gender, age, religion, or background with faith and reverence." }
    ]
  },
  "/rudraksha/nepali": {
    h1: "Authentic Nepali Rudraksha Beads (Himalayan Origin)",
    title: "Nepali Rudraksha Beads — Authentic Himalayan Origin | Aura Rudraksha",
    description: "Buy large, deeply grooved Nepal Rudraksha beads known for high bio-electric resonance, distinct natural mukhi lines, and intense vibrational potency. Lab certified.",
    categoryName: "Nepali Rudraksha",
    changefreq: "weekly",
    priority: "0.85",
    breadcrumbs: [
      { name: "Home", path: "/" },
      { name: "Rudraksha", path: "/rudraksha" },
      { name: "Nepali Origin", path: "/rudraksha/nepali" }
    ],
    intro: "Nepali Rudraksha beads grow in the high altitudes of the Himalayan foothills. Recognized worldwide for their bold size, deep natural grooves, and powerful bio-magnetic field.",
    faqs: [
      { q: "Why are Nepali Rudraksha beads considered superior?", a: "Nepali beads have naturally larger sizes (18mm to 28mm), pronounced thorny surfaces, and clearly defined internal seed chambers that produce measurable bio-electric resonance." },
      { q: "Do Nepali Rudraksha beads come with authenticity certificates?", a: "Yes. Every single Nepali Rudraksha bead from Aura Rudraksha comes with an official government-recognized gemstone testing laboratory certificate." }
    ]
  },
  "/rudraksha/indonesian": {
    h1: "Indonesian Java Rudraksha Beads (Small & Smooth)",
    title: "Indonesian Java Rudraksha Beads — Smooth & Subtle Energy | Aura Rudraksha",
    description: "Explore genuine Indonesian / Java Rudraksha beads. Lightweight, smooth-textured, comfortable for daily wear and ideal for 108+1 Japa meditation malas.",
    categoryName: "Indonesian Rudraksha",
    changefreq: "weekly",
    priority: "0.8",
    breadcrumbs: [
      { name: "Home", path: "/" },
      { name: "Rudraksha", path: "/rudraksha" },
      { name: "Indonesian Origin", path: "/rudraksha/indonesian" }
    ],
    intro: "Java beads originate from Indonesia. Characterized by a smoother texture, compact diameter (6mm to 12mm), and subtle spiritual frequency, they are especially comfortable for daily wear and Japa malas.",
    faqs: [
      { q: "Are Indonesian Rudraksha beads genuine?", a: "Yes. Botanical research confirms that Elaeocarpus ganitrus roxburghii trees growing in Indonesia produce genuine Rudraksha beads with authentic spiritual and bio-electric properties." }
    ]
  },
  "/rudraksha/mala": {
    h1: "Sacred 108+1 Rudraksha Japa Malas & Kanthas",
    title: "Authentic 108+1 Rudraksha Japa Malas & Kanthas | Aura Rudraksha",
    description: "Handcrafted 108+1 Rudraksha Japa Malas consecrated for daily mantra chanting, Shiva sadhana, and dhyana meditation. Knotted in pure silk with Sumeru bead.",
    categoryName: "Japa Malas",
    changefreq: "weekly",
    priority: "0.85",
    breadcrumbs: [
      { name: "Home", path: "/" },
      { name: "Rudraksha", path: "/rudraksha" },
      { name: "Japa Malas", path: "/rudraksha/mala" }
    ],
    intro: "A sacred 108+1 Rudraksha Mala is the traditional rosary for Vedic chanting and mental stillness. The 108 beads represent the 108 energy channels meeting at the heart chakra, guided by the 1 Sumeru bead.",
    faqs: [
      { q: "Why are there 108+1 beads in a Rudraksha Mala?", a: "The 108 beads signify the 108 sacred names of the divine and the cosmic distance ratio between Sun, Earth, and Moon. The 109th bead is the Bindu or Sumeru, symbolizing gratitude and self-realization." }
    ]
  },
  "/rudraksha/bracelets": {
    h1: "Consecrated Rudraksha Bracelets & Silver Wristlets",
    title: "Consecrated Rudraksha Bracelets & Wristlets | Aura Rudraksha",
    description: "Sacred Rudraksha bracelets crafted in sterling silver capping, Panchdhatu, and natural Sphatik beads for continuous pulse-point bio-resonance and spiritual shield.",
    categoryName: "Bracelets",
    changefreq: "weekly",
    priority: "0.8",
    breadcrumbs: [
      { name: "Home", path: "/" },
      { name: "Rudraksha", path: "/rudraksha" },
      { name: "Bracelets", path: "/rudraksha/bracelets" }
    ],
    intro: "Wearing Rudraksha on the wrist aligns directly with the radial artery and pulse meridian points, helping balance blood circulation, reduce restlessness, and maintain a protective energy cocoon."
  },
  "/rudraksha/gauri-shankar": {
    h1: "Gauri Shankar Rudraksha — Sacred Shiva & Parvati Union",
    title: "Gauri Shankar Rudraksha — Sacred Shiva & Parvati Union | Aura Rudraksha",
    description: "Naturally conjoined twin beads symbolizing the eternal union of Lord Shiva and Goddess Parvati. Revered for marital harmony, emotional healing, and family peace.",
    categoryName: "Gauri Shankar",
    changefreq: "weekly",
    priority: "0.85",
    breadcrumbs: [
      { name: "Home", path: "/" },
      { name: "Rudraksha", path: "/rudraksha" },
      { name: "Gauri Shankar", path: "/rudraksha/gauri-shankar" }
    ],
    intro: "Gauri Shankar Rudraksha is an extraordinary miracle of nature where two naturally grown Rudraksha beads fuse seamlessly on the tree. It harmonizes the Yin and Yang, masculine and feminine energies.",
    faqs: [
      { q: "Who should wear a Gauri Shankar Rudraksha?", a: "Devotees seeking marital harmony, finding an ideal life partner, overcoming relationship conflicts, or establishing domestic bliss in their family." }
    ]
  },
  "/rudraksha/ganesh-rudraksha": {
    h1: "Ganesh Rudraksha — Lord Vighnaharta Blessing Bead",
    title: "Ganesh Rudraksha — Remover of Obstacles & Wisdom | Aura Rudraksha",
    description: "Natural Rudraksha bead featuring a sacred trunk-like elevation blessed by Lord Ganesha. Awakens intellect, clears financial hurdles, and brings auspicious beginnings.",
    categoryName: "Ganesh Rudraksha",
    changefreq: "weekly",
    priority: "0.85",
    breadcrumbs: [
      { name: "Home", path: "/" },
      { name: "Rudraksha", path: "/rudraksha" },
      { name: "Ganesh Rudraksha", path: "/rudraksha/ganesh-rudraksha" }
    ],
    intro: "Ganesh Rudraksha bears a natural trunk-like protrusion resembling Lord Ganesha. It is venerated for eliminating hindrances (Vighna Nivaran), enhancing memory, and blessing businesses.",
    faqs: [
      { q: "What are the key benefits of wearing Ganesh Rudraksha?", a: "It removes sudden hurdles, helps students excel in complex studies, and brings luck in business and official ventures." }
    ]
  },
  "/rudraksha-for-rashi": {
    h1: "Rudraksha for Your Rashi & Zodiac Sign — Vedic Astrology Guide",
    title: "Rudraksha for Your Rashi & Zodiac Sign — Vedic Guide | Aura Rudraksha",
    description: "Find the ideal Mukhi Rudraksha according to your Janma Rashi (Moon Sign), ruling planet, and Nakshatra based on authentic Vedic astrological scriptures.",
    categoryName: "Astrology & Rashi",
    changefreq: "weekly",
    priority: "0.8",
    breadcrumbs: [
      { name: "Home", path: "/" },
      { name: "Astrology Guide", path: "/rudraksha-for-rashi" }
    ],
    intro: "In Jyotish Shastra, each Mukhi Rudraksha is governed by a specific planetary deity that balances planetary doshas, pacifies afflictions (Shani Sade Sati, Rahu/Ketu transit), and amplifies benefic yogas.",
    faqs: [
      { q: "How is a Rudraksha matched to my Rashi?", a: "By identifying your Janma Rashi (Moon sign) and its ruling planet (e.g., Mesh/Scorpio ruled by Mars matches 3 Mukhi; Vrishabh/Tula ruled by Venus matches 6 Mukhi)." },
      { q: "Can I wear 5 Mukhi even if I don't know my birth time?", a: "Yes. 5 Mukhi (Panch Mukhi) is governed by Kalagni Rudra and Jupiter, making it universally auspicious for every zodiac sign without any planetary conflict." }
    ]
  },
  "/rudraksha-calculator": {
    h1: "Vedic Rudraksha Recommendation Calculator",
    title: "Vedic Rudraksha Recommendation Calculator | Aura Rudraksha",
    description: "Calculate your ideal Mukhi Rudraksha based on birth date, zodiac sign, chakra alignment, and personal life goals. Authentic Vedic recommendation system.",
    categoryName: "Calculator",
    changefreq: "monthly",
    priority: "0.8",
    breadcrumbs: [
      { name: "Home", path: "/" },
      { name: "Recommendation Calculator", path: "/rudraksha-calculator" }
    ],
    intro: "Use our interactive Vedic astrological calculator to discover the sacred Mukhi beads specifically aligned with your birth date, planetary vibrations, and current spiritual or career focus."
  },
  "/how-to-wear-rudraksha": {
    h1: "How to Wear Rudraksha — Consecration, Mantras & Rules",
    title: "How to Wear Rudraksha — Consecration, Mantras & Rules | Aura Rudraksha",
    description: "Complete Vedic guide on wearing Rudraksha: auspicious days (Monday, Pradosh, Shivratri), Prana Pratishtha purification ritual, Beej mantras, and daily guidelines.",
    categoryName: "Spiritual Guide",
    changefreq: "monthly",
    priority: "0.8",
    breadcrumbs: [
      { name: "Home", path: "/" },
      { name: "Sacred Guides", path: "/how-to-wear-rudraksha" }
    ],
    intro: "Proper consecration and respectful wearing of Rudraksha enhances its bio-electric resonance with your human aura. Follow this authentic step-by-step Vedic guide.",
    faqs: [
      { q: "Which day is best to wear Rudraksha for the first time?", a: "Monday morning during Brahma Muhurta, or on auspicious lunar days like Pradosh, Masik Shivratri, or Shravan month Mondays." },
      { q: "Can we wear Rudraksha while sleeping or bathing?", a: "It is recommended to remove Rudraksha before sleeping or taking a soap/chemical bath to prevent bead damage and maintain physical purity." }
    ]
  },
  "/rudraksha-benefits": {
    h1: "Rudraksha Benefits — Spiritual, Scientific & Bio-Electric Energy",
    title: "Rudraksha Benefits — Spiritual, Scientific & Health Energy | Aura Rudraksha",
    description: "Scientific and Vedic benefits of wearing Rudraksha: stress relief, blood pressure stabilization, mind clarity, bio-magnetic balancing, and chakra activation.",
    categoryName: "Spiritual Guide",
    changefreq: "monthly",
    priority: "0.8",
    breadcrumbs: [
      { name: "Home", path: "/" },
      { name: "Rudraksha Benefits", path: "/rudraksha-benefits" }
    ],
    intro: "Scientific research conducted on Elaeocarpus ganitrus beads confirms distinct dielectric and capacitive properties that stabilize cardiac bio-electricity and soothe the central nervous system.",
    faqs: [
      { q: "What does scientific research say about Rudraksha?", a: "Studies from Banaras Hindu University (BHU) show that Rudraksha beads possess bio-magnetic and inductive properties that act as continuous acupressure stabilizers on human pulse points." }
    ]
  },
  "/rudraksha-authenticity": {
    h1: "Rudraksha Authenticity & Lab Testing Guide — Real vs Fake",
    title: "Rudraksha Authenticity & Lab Testing Guide — Real vs Fake | Aura Rudraksha",
    description: "How to identify genuine Rudraksha: X-ray density radiography, copper coin test myths vs reality, natural mukhi continuity, and government lab certification.",
    categoryName: "Authenticity Guide",
    changefreq: "monthly",
    priority: "0.8",
    breadcrumbs: [
      { name: "Home", path: "/" },
      { name: "Authenticity Guide", path: "/rudraksha-authenticity" }
    ],
    intro: "With the rise of carved wooden beads and glued artificial lines, authentic verification is crucial. Learn why laboratory X-ray radiography is the only 100% conclusive proof of genuine Rudraksha.",
    faqs: [
      { q: "Is the copper coin rotation test reliable?", a: "No. Copper coin rotation happens due to sweat, surface moisture, and slight hand tremors, not the bead's authenticity. Only non-destructive X-ray radiography is scientific proof." },
      { q: "How does Aura Rudraksha guarantee purity?", a: "We test every rare bead in an ISO-certified gemological laboratory. Customers receive verifiable physical certificate cards with lab report numbers and QR codes." }
    ]
  },
  "/rudraksha-care": {
    h1: "Rudraksha Care, Cleaning & Oiling Guide",
    title: "Rudraksha Care, Cleaning & Oiling Guide | Aura Rudraksha",
    description: "How to maintain, clean, oil, and store your sacred Rudraksha beads. Proper methods using Gangajal, natural mustard/sandalwood oil, and soft bristle cleaning.",
    categoryName: "Care Guide",
    changefreq: "monthly",
    priority: "0.75",
    breadcrumbs: [
      { name: "Home", path: "/" },
      { name: "Care Guide", path: "/rudraksha-care" }
    ],
    intro: "Rudraksha seeds are natural organic structures that absorb sweat and dust over time. Periodic cleaning with lukewarm water and pure sandalwood or mustard oil keeps them vibrant for generations."
  },
  "/about": {
    h1: "About Aura Rudraksha — Sacred Vedic Heritage",
    title: "About Aura Rudraksha — 100% Authentic Nepal & Indonesian Rudraksha",
    description: "Learn about Aura Rudraksha: our commitment to sacred authenticity, direct Himalayan sourcing, Vedic energization, and laboratory testing for spiritual seekers worldwide.",
    categoryName: "About Us",
    changefreq: "monthly",
    priority: "0.7",
    breadcrumbs: [
      { name: "Home", path: "/" },
      { name: "About Us", path: "/about" }
    ]
  },
  "/contact": {
    h1: "Contact Aura Rudraksha — Devotee Support & Spiritual Guidance",
    title: "Contact Aura Rudraksha — Support, Inquiries & Store Location",
    description: "Get in touch with Aura Rudraksha support team via WhatsApp, email, or telephone for order assistance, authenticity verification, and personalized Mukhi consultation.",
    categoryName: "Contact Us",
    changefreq: "monthly",
    priority: "0.7",
    breadcrumbs: [
      { name: "Home", path: "/" },
      { name: "Contact Us", path: "/contact" }
    ]
  },
  "/shipping-policy": {
    h1: "Shipping & Delivery Policy — Aura Rudraksha",
    title: "Shipping & Delivery Policy | Aura Rudraksha",
    description: "Free nationwide shipping on orders across India. Orders dispatched within 24–48 hours with live tracking and insured sacred packaging.",
    categoryName: "Policy",
    changefreq: "monthly",
    priority: "0.5",
    breadcrumbs: [
      { name: "Home", path: "/" },
      { name: "Shipping Policy", path: "/shipping-policy" }
    ]
  },
  "/return-policy": {
    h1: "Refund & 7-Day Return Policy — Aura Rudraksha",
    title: "Refund & 7-Day Return Policy | Aura Rudraksha",
    description: "7-day hassle-free return policy for damaged or mismatched orders. 100% authenticity guarantee with full refund into original payment method.",
    categoryName: "Policy",
    changefreq: "monthly",
    priority: "0.5",
    breadcrumbs: [
      { name: "Home", path: "/" },
      { name: "Return Policy", path: "/return-policy" }
    ]
  },
  "/privacy-policy": {
    h1: "Privacy Policy — Aura Rudraksha",
    title: "Privacy Policy | Aura Rudraksha",
    description: "Read our privacy policy detailing secure data encryption, customer confidentiality, and zero third-party data sharing.",
    categoryName: "Policy",
    changefreq: "monthly",
    priority: "0.4",
    breadcrumbs: [
      { name: "Home", path: "/" },
      { name: "Privacy Policy", path: "/privacy-policy" }
    ]
  },
  "/terms": {
    h1: "Terms of Service & Spiritual Use — Aura Rudraksha",
    title: "Terms & Conditions of Service | Aura Rudraksha",
    description: "Official terms and conditions governing purchases, authenticity certifications, and spiritual item care at Aura Rudraksha.",
    categoryName: "Policy",
    changefreq: "monthly",
    priority: "0.4",
    breadcrumbs: [
      { name: "Home", path: "/" },
      { name: "Terms of Service", path: "/terms" }
    ]
  },
  "/cancellation": {
    h1: "Cancellation Policy — Aura Rudraksha",
    title: "Cancellation Policy | Aura Rudraksha",
    description: "Order cancellation policy for Aura Rudraksha: easy pre-dispatch cancellation via WhatsApp or support ticket.",
    categoryName: "Policy",
    changefreq: "monthly",
    priority: "0.4",
    breadcrumbs: [
      { name: "Home", path: "/" },
      { name: "Cancellation Policy", path: "/cancellation" }
    ]
  },
  "/secure-payment": {
    h1: "100% Secure Payment Guarantee — Aura Rudraksha",
    title: "Secure Payment Guarantee | Aura Rudraksha",
    description: "256-bit encrypted checkout supporting UPI, Google Pay, PhonePe, credit/debit cards, and netbanking via RBI-authorized payment gateways.",
    categoryName: "Security",
    changefreq: "monthly",
    priority: "0.5",
    breadcrumbs: [
      { name: "Home", path: "/" },
      { name: "Secure Payment", path: "/secure-payment" }
    ]
  },
  "/track-order": {
    h1: "Live Sacred Parcel Tracking — Aura Rudraksha",
    title: "Track Your Sacred Order | Aura Rudraksha",
    description: "Track the real-time shipping status and delivery ETA of your consecrated Rudraksha order using your Order ID or phone number.",
    categoryName: "Order Tracking",
    changefreq: "monthly",
    priority: "0.6",
    breadcrumbs: [
      { name: "Home", path: "/" },
      { name: "Track Order", path: "/track-order" }
    ]
  }
};

// Dynamically populate Mukhi beads from 1 to 21
for (let m = 1; m <= 21; m++) {
  const mKey = `/rudraksha/${m}-mukhi`;
  const kData = VEDIC_BEADS_KNOWLEDGE[String(m)] || {};
  const beadName = kData.name || `${m} Mukhi Rudraksha`;
  const deity = kData.deity || "Lord Shiva";
  const planet = kData.planet || "Navagraha";
  const beejMantra = kData.beejMantra || "Om Namah Shivaya";
  const element = kData.element || "Sacred Consciousness";

  CATEGORIES_SEO_REGISTRY[mKey] = {
    h1: `${m} Mukhi Rudraksha — Consecrated & Lab Certified`,
    title: `${m} Mukhi Rudraksha (${m} Face Bead) — ${deity} | Aura Rudraksha`,
    description: `Buy authentic ${m} Mukhi Rudraksha blessed by ${deity}, ruled by planet ${planet}. Beej Mantra: ${beejMantra}. Natural Nepal & Java origin with lab authenticity certificate.`,
    categoryName: `${m} Mukhi Rudraksha`,
    mukhiNumber: m,
    deity,
    planet,
    beejMantra,
    element,
    changefreq: "weekly",
    priority: "0.85",
    breadcrumbs: [
      { name: "Home", path: "/" },
      { name: "Rudraksha", path: "/rudraksha" },
      { name: `${m} Mukhi`, path: mKey }
    ],
    intro: `The sacred ${m} Mukhi Rudraksha holds profound Vedic significance. Governed by deity ${deity} and ruling celestial body ${planet}, it channels powerful vibrations for inner balance, mental focus, and spiritual ascension.`,
    faqs: [
      { q: `What are the benefits of ${m} Mukhi Rudraksha?`, a: `In traditional Vedic scriptures, the ${m} Mukhi is associated with ${kData.primaryBenefits || "spiritual elevation, planetary peace, and positive energy amplification"}.` },
      { q: `What is the Beej Mantra for ${m} Mukhi?`, a: `The primary Beej Mantra is "${beejMantra}". Chanting this mantra 108 times during Dharan activates the bead's spiritual energy.` },
      { q: `Which day is best to wear ${m} Mukhi Rudraksha?`, a: `As per Vedic tradition, ${kData.bestDay || "Monday or Thursday morning during Brahma Muhurta"} is most auspicious.` }
    ]
  };
}

/**
 * Helper to escape XML special entities
 */
export function escapeXml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Fetch all active public products from MongoDB
 */
export async function getPublicProductsForSeo() {
  if (!isDbConnected()) {
    return [];
  }
  try {
    const products = await Product.find({
      $and: [
        {
          $or: [
            { status: { $in: ["Published", "published", "Active", "active"] } },
            { status: { $exists: false } },
            { status: null },
            { status: "" }
          ]
        },
        {
          status: { $nin: ["Draft", "draft", "Inactive", "inactive", "Archived", "archived"] }
        }
      ]
    }).lean();
    return products || [];
  } catch (err) {
    console.warn("[SEO] Notice fetching public products from MongoDB:", err.message);
    return [];
  }
}

/**
 * Find single product for SEO metadata by ID or Slug
 */
export async function findProductForSeo(idOrSlug) {
  if (!idOrSlug) return null;
  const clean = String(idOrSlug).trim().toLowerCase();

  if (!isDbConnected()) {
    return null;
  }

  try {
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(clean);
    const query = {
      $or: [
        { id: clean },
        { slug: clean },
        ...(isMongoId ? [{ _id: clean }] : [])
      ]
    };
    const product = await Product.findOne(query).lean();
    if (product) return product;
    return null;
  } catch (err) {
    console.warn("[SEO] Notice in findProductForSeo:", err.message);
    return null;
  }
}

/**
 * Generate XML Sitemap string
 */
export async function generateSitemapXml(req) {
  const baseUrl = getSiteBaseUrl(req);
  const now = new Date().toISOString();
  const products = await getPublicProductsForSeo();

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
  xml += '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';

  // 1. Homepage
  xml += '  <url>\n';
  xml += `    <loc>${baseUrl}/</loc>\n`;
  xml += `    <lastmod>${now}</lastmod>\n`;
  xml += '    <changefreq>daily</changefreq>\n';
  xml += '    <priority>1.0</priority>\n';
  xml += '  </url>\n';

  // 2. High-Intent Category & Sacred Guide Landing Pages
  for (const [path, meta] of Object.entries(CATEGORIES_SEO_REGISTRY)) {
    xml += '  <url>\n';
    xml += `    <loc>${baseUrl}${path}</loc>\n`;
    xml += `    <lastmod>${now}</lastmod>\n`;
    xml += `    <changefreq>${meta.changefreq || "weekly"}</changefreq>\n`;
    xml += `    <priority>${meta.priority || "0.8"}</priority>\n`;
    xml += '  </url>\n';
  }

  // 3. Dynamic Products from MongoDB / Catalog
  for (const p of products) {
    const slugOrId = p.slug || p.id;
    const prodUrl = `${baseUrl}/product/${slugOrId}`;
    const lastMod = p.updatedAt ? new Date(p.updatedAt).toISOString() : now;
    const imgUrl = (p.images && p.images[0]) || p.img || SEO_BRAND.defaultImage;
    const fullImgUrl = imgUrl.startsWith("http") ? imgUrl : `${baseUrl}${imgUrl.startsWith("/") ? "" : "/"}${imgUrl}`;

    xml += '  <url>\n';
    xml += `    <loc>${escapeXml(prodUrl)}</loc>\n`;
    xml += `    <lastmod>${lastMod}</lastmod>\n`;
    xml += '    <changefreq>daily</changefreq>\n';
    xml += '    <priority>0.9</priority>\n';
    if (fullImgUrl) {
      xml += '    <image:image>\n';
      xml += `      <image:loc>${escapeXml(fullImgUrl)}</image:loc>\n`;
      xml += `      <image:title>${escapeXml(p.name)}</image:title>\n`;
      xml += '    </image:image>\n';
    }
    xml += '  </url>\n';
  }

  xml += '</urlset>';
  return xml;
}

/**
 * Generate Google Merchant Center Product Feed XML (RSS 2.0 with g: namespace)
 */
export async function generateMerchantFeedXml(req) {
  const baseUrl = getSiteBaseUrl(req);
  const products = await getPublicProductsForSeo();

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n';
  xml += '  <channel>\n';
  xml += '    <title>Aura Rudraksha Products</title>\n';
  xml += `    <link>${baseUrl}</link>\n`;
  xml += '    <description>Authentic Lab-Certified Nepali &amp; Indonesian Rudraksha Beads and Japa Malas</description>\n';

  for (const p of products) {
    const slugOrId = p.slug || p.id;
    const prodUrl = `${baseUrl}/product/${slugOrId}`;
    const imgUrl = (p.images && p.images[0]) || p.img || SEO_BRAND.defaultImage;
    const fullImgUrl = imgUrl.startsWith("http") ? imgUrl : `${baseUrl}${imgUrl.startsWith("/") ? "" : "/"}${imgUrl}`;
    const inStock = (p.stock === undefined || Number(p.stock) > 0) && p.status !== "Out of Stock";
    const priceVal = Number(p.price) || 0;
    const desc = p.description || p.highlight || `${p.name} - 100% authentic energized sacred Rudraksha bead with lab certificate.`;
    const cleanDesc = desc.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

    xml += '    <item>\n';
    xml += `      <g:id>${escapeXml(String(p.id))}</g:id>\n`;
    xml += `      <g:title>${escapeXml(p.name)}</g:title>\n`;
    xml += `      <g:description>${escapeXml(cleanDesc.slice(0, 5000))}</g:description>\n`;
    xml += `      <g:link>${escapeXml(prodUrl)}</g:link>\n`;
    xml += `      <g:image_link>${escapeXml(fullImgUrl)}</g:image_link>\n`;
    xml += `      <g:condition>new</g:condition>\n`;
    xml += `      <g:availability>${inStock ? "in_stock" : "out_of_stock"}</g:availability>\n`;
    xml += `      <g:price>${priceVal.toFixed(2)} INR</g:price>\n`;
    xml += `      <g:brand>${escapeXml(SEO_BRAND.name)}</g:brand>\n`;
    xml += `      <g:google_product_category>505374</g:google_product_category>\n`;
    xml += `      <g:product_type>Religious &amp; Ceremonial &gt; Rudraksha Beads</g:product_type>\n`;
    xml += `      <g:identifier_exists>no</g:identifier_exists>\n`;
    xml += '      <g:shipping>\n';
    xml += '        <g:country>IN</g:country>\n';
    xml += '        <g:service>Standard</g:service>\n';
    xml += `        <g:price>${(p.shippingFee || 0).toFixed(2)} INR</g:price>\n`;
    xml += '      </g:shipping>\n';
    xml += '    </item>\n';
  }

  xml += '  </channel>\n';
  xml += '</rss>';
  return xml;
}

/**
 * Generate Robots.txt content
 */
export function generateRobotsTxt(req) {
  const baseUrl = getSiteBaseUrl(req);
  return `User-agent: *
Allow: /
Disallow: /admin
Disallow: /account
Disallow: /checkout
Disallow: /cart
Disallow: /orders
Disallow: /payment
Disallow: /api/

Sitemap: ${baseUrl}/sitemap.xml
`;
}

/**
 * Resolve full SEO metadata for a requested path
 */
export async function resolveSeoData(pathname, req) {
  const baseUrl = getSiteBaseUrl(req);
  const cleanPath = pathname.split("?")[0].replace(/\/+$/, "") || "/";

  // Check if private route requiring noindex
  if (
    cleanPath.startsWith("/admin") ||
    cleanPath.startsWith("/account") ||
    cleanPath.startsWith("/cart") ||
    cleanPath.startsWith("/checkout") ||
    cleanPath.startsWith("/payment") ||
    cleanPath.startsWith("/login")
  ) {
    return {
      noindex: true,
      title: "Secure Portal | Aura Rudraksha",
      description: "Secure account and order checkout at Aura Rudraksha.",
      canonical: `${baseUrl}${cleanPath}`
    };
  }

  // 1. Homepage
  if (cleanPath === "/") {
    const schemas = [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": SEO_BRAND.name,
        "alternateName": "Aura Rudraksha Official Store",
        "url": baseUrl,
        "potentialAction": {
          "@type": "SearchAction",
          "target": `${baseUrl}/shop?q={search_term_string}`,
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": SEO_BRAND.name,
        "legalName": SEO_BRAND.legalName,
        "url": baseUrl,
        "logo": SEO_BRAND.logo,
        "image": SEO_BRAND.defaultImage,
        "contactPoint": {
          "@type": "ContactPoint",
          "telephone": SEO_BRAND.supportPhone,
          "contactType": "customer service",
          "areaServed": "IN",
          "availableLanguage": ["en", "hi"]
        },
        "sameAs": SEO_BRAND.socials
      }
    ];

    return {
      title: "Aura Rudraksha — 100% Authentic Nepal & Indonesian Rudraksha | Lab Certified",
      description: "Discover genuine lab-tested Nepali Rudraksha beads (1 to 21 Mukhi), consecrated 108+1 Japa Malas, and protective Vedic wristlets. Free nationwide shipping & authentic certificates.",
      canonical: `${baseUrl}/`,
      ogImage: SEO_BRAND.defaultImage,
      ogType: "website",
      schemas,
      h1: "Authentic Sacred Nepali & Indonesian Rudraksha",
      leadText: "Consecrated Himalayan power seeds and Vedic Japa Malas, energized for peace, health, and spiritual protection."
    };
  }

  // 2. Product Route (/product/:id or /product/:slug)
  if (cleanPath.startsWith("/product/")) {
    const slugOrId = cleanPath.replace("/product/", "").split("/")[0];
    const product = await findProductForSeo(slugOrId);

    if (product) {
      const isDraftOrInactive = ["Draft", "draft", "Inactive", "inactive", "Archived", "archived"].includes(product.status);
      if (isDraftOrInactive) {
        return {
          noindex: true,
          title: "Product Unavailable | Aura Rudraksha",
          description: "This product is currently inactive or unavailable.",
          canonical: `${baseUrl}/product/${product.slug || product.id}`
        };
      }

      const canonical = `${baseUrl}/product/${product.slug || product.id}`;
      const imgRaw = (product.images && product.images[0]) || product.img || SEO_BRAND.defaultImage;
      const ogImage = imgRaw.startsWith("http") ? imgRaw : `${baseUrl}${imgRaw.startsWith("/") ? "" : "/"}${imgRaw}`;
      const inStock = (product.stock === undefined || Number(product.stock) > 0) && product.status !== "Out of Stock";
      const priceVal = Number(product.price) || 0;

      const title = product.metaTitle || `${product.name} — Authentic Lab Certified | Aura Rudraksha`;
      const cleanHighlight = (product.highlight || product.description || "100% authentic Nepali Rudraksha bead consecrated according to Vedic traditions.")
        .replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      const description = product.metaDescription || `${cleanHighlight.slice(0, 150)} Free shipping & certificate included.`;

      // Product Schema
      const productSchema = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": product.name,
        "image": ogImage,
        "description": cleanHighlight.slice(0, 500),
        "sku": String(product.id),
        "brand": {
          "@type": "Brand",
          "name": SEO_BRAND.name
        },
        "category": product.category || "Rudraksha",
        "offers": {
          "@type": "Offer",
          "url": canonical,
          "priceCurrency": "INR",
          "price": priceVal,
          "availability": inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          "itemCondition": "https://schema.org/NewCondition",
          "seller": {
            "@type": "Organization",
            "name": SEO_BRAND.name
          }
        }
      };

      // Only attach aggregateRating if real devotee reviews exist
      if (product.reviewCount && Number(product.reviewCount) > 0 && product.rating) {
        productSchema.aggregateRating = {
          "@type": "AggregateRating",
          "ratingValue": Number(product.rating).toFixed(1),
          "reviewCount": Number(product.reviewCount)
        };
      }

      // BreadcrumbList
      const breadcrumbsSchema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": `${baseUrl}/` },
          { "@type": "ListItem", "position": 2, "name": product.category || "Shop", "item": `${baseUrl}/shop` },
          { "@type": "ListItem", "position": 3, "name": product.name, "item": canonical }
        ]
      };

      return {
        title,
        description,
        canonical,
        ogImage,
        ogType: "product",
        schemas: [productSchema, breadcrumbsSchema],
        h1: product.name,
        leadText: cleanHighlight,
        product
      };
    } else {
      return {
        noindex: true,
        title: "Product Not Found | Aura Rudraksha",
        description: "The requested sacred Rudraksha product could not be found.",
        canonical: `${baseUrl}${cleanPath}`
      };
    }
  }

  // 3. Category & Guide Route in registry
  if (CATEGORIES_SEO_REGISTRY[cleanPath]) {
    const meta = CATEGORIES_SEO_REGISTRY[cleanPath];
    const canonical = `${baseUrl}${cleanPath}`;
    const schemas = [];

    // Breadcrumbs
    if (meta.breadcrumbs && meta.breadcrumbs.length > 0) {
      schemas.push({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": meta.breadcrumbs.map((b, idx) => ({
          "@type": "ListItem",
          "position": idx + 1,
          "name": b.name,
          "item": `${baseUrl}${b.path}`
        }))
      });
    }

    // FAQ Page Schema
    if (meta.faqs && meta.faqs.length > 0) {
      schemas.push({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": meta.faqs.map(f => ({
          "@type": "Question",
          "name": f.q,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": f.a
          }
        }))
      });
    }

    // Collection / ItemList Schema
    schemas.push({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": meta.h1,
      "description": meta.description,
      "url": canonical,
      "publisher": {
        "@type": "Organization",
        "name": SEO_BRAND.name,
        "logo": SEO_BRAND.logo
      }
    });

    return {
      title: meta.title,
      description: meta.description,
      canonical,
      ogImage: SEO_BRAND.defaultImage,
      ogType: "website",
      schemas,
      h1: meta.h1,
      leadText: meta.intro,
      faqs: meta.faqs
    };
  }

  // Default fallback for any other public route (e.g. /shop, /categories, etc.)
  return {
    title: "Aura Rudraksha — 100% Authentic Nepal & Indonesian Rudraksha",
    description: "Discover genuine lab-tested Nepali Rudraksha beads (1 to 21 Mukhi), consecrated 108+1 Japa Malas, and protective Vedic wristlets.",
    canonical: `${baseUrl}${cleanPath}`,
    ogImage: SEO_BRAND.defaultImage,
    ogType: "website",
    schemas: [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": SEO_BRAND.name,
        "url": baseUrl
      }
    ],
    h1: "Sacred Rudraksha Store",
    leadText: "100% Authentic Lab Certified Rudraksha Beads from Nepal and Indonesia."
  };
}

/**
 * Server-Side HTML Metadata Injection
 * Replaces placeholder metadata in template with dynamic route-specific metadata and JSON-LD
 */
export async function injectSeoIntoHtml(templateHtml, pathname, req) {
  const seo = await resolveSeoData(pathname, req);
  const baseUrl = getSiteBaseUrl(req);
  const googleSiteVerification = process.env.GOOGLE_SITE_VERIFICATION || "";

  let result = templateHtml;

  // 1. Title Tag
  const titleTag = `<title>${escapeXml(seo.title)}</title>`;
  if (result.includes("<title>")) {
    result = result.replace(/<title>[\s\S]*?<\/title>/i, titleTag);
  } else {
    result = result.replace("</head>", `  ${titleTag}\n</head>`);
  }

  // 2. Head Tags Builder
  let headInjections = "";

  if (seo.noindex) {
    headInjections += `  <meta name="robots" content="noindex, nofollow" />\n`;
  } else {
    headInjections += `  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />\n`;
  }

  if (seo.canonical) {
    headInjections += `  <link rel="canonical" href="${escapeXml(seo.canonical)}" />\n`;
  }

  if (googleSiteVerification) {
    headInjections += `  <meta name="google-site-verification" content="${escapeXml(googleSiteVerification)}" />\n`;
  }

  // OpenGraph Tags
  const safeOgImage = escapeXml(seo.ogImage || SEO_BRAND.defaultImage);
  headInjections += `  <meta property="og:site_name" content="${escapeXml(SEO_BRAND.name)}" />\n`;
  headInjections += `  <meta property="og:type" content="${escapeXml(seo.ogType || "website")}" />\n`;
  headInjections += `  <meta property="og:title" content="${escapeXml(seo.title)}" />\n`;
  headInjections += `  <meta property="og:description" content="${escapeXml(seo.description)}" />\n`;
  headInjections += `  <meta property="og:url" content="${escapeXml(seo.canonical || baseUrl)}" />\n`;
  headInjections += `  <meta property="og:image" content="${safeOgImage}" />\n`;
  headInjections += `  <meta property="og:image:secure_url" content="${safeOgImage}" />\n`;
  headInjections += `  <meta property="og:image:alt" content="${escapeXml(seo.title)}" />\n`;
  headInjections += `  <meta property="og:image:width" content="1200" />\n`;
  headInjections += `  <meta property="og:image:height" content="630" />\n`;

  // Twitter Tags
  headInjections += `  <meta name="twitter:card" content="summary_large_image" />\n`;
  headInjections += `  <meta name="twitter:title" content="${escapeXml(seo.title)}" />\n`;
  headInjections += `  <meta name="twitter:description" content="${escapeXml(seo.description)}" />\n`;
  headInjections += `  <meta name="twitter:image" content="${safeOgImage}" />\n`;

  // Structured Data (JSON-LD)
  if (seo.schemas && seo.schemas.length > 0) {
    for (const schema of seo.schemas) {
      headInjections += `  <script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n  </script>\n`;
    }
  }

  // Replace existing generic meta description, og tags
  result = result.replace(/<meta\s+name=["']description["'][^>]*>/gi, `<meta name="description" content="${escapeXml(seo.description)}" />`);
  result = result.replace(/<meta\s+property=["']og:title["'][^>]*>/gi, "");
  result = result.replace(/<meta\s+property=["']og:description["'][^>]*>/gi, "");
  result = result.replace(/<meta\s+property=["']og:type["'][^>]*>/gi, "");
  result = result.replace(/<meta\s+property=["']og:image["'][^>]*>/gi, "");
  result = result.replace(/<meta\s+name=["']twitter:card["'][^>]*>/gi, "");
  result = result.replace(/<link\s+rel=["']canonical["'][^>]*>/gi, "");

  // Inject assembled tags right before </head>
  result = result.replace("</head>", `${headInjections}</head>`);

  // 3. Pre-render Crawlable Semantic HTML inside <div id="root"></div> for non-JS search crawlers
  // When React mounts, hydrate or render will replace this cleanly.
  if (seo.h1 && !seo.noindex) {
    let crawlableHtml = `<div id="root">\n  <div style="font-family:serif;max-width:900px;margin:40px auto;padding:0 20px;color:#2a160d;">\n`;
    crawlableHtml += `    <header>\n      <p style="text-transform:uppercase;font-size:12px;color:#8c3e1e;letter-spacing:1px;">${escapeXml(SEO_BRAND.name)} — Sacred Vedic Collection</p>\n`;
    crawlableHtml += `      <h1 style="font-size:32px;margin:8px 0;">${escapeXml(seo.h1)}</h1>\n`;
    if (seo.leadText) {
      crawlableHtml += `      <p style="font-size:16px;line-height:1.6;color:#5c493d;">${escapeXml(seo.leadText)}</p>\n`;
    }
    crawlableHtml += `    </header>\n`;

    if (seo.product) {
      const p = seo.product;
      crawlableHtml += `    <section style="margin-top:24px;padding:20px;border:1px solid #ebdccb;border-radius:8px;">\n`;
      crawlableHtml += `      <p><strong>Price:</strong> ₹${p.price} <span style="text-decoration:line-through;color:#888;">₹${p.mrp || p.comparePrice}</span></p>\n`;
      crawlableHtml += `      <p><strong>Authenticity:</strong> 100% Genuine Lab Certified</p>\n`;
      crawlableHtml += `      <p><strong>Origin:</strong> ${escapeXml(p.origin || "Nepal")}</p>\n`;
      crawlableHtml += `      <p><strong>Availability:</strong> ${(p.stock > 0 ? "In Stock" : "Out of Stock")}</p>\n`;
      crawlableHtml += `    </section>\n`;
    }

    if (seo.faqs && seo.faqs.length > 0) {
      crawlableHtml += `    <section style="margin-top:32px;">\n      <h2 style="font-size:22px;border-bottom:1px solid #ebdccb;padding-bottom:8px;">Frequently Asked Vedic Questions</h2>\n`;
      for (const faq of seo.faqs) {
        crawlableHtml += `      <article style="margin:16px 0;">\n        <h3 style="font-size:16px;color:#8c3e1e;">${escapeXml(faq.q)}</h3>\n        <p style="font-size:14px;color:#555;line-height:1.5;">${escapeXml(faq.a)}</p>\n      </article>\n`;
      }
      crawlableHtml += `    </section>\n`;
    }

    crawlableHtml += `  </div>\n</div>`;
    result = result.replace('<div id="root"></div>', crawlableHtml);
  }

  return result;
}
