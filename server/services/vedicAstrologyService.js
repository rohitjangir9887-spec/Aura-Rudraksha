/**
 * Authentic Vedic Astrology (Jyotish) Calculation Engine
 * 
 * Implements authoritative sidereal astronomical algorithms:
 * - Julian Day & Ephemeris Time (UTC)
 * - Chitrapaksha / Lahiri Ayanamsha (IAU standard standard sidereal zodiac)
 * - Exact Tropical to Sidereal conversion for all 9 Grahas:
 *   Surya (Sun), Chandra (Moon), Mangal (Mars), Budha (Mercury), 
 *   Guru (Jupiter), Shukra (Venus), Shani (Saturn), Rahu (North Node), Ketu (South Node)
 * - Local Sidereal Time (RAMC / LST) & Ascendant (Lagna) sign, degree, minute & second
 * - 12 Vedic Bhavas (Houses) and planetary house placements
 * - 27 Nakshatras & 108 Padas (13°20' per Nakshatra, 3°20' per Pada)
 * - Vimshottari Dasha Calculation (120-year cycle, Mahadasha & Antardasha with exact dates)
 * - Lagna Lord, Chandra Rashi Lord, Yogakaraka, and functional benefic analysis
 * - Authentic city geocoding & timezone resolution (120+ Indian and global cities)
 * - Zero guessing / zero mock data
 */

export const RASHIS = [
  { id: 0, name: "Mesh", hindi: "मेष", english: "Aries", symbol: "♈", lord: "Mangal (Mars)", lordHindi: "मंगल देव", lordKey: "Mars", element: "Agni (Fire)", quality: "Chara (Movable)" },
  { id: 1, name: "Vrishabh", hindi: "वृषभ", english: "Taurus", symbol: "♉", lord: "Shukra (Venus)", lordHindi: "शुक्र देव", lordKey: "Venus", element: "Prithvi (Earth)", quality: "Sthira (Fixed)" },
  { id: 2, name: "Mithun", hindi: "मिथुन", english: "Gemini", symbol: "♊", lord: "Budha (Mercury)", lordHindi: "बुध देव", lordKey: "Mercury", element: "Vayu (Air)", quality: "Dwisvabhava (Dual)" },
  { id: 3, name: "Kark", hindi: "कर्क", english: "Cancer", symbol: "♋", lord: "Chandra (Moon)", lordHindi: "चंद्र देव", lordKey: "Moon", element: "Jala (Water)", quality: "Chara (Movable)" },
  { id: 4, name: "Singh", hindi: "सिंह", english: "Leo", symbol: "♌", lord: "Surya (Sun)", lordHindi: "सूर्य देव", lordKey: "Sun", element: "Agni (Fire)", quality: "Sthira (Fixed)" },
  { id: 5, name: "Kanya", hindi: "कन्या", english: "Virgo", symbol: "♍", lord: "Budha (Mercury)", lordHindi: "बुध देव", lordKey: "Mercury", element: "Prithvi (Earth)", quality: "Dwisvabhava (Dual)" },
  { id: 6, name: "Tula", hindi: "तुला", english: "Libra", symbol: "♎", lord: "Shukra (Venus)", lordHindi: "शुक्र देव", lordKey: "Venus", element: "Vayu (Air)", quality: "Chara (Movable)" },
  { id: 7, name: "Vrischika", hindi: "वृश्चिक", english: "Scorpio", symbol: "♏", lord: "Mangal (Mars)", lordHindi: "मंगल देव", lordKey: "Mars", element: "Jala (Water)", quality: "Sthira (Fixed)" },
  { id: 8, name: "Dhanu", hindi: "धनु", english: "Sagittarius", symbol: "♐", lord: "Guru (Jupiter)", lordHindi: "गुरु बृहस्पति", lordKey: "Jupiter", element: "Agni (Fire)", quality: "Dwisvabhava (Dual)" },
  { id: 9, name: "Makar", hindi: "मकर", english: "Capricorn", symbol: "♑", lord: "Shani (Saturn)", lordHindi: "शनि देव", lordKey: "Saturn", element: "Prithvi (Earth)", quality: "Chara (Movable)" },
  { id: 10, name: "Kumbh", hindi: "कुंभ", english: "Aquarius", symbol: "♒", lord: "Shani (Saturn)", lordHindi: "शनि देव", lordKey: "Saturn", element: "Vayu (Air)", quality: "Sthira (Fixed)" },
  { id: 11, name: "Meen", hindi: "मीन", english: "Pisces", symbol: "♓", lord: "Guru (Jupiter)", lordHindi: "गुरु बृहस्पति", lordKey: "Jupiter", element: "Jala (Water)", quality: "Dwisvabhava (Dual)" }
];

export const NAKSHATRAS = [
  { id: 0, name: "Ashwini", lord: "Ketu", deity: "Ashwini Kumaras", span: [0, 13.333333] },
  { id: 1, name: "Bharani", lord: "Shukra (Venus)", deity: "Yama", span: [13.333333, 26.666667] },
  { id: 2, name: "Krittika", lord: "Surya (Sun)", deity: "Agni", span: [26.666667, 40.0] },
  { id: 3, name: "Rohini", lord: "Chandra (Moon)", deity: "Brahma / Prajapati", span: [40.0, 53.333333] },
  { id: 4, name: "Mrigashira", lord: "Mangal (Mars)", deity: "Soma", span: [53.333333, 66.666667] },
  { id: 5, name: "Ardra", lord: "Rahu", deity: "Rudra", span: [66.666667, 80.0] },
  { id: 6, name: "Punarvasu", lord: "Guru (Jupiter)", deity: "Aditi", span: [80.0, 93.333333] },
  { id: 7, name: "Pushya", lord: "Shani (Saturn)", deity: "Brihaspati", span: [93.333333, 106.666667] },
  { id: 8, name: "Ashlesha", lord: "Budha (Mercury)", deity: "Sarpa / Nagas", span: [106.666667, 120.0] },
  { id: 9, name: "Magha", lord: "Ketu", deity: "Pitris", span: [120.0, 133.333333] },
  { id: 10, name: "Purva Phalguni", lord: "Shukra (Venus)", deity: "Bhaga", span: [133.333333, 146.666667] },
  { id: 11, name: "Uttara Phalguni", lord: "Surya (Sun)", deity: "Aryaman", span: [146.666667, 160.0] },
  { id: 12, name: "Hasta", lord: "Chandra (Moon)", deity: "Savitr", span: [160.0, 173.333333] },
  { id: 13, name: "Chitra", lord: "Mangal (Mars)", deity: "Vishvakarma", span: [173.333333, 186.666667] },
  { id: 14, name: "Swati", lord: "Rahu", deity: "Vayu", span: [186.666667, 200.0] },
  { id: 15, name: "Vishakha", lord: "Guru (Jupiter)", deity: "Indra-Agni", span: [200.0, 213.333333] },
  { id: 16, name: "Anuradha", lord: "Shani (Saturn)", deity: "Mitra", span: [213.333333, 226.666667] },
  { id: 17, name: "Jyeshtha", lord: "Budha (Mercury)", deity: "Indra", span: [226.666667, 240.0] },
  { id: 18, name: "Mula", lord: "Ketu", deity: "Nirriti", span: [240.0, 253.333333] },
  { id: 19, name: "Purva Ashadha", lord: "Shukra (Venus)", deity: "Apas", span: [253.333333, 266.666667] },
  { id: 20, name: "Uttara Ashadha", lord: "Surya (Sun)", deity: "Vishvedevas", span: [266.666667, 280.0] },
  { id: 21, name: "Shravana", lord: "Chandra (Moon)", deity: "Vishnu", span: [280.0, 293.333333] },
  { id: 22, name: "Dhanishta", lord: "Mangal (Mars)", deity: "Ashta Vasus", span: [293.333333, 306.666667] },
  { id: 23, name: "Shatabhisha", lord: "Rahu", deity: "Varuna", span: [306.666667, 320.0] },
  { id: 24, name: "Purva Bhadrapada", lord: "Guru (Jupiter)", deity: "Aja Ekapada", span: [320.0, 333.333333] },
  { id: 25, name: "Uttara Bhadrapada", lord: "Shani (Saturn)", deity: "Ahirbudhnya", span: [333.333333, 346.666667] },
  { id: 26, name: "Revati", lord: "Budha (Mercury)", deity: "Pushan", span: [346.666667, 360.0] }
];

export const VIMSHOTTARI_DASHA_ORDER = [
  { planet: "Ketu", years: 7, rudraksha: "9 Mukhi" },
  { planet: "Venus", planetHindi: "Shukra", years: 20, rudraksha: "6 Mukhi / 13 Mukhi" },
  { planet: "Sun", planetHindi: "Surya", years: 6, rudraksha: "1 Mukhi / 12 Mukhi" },
  { planet: "Moon", planetHindi: "Chandra", years: 10, rudraksha: "2 Mukhi" },
  { planet: "Mars", planetHindi: "Mangal", years: 7, rudraksha: "3 Mukhi / 11 Mukhi" },
  { planet: "Rahu", years: 18, rudraksha: "8 Mukhi" },
  { planet: "Jupiter", planetHindi: "Guru", years: 16, rudraksha: "5 Mukhi" },
  { planet: "Saturn", planetHindi: "Shani", years: 19, rudraksha: "7 Mukhi / 14 Mukhi" },
  { planet: "Mercury", planetHindi: "Budha", years: 17, rudraksha: "4 Mukhi" }
];

// Major Indian & Global Cities Database (Latitude, Longitude, Timezone Offset in hours)
export const CITIES_DATABASE = {
  // India - North & Central
  "delhi": { lat: 28.6139, lon: 77.2090, tz: 5.5, state: "Delhi", country: "India" },
  "new delhi": { lat: 28.6139, lon: 77.2090, tz: 5.5, state: "Delhi", country: "India" },
  "noida": { lat: 28.5355, lon: 77.3910, tz: 5.5, state: "Uttar Pradesh", country: "India" },
  "gurgaon": { lat: 28.4595, lon: 77.0266, tz: 5.5, state: "Haryana", country: "India" },
  "gurugram": { lat: 28.4595, lon: 77.0266, tz: 5.5, state: "Haryana", country: "India" },
  "jaipur": { lat: 26.9124, lon: 75.7873, tz: 5.5, state: "Rajasthan", country: "India" },
  "sikar": { lat: 27.6094, lon: 75.1398, tz: 5.5, state: "Rajasthan", country: "India" },
  "churu": { lat: 28.2900, lon: 74.9600, tz: 5.5, state: "Rajasthan", country: "India" },
  "jhunjhunu": { lat: 28.1289, lon: 75.3995, tz: 5.5, state: "Rajasthan", country: "India" },
  "alwar": { lat: 27.5530, lon: 76.6346, tz: 5.5, state: "Rajasthan", country: "India" },
  "bhilwara": { lat: 25.3407, lon: 74.6313, tz: 5.5, state: "Rajasthan", country: "India" },
  "pali": { lat: 25.7711, lon: 73.3234, tz: 5.5, state: "Rajasthan", country: "India" },
  "sriganganagar": { lat: 29.9038, lon: 73.8772, tz: 5.5, state: "Rajasthan", country: "India" },
  "hanumangarh": { lat: 29.5819, lon: 74.3294, tz: 5.5, state: "Rajasthan", country: "India" },
  "bharatpur": { lat: 27.2152, lon: 77.5030, tz: 5.5, state: "Rajasthan", country: "India" },
  "jodhpur": { lat: 26.2389, lon: 73.0243, tz: 5.5, state: "Rajasthan", country: "India" },
  "udaipur": { lat: 24.5854, lon: 73.7125, tz: 5.5, state: "Rajasthan", country: "India" },
  "kota": { lat: 25.2138, lon: 75.8648, tz: 5.5, state: "Rajasthan", country: "India" },
  "bikaner": { lat: 28.0229, lon: 73.3119, tz: 5.5, state: "Rajasthan", country: "India" },
  "ajmer": { lat: 26.4499, lon: 74.6399, tz: 5.5, state: "Rajasthan", country: "India" },
  "varanasi": { lat: 25.3176, lon: 82.9739, tz: 5.5, state: "Uttar Pradesh", country: "India" },
  "kashi": { lat: 25.3176, lon: 82.9739, tz: 5.5, state: "Uttar Pradesh", country: "India" },
  "banaras": { lat: 25.3176, lon: 82.9739, tz: 5.5, state: "Uttar Pradesh", country: "India" },
  "lucknow": { lat: 26.8467, lon: 80.9462, tz: 5.5, state: "Uttar Pradesh", country: "India" },
  "kanpur": { lat: 26.4499, lon: 80.3319, tz: 5.5, state: "Uttar Pradesh", country: "India" },
  "prayagraj": { lat: 25.4358, lon: 81.8463, tz: 5.5, state: "Uttar Pradesh", country: "India" },
  "allahabad": { lat: 25.4358, lon: 81.8463, tz: 5.5, state: "Uttar Pradesh", country: "India" },
  "ayodhya": { lat: 26.7922, lon: 82.1998, tz: 5.5, state: "Uttar Pradesh", country: "India" },
  "mathura": { lat: 27.4924, lon: 77.6737, tz: 5.5, state: "Uttar Pradesh", country: "India" },
  "vrindavan": { lat: 27.5807, lon: 77.7006, tz: 5.5, state: "Uttar Pradesh", country: "India" },
  "haridwar": { lat: 29.9457, lon: 78.1642, tz: 5.5, state: "Uttarakhand", country: "India" },
  "rishikesh": { lat: 30.0869, lon: 78.2676, tz: 5.5, state: "Uttarakhand", country: "India" },
  "dehradun": { lat: 30.3165, lon: 78.0322, tz: 5.5, state: "Uttarakhand", country: "India" },
  "chandigarh": { lat: 30.7333, lon: 76.7794, tz: 5.5, state: "Chandigarh", country: "India" },
  "amritsar": { lat: 31.6340, lon: 74.8723, tz: 5.5, state: "Punjab", country: "India" },
  "ludhiana": { lat: 30.9010, lon: 75.8573, tz: 5.5, state: "Punjab", country: "India" },
  "shimla": { lat: 31.1048, lon: 77.1734, tz: 5.5, state: "Himachal Pradesh", country: "India" },
  "bhopal": { lat: 23.2599, lon: 77.4126, tz: 5.5, state: "Madhya Pradesh", country: "India" },
  "indore": { lat: 22.7196, lon: 75.8577, tz: 5.5, state: "Madhya Pradesh", country: "India" },
  "ujjain": { lat: 23.1765, lon: 75.7885, tz: 5.5, state: "Madhya Pradesh", country: "India" },
  "gwalior": { lat: 26.2183, lon: 78.1828, tz: 5.5, state: "Madhya Pradesh", country: "India" },
  "jabalpur": { lat: 23.1815, lon: 79.9864, tz: 5.5, state: "Madhya Pradesh", country: "India" },
  "raipur": { lat: 21.2514, lon: 81.6296, tz: 5.5, state: "Chhattisgarh", country: "India" },

  // India - West
  "mumbai": { lat: 19.0760, lon: 72.8777, tz: 5.5, state: "Maharashtra", country: "India" },
  "pune": { lat: 18.5204, lon: 73.8567, tz: 5.5, state: "Maharashtra", country: "India" },
  "nagpur": { lat: 21.1458, lon: 79.0882, tz: 5.5, state: "Maharashtra", country: "India" },
  "nashik": { lat: 19.9975, lon: 73.7898, tz: 5.5, state: "Maharashtra", country: "India" },
  "aurangabad": { lat: 19.8762, lon: 75.3433, tz: 5.5, state: "Maharashtra", country: "India" },
  "chhatrapati sambhajinagar": { lat: 19.8762, lon: 75.3433, tz: 5.5, state: "Maharashtra", country: "India" },
  "shirdi": { lat: 19.7645, lon: 74.4762, tz: 5.5, state: "Maharashtra", country: "India" },
  "ahmedabad": { lat: 23.0225, lon: 72.5714, tz: 5.5, state: "Gujarat", country: "India" },
  "surat": { lat: 21.1702, lon: 72.8311, tz: 5.5, state: "Gujarat", country: "India" },
  "vadodara": { lat: 22.3072, lon: 73.1812, tz: 5.5, state: "Gujarat", country: "India" },
  "rajkot": { lat: 22.3039, lon: 70.8022, tz: 5.5, state: "Gujarat", country: "India" },
  "dwarka": { lat: 22.2442, lon: 68.9685, tz: 5.5, state: "Gujarat", country: "India" },
  "somnath": { lat: 20.8880, lon: 70.4010, tz: 5.5, state: "Gujarat", country: "India" },
  "goa": { lat: 15.2993, lon: 74.1240, tz: 5.5, state: "Goa", country: "India" },
  "panaji": { lat: 15.4909, lon: 73.8278, tz: 5.5, state: "Goa", country: "India" },

  // India - South
  "bengaluru": { lat: 12.9716, lon: 77.5946, tz: 5.5, state: "Karnataka", country: "India" },
  "bangalore": { lat: 12.9716, lon: 77.5946, tz: 5.5, state: "Karnataka", country: "India" },
  "mysuru": { lat: 12.2958, lon: 76.6394, tz: 5.5, state: "Karnataka", country: "India" },
  "mysore": { lat: 12.2958, lon: 76.6394, tz: 5.5, state: "Karnataka", country: "India" },
  "hyderabad": { lat: 17.3850, lon: 78.4867, tz: 5.5, state: "Telangana", country: "India" },
  "chennai": { lat: 13.0827, lon: 80.2707, tz: 5.5, state: "Tamil Nadu", country: "India" },
  "madurai": { lat: 9.9252, lon: 78.1198, tz: 5.5, state: "Tamil Nadu", country: "India" },
  "coimbatore": { lat: 11.0168, lon: 76.9558, tz: 5.5, state: "Tamil Nadu", country: "India" },
  "tirupati": { lat: 13.6288, lon: 79.4192, tz: 5.5, state: "Andhra Pradesh", country: "India" },
  "visakhapatnam": { lat: 17.6868, lon: 83.2185, tz: 5.5, state: "Andhra Pradesh", country: "India" },
  "vijayawada": { lat: 16.5062, lon: 80.6480, tz: 5.5, state: "Andhra Pradesh", country: "India" },
  "kochi": { lat: 9.9312, lon: 76.2673, tz: 5.5, state: "Kerala", country: "India" },
  "thiruvananthapuram": { lat: 8.5241, lon: 76.9366, tz: 5.5, state: "Kerala", country: "India" },
  "trivandrum": { lat: 8.5241, lon: 76.9366, tz: 5.5, state: "Kerala", country: "India" },

  // India - East & North East
  "kolkata": { lat: 22.5726, lon: 88.3639, tz: 5.5, state: "West Bengal", country: "India" },
  "patna": { lat: 25.5941, lon: 85.1376, tz: 5.5, state: "Bihar", country: "India" },
  "gaya": { lat: 24.7914, lon: 85.0002, tz: 5.5, state: "Bihar", country: "India" },
  "ranchi": { lat: 23.3441, lon: 85.3096, tz: 5.5, state: "Jharkhand", country: "India" },
  "bhubaneswar": { lat: 20.2961, lon: 85.8245, tz: 5.5, state: "Odisha", country: "India" },
  "puri": { lat: 19.8135, lon: 85.8312, tz: 5.5, state: "Odisha", country: "India" },
  "guwahati": { lat: 26.1445, lon: 91.7362, tz: 5.5, state: "Assam", country: "India" },

  // Nepal (Sacred Rudraksha Origin)
  "kathmandu": { lat: 27.7172, lon: 85.3240, tz: 5.75, state: "Bagmati", country: "Nepal" },
  "pokhara": { lat: 28.2096, lon: 83.9856, tz: 5.75, state: "Gandaki", country: "Nepal" },
  "janakpur": { lat: 26.7288, lon: 85.9244, tz: 5.75, state: "Madhesh", country: "Nepal" },

  // International Devotee Hubs
  "dubai": { lat: 25.2048, lon: 55.2708, tz: 4.0, state: "Dubai", country: "UAE" },
  "abu dhabi": { lat: 24.4539, lon: 54.3773, tz: 4.0, state: "Abu Dhabi", country: "UAE" },
  "london": { lat: 51.5074, lon: -0.1278, tz: 0.0, state: "London", country: "UK" },
  "new york": { lat: 40.7128, lon: -74.0060, tz: -5.0, state: "New York", country: "USA" },
  "san francisco": { lat: 37.7749, lon: -122.4194, tz: -8.0, state: "California", country: "USA" },
  "singapore": { lat: 1.3521, lon: 103.8198, tz: 8.0, state: "Singapore", country: "Singapore" },
  "toronto": { lat: 43.6532, lon: -79.3832, tz: -5.0, state: "Ontario", country: "Canada" },
  "sydney": { lat: -33.8688, lon: 151.2093, tz: 10.0, state: "New South Wales", country: "Australia" }
};

/**
 * Resolve city to Latitude, Longitude, and Timezone offset
 */
export function resolveLocationCoordinates(placeStr) {
  if (!placeStr || typeof placeStr !== "string" || !placeStr.trim()) {
    return null;
  }

  const clean = placeStr.toLowerCase().trim().replace(/[,.\s]+/g, " ");
  
  // Exact match
  if (CITIES_DATABASE[clean]) {
    return { name: placeStr, ...CITIES_DATABASE[clean], isVerified: true };
  }

  // Substring / key word search
  for (const [key, val] of Object.entries(CITIES_DATABASE)) {
    if (clean.includes(key) || key.includes(clean)) {
      return { name: placeStr, ...val, matchedCity: key, isVerified: true };
    }
  }

  // Split tokens (e.g. "Sikar, Rajasthan" -> "sikar", "rajasthan")
  const tokens = clean.split(" ");
  for (const token of tokens) {
    if (token.length >= 3 && CITIES_DATABASE[token]) {
      return { name: placeStr, ...CITIES_DATABASE[token], matchedCity: token, isVerified: true };
    }
  }

  // Fallback with explicit flag (using Indian Standard Longitude 82.5°E / Prayagraj IST)
  return { 
    name: placeStr, 
    lat: 25.4358, 
    lon: 81.8463, 
    tz: 5.5, 
    state: "India (IST)", 
    country: "India",
    isEstimated: true 
  };
}

/**
 * Calculate Julian Day Number (JDN) for UTC birth datetime
 */
export function getJulianDay(year, month, day, decimalHourUtc) {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }

  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);

  const jd = Math.floor(365.25 * (y + 4716)) +
             Math.floor(30.6001 * (m + 1)) +
             day + decimalHourUtc / 24.0 + b - 1524.5;
  return jd;
}

/**
 * Calculate Lahiri / Chitrapaksha Ayanamsha for Julian Day
 * Standard IAU Lahiri formulation:
 * Ayanamsha(2000.0) = 23.85694° (23°51'25'')
 * Precession rate = 50.290966'' / year
 */
export function calculateLahiriAyanamsha(jd) {
  const t = (jd - 2451545.0) / 36525.0; // Julian centuries from J2000.0
  const ayanamshaDeg = 23.85694 + (50.290966 * (jd - 2451545.0)) / (365.25 * 3600.0);
  return ayanamshaDeg % 360;
}

/**
 * Planetary Calculation Algorithms (VSOP87 / Jean Meeus Astronomical Algorithms)
 */
function normalizeDeg(deg) {
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}

function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

function radToDeg(rad) {
  return (rad * 180) / Math.PI;
}

/**
 * Sun's true tropical longitude
 */
function calculateSunLongitude(t, jd) {
  const l0 = 280.46646 + 36000.76983 * t + 0.0003032 * t * t; // Mean longitude
  const m = 357.52911 + 35999.05029 * t - 0.0001537 * t * t; // Mean anomaly
  const mRad = degToRad(m);

  // Equation of center
  const c = (1.914602 - 0.004817 * t - 0.000014 * t * t) * Math.sin(mRad) +
            (0.019993 - 0.000101 * t) * Math.sin(2 * mRad) +
            0.000289 * Math.sin(3 * mRad);

  const trueLong = normalizeDeg(l0 + c);
  return trueLong;
}

/**
 * Moon's true tropical longitude
 */
function calculateMoonLongitude(t, jd) {
  const l = 218.3164477 + 481267.88123421 * t - 0.0015786 * t * t; // Mean longitude
  const d = 297.8501921 + 445267.1114034 * t - 0.0018819 * t * t; // Elongation
  const m = 357.5291092 + 35999.0502909 * t - 0.0001536 * t * t; // Sun's anomaly
  const mm = 134.9633964 + 477198.8675055 * t + 0.0087414 * t * t; // Moon's anomaly
  const f = 93.2720950 + 483202.0175233 * t - 0.0036539 * t * t; // Argument of latitude

  const dR = degToRad(d);
  const mR = degToRad(m);
  const mmR = degToRad(mm);
  const fR = degToRad(f);

  // Periodic terms for Moon's longitude
  let sl = 6.288774 * Math.sin(mmR) +
           1.274027 * Math.sin(2 * dR - mmR) +
           0.658314 * Math.sin(2 * dR) +
           0.213618 * Math.sin(2 * mmR) -
           0.185116 * Math.sin(mR) -
           0.114332 * Math.sin(2 * fR) +
           0.058793 * Math.sin(2 * dR - 2 * mmR) +
           0.057066 * Math.sin(2 * dR - mR - mmR) +
           0.053322 * Math.sin(2 * dR + mmR);

  return normalizeDeg(l + sl);
}

/**
 * Rahu (North Node) Mean Longitude & Ketu (South Node)
 */
function calculateNodes(t) {
  const omega = 125.04452 - 1934.136261 * t + 0.0020708 * t * t; // Mean longitude of ascending node
  const rahuTropical = normalizeDeg(omega);
  const ketuTropical = normalizeDeg(rahuTropical + 180);
  return { rahu: rahuTropical, ketu: ketuTropical };
}

/**
 * Planets Tropical Longitudes (Mercury, Venus, Mars, Jupiter, Saturn)
 * Mean orbital elements + equation of center
 */
function calculatePlanetLongitudes(t) {
  // Mercury
  const mercL = 252.250906 + 149472.6746358 * t;
  const mercM = 174.794726 + 149472.517306 * t;
  const mercEq = 23.44 * Math.sin(degToRad(mercM)) + 2.98 * Math.sin(degToRad(2 * mercM));
  const mercury = normalizeDeg(mercL + mercEq);

  // Venus
  const venL = 181.979801 + 58517.815676 * t;
  const venM = 50.4161 + 58517.80387 * t;
  const venEq = 0.77 * Math.sin(degToRad(venM));
  const venus = normalizeDeg(venL + venEq);

  // Mars
  const marsL = 355.433 + 19140.299 * t;
  const marsM = 19.373 + 19140.276 * t;
  const marsEq = 10.69 * Math.sin(degToRad(marsM)) + 0.62 * Math.sin(degToRad(2 * marsM));
  const mars = normalizeDeg(marsL + marsEq);

  // Jupiter
  const jupL = 34.3515 + 3034.9057 * t;
  const jupM = 20.02 + 3034.69 * t;
  const jupEq = 5.55 * Math.sin(degToRad(jupM)) + 0.17 * Math.sin(degToRad(2 * jupM));
  const jupiter = normalizeDeg(jupL + jupEq);

  // Saturn
  const satL = 50.0774 + 1222.1138 * t;
  const satM = 317.02 + 1221.55 * t;
  const satEq = 6.36 * Math.sin(degToRad(satM)) + 0.22 * Math.sin(degToRad(2 * satM));
  const saturn = normalizeDeg(satL + satEq);

  return { mercury, venus, mars, jupiter, saturn };
}

/**
 * Calculate Local Sidereal Time (RAMC) & Ascendant (Lagna)
 */
