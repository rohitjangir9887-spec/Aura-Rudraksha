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

import fs from "fs";
import path from "path";
import { isDbConnected } from "../config/db.js";
import { Product } from "../models/Product.js";
import { Setting } from "../models/Setting.js";
import { Review } from "../models/Review.js";
import { defaultProducts } from "../data/defaultData.js";
import { VEDIC_BEADS_KNOWLEDGE } from "./vedicKnowledgeService.js";
import { getSiteBaseUrl } from "./indexNowService.js";

// Canonical Organization & Brand Details
export const SEO_BRAND = {
  name: "Aura Rudraksha",
  legalName: "Aura Rudraksha Enterprises",
  logo: "https://aurarudraksha.bond/icon-512.png",
  defaultImage: "https://aurarudraksha.bond/og-image.jpg",
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
    description: "Buy authentic, large-sized Nepali Rudraksha beads directly harvested from Himalayan foothills with distinct natural mukhi lines and lab certificate.",
    categoryName: "Nepali Rudraksha",
    changefreq: "weekly",
    priority: "0.85",
    breadcrumbs: [
      { name: "Home", path: "/" },
      { name: "Rudraksha", path: "/rudraksha" },
      { name: "Nepali Origin", path: "/rudraksha/nepali" }
    ],
    intro: "Nepali Rudraksha beads grow naturally in the high altitudes of the Himalayan foothills. Revered in Vedic scriptures for their prominent size, deep natural grooves, and sacred energy.",
    faqs: [
      { q: "Why are Nepali Rudraksha beads considered special in Vedic tradition?", a: "Nepali beads have naturally larger sizes (18mm to 28mm), pronounced thorny surfaces, and clearly formed internal seed chambers that symbolize sacred Shiva energy in ancient texts." },
      { q: "Do Nepali Rudraksha beads come with authenticity certificates?", a: "Yes. Every single Nepali Rudraksha bead from Aura Rudraksha is tested and certified by independent gemological laboratories." }
    ]
  },
  "/rudraksha/indonesian": {
    h1: "Indonesian Java Rudraksha Beads (Small & Smooth)",
    title: "Indonesian Java Rudraksha Beads — Sacred Spiritual Beads | Aura Rudraksha",
    description: "Explore genuine Indonesian / Java Rudraksha beads. Lightweight, smooth-textured, comfortable for daily wear and ideal for 108+1 Japa meditation malas.",
    categoryName: "Indonesian Rudraksha",
    changefreq: "weekly",
    priority: "0.8",
    breadcrumbs: [
      { name: "Home", path: "/" },
      { name: "Rudraksha", path: "/rudraksha" },
      { name: "Indonesian Origin", path: "/rudraksha/indonesian" }
    ],
    intro: "Java beads originate from Indonesia. Characterized by a smoother texture, compact diameter (6mm to 12mm), and subtle spiritual elegance, they are especially comfortable for daily wear and Japa malas.",
    faqs: [
      { q: "Are Indonesian Rudraksha beads genuine?", a: "Yes. Elaeocarpus ganitrus trees growing in Java, Indonesia produce naturally formed Rudraksha beads with authentic mukhi lines and seed chambers." }
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
    intro: "A sacred 108+1 Rudraksha Mala is the traditional rosary for Vedic chanting and mental stillness. The 108 beads represent the sacred cosmic cycle, guided by the 1 Sumeru bead.",
    faqs: [
      { q: "Why are there 108+1 beads in a Rudraksha Mala?", a: "The 108 beads signify the sacred repetition of divine mantras and cosmic harmony. The 109th bead is the Bindu or Sumeru, symbolizing gratitude and spiritual completion." }
    ]
  },
  "/rudraksha/bracelets": {
    h1: "Consecrated Rudraksha Bracelets & Silver Wristlets",
    title: "Consecrated Rudraksha Bracelets & Wristlets | Aura Rudraksha",
    description: "Sacred Rudraksha bracelets crafted in sterling silver capping, Panchdhatu, and natural beads for daily spiritual grounding and peace.",
    categoryName: "Bracelets",
    changefreq: "weekly",
    priority: "0.8",
    breadcrumbs: [
      { name: "Home", path: "/" },
      { name: "Rudraksha", path: "/rudraksha" },
      { name: "Bracelets", path: "/rudraksha/bracelets" }
    ],
    intro: "Wearing Rudraksha on the wrist is a revered Vedic practice for maintaining continuous spiritual remembrance, peace of mind, and personal positive aura."
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
    intro: "Proper consecration and respectful wearing of Rudraksha aligns with sacred Vedic tradition. Follow this authentic step-by-step guide for purification, mantra chanting, and daily care.",
    faqs: [
      { q: "Which day is best to wear Rudraksha for the first time?", a: "Monday morning during Brahma Muhurta, or on auspicious lunar days like Pradosh, Masik Shivratri, or Shravan month Mondays." },
      { q: "Can we wear Rudraksha while sleeping or bathing?", a: "It is recommended to remove Rudraksha before sleeping or taking a soap/chemical bath to prevent bead damage and maintain physical purity." }
    ]
  },
  "/rudraksha-benefits": {
    h1: "Rudraksha Benefits — Sacred Spiritual Significance & Vedic Lore",
    title: "Rudraksha Benefits — Spiritual Significance & Vedic Lore | Aura Rudraksha",
    description: "Discover the spiritual, meditative, and astrological significance of wearing Rudraksha according to Shiva Purana, Padma Purana, and Vedic traditions.",
    categoryName: "Spiritual Guide",
    changefreq: "monthly",
    priority: "0.8",
    breadcrumbs: [
      { name: "Home", path: "/" },
      { name: "Rudraksha Benefits", path: "/rudraksha-benefits" }
    ],
    intro: "In ancient Vedic scriptures like the Shiva Purana and Srimad Devi Bhagavatam, Rudraksha is celebrated as a divine gift of Lord Shiva, providing mental calmness, focus during meditation, and positive aura.",
    faqs: [
      { q: "What are the spiritual benefits of wearing Rudraksha according to scriptures?", a: "Vedic texts state that wearing authentic Rudraksha assists in spiritual discipline, deepens meditation, pacifies mental restlessness, and helps balance planetary influences." }
    ]
  },
  "/rudraksha-authenticity": {
    h1: "Rudraksha Authenticity & Lab Testing Guide — Real vs Fake",
    title: "Rudraksha Authenticity & Lab Testing Guide — Real vs Fake | Aura Rudraksha",
    description: "How to identify genuine Rudraksha: laboratory X-ray radiography, internal seed compartments, natural mukhi continuity, and ISO gemological certification.",
    categoryName: "Authenticity Guide",
    changefreq: "monthly",
    priority: "0.8",
    breadcrumbs: [
      { name: "Home", path: "/" },
      { name: "Authenticity Guide", path: "/rudraksha-authenticity" }
    ],
    intro: "With the rise of carved wooden beads and glued artificial lines, authentic verification is crucial. Learn why laboratory X-ray radiography is the definitive proof of genuine Rudraksha.",
    faqs: [
      { q: "Is the copper coin rotation test reliable?", a: "No. Copper coin rotation happens due to surface moisture and slight hand tremors, not the bead's authenticity. Only laboratory X-ray radiography is scientific proof of internal seed chambers." },
      { q: "How does Aura Rudraksha guarantee purity?", a: "We test every rare bead in recognized gemological laboratories. Customers receive verifiable physical certificate cards with lab report numbers and QR codes." }
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
 * Resolves a product from an in-memory or seed catalog by ID, slug, or slugified name
 */
export function matchProductFromCatalog(catalog = [], idOrSlug) {
  if (!Array.isArray(catalog) || !idOrSlug) return null;
  let raw = String(idOrSlug).trim();
  try {
    raw = decodeURIComponent(raw);
  } catch (_) {}
  const target = raw.toLowerCase().replace(/^\/+|\/+$/g, "").split("?")[0];
  const cleanId = target.replace(/^(product-card-|product-)/, "");

  // 1. Direct exact match on id, _id, or slug
  let match = catalog.find(p => p && (
    String(p.id).toLowerCase() === target ||
    String(p.id).toLowerCase() === cleanId ||
    String(p._id || "").toLowerCase() === target ||
    (p.slug && String(p.slug).toLowerCase() === target)
  ));
  if (match) return match;

  // 2. Slugified name match (e.g. "5-mukhi-rudraksha" or "original-14-mukhi-rudraksha")
  match = catalog.find(p => {
    if (!p || !p.name) return false;
    const slugName = String(p.name).toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return slugName === target || slugName.startsWith(target) || target.startsWith(slugName);
  });
  if (match) return match;

  // 3. Mukhi number extraction (e.g. "5-mukhi", "5-mukhi-rudraksha" -> "5")
  const numMatch = target.match(/^(\d+)(?:-mukhi|$)/i) || target.match(/(\d+)-mukhi/i);
  if (numMatch && numMatch[1]) {
    const mukhiNum = numMatch[1];
    match = catalog.find(p => String(p.id) === mukhiNum || (p.slug && p.slug.includes(mukhiNum)));
    if (match) return match;
  }

  // 4. Keyword match for mala or special items
  if (target.includes("mala")) {
    match = catalog.find(p => String(p.id).toLowerCase() === "mala" || (p.name && p.name.toLowerCase().includes("mala")));
    if (match) return match;
  }

  return null;
}

/**
 * Find single product for SEO metadata by ID or Slug
 */
export async function findProductForSeo(idOrSlug) {
  if (!idOrSlug) return null;
  let raw = String(idOrSlug).trim();
  try {
    raw = decodeURIComponent(raw);
  } catch (_) {}
  const clean = raw.toLowerCase().replace(/^\/+|\/+$/g, "").split("?")[0];
  const cleanId = clean.replace(/^(product-card-|product-)/, "");

  if (isDbConnected()) {
    try {
      const isMongoId = /^[0-9a-fA-F]{24}$/.test(clean);
      const query = {
        $or: [
          { id: clean },
          { id: cleanId },
          { slug: clean },
          ...(isMongoId ? [{ _id: clean }] : [])
        ]
      };
      let product = await Product.findOne(query).lean();
      if (product) return product;

      // Match by numeric id e.g. "5-mukhi-rudraksha" -> id: "5"
      const numMatch = clean.match(/^(\d+)(?:-mukhi|$)/i) || clean.match(/(\d+)-mukhi/i);
      if (numMatch && numMatch[1]) {
        product = await Product.findOne({ id: numMatch[1] }).lean();
        if (product) return product;
      }
      if (clean.includes("mala")) {
        product = await Product.findOne({ id: "mala" }).lean();
        if (product) return product;
      }
      // Match by name regex
      const cleanWords = clean.replace(/[-_]+/g, " ").trim();
      if (cleanWords.length >= 3) {
        product = await Product.findOne({
          name: { $regex: new RegExp(cleanWords.replace(/\s+/g, ".*"), "i") }
        }).lean();
        if (product) return product;
      }
    } catch (err) {
      console.warn("[SEO] Notice in findProductForSeo DB query:", err.message);
    }
  }

  // Resilient fallback to defaultProducts catalog
  return matchProductFromCatalog(defaultProducts, clean);
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

  // 3. Dynamic Published Products from MongoDB / Catalog
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
 * Complies with Google Merchant Center feed specifications for Free Listings & Shopping Ads
 */
export async function generateMerchantFeedXml(req) {
  const baseUrl = getSiteBaseUrl(req);
  const products = await getPublicProductsForSeo();

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n';
  xml += '  <channel>\n';
  xml += '    <title>Aura Rudraksha — Authentic Lab Certified Rudraksha &amp; Malas</title>\n';
  xml += `    <link>${baseUrl}</link>\n`;
  xml += '    <description>100% Genuine Lab-Certified Nepali and Indonesian Rudraksha Beads, Consecrated Japa Malas, and Sacred Spiritual Items</description>\n';

  for (const p of products) {
    const slugOrId = p.slug || p.id;
    const prodUrl = `${baseUrl}/product/${slugOrId}`;
    const imgList = (Array.isArray(p.images) && p.images.length > 0) ? p.images : [p.img || SEO_BRAND.defaultImage];
    const primaryImg = imgList[0];
    const fullPrimaryImg = primaryImg.startsWith("http") ? primaryImg : `${baseUrl}${primaryImg.startsWith("/") ? "" : "/"}${primaryImg}`;
    const inStock = (p.stock === undefined || Number(p.stock) > 0) && p.status !== "Out of Stock";
    
    const priceVal = Number(p.price) || 0;
    const mrpVal = Number(p.mrp || p.comparePrice) || 0;
    const hasDiscount = mrpVal > priceVal;

    const desc = p.description || p.highlight || `${p.name} - 100% authentic energized sacred Rudraksha bead with lab certificate. Consecrated with holy Ganga Jal and Vedic Beej Mantras.`;
    const cleanDesc = desc.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

    // Clean, natural title for Google Shopping
    const title = p.name.includes("Aura") ? p.name : `${p.name} — Authentic Lab Certified`;

    xml += '    <item>\n';
    xml += `      <g:id>${escapeXml(String(p.id))}</g:id>\n`;
    xml += `      <g:title>${escapeXml(title.slice(0, 150))}</g:title>\n`;
    xml += `      <g:description>${escapeXml(cleanDesc.slice(0, 5000))}</g:description>\n`;
    xml += `      <g:link>${escapeXml(prodUrl)}</g:link>\n`;
    xml += `      <g:image_link>${escapeXml(fullPrimaryImg)}</g:image_link>\n`;

    // Additional gallery images
    if (imgList.length > 1) {
      for (let i = 1; i < Math.min(imgList.length, 6); i++) {
        const extraImg = imgList[i];
        if (extraImg) {
          const fullExtraImg = extraImg.startsWith("http") ? extraImg : `${baseUrl}${extraImg.startsWith("/") ? "" : "/"}${extraImg}`;
          xml += `      <g:additional_image_link>${escapeXml(fullExtraImg)}</g:additional_image_link>\n`;
        }
      }
    }

    xml += `      <g:condition>new</g:condition>\n`;
    xml += `      <g:availability>${inStock ? "in_stock" : "out_of_stock"}</g:availability>\n`;

    // Show strike-through compare price if discount exists
    if (hasDiscount) {
      xml += `      <g:price>${mrpVal.toFixed(2)} INR</g:price>\n`;
      xml += `      <g:sale_price>${priceVal.toFixed(2)} INR</g:sale_price>\n`;
    } else {
      xml += `      <g:price>${priceVal.toFixed(2)} INR</g:price>\n`;
    }

    xml += `      <g:brand>${escapeXml(SEO_BRAND.name)}</g:brand>\n`;
    xml += `      <g:google_product_category>505374</g:google_product_category>\n`;
    xml += `      <g:product_type>Religious &amp; Ceremonial &gt; Religious Items &gt; Rudraksha Beads</g:product_type>\n`;
    xml += `      <g:identifier_exists>no</g:identifier_exists>\n`;
    xml += `      <g:material>Natural Sacred Rudraksha Seed</g:material>\n`;
    xml += `      <g:country_of_origin>${p.origin?.toLowerCase().includes("indonesia") ? "ID" : "NP"}</g:country_of_origin>\n`;
    xml += '      <g:shipping>\n';
    xml += '        <g:country>IN</g:country>\n';
    xml += '        <g:service>Insured Express Delivery</g:service>\n';
    xml += '        <g:price>0.00 INR</g:price>\n';
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
Disallow: /admin/
Disallow: /account
Disallow: /account/
Disallow: /checkout
Disallow: /checkout/
Disallow: /cart
Disallow: /cart/
Disallow: /orders
Disallow: /orders/
Disallow: /payment
Disallow: /payment/
Disallow: /login
Disallow: /register
Disallow: /profile
Disallow: /wishlist
Disallow: /customer
Disallow: /customer/
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

  // Check if private route requiring noindex, nofollow
  if (
    cleanPath.startsWith("/admin") ||
    cleanPath.startsWith("/account") ||
    cleanPath.startsWith("/cart") ||
    cleanPath.startsWith("/checkout") ||
    cleanPath.startsWith("/payment") ||
    cleanPath.startsWith("/orders") ||
    cleanPath.startsWith("/profile") ||
    cleanPath.startsWith("/wishlist") ||
    cleanPath.startsWith("/customer") ||
    cleanPath === "/login" ||
    cleanPath === "/register"
  ) {
    return {
      noindex: true,
      title: "Aura Rudraksha — Sacred Vedic Store",
      description: "Secure customer and administrative portal.",
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
      const imgList = (Array.isArray(product.images) && product.images.length > 0) ? product.images : [product.img || SEO_BRAND.defaultImage];
      const imageArray = imgList.map(img => img.startsWith("http") ? img : `${baseUrl}${img.startsWith("/") ? "" : "/"}${img}`);
      const ogImage = imageArray[0] || SEO_BRAND.defaultImage;
      const inStock = (product.stock === undefined || Number(product.stock) > 0) && product.status !== "Out of Stock";
      const rawPrice = product.price !== undefined && product.price !== null ? Number(product.price) : null;
      const hasValidPrice = typeof rawPrice === "number" && !isNaN(rawPrice) && rawPrice > 0;

      const title = product.metaTitle || `${product.name} — Authentic Lab Certified | Aura Rudraksha`;
      const cleanHighlight = (product.highlight || product.description || "100% authentic Nepali Rudraksha bead consecrated according to Vedic traditions with authentic government approved lab testing certification.")
        .replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      const description = product.metaDescription || `${cleanHighlight.slice(0, 160)} 100% genuine lab certificate & free insured shipping across India.`;

      // Full Google Merchant Listing Product Structured Data
      const offersObj = {
        "@type": "Offer",
        "url": canonical,
        "priceCurrency": "INR",
        "price": hasValidPrice ? rawPrice : 0,
        "priceValidUntil": "2027-12-31",
        "availability": inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        "itemCondition": "https://schema.org/NewCondition",
        "seller": {
          "@type": "Organization",
          "name": SEO_BRAND.name,
          "url": baseUrl
        },
        "hasMerchantReturnPolicy": {
          "@type": "MerchantReturnPolicy",
          "applicableCountry": "IN",
          "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
          "merchantReturnDays": 7,
          "returnMethod": "https://schema.org/ReturnByMail",
          "returnFees": "https://schema.org/FreeReturn"
        },
        "shippingDetails": {
          "@type": "OfferShippingDetails",
          "shippingRate": {
            "@type": "MonetaryAmount",
            "value": 0,
            "currency": "INR"
          },
          "shippingDestination": {
            "@type": "DefinedRegion",
            "addressCountry": "IN"
          },
          "deliveryTime": {
            "@type": "ShippingDeliveryTime",
            "handlingTime": {
              "@type": "QuantitativeValue",
              "minValue": 1,
              "maxValue": 2,
              "unitCode": "d"
            },
            "transitTime": {
              "@type": "QuantitativeValue",
              "minValue": 3,
              "maxValue": 5,
              "unitCode": "d"
            }
          }
        }
      };

      const productSchema = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": product.name,
        "image": imageArray,
        "description": cleanHighlight.slice(0, 1000),
        "sku": String(product.id),
        "mpn": String(product.id),
        "brand": {
          "@type": "Brand",
          "name": SEO_BRAND.name
        },
        "category": product.category || "Religious & Ceremonial Goods > Religious Items > Rudraksha",
        "offers": offersObj
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
          { "@type": "ListItem", "position": 2, "name": product.category || "Rudraksha", "item": `${baseUrl}/shop` },
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

  // OpenGraph Tags formatted for WhatsApp, Facebook, Telegram, iMessage
  let rawOgImage = seo.ogImage || SEO_BRAND.defaultImage;
  if (rawOgImage && !rawOgImage.startsWith("http")) {
    rawOgImage = `${baseUrl}${rawOgImage.startsWith("/") ? "" : "/"}${rawOgImage}`;
  }
  const safeOgImage = escapeXml(rawOgImage || SEO_BRAND.defaultImage);
  const isPng = safeOgImage.toLowerCase().endsWith(".png");
  const imageMimeType = isPng ? "image/png" : "image/jpeg";

  headInjections += `  <meta property="og:site_name" content="${escapeXml(SEO_BRAND.name)}" />\n`;
  headInjections += `  <meta property="og:type" content="${escapeXml(seo.ogType || "website")}" />\n`;
  headInjections += `  <meta property="og:title" content="${escapeXml(seo.title)}" />\n`;
  headInjections += `  <meta property="og:description" content="${escapeXml(seo.description)}" />\n`;
  headInjections += `  <meta property="og:url" content="${escapeXml(seo.canonical || baseUrl)}" />\n`;
  headInjections += `  <meta property="og:image" content="${safeOgImage}" />\n`;
  headInjections += `  <meta property="og:image:secure_url" content="${safeOgImage}" />\n`;
  headInjections += `  <meta property="og:image:type" content="${imageMimeType}" />\n`;
  headInjections += `  <meta property="og:image:width" content="1200" />\n`;
  headInjections += `  <meta property="og:image:height" content="630" />\n`;
  headInjections += `  <meta property="og:image:alt" content="${escapeXml(seo.title)}" />\n`;
  headInjections += `  <link rel="image_src" href="${safeOgImage}" />\n`;
  headInjections += `  <meta itemprop="name" content="${escapeXml(seo.title)}" />\n`;
  headInjections += `  <meta itemprop="description" content="${escapeXml(seo.description)}" />\n`;
  headInjections += `  <meta itemprop="image" content="${safeOgImage}" />\n`;

  // Twitter Tags
  headInjections += `  <meta name="twitter:card" content="summary_large_image" />\n`;
  headInjections += `  <meta name="twitter:site" content="@aurarudraksha" />\n`;
  headInjections += `  <meta name="twitter:title" content="${escapeXml(seo.title)}" />\n`;
  headInjections += `  <meta name="twitter:description" content="${escapeXml(seo.description)}" />\n`;
  headInjections += `  <meta name="twitter:image" content="${safeOgImage}" />\n`;

  // Structured Data (JSON-LD)
  if (seo.schemas && seo.schemas.length > 0) {
    for (const schema of seo.schemas) {
      headInjections += `  <script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n  </script>\n`;
    }
  }

  // Replace existing generic meta description, og tags, and static template JSON-LD
  result = result.replace(/<meta\s+name=["']description["'][^>]*>/gi, `<meta name="description" content="${escapeXml(seo.description)}" />`);
  result = result.replace(/<meta\s+property=["']og:[^"']+["'][^>]*>/gi, "");
  result = result.replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*>/gi, "");
  result = result.replace(/<link\s+rel=["']canonical["'][^>]*>/gi, "");
  result = result.replace(/<link\s+rel=["']image_src["'][^>]*>/gi, "");
  result = result.replace(/<meta\s+itemprop=["']image["'][^>]*>/gi, "");
  result = result.replace(/<script\s+type=["']application\/ld\+json["']>[\s\S]*?<\/script>/gi, "");

  // Inject assembled tags near the top of <head> right after viewport for fast crawler ingestion
  if (result.includes('name="viewport"')) {
    result = result.replace(/(<meta\s+name=["']viewport["'][^>]*>)/i, `$1\n${headInjections}`);
  } else {
    result = result.replace("<head>", `<head>\n${headInjections}`);
  }

  // 3. Pre-render Crawlable Semantic HTML inside <div id="root"></div> for non-JS search crawlers
  // When React mounts, hydrate or render will replace this cleanly.
  if (seo.h1 && !seo.noindex) {
    let crawlableHtml = `<div id="root">\n  <main style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:960px;margin:30px auto;padding:0 24px;color:#1a100b;line-height:1.6;">\n`;
    
    // Breadcrumbs nav
    crawlableHtml += `    <nav aria-label="Breadcrumb" style="font-size:14px;color:#786254;margin-bottom:20px;">\n`;
    crawlableHtml += `      <a href="${baseUrl}/" style="color:#8c3e1e;text-decoration:none;">Home</a> &gt; \n`;
    if (seo.product) {
      crawlableHtml += `      <a href="${baseUrl}/shop" style="color:#8c3e1e;text-decoration:none;">Rudraksha</a> &gt; \n`;
      crawlableHtml += `      <span>${escapeXml(seo.product.name)}</span>\n`;
    } else {
      crawlableHtml += `      <span>${escapeXml(seo.h1)}</span>\n`;
    }
    crawlableHtml += `    </nav>\n`;

    crawlableHtml += `    <header style="margin-bottom:24px;">\n`;
    crawlableHtml += `      <p style="text-transform:uppercase;font-size:12px;font-weight:700;color:#8c3e1e;letter-spacing:1.5px;margin-bottom:6px;">${escapeXml(SEO_BRAND.name)} — 100% Genuine Lab Certified</p>\n`;
    crawlableHtml += `      <h1 style="font-size:32px;font-weight:700;margin:0 0 12px 0;line-height:1.25;color:#2a160d;">${escapeXml(seo.h1)}</h1>\n`;
    if (seo.leadText) {
      crawlableHtml += `      <p style="font-size:16px;color:#4a3b32;margin:0;">${escapeXml(seo.leadText)}</p>\n`;
    }
    crawlableHtml += `    </header>\n`;

    if (seo.product) {
      const p = seo.product;
      const rawP = p.price !== undefined && p.price !== null ? Number(p.price) : null;
      const hasP = typeof rawP === "number" && !isNaN(rawP) && rawP > 0;
      const rawMrp = Number(p.mrp || p.comparePrice) || 0;
      const inStock = (p.stock === undefined || Number(p.stock) > 0) && p.status !== "Out of Stock";
      const primaryImg = (p.images && p.images[0]) || p.img || SEO_BRAND.defaultImage;
      const fullImg = primaryImg.startsWith("http") ? primaryImg : `${baseUrl}${primaryImg.startsWith("/") ? "" : "/"}${primaryImg}`;

      crawlableHtml += `    <div style="display:flex;flex-wrap:wrap;gap:32px;margin:28px 0;background:#fff9f4;border:1px solid #ebdccb;border-radius:12px;padding:24px;">\n`;
      crawlableHtml += `      <div style="flex:1;min-width:280px;text-align:center;">\n`;
      crawlableHtml += `        <img src="${escapeXml(fullImg)}" alt="${escapeXml(p.name)}" width="360" height="360" style="max-width:100%;height:auto;border-radius:8px;object-fit:cover;box-shadow:0 4px 12px rgba(0,0,0,0.08);" />\n`;
      crawlableHtml += `      </div>\n`;

      crawlableHtml += `      <div style="flex:1.2;min-width:280px;">\n`;
      if (hasP) {
        crawlableHtml += `        <div style="margin-bottom:16px;">\n`;
        crawlableHtml += `          <span style="font-size:28px;font-weight:700;color:#1e4620;">₹${rawP.toLocaleString('en-IN')}</span>\n`;
        if (rawMrp > rawP) {
          crawlableHtml += `          <span style="text-decoration:line-through;color:#888;font-size:18px;margin-left:10px;">₹${rawMrp.toLocaleString('en-IN')}</span>\n`;
          crawlableHtml += `          <span style="background:#dc2626;color:#fff;font-size:12px;font-weight:700;padding:2px 8px;border-radius:4px;margin-left:10px;">${Math.round((rawMrp - rawP) / rawMrp * 100)}% OFF</span>\n`;
        }
        crawlableHtml += `        </div>\n`;
      }

      crawlableHtml += `        <p style="margin:8px 0;color:${inStock ? '#166534' : '#991b1b'};font-weight:600;">\n`;
      crawlableHtml += `          ● ${inStock ? 'In Stock — Dispatched within 24 Hours with Insurance' : 'Currently Out of Stock'}\n`;
      crawlableHtml += `        </p>\n`;

      crawlableHtml += `        <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">\n`;
      crawlableHtml += `          <tbody>\n`;
      if (p.mukhi) {
        crawlableHtml += `            <tr style="border-bottom:1px solid #ebdccb;"><td style="padding:6px 0;font-weight:600;color:#5c493d;">Mukhi / Face:</td><td style="padding:6px 0;">${escapeXml(p.mukhi)}</td></tr>\n`;
      }
      if (p.deity) {
        crawlableHtml += `            <tr style="border-bottom:1px solid #ebdccb;"><td style="padding:6px 0;font-weight:600;color:#5c493d;">Ruling Deity:</td><td style="padding:6px 0;">${escapeXml(p.deity)}</td></tr>\n`;
      }
      if (p.rulingPlanet) {
        crawlableHtml += `            <tr style="border-bottom:1px solid #ebdccb;"><td style="padding:6px 0;font-weight:600;color:#5c493d;">Ruling Planet:</td><td style="padding:6px 0;">${escapeXml(p.rulingPlanet)}</td></tr>\n`;
      }
      crawlableHtml += `            <tr style="border-bottom:1px solid #ebdccb;"><td style="padding:6px 0;font-weight:600;color:#5c493d;">Origin:</td><td style="padding:6px 0;">${escapeXml(p.origin || "100% Original Nepali")}</td></tr>\n`;
      crawlableHtml += `            <tr style="border-bottom:1px solid #ebdccb;"><td style="padding:6px 0;font-weight:600;color:#5c493d;">Authenticity:</td><td style="padding:6px 0;">Govt Approved Lab Tested &amp; Certified</td></tr>\n`;
      crawlableHtml += `            <tr><td style="padding:6px 0;font-weight:600;color:#5c493d;">Energization:</td><td style="padding:6px 0;">Pran Pratishtha with Ganga Jal &amp; Vedic Mantras</td></tr>\n`;
      crawlableHtml += `          </tbody>\n`;
      crawlableHtml += `        </table>\n`;

      crawlableHtml += `        <div style="margin-top:20px;">\n`;
      crawlableHtml += `          <a href="${escapeXml(seo.canonical || baseUrl)}" style="display:inline-block;background:#8c3e1e;color:#fff;font-weight:700;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:15px;">Order Authentic Bead Online</a>\n`;
      crawlableHtml += `          <a href="https://wa.me/919672996531?text=Jai%20Shree%20Ram%20I%20want%20to%20know%20about%20${encodeURIComponent(p.name)}" style="display:inline-block;margin-left:12px;background:#25d366;color:#fff;font-weight:700;padding:12px 20px;border-radius:6px;text-decoration:none;font-size:15px;">WhatsApp Consultation</a>\n`;
      crawlableHtml += `        </div>\n`;

      crawlableHtml += `      </div>\n`;
      crawlableHtml += `    </div>\n`;

      crawlableHtml += `    <section style="margin-top:32px;">\n`;
      crawlableHtml += `      <h2 style="font-size:22px;font-weight:700;color:#2a160d;border-bottom:2px solid #8c3e1e;padding-bottom:6px;margin-bottom:12px;">Product Details &amp; Sacred Vedic Benefits</h2>\n`;
      crawlableHtml += `      <p style="font-size:15px;line-height:1.7;color:#3d2f26;">${escapeXml(p.description || p.highlight || "Every Rudraksha from Aura Rudraksha is personally hand-selected from high-altitude Himalayan regions, verified under gemological testing, and energized according to authentic Vedic rituals.")}</p>\n`;
      crawlableHtml += `    </section>\n`;

      crawlableHtml += `    <section style="margin-top:28px;background:#f8f9fa;border:1px solid #e5e7eb;border-radius:8px;padding:18px;">\n`;
      crawlableHtml += `      <h3 style="font-size:16px;font-weight:700;color:#1f2937;margin:0 0 8px 0;">🛡️ Aura Rudraksha Trust &amp; Shipping Guarantee</h3>\n`;
      crawlableHtml += `      <p style="font-size:14px;color:#4b5563;margin:0 0 6px 0;">✓ <strong>Free Express Shipping:</strong> Fast insured delivery across India within 3–5 business days.</p>\n`;
      crawlableHtml += `      <p style="font-size:14px;color:#4b5563;margin:0 0 6px 0;">✓ <strong>Authenticity Lab Certificate:</strong> Physical identification card verifying bead density, natural seed lines, and purity.</p>\n`;
      crawlableHtml += `      <p style="font-size:14px;color:#4b5563;margin:0;">✓ <strong>7-Day Sacred Return Policy:</strong> 100% money-back guarantee if unsatisfied with the sanctified bead.</p>\n`;
      crawlableHtml += `    </section>\n`;
    }

    if (seo.faqs && seo.faqs.length > 0) {
      crawlableHtml += `    <section style="margin-top:36px;">\n      <h2 style="font-size:22px;font-weight:700;border-bottom:2px solid #8c3e1e;padding-bottom:6px;color:#2a160d;">Frequently Asked Vedic Questions</h2>\n`;
      for (const faq of seo.faqs) {
        crawlableHtml += `      <article style="margin:16px 0;">\n        <h3 style="font-size:16px;color:#8c3e1e;margin-bottom:4px;">${escapeXml(faq.q)}</h3>\n        <p style="font-size:14px;color:#4a3b32;line-height:1.6;margin:0;">${escapeXml(faq.a)}</p>\n      </article>\n`;
      }
      crawlableHtml += `    </section>\n`;
    }

    crawlableHtml += `  </main>\n</div>`;
    result = result.replace('<div id="root"></div>', crawlableHtml);
  }

  return result;
}

let cachedTemplate = "";

/**
 * Load HTML template from filesystem (dist/index.html or index.html) with embedded fallback
 */
export function getHtmlTemplate() {
  if (cachedTemplate) return cachedTemplate;

  const candidatePaths = [
    path.join(process.cwd(), "dist", "index.html"),
    path.join(process.cwd(), "index.html"),
    path.resolve("./dist/index.html"),
    path.resolve("./index.html")
  ];

  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, "utf-8");
        if (content && content.includes("<div id=\"root\"></div>")) {
          cachedTemplate = content;
          return cachedTemplate;
        }
      }
    } catch (_) {}
  }

  // Fallback base HTML if filesystem is not directly accessible
  cachedTemplate = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#6f3518" />
    <link rel="icon" type="image/x-icon" href="/favicon.ico?v=2" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=2" />
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png?v=2" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=2" />
    <link rel="manifest" href="/manifest.json?v=2" />
    <title>Aura Rudraksha — 100% Authentic Nepal &amp; Indonesian Rudraksha | Lab Certified</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`;

  return cachedTemplate;
}

export function setHtmlTemplate(html) {
  if (html && typeof html === "string") {
    cachedTemplate = html;
  }
}

/**
 * High-level SSR Renderer that returns injected HTML and proper HTTP status
 */
export async function renderSsrHtml(pathname, req, customTemplate = null) {
  const template = customTemplate || getHtmlTemplate();
  const seo = await resolveSeoData(pathname, req);
  const finalHtml = await injectSeoIntoHtml(template, pathname, req);
  const isNotFound = Boolean((seo.title && seo.title.includes("Product Not Found")) || (seo.noindex && pathname.startsWith("/product/")));
  const status = isNotFound ? 404 : 200;
  return { html: finalHtml, status, seo };
}

