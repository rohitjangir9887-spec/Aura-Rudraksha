export const defaultProducts = [
  {
    id: "14",
    name: "Original 14 Mukhi Rudraksha (Nepali) — Lab Certified Chaudah Mukhi Rudraksha",
    price: 36950,
    comparePrice: 59000,
    mrp: 59000,
    rating: 5.0,
    reviews: 142,
    reviewCount: 142,
    img: "/images/product-1mukhi.jpg",
    images: [
      "/images/product-1mukhi.jpg",
      "/images/product-5mukhi.jpg",
      "/images/product-7mukhi.jpg",
      "/images/product-mala.jpg"
    ],
    badge: "Deva Mani",
    highlight: "Original Nepali 14 Mukhi Rudraksha known as Deva Mani, blessed by Lord Shiva & Lord Hanuman. Awakens the Ajna Chakra with Govt Lab Certification.",
    tags: ["Deva Mani", "Awakens Ajna Chakra", "Supreme Intuition & Victory", "Govt Lab Certified", "100% Nepali Origin"],
    category: "Rudraksha",
    status: "Active",
    stock: 25,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "5",
    name: "5 Mukhi Rudraksha",
    price: 999,
    comparePrice: 1499,
    mrp: 1499,
    rating: 4.9,
    reviews: 120,
    reviewCount: 120,
    img: "/images/product-5mukhi.jpg",
    images: [
      "/images/product-5mukhi.jpg",
      "/images/product-mala.jpg",
      "/images/product-7mukhi.jpg",
      "/images/product-1mukhi.jpg",
      "/images/product-11mukhi.jpg"
    ],
    badge: "Best Seller",
    highlight: "Sacred soil (मिट्टी) & Holy Ganga Jal consecration from Mount Kailash region with certified Vedic energization.",
    tags: ["Shiva's Living Presence", "Dissolves Negative Energy", "Inner Clarity & Focus", "Govt Lab Certified", "100% Nepali Origin"],
    category: "Rudraksha",
    status: "Active",
    stock: 50,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "1",
    name: "1 Mukhi Rudraksha",
    price: 3499,
    comparePrice: 4999,
    mrp: 4999,
    rating: 4.9,
    reviews: 86,
    reviewCount: 86,
    img: "/images/product-1mukhi.jpg",
    images: [
      "/images/product-1mukhi.jpg",
      "/images/product-5mukhi.jpg",
      "/images/product-mala.jpg",
      "/images/product-7mukhi.jpg"
    ],
    badge: "Popular",
    highlight: "The supreme bead representing pure consciousness and Lord Shiva himself, accompanied by an authentic identification lab card.",
    tags: ["Supreme Consciousness", "Direct Realization", "Highest Path to Moksha", "Rare Collector Bead", "Lab Tested"],
    category: "Rudraksha",
    status: "Active",
    stock: 25,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "7",
    name: "7 Mukhi Rudraksha",
    price: 1299,
    comparePrice: 1899,
    mrp: 1899,
    rating: 4.8,
    reviews: 64,
    reviewCount: 64,
    img: "/images/product-7mukhi.jpg",
    images: [
      "/images/product-7mukhi.jpg",
      "/images/product-5mukhi.jpg",
      "/images/product-11mukhi.jpg",
      "/images/product-mala.jpg"
    ],
    badge: "Auspicious",
    highlight: "Blessed by Goddess Mahalakshmi to attract abundance, career growth, and financial stability.",
    tags: ["Mahalakshmi Grace", "Abundance & Prosperity", "Removes Saturn Obstacles", "100% Natural", "Vedic Energized"],
    category: "Rudraksha",
    status: "Active",
    stock: 40,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "mala",
    name: "Rudraksha Mala (108+1 Beads)",
    price: 1899,
    comparePrice: 2999,
    mrp: 2999,
    rating: 4.9,
    reviews: 98,
    reviewCount: 98,
    img: "/images/product-mala.jpg",
    images: [
      "/images/product-mala.jpg",
      "/images/product-5mukhi.jpg",
      "/images/product-7mukhi.jpg",
      "/images/product-1mukhi.jpg"
    ],
    badge: "Spiritual Choice",
    highlight: "Traditional 108+1 japa & dhyana mala hand-knotted with silk thread, ideal for mantra chanting and daily protection.",
    tags: ["108+1 Sacred Count", "Hand-knotted Silk", "Japa & Meditation", "Protective Aura", "Natural Nepal Beads"],
    category: "Mala",
    status: "Active",
    stock: 60,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "11",
    name: "11 Mukhi Rudraksha",
    price: 1699,
    comparePrice: 2499,
    mrp: 2499,
    rating: 4.9,
    reviews: 42,
    reviewCount: 42,
    img: "/images/product-11mukhi.jpg",
    images: [
      "/images/product-11mukhi.jpg",
      "/images/product-5mukhi.jpg",
      "/images/product-7mukhi.jpg",
      "/images/product-mala.jpg"
    ],
    badge: "Hanuman Blessing",
    highlight: "Symbolizes Lord Hanuman (Ekadasha Rudra) providing immense physical courage, mental fortitude, and protection from fears.",
    tags: ["Lord Hanuman Blessings", "Courage & Protection", "Mental Fortitude", "Vedic Energized", "Govt Lab Certified"],
    category: "Rudraksha",
    status: "Active",
    stock: 30,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const defaultBanners = [
  "https://i.ibb.co/Pvb9qZy7/file-00000000310082118c0c939fa357349f.png",
  "https://i.ibb.co/23zYS09n/file-00000000886c82118cc5dc60c8082572.png",
  "https://i.ibb.co/vvjdFqNQ/file-0000000057548208a095c1d1fc26f78c.jpg"
];

export const defaultCoupons = [
  { id: "COUP-AURA10", code: "AURA10", discount: 10, type: "percentage", limit: 1000, status: "Active", usage: 0 },
  { id: "COUP-AURA20", code: "AURA20", discount: 20, type: "percentage", limit: 500, status: "Active", usage: 0 },
  { id: "COUP-SHRAWAN200", code: "SHRAWAN200", discount: 200, type: "fixed", limit: 1000, status: "Active", usage: 0 }
];

export const defaultActiveOffer = {
  id: "OFFER-CENTRAL-1",
  enabled: true,
  status: "Active",
  title: "₹200 OFF",
  subtitle: "Limited Time Festival Offer",
  couponCode: "SHRAWAN200",
  discountType: "fixed",
  discountValue: 200,
  startDate: new Date(Date.now() - 3600000).toISOString(),
  startAt: new Date(Date.now() - 3600000).toISOString(),
  expiresAt: new Date(Date.now() + 2 * 24 * 3600000 + 5 * 3600000 + 40 * 60000).toISOString(),
  expiry: new Date(Date.now() + 2 * 24 * 3600000 + 5 * 3600000 + 40 * 60000).toISOString(),
  backgroundColor: "#2b170d",
  textColor: "#fbf5ef",
  accentColor: "#c89b3c",
  badgeColor: "#7a320c",
  borderColor: "#4b2614",
  buttonColor: "#c89b3c",
  topStripEnabled: false,
  heroEnabled: false,
  productCardEnabled: false,
  productPageEnabled: false,
  imageBadgeEnabled: false,
  floatingEnabled: false,
  stickyEnabled: false,
  popupEnabled: false,
  timerEnabled: false,
  marqueeEnabled: true,
  popupDelay: 10,
  scrollTrigger: 400,
  animationStyle: "fade"
};

export const defaultReviews = [
  { 
    id: "REV-101", 
    type: "product",
    productId: "5",
    productName: "5 Mukhi Rudraksha",
    name: "Pandit Rajesh Sharma", 
    city: "Varanasi, UP",
    rating: 5, 
    date: "2 days ago", 
    createdAt: Date.now() - 2 * 86400000,
    verified: true,
    featured: true,
    status: "Approved",
    title: "100% Authentic Nepal Bead with Pure Vibrations",
    text: "ॐ नमः शिवाय! The 5 Mukhi Rudraksha is genuinely divine and pure. As someone who performs daily Shiva puja, I can immediately feel the calming positive aura. The lab certificate was authentic and the natural mukhi lines are deep and unbroken. Highly recommend Aura Rudraksha to all devotees. 🙏✨", 
    images: ["/images/product-5mukhi.jpg", "/images/product-mala.jpg"],
    img: "/images/product-5mukhi.jpg",
    helpfulUp: 18,
    helpfulDown: 0,
    adminReply: {
      text: "Har Har Mahadev Pandit ji! 🙏 We are truly blessed by your kind words. May Lord Shiva always shower his divine grace and peace upon you and your family.",
      author: "Aura Rudraksha Spiritual Team",
      date: "1 day ago"
    }
  },
  { 
    id: "REV-102", 
    type: "product",
    productId: "5",
    productName: "5 Mukhi Rudraksha",
    name: "Dr. Ananya Iyer", 
    city: "Bengaluru, KA",
    rating: 5, 
    date: "5 days ago", 
    createdAt: Date.now() - 5 * 86400000,
    verified: true,
    featured: true,
    status: "Approved",
    title: "Helped immensely in mental focus and stress reduction",
    text: "I was looking for an authentic certified Rudraksha for meditation and work focus. Within 2 weeks of wearing this energised bead, my mental clarity has improved significantly. Beautiful wooden box packaging and quick delivery to Bangalore.", 
    images: ["/images/product-5mukhi.jpg"],
    img: "/images/product-5mukhi.jpg",
    helpfulUp: 14,
    helpfulDown: 1,
    adminReply: null
  },
  { 
    id: "REV-103", 
    type: "product",
    productId: "1",
    productName: "1 Mukhi Rudraksha",
    name: "Vikramaditya Rathore", 
    city: "Jaipur, RJ",
    rating: 5, 
    date: "1 week ago", 
    createdAt: Date.now() - 7 * 86400000,
    verified: true,
    featured: true,
    status: "Approved",
    title: "Rare half-moon 1 Mukhi bead with X-Ray Certificate",
    text: "Finding a genuine Ek Mukhi Rudraksha in India is very difficult due to counterfeits. Aura Rudraksha provided a genuine certified bead with full test reports. The antique gold capping is regal and handcrafted with great devotion.", 
    images: ["/images/product-1mukhi.jpg"],
    img: "/images/product-1mukhi.jpg",
    helpfulUp: 23,
    helpfulDown: 0,
    adminReply: {
      text: "Jai Bholenath! We strictly source our Ek Mukhi beads directly from holy forests and conduct government-approved lab tests before dispatch.",
      author: "Aura Rudraksha Team",
      date: "6 days ago"
    }
  }
];

export const defaultOrders = [];

export const defaultCustomers = [];

export const defaultSettings = {
  storeName: "Aura Rudraksha",
  supportEmail: "aurarudrakshaofficial@gmail.com",
  supportPhone: "+91 9672996531",
  currency: "INR",
  standardShippingFee: 0,
  freeShippingThreshold: 0,
  enableProductShipping: true,
  featuredProductId: "14",
  featuredProductEnabled: true,
  storageProvider: "puter",
  instagramUrl: "https://instagram.com/aurarudraksha",
  facebookUrl: "https://facebook.com/aurarudraksha",
  youtubeUrl: "https://youtube.com/@aurarudraksha",
  shippingPolicy: "At Aura Rudraksha, every order is treated with spiritual reverence and care. Each sacred Rudraksha bead, Mala, and divine item is energized and quality-inspected prior to dispatch.\n- Dispatch Timeline: Orders are processed and dispatched within 24–48 business hours.\n- Free Shipping: Complimentary nationwide shipping on orders above ₹1,499 across all pin codes in India.\n- Delivery Window: Standard domestic delivery takes 3 to 7 business days depending on destination location.\n- Tracking: Live tracking details are emailed and accessible under your account dashboard once dispatched.",
  returnPolicy: "Your satisfaction and trust in our authentic lab-certified Rudraksha are paramount. We offer a hassle-free 7-day return window for damaged or mismatched orders.\n- 7-Day Returns: You may request a return within 7 days of receiving your shipment.\n- Condition: Items must be returned unused in original aura velvet packaging with lab certificates intact.\n- Refund Process: Approved refunds are credited directly to your original payment method or UPI within 5–7 business days.",
  privacyPolicy: "Aura Rudraksha respects your privacy and is committed to protecting your personal information.\n- Data Safety: We never sell, rent, or trade customer contact details or purchase histories.\n- Secure Checkout: Encrypted payment processing handles all UPI, card, and netbanking transactions safely.\n- Account Privacy: You maintain full ownership over your profile details and saved shipping addresses.",
  termsPolicy: "Welcome to Aura Rudraksha. By using our website and purchasing our sacred items, you agree to the following terms and conditions:\n- Authenticity Guarantee: All beads are lab-tested and certified genuine.\n- Usage: Sacred items are intended for spiritual meditation, devotion, and well-being.\n- Jurisdiction: All disputes are subject to local jurisdiction.",
  contactSupport: "Dedicated Spiritual Support & Customer Care:\n- Email: aurarudrakshaofficial@gmail.com\n- Phone: +91 9672996531\n- Timings: Monday to Saturday, 9:00 AM – 7:00 PM IST"
};