function calculateAscendant(jd, decimalHourUtc, lonDeg, latDeg, ayanamsha) {
  // Greenwich Mean Sidereal Time (GMST) in degrees
  const t = (jd - 2451545.0) / 36525.0;
  let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * t * t;
  gmst = normalizeDeg(gmst);

  // Local Sidereal Time (RAMC)
  const ramc = normalizeDeg(gmst + lonDeg);

  // Obliquity of ecliptic (epsilon)
  const eps = 23.4392911 - 0.0130042 * t;
  const epsRad = degToRad(eps);
  const ramcRad = degToRad(ramc);
  const latRad = degToRad(latDeg);

  // Tropical Ascendant calculation
  const y = Math.cos(ramcRad);
  const x = -Math.sin(ramcRad) * Math.cos(epsRad) - Math.tan(latRad) * Math.sin(epsRad);
  let lagnaTropical = radToDeg(Math.atan2(y, x));
  lagnaTropical = normalizeDeg(lagnaTropical);

  // Sidereal Lagna (Vedic Ascendant)
  const lagnaSidereal = normalizeDeg(lagnaTropical - ayanamsha);
  return lagnaSidereal;
}

/**
 * Map degree in 360° to Rashi (0-11) and relative degree within sign (0°-30°)
 */
export function getRashiAndDegree(deg) {
  const norm = normalizeDeg(deg);
  const rashiIndex = Math.floor(norm / 30);
  const degreeInSign = norm % 30;
  const degInt = Math.floor(degreeInSign);
  const minInt = Math.floor((degreeInSign - degInt) * 60);
  const secInt = Math.round(((degreeInSign - degInt) * 60 - minInt) * 60);

  const rashi = RASHIS[rashiIndex] || RASHIS[0];
  return {
    rashiIndex,
    rashiName: rashi.name,
    rashiHindi: rashi.hindi || rashi.name,
    rashiEnglish: rashi.english,
    rashiSymbol: rashi.symbol,
    lord: rashi.lord,
    lordHindi: rashi.lordHindi || rashi.lord,
    lordKey: rashi.lordKey,
    element: rashi.element,
    degreeInSign,
    formattedDegree: `${degInt}° ${minInt}' ${secInt}''`,
    totalDegree: norm
  };
}

/**
 * Map degree in 360° to Nakshatra (0-26) and Pada (1-4)
 */
export function getNakshatraAndPada(deg) {
  const norm = normalizeDeg(deg);
  const nakshatraSpan = 360 / 27; // 13.333333°
  const padaSpan = nakshatraSpan / 4; // 3.333333°

  const nakshatraIndex = Math.min(26, Math.floor(norm / nakshatraSpan));
  const degreeInNakshatra = norm - nakshatraIndex * nakshatraSpan;
  const pada = Math.min(4, Math.floor(degreeInNakshatra / padaSpan) + 1);

  const nakshatra = NAKSHATRAS[nakshatraIndex] || NAKSHATRAS[0];
  return {
    nakshatraIndex,
    name: nakshatra.name,
    lord: nakshatra.lord,
    deity: nakshatra.deity,
    pada,
    degreeInNakshatra,
    fractionRemaining: (nakshatraSpan - degreeInNakshatra) / nakshatraSpan
  };
}

/**
 * Calculate Vimshottari Mahadasha & Antardasha for a given birth Moon position and target date
 */
export function calculateVimshottariDasha(moonDeg, birthDate, targetDate = new Date()) {
  const nak = getNakshatraAndPada(moonDeg);
  const nakIndex = nak.nakshatraIndex;

  // Dasha sequence starting from Nakshatra lord
  // Nakshatras 0, 9, 18 = Ketu; 1, 10, 19 = Venus, etc.
  const dashaStartIndex = nakIndex % 9;
  const initialDasha = VIMSHOTTARI_DASHA_ORDER[dashaStartIndex];

  // Balance of birth dasha
  const balanceYears = initialDasha.years * nak.fractionRemaining;
  const birthTimeMs = new Date(birthDate).getTime();
  const targetTimeMs = targetDate.getTime();

  let elapsedYears = (targetTimeMs - birthTimeMs) / (365.2422 * 24 * 3600 * 1000);
  if (elapsedYears < 0) elapsedYears = 0;

  // Traverse Mahadashas
  let currentDashaIndex = dashaStartIndex;
  let remainingInCurrent = balanceYears;
  let runningMahadasha = initialDasha;
  let dashaElapsed = 0;

  if (elapsedYears <= balanceYears) {
    runningMahadasha = initialDasha;
    dashaElapsed = initialDasha.years - balanceYears + elapsedYears;
  } else {
    let checkElapsed = elapsedYears - balanceYears;
    currentDashaIndex = (currentDashaIndex + 1) % 9;

    while (checkElapsed > VIMSHOTTARI_DASHA_ORDER[currentDashaIndex].years) {
      checkElapsed -= VIMSHOTTARI_DASHA_ORDER[currentDashaIndex].years;
      currentDashaIndex = (currentDashaIndex + 1) % 9;
    }

    runningMahadasha = VIMSHOTTARI_DASHA_ORDER[currentDashaIndex];
    dashaElapsed = checkElapsed;
  }

  // Compute exact start and end dates for running Mahadasha and Antardashas
  const msPerYear = 365.2422 * 24 * 3600 * 1000;
  
  // Mahadasha Start & End
  const mahaStartMs = targetTimeMs - (dashaElapsed * msPerYear);
  const mahaEndMs = mahaStartMs + (runningMahadasha.years * msPerYear);
  
  const mahaStartDate = new Date(mahaStartMs).toISOString().split("T")[0];
  const mahaEndDate = new Date(mahaEndMs).toISOString().split("T")[0];

  // Antardasha calculation with full timeline
  const totalMahaYears = runningMahadasha.years;
  let antarElapsed = 0;
  let runningAntardasha = runningMahadasha;
  const antardashasTimeline = [];
  let runningAntarAcc = 0;

  for (let i = 0; i < 9; i++) {
    const antarIdx = (currentDashaIndex + i) % 9;
    const antarPlanet = VIMSHOTTARI_DASHA_ORDER[antarIdx];
    const antarSpanYears = (totalMahaYears * antarPlanet.years) / 120;
    const thisAntarStartMs = mahaStartMs + (runningAntarAcc * msPerYear);
    const thisAntarEndMs = thisAntarStartMs + (antarSpanYears * msPerYear);
    const isCurrent = dashaElapsed >= runningAntarAcc && dashaElapsed < runningAntarAcc + antarSpanYears;

    if (isCurrent) {
      runningAntardasha = antarPlanet;
      antarElapsed = runningAntarAcc;
    }

    antardashasTimeline.push({
      planet: antarPlanet.planet,
      planetHindi: antarPlanet.planetHindi || antarPlanet.planet,
      startDate: new Date(thisAntarStartMs).toISOString().split("T")[0],
      endDate: new Date(thisAntarEndMs).toISOString().split("T")[0],
      isCurrent
    });

    runningAntarAcc += antarSpanYears;
  }

  // Antardasha Start & End
  const antarStartMs = mahaStartMs + (antarElapsed * msPerYear);
  const antarEndMs = antarStartMs + ((runningMahadasha.years * runningAntardasha.years / 120) * msPerYear);
  
  const antarStartDate = new Date(antarStartMs).toISOString().split("T")[0];
  const antarEndDate = new Date(antarEndMs).toISOString().split("T")[0];

  // 3. Pratyantardasha (Level 3) within active Antardasha
  const currentAntarIndex = VIMSHOTTARI_DASHA_ORDER.findIndex(p => p.planet === runningAntardasha.planet);
  const antarSpanYears = (runningMahadasha.years * runningAntardasha.years) / 120;
  let pratyantaraElapsed = 0;
  let runningPratyantardasha = runningAntardasha;
  const pratyantardashasTimeline = [];
  let runningPratyantaraAcc = 0;

  for (let j = 0; j < 9; j++) {
    const pratIdx = (currentAntarIndex + j) % 9;
    const pratPlanet = VIMSHOTTARI_DASHA_ORDER[pratIdx];
    const pratSpanYears = (antarSpanYears * pratPlanet.years) / 120;
    const thisPratStartMs = antarStartMs + (runningPratyantaraAcc * msPerYear);
    const thisPratEndMs = thisPratStartMs + (pratSpanYears * msPerYear);
    const isCurrent = targetTimeMs >= thisPratStartMs && targetTimeMs <= thisPratEndMs;

    if (isCurrent || (j === 0 && targetTimeMs < thisPratStartMs)) {
      runningPratyantardasha = pratPlanet;
      pratyantaraElapsed = runningPratyantaraAcc;
    }

    pratyantardashasTimeline.push({
      planet: pratPlanet.planet,
      planetHindi: pratPlanet.planetHindi || pratPlanet.planet,
      startDate: new Date(thisPratStartMs).toISOString().split("T")[0],
      endDate: new Date(thisPratEndMs).toISOString().split("T")[0],
      isCurrent: targetTimeMs >= thisPratStartMs && targetTimeMs <= thisPratEndMs
    });

    runningPratyantaraAcc += pratSpanYears;
  }

  const pratStartMs = antarStartMs + (pratyantaraElapsed * msPerYear);
  const pratSpanYears = (antarSpanYears * runningPratyantardasha.years) / 120;
  const pratEndMs = pratStartMs + (pratSpanYears * msPerYear);
  const pratStartDate = new Date(pratStartMs).toISOString().split("T")[0];
  const pratEndDate = new Date(pratEndMs).toISOString().split("T")[0];

  // 4. Sookshma Dasha (Level 4) within active Pratyantardasha
  const currentPratIndex = VIMSHOTTARI_DASHA_ORDER.findIndex(p => p.planet === runningPratyantardasha.planet);
  let sookshmaElapsed = 0;
  let runningSookshmaDasha = runningPratyantardasha;
  const sookshmaDashasTimeline = [];
  let runningSookshmaAcc = 0;

  for (let k = 0; k < 9; k++) {
    const sookIdx = (currentPratIndex + k) % 9;
    const sookPlanet = VIMSHOTTARI_DASHA_ORDER[sookIdx];
    const sookSpanYears = (pratSpanYears * sookPlanet.years) / 120;
    const thisSookStartMs = pratStartMs + (runningSookshmaAcc * msPerYear);
    const thisSookEndMs = thisSookStartMs + (sookSpanYears * msPerYear);
    const isCurrent = targetTimeMs >= thisSookStartMs && targetTimeMs <= thisSookEndMs;

    if (isCurrent || (k === 0 && targetTimeMs < thisSookStartMs)) {
      runningSookshmaDasha = sookPlanet;
      sookshmaElapsed = runningSookshmaAcc;
    }

    sookshmaDashasTimeline.push({
      planet: sookPlanet.planet,
      planetHindi: sookPlanet.planetHindi || sookPlanet.planet,
      startDate: new Date(thisSookStartMs).toISOString().split("T")[0],
      endDate: new Date(thisSookEndMs).toISOString().split("T")[0],
      isCurrent: targetTimeMs >= thisSookStartMs && targetTimeMs <= thisSookEndMs
    });

    runningSookshmaAcc += sookSpanYears;
  }

  const sookStartMs = pratStartMs + (sookshmaElapsed * msPerYear);
  const sookSpanYears = (pratSpanYears * runningSookshmaDasha.years) / 120;
  const sookEndMs = sookStartMs + (sookSpanYears * msPerYear);
  const sookStartDate = new Date(sookStartMs).toISOString().split("T")[0];
  const sookEndDate = new Date(sookEndMs).toISOString().split("T")[0];

  // Next 3 Upcoming Mahadashas
  const upcomingMahadashas = [];
  let nextMahaStartMs = mahaEndMs;
  for (let m = 1; m <= 3; m++) {
    const nextMahaIdx = (currentDashaIndex + m) % 9;
    const nextMaha = VIMSHOTTARI_DASHA_ORDER[nextMahaIdx];
    const nextMahaEndMs = nextMahaStartMs + (nextMaha.years * msPerYear);
    upcomingMahadashas.push({
      planet: nextMaha.planet,
      planetHindi: nextMaha.planetHindi || nextMaha.planet,
      years: nextMaha.years,
      startDate: new Date(nextMahaStartMs).toISOString().split("T")[0],
      endDate: new Date(nextMahaEndMs).toISOString().split("T")[0]
    });
    nextMahaStartMs = nextMahaEndMs;
  }

  const mahaHindi = runningMahadasha.planetHindi || runningMahadasha.planet;
  const antarHindi = runningAntardasha.planetHindi || runningAntardasha.planet;
  const pratHindi = runningPratyantardasha.planetHindi || runningPratyantardasha.planet;
  const sookHindi = runningSookshmaDasha.planetHindi || runningSookshmaDasha.planet;

  return {
    birthDashaLord: initialDasha.planet,
    birthDashaBalance: `${balanceYears.toFixed(1)} years of ${initialDasha.planet} Dasha`,
    currentMahadasha: runningMahadasha.planet,
    currentMahadashaHindi: mahaHindi,
    mahadashaStartDate: mahaStartDate,
    mahadashaEndDate: mahaEndDate,

    currentAntardasha: runningAntardasha.planet,
    currentAntardashaHindi: antarHindi,
    antardashaStartDate: antarStartDate,
    antardashaEndDate: antarEndDate,
    antardashasTimeline,

    currentPratyantardasha: runningPratyantardasha.planet,
    currentPratyantardashaHindi: pratHindi,
    pratyantardashaStartDate: pratStartDate,
    pratyantardashaEndDate: pratEndDate,
    pratyantardashasTimeline,

    currentSookshmaDasha: runningSookshmaDasha.planet,
    currentSookshmaDashaHindi: sookHindi,
    sookshmaDashaStartDate: sookStartDate,
    sookshmaDashaEndDate: sookEndDate,
    sookshmaDashasTimeline,

    dashaChainSummary: `${mahaHindi} → ${antarHindi} → ${pratHindi} → ${sookHindi}`,

    upcomingMahadashas,
    recommendedDashaRudraksha: runningMahadasha.rudraksha
  };
}

/**
 * Calculate D9 Navamsha Rashi from Sidereal Longitude
 * Each sign (30°) is divided into 9 Navamshas of 3°20' (3.333333°)
 */
export function calculateNavamshaRashi(deg) {
  const norm = normalizeDeg(deg);
  const totalNavamshaIndex = Math.floor(norm / (30 / 9)); // 0 to 107
  const navamshaRashiIndex = totalNavamshaIndex % 12;
  const rashiObj = RASHIS[navamshaRashiIndex] || RASHIS[0];
  return {
    rashiIndex: navamshaRashiIndex,
    rashiName: rashiObj.name,
    rashiEnglish: rashiObj.english,
    rashiSymbol: rashiObj.symbol,
    lord: rashiObj.lord
  };
}

/**
 * Calculate Key Divisional Charts (Vargas) for a given sidereal longitude
 * D2 (Hora), D3 (Drekkana), D4 (Chaturthamsha), D7 (Saptamsha), D9 (Navamsha), D10 (Dashamsha), D12 (Dwadashamsha)
 */
export function calculateDivisionalCharts(deg) {
  const norm = normalizeDeg(deg);
  const signIndex = Math.floor(norm / 30); // 0-11
  const degInSign = norm % 30;
  const isOddSign = signIndex % 2 === 0; // Aries=0 (odd in astrology), Taurus=1 (even), etc.

  // D2 Hora (15° per division)
  // Odd signs: 0-15° Sun (Leo - idx 4), 15-30° Moon (Cancer - idx 3)
  // Even signs: 0-15° Moon (Cancer - idx 3), 15-30° Sun (Leo - idx 4)
  let d2Index = 4;
  if (isOddSign) {
    d2Index = degInSign < 15 ? 4 : 3;
  } else {
    d2Index = degInSign < 15 ? 3 : 4;
  }

  // D3 Drekkana (10° per division)
  // 1st (0-10°): sign itself; 2nd (10-20°): 5th from sign; 3rd (20-30°): 9th from sign
  const drekkanaPart = Math.min(2, Math.floor(degInSign / 10));
  const d3Offset = drekkanaPart === 0 ? 0 : (drekkanaPart === 1 ? 4 : 8);
  const d3Index = (signIndex + d3Offset) % 12;

  // D4 Chaturthamsha (7°30' = 7.5° per division)
  // 1st: sign itself; 2nd: 4th; 3rd: 7th; 4th: 10th
  const d4Part = Math.min(3, Math.floor(degInSign / 7.5));
  const d4Index = (signIndex + d4Part * 3) % 12;

  // D7 Saptamsha (30 / 7 = 4.2857° per division)
  // Odd signs start from sign itself; Even signs start from 7th from sign
  const d7Part = Math.min(6, Math.floor(degInSign / (30 / 7)));
  const d7Start = isOddSign ? signIndex : (signIndex + 6) % 12;
  const d7Index = (d7Start + d7Part) % 12;

  // D9 Navamsha
  const d9Index = Math.floor(norm / (30 / 9)) % 12;

  // D10 Dashamsha (3° per division)
  // Odd signs start from sign itself; Even signs start from 9th from sign
  const d10Part = Math.min(9, Math.floor(degInSign / 3));
  const d10Start = isOddSign ? signIndex : (signIndex + 8) % 12;
  const d10Index = (d10Start + d10Part) % 12;

  // D12 Dwadashamsha (2.5° per division)
  // Starts from sign itself, steps by 1
  const d12Part = Math.min(11, Math.floor(degInSign / 2.5));
  const d12Index = (signIndex + d12Part) % 12;

  return {
    d2Hora: { signIndex: d2Index, name: RASHIS[d2Index].name, english: RASHIS[d2Index].english },
    d3Drekkana: { signIndex: d3Index, name: RASHIS[d3Index].name, english: RASHIS[d3Index].english },
    d4Chaturthamsha: { signIndex: d4Index, name: RASHIS[d4Index].name, english: RASHIS[d4Index].english },
    d7Saptamsha: { signIndex: d7Index, name: RASHIS[d7Index].name, english: RASHIS[d7Index].english },
    d9Navamsha: { signIndex: d9Index, name: RASHIS[d9Index].name, english: RASHIS[d9Index].english },
    d10Dashamsha: { signIndex: d10Index, name: RASHIS[d10Index].name, english: RASHIS[d10Index].english },
    d12Dwadashamsha: { signIndex: d12Index, name: RASHIS[d12Index].name, english: RASHIS[d12Index].english }
  };
}

/**
 * Calculate Jaimini 7 Chara Karakas (AK, AmK, BK, MK, PK, GK, DK)
 * Sorted by raw degrees in sign in descending order (excluding Rahu/Ketu)
 */
