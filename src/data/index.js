export const products = [
  {
    id: "5",
    name: "5 Mukhi Rudraksha",
    price: 999,
    mrp: 1499,
    rating: 4.9,
    reviews: 120,
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
    tags: ["Shiva's Living Presence", "Dissolves Negative Energy", "Inner Clarity & Focus", "Govt Lab Certified", "100% Nepali Origin"]
  },
  {
    id: "1",
    name: "1 Mukhi Rudraksha",
    price: 3499,
    mrp: 4999,
    rating: 4.9,
    reviews: 86,
    img: "/images/product-1mukhi.jpg",
    images: [
      "/images/product-1mukhi.jpg",
      "/images/product-5mukhi.jpg",
      "/images/product-mala.jpg",
      "/images/product-7mukhi.jpg"
    ],
    badge: "Popular",
    highlight: "The supreme bead representing pure consciousness and Lord Shiva himself, accompanied by an authentic identification lab card.",
    tags: ["Supreme Consciousness", "Direct Realization", "Highest Path to Moksha", "Rare Collector Bead", "Lab Tested"]
  },
  {
    id: "7",
    name: "7 Mukhi Rudraksha",
    price: 1299,
    mrp: 1899,
    rating: 4.8,
    reviews: 64,
    img: "/images/product-7mukhi.jpg",
    images: [
      "/images/product-7mukhi.jpg",
      "/images/product-5mukhi.jpg",
      "/images/product-11mukhi.jpg",
      "/images/product-mala.jpg"
    ],
    badge: "Auspicious",
    highlight: "Blessed by Goddess Mahalakshmi to attract abundance, career growth, and financial stability.",
    tags: ["Mahalakshmi Grace", "Abundance & Prosperity", "Removes Saturn Obstacles", "100% Natural", "Vedic Energized"]
  },
  {
    id: "mala",
    name: "Rudraksha Mala (108+1 Beads)",
    price: 1899,
    mrp: 2999,
    rating: 4.9,
    reviews: 98,
    img: "/images/product-mala.jpg",
    images: [
      "/images/product-mala.jpg",
      "/images/product-5mukhi.jpg",
      "/images/product-7mukhi.jpg",
      "/images/product-1mukhi.jpg"
    ],
    badge: "Spiritual Choice",
    highlight: "Traditional 108+1 japa & dhyana mala hand-knotted with silk thread, ideal for mantra chanting and daily protection.",
    tags: ["108+1 Sacred Count", "Hand-knotted Silk", "Japa & Meditation", "Protective Aura", "Natural Nepal Beads"]
  },
  {
    id: "11",
    name: "11 Mukhi Rudraksha",
    price: 1699,
    mrp: 2499,
    rating: 4.9,
    reviews: 42,
    img: "/images/product-11mukhi.jpg",
    images: [
      "/images/product-11mukhi.jpg",
      "/images/product-5mukhi.jpg",
      "/images/product-7mukhi.jpg",
      "/images/product-mala.jpg"
    ],
    badge: "Hanuman Blessing",
    highlight: "Symbolizes Lord Hanuman (Ekadasha Rudra) providing immense physical courage, mental fortitude, and protection from fears.",
    tags: ["Lord Hanuman Blessings", "Courage & Protection", "Mental Fortitude", "Vedic Energized", "Govt Lab Certified"]
  }
];

export const money = n => `₹${Number(n).toLocaleString("en-IN")}`;
export const pct = (p) => {
  if (p?.discountPercent && Number(p.discountPercent) > 0) {
    return Number(p.discountPercent);
  }
  const mrp = Number(p?.mrp) || 0;
  const price = Number(p?.price) || 0;
  if (!mrp || mrp <= price) return 0;
  return Math.round((1 - price / mrp) * 100);
};