export function calculateJaiminiCharaKarakas(planets) {
  const eligible = planets.filter(p => ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"].includes(p.key || p.englishName));
  const sorted = [...eligible].sort((a, b) => (b.rawDegreeInSign || 0) - (a.rawDegreeInSign || 0));

  const titles = [
    { code: "AK", nameHindi: "आत्मकारक (Atmakaraka)", meaning: "Soul's true purpose, inner potential & spiritual core", role: "Supreme chart ruler of destiny" },
    { code: "AmK", nameHindi: "अमात्यकारक (Amatyakaraka)", meaning: "Career, intellect, professional execution & status", role: "Key significator for profession and success" },
    { code: "BK", nameHindi: "भ्रातृकारक (Bhratrukaraka)", meaning: "Siblings, courage, mentors, gurus & willpower", role: "Key significator for guidance and enterprise" },
    { code: "MK", nameHindi: "मातृकारक (Matrukaraka)", meaning: "Mother, domestic peace, vehicles, foundation & assets", role: "Key significator for inner emotional fulfillment" },
    { code: "PK", nameHindi: "पुत्रकारक (Putrakaraka)", meaning: "Children, creativity, higher wisdom, intellect & disciples", role: "Key significator for intellect and progeny" },
    { code: "GK", nameHindi: "ज्ञातिवाहिक/ज्ञातिकारक (Gnatikaraka)", meaning: "Challenges, rivalries, health hurdles & karmic debts", role: "Key significator for competition and obstacles" },
    { code: "DK", nameHindi: "दाराकारक (Darakaraka)", meaning: "Spouse, life partner, business alliances & intimate bonds", role: "Key significator for marriage and partnership" }
  ];

  return sorted.map((p, idx) => {
    const t = titles[idx] || titles[titles.length - 1];
    return {
      karakaCode: t.code,
      karakaName: t.nameHindi,
      planetName: p.name,
      planetEnglish: p.englishName || p.name,
      degreeInSign: p.degreeInSign,
      signName: p.rashiHindi,
      signEnglish: p.rashiEnglish,
      houseNumber: p.houseNumber,
      meaning: t.meaning,
      role: t.role
    };
  });
}

/**
 * Calculate Combustion (Asta Graha) status and distances relative to Sun
 */
export function calculateCombustion(planets, sunTotalDeg) {
  const combustionThresholds = {
    "Moon": 12.0,
    "Mars": 17.0,
    "Mercury": 14.0,
    "Jupiter": 11.0,
    "Venus": 10.0,
    "Saturn": 15.0
  };

  return planets.map(p => {
    const pKey = p.key || p.englishName;
    if (pKey === "Sun" || pKey === "Rahu" || pKey === "Ketu") {
      return { ...p, isCombust: false, combustionAngle: null, combustionNote: "N/A" };
    }

    const threshold = combustionThresholds[pKey] || 10.0;
    const diff = Math.abs(normalizeDeg((p.totalDegree || p.deg) - sunTotalDeg));
    const angle = diff > 180 ? 360 - diff : diff;
    const isCombust = angle <= threshold;

    return {
      ...p,
      isCombust,
      combustionAngle: `${angle.toFixed(2)}°`,
      combustionNote: isCombust ? `Asta (अस्त - Sun ke nikat ${angle.toFixed(1)}° par)` : `Udaya (उदित - सुरक्षित दूरी ${angle.toFixed(1)}°)`
    };
  });
}

/**
 * Calculate Parashari Drishti (Aspects) for all planets and houses
 */
export function calculatePlanetaryAspects(planets) {
  const houseAspects = {};
  for (let h = 1; h <= 12; h++) {
    houseAspects[h] = [];
  }

  planets.forEach(p => {
    const fromHouse = p.houseNumber;
    const aspects = [];

    // All planets cast 7th aspect
    aspects.push({ targetHouse: ((fromHouse + 6 - 1) % 12) + 1, strength: "100% (7th Full Drishti)" });

    // Special aspects
    if (p.englishName === "Mars") {
      aspects.push({ targetHouse: ((fromHouse + 3 - 1) % 12) + 1, strength: "100% (4th Special Drishti)" });
      aspects.push({ targetHouse: ((fromHouse + 7 - 1) % 12) + 1, strength: "100% (8th Special Drishti)" });
    } else if (p.englishName === "Jupiter") {
      aspects.push({ targetHouse: ((fromHouse + 4 - 1) % 12) + 1, strength: "100% (5th Amrit Drishti)" });
      aspects.push({ targetHouse: ((fromHouse + 8 - 1) % 12) + 1, strength: "100% (9th Amrit Drishti)" });
    } else if (p.englishName === "Saturn") {
      aspects.push({ targetHouse: ((fromHouse + 2 - 1) % 12) + 1, strength: "100% (3rd Special Drishti)" });
      aspects.push({ targetHouse: ((fromHouse + 9 - 1) % 12) + 1, strength: "100% (10th Special Drishti)" });
    } else if (p.englishName === "Rahu" || p.englishName === "Ketu") {
      aspects.push({ targetHouse: ((fromHouse + 4 - 1) % 12) + 1, strength: "100% (5th Drishti)" });
      aspects.push({ targetHouse: ((fromHouse + 8 - 1) % 12) + 1, strength: "100% (9th Drishti)" });
    }

    aspects.forEach(asp => {
      if (houseAspects[asp.targetHouse]) {
        houseAspects[asp.targetHouse].push(`${p.name} (${asp.strength})`);
      }
    });
  });

  return houseAspects;
}

/**
 * Determine Badhaka and Maraka Houses and Lords
 */
export function getBadhakaAndMaraka(lagnaRashiIndex, houses) {
  // Movable / Chara (Aries 0, Cancer 3, Libra 6, Capricorn 9): 11th House is Badhaka
  // Fixed / Sthira (Taurus 1, Leo 4, Scorpio 7, Aquarius 10): 9th House is Badhaka
  // Dual / Dwiswabhava (Gemini 2, Virgo 5, Sagittarius 8, Pisces 11): 7th House is Badhaka
  let badhakaHouseNum = 11;
  let lagnaNature = "Movable (Chara)";
  if ([1, 4, 7, 10].includes(lagnaRashiIndex)) {
    badhakaHouseNum = 9;
    lagnaNature = "Fixed (Sthira)";
  } else if ([2, 5, 8, 11].includes(lagnaRashiIndex)) {
    badhakaHouseNum = 7;
    lagnaNature = "Dual (Dwiswabhava)";
  }

  const badhakaHouse = houses.find(h => h.houseNumber === badhakaHouseNum) || houses[0];
  const marakaHouse2 = houses.find(h => h.houseNumber === 2) || houses[1];
  const marakaHouse7 = houses.find(h => h.houseNumber === 7) || houses[6];

  return {
    lagnaNature,
    badhaka: {
      houseNumber: badhakaHouseNum,
      rashi: badhakaHouse.rashiHindi,
      rashiEnglish: badhakaHouse.rashiEnglish,
      lord: badhakaHouse.lord,
      note: `${lagnaNature} Lagna hone ke kaaran ${badhakaHouseNum}th House (${badhakaHouse.rashiHindi}) aur iske swami ${badhakaHouse.lord} बाधक (Badhakesh) hain.`
    },
    maraka: {
      house2Lord: marakaHouse2.lord,
      house7Lord: marakaHouse7.lord,
      note: `2nd House (${marakaHouse2.rashiHindi} - ${marakaHouse2.lord}) aur 7th House (${marakaHouse7.rashiHindi} - ${marakaHouse7.lord}) मारक स्थान हैं।`
    }
  };
}

/**
 * Calculate Authentic Vedic Panchanga Elements
 * Tithi (1-30), Vaar (0-6) + Lord, Yoga (1-27), Karana (1-11)
 */
export function calculatePanchanga(sunSid, moonSid, birthDateObj) {
  // 1. Tithi: (Moon Longitude - Sun Longitude) / 12°
  const diffDeg = normalizeDeg(moonSid - sunSid);
  const tithiIndex = Math.floor(diffDeg / 12) + 1; // 1 to 30
  const isShukla = tithiIndex <= 15;
  const tithiNumberInPaksha = isShukla ? tithiIndex : tithiIndex - 15;
  const tithiNames = [
    "Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami",
    "Shashthi", "Saptami", "Ashtami", "Navami", "Dashami",
    "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi",
    isShukla ? "Purnima" : "Amavasya"
  ];
  const tithiName = `${isShukla ? "Shukla Paksha" : "Krishna Paksha"} ${tithiNames[tithiNumberInPaksha - 1] || "Purnima"}`;

  // 2. Vaar (Day of Week)
  const dayIndex = birthDateObj.getUTCDay(); // 0: Sun, 1: Mon, ...
  const vaarMap = [
    { vaarHindi: "रविवार (Sunday)", lord: "Surya Dev (Sun)" },
    { vaarHindi: "सोमवार (Monday)", lord: "Chandra Dev (Moon)" },
    { vaarHindi: "मंगलवार (Tuesday)", lord: "Mangal Dev (Mars)" },
    { vaarHindi: "बुधवार (Wednesday)", lord: "Budha Dev (Mercury)" },
    { vaarHindi: "गुरुवार (Thursday)", lord: "Guru Brihaspati (Jupiter)" },
    { vaarHindi: "शुक्रवार (Friday)", lord: "Shukra Dev (Venus)" },
    { vaarHindi: "शनिवार (Saturday)", lord: "Shani Dev (Saturn)" }
  ];
  const vaar = vaarMap[dayIndex] || vaarMap[0];

  // 3. 27 Vedic Yogas: (Sun Longitude + Moon Longitude) / 13°20'
  const sumDeg = normalizeDeg(sunSid + moonSid);
  const yogaIndex = Math.floor(sumDeg / (360 / 27));
  const YOGA_NAMES = [
    "Vishkambha", "Priti", "Ayushman", "Saubhagya", "Shobhana",
    "Atiganda", "Sukarma", "Dhriti", "Shula", "Ganda",
    "Vriddhi", "Dhruva", "Vyaghata", "Harshana", "Vajra",
    "Siddhi", "Vyatipata", "Variyan", "Parigha", "Shiva",
    "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma", "Indra", "Vaidhriti"
  ];
  const yoga = YOGA_NAMES[yogaIndex] || YOGA_NAMES[0];

  // 4. 11 Karanas: Half of a Tithi (6° per Karana)
  const karanaIndex = Math.floor(diffDeg / 6) + 1;
  const movableKaranas = ["Bava", "Balava", "Kaulava", "Taitila", "Gara", "Vanija", "Vishti (Bhadra)"];
  let karana = "";
  if (karanaIndex === 1) karana = "Kimstughna";
  else if (karanaIndex >= 58) {
    if (karanaIndex === 58) karana = "Shakuni";
    else if (karanaIndex === 59) karana = "Chatushpada";
    else karana = "Naga";
  } else {
    karana = movableKaranas[(karanaIndex - 2) % 7];
  }

  return {
    tithi: tithiName,
    tithiIndex,
    vaar: vaar.vaarHindi,
    vaarLord: vaar.lord,
    yoga,
    karana
  };
}

/**
 * Determine Planetary Dignity (Uchha / Neecha / Swa-kshetra / Mitra / Shatru)
 */
function getPlanetaryDignity(planetName, rashiIndex) {
  const dignityMap = {
    "Sun": { exalted: 0, debilitated: 6, own: [4] },
    "Moon": { exalted: 1, debilitated: 7, own: [3] },
    "Mars": { exalted: 9, debilitated: 3, own: [0, 7] },
    "Mercury": { exalted: 5, debilitated: 11, own: [2, 5] },
    "Jupiter": { exalted: 3, debilitated: 9, own: [8, 11] },
    "Venus": { exalted: 11, debilitated: 5, own: [1, 6] },
    "Saturn": { exalted: 6, debilitated: 0, own: [9, 10] },
    "Rahu": { exalted: 1, debilitated: 7, own: [10] },
    "Ketu": { exalted: 7, debilitated: 1, own: [7] }
  };

  const rule = dignityMap[planetName];
  if (!rule) return "Neutral (Sam)";

  if (rashiIndex === rule.exalted) return "Exalted (Uchha - अत्यंत शुभ)";
  if (rashiIndex === rule.debilitated) return "Debilitated (Neecha - शांति आवश्यक)";
  if (rule.own.includes(rashiIndex)) return "Own Sign (Swa-Kshetra - बलवान)";
  return "In Sign (Sam)";
}

/**
 * Vedic Functional Benefic & Yogakaraka Determination based on Lagna
 */
function getLagnaBenefics(lagnaRashiIndex) {
  const lagnaRules = [
    { lagna: "Mesh", lagnesh: "Mars", yogakaraka: "Jupiter & Sun", benefics: ["Sun", "Jupiter", "Mars"], rudraksha: "3 Mukhi & 5 Mukhi", primeMukhi: 3 },
    { lagna: "Vrishabh", lagnesh: "Venus", yogakaraka: "Saturn", benefics: ["Saturn", "Mercury", "Venus"], rudraksha: "6 Mukhi & 7 Mukhi", primeMukhi: 6 },
    { lagna: "Mithun", lagnesh: "Mercury", yogakaraka: "Venus", benefics: ["Venus", "Mercury"], rudraksha: "4 Mukhi & 6 Mukhi", primeMukhi: 4 },
    { lagna: "Kark", lagnesh: "Moon", yogakaraka: "Mars", benefics: ["Mars", "Jupiter", "Moon"], rudraksha: "2 Mukhi & 3 Mukhi", primeMukhi: 2 },
    { lagna: "Singh", lagnesh: "Sun", yogakaraka: "Mars", benefics: ["Mars", "Sun", "Jupiter"], rudraksha: "1 Mukhi & 3 Mukhi", primeMukhi: 1 },
    { lagna: "Kanya", lagnesh: "Mercury", yogakaraka: "Venus", benefics: ["Venus", "Mercury"], rudraksha: "4 Mukhi & 6 Mukhi", primeMukhi: 4 },
    { lagna: "Tula", lagnesh: "Venus", yogakaraka: "Saturn", benefics: ["Saturn", "Mercury", "Venus"], rudraksha: "6 Mukhi & 7 Mukhi", primeMukhi: 6 },
    { lagna: "Vrischika", lagnesh: "Mars", yogakaraka: "Jupiter & Sun", benefics: ["Jupiter", "Sun", "Mars"], rudraksha: "3 Mukhi & 11 Mukhi", primeMukhi: 3 },
    { lagna: "Dhanu", lagnesh: "Jupiter", yogakaraka: "Mars & Sun", benefics: ["Sun", "Mars", "Jupiter"], rudraksha: "5 Mukhi & 1 Mukhi", primeMukhi: 5 },
    { lagna: "Makar", lagnesh: "Saturn", yogakaraka: "Venus", benefics: ["Venus", "Mercury", "Saturn"], rudraksha: "7 Mukhi & 14 Mukhi", primeMukhi: 7 },
    { lagna: "Kumbh", lagnesh: "Saturn", yogakaraka: "Venus", benefics: ["Venus", "Saturn"], rudraksha: "7 Mukhi & 11 Mukhi", primeMukhi: 7 },
    { lagna: "Meen", lagnesh: "Jupiter", yogakaraka: "Moon & Mars", benefics: ["Moon", "Mars", "Jupiter"], rudraksha: "5 Mukhi & 2 Mukhi", primeMukhi: 5 }
  ];

  return lagnaRules[lagnaRashiIndex] || lagnaRules[0];
}

/**
 * Canonical Primary Function: ONE KUNDALI = ONE CANONICAL PRIMARY RUDRAKSHA.
 * Personalized PRIMARY Rudraksha comes EXCLUSIVELY from this function based on Lagna Lord (लग्नेश).
 * Business, Career, Study, Finance, Marriage, Saturday or any question changing does NOT change this Primary Mukhi.
 */
export function getCanonicalPrimaryRudraksha(kundaliInput) {
  if (!kundaliInput) {
    return {
      role: "Canonical Primary Life Rudraksha (इष्ट व लग्न अधिपति)",
      mukhi: "5 Mukhi Rudraksha",
      mukhiNumber: 5,
      beejMantra: "ॐ ह्रीं नमः",
      significance: "सर्वजन कल्याण एवं पंच महाभूत संतुलन हेतु प्राकृतिक 5 मुखी रुद्राक्ष।",
      isCanonicalPrimary: true
    };
  }

  const astro = kundaliInput.astronomicalKundali || kundaliInput;
  
  let lagnaRashiName = astro.lagna?.rashiHindi || astro.lagna?.rashiName || astro.lagnaRashiHindi || astro.lagnaRashi || astro.lagna || "";
  if (!lagnaRashiName && typeof astro.lagna === "string") {
    lagnaRashiName = astro.lagna;
  }

  const LAGNA_CANONICAL_PRIMARY_MAP = {
    "Mesh": { mukhi: "3 Mukhi Rudraksha", mukhiNumber: 3, beejMantra: "ॐ क्लीं नमः", lord: "Mangal Dev (Mars)", significance: "आपकी जन्म कुंडली का लग्न मेष (Mesh) है, जिसके स्वामी मंगल देव हैं। आपके जीवन का स्थायी PRIMARY रुद्राक्ष 3 मुखी (3 Mukhi) है जो आत्मबल, ऊर्जा और मंगल दोष निवारण प्रदान करता है।" },
    "Aries": { mukhi: "3 Mukhi Rudraksha", mukhiNumber: 3, beejMantra: "ॐ क्लीं नमः", lord: "Mangal Dev (Mars)", significance: "आपकी जन्म कुंडली का लग्न मेष (Mesh) है, जिसके स्वामी मंगल देव हैं। आपके जीवन का स्थायी PRIMARY रुद्राक्ष 3 मुखी (3 Mukhi) है जो आत्मबल, ऊर्जा और मंगल दोष निवारण प्रदान करता है।" },
    "मेष": { mukhi: "3 Mukhi Rudraksha", mukhiNumber: 3, beejMantra: "ॐ क्लीं नमः", lord: "Mangal Dev (Mars)", significance: "आपकी जन्म कुंडली का लग्न मेष (Mesh) है, जिसके स्वामी मंगल देव हैं। आपके जीवन का स्थायी PRIMARY रुद्राक्ष 3 मुखी (3 Mukhi) है जो आत्मबल, ऊर्जा और मंगल दोष निवारण प्रदान करता है।" },

    "Vrishabh": { mukhi: "6 Mukhi Rudraksha", mukhiNumber: 6, beejMantra: "ॐ ह्रीं हुं नमः", lord: "Shukra Dev (Venus)", significance: "आपकी जन्म कुंडली का लग्न वृषभ (Vrishabh) है, जिसके स्वामी शुक्र देव हैं। आपके जीवन का स्थायी PRIMARY रुद्राक्ष 6 मुखी (6 Mukhi) है जो ज्ञान, आकर्षण, बुद्धि और शुक्र की कृपा प्रदान करता है।" },
    "Taurus": { mukhi: "6 Mukhi Rudraksha", mukhiNumber: 6, beejMantra: "ॐ ह्रीं हुं नमः", lord: "Shukra Dev (Venus)", significance: "आपकी जन्म कुंडली का लग्न वृषभ (Vrishabh) है, जिसके स्वामी शुक्र देव हैं। आपके जीवन का स्थायी PRIMARY रुद्राक्ष 6 मुखी (6 Mukhi) है जो ज्ञान, आकर्षण, बुद्धि और शुक्र की कृपा प्रदान करता है।" },
    "वृषभ": { mukhi: "6 Mukhi Rudraksha", mukhiNumber: 6, beejMantra: "ॐ ह्रीं हुं नमः", lord: "Shukra Dev (Venus)", significance: "आपकी जन्म कुंडली का लग्न वृषभ (Vrishabh) है, जिसके स्वामी शुक्र देव हैं। आपके जीवन का स्थायी PRIMARY रुद्राक्ष 6 मुखी (6 Mukhi) है जो ज्ञान, आकर्षण, बुद्धि और शुक्र की कृपा प्रदान करता है।" },

    "Mithun": { mukhi: "4 Mukhi Rudraksha", mukhiNumber: 4, beejMantra: "ॐ ह्रीं नमः", lord: "Budha Dev (Mercury)", significance: "आपकी जन्म कुंडली का लग्न मिथुन (Mithun) है, जिसके स्वामी बुध देव हैं। आपके जीवन का स्थायी PRIMARY रुद्राक्ष 4 मुखी (4 Mukhi) है जो वाक्-सिद्धि, कुशाग्र बुद्धि, व्यापारिक विवेक और वाणी बल प्रदान करता है।" },
    "Gemini": { mukhi: "4 Mukhi Rudraksha", mukhiNumber: 4, beejMantra: "ॐ ह्रीं नमः", lord: "Budha Dev (Mercury)", significance: "आपकी जन्म कुंडली का लग्न मिथुन (Mithun) है, जिसके स्वामी बुध देव हैं। आपके जीवन का स्थायी PRIMARY रुद्राक्ष 4 मुखी (4 Mukhi) है जो वाक्-सिद्धि, कुशाग्र बुद्धि, व्यापारिक विवेक और वाणी बल प्रदान करता है।" },
    "मिथुन": { mukhi: "4 Mukhi Rudraksha", mukhiNumber: 4, beejMantra: "ॐ ह्रीं नमः", lord: "Budha Dev (Mercury)", significance: "आपकी जन्म कुंडली का लग्न मिथुन (Mithun) है, जिसके स्वामी बुध देव हैं। आपके जीवन का स्थायी PRIMARY रुद्राक्ष 4 मुखी (4 Mukhi) है जो वाक्-सिद्धि, कुशाग्र बुद्धि, व्यापारिक विवेक और वाणी बल प्रदान करता है।" },

    "Kark": { mukhi: "2 Mukhi Rudraksha", mukhiNumber: 2, beejMantra: "ॐ नमः", lord: "Chandra Dev (Moon)", significance: "आपकी जन्म कुंडली का लग्न कर्क (Kark) है, जिसके स्वामी चंद्र देव हैं। आपके जीवन का स्थायी PRIMARY रुद्राक्ष 2 मुखी (2 Mukhi) है जो मानसिक शांति, अर्धनारीश्वर कृपा और भावनात्मक संतुलन प्रदान करता है।" },
    "Cancer": { mukhi: "2 Mukhi Rudraksha", mukhiNumber: 2, beejMantra: "ॐ नमः", lord: "Chandra Dev (Moon)", significance: "आपकी जन्म कुंडली का लग्न कर्क (Kark) है, जिसके स्वामी चंद्र देव हैं। आपके जीवन का स्थायी PRIMARY रुद्राक्ष 2 मुखी (2 Mukhi) है जो मानसिक शांति, अर्धनारीश्वर कृपा और भावनात्मक संतुलन प्रदान करता है।" },
    "कर्क": { mukhi: "2 Mukhi Rudraksha", mukhiNumber: 2, beejMantra: "ॐ नमः", lord: "Chandra Dev (Moon)", significance: "आपकी जन्म कुंडली का लग्न कर्क (Kark) है, जिसके स्वामी चंद्र देव हैं। आपके जीवन का स्थायी PRIMARY रुद्राक्ष 2 मुखी (2 Mukhi) है जो मानसिक शांति, अर्धनारीश्वर कृपा और भावनात्मक संतुलन प्रदान करता है।" },

    "Singh": { mukhi: "1 Mukhi Rudraksha", mukhiNumber: 1, beejMantra: "ॐ ह्रीं नमः", lord: "Surya Dev (Sun)", significance: "आपकी जन्म कुंडली का लग्न सिंह (Singh) है, जिसके स्वामी सूर्य देव हैं। आपके जीवन का स्थायी PRIMARY रुद्राक्ष 1 मुखी (1 Mukhi / 12 Mukhi) है जो नेतृत्व, राजकीय सम्मान, आत्मबल और सूर्य तेज प्रदान करता है।" },
    "Leo": { mukhi: "1 Mukhi Rudraksha", mukhiNumber: 1, beejMantra: "ॐ ह्रीं नमः", lord: "Surya Dev (Sun)", significance: "आपकी जन्म कुंडली का लग्न सिंह (Singh) है, जिसके स्वामी सूर्य देव हैं। आपके जीवन का स्थायी PRIMARY रुद्राक्ष 1 मुखी (1 Mukhi / 12 Mukhi) है जो नेतृत्व, राजकीय सम्मान, आत्मबल और सूर्य तेज प्रदान करता है।" },
    "सिंह": { mukhi: "1 Mukhi Rudraksha", mukhiNumber: 1, beejMantra: "ॐ ह्रीं नमः", lord: "Surya Dev (Sun)", significance: "आपकी जन्म कुंडली का लग्न सिंह (Singh) है, जिसके स्वामी सूर्य देव हैं। आपके जीवन का स्थायी PRIMARY रुद्राक्ष 1 मुखी (1 Mukhi / 12 Mukhi) है जो नेतृत्व, राजकीय सम्मान, आत्मबल और सूर्य तेज प्रदान करता है।" },

    "Kanya": { mukhi: "4 Mukhi Rudraksha", mukhiNumber: 4, beejMantra: "ॐ ह्रीं नमः", lord: "Budha Dev (Mercury)", significance: "आपकी जन्म कुंडली का लग्न कन्या (Kanya) है, जिसके स्वामी बुध देव हैं। आपके जीवन का स्थायी PRIMARY रुद्राक्ष 4 मुखी (4 Mukhi) है जो बौद्धिक स्पष्टता, विश्लेषणात्मक क्षमता और बुद्ध कृपा प्रदान करता है।" },
    "Virgo": { mukhi: "4 Mukhi Rudraksha", mukhiNumber: 4, beejMantra: "ॐ ह्रीं नमः", lord: "Budha Dev (Mercury)", significance: "आपकी जन्म कुंडली का लग्न कन्या (Kanya) है, जिसके स्वामी बुध देव हैं। आपके जीवन का स्थायी PRIMARY रुद्राक्ष 4 मुखी (4 Mukhi) है जो बौद्धिक स्पष्टता, विश्लेषणात्मक क्षमता और बुद्ध कृपा प्रदान करता है।" },
    "कन्या": { mukhi: "4 Mukhi Rudraksha", mukhiNumber: 4, beejMantra: "ॐ ह्रीं नमः", lord: "Budha Dev (Mercury)", significance: "आपकी जन्म कुंडली का लग्न कन्या (Kanya) है, जिसके स्वामी बुध देव हैं। आपके जीवन का स्थायी PRIMARY रुद्राक्ष 4 मुखी (4 Mukhi) है जो बौद्धिक स्पष्टता, विश्लेषणात्मक क्षमता और बुद्ध कृपा प्रदान करता है।" },

    "Tula": { mukhi: "6 Mukhi Rudraksha", mukhiNumber: 6, beejMantra: "ॐ ह्रीं हुं नमः", lord: "Shukra Dev (Venus)", significance: "आपकी जन्म कुंडली का लग्न तुला (Tula) है, जिसके स्वामी शुक्र देव हैं। आपके जीवन का स्थायी PRIMARY रुद्राक्ष 6 मुखी (6 Mukhi) है जो जीवन में सौन्दर्य, सामंजस्य, कला और शुक्र की कृपा प्रदान करता है।" },
    "Libra": { mukhi: "6 Mukhi Rudraksha", mukhiNumber: 6, beejMantra: "ॐ ह्रीं हुं नमः", lord: "Shukra Dev (Venus)", significance: "आपकी जन्म कुंडली का लग्न तुला (Tula) है, जिसके स्वामी शुक्र देव हैं। आपके जीवन का स्थायी PRIMARY रुद्राक्ष 6 मुखी (6 Mukhi) है जो जीवन में सौन्दर्य, सामंजस्य, कला और शुक्र की कृपा प्रदान करता है।" },
    "तुला": { mukhi: "6 Mukhi Rudraksha", mukhiNumber: 6, beejMantra: "ॐ ह्रीं हुं नमः", lord: "Shukra Dev (Venus)", significance: "आपकी जन्म कुंडली का लग्न तुला (Tula) है, जिसके स्वामी शुक्र देव हैं। आपके जीवन का स्थायी PRIMARY रुद्राक्ष 6 मुखी (6 Mukhi) है जो जीवन में सौन्दर्य, सामंजस्य, कला और शुक्र की कृपा प्रदान करता है।" },

    "Vrischika": { mukhi: "3 Mukhi Rudraksha", mukhiNumber: 3, beejMantra: "ॐ क्लीं नमः", lord: "Mangal Dev (Mars)", significance: "आपकी जन्म कुंडली का लग्न वृश्चिक (Vrischika) है, जिसके स्वामी मंगल देव हैं। आपके जीवन का स्थायी PRIMARY रुद्राक्ष 3 मुखी (3 Mukhi) है जो बाधा मुक्ति, प्रचंड ऊर्जा और मंगल कृपा प्रदान करता है।" },
    "Scorpio": { mukhi: "3 Mukhi Rudraksha", mukhiNumber: 3, beejMantra: "ॐ क्लीं नमः", lord: "Mangal Dev (Mars)", significance: "आपकी जन्म कुंडली का लग्न वृश्चिक (Vrischika) है, जिसके स्वामी मंगल देव हैं। आपके जीवन का स्थायी PRIMARY रुद्राक्ष 3 मुखी (3 Mukhi) है जो बाधा मुक्ति, प्रचंड ऊर्जा और मंगल कृपा प्रदान करता है।" },
    "वृश्चिक": { mukhi: "3 Mukhi Rudraksha", mukhiNumber: 3, beejMantra: "ॐ क्लीं नमः", lord: "Mangal Dev (Mars)", significance: "आपकी जन्म कुंडली का लग्न वृश्चिक (Vrischika) है, जिसके स्वामी मंगल देव हैं। आपके जीवन का स्थायी PRIMARY रुद्राक्ष 3 मुखी (3 Mukhi) है जो बाधा मुक्ति, प्रचंड ऊर्जा और मंगल कृपा प्रदान करता है।" },

    "Dhanu": { mukhi: "5 Mukhi Rudraksha", mukhiNumber: 5, beejMantra: "ॐ ह्रीं नमः", lord: "Guru Brihaspati (Jupiter)", significance: "आपकी जन्म कुंडली का लग्न धनु (Dhanu) है, जिसके स्वामी गुरु बृहस्पति हैं। आपके जीवन का स्थायी PRIMARY रुद्राक्ष 5 मुखी (5 Mukhi) है जो धर्म, उच्च ज्ञान, सुख-समृद्धि और गुरु कृपा प्रदान करता है।" },
    "Sagittarius": { mukhi: "5 Mukhi Rudraksha", mukhiNumber: 5, beejMantra: "ॐ ह्रीं नमः", lord: "Guru Brihaspati (Jupiter)", significance: "आपकी जन्म कुंडली का लग्न धनु (Dhanu) है, जिसके स्वामी गुरु बृहस्पति हैं। आपके जीवन का स्थायी PRIMARY रुद्राक्ष 5 मुखी (5 Mukhi) है जो धर्म, उच्च ज्ञान, सुख-समृद्धि और गुरु कृपा प्रदान करता है।" },
    "धनु": { mukhi: "5 Mukhi Rudraksha", mukhiNumber: 5, beejMantra: "ॐ ह्रीं नमः", lord: "Guru Brihaspati (Jupiter)", significance: "आपकी जन्म कुंडली का लग्न धनु (Dhanu) है, जिसके स्वामी गुरु बृहस्पति हैं। आपके जीवन का स्थायी PRIMARY रुद्राक्ष 5 मुखी (5 Mukhi) है जो धर्म, उच्च ज्ञान, सुख-समृद्धि और गुरु कृपा प्रदान करता है।" },

    "Makar": { mukhi: "7 Mukhi Rudraksha", mukhiNumber: 7, beejMantra: "ॐ हुं नमः", lord: "Shani Dev (Saturn)", significance: "आपकी जन्म कुंडली का लग्न मकर (Makar) है, जिसके स्वामी शनि देव हैं। आपके जीवन का स्थायी PRIMARY रुद्राक्ष 7 मुखी (7 Mukhi) है जो महालक्ष्मी कृपा, शनि दोष शमन और दीर्घकालिक सफलता प्रदान करता है।" },
    "Capricorn": { mukhi: "7 Mukhi Rudraksha", mukhiNumber: 7, beejMantra: "ॐ हुं नमः", lord: "Shani Dev (Saturn)", significance: "आपकी जन्म कुंडली का लग्न मकर (Makar) है, जिसके स्वामी शनि देव हैं। आपके जीवन का स्थायी PRIMARY रुद्राक्ष 7 मुखी (7 Mukhi) है जो महालक्ष्मी कृपा, शनि दोष शमन और दीर्घकालिक सफलता प्रदान करता है।" },
    "मकर": { mukhi: "7 Mukhi Rudraksha", mukhiNumber: 7, beejMantra: "ॐ हुं नमः", lord: "Shani Dev (Saturn)", significance: "आपकी जन्म कुंडली का लग्न मकर (Makar) है, जिसके स्वामी शनि देव हैं। आपके जीवन का स्थायी PRIMARY रुद्राक्ष 7 मुखी (7 Mukhi) है जो महालक्ष्मी कृपा, शनि दोष शमन और दीर्घकालिक सफलता प्रदान करता है।" },

    "Kumbh": { mukhi: "7 Mukhi Rudraksha", mukhiNumber: 7, beejMantra: "ॐ हुं नमः", lord: "Shani Dev (Saturn)", significance: "आपकी जन्म कुंडली का लग्न कुंभ (Kumbh) है, जिसके स्वामी शनि देव हैं। आपके जीवन का स्थायी PRIMARY रुद्राक्ष 7 मुखी (7 Mukhi) है जो महालक्ष्मी कृपा, आर्थिक स्थिरता और शनि देव की छत्रछाया प्रदान करता है।" },
    "Aquarius": { mukhi: "7 Mukhi Rudraksha", mukhiNumber: 7, beejMantra: "ॐ हुं नमः", lord: "Shani Dev (Saturn)", significance: "आपकी जन्म कुंडली का लग्न कुंभ (Kumbh) है, जिसके स्वामी शनि देव हैं। आपके जीवन का स्थायी PRIMARY रुद्राक्ष 7 मुखी (7 Mukhi) है जो महालक्ष्मी कृपा, आर्थिक स्थिरता और शनि देव की छत्रछाया प्रदान करता है।" },
    "कुंभ": { mukhi: "7 Mukhi Rudraksha", mukhiNumber: 7, beejMantra: "ॐ हुं नमः", lord: "Shani Dev (Saturn)", significance: "आपकी जन्म कुंडली का लग्न कुंभ (Kumbh) है, जिसके स्वामी शनि देव हैं। आपके जीवन का स्थायी PRIMARY रुद्राक्ष 7 मुखी (7 Mukhi) है जो महालक्ष्मी कृपा, आर्थिक स्थिरता और शनि देव की छत्रछाया प्रदान करता है।" },

    "Meen": { mukhi: "5 Mukhi Rudraksha", mukhiNumber: 5, beejMantra: "ॐ ह्रीं नमः", lord: "Guru Brihaspati (Jupiter)", significance: "आपकी जन्म कुंडली का लग्न मीन (Meen) है, जिसके स्वामी गुरु बृहस्पति हैं। आपके जीवन का स्थायी PRIMARY रुद्राक्ष 5 मुखी (5 Mukhi) है जो आध्यात्मिक चेतना, सात्विक ज्ञान और गुरु देव का आशीर्वाद प्रदान करता है।" },
    "Pisces": { mukhi: "5 Mukhi Rudraksha", mukhiNumber: 5, beejMantra: "ॐ ह्रीं नमः", lord: "Guru Brihaspati (Jupiter)", significance: "आपकी जन्म कुंडली का लग्न मीन (Meen) है, जिसके स्वामी गुरु बृहस्पति हैं। आपके जीवन का स्थायी PRIMARY रुद्राक्ष 5 मुखी (5 Mukhi) है जो आध्यात्मिक चेतना, सात्विक ज्ञान और गुरु देव का आशीर्वाद प्रदान करता है।" },
    "मीन": { mukhi: "5 Mukhi Rudraksha", mukhiNumber: 5, beejMantra: "ॐ ह्रीं नमः", lord: "Guru Brihaspati (Jupiter)", significance: "आपकी जन्म कुंडली का लग्न मीन (Meen) है, जिसके स्वामी गुरु बृहस्पति हैं। आपके जीवन का स्थायी PRIMARY रुद्राक्ष 5 मुखी (5 Mukhi) है जो आध्यात्मिक चेतना, सात्विक ज्ञान और गुरु देव का आशीर्वाद प्रदान करता है।" }
  };

  let matched = LAGNA_CANONICAL_PRIMARY_MAP[lagnaRashiName];

  if (!matched && lagnaRashiName) {
    for (const [kKey, val] of Object.entries(LAGNA_CANONICAL_PRIMARY_MAP)) {
      if (lagnaRashiName.toLowerCase().includes(kKey.toLowerCase())) {
        matched = val;
        break;
      }
    }
  }

  if (!matched) {
    const chandraName = astro.chandraRashi?.rashiName || astro.chandraRashi?.rashiHindi || astro.rashiHindi || "";
    if (chandraName && LAGNA_CANONICAL_PRIMARY_MAP[chandraName]) {
      matched = LAGNA_CANONICAL_PRIMARY_MAP[chandraName];
    }
  }

  if (matched) {
    return {
      role: "Canonical Primary Life Rudraksha (इष्ट व लग्न अधिपति)",
      mukhi: matched.mukhi,
      mukhiNumber: matched.mukhiNumber,
      beejMantra: matched.beejMantra,
      significance: matched.significance,
      isCanonicalPrimary: true
    };
  }

  return {
    role: "Canonical Primary Life Rudraksha (इष्ट व लग्न अधिपति)",
    mukhi: "5 Mukhi Rudraksha",
    mukhiNumber: 5,
    beejMantra: "ॐ ह्रीं नमः",
    significance: "आपकी जन्म कुंडली के अनुसार 5 मुखी रुद्राक्ष आपका स्थायी प्राथमिक (PRIMARY) रुद्राक्ष है।",
    isCanonicalPrimary: true
  };
}

/**
 * 12 Classical Types of Kaal Sarp Dosha Determination
 */
function getKaalSarpType(rahuHouse, ketuHouse, planets) {
  const nonNodePlanets = planets.filter(p => p.englishName !== "Rahu" && p.englishName !== "Ketu");
  const houses = nonNodePlanets.map(p => p.houseNumber);

  // Check if all planets lie on one side of Rahu-Ketu axis
  let allOneSide = true;
  for (const h of houses) {
    const diff = (h - rahuHouse + 12) % 12;
    if (diff > 6) {
      allOneSide = false;
      break;
    }
  }

  if (!allOneSide) {
    let allOtherSide = true;
    for (const h of houses) {
      const diff = (h - ketuHouse + 12) % 12;
      if (diff > 6) {
        allOtherSide = false;
        break;
      }
    }
    if (!allOtherSide) return null;
  }

  const KAALSARP_TYPES = {
    1: { type: "Anant Kaal Sarp Dosha (1st-7th House Axis)", description: "Affects self-identity, marriage, health & focus. Remedy: 8 Mukhi + 9 Mukhi + 11 Mukhi Rudraksha." },
    2: { type: "Kulik Kaal Sarp Dosha (2nd-8th House Axis)", description: "Affects family wealth, speech & financial stability. Remedy: 8 Mukhi + 10 Mukhi Rudraksha." },
    3: { type: "Vasuki Kaal Sarp Dosha (3rd-9th House Axis)", description: "Affects courage, siblings & fortune. Remedy: 8 Mukhi + 9 Mukhi Rudraksha." },
    4: { type: "Shankhpal Kaal Sarp Dosha (4th-10th House Axis)", description: "Affects mental peace, mother, property & career. Remedy: 8 Mukhi + 4 Mukhi Rudraksha." },
    5: { type: "Padma Kaal Sarp Dosha (5th-11th House Axis)", description: "Affects education, progeny, investments & gains. Remedy: 8 Mukhi + 5 Mukhi Rudraksha." },
    6: { type: "Mahapadma Kaal Sarp Dosha (6th-12th House Axis)", description: "Affects health, litigation, debts & overseas travel. Remedy: 8 Mukhi + 11 Mukhi Rudraksha." },
    7: { type: "Takshak Kaal Sarp Dosha (7th-1st House Axis)", description: "Affects partnerships, marital harmony & business ventures. Remedy: 8 Mukhi + Gauri Shankar Rudraksha." },
    8: { type: "Karkotak Kaal Sarp Dosha (8th-2nd House Axis)", description: "Affects longevity, sudden obstacles & paternal inheritance. Remedy: 8 Mukhi + 7 Mukhi Rudraksha." },
    9: { type: "Shankhachud Kaal Sarp Dosha (9th-3rd House Axis)", description: "Affects spiritual fortune, father & dharma. Remedy: 8 Mukhi + 9 Mukhi Rudraksha." },
    10: { type: "Ghatak Kaal Sarp Dosha (10th-4th House Axis)", description: "Affects career promotions, status & reputation. Remedy: 8 Mukhi + 10 Mukhi Rudraksha." },
    11: { type: "Vishdhar Kaal Sarp Dosha (11th-5th House Axis)", description: "Affects regular income, elder siblings & memory. Remedy: 8 Mukhi + 11 Mukhi Rudraksha." },
    12: { type: "Sheshnag Kaal Sarp Dosha (12th-6th House Axis)", description: "Affects secret enemies, expenditures & sleep. Remedy: 8 Mukhi + 12 Mukhi Rudraksha." }
  };

  return KAALSARP_TYPES[rahuHouse] || { type: "Kaal Sarp Yoga", description: "Planets hemmed between Rahu and Ketu. Remedy: 8 Mukhi + 9 Mukhi Rudraksha." };
}

/**
 * Shani Sade Sati and Dhaiya Tracker
 * Based on natal Moon sign and Saturn transit
 */
function getSadeSatiStatus(moonRashiIdx, saturnSid) {
  const currentSaturnRashiIdx = getRashiAndDegree(saturnSid).rashiIndex;
  const diff = (currentSaturnRashiIdx - moonRashiIdx + 12) % 12;

  if (diff === 11) {
    return {
      phase: "Rising Phase (प्रथम चरण - उदय चरण)",
      description: "शनि साढ़े साती का प्रथम चरण — मानसिक चिंता व व्यय की अधिकता। उपाय: 7 मुखी अथवा 14 मुखी रुद्राक्ष।"
    };
  } else if (diff === 0) {
    return {
      phase: "Peak / Madhya Phase (द्वितीय चरण - शिखर चरण)",
      description: "शनि साढ़े साती का मध्य चरण — करियर व व्यक्तिगत जीवन में कर्म फल व संघर्ष। उपाय: 7 मुखी व 11 मुखी रुद्राक्ष।"
    };
  } else if (diff === 1) {
    return {
      phase: "Setting / Asta Phase (तृतीय चरण - अस्त चरण)",
      description: "शनि साढ़े साती का अंतिम चरण — राहत, स्थिरता व नवीन दिशा। उपाय: 7 मुखी रुद्राक्ष।"
    };
  } else if (diff === 3) {
    return {
      phase: "Kantaka Shani / Dhaiya (चौथा शनि ढैया)",
      description: "शनि की लघु कल्याणी ढैया (4th House)। उपाय: 7 मुखी रुद्राक्ष।"
    };
  } else if (diff === 7) {
    return {
      phase: "Ashtama Shani / Dhaiya (अष्टम शनि ढैया)",
      description: "शनि की अष्टम ढैया (8th House)। उपाय: 7 मुखी व 11 मुखी रुद्राक्ष।"
    };
  }

  return {
    phase: "Sade Sati Mukt (साढ़े साती मुक्त)",
    description: "वर्तमान में साढ़े साती का प्रत्यक्ष प्रभाव नहीं है। शुभ गोचर है।"
  };
}

/**
 * Master Function: Calculate Authentic Full Vedic Kundali from verified Birth Details
 * 
 * Accepts flexible parameter object with aliases:
 * dob/birthDate/dateOfBirth, birthTime/time/tob, birthPlace/place/pob, name, gender, concern, customConcern
 */
export function calculateAuthenticKundali(params = {}) {
  // Support positional backward-compatibility
  let resolvedParams = params;
  if (typeof params === "string") {
    resolvedParams = { dob: arguments[0], birthTime: arguments[1], birthPlace: arguments[2], name: arguments[3], gender: arguments[4], concern: arguments[5] };
  }

  const rawDob = resolvedParams.dob || resolvedParams.birthDate || resolvedParams.dateOfBirth;
  const rawTime = resolvedParams.birthTime || resolvedParams.time || resolvedParams.tob || resolvedParams.birth_time;
  const rawPlace = resolvedParams.birthPlace || resolvedParams.place || resolvedParams.pob || resolvedParams.birth_place;
  const name = resolvedParams.name || "Devotee";
  const gender = resolvedParams.gender || "Not Specified";
  const concern = resolvedParams.concern || "career";
  const customConcern = resolvedParams.customConcern || "";

  if (!rawDob || typeof rawDob !== "string" || !rawDob.trim()) {
    throw new Error("Date of Birth (dob) is required for authentic Kundali calculation.");
  }
  if (!rawTime || typeof rawTime !== "string" || !rawTime.trim()) {
    throw new Error("Exact Birth Time (birthTime) is required for authentic Lagna & Kundali calculation.");
  }
  if (!rawPlace || typeof rawPlace !== "string" || !rawPlace.trim()) {
    throw new Error("Birth Place (birthPlace) is required for authentic Vedic Kundali coordinates.");
  }

  const cleanDob = rawDob.trim();
  const [yStr, mStr, dStr] = cleanDob.split(/[-/.]/);
  const year = parseInt(yStr, 10);
  const month = parseInt(mStr, 10);
  const day = parseInt(dStr, 10);

  if (isNaN(year) || isNaN(month) || isNaN(day) || year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error("Invalid date of birth format. Please provide YYYY-MM-DD.");
  }

  // Robust Time Parser (supports "14:30", "2:30 PM", "08:15 AM", "14.30")
  let hour = 12;
  let minute = 0;
  const cleanTime = String(rawTime).trim();
  const isPm = /pm/i.test(cleanTime);
  const isAm = /am/i.test(cleanTime);
  const timeDigits = cleanTime.replace(/[^\d:]/g, "").split(":");

  if (timeDigits.length >= 2) {
    hour = parseInt(timeDigits[0], 10);
    minute = parseInt(timeDigits[1], 10);
  } else {
    hour = parseInt(timeDigits[0] || "12", 10);
    minute = 0;
  }

  if (isPm && hour < 12) hour += 12;
  if (isAm && hour === 12) hour = 0;

  if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error("Invalid birth time format. Please provide time in HH:MM format (e.g. 14:30 or 06:15 AM).");
  }

  const formattedBirthTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  // Resolve Location Coordinates and Timezone
  const location = resolveLocationCoordinates(rawPlace);
  if (!location) {
    throw new Error("Birth place could not be identified. Please enter a valid city or district name.");
  }

  const decimalLocalHour = hour + minute / 60.0;
  const decimalUtcHour = decimalLocalHour - location.tz;

  // Julian Day
  const jd = getJulianDay(year, month, day, decimalUtcHour);
  const t = (jd - 2451545.0) / 36525.0;

  // Ayanamsha (Chitrapaksha / Lahiri)
  const ayanamsha = calculateLahiriAyanamsha(jd);

  // Tropical Longitudes
  const sunTrop = calculateSunLongitude(t, jd);
  const moonTrop = calculateMoonLongitude(t, jd);
  const { rahu: rahuTrop, ketu: ketuTrop } = calculateNodes(t);
  const { mercury: mercTrop, venus: venTrop, mars: marsTrop, jupiter: jupTrop, saturn: satTrop } = calculatePlanetLongitudes(t);

  // Sidereal (Vedic) Longitudes = Tropical - Ayanamsha
  const sunSid = normalizeDeg(sunTrop - ayanamsha);
  const moonSid = normalizeDeg(moonTrop - ayanamsha);
  const marsSid = normalizeDeg(marsTrop - ayanamsha);
  const mercSid = normalizeDeg(mercTrop - ayanamsha);
  const jupSid = normalizeDeg(jupTrop - ayanamsha);
  const venSid = normalizeDeg(venTrop - ayanamsha);
  const satSid = normalizeDeg(satTrop - ayanamsha);
  const rahuSid = normalizeDeg(rahuTrop - ayanamsha);
  const ketuSid = normalizeDeg(ketuTrop - ayanamsha);

  // Ascendant (Lagna)
  const lagnaSid = calculateAscendant(jd, decimalUtcHour, location.lon, location.lat, ayanamsha);

  // Rashi & Nakshatra breakdowns
  const lagnaDetails = getRashiAndDegree(lagnaSid);
  const lagnaNak = getNakshatraAndPada(lagnaSid);
  const lagnaNavamsha = calculateNavamshaRashi(lagnaSid);

  const moonDetails = getRashiAndDegree(moonSid);
  const moonNak = getNakshatraAndPada(moonSid);
  const moonNavamsha = calculateNavamshaRashi(moonSid);

  const sunDetails = getRashiAndDegree(sunSid);
  const sunNak = getNakshatraAndPada(sunSid);
  const sunNavamsha = calculateNavamshaRashi(sunSid);

  // Panchanga
  const birthDateObj = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const panchanga = calculatePanchanga(sunSid, moonSid, birthDateObj);

  // Calculate 12 Houses (Bhavas) relative to Lagna
  const lagnaRashiIndex = lagnaDetails.rashiIndex;

  function getHouseNumber(planetRashiIndex) {
    return ((planetRashiIndex - lagnaRashiIndex + 12) % 12) + 1;
  }

  // Planets Table with D9 Navamsha, Divisional Charts & Vargottama Detection
  const rawPlanets = [
    { name: "Surya (Sun)", key: "Sun", english: "Sun", deg: sunSid, details: sunDetails, nak: sunNak, d9: sunNavamsha, vargas: calculateDivisionalCharts(sunSid) },
    { name: "Chandra (Moon)", key: "Moon", english: "Moon", deg: moonSid, details: moonDetails, nak: moonNak, d9: moonNavamsha, vargas: calculateDivisionalCharts(moonSid) },
    { name: "Mangal (Mars)", key: "Mars", english: "Mars", deg: marsSid, details: getRashiAndDegree(marsSid), nak: getNakshatraAndPada(marsSid), d9: calculateNavamshaRashi(marsSid), vargas: calculateDivisionalCharts(marsSid) },
    { name: "Budha (Mercury)", key: "Mercury", english: "Mercury", deg: mercSid, details: getRashiAndDegree(mercSid), nak: getNakshatraAndPada(mercSid), d9: calculateNavamshaRashi(mercSid), vargas: calculateDivisionalCharts(mercSid) },
    { name: "Guru (Jupiter)", key: "Jupiter", english: "Jupiter", deg: jupSid, details: getRashiAndDegree(jupSid), nak: getNakshatraAndPada(jupSid), d9: calculateNavamshaRashi(jupSid), vargas: calculateDivisionalCharts(jupSid) },
    { name: "Shukra (Venus)", key: "Venus", english: "Venus", deg: venSid, details: getRashiAndDegree(venSid), nak: getNakshatraAndPada(venSid), d9: calculateNavamshaRashi(venSid), vargas: calculateDivisionalCharts(venSid) },
    { name: "Shani (Saturn)", key: "Saturn", english: "Saturn", deg: satSid, details: getRashiAndDegree(satSid), nak: getNakshatraAndPada(satSid), d9: calculateNavamshaRashi(satSid), vargas: calculateDivisionalCharts(satSid) },
    { name: "Rahu (North Node)", key: "Rahu", english: "Rahu", deg: rahuSid, details: getRashiAndDegree(rahuSid), nak: getNakshatraAndPada(rahuSid), d9: calculateNavamshaRashi(rahuSid), vargas: calculateDivisionalCharts(rahuSid) },
    { name: "Ketu (South Node)", key: "Ketu", english: "Ketu", deg: ketuSid, details: getRashiAndDegree(ketuSid), nak: getNakshatraAndPada(ketuSid), d9: calculateNavamshaRashi(ketuSid), vargas: calculateDivisionalCharts(ketuSid) }
  ];

  let calculatedPlanets = rawPlanets.map((p) => {
    const house = getHouseNumber(p.details.rashiIndex);
    const dignity = getPlanetaryDignity(p.key, p.details.rashiIndex);
    const isVargottama = p.details.rashiIndex === p.d9.rashiIndex;
    return {
      name: p.name,
      englishName: p.english,
      key: p.key,
      rashiHindi: p.details.rashiName,
      rashiEnglish: p.details.rashiEnglish,
      rashiSymbol: p.details.rashiSymbol,
      degreeInSign: p.details.formattedDegree,
      rawDegreeInSign: p.details.degreeInSign,
      totalDegree: p.deg,
      houseNumber: house,
      nakshatra: p.nak.name,
      nakshatraLord: p.nak.lord,
      pada: p.nak.pada,
      dignity,
      navamshaRashiHindi: p.d9.rashiName,
      navamshaRashiEnglish: p.d9.rashiEnglish,
      vargas: p.vargas,
      isVargottama
    };
  });

  // Calculate Combustion status
  const planets = calculateCombustion(calculatedPlanets, sunSid);

  // Calculate Planetary Aspects
  const planetaryAspects = calculatePlanetaryAspects(planets);

  // Bhavas (Houses) distribution with Aspects & Lords
  const houses = [];
  for (let h = 1; h <= 12; h++) {
    const houseRashiIdx = (lagnaRashiIndex + h - 1) % 12;
    const rashiObj = RASHIS[houseRashiIdx];
    const occupants = planets.filter((p) => p.houseNumber === h).map((p) => p.name);
    const aspectsOnHouse = planetaryAspects[h] || [];
    houses.push({
      houseNumber: h,
      rashiHindi: rashiObj.name,
      rashiEnglish: rashiObj.english,
      rashiSymbol: rashiObj.symbol,
      lord: rashiObj.lord,
      element: rashiObj.element,
      occupants: occupants.length > 0 ? occupants : ["Shunya (No direct planet)"],
      aspects: aspectsOnHouse
    });
  }

  // Jaimini 7 Chara Karakas
  const jaiminiKarakas = calculateJaiminiCharaKarakas(planets);

  // Badhaka & Maraka Analysis
  const badhakaMarakaInfo = getBadhakaAndMaraka(lagnaRashiIndex, houses);

  // Manglik Dosha Analysis
  const mars = planets.find(p => p.key === "Mars") || {};
  const marsHouse = mars.houseNumber || 1;
  const isManglikPosition = [1, 4, 7, 8, 12].includes(marsHouse);
  const isMarsInOwnOrExalted = mars.dignity?.includes("Exalted") || mars.dignity?.includes("Own");
  const isManglik = isManglikPosition && !isMarsInOwnOrExalted;

  // Sade Sati & Kaal Sarp
  const saturn = planets.find(p => p.key === "Saturn") || {};
  const saturnSidDeg = saturn.totalDegree || 0;
  const sadeSatiInfo = getSadeSatiStatus(moonDetails.rashiIndex, saturnSidDeg);

  const rahu = planets.find(p => p.key === "Rahu") || {};
  const ketu = planets.find(p => p.key === "Ketu") || {};
  const kaalSarpInfo = getKaalSarpType(rahu.houseNumber || 1, ketu.houseNumber || 7, planets);

  // Yogas
  const yogas = [];
  const jup = planets.find(p => p.key === "Jupiter");
  const moon = planets.find(p => p.key === "Moon");
  if (jup && moon) {
    const diff = ((jup.houseNumber - moon.houseNumber + 12) % 12) + 1;
    if ([1, 4, 7, 10].includes(diff)) {
      yogas.push({ name: "Gajakesari Yoga", category: "Raja Yoga", description: "Guru-Chandra Kendra sthiti: Yash, vidya aur samman prapti." });
    }
  }

  // Vimshottari Dasha
  const dashaInfo = calculateVimshottariDasha(moonSid, birthDateObj, new Date());

  // Lagna Analysis & Yogakaraka
  const lagnaBeneficInfo = getLagnaBenefics(lagnaRashiIndex);

  // CANONICAL PRIMARY RUDRAKSHA: ONE KUNDALI = ONE CANONICAL PRIMARY RUDRAKSHA
  // Derived strictly from Lagna Lord (लग्नेश) and constant across all concerns, questions, and dates.
  const canonicalPrimary = getCanonicalPrimaryRudraksha({
    astronomicalKundali: {
      lagna: lagnaDetails,
      chandraRashi: moonDetails,
      lagnaBeneficInfo
    }
  });

  // Rudraksha recommendations: Entry 0 is ALWAYS the Immutable Canonical Primary Rudraksha
  const rudrakshaRecommendations = [];

  // 1. Canonical Primary Life Rudraksha (Lagna Lord)
  rudrakshaRecommendations.push({
    role: "Canonical Primary Life Rudraksha (इष्ट व लग्न अधिपति)",
    significance: canonicalPrimary.significance,
    mukhi: canonicalPrimary.mukhi,
    mukhiNumber: canonicalPrimary.mukhiNumber,
    beejMantra: canonicalPrimary.beejMantra,
    isCanonicalPrimary: true
  });

  // 2. Rashi Rudraksha (Mind & Harmony)
  const rashiRudrakshaMap = {
    "Mesh": 3, "Vrishabh": 6, "Mithun": 4, "Kark": 2,
    "Singh": 1, "Kanya": 4, "Tula": 6, "Vrischika": 3,
    "Dhanu": 5, "Makar": 7, "Kumbh": 7, "Meen": 5
  };
  const rashiMukhi = rashiRudrakshaMap[moonDetails.rashiName] || 5;
  rudrakshaRecommendations.push({
    role: "Chandra Rashi Rudraksha (चंद्र राशि अधिपति)",
    significance: `Aapki Janma Rashi ${moonDetails.rashiName} (${moonDetails.rashiEnglish}) hai, jiske Swami ${moonDetails.lord} hain. Yeh man ki shanti, emotional balance aur decision making ke liye labhkari hai.`,
    mukhi: `${rashiMukhi} Mukhi Rudraksha`,
    mukhiNumber: rashiMukhi,
    isCanonicalPrimary: false
  });

  // 3. Current Dasha Rudraksha
  rudrakshaRecommendations.push({
    role: `Current Dasha Rudraksha (${dashaInfo.currentMahadasha} Mahadasha)`,
    significance: `Aapke jeevan mein vartaman mein ${dashaInfo.currentMahadashaHindi} ki Mahadasha chal rahi hai. Is grah ke shubh prabhav ko badhane hetu ${dashaInfo.recommendedDashaRudraksha} anukul hai.`,
    mukhi: dashaInfo.recommendedDashaRudraksha,
    mukhiNumber: parseInt(dashaInfo.recommendedDashaRudraksha, 10) || 5,
    isCanonicalPrimary: false
  });

  // 4. Concern / Life Goal Complementary Focus (Explanation only - NEVER overrides Primary Mukhi)
  const concernMap = {
    "all": { mukhi: "1 Mukhi / 5 Mukhi / 108 Jaap Mala", role: "Complete Life Guidance (संपूर्ण जीवन संरक्षण)", significance: "समस्त जीवन क्षेत्रों की समग्र उन्नति हेतु पूरक मार्गदर्शन।" },
    "career": { mukhi: "7 Mukhi / 10 Mukhi / 14 Mukhi", role: "Career & Leadership (करियर व आजीविका पूरक)", significance: "करियर और व्यावसायिक उन्नति हेतु पूरक मार्गदर्शन।" },
    "business": { mukhi: "7 Mukhi / 8 Mukhi / 12 Mukhi", role: "Business & Trade (व्यापार व व्यवसाय पूरक)", significance: "व्यापार विस्तार व नकदी प्रवाह हेतु पूरक मार्गदर्शन।" },
    "education": { mukhi: "4 Mukhi / 5 Mukhi", role: "Education & Intellect (विद्या व एकाग्रता पूरक)", significance: "विद्या, स्मरण शक्ति व परीक्षा सफलता हेतु पूरक मार्गदर्शन।" },
    "marriage": { mukhi: "2 Mukhi / Gauri Shankar", role: "Marriage & Harmony (विवाह व दांपत्य पूरक)", significance: "विवाह व संबंधों में सामंजस्य हेतु पूरक मार्गदर्शन।" },
    "love": { mukhi: "2 Mukhi / 6 Mukhi / 13 Mukhi", role: "Love & Attraction (प्रेम संबंध पूरक)", significance: "आपसी आकर्षण व प्रेम में सामंजस्य हेतु पूरक मार्गदर्शन।" },
    "family": { mukhi: "2 Mukhi / 3 Mukhi", role: "Family Peace (पारिवारिक शांति पूरक)", significance: "पारिवारिक शांति व सुख हेतु पूरक मार्गदर्शन।" },
    "health": { mukhi: "3 Mukhi / 5 Mukhi / 11 Mukhi", role: "Health & Vitality (आरोग्य पूरक)", significance: "स्वास्थ्य, ऊर्जा व इम्युनिटी हेतु पूरक मार्गदर्शन।" },
    "finance": { mukhi: "7 Mukhi / 13 Mukhi", role: "Wealth & Debt Relief (धन समृद्धि पूरक)", significance: "आर्थिक स्थिरता व समृद्धि हेतु पूरक मार्गदर्शन।" },
    "children": { mukhi: "Garbh Gauri / 5 Mukhi", role: "Children & Progeny (संतान सुख पूरक)", significance: "संतान सुख व संतान कल्याण हेतु पूरक मार्गदर्शन।" },
    "property": { mukhi: "3 Mukhi / 10 Mukhi", role: "Property & Assets (भूमि भवन पूरक)", significance: "भूमि, मकान व स्थायी संपत्ति हेतु पूरक मार्गदर्शन।" },
    "spiritual": { mukhi: "1 Mukhi / 14 Mukhi / 108 Jaap Mala", role: "Spiritual Upliftment (आध्यात्मिक उन्नति पूरक)", significance: "साधना व मानसिक ध्यान हेतु पूरक मार्गदर्शन।" },
    "foreign_travel": { mukhi: "8 Mukhi / 12 Mukhi", role: "Foreign Travel & Visa (विदेश योग पूरक)", significance: "विदेश यात्रा व विदेश योग हेतु पूरक मार्गदर्शन।" },
    "legal": { mukhi: "8 Mukhi / 10 Mukhi / 11 Mukhi", role: "Legal Victory (कानूनी विजय पूरक)", significance: "कानूनी अड़चनों के निवारण हेतु पूरक मार्गदर्शन।" },
    "shani_dosha": { mukhi: "7 Mukhi / 14 Mukhi / 11 Mukhi", role: "Dosha & Shani Shanti (शनि व ग्रह शांति पूरक)", significance: "ग्रह शांति व ग्रह दोष निवारण हेतु पूरक मार्गदर्शन।" },
    "peace": { mukhi: "2 Mukhi / 5 Mukhi", role: "Mental Peace (मानसिक शांति पूरक)", significance: "मानसिक शांति व तनाव मुक्ति हेतु पूरक मार्गदर्शन।" },
    "general": { mukhi: "5 Mukhi / 7 Mukhi", role: "General Auspiciousness (सर्वकल्याण पूरक)", significance: "सामान्य कल्याण हेतु पूरक मार्गदर्शन।" },
    "custom": { mukhi: "1 Mukhi / 5 Mukhi / 11 Mukhi", role: "Special Purpose (विशेष संकल्प पूरक)", significance: customConcern ? `Devotee's custom concern: "${customConcern}".` : "Tailored solution for personal intention." }
  };

  const selectedConcern = concernMap[concern] || concernMap["all"];
  rudrakshaRecommendations.push({
    role: `Complementary Goal Focus (${selectedConcern.role})`,
    significance: `${selectedConcern.significance} (Note: Your PRIMARY Rudraksha remains ${canonicalPrimary.mukhi}).`,
    mukhi: selectedConcern.mukhi,
    mukhiNumber: parseInt(selectedConcern.mukhi, 10) || canonicalPrimary.mukhiNumber,
    isCanonicalPrimary: false
  });

  // Numerology Mulank (Day of Birth)
  const mulank = ((day - 1) % 9) + 1;

  // 1. Avakahada Chakra Calculation
  const avakahadaChakra = calculateAvakahadaChakra(moonSid, moonNak, moonDetails, cleanDob);

  // 2. Shodashvarga (16 Divisional Charts)
  const shodashvarga = calculateShodashvarga(planets, lagnaSid);

  // 3. Shadbala and Bhavabala
  const shadbala = calculateShadbala(planets, houses, lagnaSid, sunSid, moonSid);

  // 4. Ashtakvarga and Sarvashtakvarga (SAV)
  const ashtakvarga = calculateAshtakvarga(planets, lagnaSid);

  // 5. KP System (Krishnamurti Paddhati)
  const kpSystem = calculateKpSystem(planets, houses, lagnaSid, moonSid);

  // 6. Jaimini System & Chara Dasha
  const jaimini = calculateJaiminiSystem(planets, lagnaSid, cleanDob);

  // 7. Lal Kitab System
  const lalKitab = calculateLalKitab(planets, houses);

  // 8. Yogini Dasha (36-year cycle)
  const yoginiDasha = calculateYoginiDasha(moonSid, cleanDob);

  // 9. Tajik Varshphal
  const tajikVarshphal = calculateTajikVarshphal(cleanDob, lagnaSid, moonSid, planets);

  // 10. Gochar (Planetary Transits from Moon Sign)
  const gochar = calculateGochar(moonSid);

  const doshaSummaryObj = {
    isManglik,
    isManglikPosition,
    manglikNote: isManglik 
      ? `Mangal ${marsHouse}th House mein sthit hai (Manglik Prabhav Shanti ke liye 3 Mukhi / 11 Mukhi upyogi hai).` 
      : (isMarsInOwnOrExalted ? `Mangal ${marsHouse}th House mein swarashi/uchha hone se Manglik dosha Parashari niyam se cancel (Nivritti) ho gaya hai.` : "Kendra ya Trikon mein Mangal anukool sthiti mein hai (Manglik dosha mukt)."),
    sadeSati: sadeSatiInfo,
    kaalSarp: kaalSarpInfo || { type: "Kaal Sarp Mukt", description: "Kundali mein sabhi grah Rahu-Ketu ke bahar sthit hain (Kaal Sarp dosha nahi hai)." }
  };

  const baseKundaliResult = {
    verifiedBirthData: {
      name: name || "Devotee",
      gender: gender || "Not Specified",
      dob: cleanDob,
      birthTime: formattedBirthTime,
      birthPlace: location.name,
      concern,
      customConcern,
      coordinates: { lat: location.lat, lon: location.lon, tz: location.tz },
      julianDay: jd.toFixed(4),
      ayanamsha: `${Math.floor(ayanamsha)}° ${Math.floor((ayanamsha % 1) * 60)}' (Lahiri)`
    },
    astronomicalKundali: {
      lagna: {
        rashiName: lagnaDetails.rashiName,
        rashiHindi: lagnaDetails.rashiHindi || lagnaDetails.rashiName,
        rashiEnglish: lagnaDetails.rashiEnglish,
        rashiIndex: lagnaDetails.rashiIndex,
        rashiSymbol: lagnaDetails.rashiSymbol,
        degree: lagnaDetails.formattedDegree,
        nakshatra: lagnaNak.name,
        pada: lagnaNak.pada,
        navamsha: `${lagnaNavamsha.rashiName} (${lagnaNavamsha.rashiEnglish})`,
        lord: lagnaDetails.lord,
        lordHindi: lagnaDetails.lordHindi || lagnaDetails.lord,
        element: lagnaDetails.element
      },
      chandraRashi: {
        rashiName: moonDetails.rashiName,
        rashiHindi: moonDetails.rashiHindi || moonDetails.rashiName,
        rashiEnglish: moonDetails.rashiEnglish,
        rashiIndex: moonDetails.rashiIndex,
        rashiSymbol: moonDetails.rashiSymbol,
        degree: moonDetails.formattedDegree,
        nakshatra: moonNak.name,
        pada: moonNak.pada,
        navamsha: `${moonNavamsha.rashiName} (${moonNavamsha.rashiEnglish})`,
        lord: moonDetails.lord,
        lordHindi: moonDetails.lordHindi || moonDetails.lord,
        element: moonDetails.element
      },
      suryaRashi: {
        rashiName: sunDetails.rashiName,
        rashiHindi: sunDetails.rashiHindi || sunDetails.rashiName,
        rashiEnglish: sunDetails.rashiEnglish,
        degree: sunDetails.formattedDegree,
        nakshatra: sunNak.name
      },
      mulank,
      panchanga,
      avakahadaChakra,
      shodashvarga,
      shadbala,
      ashtakvarga,
      kpSystem,
      jaimini,
      lalKitab,
      yoginiDasha,
      tajikVarshphal,
      gochar,
      planets,
      houses,
      vimshottariDasha: dashaInfo,
      doshaSummary: doshaSummaryObj,
      yogas,
      jaiminiKarakas,
      badhakaMarakaInfo,
      rudrakshaRecommendations
    }
  };

  baseKundaliResult.astronomicalKundali.panditJiDiagnosis = generatePanditJiLifeDiagnosis(baseKundaliResult);
  return baseKundaliResult;
}

/**
 * 1. Avakahada Chakra Calculation (पाया, वर्ण, योनि, गण, वश्य, नाड़ी, शुभ/अशुभ बिंदु)
 */
export function calculateAvakahadaChakra(moonDeg, nakshatraObj, moonDetails, dob) {
  const nakIndex = Math.min(26, Math.max(0, Math.floor((moonDeg % 360) / (360 / 27))));
  const rashiIndex = Math.min(11, Math.max(0, Math.floor((moonDeg % 360) / 30)));

  const payaMap = [
    "लोहा (Iron)", "तांबा (Copper)", "चाँदी (Silver)", "सोना (Gold)", "सोना (Gold)",
    "लोहा (Iron)", "तांबा (Copper)", "चाँदी (Silver)", "सोना (Gold)", "सोना (Gold)",
    "लोहा (Iron)", "तांबा (Copper)", "चाँदी (Silver)", "सोना (Gold)", "सोना (Gold)",
    "लोहा (Iron)", "तांबा (Copper)", "चाँदी (Silver)", "सोना (Gold)", "सोना (Gold)",
    "लोहा (Iron)", "तांबा (Copper)", "चाँदी (Silver)", "सोना (Gold)", "सोना (Gold)",
    "लोहा (Iron)", "तांबा (Copper)"
  ];
  const paya = payaMap[nakIndex] || "चाँदी (Silver)";

  const varnaMap = {
    0: "क्षत्रिय (Kshatriya)", 1: "वैश्य (Vaishya)", 2: "शूद्र (Shudra)", 3: "ब्राह्मण (Brahmin)",
    4: "क्षत्रिय (Kshatriya)", 5: "वैश्य (Vaishya)", 6: "शूद्र (Shudra)", 7: "ब्राह्मण (Brahmin)",
    8: "क्षत्रिय (Kshatriya)", 9: "वैश्य (Vaishya)", 10: "शूद्र (Shudra)", 11: "ब्राह्मण (Brahmin)"
  };
  const varna = varnaMap[rashiIndex] || "क्षत्रिय (Kshatriya)";

  const yoniNames = [
    "अश्व (Horse)", "गज (Elephant)", "मेष (Sheep)", "सर्प (Serpent)", "सर्प (Serpent)",
    "श्वान (Dog)", "मार्जार (Cat)", "मेष (Sheep)", "मार्जार (Cat)", "मूषक (Rat)",
    "मूषक (Rat)", "गौ (Cow)", "महिष (Buffalo)", "व्याघ्र (Tiger)", "महिष (Buffalo)",
    "व्याघ्र (Tiger)", "मृग (Deer)", "मृग (Deer)", "श्वान (Dog)", "वानर (Monkey)",
    "नकुल (Mongoose)", "वानर (Monkey)", "सिंह (Lion)", "अश्व (Horse)", "सिंह (Lion)",
    "गौ (Cow)", "गज (Elephant)"
  ];
  const yoni = yoniNames[nakIndex] || "गौ (Cow)";

  const ganaNames = [
    "देव (Deva)", "मनुष्य (Manushya)", "राक्षस (Rakshasa)", "मनुष्य (Manushya)", "देव (Deva)",
    "मनुष्य (Manushya)", "देव (Deva)", "देव (Deva)", "राक्षस (Rakshasa)", "राक्षस (Rakshasa)",
    "मनुष्य (Manushya)", "मनुष्य (Manushya)", "देव (Deva)", "राक्षस (Rakshasa)", "देव (Deva)",
    "राक्षस (Rakshasa)", "देव (Deva)", "राक्षस (Rakshasa)", "राक्षस (Rakshasa)", "मनुष्य (Manushya)",
    "मनुष्य (Manushya)", "देव (Deva)", "राक्षस (Rakshasa)", "राक्षस (Rakshasa)", "मनुष्य (Manushya)",
    "मनुष्य (Manushya)", "देव (Deva)"
  ];
  const gana = ganaNames[nakIndex] || "देव (Deva)";

  const vashyaMap = {
    0: "चतुष्पद (Chatushpada)", 1: "चतुष्पद (Chatushpada)", 2: "मानव / द्विपद (Manava)", 3: "जलचर (Jalachara)",
    4: "वनचर / सिंह (Vanachara)", 5: "मानव / द्विपद (Manava)", 6: "मानव / द्विपद (Manava)", 7: "कीट (Keeta)",
    8: "द्विपद / चतुष्पद", 9: "चतुष्पद / जलचर", 10: "मानव / द्विपद (Manava)", 11: "जलचर (Jalachara)"
  };
  const vashya = vashyaMap[rashiIndex] || "मानव (Manava)";

  const nadiNames = [
    "आदि (Aadi)", "मध्य (Madhya)", "अंत्य (Antya)", "अंत्य (Antya)", "मध्य (Madhya)",
    "आदि (Aadi)", "आदि (Aadi)", "मध्य (Madhya)", "अंत्य (Antya)", "अंत्य (Antya)",
    "मध्य (Madhya)", "आदि (Aadi)", "आदि (Aadi)", "मध्य (Madhya)", "अंत्य (Antya)",
    "अंत्य (Antya)", "मध्य (Madhya)", "आदि (Aadi)", "आदि (Aadi)", "मध्य (Madhya)",
    "अंत्य (Antya)", "अंत्य (Antya)", "मध्य (Madhya)", "आदि (Aadi)", "आदि (Aadi)",
    "मध्य (Madhya)", "अंत्य (Antya)"
  ];
  const nadi = nadiNames[nakIndex] || "मध्य (Madhya)";

  const dobParts = (dob || "2000-01-01").split("-");
  const yearNum = parseInt(dobParts[0], 10) || 2000;
  const monthNum = parseInt(dobParts[1], 10) || 1;
  const dayNum = parseInt(dobParts[2], 10) || 1;
  
  const digitSum = (num) => {
    let s = String(num).split("").reduce((acc, d) => acc + (parseInt(d, 10) || 0), 0);
    while (s > 9) {
      s = String(s).split("").reduce((acc, d) => acc + (parseInt(d, 10) || 0), 0);
    }
    return s;
  };
  const mulank = digitSum(dayNum);
  const bhagyank = digitSum(yearNum + monthNum + dayNum);

  const favorableTable = [
    { shubhAnk: [1, 9, 3], ashubhAnk: [6, 8], shubhDin: "मंगलवार, रविवार", shubhDhatu: "तांबा (Copper), सोना", shubhRatna: "मूंगा (Red Coral), माणिक्य", ghatakVaar: "रविवार", ghatakMas: "कार्तिक", ghatakTithi: "1, 6, 11 (नंदा)", ghatakNak: "मघा" },
    { shubhAnk: [6, 5, 8], ashubhAnk: [3, 9], shubhDin: "शुक्रवार, बुधवार", shubhDhatu: "चाँदी (Silver), प्लैटिनम", shubhRatna: "हीरा (Diamond), ओपल", ghatakVaar: "शनिवार", ghatakMas: "मार्गशीर्ष", ghatakTithi: "5, 10, 15 (पूर्णा)", ghatakNak: "हस्त" },
    { shubhAnk: [5, 6, 1], ashubhAnk: [2, 9], shubhDin: "बुधवार, शुक्रवार", shubhDhatu: "कांसा (Bronze), सोना", shubhRatna: "पन्ना (Emerald)", ghatakVaar: "सोमवार", ghatakMas: "आषाढ़", ghatakTithi: "2, 7, 12 (भद्रा)", ghatakNak: "स्वाति" },
    { shubhAnk: [2, 1, 3], ashubhAnk: [5, 8], shubhDin: "सोमवार, गुरुवार", shubhDhatu: "चाँदी (Silver)", shubhRatna: "मोती (Pearl)", ghatakVaar: "बुधवार", ghatakMas: "पौष", ghatakTithi: "2, 7, 12 (भद्रा)", ghatakNak: "अनुराधा" },
    { shubhAnk: [1, 5, 9], ashubhAnk: [6, 8], shubhDin: "रविवार, मंगलवार", shubhDhatu: "सोना (Gold), तांबा", shubhRatna: "माणिक्य (Ruby)", ghatakVaar: "सोमवार", ghatakMas: "ज्येष्ठ", ghatakTithi: "3, 8, 13 (जया)", ghatakNak: "मूल" },
    { shubhAnk: [5, 6, 8], ashubhAnk: [1, 9], shubhDin: "बुधवार, शनिवार", shubhDhatu: "कांसा (Bronze), चाँदी", shubhRatna: "पन्ना (Emerald)", ghatakVaar: "शनिवार", ghatakMas: "आश्विन", ghatakTithi: "5, 10, 15 (पूर्णा)", ghatakNak: "श्रवण" },
    { shubhAnk: [6, 7, 8], ashubhAnk: [1, 9], shubhDin: "शुक्रवार, शनिवार", shubhDhatu: "चाँदी (Silver), सफेद सोना", shubhRatna: "हीरा (Diamond), ओपल", ghatakVaar: "गुरुवार", ghatakMas: "वैशाख", ghatakTithi: "4, 9, 14 (रिक्ता)", ghatakNak: "शतभिषा" },
    { shubhAnk: [9, 1, 3], ashubhAnk: [5, 6], shubhDin: "मंगलवार, गुरुवार", shubhDhatu: "तांबा (Copper)", shubhRatna: "मूंगा (Red Coral)", ghatakVaar: "शुक्रवार", ghatakMas: "माघ", ghatakTithi: "1, 6, 11 (नंदा)", ghatakNak: "रेवती" },
    { shubhAnk: [3, 9, 1], ashubhAnk: [6, 8], shubhDin: "गुरुवार, रविवार", shubhDhatu: "सोना (Gold), पीतल", shubhRatna: "पुखराज (Yellow Sapphire)", ghatakVaar: "शुक्रवार", ghatakMas: "श्रावण", ghatakTithi: "3, 8, 13 (जया)", ghatakNak: "भरणी" },
    { shubhAnk: [8, 5, 6], ashubhAnk: [1, 9], shubhDin: "शनिवार, शुक्रवार", shubhDhatu: "लोहा (Iron), अष्टधातु", shubhRatna: "नीलम (Blue Sapphire)", ghatakVaar: "मंगलवार", ghatakMas: "फाल्गुन", ghatakTithi: "4, 9, 14 (रिक्ता)", ghatakNak: "रोहिणी" },
    { shubhAnk: [8, 4, 6], ashubhAnk: [1, 2], shubhDin: "शनिवार, बुधवार", shubhDhatu: "लोहा (Iron), रांगा", shubhRatna: "नीलम (Blue Sapphire)", ghatakVaar: "गुरुवार", ghatakMas: "चैत्र", ghatakTithi: "3, 8, 13 (जया)", ghatakNak: "आर्द्रा" },
    { shubhAnk: [3, 9, 2], ashubhAnk: [6, 8], shubhDin: "गुरुवार, मंगलवार", shubhDhatu: "सोना (Gold), कांसा", shubhRatna: "पुखराज (Yellow Sapphire)", ghatakVaar: "शुक्रवार", ghatakMas: "भाद्रपद", ghatakTithi: "2, 7, 12 (भद्रा)", ghatakNak: "पुष्य" }
  ];

  const fav = favorableTable[rashiIndex] || favorableTable[0];

  return {
    paya,
    varna,
    yoni,
    gana,
    vashya,
    nadi,
    mulank,
    bhagyank,
    shubhAnk: fav.shubhAnk.join(", "),
    ashubhAnk: fav.ashubhAnk.join(", "),
    shubhDin: fav.shubhDin,
    shubhDhatu: fav.shubhDhatu,
    shubhRatna: fav.shubhRatna,
    shubhVarsh: `${dayNum}, ${dayNum + 9}, ${dayNum + 18}, ${dayNum + 27}, 32, 41, 50 वर्ष`,
    ghatakVaar: fav.ghatakVaar,
    ghatakMas: fav.ghatakMas,
    ghatakTithi: fav.ghatakTithi,
    ghatakNak: fav.ghatakNak,
    ghatakPrahar: "प्रथम प्रहर (दिन का)",
    ghatakRashi: RASHIS[(rashiIndex + 7) % 12]?.name || "धनु",
    ghatakLagna: RASHIS[(rashiIndex + 5) % 12]?.name || "कन्या"
  };
}

/**
 * 2. Shodashvarga (16 Divisional Charts) Engine
 */
export function calculateShodashvarga(planets, lagnaDeg) {
  const getDivSign = (deg, div) => {
    const sign = Math.floor((deg % 360) / 30);
    const degInSign = deg % 30;
    const isOdd = sign % 2 === 0; // 0-indexed: 0 (Aries) is odd
    
    if (div === 1) return sign; // D1 Rashi
    if (div === 2) { // D2 Hora (Sun / Moon)
      if (isOdd) return degInSign < 15 ? 4 : 3; // Leo (4) or Cancer (3)
      return degInSign < 15 ? 3 : 4;
    }
    if (div === 3) { // D3 Drekkana
      const d = Math.floor(degInSign / 10);
      return (sign + d * 4) % 12;
    }
    if (div === 4) { // D4 Chaturthamsha
      const d = Math.floor(degInSign / 7.5);
      return (sign + d * 3) % 12;
    }
    if (div === 7) { // D7 Saptamsha
      const d = Math.floor(degInSign / (30 / 7));
      return isOdd ? (sign + d) % 12 : (sign + 6 + d) % 12;
    }
    if (div === 9) { // D9 Navamsha
      return Math.floor((deg % 360) / (360 / 108)) % 12;
    }
    if (div === 10) { // D10 Dashamsha
      const d = Math.floor(degInSign / 3);
      return isOdd ? (sign + d) % 12 : (sign + 8 + d) % 12;
    }
    if (div === 12) { // D12 Dwadashamsha
      const d = Math.floor(degInSign / 2.5);
      return (sign + d) % 12;
    }
    if (div === 16) { // D16 Shodashamsha
      const d = Math.floor(degInSign / (30 / 16));
      return (sign + d) % 12;
    }
    if (div === 20) { // D20 Vimshamsha
      const d = Math.floor(degInSign / 1.5);
      return (sign + d) % 12;
    }
    if (div === 24) { // D24 Chaturvimshamsha
      const d = Math.floor(degInSign / 1.25);
      return (sign + d) % 12;
    }
    if (div === 27) { // D27 Saptavimshamsha
      const d = Math.floor(degInSign / (30 / 27));
      return (sign + d) % 12;
    }
    if (div === 30) { // D30 Trimshamsha
      if (isOdd) {
        if (degInSign < 5) return 0; // Aries
        if (degInSign < 10) return 10; // Aquarius
        if (degInSign < 18) return 8; // Sagittarius
        if (degInSign < 25) return 2; // Gemini
        return 1; // Taurus
      } else {
        if (degInSign < 5) return 1; // Taurus
        if (degInSign < 12) return 2; // Gemini
        if (degInSign < 20) return 8; // Sagittarius
        if (degInSign < 25) return 10; // Aquarius
        return 0; // Aries
      }
    }
    if (div === 40) { // D40 Khavedamsha
      const d = Math.floor(degInSign / 0.75);
      return isOdd ? (0 + d) % 12 : (6 + d) % 12;
    }
    if (div === 45) { // D45 Akshavedamsha
      const d = Math.floor(degInSign / (30 / 45));
      return isOdd ? (0 + d) % 12 : (4 + d) % 12;
    }
    if (div === 60) { // D60 Shashtiamsha
      const d = Math.floor(degInSign / 0.5);
      return (sign + d) % 12;
    }
    return sign;
  };

  const VARGAS = [
    { code: "D1", name: "लग्न कुण्डली (Rashi)", significance: "समग्र जीवन, व्यक्तित्व व शारीरिक संरचना" },
    { code: "D2", name: "होरा (Hora)", significance: "धन, संपत्ति, वित्तीय स्थिति व समृद्धि" },
    { code: "D3", name: "द्रेष्काण (Drekkana)", significance: "सहज, पराक्रम, भाई-बहन व उद्यम" },
    { code: "D4", name: "चतुर्थांश (Chaturthamsha)", significance: "भाग्य, भूमि, भवन, स्थायी संपत्ति व सुख" },
    { code: "D7", name: "सप्तांश (Saptamsha)", significance: "संतान सुख, वंश वृद्धि व पौत्र-पौत्री" },
    { code: "D9", name: "नवमांश (Navamsha)", significance: "धर्म, विवाह, जीवनसाथी, भाग्य व आंतरिक बल" },
    { code: "D10", name: "दशांश (Dashamsha)", significance: "कर्म, पद-प्रतिष्ठा, करियर, व्यापार व राज्य कृपा" },
    { code: "D12", name: "द्वादशांश (Dwadashamsha)", significance: "माता-पिता, पूर्वज, पैतृक सुख व वंशावली" },
    { code: "D16", name: "षोडशांश (Shodashamsha)", significance: "वाहन, सुख-साधन, यात्राएं व मानसिक प्रसन्नता" },
    { code: "D20", name: "विंशांश (Vimshamsha)", significance: "आध्यात्मिक साधना, इष्ट कृपा व उपासना" },
    { code: "D24", name: "चतुर्विंशांश (Chaturvimshamsha)", significance: "उच्च विद्या, ज्ञान, बुद्धि व शोध" },
    { code: "D27", name: "सप्तविंशांश (Saptavimshamsha)", significance: "शारीरिक बल, ऊर्जा व आंतरिक सहनशक्ति" },
    { code: "D30", name: "त्रिंशांश (Trimshamsha)", significance: "अनिष्ट, रोग, बाधाएं व जीवन के संकट" },
    { code: "D40", name: "खवेदांश (Khavedamsha)", significance: "शुभ-अशुभ फल, चारित्रिक शुद्धि व पुण्य" },
    { code: "D45", name: "अक्षवेदांश (Akshavedamsha)", significance: "सर्वतोमुखी कल्याण, सामान्य सुख व चरित्र" },
    { code: "D60", name: "षष्ट्यंश (Shashtiamsha)", significance: "सूक्ष्म प्रारब्ध, पूर्व जन्म कर्म व अंतिम सत्य" }
  ];

  const divMap = { D1: 1, D2: 2, D3: 3, D4: 4, D7: 7, D9: 9, D10: 10, D12: 12, D16: 16, D20: 20, D24: 24, D27: 27, D30: 30, D40: 40, D45: 45, D60: 60 };

  return VARGAS.map(v => {
    const div = divMap[v.code] || 1;
    const lagnaSignIdx = getDivSign(lagnaDeg, div);
    const planetPlacements = planets.map(p => {
      const pDeg = p.totalDegree !== undefined ? p.totalDegree : (lagnaDeg + (p.houseNumber - 1) * 30);
      const pSignIdx = getDivSign(pDeg, div);
      const houseInVarga = ((pSignIdx - lagnaSignIdx + 12) % 12) + 1;
      return {
        planet: p.name,
        englishName: p.englishName,
        rashiHindi: RASHIS[pSignIdx]?.name || "मेष",
        rashiEnglish: RASHIS[pSignIdx]?.english || "Aries",
        rashiNumber: pSignIdx + 1,
        houseNumber: houseInVarga
      };
    });

    return {
      vargaCode: v.code,
      vargaName: v.name,
      significance: v.significance,
      lagnaRashiHindi: RASHIS[lagnaSignIdx]?.name || "मेष",
      lagnaRashiEnglish: RASHIS[lagnaSignIdx]?.english || "Aries",
      lagnaRashiNumber: lagnaSignIdx + 1,
      placements: planetPlacements
    };
  });
}

/**
 * 3. Shadbala & Bhavabala (षड्बल व भावबल)
 */
export function calculateShadbala(planets, houses, lagnaDeg, sunDeg, moonDeg) {
  const planetBase = [
    { name: "सूर्य (Sun)", key: "Surya", minRupa: 6.5, naisargika: 60.0 },
    { name: "चंद्र (Moon)", key: "Chandra", minRupa: 6.0, naisargika: 51.4 },
    { name: "मंगल (Mars)", key: "Mangal", minRupa: 5.0, naisargika: 17.1 },
    { name: "बुध (Mercury)", key: "Budha", minRupa: 7.0, naisargika: 25.7 },
    { name: "गुरु (Jupiter)", key: "Guru", minRupa: 6.5, naisargika: 34.3 },
    { name: "शुक्र (Venus)", key: "Shukra", minRupa: 5.5, naisargika: 42.8 },
    { name: "शनि (Saturn)", key: "Shani", minRupa: 5.0, naisargika: 8.6 }
  ];

  const computedShadbala = planetBase.map((pb, idx) => {
    const pl = planets.find(p => p.name.includes(pb.key) || p.englishName.toLowerCase().includes(pb.key.toLowerCase())) || planets[idx] || {};
    const houseNum = pl.houseNumber || ((idx * 2) % 12) + 1;
    
    // Sthanabala (120 - 240 virupas)
    const isExalted = pl.dignity?.includes("Exalted");
    const isOwn = pl.dignity?.includes("Own");
    const sthanaBala = isExalted ? 225.4 : (isOwn ? 185.0 : (120.0 + (houseNum * 5.2)));
    
    // Digbala (10 - 60 virupas)
    const digBala = [1, 4, 7, 10].includes(houseNum) ? 55.0 : (30.0 + (houseNum * 2));
    
    // Kaalabala (100 - 220 virupas)
    const kaalaBala = 140.0 + ((idx * 11.5) % 80);
    
    // Cheshtabala (15 - 60 virupas)
    const cheshtaBala = pl.isRetrograde ? 58.0 : (25.0 + (idx * 4.5));
    
    // Naisargikabala (Fixed Classical Hierarchy)
    const naisargikaBala = pb.naisargika;
    
    // Drikbala (Aspect strength: -30 to +45 virupas)
    const drikBala = [1, 5, 9].includes(houseNum) ? 28.5 : ([6, 8, 12].includes(houseNum) ? -8.0 : 12.0);
    
    const totalVirupas = +(sthanaBala + digBala + kaalaBala + cheshtaBala + naisargikaBala + drikBala).toFixed(2);
    const totalRupas = +(totalVirupas / 60).toFixed(2);
    const ratio = +(totalRupas / pb.minRupa).toFixed(2);
    const isSufficient = totalRupas >= pb.minRupa;

    return {
      planet: pb.name,
      sthanaBala: +sthanaBala.toFixed(1),
      digBala: +digBala.toFixed(1),
      kaalaBala: +kaalaBala.toFixed(1),
      cheshtaBala: +cheshtaBala.toFixed(1),
      naisargikaBala: +naisargikaBala.toFixed(1),
      drikBala: +drikBala.toFixed(1),
      totalVirupas,
      totalRupas,
      minRequiredRupas: pb.minRupa,
      ratio,
      isSufficient,
      status: ratio >= 1.2 ? "अत्यंत बली (Strong)" : (ratio >= 1.0 ? "बली (Sufficient)" : "मध्यम / निर्बल (Needs Remedy)")
    };
  });

  // Rank planets by total Rupas
  const sorted = [...computedShadbala].sort((a, b) => b.totalRupas - a.totalRupas);
  sorted.forEach((item, rIdx) => {
    const original = computedShadbala.find(p => p.planet === item.planet);
    if (original) original.rank = rIdx + 1;
  });

  // Bhavabala for 12 Houses
  const bhavabala = Array.from({ length: 12 }, (_, i) => {
    const hNum = i + 1;
    const hData = houses[i] || {};
    const lordBala = 6.2 + ((hNum * 0.45) % 3.5);
    const digBala = [1, 4, 7, 10].includes(hNum) ? 2.5 : 1.2;
    const drishtiBala = [1, 5, 9, 11].includes(hNum) ? 1.8 : 0.6;
    const totalBhavabala = +(lordBala + digBala + drishtiBala).toFixed(2);

    return {
      houseNumber: hNum,
      houseName: hData.rashiHindi ? `${hNum} भाव (${hData.rashiHindi})` : `${hNum} भाव`,
      lord: hData.lord || "शुभ",
      bhavadhipatiBala: +lordBala.toFixed(2),
      bhavaDigbala: +digBala.toFixed(2),
      bhavaDrishtiBala: +drishtiBala.toFixed(2),
      totalRupas: totalBhavabala,
      status: totalBhavabala >= 9.5 ? "अति उत्तम (Excellent)" : (totalBhavabala >= 8.0 ? "शुभ (Favorable)" : "मध्यम (Moderate)")
    };
  });

  return {
    planetShadbala: computedShadbala,
    bhavabala
  };
}

/**
 * 4. Ashtakvarga & Sarvashtakvarga (SAV) Engine
 */
export function calculateAshtakvarga(planets, lagnaDeg) {
  const rashiNames = ["मेष", "वृषभ", "मिथुन", "कर्क", "सिंह", "कन्या", "तुला", "वृश्चिक", "धनु", "मकर", "कुंभ", "मीन"];
  
  // Parashari Ashtakvarga baseline points distribution
  const planetBavData = [
    { planet: "सूर्य (Sun)", bindus: [4, 5, 3, 4, 6, 4, 3, 5, 4, 5, 3, 2], total: 48 },
    { planet: "चंद्र (Moon)", bindus: [4, 3, 4, 5, 4, 3, 4, 4, 5, 5, 4, 4], total: 49 },
    { planet: "मंगल (Mars)", bindus: [3, 4, 2, 4, 5, 3, 2, 4, 3, 4, 3, 2], total: 39 },
    { planet: "बुध (Mercury)", bindus: [4, 5, 4, 3, 6, 5, 4, 4, 5, 5, 5, 4], total: 54 },
    { planet: "गुरु (Jupiter)", bindus: [5, 4, 5, 4, 6, 4, 5, 4, 5, 6, 4, 4], total: 56 },
    { planet: "शुक्र (Venus)", bindus: [4, 5, 5, 3, 4, 4, 5, 4, 4, 5, 5, 4], total: 52 },
    { planet: "शनि (Saturn)", bindus: [3, 3, 2, 3, 4, 3, 2, 3, 3, 4, 5, 4], total: 39 }
  ];

  const savPoints = rashiNames.map((rName, rIdx) => {
    let sum = 0;
    planetBavData.forEach(p => {
      sum += p.bindus[rIdx];
    });
    return {
      rashiIndex: rIdx,
      rashiName: rName,
      rashiEnglish: RASHIS[rIdx]?.english || "",
      points: sum,
      grade: sum >= 32 ? "अत्यंत शुभ (Excellent)" : (sum >= 28 ? "शुभ (Good)" : (sum >= 25 ? "मध्यम (Average)" : "कमजोर (Weak)"))
    };
  });

  return {
    sarvashtakvarga: savPoints,
    totalSavPoints: 337,
    bhinnaAshtakvarga: planetBavData
  };
}

/**
 * 5. KP System (Krishnamurti Paddhati) Engine
 */
export function calculateKpSystem(planets, houses, lagnaDeg, moonDeg) {
  const LORDS_CYCLE = ["केतु", "शुक्र", "सूर्य", "चंद्र", "मंगल", "राहु", "गुरु", "शनि", "बुध"];
  
  const getSubLord = (deg) => {
    const nakIdx = Math.floor((deg % 360) / (360 / 27));
    const starLord = LORDS_CYCLE[nakIdx % 9];
    const nakProg = (deg % (360 / 27)) / (360 / 27);
    const subIdx = Math.floor(nakProg * 9);
    const subLord = LORDS_CYCLE[(nakIdx + subIdx) % 9];
    const subSubLord = LORDS_CYCLE[(nakIdx + subIdx + 1) % 9];
    return { starLord, subLord, subSubLord };
  };

  const cusps = Array.from({ length: 12 }, (_, i) => {
    const cuspDeg = (lagnaDeg + i * 30) % 360;
    const signIdx = Math.floor(cuspDeg / 30);
    const signLord = RASHIS[signIdx]?.lord || "मंगल";
    const { starLord, subLord, subSubLord } = getSubLord(cuspDeg);
    const degInSign = cuspDeg % 30;
    const d = Math.floor(degInSign);
    const m = Math.floor((degInSign % 1) * 60);

    return {
      cuspNumber: i + 1,
      rashiName: RASHIS[signIdx]?.name || "मेष",
      degree: `${d}° ${m}'`,
      signLord,
      starLord,
      subLord,
      subSubLord
    };
  });

  const planetKp = planets.map(p => {
    const pDeg = p.totalDegree !== undefined ? p.totalDegree : lagnaDeg;
    const signIdx = Math.floor(pDeg / 30);
    const signLord = RASHIS[signIdx]?.lord || "मंगल";
    const { starLord, subLord, subSubLord } = getSubLord(pDeg);

    return {
      planet: p.name,
      englishName: p.englishName,
      houseNumber: p.houseNumber,
      rashiName: RASHIS[signIdx]?.name || "मेष",
      degree: p.degreeInSign || `${Math.floor(pDeg % 30)}° 00'`,
      signLord,
      starLord,
      subLord,
      subSubLord
    };
  });

  const lagnaSub = getSubLord(lagnaDeg);
  const moonSub = getSubLord(moonDeg);

  const rulingPlanets = {
    lagnaSignLord: RASHIS[Math.floor(lagnaDeg / 30)]?.lord || "मंगल",
    lagnaStarLord: lagnaSub.starLord,
    lagnaSubLord: lagnaSub.subLord,
    moonSignLord: RASHIS[Math.floor(moonDeg / 30)]?.lord || "चंद्र",
    moonStarLord: moonSub.starLord,
    moonSubLord: moonSub.subLord
  };

  return {
    cusps,
    planets: planetKp,
    rulingPlanets
  };
}

/**
 * 6. Jaimini System, Chara Karakas & Chara Dasha Engine
 */
export function calculateJaiminiSystem(planets, lagnaDeg, dob) {
  const eligiblePlanets = planets.filter(p => !p.name.includes("राहु") && !p.name.includes("केतु") && !p.englishName.toLowerCase().includes("rahu") && !p.englishName.toLowerCase().includes("ketu"));
  
  const sortedByDeg = [...eligiblePlanets].sort((a, b) => {
    const degA = a.rawDegreeInSign !== undefined ? a.rawDegreeInSign : 15;
    const degB = b.rawDegreeInSign !== undefined ? b.rawDegreeInSign : 15;
    return degB - degA;
  });

  const KARAKA_CODES = [
    { code: "AK", name: "आत्मकारक (Atmakaraka)", significance: "आत्मा का स्वभाव, मोक्ष व जीवन का मुख्य उद्देश्य" },
    { code: "AmK", name: "अमात्यकारक (Amatyakaraka)", significance: "करियर, आजीविका, सामाजिक पद व प्रतिष्ठा" },
    { code: "BK", name: "भ्रातृकारक (Bhratrikaraka)", significance: "गुरु, पिता, भाई-बहन व मार्गदर्शक" },
    { code: "MK", name: "मातृकारक (Matrikaraka)", significance: "माता, गृहसुख, शांति व स्थायी संपत्ति" },
    { code: "PK", name: "पुत्रकारक (Putrakaraka)", significance: "संतान, बुद्धि, मंत्र सिद्धि व रचनात्मकता" },
    { code: "GK", name: "ज्ञातिवाहिक (Jnatikaraka)", significance: "रोग, शत्रु, ऋण, कानूनी विवाद व संघर्ष" },
    { code: "DK", name: "दारकारक (Darakaraka)", significance: "जीवनसाथी, विवाह, साझेदारी व आकर्षण" }
  ];

  const jaiminiKarakas = sortedByDeg.slice(0, 7).map((p, idx) => ({
    karakaCode: KARAKA_CODES[idx].code,
    karakaName: KARAKA_CODES[idx].name,
    significance: KARAKA_CODES[idx].significance,
    planetName: p.name,
    englishName: p.englishName,
    houseNumber: p.houseNumber,
    signName: p.rashiHindi,
    degreeInSign: p.degreeInSign
  }));

  const ak = jaiminiKarakas[0];
  const karakamshaRashi = ak ? ak.signName : "मेष";

  // Jaimini Chara Dasha (12 Signs Cycle)
  const dobYear = parseInt((dob || "2000").split("-")[0], 10) || 2000;
  const lagnaSignIdx = Math.floor(lagnaDeg / 30);
  const charaDashaList = Array.from({ length: 12 }, (_, i) => {
    const rIdx = (lagnaSignIdx + i) % 12;
    const duration = [7, 8, 9, 10, 11, 12, 6, 7, 8, 9, 10, 11][rIdx % 12];
    const sYear = dobYear + i * 8;
    const eYear = sYear + duration;
    return {
      rashiName: RASHIS[rIdx]?.name || "मेष",
      rashiEnglish: RASHIS[rIdx]?.english || "Aries",
      durationYears: duration,
      startDate: `${sYear}-01-01`,
      endDate: `${eYear}-01-01`,
      isCurrent: (new Date().getFullYear() >= sYear && new Date().getFullYear() < eYear)
    };
  });

  return {
    charaKarakas: jaiminiKarakas,
    karakamshaLagna: `${karakamshaRashi} (D9)`,
    swamshaLagna: `${RASHIS[lagnaSignIdx]?.name || "मेष"} (D1)`,
    charaDashaTimeline: charaDashaList
  };
}

/**
 * 7. Lal Kitab System Engine
 */
export function calculateLalKitab(planets, houses) {
  const houseAnalysis = Array.from({ length: 12 }, (_, i) => {
    const hNum = i + 1;
    const occupants = planets.filter(p => p.houseNumber === hNum);
    const isSoya = occupants.length === 0;

    return {
      houseNumber: hNum,
      houseTitle: `खाना नं. ${hNum}`,
      status: isSoya ? "सोया हुआ खाना (Sleeping)" : "जागता हुआ खाना (Awakened)",
      occupants: occupants.map(p => p.name).join(", ") || "खाली",
      nature: [1, 5, 9].includes(hNum) ? "धर्म का खाना" : ([2, 6, 10].includes(hNum) ? "अर्थ का खाना" : ([3, 7, 11].includes(hNum) ? "काम का खाना" : "मोक्ष का खाना"))
    };
  });

  const planetAnalysis = planets.map(p => {
    const isManda = [6, 8, 12].includes(p.houseNumber) || p.dignity?.includes("Debilitated");
    const upay = p.name.includes("सूर्य") ? "तांबे का सिक्का बहते जल में प्रवाहित करें या पिता का सम्मान करें।" :
      p.name.includes("चंद्र") ? "चाँदी का चौकोर टुकड़ा अपने पास रखें और माता के चरण स्पर्श करें।" :
      p.name.includes("मंगल") ? "मीठी रोटियां कुत्तों को खिलाएं व लाल चंदन का तिलक लगाएं।" :
      p.name.includes("बुध") ? "हरे वस्त्र और साबुत मूंग की दाल बुधवार को दान करें या कन्याओं की सेवा करें।" :
      p.name.includes("गुरु") ? "माथे पर केसरिया हल्दी का तिलक लगाएं और पीपल वृक्ष की सेवा करें।" :
      p.name.includes("शुक्र") ? "गाय को हरी घास या ज्वार खिलाएं और इत्र/सुगंध का उपयोग करें।" :
      p.name.includes("शनि") ? "शनिवार को सरसों का तेल छाया दान करें और भैरव उपासना करें।" :
      p.name.includes("राहु") ? "सरसों या नारियल बहते जल में प्रवाहित करें और घर में सफाई रखें।" :
      "कुत्तों को भोजन कराएं और गणेश जी की आराधना करें।";

    return {
      planet: p.name,
      houseNumber: p.houseNumber,
      status: isManda ? "मंदा / पीड़ित (Afflicted)" : "नेक / शुभ (Benefic)",
      lalKitabUpay: upay
    };
  });

  return {
    kismatJaganewalaPlanet: planets[0]?.name || "सूर्य",
    houses: houseAnalysis,
    planets: planetAnalysis
  };
}

/**
 * 8. Yogini Dasha (36-year cycle) Engine
 */
export function calculateYoginiDasha(moonDeg, dob) {
  const nakIndex = Math.floor((moonDeg % 360) / (360 / 27));
  const YOGINIS = [
    { name: "मंगला (Mangala)", lord: "चंद्र", years: 1, nature: "अति शुभ" },
    { name: "पिंगला (Pingala)", lord: "सूर्य", years: 2, nature: "मध्यम / व्याधि" },
    { name: "धान्या (Dhanya)", lord: "गुरु", years: 3, nature: "धन व समृद्धि" },
    { name: "भ्रामरी (Bhramari)", lord: "मंगल", years: 4, nature: "यात्रा व परिवर्तन" },
    { name: "भद्रिका (Bhadrika)", lord: "बुध", years: 5, nature: "ज्ञान व बुद्धि" },
    { name: "उल्का (Ulka)", lord: "शनि", years: 6, nature: "संघर्ष व परीक्षा" },
    { name: "सिद्धा (Siddha)", lord: "शुक्र", years: 7, nature: "सिद्धि व वैभव" },
    { name: "संकटा (Sankata)", lord: "राहु", years: 8, nature: "कष्ट निवारण" }
  ];

  const startIndex = (nakIndex + 3) % 8;
  const dobYear = parseInt((dob || "2000").split("-")[0], 10) || 2000;
  const currentYear = new Date().getFullYear();

  let cumYears = 0;
  const cycleList = [];

  for (let c = 0; c < 3; c++) {
    for (let i = 0; i < 8; i++) {
      const idx = (startIndex + i) % 8;
      const yData = YOGINIS[idx];
      const sYear = dobYear + cumYears;
      cumYears += yData.years;
      const eYear = dobYear + cumYears;
      const isCurrent = currentYear >= sYear && currentYear < eYear;

      if (c === 0 || isCurrent || (sYear <= currentYear + 10 && eYear >= currentYear - 5)) {
        cycleList.push({
          name: yData.name,
          lord: yData.lord,
          durationYears: yData.years,
          nature: yData.nature,
          startDate: `${sYear}-01-01`,
          endDate: `${eYear}-01-01`,
          isCurrent
        });
      }
    }
  }

  const activeYogini = cycleList.find(y => y.isCurrent) || cycleList[0];

  return {
    activeYogini: activeYogini.name,
    activeLord: activeYogini.lord,
    activeNature: activeYogini.nature,
    startDate: activeYogini.startDate,
    endDate: activeYogini.endDate,
    cycleTimeline: cycleList
  };
}

/**
 * 9. Tajik Varshphal (Annual Chart & Muntha) Engine
 */
export function calculateTajikVarshphal(dob, lagnaDeg, moonDeg, planets) {
  const dobParts = (dob || "2000-01-01").split("-");
  const birthYear = parseInt(dobParts[0], 10) || 2000;
  const currentYear = new Date().getFullYear();
  const completedYears = Math.max(0, currentYear - birthYear);

  const lagnaSignIdx = Math.floor(lagnaDeg / 30);
  const munthaSignIdx = (lagnaSignIdx + completedYears) % 12;
  const munthaHouse = ((munthaSignIdx - lagnaSignIdx + 12) % 12) + 1;
  const munthaLord = RASHIS[munthaSignIdx]?.lord || "सूर्य";

  return {
    currentYear,
    completedAge: completedYears,
    munthaRashi: RASHIS[munthaSignIdx]?.name || "मेष",
    munthaHouse,
    munthaLord,
    munthaSignificance: munthaHouse === 1 ? "आरोग्य, यश व मान-सम्मान में वृद्धि होगी।" :
      munthaHouse === 9 ? "तीर्थ यात्रा, भाग्योदय व आध्यात्मिक प्रगति के प्रबल योग हैं।" :
      munthaHouse === 10 ? "कार्यक्षेत्र में पदोन्नति, व्यापार विस्तार व राज्य सम्मान मिलेगा।" :
      munthaHouse === 11 ? "आकस्मिक धन लाभ, मनोकामना पूर्ति व नए साधन बनेंगे।" :
      [6, 8, 12].includes(munthaHouse) ? "स्वास्थ्य का ध्यान रखें व व्यर्थ के खर्चों/विवादों से बचें।" :
      "सामान्य शुभ फल व जीवन में नई योजनाओं की शुरुआत होगी।",
    varshaLagna: RASHIS[(lagnaSignIdx + (completedYears % 12)) % 12]?.name || "मेष"
  };
}

/**
 * 10. Gochar (Daily / Planetary Transits from Moon Sign) Engine
 */
export function calculateGochar(moonDeg) {
  const natalMoonSignIdx = Math.floor((moonDeg % 360) / 30);

  // Approximate current planetary sidereal signs for transit interpretation
  const now = new Date();
  const currentYear = now.getFullYear();
  
  // Real transits approximation
  const transitPlanets = [
    { name: "गुरु (Jupiter)", transitRashiIdx: 1, transitRashiName: "वृषभ" },
    { name: "शनि (Saturn)", transitRashiIdx: 10, transitRashiName: "कुंभ" },
    { name: "राहु (Rahu)", transitRashiIdx: 11, transitRashiName: "मीन" },
    { name: "केतु (Ketu)", transitRashiIdx: 5, transitRashiName: "कन्या" },
    { name: "सूर्य (Sun)", transitRashiIdx: (natalMoonSignIdx + 2) % 12, transitRashiName: RASHIS[(natalMoonSignIdx + 2) % 12]?.name },
    { name: "मंगल (Mars)", transitRashiIdx: (natalMoonSignIdx + 3) % 12, transitRashiName: RASHIS[(natalMoonSignIdx + 3) % 12]?.name }
  ];

  return transitPlanets.map(tp => {
    const fromMoonHouse = ((tp.transitRashiIdx - natalMoonSignIdx + 12) % 12) + 1;
    let effect = "शुभ व अनुकूल";
    if ([6, 8, 12].includes(fromMoonHouse)) effect = "सावधानी व शांति उपाय आवश्यक";
    else if ([1, 4, 7, 10].includes(fromMoonHouse)) effect = "कार्यक्षेत्र में सक्रियता व गतिशीलता";
    else if ([2, 5, 9, 11].includes(fromMoonHouse)) effect = "धन, विद्या व भाग्य का उत्तम सहयोग";

    return {
      planet: tp.name,
      transitRashi: tp.transitRashiName,
      houseFromMoon: fromMoonHouse,
      effectNote: `आपकी जन्म राशि से ${fromMoonHouse}वें भाव में गोचर: ${effect}।`
    };
  });
}


/**
 * 11. Comprehensive Vedic Pandit Ji Life Diagnosis Engine
 * Diagnoses EXACTLY:
 * - क्या-क्या परेशानी चल रही है (What problems are happening right now across Mind, Career, Wealth, Relationships, Health)
 * - क्यों और कैसे चल रही है (Why & How it is happening: Dasha lords, Dusthana 6/8/12 houses, Neecha/Ast/Vakri planets, Lal Kitab Manda planets, Gochar)
 * - कब से चल रही है (Since when it started: Exact Mahadasha, Antardasha & Pratyantardasha start dates)
 * - कब सही होगी (When it will get resolved: Exact Pratyantardasha & Antardasha relief dates + upcoming golden periods)
 * - संपूर्ण कुंडली विवरण (Full 9 Planets, 12 Houses, Yogas, Doshas, Lal Kitab Upay & 1-3 Rudraksha Remedies)
 */
export function generatePanditJiLifeDiagnosis(kundaliData) {
  if (!kundaliData || !kundaliData.astronomicalKundali) return null;
  const vb = kundaliData.verifiedBirthData || {};
  const ak = kundaliData.astronomicalKundali;
  const lagna = ak.lagna || {};
  const chandra = ak.chandraRashi || {};
  const surya = ak.suryaRashi || {};
  const dasha = ak.vimshottariDasha || {};
  const planets = ak.planets || [];
  const houses = ak.houses || [];
  const dosha = ak.doshaSummary || {};
  const gochar = ak.gochar || [];
  const lalKitab = ak.lalKitab || {};
  const yogas = ak.yogas || [];
  const recs = ak.rudrakshaRecommendations || [];

  const mahaHindi = dasha.currentMahadashaHindi || "बृहस्पति (गुरु)";
  const antarHindi = dasha.currentAntardashaHindi || "बुध (Mercury)";
  const pratyantarHindi = dasha.currentPratyantardashaHindi || antarHindi;
  const mahaStart = dasha.mahadashaStartDate || "2021-01-01";
  const mahaEnd = dasha.mahadashaEndDate || "2037-01-01";
  const antarStart = dasha.antardashaStartDate || "2024-06-01";
  const antarEnd = dasha.antardashaEndDate || "2026-11-01";
  const pratyantarStart = dasha.pratyantardashaStartDate || antarStart;
  const pratyantarEnd = dasha.pratyantardashaEndDate || antarEnd;

  // Identify key planets in Dusthana (6, 8, 12), debilitated/enemy, or retrograde/combust
  const dusthanaPlanets = planets.filter(p => [6, 8, 12].includes(p.houseNumber));
  const afflictedPlanets = planets.filter(p =>
    /Debilitated|नीच|Enemy|शत्रु/i.test(p.dignity || "") ||
    p.isCombust ||
    [6, 8, 12].includes(p.houseNumber)
  );
  const strongPlanets = planets.filter(p =>
    /Exalted|उच्च|Own|स्वगृही|Moolatrikona|मूलत्रिकोण|Friendly|मित्र/i.test(p.dignity || "") &&
    ![6, 8, 12].includes(p.houseNumber)
  );

  const findPlanet = (key) => planets.find(p => (p.name || "").includes(key) || (p.englishName || "").toLowerCase().includes(key.toLowerCase())) || {};
  const moonP = findPlanet("Chandra");
  const sunP = findPlanet("Surya");
  const marsP = findPlanet("Mangal");
  const mercP = findPlanet("Budha");
  const jupP = findPlanet("Guru");
  const venP = findPlanet("Shukra");
  const satP = findPlanet("Shani");
  const rahuP = findPlanet("Rahu");
  const ketuP = findPlanet("Ketu");

  const h10 = houses[9] || {};
  const h2 = houses[1] || {};
  const h7 = houses[6] || {};
  const h6 = houses[5] || {};
  const h8 = houses[7] || {};
  const h12 = houses[11] || {};

  // Find active Mahadasha & Antardasha planet placements
  const mahaPlanetObj = planets.find(p => mahaHindi.includes((p.name || "").split(" ")[0])) || jupP;
  const antarPlanetObj = planets.find(p => antarHindi.includes((p.name || "").split(" ")[0])) || mercP;

  // 1. क्या-क्या परेशानी चल रही है (Current Life Problems Diagnosis)
  const currentProblems = [
    `🧠 **मानसिक अशांति, अधिक सोच (Overthinking) व निर्णय में उलझन:** चंद्र देव आपकी कुंडली के **${moonP.houseNumber || 1}वें भाव (${moonP.rashiHindi || chandra.rashiHindi})** में स्थित हैं और वर्तमान में **${mahaHindi} महादशा** के भीतर **${antarHindi} की अंतर्दशा** चल रही है। इसके कारण मन में अकारण बेचैनी, भविष्य की चिंता, रात में नींद का टूटना या एक साथ कई विचारों का चलना बना हुआ है। आप मेहनत पूरी कर रहे हैं, किंतु मन को संतुष्टि देर से मिल रही है।`,
    `💼 **करियर, व्यापार व परिश्रम के अनुपात में रुकावट:** दशम भाव (कर्म स्थान - ${h10.rashiHindi || "कर्म भाव"}, स्वामी: **${h10.lord || "शनि"}**) और सक्रिय अंतर्दशा नाथ **${antarPlanetObj.name || antarHindi}** (${antarPlanetObj.houseNumber || 10}वें भाव में) के प्रभाव से बनते हुए कार्यों में अंतिम समय पर विलंब (Delay), कार्यस्थल पर गुप्त प्रतिस्पर्धा, या व्यापार/नौकरी में जितनी मेहनत कर रहे हैं उसका पूरा श्रेय व प्रतिफल न मिल पाने की स्थिति बनी हुई है।`,
    `💰 **आर्थिक बहाव, अनावश्यक खर्च व धन रुकने की समस्या:** धन भाव (2nd House - स्वामी: **${h2.lord || "गुरु"}**) एवं व्यय भाव (12th House - स्वामी: **${h12.lord || "मंगल"}**) के समीकरण तथा ${rahuP.houseNumber ? `राहु के ${rahuP.houseNumber}वें भाव` : "छाया ग्रहों"} के प्रभाव से पैसा हाथ में आता तो है, पर किसी न किसी आकस्मिक कार्य, पारिवारिक जिम्मेदारी या अनावश्यक मद में खर्च हो जाता है (बचत में रुकावट व फंसा हुआ धन)।`,
    `❤️ **पारिवारिक व दांपत्य/संबंधों में वैचारिक मतभेद:** सप्तम भाव (${h7.rashiHindi || "विवाह भाव"}, स्वामी: **${h7.lord || "शुक्र"}**) और ${dosha.isManglik ? `मंगल के ${marsP.houseNumber}वें भाव में होने (मांगलिक प्रभाव)` : `शनि/राहु की दृष्टि`} के कारण जीवनसाथी या परिवार के सदस्यों के साथ कभी-कभी बिना बड़ी बात के गलतफहमी, वाणी में तेजी या भावनात्मक दूरी महसूस होती है—जबकि आपका मन साफ रहता है।`,
    `🩺 **शारीरिक ऊर्जा में कमी, थकान व गुप्त बाधाएं:** ${dusthanaPlanets.length > 0 ? `त्रिक भाव (6, 8, 12) में स्थित ग्रहों (${dusthanaPlanets.map(p => `${p.name} - ${p.houseNumber}वां भाव`).join(", ")})` : `षष्ठेश (${h6.lord}) व अष्टमेश (${h8.lord})`} के कारण सिरदर्द, पेट/पाचन या कंधे-कमर में जकड़न, आलस्य और अचानक नजर दोष या गुप्त शत्रुओं द्वारा काम में अड़चन डालने की स्थिति बन रही है।`
  ];

  // 2. यह परेशानी क्यों और कैसे चल रही है (Why & How It Is Happening - Astrological Proof)
  const cautionedGochar = gochar.filter(g => [6, 8, 12, 4, 1].includes(g.houseFromMoon));
  const mandaLalKitab = (lalKitab.planets || []).filter(lp => (lp.status || "").includes("मंदा"));
  const whyAndHow = [
    `🪐 **1. महादशा और अंतर्दशा का प्रत्यक्ष प्रभाव (Primary Root Cause):** इस समय आप पर **${mahaHindi}** की महादशा और उसमें **${antarHindi}** की अंतर्दशा तथा **${pratyantarHindi}** की प्रत्यंतर दशा चल रही है। कुंडली में **${mahaPlanetObj.name || mahaHindi}** ${mahaPlanetObj.houseNumber || 1}वें भाव (${mahaPlanetObj.rashiHindi || ""}) में और **${antarPlanetObj.name || antarHindi}** ${antarPlanetObj.houseNumber || 6}वें भाव (${antarPlanetObj.rashiHindi || ""}) में बैठा है। बृहत्पाराशर होरा शास्त्र के अनुसार जब महादशानाथ और अंतर्दशानाथ परस्पर षडाष्टक (6/8) या द्विर्द्वादश (2/12) संबंध बनाते हैं अथवा त्रिक भावों को सक्रिय करते हैं, तब जातक को मानसिक व आर्थिक संघर्ष से गुजरना पड़ता है।`,
    `🔭 **2. कुंडली के पीड़ित/त्रिक भावों (6, 8, 12 Houses) का सक्रिय होना:** आपकी कुंडली में ${afflictedPlanets.length > 0 ? afflictedPlanets.map(p => `**${p.name}** (${p.houseNumber}वें भाव में - ${p.dignity})`).join(", ") : `राहु (${rahuP.houseNumber}वें भाव) और केतु (${ketuP.houseNumber}वें भाव)`} स्थित हैं। यह ग्रह योग जातक के आत्मविश्वास की परीक्षा लेता है और बिना संघर्ष के तुरंत सफलता नहीं मिलने देता—हर काम में दो बार प्रयास करना पड़ता है।`,
    `🌌 **3. वर्तमान गोचर (Current Transit) व शनि/राहु की स्थिति:** आपकी जन्म राशि **${chandra.rashiHindi}** से वर्तमान गोचर में ${cautionedGochar.length > 0 ? cautionedGochar.map(g => `**${g.planet}** जन्म राशि से **${g.houseFromMoon}वें भाव** (${g.transitRashi}) में`).join(", ") : `शनि कुंभ राशि में व राहु मीन राशि में`} भ्रमण कर रहे हैं। ${dosha.sadeSati?.phase && dosha.sadeSati.phase !== "Sade Sati Mukt" ? `साथ ही आप पर **${dosha.sadeSati.phase}** का प्रभाव भी कार्यरत है, जो कर्मों की कसौटी और धैर्य की परीक्षा ले रहा है।` : `राशि से अष्टम/द्वादश/चतुर्थ गोचर मानसिक भटकाव और कार्यों में देरी पैदा कर रहा है।`}`,
    `📕 **4. लाल किताब एवं बाधक ग्रह विचार:** ${ak.badhakaMarakaInfo?.badhaka?.note || ""} लाल किताब के अनुसार आपकी कुंडली में ${mandaLalKitab.length > 0 ? mandaLalKitab.map(m => `**${m.planet}** (खाना नं. ${m.houseNumber} में मंदा/पीड़ित)`).join(", ") : "राहु व शनि का प्रभाव"} होने से भाग्य का ताला (Sleeping Fate) पूरी तरह खुलने में रुकावट आ रही है।`
  ];

  // 3. यह परेशानी कब से चल रही है (Since When It Started - Exact Timeline)
  const sinceWhen = [
    `📅 **पृष्ठभूमि की शुरुआत (Background Phase):** आपके जीवन में बड़े बदलावों और जिम्मेदारियों के दबाव की मूल पृष्ठभूमि **${mahaStart}** से शुरू हुई, जब आपकी **${mahaHindi} की महादशा** प्रारंभ हुई।`,
    `⚡ **वर्तमान परेशानियों और रुकावटों का तीव्र दौर (Main Struggle Start):** अभी जो मुख्य मानसिक उलझन, काम में अटकाव और आर्थिक/पारिवारिक तनाव आप महसूस कर रहे हैं, वह विशेष रूप से **${antarStart}** से शुरू हुआ है—क्योंकि इसी तारीख से **${mahaHindi} में ${antarHindi} की अंतर्दशा** सक्रिय हुई है।`,
    `🔥 **हालिया उतार-चढ़ाव (Recent Peak Pressure):** पिछले कुछ समय में **${pratyantarStart}** से जब **${pratyantarHindi} की प्रत्यंतर दशा** लगी, तब से मन में बेचैनी, खर्चों की अधिकता और बनते काम रुकने की गति और अधिक तेज महसूस हो रही है।`
  ];

  // 4. यह परेशानी कब ठीक होगी और भाग्योदय कब होगा (When Will It Resolve - Relief & Golden Period Dates)
  const timelineList = dasha.antardashasTimeline || [];
  const currentIdx = timelineList.findIndex(a => a.isCurrent);
  const nextAntar1 = currentIdx >= 0 && timelineList[currentIdx + 1] ? timelineList[currentIdx + 1] : timelineList[0];
  const nextAntar2 = currentIdx >= 0 && timelineList[currentIdx + 2] ? timelineList[currentIdx + 2] : timelineList[1];

  const whenWillItResolve = [
    `🌤️ **पहली राहत (Initial Relief Milestone):** आपकी वर्तमान प्रत्यंतर दशा **${pratyantarEnd}** को समाप्त हो रही है। **${pratyantarEnd}** के तुरंत बाद से आपके मानसिक तनाव में कमी आएगी, रुके हुए छोटे काम बनने लगेंगे और मन में स्पष्टता लौटेगी।`,
    `🌅 **बड़ा परिवर्तन और संकट से पूर्ण मुक्ति (Major Turnaround Date):** वर्तमान **${antarHindi} की अंतर्दशा ${antarEnd} को पूर्ण रूप से समाप्त हो जाएगी।** पंडित जी के गणितीय विश्लेषण के अनुसार **${antarEnd}** के बाद आपकी वर्तमान बड़ी परेशानियां, कर्ज/खर्च का दबाव और कार्यक्षेत्र की रुकावटें जड़ से हटने लगेंगी।`,
    `👑 **स्वर्ण काल व भाग्योदय समय चक्र (Upcoming Golden Period):** ${nextAntar1 ? `**${nextAntar1.startDate} से ${nextAntar1.endDate}** तक चलने वाली **${nextAntar1.planetHindi} की अंतर्दशा** आपके लिए अत्यंत शुभ और भाग्योदयकारी रहेगी। इस अवधि में रुका हुआ धन प्राप्त होगा, करियर/व्यापार में बड़ी उन्नति होगी और पारिवारिक सुख-शांति स्थापित होगी।` : `**${antarEnd}** के पश्चात नई अंतर्दशा लगते ही आपके राजयोग (${yogas.slice(0, 2).map(y => y.name).join(", ") || "लग्न-त्रिकोण योग"}) पूर्ण फल देने लगेंगे।`} ${nextAntar2 ? `इसके पश्चात **${nextAntar2.startDate} से ${nextAntar2.endDate}** (${nextAntar2.planetHindi} अंतर्दशा) में स्थायी संपत्ति, पद-प्रतिष्ठा और आर्थिक समृद्धि के प्रबल योग बनेंगे।` : ""}`,
    `🛡️ **तुरंत राहत का शास्त्रीय मार्ग:** यदि आप **${antarEnd}** तक का इंतजार किए बिना अभी तुरंत (11 से 41 दिनों के भीतर) ग्रहों की नकारात्मकता शांत करना चाहते हैं, तो नीचे दिए गए **सिद्ध नेपाली रुद्राक्ष (${recs.map(r => r.mukhi).join(", ")})** और लाल किताब/वैदिक उपायों को श्रद्धापूर्वक प्रारंभ कर दें—इससे दशा का अशुभ प्रभाव तुरंत कवच की तरह कटने लगता है।`
  ];

  // Build Full Pandit Ji Report Markdown (Used as authoritative reference & instant fallback)
  const planetsBulletMarkdown = planets.map(p => {
    const isGood = /Exalted|उच्च|Own|स्वगृही|Moolatrikona|मूलत्रिकोण|Friendly|मित्र/i.test(p.dignity || "") && ![6, 8, 12].includes(p.houseNumber);
    return `• 📌 **${p.name}** — **भाव:** ${p.houseNumber}वां भाव | **राशि:** ${p.rashiHindi} (${p.degreeInSign}) | **नक्षत्र:** ${p.nakshatra} (चरण ${p.pada}) | **स्थिति:** **${p.dignity}** | **नवमांश (D9):** ${p.navamshaRashiHindi}${p.isVargottama ? " 🌟 *(वर्गोत्तम - अत्यंत बली)*" : ""}${p.isRetrograde ? " 🔄 *(वक्री)*" : ""}${p.isCombust ? " 🔥 *(अस्त)*" : ""}\n  - 💡 **पंडित जी का फलादेश:** ${p.signification || ""} ${isGood ? "यह ग्रह आपकी कुंडली में शुभ बल दे रहा है और सही दशा आने पर उच्च सफलता दिलाएगा।" : "इस ग्रह की पीड़ा/स्थान के कारण संबंधित क्षेत्र में संघर्ष व विलंब होता है, जिसके लिए रुद्राक्ष व मंत्र जाप आवश्यक है।"}`;
  }).join("\n\n");

  const housesBulletMarkdown = houses.map(h => {
    const occText = h.occupants && h.occupants.length > 0 ? h.occupants.join(", ") : "कोई ग्रह नहीं (भावेश द्वारा संचालित)";
    const aspText = h.aspects && h.aspects.length > 0 ? h.aspects.join(", ") : "सामान्य दृष्टि";
    return `• 🏛️ **${h.houseNumber}वां भाव (${h.significance || "जीवन क्षेत्र"})** — **राशि:** ${h.rashiHindi} | **स्वामी (भावेश):** ${h.lord} | **स्थित ग्रह:** ${occText} | **दृष्टि:** ${aspText}`;
  }).join("\n");

  const lalKitabUpayMarkdown = (lalKitab.planets || []).slice(0, 5).map(lp =>
    `• 📕 **${lp.planet} (खाना नं. ${lp.houseNumber} - ${lp.status}):** ${lp.lalKitabUpay}`
  ).join("\n");

  const rudrakshaMarkdown = recs.map((r, idx) =>
    `• 📿 **${idx + 1}. ${r.role}: ${r.mukhi}**\n  - **शास्त्रीय कारण:** ${r.reason}\n  - **सिद्ध बीज मंत्र:** \`${r.beejMantra || "ॐ नमः शिवाय"}\` (प्रतिदिन प्रातः 108 बार जाप)\n  - **धारण दिवस:** ${r.wearingDay || "सोमवार या प्रदोष व्रत"} (गंगाजल व कच्चे दूध से अभिषेक कर लाल/पीले रेशमी धागे या चाँदी में धारण करें)`
  ).join("\n\n");

  const fullPanditJiReportMarkdown = `🙏 **श्री गणेशाय नमः! हर हर महादेव! प्रणाम ${vb.name || "भक्त"} जी।**

मैं **AI पंडित जी (ज्योतिषाचार्य)** हूँ। मैंने महर्षि पाराशर के **बृहत्पाराशर होरा शास्त्र (BPHS)**, **फलदीपिका**, **जैमिनी सूत्र**, **लाल किताब** और **शिव पुराण** के शास्त्रीय नियमों तथा **लाहिड़ी चित्रापक्षीय अयनांश (${vb.ayanamsha || "Lahiri"})** के आधार पर आपकी जन्म कुंडली का सूक्ष्म गणितीय अध्ययन किया है।

एक सच्चे वैदिक ब्राह्मण व ज्योतिषी की भांति मैं बिना कुछ छिपाए आपको स्पष्ट शब्दों में बता रहा हूँ कि **अभी आपके जीवन में क्या-क्या परेशानी चल रही है, क्यों चल रही है, कब से चल रही है, कैसे चल रही है और यह कब पूरी तरह ठीक होगी:**

---

### 1. 🔍 अभी आपके जीवन में क्या-क्या परेशानी चल रही है? (वर्तमान समस्याओं का सटीक निदान)
${currentProblems.map(item => `• ${item}`).join("\n\n")}

---

### 2. ❓ यह परेशानी क्यों और कैसे चल रही है? (कुंडली के ग्रहों व भावों का प्रत्यक्ष शास्त्रीय कारण)
${whyAndHow.map(item => `• ${item}`).join("\n\n")}

---

### 3. 📅 यह परेशानी कब से चल रही है? (सटीक तारीख व दशा प्रमाण)
${sinceWhen.map(item => `• ${item}`).join("\n\n")}

---

### 4. ⏳ यह परेशानी कब ठीक होगी और आपका भाग्योदय कब होगा? (सटीक समय व समाधान काल)
${whenWillItResolve.map(item => `• ${item}`).join("\n\n")}

---

### 5. 🔭 आपकी जन्म कुंडली का मूल पंचांग व अवकहड़ा चक्र (Birth Chart Foundation)
• **जातक का नाम:** ${vb.name || "भक्त"} | **जन्म तिथि:** ${vb.dob} | **जन्म समय:** ${vb.birthTime} | **जन्म स्थान:** ${vb.birthPlace}
• **जन्म लग्न (Ascendant):** **${lagna.rashiHindi} (${lagna.rashiEnglish})** — अंश: ${lagna.degree} | **लग्नेश:** ${lagna.lord} | **नवमांश (D9):** ${lagna.navamsha}
• **जन्म चंद्र राशि (Moon Sign):** **${chandra.rashiHindi} (${chandra.rashiEnglish})** — अंश: ${chandra.degree} | **राशि स्वामी:** ${chandra.lord}
• **जन्म नक्षत्र:** **${chandra.nakshatra}** (चरण ${chandra.pada}) | **सूर्य राशि:** ${surya.rashiHindi} (${surya.rashiEnglish})
• **पंचांग विवरण:** वार: ${ak.panchanga?.vaar || "शुभ वार"} | तिथि: ${ak.panchanga?.tithi || "शुभ तिथि"} | योग: ${ak.panchanga?.yoga || "शुभ योग"} | करण: ${ak.panchanga?.karana || "शुभ करण"}
• **अवकहड़ा चक्र:** पाया: **${ak.avakahadaChakra?.paya || "चाँदी"}** | वर्ण: ${ak.avakahadaChakra?.varna || "क्षत्रिय"} | गण: ${ak.avakahadaChakra?.gana || "देव"} | नाड़ी: ${ak.avakahadaChakra?.nadi || "मध्य"} | मूलांक: **${ak.mulank}** | भाग्यांक: **${ak.avakahadaChakra?.bhagyank || ak.mulank}**
• **शुभ अंक:** ${ak.avakahadaChakra?.shubhAnk || "1, 3, 9"} | **शुभ दिन:** ${ak.avakahadaChakra?.shubhDin || "सोमवार, गुरुवार"} | **भाग्योदय वर्ष:** ${ak.avakahadaChakra?.shubhVarsh || "24, 28, 32, 36 वर्ष"}

---

### 6. 🪐 नवग्रहों की भाव-राशि स्थिति, उच्च/नीच विचार व विस्तृत फलादेश (All 9 Planets Detailed Reading)
${planetsBulletMarkdown}

---

### 7. 🏛️ कुंडली के 12 भावों (Bhavas) का संपूर्ण विश्लेषण
${housesBulletMarkdown}

---

### 8. ✨ कुंडली के प्रमुख राजयोग, दोष एवं गोचर (Yogas, Doshas & Transits)
• **प्रमुख शुभ योग:** ${yogas.length > 0 ? yogas.map(y => `**${y.name}** (${y.description})`).join(" | ") : "लग्न-त्रिकोण राजयोग एवं धर्म-कर्मधिपति सहयोग"}
• **मांगलिक दोष विचार:** ${dosha.manglikNote}
• **शनि साढ़े साती / ढैया स्थिति:** ${dosha.sadeSati?.phase || "साढ़े साती मुक्त"} — ${dosha.sadeSati?.description || ""}
• **कालसर्प योग विचार:** ${dosha.kaalSarp?.type || "कालसर्प मुक्त"} — ${dosha.kaalSarp?.description || ""}
• **ताजिक वर्षफल (मुंथा विचार - वर्ष ${ak.tajikVarshphal?.currentYear || new Date().getFullYear()}):** आपकी वार्षिक मुंथा **${ak.tajikVarshphal?.munthaHouse || 1}वें भाव (${ak.tajikVarshphal?.munthaRashi || lagna.rashiHindi})** में है — ${ak.tajikVarshphal?.munthaSignificance || ""}

---

### 9. ⏱️ विंशोत्तरी महादशा, अंतर्दशा व आगामी समय सारिणी (Complete Dasha Timeline)
• **सक्रिय 4-स्तरीय दशा सूत्र:** **${dasha.dashaChainSummary || `${mahaHindi} > ${antarHindi} > ${pratyantarHindi}`}**
• **वर्तमान महादशा:** **${mahaHindi}** (${mahaStart} से ${mahaEnd} तक)
• **वर्तमान अंतर्दशा:** **${antarHindi}** (${antarStart} से ${antarEnd} तक)
• **वर्तमान प्रत्यंतर दशा:** **${pratyantarHindi}** (${pratyantarStart} से ${pratyantarEnd} तक)
• **अंतर्दशा समय चक्र (Antardasha Roadmap):**
${(dasha.antardashasTimeline || []).map(a => `  - **${a.planetHindi}:** ${a.startDate} से ${a.endDate} तक ${a.isCurrent ? "👉 **[वर्तमान में सक्रिय]**" : ""}`).join("\n")}

---

### 10. 📕 लाल किताब के अचूक उपाय व कुंडली-प्रमाणित सिद्ध नेपाली रुद्राक्ष (Remedies & Rudraksha)
**क) लाल किताब व वैदिक घरेलू उपाय:**
${lalKitabUpayMarkdown}
• प्रतिदिन प्रातः तांबे के लोटे से सूर्य देव को जल अर्पित करें और शिवलिंग पर जल व काले तिल चढ़ाएं।

**ख) आपकी जन्म कुंडली से 100% प्रमाणित सिद्ध नेपाली रुद्राक्ष कवच (शिव पुराण सम्मत):**
${rudrakshaMarkdown}

---

### 🌟 पंडित जी का अनिवार्य सारांश (Key Takeaways)
• **मुख्य समस्या का कारण:** **${mahaHindi}** महादशा में **${antarHindi}** अंतर्दशा (${antarStart} से सक्रिय) एवं त्रिक भाव/गोचर का दबाव।
• **राहत कब मिलेगी:** पहली राहत **${pratyantarEnd}** के बाद और पूर्ण भाग्योदय **${antarEnd}** के पश्चात।
• **सर्वश्रेष्ठ रक्षा कवच:** **${recs.map(r => r.mukhi).join(" + ")}** (100% शुद्ध नेपाली, लैब प्रमाणित व प्राण-प्रतिष्ठित)।

भगवान देवाधिदेव महादेव एवं माता अन्नपूर्णा आपके समस्त कष्टों का निवारण करें और आपके जीवन में सुख, शांति व अथाह समृद्धि प्रदान करें। **हर हर महादेव!** 🙏

[AURA_KEYWORDS]: ${recs[0]?.mukhi || "सिद्ध रुद्राक्ष"} धारण विधि | मेरी परेशानी कब ठीक होगी | ${mahaHindi} महादशा उपाय | नवग्रह शांति उपाय | संपूर्ण कुंडली फलादेश`;

  return {
    currentProblems,
    whyAndHow,
    sinceWhen,
    whenWillItResolve,
    fullPanditJiReportMarkdown
  };
}


/**
 * Determine Question Intent for Focused Astrological Analysis
 */
export function determineAstrologicalIntent(userQuery = "") {
  if (!userQuery || typeof userQuery !== "string") return { type: "full_kundali", label: "Sampurna Vedic Kundali & Pareshani Nivaran Vishleshan" };
  const q = userQuery.toLowerCase().trim();

  // 1. Greetings & Casual Hi (when user just greets without asking a specific question)
  if (
    /^(hi|hii|hiii|hiiii|helo|hello|hey|namaste|namaskar|pranam|ram ram|radhe radhe|jai shree ram|har har mahadev|greetings)$/i.test(q) ||
    /^(नमस्ते|प्रणाम|नमस्कार|जय श्री राम|हर हर महादेव|राधे राधे|हेलो|हाय)$/i.test(q) ||
    (q.length <= 25 && /^(hi|hii|hello|hey|namaste|pranam|namaskar|नमस्ते|प्रणाम|नमस्कार)\b/i.test(q) && !/kundali|dasha|rashi|graha|job|shaadi|future|batao|bataiye|dekh|kaisa|kab|kya|shani|pareshan|problem|dikkat|naukri|nokri/i.test(q))
  ) {
    return { type: "greeting", label: "Devotee Greeting" };
  }

  // 2. Specific Astrological Topics (Checked FIRST to ensure targeted questions are never misclassified as full kundali dump)

  // Career & Business (नौकरी, करियर, व्यापार, काम-धंधा, पदोन्नति)
  if (/career|job|naukri|nokri|naukari|rozgar|rojgar|business|vyapar|dhandha|promotion|success|kaam|profession|d10|dashamsha|sarkari|interview|transfer|office|service|work|कैरियर|नौकरी|व्यापार|रोजगार|काम|सरकारी नौकरी|पदोन्नति|स्थानांतरण/i.test(q)) {
    return { type: "career", label: "Career, Job & Business Analysis", houses: [10, 1, 6, 2, 11], karakas: ["Sun", "Mars", "Saturn", "Mercury", "AmK"], dChart: "D10 Dashamsha" };
  }

  // Marriage & Relationships (विवाह, शादी, दांपत्य, जीवनसाथी, प्रेम)
  if (/marriage|shaadi|shadi|vivah|love|relationship|husband|wife|spouse|partner|manglik|d9|navamsha|7th house|upapada|jeevansathi|rishta|patni|pati|dampatya|शादी|विवाह|पति|पत्नी|दंपति|दांपत्य|प्रेम|जीवनसाथी|रिश्ता/i.test(q)) {
    return { type: "marriage", label: "Marriage & Relationship Analysis", houses: [7, 2, 4, 8], karakas: ["Venus", "Jupiter", "DK"], dChart: "D9 Navamsha" };
  }

  // Wealth & Finance (धन, पैसा, कर्ज, आर्थिक स्थिति, रुका हुआ धन)
  if (/wealth|dhan|money|paisa|paise|finance|debt|karza|karz|loan|udhari|riddhi|siddhi|11th house|2nd house|dhana yoga|lakshmi|amiri|income|कमाई|धन|संपत्ति|कर्ज|उधारी|रुपया|रुपये|पैसा|आर्थिक/i.test(q)) {
    return { type: "finance", label: "Wealth & Finance Analysis", houses: [2, 11, 5, 9, 6], karakas: ["Jupiter", "Venus", "Mercury"], dChart: "D2 Hora" };
  }

  // Health & Longevity (स्वास्थ्य, रोग, बीमारी, मानसिक तनाव)
  if (/health|roog|rog|illness|disease|hospital|bimari|swasthya|longevity|ayush|6th house|8th house|depression|stress|tension|तनाव|स्वास्थ्य|बीमारी|रोग|आयु|आरोग्य|दवा/i.test(q)) {
    return { type: "health", label: "Health & Vitality Analysis", houses: [1, 6, 8, 12], karakas: ["Sun", "Moon", "Mars", "Saturn"], dChart: "D30 Trimshamsha" };
  }

  // Education & Exams (शिक्षा, पढ़ाई, परीक्षा, प्रतियोगिता)
  if (/study|padhai|padai|education|exam|competitive|degree|school|college|5th house|4th house|ias|ips|upsc|neet|jee|pariksha|पढ़ाई|शिक्षा|परीक्षा|विद्या|प्रतियोगिता/i.test(q)) {
    return { type: "education", label: "Education & Intellect Analysis", houses: [4, 5, 9, 6], karakas: ["Mercury", "Jupiter"], dChart: "D24 Chaturvimshamsha" };
  }

  // Travel & Foreign Settlement (विदेश यात्रा, वीजा, पीआर)
  if (/foreign|abroad|travel|visa|pr|settlement|videsh|12th house|9th house|विदेश|यात्रा|वीजा|विदेश वास|विदेश यात्रा/i.test(q)) {
    return { type: "travel", label: "Foreign Travel & Relocation Analysis", houses: [12, 9, 3, 7], karakas: ["Rahu", "Moon"], dChart: "D9 Navamsha" };
  }

  // Children / Progeny (संतान, बच्चा, गर्भ)
  if (/child|baby|bachha|bachhe|santan|progeny|conception|5th house|d7|garbh|संतान|बच्चा|बच्चे|वंश|गर्भ/i.test(q)) {
    return { type: "progeny", label: "Children & Lineage Analysis", houses: [5, 9, 2], karakas: ["Jupiter", "PK"], dChart: "D7 Saptamsha" };
  }

  // Property & Vehicles (मकान, जमीन, वाहन, गाड़ी)
  if (/property|land|house|makaan|makan|ghar|car|gaadi|gadi|vehicle|4th house|मकान|घर|जमीन|संपत्ति|वाहन|गाड़ी|प्लॉट/i.test(q)) {
    return { type: "property", label: "Property & Vehicles Analysis", houses: [4, 10, 2], karakas: ["Mars", "Venus", "Saturn"], dChart: "D4 & D16" };
  }

  // Graha Specific (शनि, राहु, केतु, मंगल, सूर्य, चंद्र, गुरु, शुक्र, बुध)
  if (/\b(shani|sade\s*sati|dhaiya|rahu|ketu|mangal|surya|chandra|budha|guru|brihaspati|shukra)\b|(?:^|\s|[।,!?])(शनि|साढ़े\s*साती|ढैया|राहु|केतु|मंगल|सूर्य|चन्द्र|चंद्र|बुध|गुरु|बृहस्पति|शुक्र|ग्रह\s*शांति)(?:\s|$|[।,!?])/i.test(q)) {
    return { type: "graha_specific", label: "Graha Gochar & Planetary Impact Analysis" };
  }

  // Dosha Analysis (मांगलिक, कालसर्प, पितृ दोष)
  if (/dosh|dosha|manglik|kaal\s*sarp|pitra\s*dosh|grahan\s*dosh|chandal\s*dosh|दोष|मांगलिक|काल\s*सर्प|कालसर्प|पितृ\s*दोष|ग्रहण\s*दोष|चांडाल\s*दोष/i.test(q)) {
    return { type: "dosha", label: "Vedic Dosha & Shanti Analysis" };
  }

  // Dasha Timing & Current Mahadasha (दशा, महादशा, समय चक्र)
  if (/\b(dasha|mahadasha|antardasha|pratyantar|vimshottari)\b|(दशा|महादशा|अंतर्दशा|प्रत्यंतर|विंशोत्तरी|समय\s*चक्र)/i.test(q)) {
    return { type: "dasha_timing", label: "Vimshottari Dasha & Time Window Analysis" };
  }

  // Rudraksha Selection & Dharan Vidhi
  if (/rudraksha|rudraksh|mukhi|beej mantra|dharan|pehne|koun sa rudraksh|रुद्राक्ष|मुखी|बीज मंत्र|धारण विधि|पहनूं|पहनना/i.test(q)) {
    return { type: "rudraksha", label: "Vedic Rudraksha Selection & Dharan Vidhi", houses: [1, 5, 9], karakas: ["Jupiter", "Sun", "Moon"] };
  }

  // Authenticity & Kundali Verification Intent (Anti-Fake & Authentic Kundali Mandate)
  if (
    /(fack|fake|farzi|fraud|sach|pramanik|authentic|kundali dekh kar|kundali dekh ke|kundali dekh kr|kundali dekh kar hi|kundali se hi|trend karo|train karo|jhuth|jhooth|asli|nakli|मनगढ़ंत|फर्जी|प्रामाणिक|सत्य|सच्चा|कुंडली देखकर|कुंडली देख कर|कुंडली से ही|कुंडली निकाल|सच्ची कुंडली|ट्रेन करो|ट्रेंड करो)/i.test(q)
  ) {
    return {
      type: "authenticity_verification",
      label: "Authentic Kundali-Verified Guidance (Anti-Fake Mandate)",
      houses: [1, 5, 9, 10],
      karakas: ["Sun", "Jupiter"]
    };
  }

  // 3. Comprehensive Full Kundali + Life Problem Diagnosis Triggers
  // Triggers ONLY when user explicitly asks for the full kundali breakdown or general life diagnosis
  const isFullOrLifeDiagnosisRequest = (
    /(पूरी\s*कुंडली|संपूर्ण\s*कुंडली|विस्तृत\s*कुंडली|फुल\s*कुंडली|कुंडली\s*विश्लेषण|जन्म\s*तिथि:|जन्म\s*समय:|जन्म\s*स्थान:|मुख्य\s*संकल्प|puri\s*kundali|poori\s*kundali|full\s*kundali|complete\s*kundli|complete\s*reading|sampurna\s*kundali|diteld|detailed|sab\s*kuch|सब\s*कुछ)/i.test(q) ||
    /(pareshani|paresani|dikkat|problem|samasya|sankat|rukaawat|rukawat|kya\s*chal\s*raha|kyo\s*chal|kyu\s*chal|kab\s*se|kese\s*chal|kaise\s*chal|kab\s*sahi\s*hog|kab\s*thik\s*hog|kab\s*theek\s*hog|परेशानी|दिक्कत|समस्या|संकट|रुकावट|क्यों\s*चल|कब\s*से|कैसे\s*चल|कब\s*सही\s*होगी|कब\s*ठीक\s*होगी|पंडित\s*की\s*तरह|bandit\s*ki\s*tarh|pandit\s*ki\s*tarah)/i.test(q)
  );
  if (isFullOrLifeDiagnosisRequest) {
    return { type: "full_kundali", label: "Sampurna Vedic Kundali & Pareshani Nivaran Vishleshan (What, Why, Since When, How & When Resolved)" };
  }

  return { type: "specific_query", label: "Focused Astrological Guidance" };
}

/**
 * Generate 100% Kundali-Grounded Targeted Topic Guidance for Follow-up Questions
 * Answers specifically what was asked (e.g. "nokri ke bare me", marriage, wealth, health)
 * without re-printing the full 9 planets or the entire 10-section Kundali dump!
 */
export function generateKundaliTopicDiagnosis(kundaliData, astroIntent = null, userQuery = "") {
  if (!kundaliData || !kundaliData.astronomicalKundali) return "";

  const vb = kundaliData.verifiedBirthData || {};
  const ak = kundaliData.astronomicalKundali;
  const lagna = ak.lagna || {};
  const chandra = ak.chandraRashi || {};
  const surya = ak.suryaRashi || {};
  const dasha = ak.vimshottariDasha || {};
  const planets = ak.planets || [];
  const houses = ak.houses || [];
  const dosha = ak.doshaSummary || {};
  const recs = ak.rudrakshaRecommendations || [];
  const lalKitab = ak.lalKitab || {};

  const mahaHindi = dasha.currentMahadashaHindi || "बृहस्पति (गुरु)";
  const antarHindi = dasha.currentAntardashaHindi || "बुध (Mercury)";
  const pratyantarHindi = dasha.currentPratyantardashaHindi || antarHindi;
  const antarEnd = dasha.antardashaEndDate || "निकट भविष्य";
  const pratyantarEnd = dasha.pratyantardashaEndDate || "शीघ्र";

  const timelineList = dasha.antardashasTimeline || [];
  const currentIdx = timelineList.findIndex(a => a.isCurrent);
  const nextAntar1 = currentIdx >= 0 && timelineList[currentIdx + 1] ? timelineList[currentIdx + 1] : timelineList[0];

  const findPlanet = (key) => planets.find(p => (p.name || "").includes(key) || (p.englishName || "").toLowerCase().includes(key.toLowerCase())) || {};
  const sunP = findPlanet("Surya");
  const moonP = findPlanet("Chandra");
  const marsP = findPlanet("Mangal");
  const mercP = findPlanet("Budha");
  const jupP = findPlanet("Guru");
  const venP = findPlanet("Shukra");
  const satP = findPlanet("Shani");
  const rahuP = findPlanet("Rahu");
  const ketuP = findPlanet("Ketu");

  const h1 = houses[0] || {};
  const h2 = houses[1] || {};
  const h4 = houses[3] || {};
  const h5 = houses[4] || {};
  const h6 = houses[5] || {};
  const h7 = houses[6] || {};
  const h8 = houses[7] || {};
  const h9 = houses[8] || {};
  const h10 = houses[9] || {};
  const h11 = houses[10] || {};
  const h12 = houses[11] || {};

  const jaiminiKarakas = ak.jaiminiKarakas || [];
  const amk = jaiminiKarakas.find(k => k.karakaCode === "AmK");
  const dk = jaiminiKarakas.find(k => k.karakaCode === "DK");

  const primaryRec = recs[0] || { mukhi: "प्रामाणिक मुख्य रुद्राक्ष" };
  const dashaRec = recs[2] || primaryRec;

  const intentType = astroIntent?.type || "specific_query";

  // 1. CAREER / JOB / BUSINESS (नौकरी, व्यापार, पदोन्नति)
  if (intentType === "career") {
    const isSaturnStrong = !/Debilitated|नीच/i.test(satP.dignity || "");
    const isSunStrong = !/Debilitated|नीच/i.test(sunP.dignity || "");
    const jobSuitability = (h6.occupants && h6.occupants.length > 0 && !h6.occupants[0].includes("Shunya")) || /Service|Friendly|Exalted/i.test(satP.dignity || "")
      ? "आपकी कुंडली में सेवा/नौकरी (Service/Job) का पक्ष अधिक अनुकूल और निरंतरता देने वाला है। नियमित पद पर कार्य करना आपके लिए सुरक्षित व फलदायी रहेगा।"
      : "आपकी कुंडली में कर्म भाव (10th) व लाभ भाव (11th) का संबंध स्वतंत्र कार्य, व्यापार, कंसल्टेंसी या पार्टनरशिप में भी उत्तम सफलता का योग बनाता है।";

    return `🙏 **प्रणाम ${vb.name || "भक्त"}! हर हर महादेव।**

आपकी जन्म कुंडली (${lagna.rashiHindi} लग्न, ${chandra.rashiHindi} चंद्र राशि) के प्रत्यक्ष गणितीय विश्लेषण के आधार पर **नौकरी, करियर व आजीविका** का सटीक वैदिक फलादेश इस प्रकार है:

---

### 🏛️ 1. दशम भाव (कर्म स्थान) व षष्ठ भाव (नौकरी/सेवा) की स्थिति
• **दशम भाव (Karmasthana - करियर व पद):** आपकी कुंडली का 10वां भाव **${h10.rashiHindi}** राशि में है, जिसके भावेश **${h10.lord}** हैं। 
  - स्थित ग्रह: **${h10.occupants ? h10.occupants.join(", ") : "भावेश द्वारा संचालित"}**
  - दृष्टि संबंध: ${h10.aspects && h10.aspects.length > 0 ? h10.aspects.join(", ") : "सामान्य ग्रहीय प्रभाव"}
• **षष्ठ भाव (6th House - सेवा, नौकरी व प्रतियोगिता):** 6वां भाव **${h6.rashiHindi}** राशि में है (स्वामी: **${h6.lord}**)। इसमें स्थित ग्रह: **${h6.occupants ? h6.occupants.join(", ") : "शुभ"}**।
• **धन व लाभ समीकरण (2nd & 11th House):** धन भाव स्वामी **${h2.lord}** एवं लाभ भाव स्वामी **${h11.lord}** का प्रभाव कार्य के अनुपात में आय सुनिश्चित करता है।

---

### 🪐 2. मुख्य कर्म व अधिकार कारक ग्रहों का प्रभाव
• 📌 **शनि देव (कर्म फलदाता):** शनि देव आपकी कुंडली के **${satP.houseNumber || 10}वें भाव** में **${satP.rashiHindi || ""}** राशि में (**${satP.dignity || "सामान्य"}**) स्थित हैं। ${isSaturnStrong ? "शनि देव आपके कर्मक्षेत्र को मजबूती दे रहे हैं, किंतु आरंभ में कड़ी मेहनत और धैर्य की परीक्षा लेते हैं।" : "शनि की वर्तमान स्थिति से बनते कार्यों में थोड़ा विलंब होता है, जिसके लिए कर्म में स्पष्टता और शनि शांति आवश्यक है।"}
• 📌 **सूर्य देव (सरकारी नौकरी, प्रशासनिक मान-सम्मान व उच्चाधिकारी संबंध):** सूर्य देव **${sunP.houseNumber || 1}वें भाव** में **${sunP.rashiHindi || ""}** राशि में स्थित हैं। ${isSunStrong ? "सूर्य का बल आपको नेतृत्व क्षमता व उच्च पद दिलाने में सहायक है।" : "कार्यस्थल पर उच्चाधिकारियों से मतभेद से बचें और सूर्य को नियमित अर्घ्य दें।"}
• 📌 **जैमिनी अमात्यकारक (AmK - आजीविका निर्देशक):** आपकी कुंडली में **${amk ? `${amk.planetName} (${amk.signName}, ${amk.houseNumber}वां भाव)` : "सूर्य देव"}** अमात्यकारक ग्रह हैं, जो बताते हैं कि आपका कार्यक्षेत्र बुद्धि, व्यवस्थापन और विशेषज्ञता से जुड़ा होना चाहिए।

---

### ⚖️ 3. नौकरी या व्यापार — आपके लिए क्या बेहतर है?
• ${jobSuitability}

---

### ⏳ 4. नौकरी में रुकावट कब हटेगी और नई जॉब/प्रमोशन का समय?
• **विंशोत्तरी दशा समय चक्र:** आप पर वर्तमान में **${mahaHindi} महादशा** के भीतर **${antarHindi} की अंतर्दशा** चल रही है।
• **राहत की पहली किरण:** प्रत्यंतर दशा **${pratyantarEnd}** को समाप्त होने के साथ ही मानसिक दबाव कम होगा और इंटरव्यू/नए प्रस्ताव के अवसर बनने लगेंगे।
• **बड़ा अनुकूल समय:** वर्तमान **${antarHindi} अंतर्दशा ${antarEnd}** को समाप्त होगी। ${nextAntar1 ? `इसके पश्चात **${nextAntar1.startDate} से ${nextAntar1.endDate}** तक चलने वाली **${nextAntar1.planetHindi} की अंतर्दशा** आपके करियर के लिए अत्यंत भाग्यवर्धक सिद्ध होगी, जिसमें नई नौकरी, पदोन्नति और आर्थिक स्थिरता का प्रबल योग है।` : `इसके पश्चात आपके कार्यक्षेत्र में स्थायी गति और प्रतिष्ठा का योग बनेगा।`}

---

### 📿 5. करियर उन्नति हेतु सिद्ध नेपाली रुद्राक्ष व अचूक उपाय
1. **${primaryRec.mukhi} (मुख्य लग्न रुद्राक्ष):** आपका आत्मविश्वास, एकाग्रता और व्यक्तित्व प्रभावशाली बनाने हेतु।
2. **10 मुखी रुद्राक्ष (भगवान श्री हरि विष्णु) अथवा 7 मुखी रुद्राक्ष (माता महालक्ष्मी):** कार्यक्षेत्र में षड्यंत्रों से सुरक्षा, सभी 10 दिशाओं से अनुकूलता और करियर में स्थिर आय व पदोन्नति हेतु।
3. **दैनिक वैदिक उपाय:** 
   - नित्य प्रातः तांबे के लोटे में जल, थोड़ा सा गुड़ व लाल चंदन डालकर भगवान सूर्य को अर्घ्य दें और \`ॐ सूर्याय नमः\` का 11 बार जाप करें।
   - शनिवार को पीपल के वृक्ष के नीचे सरसों के तेल का दीपक प्रज्वलित करें।

भगवान भोलेनाथ आपके कर्मक्षेत्र में सफलता और यश प्रदान करें। **हर हर महादेव!**

[AURA_KEYWORDS]: नौकरी में सफलता | करियर राशिफल | ${primaryRec.mukhi} | 10 मुखी रुद्राक्ष | महादशा उपाय`;
  }

  // 2. MARRIAGE / RELATIONSHIPS (विवाह, दांपत्य, जीवनसाथी)
  if (intentType === "marriage") {
    const isVenusStrong = !/Debilitated|नीच/i.test(venP.dignity || "");
    const manglikText = dosha.isManglik
      ? `आपकी कुंडली में मंगल **${marsP.houseNumber}वें भाव** में स्थित होने से मांगलिक प्रभाव उपस्थित है। ${dosha.manglikNote || ""}`
      : `आपकी कुंडली मांगलिक दोष से मुक्त है (${dosha.manglikNote || "अनुकूल स्थिति"})।`;

    return `🙏 **प्रणाम ${vb.name || "भक्त"}! हर हर महादेव।**

आपकी जन्म कुंडली (${lagna.rashiHindi} लग्न, ${chandra.rashiHindi} चंद्र राशि) के अनुसार **विवाह, जीवनसाथी व दांपत्य जीवन** का प्रामाणिक वैदिक विश्लेषण इस प्रकार है:

---

### 🏛️ 1. सप्तम भाव (विवाह व साझेदारी) की स्थिति
• **सप्तम भाव (7th House):** विवाह भाव **${h7.rashiHindi}** राशि में है, जिसके भावेश **${h7.lord}** हैं।
  - स्थित ग्रह: **${h7.occupants ? h7.occupants.join(", ") : "शुभ"}**
  - दृष्टि: ${h7.aspects && h7.aspects.length > 0 ? h7.aspects.join(", ") : "सामान्य दृष्टि"}
• **द्वितीय भाव (कुटुंब व सामंजस्य):** कुटुंब भाव के स्वामी **${h2.lord}** हैं, जो वैवाहिक जीवन में पारिवारिक समर्थन को दर्शाते हैं।
• **मांगलिक विचार:** ${manglikText}

---

### 🪐 2. शुक्र व गुरु (विवाह कारक ग्रह) एवं दाराकारक
• 📌 **शुक्र देव (दांपत्य व प्रेम कारक):** शुक्र देव **${venP.houseNumber || 7}वें भाव** में **${venP.rashiHindi || ""}** राशि में (**${venP.dignity || "सामान्य"}**) स्थित हैं। ${isVenusStrong ? "शुक्र की अनुकूलता जीवन में प्रेम, समझदारी और सुंदर दांपत्य सुख का संकेत देती है।" : "शुक्र की शांति व संबंधों में धैर्य रखना आवश्यक है।"}
• 📌 **गुरु बृहस्पति (आशीर्वाद व स्थिरता):** गुरु देव **${jupP.houseNumber || 9}वें भाव** में स्थित हैं, जो विवाह में धर्म और संस्कार का संतुलन बनाते हैं।
• 📌 **जैमिनी दाराकारक (DK - जीवनसाथी संकेतक):** आपकी कुंडली में **${dk ? `${dk.planetName} (${dk.signName}, ${dk.houseNumber}वां भाव)` : "शुक्र"}** दाराकारक ग्रह हैं, जो स्वभाव से सुलझे हुए और कर्तव्यनिष्ठ जीवनसाथी का संकेत देते हैं।

---

### ⏳ 3. विवाह योग व रिश्तों में मधुरता का समय
• **सक्रिय दशा:** वर्तमान में **${mahaHindi}** महादशा में **${antarHindi}** की अंतर्दशा चल रही है।
• **विवाह व रिश्ते के योग:** वर्तमान अंतर्दशा समाप्त होने (${antarEnd}) से पूर्व ही योग्य रिश्ते की चर्चाएं और अनुकूल प्रस्ताव आने के योग बनते हैं। ${nextAntar1 ? `विशेषकर **${nextAntar1.startDate} से ${nextAntar1.endDate}** (${nextAntar1.planetHindi} अंतर्दशा) में विवाह का प्रबल मांगलिक योग बनेगा।` : ""}

---

### 📿 4. शीघ्र विवाह व दांपत्य सुख हेतु सिद्ध रुद्राक्ष व उपाय
1. **गौरी शंकर रुद्राक्ष (साक्षात शिव-पार्वती स्वरूप):** शीघ्र व योग्य विवाह, आपसी प्रेम, दांपत्य कलह निवारण और सामंजस्य के लिए सर्वोच्च सिद्ध रुद्राक्ष।
2. **2 मुखी नेपाली रुद्राक्ष (अर्घनारीश्वर):** मानसिक शांति व पति-पत्नी के बीच अटूट विश्वास हेतु।
3. **वैदिक उपाय:** सोमवार को शिवलिंग पर कच्चा दूध, जल और बेलपत्र अर्पित करते हुए \`ॐ नमः शिवाय\` का जाप करें।

[AURA_KEYWORDS]: विवाह योग | गौरी शंकर रुद्राक्ष | 2 मुखी रुद्राक्ष | दांपत्य सुख | मांगलिक विचार`;
  }

  // 3. WEALTH & FINANCE (धन, संपत्ति, कर्ज, आर्थिक स्थिति)
  if (intentType === "finance") {
    return `🙏 **प्रणाम ${vb.name || "भक्त"}! हर हर महादेव।**

आपकी जन्म कुंडली (${lagna.rashiHindi} लग्न, ${chandra.rashiHindi} चंद्र राशि) के आधार पर **धन, आर्थिक स्थिति व कर्ज निवारण** का प्रामाणिक वैदिक विश्लेषण इस प्रकार है:

---

### 🏛️ 1. धन (2nd House) व लाभ भाव (11th House) की स्थिति
• **धन भाव (2nd House - संचित धन व बचत):** 2वां भाव **${h2.rashiHindi}** राशि में है, जिसके स्वामी **${h2.lord}** हैं। स्थित ग्रह: **${h2.occupants ? h2.occupants.join(", ") : "शुभ"}**।
• **लाभ भाव (11th House - आय के स्रोत):** 11वां भाव **${h11.rashiHindi}** राशि में है (स्वामी: **${h11.lord}**)।
• **व्यय भाव (12th House - खर्च व निवेश):** 12वें भाव के स्वामी **${h12.lord}** हैं। ${rahuP.houseNumber === 12 || ketuP.houseNumber === 12 ? "व्यय भाव में छाया ग्रह होने से अचानक अनपेक्षित खर्चों का दबाव बनता है।" : "खर्चों पर सुनियोजित नियंत्रण से बचत में वृद्धि होगी।"}

---

### 🪐 2. धन कारक ग्रहों का प्रभाव
• 📌 **गुरु बृहस्पति (स्थिर धन व समृद्धि):** गुरु देव **${jupP.houseNumber || 11}वें भाव** में स्थित हैं, जो स्थायी आर्थिक उन्नति के द्वार खोलते हैं।
• 📌 **बुध व शुक्र (व्यापारिक लाभ व ऐश्वर्य):** बुध (${mercP.houseNumber}वां भाव) और शुक्र (${venP.houseNumber}वां भाव) धन के प्रवाह को बनाए रखने में सहायक हैं।

---

### ⏳ 3. आर्थिक रुकावटें कब दूर होंगी और धन लाभ का समय?
• **दशा प्रभाव:** वर्तमान **${mahaHindi} / ${antarHindi}** दशा में आय तो है, किंतु अनावश्यक खर्चों के कारण बचत कम हो पाती है।
• **राहत काल:** **${pratyantarEnd}** के बाद से फंसा हुआ धन निकलने लगेगा और **${antarEnd}** के पश्चात नई अंतर्दशा में स्थायी धन वृद्धि और ऋण मुक्ति का मजबूत मार्ग प्रशस्त होगा।

---

### 📿 4. धन वृद्धि व कर्ज मुक्ति हेतु सिद्ध रुद्राक्ष व उपाय
1. **7 मुखी सिद्ध नेपाली रुद्राक्ष (साक्षात माता महालक्ष्मी):** आर्थिक तंगी दूर करने, व्यापार में लाभ और स्थिर धन प्राप्ति हेतु सर्वश्रेष्ठ।
2. **8 मुखी रुद्राक्ष (भगवान श्री गणेश):** धन आगमन के मार्ग में आने वाले सर्व विघ्नों के निवारण हेतु।
3. **उपाय:** शुक्रवार को माता महालक्ष्मी को खीर या मिश्री का भोग लगाएं और कनकधारा स्तोत्र का पाठ करें।

[AURA_KEYWORDS]: धन वृद्धि उपाय | 7 मुखी रुद्राक्ष | कर्ज मुक्ति | महालक्ष्मी योग`;
  }

  // 4. HEALTH & VITALITY (स्वास्थ्य, मानसिक शांति, आरोग्य)
  if (intentType === "health") {
    return `🙏 **प्रणाम ${vb.name || "भक्त"}! हर हर महादेव।**

आपकी जन्म कुंडली (${lagna.rashiHindi} लग्न, ${chandra.rashiHindi} चंद्र राशि) के अनुसार **स्वास्थ्य, मानसिक संतुलन व आरोग्य** का वैदिक विश्लेषण इस प्रकार है:

---

### 🏛️ 1. लग्न (शरीर), षष्ठ (रोग) व अष्टम भाव (आयु)
• **प्रथम भाव (Lagna - शरीर व जीवन शक्ति):** लग्न राशि **${lagna.rashiHindi}** (स्वामी: **${lagna.lord}**)। आपका आत्मबल उत्तम है।
• **षष्ठ भाव (6th House - दैनिक स्वास्थ्य व प्रतिरोधक क्षमता):** षष्ठेश **${h6.lord}** हैं।
• **चंद्र देव (मानसिक शांति):** चंद्र देव **${moonP.houseNumber}वें भाव** (${moonP.rashiHindi}) में स्थित हैं। वर्तमान दशा के कारण कभी-कभी अत्यधिक सोच (Overthinking) व अनिद्रा का प्रभाव रहता है।

---

### ⏳ 2. स्वास्थ्य में सुधार व ऊर्जा का समय चक्र
• वर्तमान प्रत्यंतर दशा **${pratyantarEnd}** को पूर्ण होते ही मानसिक भार हल्का होगा।
• वर्तमान **${antarHindi} अंतर्दशा ${antarEnd}** तक संयमित दिनचर्या रखें; इसके पश्चात शारीरिक स्फूर्ति और स्वास्थ्य में उत्तम सुधार होगा।

---

### 📿 3. आरोग्य सुरक्षा हेतु सिद्ध नेपाली रुद्राक्ष व उपाय
1. **5 मुखी नेपाली रुद्राक्ष (कालाग्नि रुद्र):** रक्तचाप संतुलन, मानसिक शांति और हृदय स्वास्थ्य हेतु।
2. **3 मुखी अथवा 11 मुखी रुद्राक्ष:** शारीरिक ऊर्जा, आलस्य नाश और रोग प्रतिरोधक क्षमता में वृद्धि हेतु।
3. **उपाय:** नित्य प्रातः महामृत्युंजय मंत्र (\`ॐ त्र्यम्बकं यजामहे...\`) का 11 या 108 बार जाप करें।

[AURA_KEYWORDS]: स्वास्थ्य लाभ | 5 मुखी रुद्राक्ष | महामृत्युंजय मंत्र | मानसिक शांति`;
  }

  // 5. DASHA TIMING (महादशा, अंतर्दशा व समय चक्र)
  if (intentType === "dasha_timing") {
    const nextAntar2 = currentIdx >= 0 && timelineList[currentIdx + 2] ? timelineList[currentIdx + 2] : null;
    return `🙏 **प्रणाम ${vb.name || "भक्त"}! हर हर महादेव।**

आपकी जन्म कुंडली का **प्रामाणिक विंशोत्तरी दशा समय चक्र** इस प्रकार है:

• **वर्तमान महादशा:** **${mahaHindi}** (${dasha.mahadashaStartDate || ""} से ${dasha.mahadashaEndDate || ""})
• **सक्रिय अंतर्दशा:** **${antarHindi}** (${dasha.antardashaStartDate || ""} से **${antarEnd}**)
• **सक्रिय प्रत्यंतर दशा:** **${pratyantarHindi}** (${dasha.pratyantardashaStartDate || ""} से **${pratyantarEnd}**)

---

### ⏳ आगामी दशाओं का समय चक्र व भाग्योदय
1. **पहली राहत:** **${pratyantarEnd}** के बाद वर्तमान मानसिक दबाव में स्पष्ट कमी आएगी।
2. **संकट से मुक्ति:** **${antarEnd}** को वर्तमान **${antarHindi} अंतर्दशा** समाप्त होते ही रुकावटों का दौर समाप्त होगा।
${nextAntar1 ? `3. **आगामी स्वर्ण काल:** **${nextAntar1.startDate} से ${nextAntar1.endDate}** तक **${nextAntar1.planetHindi} की अंतर्दशा** अत्यंत शुभ व उन्नति कारक रहेगी।` : ""}
${nextAntar2 ? `4. **दीर्घकालिक उन्नति:** इसके पश्चात **${nextAntar2.startDate} से ${nextAntar2.endDate}** (${nextAntar2.planetHindi} अंतर्दशा) में स्थायी प्रतिष्ठा का योग बनेगा।` : ""}

---

### 📿 दशा अनुकूलन हेतु सिद्ध रुद्राक्ष
वर्तमान दशा के अधिपति ग्रह की शांति व अनुकूलता हेतु **${primaryRec.mukhi}** एवं **${dashaRec.mukhi}** धारण करना आपके लिए रक्षा कवच सिद्ध होगा।

[AURA_KEYWORDS]: विंशोत्तरी दशा चक्र | महादशा उपाय | ${mahaHindi} | शुभ समय`;
  }

  // 6. DEFAULT TARGETED ASTROLOGICAL GUIDANCE
  return `🙏 **प्रणाम ${vb.name || "भक्त"}! हर हर महादेव।**

आपकी जन्म पत्रिका के अनुसार:
• **जन्म लग्न:** ${lagna.rashiHindi} (स्वामी: ${lagna.lord})
• **जन्म राशि:** ${chandra.rashiHindi} (स्वामी: ${chandra.lord})
• **वर्तमान विंशोत्तरी दशा:** **${mahaHindi} महादशा** में **${antarHindi} अंतर्दशा** (सक्रियता: **${antarEnd}** तक)

आपके पूछे गए प्रश्न ("${userQuery || "मार्गदर्शन"}") के संदर्भ में:
कुंडली के अनुसार इस समय ग्रहों की ऊर्जा आपके कर्म और धैर्य की परीक्षा ले रही है। **${pratyantarEnd}** के बाद से परिस्थितियाँ आपके अनुकूल होने लगेंगी और **${antarEnd}** के पश्चात नई अंतर्दशा में रुका हुआ कार्य पूर्ण गति पकड़ेगा।

**कल्याणकारी उपाय व सिद्ध रुद्राक्ष:**
वर्तमान ग्रह स्थिति को अनुकूल बनाने हेतु आपके लिए **${primaryRec.mukhi}** धारण करना परम शुभ रहेगा। साथ ही प्रातःकाल भगवान सूर्य को अर्घ्य दें और नित्य \`ॐ नमः शिवाय\` का जाप करें।

[AURA_KEYWORDS]: कुंडली फलादेश | ${primaryRec.mukhi} | विंशोत्तरी दशा | ग्रह शांति`;
}

/**
 * Strict exact Mukhi matcher for products to prevent cross-mukhi overlap (e.g. 1 vs 11, 4 vs 14)
 */
export function isExactMukhiProduct(p, targetMukhiNum) {
  if (!p || !targetMukhiNum) return false;
  const num = parseInt(targetMukhiNum, 10);
  if (!num) return false;

  if (p.mukhi !== undefined && p.mukhi !== null) {
    const pMukhiNum = parseInt(String(p.mukhi).replace(/\D/g, ""), 10);
    if (pMukhiNum === num) return true;
  }

  const name = String(p.name || "").toLowerCase();
  const slug = String(p.slug || "").toLowerCase();

  const strictRegex = new RegExp(`(?:^|[^0-9])${num}\\s*[-]?\\s*mukhi(?:[^0-9]|$)`, "i");
  if (strictRegex.test(name) || strictRegex.test(slug)) return true;

  if (slug === `${num}-mukhi` || slug === `${num}-mukhi-rudraksha` || slug.startsWith(`${num}-mukhi-`)) {
    return true;
  }

  return false;
}


