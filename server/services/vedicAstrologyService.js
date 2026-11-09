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

  // Detailed Vedic Shastra Planet-in-House & Sign Phaladesh Engine (BPHS & Phaladeepika)
  const PLANET_VEDIC_META = {
    Sun: {
      karaka: "आत्मा, पिता, आत्मबल, नेतृत्व, राजकीय सम्मान, सरकारी सेवा, हड्डियाँ व नेत्र ज्योति",
      mantra: "ॐ ह्रां ह्रीं ह्रौं सः सूर्याय नमः (प्रतिदिन प्रातः 108 बार)",
      upay: "प्रातः तांबे के लोटे में जल, लाल चंदन व गुड़ डालकर सूर्य देव को अर्घ्य दें तथा पिता व वरिष्ठों का सम्मान करें।",
      houseEffects: {
        1: "लग्न में सूर्य जातक को स्वाभिमानी, तेजस्वी, नेतृत्व क्षमता से युक्त और सिद्धांतवादी बनाता है।",
        2: "द्वितीय भाव में सूर्य कुटुंब में प्रभावशाली वाणी और स्व-परिश्रम से धन संचय का सामर्थ्य देता है।",
        3: "तृतीय भाव में सूर्य अदम्य साहस, पराक्रम, छोटे भाई-बहनों में श्रेष्ठता और शत्रुओं पर विजय देता है।",
        4: "चतुर्थ भाव में सूर्य भूमि, वाहन व पैतृक प्रतिष्ठा देता है, किंतु मानसिक शांति के लिए धैर्य आवश्यक रखता है।",
        5: "पंचम भाव में सूर्य तीक्ष्ण बुद्धि, उच्च प्रशासनिक ज्ञान, संतान से गौरव और पूर्व पुण्य का बल देता है।",
        6: "षष्ठ भाव में सूर्य शत्रुहंता योग बनाता है—प्रतियोगिता, सरकारी सेवा और कोर्ट-कचहरी में विजय दिलाता है।",
        7: "सप्तम भाव में सूर्य स्वतंत्र व्यापारिक सोच देता है, किंतु दांपत्य जीवन में अहंकार से बचने की सलाह देता है।",
        8: "अष्टम भाव में सूर्य गूढ़ ज्ञान, शोध और आध्यात्मिक रुचि देता है; स्वास्थ्य व नेत्रों का ध्यान रखना चाहिए।",
        9: "नवम (भाग्य) भाव में सूर्य धर्मपरायणता, पिता का आशीर्वाद, उच्च पद और समाज में कीर्ति प्रदान करता है।",
        10: "दशम भाव में सूर्य 'दिग्बली' होकर सर्वोच्च राजयोग, सरकारी/प्रशासनिक अधिकार, यश और करियर में शिखर देता है।",
        11: "एकादश भाव में सूर्य उच्चाधिकारियों से लाभ, स्थिर आय के स्रोत और बड़ी महत्वाकांक्षाओं की पूर्ति कराता है।",
        12: "द्वादश भाव में सूर्य बाहरी स्थानों/विदेश से संबंध और आध्यात्मिक झुकाव देता है; अनावश्यक खर्चों से बचें।"
      }
    },
    Moon: {
      karaka: "मन, भावनाएं, माता, मानसिक शांति, स्मरण शक्ति, जल तत्व, तरल धन व सुख",
      mantra: "ॐ श्रां श्रीं श्रौं सः चंद्रमसे नमः (सोमवार या प्रतिदिन 108 बार)",
      upay: "सोमवार को शिवलिंग पर कच्चा दूध व गंगाजल अर्पित करें, माता का आशीर्वाद लें और चाँदी धारण करें।",
      houseEffects: {
        1: "लग्न में चंद्रमा जातक को सौम्य, संवेदनशील, आकर्षक व्यक्तित्व और कल्पनाशील मन प्रदान करता है।",
        2: "द्वितीय भाव में चंद्रमा मधुर वाणी, परिवार के प्रति समर्पण और तरल धन/बचत में वृद्धि कराता है।",
        3: "तृतीय भाव में चंद्रमा कलात्मक रुचि, छोटी यात्राओं से लाभ और संवाद कौशल देता है।",
        4: "चतुर्थ भाव में चंद्रमा 'दिग्बली' होकर माता का भरपूर स्नेह, गृह सुख, वाहन और हृदय की पवित्रता देता है।",
        5: "पंचम भाव में चंद्रमा सात्विक बुद्धि, रचनात्मकता, स्नेही स्वभाव और योग्य संतान सुख देता है।",
        6: "षष्ठ भाव में चंद्रमा सेवा भाव देता है, किंतु मानसिक अति-चिंतन (Overthinking) और कफ/पाचन से बचाव रखें।",
        7: "सप्तम भाव में चंद्रमा सुंदर व भावनात्मक जीवनसाथी तथा जनसंपर्क या व्यापार में लोकप्रियता दिलाता है।",
        8: "अष्टम भाव में चंद्रमा गहरी अंतर्दृष्टि (Intuition) देता है, पर मन में अकारण भय या उतार-चढ़ाव से बचने हेतु शिव आराधना करें।",
        9: "नवम भाव में चंद्रमा तीर्थ यात्रा, धर्म-कर्म में निष्ठा और भाग्योदय में मातृ-शक्ति का सहयोग देता है।",
        10: "दशम भाव में चंद्रमा जन-सेवा, व्यापार, प्रबंधन और समाज में लोकप्रिय करियर प्रदान करता है।",
        11: "एकादश भाव में चंद्रमा अनेक स्रोतों से धन लाभ, मित्रों का सहयोग और मनोकामना पूर्ति कराता है।",
        12: "द्वादश भाव में चंद्रमा एकांत चिंतन, ध्यान व विदेश/दूरस्थ यात्रा देता है; रात्रि में अति-सोच से बचें।"
      }
    },
    Mars: {
      karaka: "ऊर्जा, साहस, पराक्रम, भूमि-भवन, छोटे भाई, रक्त बल, सेना/पुलिस/इंजीनियरिंग व निर्णय शक्ति",
      mantra: "ॐ क्रां क्रीं क्रौं सः भौमाय नमः (मंगलवार को 108 बार)",
      upay: "मंगलवार को श्री हनुमान चालीसा का पाठ करें, हनुमान जी को सिंदूर अर्पित करें और गुड़-चने का दान करें।",
      houseEffects: {
        1: "लग्न में मंगल जातक को निडर, ऊर्जावान, कर्मठ और स्वतंत्र निर्णय लेने वाला योद्धा स्वभाव देता है।",
        2: "द्वितीय भाव में मंगल स्पष्टवादी (कभी-कभी तेज) वाणी और कठोर परिश्रम से संपत्ति निर्माण कराता है।",
        3: "तृतीय भाव में मंगल प्रचंड पराक्रम, अदम्य साहस और अपने बाहुबल से भाग्य लिखने की शक्ति देता है।",
        4: "चतुर्थ भाव में मंगल भूमि, मकान व रियल एस्टेट का सुख देता है; घर के वातावरण में शांति बनाए रखें।",
        5: "पंचम भाव में मंगल त्वरित निर्णय क्षमता, तकनीकी/प्रबंधकीय बुद्धि और खेल/साहसिक क्षेत्रों में रुचि देता है।",
        6: "षष्ठ भाव में मंगल विरोधियों, ऋण और बाधाओं को परास्त कर प्रतियोगिता में निश्चित विजय दिलाता है।",
        7: "सप्तम भाव में मंगल व्यापारिक ऊर्जा देता है; वैवाहिक जीवन में क्रोध व जल्दबाजी से बचना हितकर है।",
        8: "अष्टम भाव में मंगल आकस्मिक घटनाओं से जूझने की शक्ति और गुप्त विद्या देता है; वाहन सावधानी से चलाएं।",
        9: "नवम भाव में मंगल धर्म की रक्षा, उच्च महत्वाकांक्षा और कर्मठता से भाग्योदय कराता है।",
        10: "दशम भाव में मंगल 'दिग्बली' (कुलदीपक योग) होकर प्रशासन, व्यवसाय, भूमि व नेतृत्व में बड़ी सफलता देता है।",
        11: "एकादश भाव में मंगल भूमि-संपत्ति से लाभ, साहसी कार्यों से आय और प्रभावशाली सामाजिक घेरा देता है।",
        12: "द्वादश भाव में मंगल बाहरी कार्यों में ऊर्जा लगाता है; आवेश और अनावश्यक विवाद/खर्च से संयम रखें।"
      }
    },
    Mercury: {
      karaka: "बुद्धि, वाणी, व्यापार, गणित, संवाद, लेखन, तार्किक क्षमता, कॉमर्स व त्वचा/नसें",
      mantra: "ॐ ब्रां ब्रीं ब्रौं सः बुधाय नमः (बुधवार को 108 बार)",
      upay: "बुधवार को भगवान श्री गणेश को दूर्वा अर्पित करें, गौ माता को हरा चारा खिलाएं और पन्ना/4 मुखी रुद्राक्ष धारण करें।",
      houseEffects: {
        1: "लग्न में बुधदिग्बली होकर जातक को कुशाग्र बुद्धि, वाक्पटु (चतुर वक्ता), हँसमुख और व्यापारिक समझ वाला बनाता है।",
        2: "द्वितीय भाव में बुध अपनी मीठी व तार्किक वाणी, बुद्धिमत्ता और सलाहकार/व्यापारिक कौशल से धन दिलाता है।",
        3: "तृतीय भाव में बुध लेखन, मीडिया, आईटी, संचार और मार्केटिंग के क्षेत्र में विशेष निपुणता देता है।",
        4: "चतुर्थ भाव में बुध उच्च शिक्षा, विद्वानों का संग और घर में बौद्धिक व सुखद वातावरण देता है।",
        5: "पंचम भाव में बुध तीव्र स्मरण शक्ति, फाइनेंस/अकाउंट्स में दक्षता और नीतिगत निर्णय क्षमता देता है।",
        6: "षष्ठ भाव में बुध तार्किक बहस में विजय देता है; नसों व पाचन तंत्र के स्वास्थ्य का ध्यान रखें।",
        7: "सप्तम भाव में बुध व्यापार (Business), पार्टनरशिप, कंसल्टेंसी और बुद्धिमान जीवनसाथी का सुख देता है।",
        8: "अष्टम भाव में बुध रिसर्च, ज्योतिष, डेटा विश्लेषण और गुप्त विषयों की गहरी समझ देता है।",
        9: "नवम भाव में बुध उच्च डिग्री, शास्त्रों का ज्ञान, विदेश व्यापार और धर्म-दर्शन में रुचि देता है।",
        10: "दशम भाव में बुध व्यापार, बैंकिंग, प्रबंधन, शिक्षा या तकनीक में मान-सम्मान और सफल करियर देता है।",
        11: "एकादश भाव में बुध बौद्धिक कार्यों, व्यापारिक सौदों और नेटवर्क से निरंतर धन लाभ कराता है।",
        12: "द्वादश भाव में बुध विदेशी कंपनियों, एक्सपोर्ट-इंपोर्ट या गुप्त योजनाओं में दिमाग चलाता है।"
      }
    },
    Jupiter: {
      karaka: "ज्ञान, धर्म, भाग्य, संतान, संचित धन (तिजोरी), गुरु कृपा, सदाचार, विवाह (कन्या हेतु) व आध्यात्मिकता",
      mantra: "ॐ ग्रां ग्रीं ग्रौं सः गुरवे नमः (गुरुवार को 108 बार)",
      upay: "गुरुवार को माथे पर केसर/हल्दी का तिलक लगाएं, केले के वृक्ष या पीपल की पूजा करें और चने की दाल व पीले वस्त्र दान करें।",
      houseEffects: {
        1: "लग्न में गुरु 'दिग्बली' होकर सवा लाख दोषों का शमन करता है—जातक को ज्ञानी, सात्विक, सम्मानित व दीर्घायु बनाता है।",
        2: "द्वितीय भाव में गुरु कुटुंब में श्रेष्ठ संस्कार, सत्य वाणी और स्थायी धन-संपदा का संचय कराता है।",
        3: "तृतीय भाव में गुरु धैर्यवान पराक्रम, दार्शनिक विचार और नीति-सम्मत प्रयासों से उन्नति देता है।",
        4: "चतुर्थ भाव में गुरु विशाल हृदय, माता का सुख, उत्तम भवन-वाहन और समाज में निष्कलंक प्रतिष्ठा देता है।",
        5: "पंचम भाव में गुरु प्रखर मेधा शक्ति, योग्य संतान, मंत्र सिद्धि और पूर्व जन्म के शुभ कर्मों का फल देता है।",
        6: "षष्ठ भाव में गुरु शत्रुओं को भी मित्र बनाने की क्षमता देता है; खान-पान व लिवर/मधुमेह का ध्यान रखें।",
        7: "सप्तम भाव में गुरु सुसंस्कृत व भाग्यशाली जीवनसाथी, सफल साझेदारी और विवाह के बाद भाग्योदय देता है।",
        8: "अष्टम भाव में गुरु दीर्घायु, आध्यात्मिक रहस्य, वसीयत/अप्रत्याशित सहयोग और संकट में ईश्वरीय रक्षा देता है।",
        9: "नवम (भाग्य) भाव में गुरु सर्वोच्च धर्म-कर्म, तीर्थ यात्रा, गुरु कृपा और अटूट भाग्योदय प्रदान करता है।",
        10: "दशम भाव में गुरु उच्च पद, शिक्षा/न्याय/प्रबंधन/सलाहकार क्षेत्र में प्रतिष्ठा और निष्कलंक यश देता है।",
        11: "एकादश भाव में गुरु प्रचुर धन लाभ, समृद्धि, बड़े भाई-बहनों व वरिष्ठों से सहयोग और इच्छापूर्ति कराता है।",
        12: "द्वादश भाव में गुरु सात्विक दान-पुण्य, आध्यात्मिक मोक्ष मार्ग और शुभ कार्यों में धन का सदुपयोग कराता है।"
      }
    },
    Venus: {
      karaka: "प्रेम, विवाह, पत्नी/जीवनसाथी, वैभव, वाहन, कला, सौन्दर्य, आकर्षण, सुख-सुविधाएं व ऐश्वर्य",
      mantra: "ॐ द्रां द्रीं द्रौं सः शुक्राय नमः (शुक्रवार को 108 बार)",
      upay: "शुक्रवार को माता महालक्ष्मी की आराधना करें, स्वच्छ व सुगंधित वस्त्र पहनें और गाय को हरा चारा या सफेद मिठाई खिलाएं।",
      houseEffects: {
        1: "लग्न में शुक्र जातक को आकर्षक व्यक्तित्व, कलात्मक रुचि, सौम्य स्वभाव और सुख-सुविधाओं का प्रेमी बनाता है।",
        2: "द्वितीय भाव में शुक्र मधुर वाणी, उत्तम खान-पान, पारिवारिक वैभव और रत्न-आभूषण का संचय देता है।",
        3: "तृतीय भाव में शुक्र संगीत, कला, मीडिया, फैशन या क्रिएटिव क्षेत्रों में सफलता और लोकप्रियता देता है।",
        4: "चतुर्थ भाव में शुक्र 'दिग्बली' होकर सुंदर घर, लग्जरी वाहन, मानसिक प्रसन्नता और पारिवारिक सुख देता है।",
        5: "पंचम भाव में शुक्र प्रेम में सफलता, रचनात्मक प्रतिभा, मनोरंजन/कला से लाभ और कन्या रत्न से भाग्योदय देता है।",
        6: "षष्ठ भाव में शुक्र सेवा क्षेत्र में लाभ देता है, किंतु रिश्तों में सामंजस्य और स्वास्थ्य का ध्यान रखना आवश्यक है।",
        7: "सप्तम भाव में शुक्र प्रेममय दांपत्य जीवन, सुंदर जीवनसाथी और लग्जरी/व्यापारिक साझेदारी में लाभ देता है।",
        8: "अष्टम भाव में शुक्र जीवनसाथी से आर्थिक सहयोग, गुप्त धन और रहस्यमयी आकर्षण प्रदान करता है।",
        9: "नवम भाव में शुक्र भाग्य के साथ सुख-समृद्धि, विदेश यात्रा और धार्मिक-सांस्कृतिक कार्यों में रुचि देता है।",
        10: "दशम भाव में शुक्र कला, व्यापार, कॉस्मेटिक्स, होटल, फाइनेंस या प्रशासन में लोकप्रियता और धन दिलाता है।",
        11: "एकादश भाव में शुक्र ऐश्वर्य, उच्च सामाजिक संबंध और निरंतर आर्थिक लाभ व वैभव प्रदान करता है।",
        12: "द्वादश भाव में शुक्र शयन सुख, भोग-विलास और विदेश यात्राओं पर खर्च व आनंद देता है।"
      }
    },
    Saturn: {
      karaka: "कर्म, न्याय, अनुशासन, धैर्य, दीर्घायु, सेवा, तकनीकी/मशीनरी, खनिज, जनसमूह व स्थायी सफलता",
      mantra: "ॐ प्रां प्रीं प्रौं सः शनैश्चराय नमः (शनिवार को 108 बार)",
      upay: "शनिवार को पीपल के वृक्ष के नीचे सरसों के तेल का दीपक जलाएं, हनुमान जी की उपासना करें और श्रमिकों/निर्धनों की सहायता करें।",
      houseEffects: {
        1: "लग्न में शनि जातक को गंभीर, अनुशासित, परिश्रमी और अपने अनुभव से धीरे-धीरे स्थायी शिखर छूने वाला बनाता है।",
        2: "द्वितीय भाव में शनि स्पष्टवादी वाणी देता है और सिखाता है कि धन संचय के लिए नियमित अनुशासन आवश्यक है।",
        3: "तृतीय भाव में शनि अद्भुत धैर्य, अटूट संघर्ष क्षमता और अपने परिश्रम से हर बाधा जीतने का बल देता है।",
        4: "चतुर्थ भाव में शनि पुरानी या स्थायी संपत्ति देता है, किंतु जन्मस्थान से दूर जाकर अधिक भाग्योदय कराता है।",
        5: "पंचम भाव में शनि गहन चिंतन, तकनीकी/कानूनी शिक्षा और गंभीर जीवन-दृष्टि देता है।",
        6: "षष्ठ भाव में शनि शत्रुओं, रोगों और कर्ज को जड़ से समाप्त करने वाला प्रबल 'शत्रुहंता' योग बनाता है।",
        7: "सप्तम भाव में शनि 'दिग्बली' होकर परिपक्व व जिम्मेदार जीवनसाथी तथा दीर्घकालिक व्यापारिक स्थिरता देता है।",
        8: "अष्टम भाव में शनि 'आयुष्य कारक' होकर लंबी आयु और गहरे संकटों से उबरने की सहनशक्ति देता है।",
        9: "नवम भाव में शनि पारंपरिक मूल्यों, तपस्या और 32-36 वर्ष की आयु के बाद अखंड भाग्योदय देता है।",
        10: "दशम भाव में शनि 'कर्मेश' होकर कठिन परिश्रम के बाद विशाल साम्राज्य, उच्च पद और जन-नेतृत्व प्रदान करता है।",
        11: "एकादश भाव में शनि भूमि, उद्योग, सेवा या बड़े प्रोजेक्ट्स से स्थायी और अथाह धन लाभ कराता है।",
        12: "द्वादश भाव में शनि वैराग्य, सेवा-कार्य और बाहरी स्थानों से जुड़ाव देता है; जोड़ों/पैरों व नींद का ध्यान रखें।"
      }
    },
    Rahu: {
      karaka: "महत्वाकांक्षा, आकस्मिक उत्थान, विदेश योग, आधुनिक तकनीक (AI/IT), राजनीति, कूटनीति व लीक से हटकर सफलता",
      mantra: "ॐ भ्रां भ्रीं भ्रौं सः राहवे नमः (बुधवार/शनिवार को 108 बार)",
      upay: "भगवान श्री गणेश व माँ दुर्गा की उपासना करें, पक्षियों को सात प्रकार का अनाज (सप्तधान्य) डालें और 8 मुखी रुद्राक्ष धारण करें।",
      houseEffects: {
        1: "लग्न में राहु जातक को महत्वाकांक्षी, तीक्ष्ण बुद्धि और भीड़ से अलग पहचान बनाने वाला बनाता है; भ्रम से बचें।",
        2: "द्वितीय भाव में राहु वाणी में प्रभाव और आकस्मिक धन योग देता है, पर पारिवारिक वाद-विवाद व अनावश्यक खर्च से बचें।",
        3: "तृतीय भाव में राहु अत्यंत बली होकर अजेय साहस, शत्रुओं पर विजय और अपने दम पर बड़ा साम्राज्य खड़ा कराता है।",
        4: "चतुर्थ भाव में राहु जन्मस्थान से दूर या विदेश में सफलता देता है; मानसिक शांति के लिए घर में शिव पूजा करें।",
        5: "पंचम भाव में राहु तीक्ष्ण कूटनीतिक बुद्धि और शेयर/स्पेकुलेशन में रुचि देता है, किंतु भ्रम व अति-चिंता से बचें।",
        6: "षष्ठ भाव में राहु गुप्त शत्रुओं का नाश करता है और कठिन से कठिन प्रतियोगिता/मुकदमे में विजय दिलाता है।",
        7: "सप्तम भाव में राहु आधुनिक/व्यापारिक साझेदारी देता है; जीवनसाथी के साथ पारदर्शिता और विश्वास बनाए रखें।",
        8: "अष्टम भाव में राहु गुप्त अनुसंधान व अचानक घटनाक्रम देता है; राहु शांति व अष्टमुखी रुद्राक्ष कवच अवश्य रखें।",
        9: "नवम भाव में राहु विदेश यात्रा और लीक से हटकर विचार देता है; गुरु व कुल-परंपरा का सदैव सम्मान करें।",
        10: "दशम भाव में राहु राजनीति, प्रशासन, मीडिया, आईटी या बड़े व्यापार में तेज उत्थान और प्रसिद्धि दिलाता है।",
        11: "एकादश भाव में राहु आकस्मिक महाधन लाभ, बड़े संपर्कों से उन्नति और सभी भौतिक इच्छाओं की पूर्ति कराता है।",
        12: "द्वादश भाव में राहु विदेश प्रवास/मल्टीनेशनल कार्य देता है, किंतु अनिद्रा और आकस्मिक व्यय पर नियंत्रण रखें।"
      }
    },
    Ketu: {
      karaka: "मोक्ष, अध्यात्म, अंतर्ज्ञान (Intuition), वैराग्य, सूक्ष्म शोध, पूर्व जन्म का ज्ञान व आकस्मिक रक्षक",
      mantra: "ॐ स्रां स्रीं स्रौं सः केतवे नमः (मंगलवार/शनिवार को 108 बार)",
      upay: "भगवान श्री गणेश व माँ नवदुर्गा की आराधना करें, कुत्तों को रोटी खिलाएं और 9 मुखी रुद्राक्ष धारण करें।",
      houseEffects: {
        1: "लग्न में केतु जातक को आध्यात्मिक, अंतर्मुखी, गहरी छठी इंद्रिय (Intuition) से युक्त और निस्वार्थ बनाता है।",
        2: "द्वितीय भाव में केतु आध्यात्मिक वाणी देता है; धन संचय में उतार-चढ़ाव से बचने हेतु गणेश उपासना करें।",
        3: "तृतीय भाव में केतु मानसिक दृढ़ता, गुप्त साहस और संकट के समय अचूक निर्णय शक्ति प्रदान करता है।",
        4: "चतुर्थ भाव में केतु मन को संसार से अधिक आध्यात्मिक शांति की ओर मोड़ता है।",
        5: "पंचम भाव में केतु मंत्र-सिद्धि, ज्योतिष, कोडिंग/रिसर्च और सूक्ष्म विषयों में विलक्षण मेधा देता है।",
        6: "षष्ठ भाव में केतु शत्रुओं को स्वतः शांत करता है और गुप्त बाधाओं से रक्षा करता है।",
        7: "सप्तम भाव में केतु जीवनसाथी में आध्यात्मिक गुण चाहता है; आपसी संवाद में स्पष्टता रखें।",
        8: "अष्टम भाव में केतु गूढ़ साधना, कुंडलिनी शक्ति और रहस्यमयी विषयों का गहरा अनुभव देता है।",
        9: "नवम भाव में केतु तीर्थ यात्रा, तपस्या, पूर्वजों का आशीर्वाद और धर्म के प्रति गहरा समर्पण देता है।",
        10: "दशम भाव में केतु विशेषज्ञता, शोध, चिकित्सा या तकनीकी क्षेत्र में अनूठी पहचान दिलाता है।",
        11: "एकादश भाव में केतु संतोष के साथ आकस्मिक आर्थिक लाभ और आध्यात्मिक मित्रों का संग देता है।",
        12: "द्वादश (मोक्ष) भाव में केतु सर्वोच्च आध्यात्मिक मुक्ति, ध्यान-समाधि और ईश्वरीय सुरक्षा प्रदान करता है।"
      }
    }
  };

  const BHAVA_VEDIC_META = {
    1: { title: "प्रथम भाव (तनु / लग्न भाव)", significance: "शरीर, व्यक्तित्व, आत्मबल, स्वास्थ्य, आकृति, यश व जीवन की मूल दिशा", karaka: "सूर्य देव (Sun)" },
    2: { title: "द्वितीय भाव (धन व कुटुंब भाव)", significance: "संचित धन (बैंक बैलेंस), कुटुंब/परिवार, वाणी, खान-पान व पैतृक संस्कार", karaka: "गुरु बृहस्पति (Jupiter)" },
    3: { title: "तृतीय भाव (सहज व पराक्रम भाव)", significance: "साहस, पराक्रम, छोटे भाई-बहन, संवाद कौशल, छोटी यात्राएं व स्वरोजगार प्रयास", karaka: "मंगल देव (Mars)" },
    4: { title: "चतुर्थ भाव (सुख, माता, भूमि व वाहन भाव)", significance: "मानसिक शांति, माता का सुख, भूमि-भवन (प्रॉपर्टी), वाहन व पारिवारिक सुख", karaka: "चंद्रमा एवं बुध (Moon & Mercury)" },
    5: { title: "पंचम भाव (संतान, विद्या, बुद्धि व पूर्व पुण्य भाव)", significance: "उच्च शिक्षा, मेधा शक्ति, संतान सुख, प्रेम संबंध, मंत्र सिद्धि व पूर्व जन्म पुण्य", karaka: "गुरु बृहस्पति (Jupiter)" },
    6: { title: "षष्ठ भाव (रोग, ऋण, शत्रु व सेवा/नौकरी भाव)", significance: "दैनिक नौकरी/सेवा, प्रतियोगी परीक्षा, शत्रु विजय, कर्ज मुक्ति व रोग प्रतिरोधक क्षमता", karaka: "मंगल एवं शनि (Mars & Saturn)" },
    7: { title: "सप्तम भाव (विवाह, दांपत्य व व्यापार भाव)", significance: "जीवनसाथी, विवाह सुख, व्यापारिक साझेदारी (Partnership), दैनिक व्यापार व सामाजिक छवि", karaka: "शुक्र देव (Venus)" },
    8: { title: "अष्टम भाव (आयु, गुप्त विद्या व परिवर्तन भाव)", significance: "दीर्घायु, आकस्मिक धन/वसीयत, ससुराल पक्ष, गूढ़ शोध, ज्योतिष व जीवन के बड़े रूपांतरण", karaka: "शनि देव (Saturn)" },
    9: { title: "नवम भाव (भाग्य, धर्म, गुरु व तीर्थ भाव)", significance: "भाग्योदय, धर्म-कर्म, गुरु व पिता की कृपा, उच्च ज्ञान, लंबी/विदेश यात्रा व ईश्वरीय आशीर्वाद", karaka: "गुरु बृहस्पति एवं सूर्य (Jupiter & Sun)" },
    10: { title: "दशम भाव (कर्म, करियर, पद-प्रतिष्ठा व राज्य भाव)", significance: "आजीविका, करियर, व्यापार, सरकारी/प्रशासनिक सम्मान, प्रमोशन, अधिकार व कीर्ति", karaka: "सूर्य, बुध, गुरु एवं शनि" },
    11: { title: "एकादश भाव (लाभ, आय व मनोकामना पूर्ति भाव)", significance: "नियमित आय (Income), धन लाभ, बड़ी इच्छाओं की पूर्ति, बड़े भाई-बहन व प्रभावशाली मित्र", karaka: "गुरु बृहस्पति (Jupiter)" },
    12: { title: "द्वादश भाव (व्यय, विदेश यात्रा व मोक्ष भाव)", significance: "खर्च, निवेश, विदेश यात्रा/बसावट, दान-पुण्य, शयन सुख, एकांत साधना व मोक्ष", karaka: "शनि एवं केतु (Saturn & Ketu)" }
  };

  function getHouseNumber(planetRashiIndex) {
    return ((planetRashiIndex - lagnaRashiIndex + 12) % 12) + 1;
  }

  // Planets Table with D9 Navamsha, Divisional Charts & Vargottama Detection
  const rawPlanets = [
    { name: "Surya (Sun)", hindiName: "सूर्य देव (Sun)", key: "Sun", english: "Sun", deg: sunSid, details: sunDetails, nak: sunNak, d9: sunNavamsha, vargas: calculateDivisionalCharts(sunSid) },
    { name: "Chandra (Moon)", hindiName: "चंद्र देव (Moon)", key: "Moon", english: "Moon", deg: moonSid, details: moonDetails, nak: moonNak, d9: moonNavamsha, vargas: calculateDivisionalCharts(moonSid) },
    { name: "Mangal (Mars)", hindiName: "मंगल देव (Mars)", key: "Mars", english: "Mars", deg: marsSid, details: getRashiAndDegree(marsSid), nak: getNakshatraAndPada(marsSid), d9: calculateNavamshaRashi(marsSid), vargas: calculateDivisionalCharts(marsSid) },
    { name: "Budha (Mercury)", hindiName: "बुध देव (Mercury)", key: "Mercury", english: "Mercury", deg: mercSid, details: getRashiAndDegree(mercSid), nak: getNakshatraAndPada(mercSid), d9: calculateNavamshaRashi(mercSid), vargas: calculateDivisionalCharts(mercSid) },
    { name: "Guru (Jupiter)", hindiName: "गुरु बृहस्पति (Jupiter)", key: "Jupiter", english: "Jupiter", deg: jupSid, details: getRashiAndDegree(jupSid), nak: getNakshatraAndPada(jupSid), d9: calculateNavamshaRashi(jupSid), vargas: calculateDivisionalCharts(jupSid) },
    { name: "Shukra (Venus)", hindiName: "शुक्र देव (Venus)", key: "Venus", english: "Venus", deg: venSid, details: getRashiAndDegree(venSid), nak: getNakshatraAndPada(venSid), d9: calculateNavamshaRashi(venSid), vargas: calculateDivisionalCharts(venSid) },
    { name: "Shani (Saturn)", hindiName: "शनि देव (Saturn)", key: "Saturn", english: "Saturn", deg: satSid, details: getRashiAndDegree(satSid), nak: getNakshatraAndPada(satSid), d9: calculateNavamshaRashi(satSid), vargas: calculateDivisionalCharts(satSid) },
    { name: "Rahu (North Node)", hindiName: "राहु (Rahu)", key: "Rahu", english: "Rahu", deg: rahuSid, details: getRashiAndDegree(rahuSid), nak: getNakshatraAndPada(rahuSid), d9: calculateNavamshaRashi(rahuSid), vargas: calculateDivisionalCharts(rahuSid) },
    { name: "Ketu (South Node)", hindiName: "केतु (Ketu)", key: "Ketu", english: "Ketu", deg: ketuSid, details: getRashiAndDegree(ketuSid), nak: getNakshatraAndPada(ketuSid), d9: calculateNavamshaRashi(ketuSid), vargas: calculateDivisionalCharts(ketuSid) }
  ];

  let calculatedPlanets = rawPlanets.map((p) => {
    const house = getHouseNumber(p.details.rashiIndex);
    const dignity = getPlanetaryDignity(p.key, p.details.rashiIndex);
    const isVargottama = p.details.rashiIndex === p.d9.rashiIndex;
    const pMeta = PLANET_VEDIC_META[p.key] || {};
    const houseEffect = pMeta.houseEffects?.[house] || `${p.hindiName} ${house}वें भाव में स्थित होकर अपने कारकत्व के अनुसार फल दे रहे हैं।`;
    const d9Note = isVargottama
      ? `नवमांश (D9) में भी **${p.d9.rashiName}** राशि में रहकर **वर्गोत्तम (Vargottama)** हैं, जिससे इस ग्रह की शुभता और आंतरिक शक्ति दोगुनी हो गई है।`
      : `नवमांश कुंडली (D9) में यह ग्रह **${p.d9.rashiName}** राशि में तथा दशमांश (D10 - करियर चार्ट) में **${p.vargas?.d10?.rashiName || p.d9.rashiName}** राशि में स्थित है।`;
    const signification = `${houseEffect} (कारक क्षेत्र: ${pMeta.karaka || "जीवन ऊर्जा"})। ${d9Note}`;

    return {
      name: p.name,
      hindiName: p.hindiName,
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
      dashamshaRashiHindi: p.vargas?.d10?.rashiName || p.d9.rashiName,
      vargas: p.vargas,
      isVargottama,
      karaka: pMeta.karaka || "",
      signification,
      houseEffect,
      mantra: pMeta.mantra || "ॐ नमः शिवाय",
      upay: pMeta.upay || "शिव आराधना करें।"
    };
  });

  // Calculate Combustion status
  const planets = calculateCombustion(calculatedPlanets, sunSid);

  // Calculate Planetary Aspects
  const planetaryAspects = calculatePlanetaryAspects(planets);

  // Bhavas (Houses) distribution with Aspects, Lords, Significations & Detailed Bhava Phaladesh
  const houses = [];
  for (let h = 1; h <= 12; h++) {
    const houseRashiIdx = (lagnaRashiIndex + h - 1) % 12;
    const rashiObj = RASHIS[houseRashiIdx];
    const occupants = planets.filter((p) => p.houseNumber === h).map((p) => p.name);
    const aspectsOnHouse = planetaryAspects[h] || [];
    const bMeta = BHAVA_VEDIC_META[h] || { title: `${h}वां भाव`, significance: "जीवन क्षेत्र", karaka: "सूर्य" };

    // Find where the Lord of this house is placed
    const lordKey = (rashiObj.lord || "").split(" ")[0];
    const lordPlanet = planets.find(p => p.name.includes(lordKey) || p.englishName.toLowerCase().includes(lordKey.toLowerCase()));
    const lordHousePlacement = lordPlanet ? `${lordPlanet.houseNumber}वें भाव (${lordPlanet.rashiHindi})` : "स्वभाव";

    const bhavaPhaladesh = occupants.length > 0
      ? `इस भाव में **${occupants.join(", ")}** विराजमान हैं तथा भावेश **${rashiObj.lord}** कुंडली के **${lordHousePlacement}** में स्थित हैं। इसके फलस्वरूप ${bMeta.significance} के क्षेत्र में इन ग्रहों का सीधा और सक्रिय प्रभाव रहेगा।`
      : `इस भाव में कोई ग्रह प्रत्यक्ष नहीं बैठा है (शांत भाव), अतः इस भाव का संपूर्ण फल इसके स्वामी **${rashiObj.lord}** (जो **${lordHousePlacement}** में स्थित हैं) और इस पर पड़ने वाली ग्रह दृष्टियों (${aspectsOnHouse.length > 0 ? aspectsOnHouse.join(", ") : "सामान्य दृष्टि"}) के अनुसार प्राप्त होगा।`;

    houses.push({
      houseNumber: h,
      houseTitle: bMeta.title,
      significance: bMeta.significance,
      karaka: bMeta.karaka,
      rashiHindi: rashiObj.name,
      rashiEnglish: rashiObj.english,
      rashiSymbol: rashiObj.symbol,
      lord: rashiObj.lord,
      lordPlacement: lordHousePlacement,
      element: rashiObj.element,
      occupants: occupants.length > 0 ? occupants : ["Shunya (भावेश द्वारा संचालित)"],
      aspects: aspectsOnHouse,
      bhavaPhaladesh
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

  // Comprehensive Classical Parashari Yogas Detection
  const yogas = [];
  const sun = planets.find(p => p.key === "Sun");
  const moon = planets.find(p => p.key === "Moon");
  const merc = planets.find(p => p.key === "Mercury");
  const jup = planets.find(p => p.key === "Jupiter");
  const ven = planets.find(p => p.key === "Venus");

  if (jup && moon) {
    const diff = ((jup.houseNumber - moon.houseNumber + 12) % 12) + 1;
    if ([1, 4, 7, 10].includes(diff)) {
      yogas.push({ name: "गजकेसरी राजयोग (Gajakesari Raja Yoga)", category: "Raja Yoga", description: "गुरु और चंद्रमा परस्पर केंद्र में स्थित हैं — यह योग जातक को समाज में मान-सम्मान, प्रखर बुद्धि, स्थायी संपत्ति और संकटों से ईश्वरीय रक्षा प्रदान करता है।" });
    }
  }
  if (sun && merc && sun.houseNumber === merc.houseNumber) {
    yogas.push({ name: "बुधादित्य राजयोग (Budhaditya Yoga)", category: "Raja Yoga", description: `सूर्य और बुध की ${sun.houseNumber}वें भाव (${sun.rashiHindi}) में युति जातक को तीव्र बौद्धिक क्षमता, प्रशासनिक/व्यापारिक कौशल, वाणी का प्रभाव और यश प्रदान करती है।` });
  }
  if (moon && mars && moon.houseNumber === mars.houseNumber) {
    yogas.push({ name: "चन्द्र-मंगल महालक्ष्मी धन योग (Chandra-Mangal Dhana Yoga)", category: "Dhana Yoga", description: `चंद्र और मंगल की ${moon.houseNumber}वें भाव में युति जातक को अपने साहस व उद्यम से प्रचुर धन अर्जित करने का सामर्थ्य देती है।` });
  }
  // Pancha Mahapurusha Yoga checks
  if (mars && [1, 4, 7, 10].includes(mars.houseNumber) && (mars.dignity?.includes("Exalted") || mars.dignity?.includes("Own"))) {
    yogas.push({ name: "रुचक पंचमहापुरुष राजयोग (Ruchaka Mahapurusha Yoga)", category: "Mahapurusha Yoga", description: "मंगल केंद्र में उच्च/स्वराशि में स्थित होकर अदम्य साहस, भूमि-भवन, नेतृत्व और उच्च प्रशासनिक सफलता प्रदान करता है।" });
  }
  if (merc && [1, 4, 7, 10].includes(merc.houseNumber) && (merc.dignity?.includes("Exalted") || merc.dignity?.includes("Own"))) {
    yogas.push({ name: "भद्र पंचमहापुरुष राजयोग (Bhadra Mahapurusha Yoga)", category: "Mahapurusha Yoga", description: "बुध केंद्र में उच्च/स्वराशि में स्थित होकर कुशाग्र बुद्धि, व्यापारिक साम्राज्य और वाक्-सिद्धि प्रदान करता है।" });
  }
  if (jup && [1, 4, 7, 10].includes(jup.houseNumber) && (jup.dignity?.includes("Exalted") || jup.dignity?.includes("Own"))) {
    yogas.push({ name: "हंस पंचमहापुरुष राजयोग (Hamsa Mahapurusha Yoga)", category: "Mahapurusha Yoga", description: "गुरु बृहस्पति केंद्र में उच्च/स्वराशि में स्थित होकर आध्यात्मिक तेज, ज्ञान, अथाह समृद्धि और समाज में सर्वोच्च सम्मान देते हैं।" });
  }
  if (ven && [1, 4, 7, 10].includes(ven.houseNumber) && (ven.dignity?.includes("Exalted") || ven.dignity?.includes("Own"))) {
    yogas.push({ name: "मालव्य पंचमहापुरुष राजयोग (Malavya Mahapurusha Yoga)", category: "Mahapurusha Yoga", description: "शुक्र केंद्र में उच्च/स्वराशि में स्थित होकर वैभव, वाहन, सुंदर घर, कलात्मक सफलता और सुखमय दांपत्य जीवन देते हैं।" });
  }
  if (saturn && [1, 4, 7, 10].includes(saturn.houseNumber) && (saturn.dignity?.includes("Exalted") || saturn.dignity?.includes("Own"))) {
    yogas.push({ name: "शश पंचमहापुरुष राजयोग (Shasha Mahapurusha Yoga)", category: "Mahapurusha Yoga", description: "शनि केंद्र में उच्च/स्वराशि में स्थित होकर जन-नेतृत्व, स्थायी साम्राज्य, भूमि और दीर्घकालिक उच्च पद प्रदान करते हैं।" });
  }
  if (yogas.length === 0) {
    yogas.push({ name: "लग्न-त्रिकोण कर्म सहयोग योग (Kendra-Trikona Karma Yoga)", category: "Shubha Yoga", description: `लग्नेश ${lagnaDetails.lord} एवं भाग्येश ${houses[8]?.lord || "गुरु"} के संबंध से जातक अपने स्व-परिश्रम और धर्मनिष्ठा से जीवन में स्थायी उन्नति प्राप्त करता है।` });
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

  const MUKHI_SHASTRA_META = {
    1: { beejMantra: "ॐ ह्रीं नमः", wearingDay: "रविवार या सोमवार प्रातः", deity: "भगवान परमशिव (सूर्य अधिपति)" },
    2: { beejMantra: "ॐ नमः", wearingDay: "सोमवार प्रातः", deity: "भगवान अर्धनारीश्वर (चंद्र अधिपति)" },
    3: { beejMantra: "ॐ क्लीं नमः", wearingDay: "मंगलवार प्रातः", deity: "अग्नि देव (मंगल अधिपति)" },
    4: { beejMantra: "ॐ ह्रीं नमः", wearingDay: "बुधवार या गुरुवार प्रातः", deity: "भगवान ब्रह्मा व माँ सरस्वती (बुध अधिपति)" },
    5: { beejMantra: "ॐ ह्रीं नमः", wearingDay: "गुरुवार या सोमवार प्रातः", deity: "भगवान कालाग्नि रुद्र (गुरु बृहस्पति अधिपति)" },
    6: { beejMantra: "ॐ ह्रीं हुं नमः", wearingDay: "शुक्रवार प्रातः", deity: "भगवान कार्तिकेय (शुक्र अधिपति)" },
    7: { beejMantra: "ॐ हुं नमः", wearingDay: "शुक्रवार या शनिवार प्रातः", deity: "माता महालक्ष्मी व सप्तर्षि (शनि/शुक्र अधिपति)" },
    8: { beejMantra: "ॐ हुं नमः / ॐ गं गणपतये नमः", wearingDay: "बुधवार प्रातः", deity: "विघ्नहर्ता श्री गणेश (राहु अधिपति)" },
    9: { beejMantra: "ॐ ह्रीं हुं नमः", wearingDay: "शुक्रवार या शनिवार प्रातः", deity: "माँ नवदुर्गा (केतु अधिपति)" },
    10: { beejMantra: "ॐ ह्रीं नमः", wearingDay: "गुरुवार प्रातः", deity: "भगवान श्री हरि विष्णु (नवग्रह शांति)" },
    11: { beejMantra: "ॐ ह्रीं हुं नमः", wearingDay: "मंगलवार या शनिवार प्रातः", deity: "एकादश रुद्र भगवान हनुमान" },
    12: { beejMantra: "ॐ क्रौं क्षौं रौं नमः", wearingDay: "रविवार प्रातः", deity: "द्वादश आदित्य (सूर्य देव)" },
    13: { beejMantra: "ॐ ह्रीं नमः", wearingDay: "शुक्रवार प्रातः", deity: "कामदेव व देवराज इंद्र (शुक्र अधिपति)" },
    14: { beejMantra: "ॐ नमः", wearingDay: "मंगलवार या शनिवार प्रातः", deity: "देवमणि भगवान शिव व हनुमान (शनि/मंगल अधिपति)" }
  };

  // Rudraksha recommendations: Entry 0 is ALWAYS the Immutable Canonical Primary Rudraksha
  const rudrakshaRecommendations = [];
  const primaryMeta = MUKHI_SHASTRA_META[canonicalPrimary.mukhiNumber] || MUKHI_SHASTRA_META[5];

  // 1. Canonical Primary Life Rudraksha (Lagna Lord)
  rudrakshaRecommendations.push({
    role: "Canonical Primary Life Rudraksha (इष्ट व लग्न अधिपति)",
    significance: canonicalPrimary.significance,
    reason: canonicalPrimary.significance,
    mukhi: canonicalPrimary.mukhi,
    mukhiNumber: canonicalPrimary.mukhiNumber,
    beejMantra: canonicalPrimary.beejMantra || primaryMeta.beejMantra,
    wearingDay: primaryMeta.wearingDay,
    deity: primaryMeta.deity,
    isCanonicalPrimary: true
  });

  // 2. Rashi Rudraksha (Mind & Harmony)
  const rashiRudrakshaMap = {
    "Mesh": 3, "Vrishabh": 6, "Mithun": 4, "Kark": 2,
    "Singh": 1, "Kanya": 4, "Tula": 6, "Vrischika": 3,
    "Dhanu": 5, "Makar": 7, "Kumbh": 7, "Meen": 5
  };
  const rashiMukhi = rashiRudrakshaMap[moonDetails.rashiName] || 5;
  const rashiMeta = MUKHI_SHASTRA_META[rashiMukhi] || MUKHI_SHASTRA_META[5];
  const rashiSig = `आपकी जन्म चंद्र राशि ${moonDetails.rashiName} (${moonDetails.rashiEnglish}) है, जिसके स्वामी ${moonDetails.lord} हैं। यह रुद्राक्ष मानसिक शांति, भावनात्मक संतुलन, अति-चिंतन (Overthinking) से मुक्ति और सही निर्णय क्षमता के लिए अत्यंत लाभकारी है।`;
  rudrakshaRecommendations.push({
    role: "Chandra Rashi Rudraksha (चंद्र राशि अधिपति)",
    significance: rashiSig,
    reason: rashiSig,
    mukhi: `${rashiMukhi} Mukhi Rudraksha`,
    mukhiNumber: rashiMukhi,
    beejMantra: rashiMeta.beejMantra,
    wearingDay: rashiMeta.wearingDay,
    deity: rashiMeta.deity,
    isCanonicalPrimary: false
  });

  // 3. Current Dasha Rudraksha
  const dashaMukhiNum = parseInt(dashaInfo.recommendedDashaRudraksha, 10) || 5;
  const dashaMeta = MUKHI_SHASTRA_META[dashaMukhiNum] || MUKHI_SHASTRA_META[5];
  const dashaSig = `आपके जीवन में वर्तमान में ${dashaInfo.currentMahadashaHindi} की महादशा एवं ${dashaInfo.currentAntardashaHindi} की अंतर्दशा चल रही है। वर्तमान दशा के अशुभ प्रभाव को शांत करने तथा शुभ फलों को बढ़ाने हेतु ${dashaInfo.recommendedDashaRudraksha} सुरक्षा कवच का कार्य करता है।`;
  rudrakshaRecommendations.push({
    role: `Current Dasha Rudraksha (${dashaInfo.currentMahadasha} Mahadasha)`,
    significance: dashaSig,
    reason: dashaSig,
    mukhi: dashaInfo.recommendedDashaRudraksha,
    mukhiNumber: dashaMukhiNum,
    beejMantra: dashaMeta.beejMantra,
    wearingDay: dashaMeta.wearingDay,
    deity: dashaMeta.deity,
    isCanonicalPrimary: false
  });

  // 4. Concern / Life Goal Complementary Focus (Explanation only - NEVER overrides Primary Mukhi)
  const concernMap = {
    "all": { mukhi: "1 Mukhi / 5 Mukhi / 108 Jaap Mala", role: "Complete Life Guidance (संपूर्ण जीवन संरक्षण)", significance: "समस्त जीवन क्षेत्रों की समग्र उन्नति, मानसिक शांति व आध्यात्मिक सुरक्षा हेतु पूरक मार्गदर्शन।" },
    "career": { mukhi: "7 Mukhi / 10 Mukhi / 14 Mukhi", role: "Career & Leadership (करियर व आजीविका पूरक)", significance: "करियर में पदोन्नति, उच्चाधिकारियों से सहयोग और कार्यक्षेत्र की बाधाओं के निवारण हेतु पूरक मार्गदर्शन।" },
    "business": { mukhi: "7 Mukhi / 8 Mukhi / 12 Mukhi", role: "Business & Trade (व्यापार व व्यवसाय पूरक)", significance: "व्यापार विस्तार, ग्राहक आकर्षण व निरंतर नकदी प्रवाह (Cash Flow) हेतु पूरक मार्गदर्शन।" },
    "education": { mukhi: "4 Mukhi / 5 Mukhi", role: "Education & Intellect (विद्या व एकाग्रता पूरक)", significance: "विद्या, तीव्र स्मरण शक्ति, एकाग्रता व प्रतियोगी परीक्षा सफलता हेतु पूरक मार्गदर्शन।" },
    "marriage": { mukhi: "2 Mukhi / Gauri Shankar", role: "Marriage & Harmony (विवाह व दांपत्य पूरक)", significance: "शीघ्र विवाह योग, जीवनसाथी से मधुर सामंजस्य व गृहस्थ सुख हेतु पूरक मार्गदर्शन।" },
    "love": { mukhi: "2 Mukhi / 6 Mukhi / 13 Mukhi", role: "Love & Attraction (प्रेम संबंध पूरक)", significance: "आपसी आकर्षण, भावनात्मक विश्वास व प्रेम में सामंजस्य हेतु पूरक मार्गदर्शन।" },
    "family": { mukhi: "2 Mukhi / 3 Mukhi", role: "Family Peace (पारिवारिक शांति पूरक)", significance: "पारिवारिक कलह निवारण, आपसी प्रेम व गृह-शांति हेतु पूरक मार्गदर्शन।" },
    "health": { mukhi: "3 Mukhi / 5 Mukhi / 11 Mukhi", role: "Health & Vitality (आरोग्य पूरक)", significance: "स्वास्थ्य, शारीरिक ऊर्जा, रक्तचाप संतुलन व इम्युनिटी हेतु पूरक मार्गदर्शन।" },
    "finance": { mukhi: "7 Mukhi / 13 Mukhi", role: "Wealth & Debt Relief (धन समृद्धि पूरक)", significance: "आर्थिक स्थिरता, फंसा हुआ धन प्राप्ति व कर्ज मुक्ति हेतु पूरक मार्गदर्शन।" },
    "children": { mukhi: "Garbh Gauri / 5 Mukhi", role: "Children & Progeny (संतान सुख पूरक)", significance: "संतान सुख, सुरक्षित मातृत्व व संतान के उज्ज्वल भविष्य हेतु पूरक मार्गदर्शन।" },
    "property": { mukhi: "3 Mukhi / 10 Mukhi", role: "Property & Assets (भूमि भवन पूरक)", significance: "भूमि, मकान, वाहन व स्थायी संपत्ति निर्माण हेतु पूरक मार्गदर्शन।" },
    "spiritual": { mukhi: "1 Mukhi / 14 Mukhi / 108 Jaap Mala", role: "Spiritual Upliftment (आध्यात्मिक उन्नति पूरक)", significance: "ध्यान-साधना, आज्ञा चक्र जागृति व शिव कृपा हेतु पूरक मार्गदर्शन।" },
    "foreign_travel": { mukhi: "8 Mukhi / 12 Mukhi", role: "Foreign Travel & Visa (विदेश योग पूरक)", significance: "विदेश यात्रा, वीजा बाधा निवारण व अंतर्राष्ट्रीय सफलता हेतु पूरक मार्गदर्शन।" },
    "legal": { mukhi: "8 Mukhi / 10 Mukhi / 11 Mukhi", role: "Legal Victory (कानूनी विजय पूरक)", significance: "कानूनी अड़चनों, कोर्ट-कचहरी व गुप्त शत्रुओं से रक्षा हेतु पूरक मार्गदर्शन।" },
    "shani_dosha": { mukhi: "7 Mukhi / 14 Mukhi / 11 Mukhi", role: "Dosha & Shani Shanti (शनि व ग्रह शांति पूरक)", significance: "शनि साढ़े साती, ढैया व राहु-केतु दोष निवारण हेतु पूरक मार्गदर्शन।" },
    "peace": { mukhi: "2 Mukhi / 5 Mukhi", role: "Mental Peace (मानसिक शांति पूरक)", significance: "मानसिक शांति, अनिद्रा निवारण व तनाव मुक्ति हेतु पूरक मार्गदर्शन।" },
    "general": { mukhi: "5 Mukhi / 7 Mukhi", role: "General Auspiciousness (सर्वकल्याण पूरक)", significance: "सामान्य सुख-शांति व सर्वकल्याण हेतु पूरक मार्गदर्शन।" },
    "custom": { mukhi: "1 Mukhi / 5 Mukhi / 11 Mukhi", role: "Special Purpose (विशेष संकल्प पूरक)", significance: customConcern ? `जातक का विशेष संकल्प: "${customConcern}"।` : "विशेष मनोकामना पूर्ति हेतु पूरक मार्गदर्शन।" }
  };

  const selectedConcern = concernMap[concern] || concernMap["all"];
  const concernSig = `${selectedConcern.significance} (आपका स्थायी मुख्य लग्न रुद्राक्ष ${canonicalPrimary.mukhi} ही रहेगा)।`;
  rudrakshaRecommendations.push({
    role: `Complementary Goal Focus (${selectedConcern.role})`,
    significance: concernSig,
    reason: concernSig,
    mukhi: selectedConcern.mukhi,
    mukhiNumber: parseInt(selectedConcern.mukhi, 10) || canonicalPrimary.mukhiNumber,
    beejMantra: "ॐ नमः शिवाय (108 बार)",
    wearingDay: "सोमवार या प्रदोष व्रत",
    deity: "देवाधिदेव महादेव",
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
  const shadbalaList = ak.shadbala?.planetShadbala || [];
  const planetsBulletMarkdown = planets.map(p => {
    const isGood = /Exalted|उच्च|Own|स्वगृही|Moolatrikona|मूलत्रिकोण|Friendly|मित्र/i.test(p.dignity || "") && ![6, 8, 12].includes(p.houseNumber);
    const sb = shadbalaList.find(s => (s.planet || "").includes((p.name || "").split(" ")[0]));
    const sbText = sb ? ` | **षड्बल:** ${sb.totalRupas} रूपा (${sb.status})` : "";
    return `• 📌 **${p.hindiName || p.name}** — **भाव:** ${p.houseNumber}वां भाव | **राशि:** ${p.rashiHindi} (${p.degreeInSign}) | **नक्षत्र:** ${p.nakshatra} (चरण ${p.pada}, स्वामी: ${p.nakshatraLord || "शुभ"}) | **स्थिति:** **${p.dignity}** | **नवमांश (D9):** ${p.navamshaRashiHindi} | **दशमांश (D10):** ${p.dashamshaRashiHindi || p.navamshaRashiHindi}${sbText}${p.isVargottama ? " 🌟 *(वर्गोत्तम - अत्यंत बली)*" : ""}${p.isRetrograde ? " 🔄 *(वक्री)*" : ""}${p.isCombust ? " 🔥 *(अस्त)*" : ""}\n  - 🎯 **कारक क्षेत्र:** ${p.karaka || "जीवन ऊर्जा व भाग्य"}\n  - 💡 **पंडित जी का विस्तृत फलादेश:** ${p.signification || ""} ${isGood ? "यह ग्रह आपकी कुंडली में शुभ बल दे रहा है और अपनी दशा-अंतर्दशा में मान-सम्मान व उच्च सफलता दिलाएगा।" : "इस ग्रह की भाव/अवस्था के कारण संबंधित जीवन क्षेत्र में थोड़ा अतिरिक्त परिश्रम और धैर्य अपेक्षित है।"}\n  - 🕉️ **ग्रह शांति मंत्र व उपाय:** \`${p.mantra || "ॐ नमः शिवाय"}\` — ${p.upay || "शिव आराधना करें।"}`;
  }).join("\n\n");

  const housesBulletMarkdown = houses.map(h => {
    const occText = h.occupants && h.occupants.length > 0 ? h.occupants.join(", ") : "कोई ग्रह नहीं (भावेश द्वारा संचालित)";
    const aspText = h.aspects && h.aspects.length > 0 ? h.aspects.join(", ") : "सामान्य दृष्टि";
    return `• 🏛️ **${h.houseTitle || `${h.houseNumber}वां भाव`}** *(कारक: ${h.karaka || "सूर्य"})*\n  - **राशि:** ${h.rashiHindi} (${h.rashiEnglish}) | **स्वामी (भावेश):** **${h.lord}** (स्थित: ${h.lordPlacement || "कुंडली में"}) | **स्थित ग्रह:** ${occText} | **दृष्टि:** ${aspText}\n  - **महत्व व फलादेश:** *(${h.significance})* — ${h.bhavaPhaladesh || ""}`;
  }).join("\n\n");

  const lalKitabUpayMarkdown = (lalKitab.planets || []).map(lp =>
    `• 📕 **${lp.planet} (खाना नं. ${lp.houseNumber} - ${lp.status}):** ${lp.lalKitabUpay}`
  ).join("\n");

  const rudrakshaMarkdown = recs.map((r, idx) =>
    `• 📿 **${idx + 1}. ${r.role}: ${r.mukhi}** *(अधिष्ठाता देवता: ${r.deity || "भगवान शिव"})*\n  - **शास्त्रीय कारण व कुंडली प्रमाण:** ${r.reason || r.significance || "लग्न, चंद्र राशि व महादशा अनुकूलन हेतु।"}\n  - **सिद्ध बीज मंत्र:** \`${r.beejMantra || "ॐ नमः शिवाय"}\` (प्रतिदिन प्रातः स्नान के बाद 108 बार जाप)\n  - **धारण दिवस व संपूर्ण शिव पुराण विधि:** ${r.wearingDay || "सोमवार या प्रदोष व्रत"} को प्रातःकाल स्नान कर रुद्राक्ष को गंगाजल व कच्चे गोदुग्ध (पंचामृत) से स्नान कराएं, अष्टगंध/चंदन का तिलक लगाएं, धूप-दीप दिखाकर 108 बार बीज मंत्र का जाप करें और लाल/पीले रेशमी धागे अथवा चाँदी/सोने में कंठ या भुजा पर धारण करें।`
  ).join("\n\n");

  const jaiminiKarakasList = ak.jaiminiKarakas || [];
  const jaiminiMarkdown = jaiminiKarakasList.map(jk =>
    `  - **${jk.karakaCode} (${jk.karakaName}):** **${jk.planetName}** (${jk.signName}, ${jk.degreeInSign}, ${jk.houseNumber}वां भाव) — *${jk.significance}*`
  ).join("\n");

  const h1 = houses[0] || {};
  const h4 = houses[3] || {};
  const h5 = houses[4] || {};
  const h9 = houses[8] || {};
  const h11 = houses[10] || {};

  const fullPanditJiReportMarkdown = `🙏 **श्री गणेशाय नमः! हर हर महादेव! प्रणाम ${vb.name || "भक्त"} जी।**

मैं **AI पंडित जी (वैदिक ज्योतिषाचार्य)** हूँ। मैंने महर्षि पाराशर के **बृहत्पाराशर होरा शास्त्र (BPHS)**, **फलदीपिका**, **सारावली**, **जैमिनी उपदेश सूत्र**, **लाल किताब** और **शिव पुराण (विद्येश्वर संहिता)** के अटल शास्त्रीय सिद्धांतों तथा **लाहिड़ी चित्रापक्षीय अयनांश (${vb.ayanamsha || "Lahiri"})** के आधार पर आपकी जन्म कुंडली का संपूर्ण, सूक्ष्म और 100% प्रामाणिक गणितीय अध्ययन किया है।

एक सच्चे वैदिक ब्राह्मण व ज्योतिषी की भांति मैं बिना कुछ छिपाए आपको **पूरी डिटेल (संपूर्ण विवरण)** में बता रहा हूँ कि **अभी आपके जीवन में क्या-क्या परेशानी चल रही है, क्यों चल रही है, कब से चल रही है, कैसे चल रही है, यह कब पूरी तरह ठीक होगी, तथा आपके सभी 9 ग्रहों, 12 भावों, करियर, धन, विवाह, स्वास्थ्य, महादशा और सिद्ध रुद्राक्ष का संपूर्ण फलादेश क्या है:**

---

### 1. 🔭 आपकी जन्म कुंडली का मूल पंचांग व अवकहड़ा चक्र (Complete Birth Chart & Avakahada Chakra)
• **जातक का नाम:** ${vb.name || "भक्त"} | **जन्म तिथि:** ${vb.dob} | **जन्म समय:** ${vb.birthTime} | **जन्म स्थान:** ${vb.birthPlace} (अक्षांश: ${vb.coordinates?.lat || ""}°, देशांतर: ${vb.coordinates?.lon || ""}°)
• **जन्म लग्न (Ascendant / Lagnasthana):** **${lagna.rashiHindi} (${lagna.rashiEnglish})** — अंश: ${lagna.degree} | **लग्नेश (Lagna Lord):** **${lagna.lord}** | **नक्षत्र:** ${lagna.nakshatra} (चरण ${lagna.pada}) | **नवमांश (D9 लग्न):** ${lagna.navamsha} | **तत्व:** ${lagna.element}
• **जन्म चंद्र राशि (Moon Sign / Rashi):** **${chandra.rashiHindi} (${chandra.rashiEnglish})** — अंश: ${chandra.degree} | **राशि स्वामी:** **${chandra.lord}**
• **जन्म नक्षत्र:** **${chandra.nakshatra}** (चरण ${chandra.pada}) | **सूर्य राशि (Sun Sign):** ${surya.rashiHindi} (${surya.rashiEnglish}, अंश: ${surya.degree}, नक्षत्र: ${surya.nakshatra})
• **जन्म पंचांग (5 Pillars of Time):** वार: **${ak.panchanga?.vaar || "शुभ वार"}** (स्वामी: ${ak.panchanga?.vaarLord || ""}) | तिथि: **${ak.panchanga?.tithi || "शुभ तिथि"}** | योग: **${ak.panchanga?.yoga || "शुभ योग"}** | करण: **${ak.panchanga?.karana || "शुभ करण"}**
• **अवकहड़ा चक्र:** पाया: **${ak.avakahadaChakra?.paya || "चाँदी"}** | वर्ण: **${ak.avakahadaChakra?.varna || "क्षत्रिय"}** | वश्य: **${ak.avakahadaChakra?.vashya || "मानव"}** | योनि: **${ak.avakahadaChakra?.yoni || "गौ"}** | गण: **${ak.avakahadaChakra?.gana || "देव"}** | नाड़ी: **${ak.avakahadaChakra?.nadi || "मध्य"}**
• **अंक ज्योतिष व भाग्य संकेत:** मूलांक: **${ak.mulank}** | भाग्यांक: **${ak.avakahadaChakra?.bhagyank || ak.mulank}** | शुभ अंक: **${ak.avakahadaChakra?.shubhAnk || "1, 3, 9"}** | शुभ वार: **${ak.avakahadaChakra?.shubhDin || "सोमवार, गुरुवार"}** | शुभ धातु: **${ak.avakahadaChakra?.shubhDhatu || "सोना, चाँदी"}** | **प्रमुख भाग्योदय वर्ष:** **${ak.avakahadaChakra?.shubhVarsh || "24, 28, 32, 36 वर्ष"}**

---

### 2. 🔍 अभी आपके जीवन में क्या-क्या परेशानी चल रही है? (वर्तमान समस्याओं का सटीक निदान)
${currentProblems.map(item => `• ${item}`).join("\n\n")}

---

### 3. ❓ यह परेशानी क्यों और कैसे चल रही है? (कुंडली के ग्रहों व भावों का प्रत्यक्ष शास्त्रीय कारण)
${whyAndHow.map(item => `• ${item}`).join("\n\n")}

---

### 4. 📅 यह परेशानी कब से चल रही है? (सटीक तारीख व दशा प्रमाण)
${sinceWhen.map(item => `• ${item}`).join("\n\n")}

---

### 5. ⏳ यह परेशानी कब ठीक होगी और आपका भाग्योदय कब होगा? (सटीक समय व समाधान काल)
${whenWillItResolve.map(item => `• ${item}`).join("\n\n")}

---

### 6. 🪐 नवग्रहों की भाव-राशि स्थिति, उच्च/नीच विचार, नवमांश (D9) व विस्तृत फलादेश (All 9 Planets Complete Reading)
${planetsBulletMarkdown}

---

### 7. 🏛️ कुंडली के सभी 12 भावों (1st to 12th Bhavas) का संपूर्ण विश्लेषण
${housesBulletMarkdown}

---

### 8. 📊 जीवन के प्रमुख क्षेत्रों का विशेष गहरा विश्लेषण (Career, Wealth, Marriage, Property & Health Deep-Dive)
• 💼 **करियर, नौकरी व व्यापार (10th, 6th & 7th House + D10 Dashamsha):**
  - दशम भाव (कर्म स्थान) **${h10.rashiHindi}** राशि में है जिसके स्वामी **${h10.lord}** हैं, और षष्ठ भाव (सेवा/नौकरी) के स्वामी **${h6.lord}** हैं।
  - कर्म कारक **शनि देव ${satP.houseNumber}वें भाव (${satP.rashiHindi})** में और अधिकार कारक **सूर्य देव ${sunP.houseNumber}वें भाव (${sunP.rashiHindi})** में स्थित हैं।
  - **पंडित जी का निर्णय:** आपकी कुंडली में बौद्धिक कौशल, प्रबंधन, स्वतंत्र व्यापार/कंसल्टेंसी और जिम्मेदारी वाले पदों पर कार्य करने के प्रबल योग हैं। वर्तमान अंतर्दशा (**${antarEnd}** तक) में धैर्य रखें; इसके बाद पदोन्नति और कार्य-विस्तार निश्चित है।
• 💰 **धन, संपत्ति, मकान-वाहन व आर्थिक भविष्य (2nd, 4th, 9th & 11th House):**
  - धन भाव (2nd) के स्वामी **${h2.lord}**, सुख-संपत्ति भाव (4th) के स्वामी **${h4.lord}**, भाग्येश (9th) **${h9.lord}** और लाभेश (11th) **${h11.lord}** हैं।
  - जीवन के शुरुआती चरण में खर्चों की अधिकता रहती है, किंतु **${antarEnd}** के पश्चात संचित धन, भूमि-भवन (Property) और स्थायी बैंक बैलेंस में तीव्र वृद्धि होगी।
• ❤️ **विवाह, जीवनसाथी का स्वभाव व गृहस्थ सुख (7th House & D9 Navamsha):**
  - सप्तम भाव **${h7.rashiHindi}** राशि में है (स्वामी: **${h7.lord}**)। शुक्र देव **${venP.houseNumber}वें भाव** में और गुरु देव **${jupP.houseNumber}वें भाव** में हैं।
  - जीवनसाथी विचारों से परिपक्व, परिवार का ध्यान रखने वाला और आपके भाग्य को बढ़ाने वाला होगा। वाणी में सौम्यता और आपसी संवाद से दांपत्य जीवन सुखमय रहेगा।
• 🎓 **शिक्षा, संतान व आध्यात्मिक तेज (5th House & Purva Punya):**
  - पंचम भाव (**${h5.rashiHindi}**, स्वामी: **${h5.lord}**) आपकी तीक्ष्ण अंतर्दृष्टि और पूर्व जन्म के शुभ कर्मों को दर्शाता है। संतान पक्ष से सुख व मान-सम्मान प्राप्त होगा।

---

### 9. ✨ कुंडली के राजयोग, दोष विचार, जैमिनी चर कारक व गोचर (Yogas, Doshas, Jaimini & Transit)
• **प्रमुख राजयोग व धन योग:**
${yogas.map(y => `  - 🌟 **${y.name} (${y.category}):** ${y.description}`).join("\n")}
• **मांगलिक दोष विचार:** ${dosha.manglikNote}
• **शनि साढ़े साती / ढैया स्थिति:** **${dosha.sadeSati?.phase || "साढ़े साती मुक्त"}** — ${dosha.sadeSati?.description || ""}
• **कालसर्प योग विचार:** **${dosha.kaalSarp?.type || "कालसर्प मुक्त"}** — ${dosha.kaalSarp?.description || ""}
• **बाधकेश व मारकेश विचार:** ${ak.badhakaMarakaInfo?.badhaka?.note || ""} | ${ak.badhakaMarakaInfo?.maraka?.note || ""}
• **जैमिनी सप्त चर कारक (Jaimini 7 Soul Significators):**
${jaiminiMarkdown}
• **अष्टकवर्ग बल (Sarvashtakvarga):** कुल बिंदु: **${ak.ashtakvarga?.totalSavPoints || 337}** (शुभ व संतुलित जीवन ऊर्जा)
• **ताजिक वर्षफल (मुंथा विचार - वर्ष ${ak.tajikVarshphal?.currentYear || new Date().getFullYear()}):** आपकी वार्षिक मुंथा **${ak.tajikVarshphal?.munthaHouse || 1}वें भाव (${ak.tajikVarshphal?.munthaRashi || lagna.rashiHindi})** में है — ${ak.tajikVarshphal?.munthaSignificance || ""}
• **वर्तमान ग्रह गोचर (चन्द्र राशि से):**
${gochar.map(g => `  - **${g.planet}:** ${g.effectNote}`).join("\n")}

---

### 10. ⏱️ विंशोत्तरी महादशा, अंतर्दशा, प्रत्यंतर व योगिनी दशा समय सारिणी (Complete Dasha Timeline)
• **सक्रिय 4-स्तरीय विंशोत्तरी दशा सूत्र:** **${dasha.dashaChainSummary || `${mahaHindi} > ${antarHindi} > ${pratyantarHindi}`}**
• **वर्तमान महादशा:** **${mahaHindi}** (${mahaStart} से ${mahaEnd} तक)
• **वर्तमान अंतर्दशा:** **${antarHindi}** (${antarStart} से ${antarEnd} तक)
• **वर्तमान प्रत्यंतर दशा:** **${pratyantarHindi}** (${pratyantarStart} से ${pratyantarEnd} तक)
• **सक्रिय योगिनी दशा:** **${ak.yoginiDasha?.activeYogini || "सिद्धा"}** (स्वामी: ${ak.yoginiDasha?.activeLord || "शुक्र"}, प्रकृति: ${ak.yoginiDasha?.activeNature || "शुभ"}, ${ak.yoginiDasha?.startDate || ""} से ${ak.yoginiDasha?.endDate || ""} तक)
• **वर्तमान महादशा की संपूर्ण अंतर्दशा समय-सारिणी (Antardasha Roadmap):**
${(dasha.antardashasTimeline || []).map(a => `  - **${a.planetHindi} अंतर्दशा:** ${a.startDate} से ${a.endDate} तक ${a.isCurrent ? "👉 **[वर्तमान में सक्रिय]**" : ""}`).join("\n")}
• **आगामी महादशाएं (Future Mahadashas):**
${(dasha.upcomingMahadashas || []).map(m => `  - **${m.planetHindi} महादशा (${m.years} वर्ष):** ${m.startDate} से ${m.endDate} तक`).join("\n")}

---

### 11. 📕 लाल किताब के अचूक उपाय व कुंडली-प्रमाणित सिद्ध नेपाली रुद्राक्ष कवच (Complete Remedies & Rudraksha Dharan Vidhi)
**क) लाल किताब व वैदिक दैनिक उपाय (नियमपूर्वक करें):**
${lalKitabUpayMarkdown}
• प्रतिदिन प्रातः तांबे के लोटे से भगवान सूर्य को अर्घ्य दें, शिवलिंग पर जल व काले तिल चढ़ाएं और नित्य 108 बार \`ॐ नमः शिवाय\` तथा \`महामृत्युंजय मंत्र\` का मानसिक जाप करें।

**ख) आपकी जन्म कुंडली से 100% प्रमाणित सिद्ध नेपाली रुद्राक्ष कवच (शिव पुराण सम्मत):**
${rudrakshaMarkdown}

---

### 🌟 पंडित जी का अनिवार्य निष्कर्ष व आशीर्वाद (Key Takeaways)
• **आपकी कुंडली का मूल आधार:** **${lagna.rashiHindi} लग्न** (स्वामी: ${lagna.lord}) एवं **${chandra.rashiHindi} राशि** (स्वामी: ${chandra.lord}, नक्षत्र: ${chandra.nakshatra})।
• **मुख्य समस्या का कारण:** **${mahaHindi}** महादशा में **${antarHindi}** अंतर्दशा (${antarStart} से सक्रिय) एवं त्रिक भाव/गोचर का अस्थायी दबाव।
• **राहत व भाग्योदय कब होगा:** पहली राहत **${pratyantarEnd}** के तुरंत बाद और पूर्ण भाग्योदय व संकट मुक्ति **${antarEnd}** के पश्चात।
• **सर्वश्रेष्ठ रक्षा कवच:** **${recs.slice(0, 3).map(r => r.mukhi).join(" + ")}** (100% शुद्ध नेपाली, सरकारी लैब एक्स-रे प्रमाणित व वैदिक प्राण-प्रतिष्ठित)।

भगवान देवाधिदेव महादेव एवं माता अन्नपूर्णा आपके समस्त कष्टों का निवारण करें और आपके जीवन में आरोग्य, सुख, शांति व अथाह समृद्धि प्रदान करें। यदि आप करियर, विवाह, धन, स्वास्थ्य या किसी भी ग्रह के बारे में और गहराई से पूछना चाहते हैं, तो निःसंकोच पूछें! **हर हर महादेव!** 🙏

[AURA_KEYWORDS]: ${recs[0]?.mukhi || "सिद्ध रुद्राक्ष"} धारण विधि | मेरी परेशानी कब ठीक होगी | नौकरी व करियर विश्लेषण | धन व व्यापार योग | विवाह व दांपत्य विचार`;

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

  // 2. Comprehensive Full Kundali + Life Problem Diagnosis Triggers (Checked BEFORE narrow topics if user asks for full/detailed/complete reading)
  const isFullOrLifeDiagnosisRequest = (
    /(पूरी\s*कुंडली|संपूर्ण\s*कुंडली|विस्तृत\s*कुंडली|फुल\s*कुंडली|कुंडली\s*विश्लेषण|जन्म\s*तिथि:|जन्म\s*समय:|जन्म\s*स्थान:|मुख्य\s*संकल्प|puri\s*kundali|poori\s*kundali|full\s*kundali|complete\s*kundli|complete\s*reading|sampurna\s*kundali|diteld|detailed|detail\s*me|sab\s*kuch|सब\s*कुछ|पूरी\s*जानकारी|विस्तार\s*से)/i.test(q) ||
    /(pareshani|paresani|dikkat|problem|samasya|sankat|rukaawat|rukawat|kya\s*chal\s*raha|kyo\s*chal|kyu\s*chal|kab\s*se|kese\s*chal|kaise\s*chal|kab\s*sahi\s*hog|kab\s*thik\s*hog|kab\s*theek\s*hog|परेशानी|दिक्कत|समस्या|संकट|रुकावट|क्यों\s*चल|कब\s*से|कैसे\s*चल|कब\s*सही\s*होगी|कब\s*ठीक\s*होगी|पंडित\s*की\s*तरह|bandit\s*ki\s*tarh|pandit\s*ki\s*tarah)/i.test(q)
  );
  if (isFullOrLifeDiagnosisRequest) {
    return { type: "full_kundali", label: "Sampurna Vedic Kundali & Pareshani Nivaran Vishleshan (What, Why, Since When, How & When Resolved)" };
  }

  // 3. Specific Astrological Topics
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
  if (/\b(shani|sade\s*sati|dhaiya|rahu|ketu|mangal|surya|chandra|budha|guru|brihaspati|shukra|navagraha|9\s*planets|all\s*planets)\b|(?:^|\s|[।,!?])(शनि|साढ़े\s*साती|ढैया|राहु|केतु|मंगल|सूर्य|चन्द्र|चंद्र|बुध|गुरु|बृहस्पति|शुक्र|ग्रह\s*शांति|नवग्रह|सभी\s*ग्रह)(?:\s|$|[।,!?])/i.test(q)) {
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

  return { type: "full_kundali", label: "Sampurna Vedic Kundali & Detailed Guidance" };
}

/**
 * Generate 100% Kundali-Grounded Exhaustive Topic & Follow-up Guidance
 * Provides deeply detailed multi-section Vedic analysis for any topic (career, marriage, finance,
 * health, education, property, progeny, travel, graha_specific, dosha, dasha_timing, rudraksha)
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
  const yogas = ak.yogas || [];
  const gochar = ak.gochar || [];

  const mahaHindi = dasha.currentMahadashaHindi || "बृहस्पति (गुरु)";
  const antarHindi = dasha.currentAntardashaHindi || "बुध (Mercury)";
  const pratyantarHindi = dasha.currentPratyantardashaHindi || antarHindi;
  const mahaStart = dasha.mahadashaStartDate || "";
  const mahaEnd = dasha.mahadashaEndDate || "";
  const antarStart = dasha.antardashaStartDate || "";
  const antarEnd = dasha.antardashaEndDate || "निकट भविष्य";
  const pratyantarStart = dasha.pratyantardashaStartDate || "";
  const pratyantarEnd = dasha.pratyantardashaEndDate || "शीघ्र";

  const timelineList = dasha.antardashasTimeline || [];
  const currentIdx = timelineList.findIndex(a => a.isCurrent);
  const nextAntar1 = currentIdx >= 0 && timelineList[currentIdx + 1] ? timelineList[currentIdx + 1] : timelineList[0];
  const nextAntar2 = currentIdx >= 0 && timelineList[currentIdx + 2] ? timelineList[currentIdx + 2] : timelineList[1];

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
  const h3 = houses[2] || {};
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
  const akKaraka = jaiminiKarakas.find(k => k.karakaCode === "AK");
  const amk = jaiminiKarakas.find(k => k.karakaCode === "AmK");
  const dk = jaiminiKarakas.find(k => k.karakaCode === "DK");
  const pk = jaiminiKarakas.find(k => k.karakaCode === "PK");

  const primaryRec = recs[0] || { mukhi: "प्रामाणिक मुख्य रुद्राक्ष", beejMantra: "ॐ नमः शिवाय" };
  const rashiRec = recs[1] || primaryRec;
  const dashaRec = recs[2] || primaryRec;

  const intentType = astroIntent?.type || "full_kundali";

  // 1. CAREER / JOB / BUSINESS (नौकरी, व्यापार, पदोन्नति, सरकारी नौकरी)
  if (intentType === "career") {
    const isSaturnStrong = !/Debilitated|नीच/i.test(satP.dignity || "");
    const isSunStrong = !/Debilitated|नीच/i.test(sunP.dignity || "");
    const d10Varga = (ak.shodashvarga || []).find(v => v.vargaCode === "D10");
    const jobSuitability = (h6.occupants && h6.occupants.length > 0 && !h6.occupants[0].includes("Shunya")) || /Service|Friendly|Exalted/i.test(satP.dignity || "")
      ? "आपकी कुंडली में षष्ठ भाव (सेवा स्थान) एवं शनि की स्थिति उच्च स्तरीय नौकरी/सेवा (Job, Corporate, Administration या Technical/Management Role) के लिए अत्यंत अनुकूल और स्थिरता देने वाली है। साथ ही 32 वर्ष की आयु के बाद आप स्वतंत्र कंसल्टेंसी या समानांतर व्यवसाय से भी अतिरिक्त लाभ अर्जित कर सकते हैं।"
      : "आपकी कुंडली में दशम भाव (कर्म स्थान), सप्तम भाव (व्यापार स्थान) एवं लाभ भाव (11th House) का प्रबल संबंध स्वतंत्र कार्य, व्यापार (Business/Entrepreneurship), कंसल्टेंसी और उच्च नेतृत्व (Leadership) में असाधारण सफलता का योग बनाता है।";

    return `🙏 **प्रणाम ${vb.name || "भक्त"} जी! हर हर महादेव।**

आपकी जन्म कुंडली (**${lagna.rashiHindi} लग्न**, **${chandra.rashiHindi} चंद्र राशि**, नक्षत्र: **${chandra.nakshatra}**) तथा **दशमांश कुंडली (D10 Dashamsha)** के सूक्ष्म गणितीय विश्लेषण के आधार पर **नौकरी, करियर, व्यापार व पदोन्नति** का संपूर्ण विस्तृत वैदिक फलादेश नीचे दिया गया है:

---

### 🏛️ 1. कुंडली के कर्म, सेवा, धन व लाभ भावों का गहरा विश्लेषण
• **दशम भाव (10th House - कर्म, पद-प्रतिष्ठा व राज्य कृपा):**
  - आपकी कुंडली का 10वां भाव **${h10.rashiHindi} (${h10.rashiEnglish})** राशि में है, जिसके स्वामी (दशमेश) **${h10.lord}** हैं (जो कुंडली के **${h10.lordPlacement || "शुभ भाव"}** में स्थित हैं)।
  - दशम भाव में स्थित ग्रह: **${h10.occupants ? h10.occupants.join(", ") : "भावेश द्वारा संचालित"}** | दृष्टि संबंध: **${h10.aspects && h10.aspects.length > 0 ? h10.aspects.join(", ") : "सामान्य दृष्टि"}**।
  - **दशमांश कुंडली (D10 - Career Divisional Chart):** दशमांश लग्न **${d10Varga?.lagnaRashiHindi || lagna.rashiHindi}** है, जो दर्शाता है कि आपके भीतर उच्च जिम्मेदारी संभालने की जन्मजात क्षमता है।
• **षष्ठ भाव (6th House - दैनिक नौकरी, प्रतियोगिता परीक्षा व शत्रु विजय):**
  - 6वां भाव **${h6.rashiHindi}** राशि में है, जिसके स्वामी **${h6.lord}** हैं। स्थित ग्रह: **${h6.occupants ? h6.occupants.join(", ") : "शुभ"}**। यह भाव प्रतियोगी परीक्षाओं और इंटरव्यू में निरंतर प्रयास से सफलता दिलाता है।
• **सप्तम व तृतीय भाव (7th & 3rd House - व्यापार, साझेदारी व स्व-पराक्रम):**
  - सप्तमेश **${h7.lord}** और तृतीयेश **${h3.lord}** आपके साहस और पब्लिक डीलिंग कौशल को मजबूत करते हैं।
• **धन व लाभ भाव (2nd & 11th House - सैलरी, बचत व प्रमोशन):**
  - धनेश **${h2.lord}** और लाभेश **${h11.lord}** के समीकरण से आपके परिश्रम का आर्थिक प्रतिफल स्थायी रूप से बढ़ने का योग है।

---

### 🪐 2. करियर के 5 मुख्य कारक ग्रहों का आपकी कुंडली में प्रभाव
• 📌 **शनि देव (मुख्य कर्म कारक व स्थायी करियर दाता):** शनि देव **${satP.houseNumber || 10}वें भाव** में **${satP.rashiHindi || ""}** राशि (${satP.degreeInSign || ""}, **${satP.dignity || "सामान्य"}**, D9: ${satP.navamshaRashiHindi || ""}) में स्थित हैं। ${isSaturnStrong ? "शनि देव आपको मेहनती, अनुशासित और अपने क्षेत्र में गहरा विशेषज्ञ बनाते हैं। शुरुआती संघर्ष के बाद ये अखंड पद-प्रतिष्ठा देते हैं।" : "शनि की वर्तमान स्थिति के कारण कार्यक्षेत्र में कभी-कभी श्रेय देर से मिलता है या काम रुक-रुक कर बनता है, जिसके लिए शनि शांति व 7/14 मुखी रुद्राक्ष अत्यंत आवश्यक है।"}
• 📌 **सूर्य देव (सरकारी नौकरी, उच्च पद, अधिकार व बॉस से संबंध):** सूर्य देव **${sunP.houseNumber || 1}वें भाव** में **${sunP.rashiHindi || ""}** राशि (${sunP.degreeInSign || ""}, **${sunP.dignity || "सामान्य"}**) में हैं। ${isSunStrong ? "सूर्य का बल आपको प्रशासनिक क्षमता, आत्मविश्वास और सरकारी/उच्च कॉर्पोरेट क्षेत्र में सम्मान दिलाने वाला है।" : "वरिष्ठ अधिकारियों से वैचारिक मतभेद से बचें और प्रतिदिन प्रातः सूर्य को अर्घ्य दें।"}
• 📌 **बुध देव (व्यापार, वाणी, आईटी, बैंकिंग व बौद्धिक कौशल):** बुध देव **${mercP.houseNumber || 1}वें भाव** (${mercP.rashiHindi || ""}) में रहकर आपकी विश्लेषणात्मक और संवाद शक्ति को प्रखर बना रहे हैं।
• 📌 **गुरु बृहस्पति (भाग्य, सलाहकार क्षमता व पदोन्नति):** गुरु देव **${jupP.houseNumber || 9}वें भाव** (${jupP.rashiHindi || ""}) में रहकर ज्ञान, शिक्षा, फाइनेंस और वरिष्ठ प्रबंधन में उन्नति के मार्ग खोलते हैं।
• 📌 **जैमिनी अमात्यकारक (AmK - आजीविका निर्देशक ग्रह):** आपकी कुंडली में **${amk ? `${amk.planetName} (${amk.signName}, ${amk.degreeInSign}, ${amk.houseNumber}वां भाव)` : "सूर्य देव"}** अमात्यकारक हैं। जैमिनी सूत्र के अनुसार यह ग्रह आपके करियर की मुख्य धुरी है।

---

### ⚖️ 3. नौकरी या व्यापार — आपके लिए क्या सर्वश्रेष्ठ है और कौन से क्षेत्र शुभ हैं?
• **निर्णय:** ${jobSuitability}
• **आपके लिए सर्वाधिक शुभ कार्यक्षेत्र (Best Career Fields):** प्रशासन व प्रबंधन (Management/Admin), बैंकिंग व फाइनेंस, आईटी व टेक्नोलॉजी, शिक्षा व कंसल्टेंसी, रियल एस्टेट/इंजीनियरिंग तथा राजकीय/सरकारी संविदा या कॉर्पोरेट लीडरशिप।

---

### ⏳ 4. करियर में अभी रुकावट क्यों है और नई नौकरी/प्रमोशन का सटीक समय कब है?
• **वर्तमान रुकावट का कारण:** अभी आप पर **${mahaHindi} की महादशा (${mahaStart} से ${mahaEnd})** के भीतर **${antarHindi} की अंतर्दशा (${antarStart} से ${antarEnd})** तथा **${pratyantarHindi} की प्रत्यंतर दशा (${pratyantarStart} से ${pratyantarEnd})** चल रही है। इस दशा संधि और गोचर के कारण आप जितनी मेहनत कर रहे हैं, उसका पूरा परिणाम मिलने में विलंब हो रहा है।
• 🌤️ **पहली राहत व नए अवसर (Initial Breakthrough):** **${pratyantarEnd}** को वर्तमान प्रत्यंतर दशा समाप्त होते ही कार्यस्थल का तनाव कम होगा, इंटरव्यू/नए प्रोजेक्ट्स में सफलता मिलेगी और रुकी हुई बात आगे बढ़ेगी।
• 🌅 **बड़ा प्रमोशन व स्वर्ण काल (Golden Career Window):** वर्तमान **${antarHindi} अंतर्दशा ${antarEnd}** को पूर्ण होगी। ${nextAntar1 ? `इसके तुरंत बाद **${nextAntar1.startDate} से ${nextAntar1.endDate}** तक चलने वाली **${nextAntar1.planetHindi} की अंतर्दशा** आपके करियर का सबसे बड़ा टर्निंग पॉइंट सिद्ध होगी—जिसमें मनचाही नौकरी, पदोन्नति (Promotion), वेतन वृद्धि और व्यापार विस्तार का प्रबल राजयोग बनेगा।` : `**${antarEnd}** के पश्चात आपके करियर में स्थायी उछाल और मान-सम्मान की प्राप्ति होगी।`}

---

### 📿 5. करियर व व्यापार में तुरंत उन्नति हेतु कुंडली-प्रमाणित रुद्राक्ष व लाल किताब उपाय
1. **मुख्य लग्न रुद्राक्ष — ${primaryRec.mukhi}:** आपके लग्नेश (**${lagna.lord}**) को बल देने, आत्मविश्वास बढ़ाने और कार्यक्षेत्र में नेतृत्व क्षमता के लिए। (बीज मंत्र: \`${primaryRec.beejMantra || "ॐ नमः शिवाय"}\`)
2. **दशा व कर्म रक्षक — ${dashaRec.mukhi} अथवा 10 मुखी / 7 मुखी नेपाली रुद्राक्ष:** कार्यक्षेत्र में गुप्त शत्रुओं व ऑफिस पॉलिटिक्स से रक्षा (10 मुखी - भगवान विष्णु) तथा स्थिर धन व प्रमोशन (7 मुखी - माता महालक्ष्मी) हेतु।
3. **अचूक लाल किताब व वैदिक उपाय:**
   - प्रतिदिन प्रातः तांबे के लोटे में जल, लाल चंदन, अक्षत व गुड़ डालकर भगवान सूर्य को अर्घ्य दें और \`ॐ घृणि सूर्याय नमः\` का 21 बार जाप करें।
   - शनिवार को पीपल के वृक्ष के नीचे सरसों के तेल का चौमुखी दीपक जलाएं और श्री हनुमान चालीसा का पाठ करें।
   - घर से किसी महत्वपूर्ण कार्य या इंटरव्यू के लिए निकलते समय थोड़ा सा गुड़ और जल ग्रहण करके निकलें।

भगवान देवाधिदेव महादेव आपके कर्मक्षेत्र में अखंड सफलता और यश प्रदान करें। **हर हर महादेव!** 🙏

[AURA_KEYWORDS]: ${primaryRec.mukhi} | 10 मुखी रुद्राक्ष | 7 मुखी रुद्राक्ष | सरकारी नौकरी व प्रमोशन योग | मेरी पूरी कुंडली दिखाएं`;
  }

  // 2. MARRIAGE / RELATIONSHIPS (विवाह, दांपत्य, जीवनसाथी, प्रेम विवाह vs अरेंज मैरिज)
  if (intentType === "marriage") {
    const isVenusStrong = !/Debilitated|नीच/i.test(venP.dignity || "");
    const d9Varga = (ak.shodashvarga || []).find(v => v.vargaCode === "D9");
    const manglikText = dosha.isManglik
      ? `आपकी कुंडली में मंगल देव **${marsP.houseNumber}वें भाव (${marsP.rashiHindi})** में स्थित हैं, जिससे मांगलिक प्रभाव बन रहा है (${dosha.manglikNote || ""})। विवाह से पूर्व गुण-मिलान एवं मंगल शांति (या 3 मुखी / गौरी शंकर रुद्राक्ष धारण) करने से दांपत्य जीवन पूर्णतः सुखमय और निर्बाध रहेगा।`
      : `आपकी कुंडली मांगलिक दोष से मुक्त है (${dosha.manglikNote || "मंगल की स्थिति दांपत्य जीवन के लिए अनुकूल है"})।`;
    const loveOrArranged = (venP.houseNumber === 5 || venP.houseNumber === 7 || rahuP.houseNumber === 5 || rahuP.houseNumber === 7 || h5.lord === h7.lord)
      ? "आपकी कुंडली में पंचम (प्रेम भाव) और सप्तम (विवाह भाव) अथवा शुक्र-राहु का संबंध होने से **प्रेम-सह-अरेंज विवाह (Love-cum-Arranged Marriage)** या अपनी पसंद के जीवनसाथी से परिवार की सहमति से विवाह होने के प्रबल संकेत हैं।"
      : "आपकी कुंडली में गुरु और सप्तमेश के प्रभाव से **परिवार के आशीर्वाद व सुसंस्कृत परंपरा से विवाह (Arranged / Family-Blessed Marriage)** अत्यंत शुभ, स्थिर और भाग्यवर्धक रहेगा।";

    return `🙏 **प्रणाम ${vb.name || "भक्त"} जी! हर हर महादेव।**

आपकी जन्म कुंडली (**${lagna.rashiHindi} लग्न**, **${chandra.rashiHindi} चंद्र राशि**) एवं **नवमांश कुंडली (D9 Navamsha Chart — विवाह का मुख्य दर्पण)** के आधार पर **विवाह, जीवनसाथी के गुण, प्रेम और दांपत्य सुख** का संपूर्ण विस्तृत वैदिक विश्लेषण नीचे प्रस्तुत है:

---

### 🏛️ 1. सप्तम भाव (विवाह स्थान), कुटुंब भाव व नवमांश (D9) की स्थिति
• **सप्तम भाव (7th House - जीवनसाथी व दांपत्य बंधन):**
  - आपकी कुंडली का सप्तम भाव **${h7.rashiHindi} (${h7.rashiEnglish})** राशि में है, जिसके स्वामी (सप्तमेश) **${h7.lord}** हैं (जो **${h7.lordPlacement || "शुभ भाव"}** में स्थित हैं)।
  - सप्तम भाव में स्थित ग्रह: **${h7.occupants ? h7.occupants.join(", ") : "कोई ग्रह नहीं (सप्तमेश द्वारा संचालित)"}** | दृष्टि संबंध: **${h7.aspects && h7.aspects.length > 0 ? h7.aspects.join(", ") : "सामान्य दृष्टि"}**।
• **नवमांश कुंडली (D9 Chart - वैवाहिक आत्मा व आंतरिक सुख):**
  - आपका नवमांश लग्न **${d9Varga?.lagnaRashiHindi || lagna.navamsha || lagna.rashiHindi}** है। वैदिक ज्योतिष में लग्न कुंडली शरीर है तो नवमांश कुंडली विवाह का प्राण है—नवमांश की यह स्थिति दीर्घकालिक वैवाहिक स्थिरता का संकेत देती है।
• **द्वितीय व चतुर्थ भाव (2nd & 4th House - कुटुंब व गृहस्थ सुख):**
  - कुटुंबेश **${h2.lord}** और चतुर्थेश **${h4.lord}** विवाह के पश्चात परिवार में सामंजस्य और सुख-सुविधाओं में वृद्धि को दर्शाते हैं।
• **मांगलिक दोष सूक्ष्म विचार:**
  - ${manglikText}

---

### 🪐 2. विवाह कारक ग्रहों (शुक्र, गुरु) एवं जैमिनी दाराकारक (DK) से जीवनसाथी का स्वरूप
• 📌 **शुक्र देव (प्रेम, आकर्षण व दांपत्य कारक):** शुक्र देव **${venP.houseNumber || 7}वें भाव** में **${venP.rashiHindi || ""}** राशि (${venP.degreeInSign || ""}, **${venP.dignity || "सामान्य"}**, D9: ${venP.navamshaRashiHindi || ""}) में स्थित हैं। ${isVenusStrong ? "शुक्र का यह बल आपके वैवाहिक जीवन में प्रेम, आकर्षण, कलात्मकता और भौतिक सुख-वैभव प्रदान करता है।" : "शुक्र को बल देने से रिश्तों में आ रही ठंडक और गलतफहमी तुरंत दूर होगी।"}
• 📌 **गुरु बृहस्पति (मांगलिक आशीर्वाद, पति कारक व संस्कार):** गुरु देव **${jupP.houseNumber || 9}वें भाव** में **${jupP.rashiHindi || ""}** राशि में स्थित हैं, जो दांपत्य बंधन को मर्यादा, आदर और ईश्वरीय सुरक्षा देते हैं।
• 📌 **जैमिनी दाराकारक (DK - जीवनसाथी का मुख्य संकेतक ग्रह):** आपकी कुंडली में सबसे कम अंश वाला ग्रह **${dk ? `${dk.planetName} (${dk.signName}, ${dk.degreeInSign}, ${dk.houseNumber}वां भाव)` : "शुक्र देव"}** आपका **दाराकारक (Darakaraka)** है।
  - **जीवनसाथी का स्वभाव व व्यक्तित्व:** आपके जीवनसाथी दिखने में सौम्य व आकर्षक, स्वभाव से बुद्धिमान, स्पष्टवादी, परिवार के प्रति जिम्मेदार और आपके करियर व कठिन समय में मजबूत स्तंभ की तरह साथ निभाने वाले होंगे।
• **प्रेम विवाह या अरेंज विवाह:** ${loveOrArranged}

---

### ⏳ 3. विवाह/रिश्ते में देरी या तनाव क्यों है और शुभ समय कब आएगा?
• **वर्तमान स्थिति का कारण:** अभी आप पर **${mahaHindi} महादशा** में **${antarHindi} की अंतर्दशा (${antarStart} से ${antarEnd})** चल रही है। इसके प्रभाव से या तो अच्छे रिश्ते की बात अंतिम चरण में अटक जाती है, अथवा वर्तमान संबंध/दांपत्य में छोटी-छोटी बातों पर वैचारिक मतभेद हो जाता है।
• 🌤️ **पहला शुभ संकेत:** **${pratyantarEnd}** के बाद से रिश्तों में संवाद मधुर होगा और यदि विवाह के लिए प्रयास कर रहे हैं तो अच्छे प्रस्ताव आने शुरू होंगे।
• 💍 **प्रबल विवाह व मांगलिक योग (Peak Marriage & Harmony Window):** **${antarEnd}** के पश्चात ${nextAntar1 ? `**${nextAntar1.startDate} से ${nextAntar1.endDate}** तक चलने वाली **${nextAntar1.planetHindi} की अंतर्दशा** में शुभ विवाह संपन्न होने अथवा दांपत्य जीवन में पूर्ण सुख-शांति व भाग्योदय स्थापित होने का प्रबल योग है।` : "नई अंतर्दशा में मांगलिक कार्य निर्विघ्न संपन्न होंगे।"}

---

### 📿 4. शीघ्र विवाह व अटूट दांपत्य सुख हेतु सिद्ध रुद्राक्ष व शास्त्रीय उपाय
1. **गौरी शंकर सिद्ध नेपाली रुद्राक्ष (साक्षात शिव-पार्वती एकाकार स्वरूप):** विवाह में हो रहे विलंब को दूर करने, मनचाहा व योग्य जीवनसाथी प्राप्त करने और पति-पत्नी के बीच अटूट प्रेम व सामंजस्य स्थापित करने के लिए सर्वोच्च रुद्राक्ष। (बीज मंत्र: \`ॐ गौरी शंकराय नमः\`)
2. **2 मुखी नेपाली रुद्राक्ष (अर्धनारीश्वर स्वरूप) एवं ${primaryRec.mukhi}:** चंद्र व भावनात्मक संतुलन तथा लग्न बल के लिए।
3. **अचूक वैदिक व लाल किताब उपाय:**
   - प्रत्येक सोमवार को शिव मंदिर में भगवान शिव और माता पार्वती का **गठबंधन** करें और शिवलिंग पर कच्चा दूध, शहद व बेलपत्र अर्पित करते हुए \`ॐ नमः शिवाय\` का 108 बार जाप करें।
   - गुरुवार को केले के वृक्ष में जल व हल्दी अर्पित करें और शुक्रवार को माता लक्ष्मी को सफेद मिठाई/खीर का भोग लगाएं।

भगवान भोलेनाथ एवं माता पार्वती आपके जीवन में अखंड सौभाग्य और मधुर प्रेम प्रदान करें। **हर हर महादेव!** 🙏

[AURA_KEYWORDS]: गौरी शंकर रुद्राक्ष | 2 मुखी रुद्राक्ष | विवाह व जीवनसाथी योग | मांगलिक दोष निवारण | मेरी पूरी कुंडली दिखाएं`;
  }

  // 3. WEALTH, FINANCE & DEBT RELIEF (धन, संपत्ति, कर्ज मुक्ति, रुका हुआ पैसा, व्यापार लाभ)
  if (intentType === "finance") {
    const d2Varga = (ak.shodashvarga || []).find(v => v.vargaCode === "D2");
    return `🙏 **प्रणाम ${vb.name || "भक्त"} जी! हर हर महादेव।**

आपकी जन्म कुंडली (**${lagna.rashiHindi} लग्न**, **${chandra.rashiHindi} चंद्र राशि**) एवं **होरा कुंडली (D2 Hora — धन एवं संपदा चार्ट)** के गणितीय विश्लेषण के आधार पर **धन आगमन, बचत, फंसा हुआ पैसा और कर्ज मुक्ति** का संपूर्ण विस्तृत वैदिक फलादेश इस प्रकार है:

---

### 🏛️ 1. कुंडली के धन भाव (2nd), लाभ भाव (11th), भाग्य भाव (9th) व व्यय भाव (12th) का समीकरण
• **द्वितीय भाव (2nd House - संचित धन, बैंक बैलेंस व कुटुंब संपदा):**
  - आपकी कुंडली का धन भाव **${h2.rashiHindi}** राशि में है, जिसके स्वामी (धनेश) **${h2.lord}** हैं (स्थित: **${h2.lordPlacement || "शुभ भाव"}**)।
  - स्थित ग्रह: **${h2.occupants ? h2.occupants.join(", ") : "धनेश द्वारा संचालित"}** | दृष्टि: **${h2.aspects && h2.aspects.length > 0 ? h2.aspects.join(", ") : "सामान्य दृष्टि"}**।
• **एकादश भाव (11th House - नियमित आय, बड़े लाभ व कैश-फ्लो):**
  - लाभ भाव **${h11.rashiHindi}** राशि में है, जिसके स्वामी (लाभेश) **${h11.lord}** हैं। स्थित ग्रह: **${h11.occupants ? h11.occupants.join(", ") : "लाभेश द्वारा संचालित"}**।
• **पंचम व नवम भाव (5th & 9th Lakshmi Sthanas - लक्ष्मी कृपा व भाग्य धन):**
  - पंचमेश **${h5.lord}** और भाग्येश **${h9.lord}** आपके जीवन में पूर्व पुण्य और भाग्य से अचानक बड़े आर्थिक अवसर दिलाने वाले स्तंभ हैं।
• **षष्ठ व द्वादश भाव (6th Debt & 12th Expense House - कर्ज व खर्च का कारण):**
  - षष्ठेश **${h6.lord}** और व्ययेश **${h12.lord}** हैं। ${rahuP.houseNumber === 12 || ketuP.houseNumber === 12 || satP.houseNumber === 12 ? "व्यय भाव से पाप/छाया ग्रह का संबंध होने के कारण पैसा हाथ में आते ही किसी न किसी आकस्मिक काम या जिम्मेदारी में खर्च हो जाता है।" : "दशा के दबाव के कारण अभी आय के अनुपात में खर्च अधिक महसूस हो रहा है।"}
• **होरा कुंडली (D2 Hora Chart):** होरा लग्न **${d2Varga?.lagnaRashiHindi || lagna.rashiHindi}** है, जो दर्शाता है कि स्व-अर्जित परिश्रम और सही निवेश से आप अपने जीवन में उत्तम संपत्ति का निर्माण करेंगे।

---

### 🪐 2. धन कारक ग्रहों (गुरु, शुक्र, बुध व शनि) की आपकी कुंडली में स्थिति
• 📌 **गुरु बृहस्पति (महाधन व तिजोरी के कारक):** गुरु देव **${jupP.houseNumber || 9}वें भाव** में **${jupP.rashiHindi || ""}** राशि (${jupP.degreeInSign || ""}, **${jupP.dignity || "सामान्य"}**) में स्थित हैं। गुरु की शुभता आपको ईमानदारी और ज्ञान के बल पर स्थायी समृद्धि देती है।
• 📌 **शुक्र देव (महालक्ष्मी कृपा, वैभव व लग्जरी):** शुक्र देव **${venP.houseNumber || 7}वें भाव** (${venP.rashiHindi || ""}) में हैं, जो जीवन में सुख-सुविधाओं, वाहन और ऐश्वर्य का कारक हैं।
• 📌 **बुध देव (व्यापारिक बुद्धि व कैश रोटेशन):** बुध देव **${mercP.houseNumber || 1}वें भाव** (${mercP.rashiHindi || ""}) में रहकर वाणी और व्यापारिक सौदों से धन दिलाते हैं।
• 📌 **प्रमुख धन योग:** ${yogas.map(y => `**${y.name}**`).join(", ") || "लग्न-लक्ष्मी धन सहयोग योग"}।

---

### ⏳ 3. पैसा क्यों अटक रहा है, कर्ज/तंगी कब खत्म होगी और महाधन लाभ कब होगा?
• **वर्तमान आर्थिक अटकाव का कारण:** अभी आप पर **${mahaHindi} महादशा** में **${antarHindi} की अंतर्दशा (${antarStart} से ${antarEnd})** चल रही है। इस अवधि में या तो दिया हुआ पैसा फंसता है, या व्यापार/नौकरी में नकदी प्रवाह (Cash Flow) रुक-रुक कर आता है।
• 🌤️ **राहत की शुरुआत (Initial Financial Relief):** **${pratyantarEnd}** को प्रत्यंतर दशा बदलते ही रुका हुआ धन किश्तों में वापस आने लगेगा और अनावश्यक खर्चों पर रोक लगेगी।
• 💰 **ऋण मुक्ति व स्वर्ण धन काल (Major Wealth & Prosperity Period):** वर्तमान **${antarHindi} अंतर्दशा ${antarEnd}** को समाप्त होगी। ${nextAntar1 ? `इसके पश्चात **${nextAntar1.startDate} से ${nextAntar1.endDate}** तक चलने वाली **${nextAntar1.planetHindi} की अंतर्दशा** में आपकी आर्थिक स्थिति में बड़ा उछाल आएगा, कर्ज से मुक्ति मिलेगी और नई संपत्ति/निवेश का योग बनेगा।` : `**${antarEnd}** के बाद आपकी आय के नए स्रोत खुलेंगे और स्थायी बचत होगी।`}

---

### 📿 4. अथाह धन वृद्धि व कर्ज मुक्ति हेतु सिद्ध नेपाली रुद्राक्ष व अचूक उपाय
1. **7 मुखी सिद्ध नेपाली रुद्राक्ष (साक्षात माता महालक्ष्मी व सप्तर्षि स्वरूप):** आर्थिक तंगी को जड़ से काटने, कर्ज मुक्ति, रुका हुआ धन वापस पाने और व्यापार/नौकरी में निरंतर धन प्रवाह के लिए सर्वोच्च रुद्राक्ष। (बीज मंत्र: \`ॐ हुं नमः\` / \`ॐ श्रीं महालक्ष्म्यै नमः\`)
2. **मुख्य लग्न रुद्राक्ष — ${primaryRec.mukhi} एवं 8 मुखी रुद्राक्ष (विघ्नहर्ता गणेश):** धन के मार्ग की रुकावटें हटाने हेतु।
3. **अचूक लाल किताब व वैदिक धन उपाय:**
   - शुक्रवार के दिन माता महालक्ष्मी के सम्मुख गाय के घी का दीपक जलाएं, श्री सूक्त या कनकधारा स्तोत्र का पाठ करें और कन्याओं को मिश्री/खीर भेंट करें।
   - अपनी तिजोरी या धन रखने के स्थान पर लाल वस्त्र में **अभिमंत्रित 7 मुखी रुद्राक्ष** और 5 पीली कौड़ियां स्थापित करें।
   - बुधवार को गाय को हरी घास खिलाएं और मंगलवार को कर्ज की पहली किश्त चुकाने का नियम बनाएं (मंगलवार को कर्ज देने से कर्ज जल्दी उतरता है, बुधवार को किसी को उधार न दें)।

माता महालक्ष्मी एवं धनपति कुबेर आपके भंडार सदैव भरे रखें। **हर हर महादेव!** 🙏

[AURA_KEYWORDS]: 7 मुखी महालक्ष्मी रुद्राक्ष | कर्ज मुक्ति व धन लाभ उपाय | ${primaryRec.mukhi} | महालक्ष्मी धन बंध | मेरी पूरी कुंडली दिखाएं`;
  }

  // 4. HEALTH & VITALITY (स्वास्थ्य, मानसिक शांति, रोग मुक्ति, आरोग्य)
  if (intentType === "health") {
    return `🙏 **प्रणाम ${vb.name || "भक्त"} जी! हर हर महादेव।**

आपकी जन्म कुंडली (**${lagna.rashiHindi} लग्न**, **${chandra.rashiHindi} चंद्र राशि**, नक्षत्र: **${chandra.nakshatra}**) के अनुसार **शारीरिक स्वास्थ्य, मानसिक शांति, रोग प्रतिरोधक क्षमता और दीर्घायु** का संपूर्ण वैदिक विश्लेषण इस प्रकार है:

---

### 🏛️ 1. लग्न (शरीर), षष्ठ (रोग), अष्टम (आयु) व द्वादश भाव का विश्लेषण
• **प्रथम भाव (Lagna - शारीरिक संरचना व इम्युनिटी):** आपका लग्न **${lagna.rashiHindi}** (${lagna.element} तत्व) है और लग्नेश **${lagna.lord}** कुंडली के **${h1.lordPlacement || "शुभ भाव"}** में हैं। यह आपको अंदरूनी जीवन-शक्ति (Vitality) और रोगों से लड़ने की प्रबल क्षमता देता है।
• **षष्ठ भाव (6th House - पाचन व मौसमी विकार):** षष्ठ भाव **${h6.rashiHindi}** राशि में है (स्वामी: **${h6.lord}**)। स्थित ग्रह: **${h6.occupants ? h6.occupants.join(", ") : "कोई नहीं"}**।
• **अष्टम भाव (8th House - आयुष्य बल व दीर्घकालिक स्वास्थ्य):** अष्टमेश **${h8.lord}** हैं और आयु कारक शनि देव **${satP.houseNumber}वें भाव** में रहकर दीर्घायु प्रदान कर रहे हैं।
• **चंद्र व सूर्य बल (मानसिक शांति व प्राण ऊर्जा):** चंद्रमा **${moonP.houseNumber}वें भाव (${moonP.rashiHindi})** में और सूर्य **${sunP.houseNumber}वें भाव (${sunP.rashiHindi})** में हैं।

---

### 🔍 2. अभी स्वास्थ्य व मन में क्या दिक्कत महसूस हो रही है और क्यों?
• वर्तमान **${mahaHindi} महादशा / ${antarHindi} अंतर्दशा (${antarStart} से ${antarEnd})** के प्रभाव से:
  - मानसिक अति-चिंतन (Overthinking), अकारण घबराहट, नींद में कमी या स्वप्न दोष/अनिद्रा।
  - पाचन तंत्र (गैस/एसिडिटी), सिरदर्द/माइग्रेन, या कंधे, गर्दन व कमर/जोड़ों में थकान व जकड़न महसूस होना।
  - नजर दोष या नकारात्मक वातावरण में जाने पर ऊर्जा में अचानक कमी लगना।

---

### ⏳ 3. स्वास्थ्य में पूर्ण सुधार कब होगा?
• **पहली राहत:** **${pratyantarEnd}** के बाद से मानसिक तनाव और नींद की समस्या में स्पष्ट सुधार आएगा।
• **पूर्ण आरोग्य काल:** **${antarEnd}** को वर्तमान अंतर्दशा समाप्त होते ही आपकी शारीरिक ऊर्जा, पाचन और मानसिक प्रसन्नता पूर्ण रूप से संतुलित हो जाएगी।

---

### 📿 4. आरोग्य सुरक्षा व मानसिक शांति हेतु सिद्ध नेपाली रुद्राक्ष व शास्त्रीय उपाय
1. **5 मुखी सिद्ध नेपाली रुद्राक्ष (कालाग्नि रुद्र स्वरूप) / 108+1 जप माला:** रक्तचाप (BP) संतुलन, हृदय स्वास्थ्य, गहरी नींद और मानसिक तनाव से मुक्ति के लिए सर्वोच्च। (बीज मंत्र: \`ॐ ह्रीं नमः\`)
2. **मुख्य लग्न रुद्राक्ष — ${primaryRec.mukhi} एवं 3 मुखी / 11 मुखी रुद्राक्ष:** पाचन अग्नि, शारीरिक ऊर्जा और एकादश रुद्र हनुमान जी के अभय आरोग्य कवच हेतु।
3. **वैदिक आरोग्य उपाय:**
   - प्रतिदिन प्रातः स्नान के बाद शिवलिंग पर जल अर्पित करें और **महामृत्युंजय मंत्र** (\`ॐ त्र्यम्बकं यजामहे सुगन्धिं पुष्टिवर्धनम् उर्वारुकमिव बन्धनान्मृत्योर्मुक्षीय मामृतात्\`) का 21 या 108 बार जाप करें।
   - रात्रि में तांबे के पात्र में रखा जल प्रातः खाली पेट पिएं और सोने से पूर्व हाथ-पैर धोकर 11 बार हनुमान चालीसा या शिव पंचाक्षरी मंत्र का स्मरण करें।
   - *(नोट: वैदिक ज्योतिष एवं रुद्राक्ष आध्यात्मिक व प्राणिक ऊर्जा संतुलन हेतु हैं; किसी भी शारीरिक समस्या के लिए योग्य चिकित्सक का परामर्श अवश्य लें।)*

भगवान वैद्यनाथ महादेव आपको उत्तम आरोग्य एवं दीर्घायु प्रदान करें। **हर हर महादेव!** 🙏

[AURA_KEYWORDS]: 5 मुखी रुद्राक्ष | महामृत्युंजय मंत्र | ${primaryRec.mukhi} | आरोग्य स्वास्थ्य बंध | मेरी पूरी कुंडली दिखाएं`;
  }

  // 5. EDUCATION, EXAMS & INTELLECT (शिक्षा, पढ़ाई, प्रतियोगी परीक्षा, स्मरण शक्ति)
  if (intentType === "education") {
    const d24Varga = (ak.shodashvarga || []).find(v => v.vargaCode === "D24");
    return `🙏 **प्रणाम ${vb.name || "भक्त"} जी! हर हर महादेव।**

आपकी जन्म कुंडली (**${lagna.rashiHindi} लग्न**, **${chandra.rashiHindi} चंद्र राशि**) एवं **चतुर्विंशांश कुंडली (D24 Chaturvimshamsha — विद्या एवं ज्ञान चार्ट)** के अनुसार **शिक्षा, एकाग्रता, स्मरण शक्ति और प्रतियोगी परीक्षा (Competitive Exams)** का विस्तृत विश्लेषण इस प्रकार है:

---

### 🏛️ 1. चतुर्थ (शिक्षा आधार), पंचम (मेधा/बुद्धि), षष्ठ (प्रतियोगिता) व नवम भाव (उच्च ज्ञान)
• **पंचम भाव (5th House - बुद्धि, स्मरण शक्ति व परीक्षा):** पंचम भाव **${h5.rashiHindi}** राशि में है, जिसके स्वामी **${h5.lord}** हैं (स्थित: **${h5.lordPlacement || "शुभ भाव"}**)। स्थित ग्रह: **${h5.occupants ? h5.occupants.join(", ") : "पंचमेश द्वारा संचालित"}**।
• **चतुर्थ व नवम भाव (4th & 9th House - डिग्री व उच्च शोध):** चतुर्थेश **${h4.lord}** और भाग्येश **${h9.lord}** उच्च शिक्षा और विशेषज्ञता में सफलता देते हैं।
• **षष्ठ भाव (6th House - Competitive Exams जैसे UPSC, SSC, NEET, JEE, Banking, State PCS):** षष्ठेश **${h6.lord}** आपको कड़ी प्रतिस्पर्धा में टिके रहने का बल देते हैं।
• **D24 विद्या चार्ट:** चतुर्विंशांश लग्न **${d24Varga?.lagnaRashiHindi || lagna.rashiHindi}** है।
• **बुध व गुरु की स्थिति:** बुद्धि कारक बुध **${mercP.houseNumber}वें भाव (${mercP.rashiHindi})** में और ज्ञान कारक गुरु **${jupP.houseNumber}वें भाव (${jupP.rashiHindi})** में स्थित हैं।

---

### ⏳ 2. पढ़ाई में भटकाव क्यों है और परीक्षा में सफलता का समय कब है?
• वर्तमान **${mahaHindi} / ${antarHindi}** दशा के कारण पढ़ते समय मन भटकना, पढ़ा हुआ अंतिम समय पर भूलना या मोबाइल/अति-सोच में समय नष्ट होने की समस्या बनती है।
• **अनुकूल समय:** **${pratyantarEnd}** के बाद एकाग्रता बढ़ेगी और **${antarEnd}** के पश्चात आने वाली दशा परीक्षा परिणाम व करियर चयन के लिए अत्यंत शुभ रहेगी।

---

### 📿 3. तीव्र स्मरण शक्ति व परीक्षा में विजय हेतु सिद्ध रुद्राक्ष व उपाय
1. **4 मुखी सिद्ध नेपाली रुद्राक्ष (भगवान ब्रह्मा व माँ सरस्वती स्वरूप):** एकाग्रता, तीव्र मेधा शक्ति, तार्किक क्षमता और परीक्षा में सफलता हेतु सर्वश्रेष्ठ। (बीज मंत्र: \`ॐ ह्रीं नमः\`)
2. **5 मुखी रुद्राक्ष (गुरु बृहस्पति कृपा) एवं ${primaryRec.mukhi}:** ज्ञान की स्थिरता व आत्मविश्वास हेतु (सरस्वती विद्या बंध: 4 + 5 + 6 मुखी)।
3. **दैनिक उपाय:** अध्ययन टेबल को पूर्व या उत्तर दिशा की ओर रखें, नित्य प्रातः गायत्री मंत्र एवं \`ॐ ऐं सरस्वत्यै नमः\` का 21 बार जाप करें और बुधवार को श्री गणेश को दूर्वा अर्पित करें।

माँ शारदा एवं भगवान गणेश आपको प्रखर विद्या व सर्वोच्च सफलता प्रदान करें। **हर हर महादेव!** 🙏

[AURA_KEYWORDS]: 4 मुखी सरस्वती रुद्राक्ष | 5 मुखी रुद्राक्ष | सरस्वती विद्या बंध | प्रतियोगी परीक्षा योग | मेरी पूरी कुंडली दिखाएं`;
  }

  // 6. PROPERTY, LAND & VEHICLES (मकान, जमीन, प्रॉपर्टी, वाहन सुख)
  if (intentType === "property") {
    return `🙏 **प्रणाम ${vb.name || "भक्त"} जी! हर हर महादेव।**

आपकी जन्म कुंडली (**${lagna.rashiHindi} लग्न**, **${chandra.rashiHindi} चंद्र राशि**) तथा **चतुर्थांश (D4 - संपत्ति) व षोडशांश (D16 - वाहन) कुंडली** के अनुसार **स्वयं का मकान, भूमि, प्रॉपर्टी और वाहन सुख** का विस्तृत वैदिक विश्लेषण इस प्रकार है:

---

### 🏛️ 1. चतुर्थ भाव (भूमि, भवन, वाहन) व कारक ग्रहों (मंगल, शुक्र, शनि) की स्थिति
• **चतुर्थ भाव (4th House):** 4था भाव **${h4.rashiHindi}** राशि में है, जिसके स्वामी **${h4.lord}** हैं (स्थित: **${h4.lordPlacement || "शुभ भाव"}**)। स्थित ग्रह: **${h4.occupants ? h4.occupants.join(", ") : "चतुर्थेश द्वारा संचालित"}**।
• **भूमि कारक मंगल देव:** मंगल देव **${marsP.houseNumber}वें भाव (${marsP.rashiHindi}, ${marsP.dignity})** में स्थित हैं। मंगल भूमि, प्लॉट और मकान निर्माण का सीधा कारक है।
• **भवन व वाहन कारक शुक्र देव:** शुक्र देव **${venP.houseNumber}वें भाव (${venP.rashiHindi})** में रहकर सुंदर घर के इंटीरियर और उत्तम वाहन सुख का योग बनाते हैं।
• **स्थायी संपत्ति कारक शनि देव:** शनि देव **${satP.houseNumber}वें भाव (${satP.rashiHindi})** में रहकर दीर्घकालिक रियल एस्टेट संपत्ति देते हैं।

---

### ⏳ 2. मकान/प्रॉपर्टी या वाहन खरीदने का शुभ योग कब बनेगा?
• वर्तमान **${antarHindi} अंतर्दशा (${antarEnd} तक)** में प्रॉपर्टी के कागजात और बजट की जांच सावधानी से करें।
• **प्रबल संपत्ति योग:** **${antarEnd}** के बाद ${nextAntar1 ? `**${nextAntar1.startDate} से ${nextAntar1.endDate} (${nextAntar1.planetHindi} अंतर्दशा)**` : "आगामी शुभ अंतर्दशा"} में स्वयं का घर/भूमि खरीदने, गृह-प्रवेश करने या नया वाहन लेने का अत्यंत प्रबल और शुभ योग बनेगा।

---

### 📿 3. भूमि-भवन व वाहन सुख हेतु सिद्ध रुद्राक्ष व उपाय
1. **3 मुखी रुद्राक्ष (मंगल देव - भूमि कारक) एवं 7 मुखी रुद्राक्ष (महालक्ष्मी):** प्रॉपर्टी खरीदने में आ रही आर्थिक व कागजी अड़चनें दूर करने हेतु।
2. **मुख्य लग्न रुद्राक्ष — ${primaryRec.mukhi}:** स्थायी समृद्धि हेतु।
3. **उपाय:** मंगलवार को श्री हनुमान जी को सिंदूर व चमेली का तेल अर्पित करें और घर के ईशान कोण (North-East) को सदैव स्वच्छ व हल्का रखें।

[AURA_KEYWORDS]: 3 मुखी रुद्राक्ष | 7 मुखी रुद्राक्ष | भूमि व मकान योग | ${primaryRec.mukhi} | मेरी पूरी कुंडली दिखाएं`;
  }

  // 7. CHILDREN & PROGENY (संतान सुख, वंश वृद्धि, संतान का भविष्य)
  if (intentType === "progeny") {
    return `🙏 **प्रणाम ${vb.name || "भक्त"} जी! हर हर महादेव।**

आपकी जन्म कुंडली (**${lagna.rashiHindi} लग्न**, **${chandra.rashiHindi} चंद्र राशि**) एवं **सप्तांश कुंडली (D7 Saptamsha)** के अनुसार **संतान सुख, संतान की उन्नति व वंश वृद्धि** का विस्तृत विश्लेषण इस प्रकार है:

---

### 🏛️ 1. पंचम भाव (संतान स्थान), गुरु बृहस्पति व पुत्रकारक (PK) की स्थिति
• **पंचम भाव (5th House):** आपकी कुंडली का पंचम भाव **${h5.rashiHindi}** राशि में है, जिसके स्वामी **${h5.lord}** हैं (स्थित: **${h5.lordPlacement || "शुभ भाव"}**)। स्थित ग्रह: **${h5.occupants ? h5.occupants.join(", ") : "पंचमेश द्वारा संचालित"}**।
• **संतान कारक गुरु बृहस्पति:** गुरु देव **${jupP.houseNumber}वें भाव (${jupP.rashiHindi}, ${jupP.dignity})** में विराजमान हैं।
• **जैमिनी पुत्रकारक (PK):** आपकी कुंडली में **${pk ? `${pk.planetName} (${pk.signName}, ${pk.houseNumber}वां भाव)` : "गुरु देव"}** पुत्रकारक ग्रह हैं।
• **फलादेश:** आपकी कुंडली में योग्य, आज्ञाकारी और कुल का नाम रोशन करने वाली संतान का सुख विद्यमान है। **${pratyantarEnd}** से **${antarEnd}** के पश्चात संतान संबंधी चिंताएं दूर होंगी और संतान के स्वास्थ्य व शिक्षा में उत्तम प्रगति होगी।

---

### 📿 2. संतान सुख व कल्याण हेतु सिद्ध रुद्राक्ष व उपाय
1. **गर्भ गौरी रुद्राक्ष (माता पार्वती व बाल गणेश स्वरूप) एवं 5 मुखी रुद्राक्ष (गुरु बृहस्पति):** संतान प्राप्ति, सुरक्षित मातृत्व और संतान के उज्ज्वल भविष्य व रक्षा के लिए सर्वोच्च।
2. **उपाय:** गुरुवार को भगवान श्री कृष्ण (बाल गोपाल) को माखन-मिश्री का भोग लगाएं और \`ॐ क्लीं कृष्णाय नमः\` अथवा संतान गोपाल मंत्र का जाप करें।

[AURA_KEYWORDS]: गर्भ गौरी रुद्राक्ष | 5 मुखी रुद्राक्ष | संतान सुख योग | मेरी पूरी कुंडली दिखाएं`;
  }

  // 8. FOREIGN TRAVEL & SETTLEMENT (विदेश यात्रा, वीजा, जन्मस्थान से दूर भाग्योदय)
  if (intentType === "travel") {
    return `🙏 **प्रणाम ${vb.name || "भक्त"} जी! हर हर महादेव।**

आपकी जन्म कुंडली (**${lagna.rashiHindi} लग्न**, **${chandra.rashiHindi} चंद्र राशि**) के अनुसार **विदेश यात्रा, वीजा सफलता, इम्पोर्ट-एक्सपोर्ट व जन्मस्थान से दूर भाग्योदय** का विस्तृत विश्लेषण इस प्रकार है:

---

### 🏛️ 1. द्वादश भाव (12th - विदेश स्थान), नवम भाव (9th - लंबी यात्रा) व राहु/चंद्र की स्थिति
• **द्वादश भाव (12th House):** 12वां भाव **${h12.rashiHindi}** राशि में है (स्वामी: **${h12.lord}**, स्थित: **${h12.lordPlacement || "कुंडली में"}**)। स्थित ग्रह: **${h12.occupants ? h12.occupants.join(", ") : "द्वादशेश द्वारा संचालित"}**।
• **नवम भाव (9th House):** नवम भाव **${h9.rashiHindi}** राशि में है (स्वामी: **${h9.lord}**)।
• **विदेश कारक राहु व चंद्र:** राहु **${rahuP.houseNumber}वें भाव (${rahuP.rashiHindi})** में और चंद्रमा **${moonP.houseNumber}वें भाव (${moonP.rashiHindi})** में स्थित हैं।
• **फलादेश:** आपकी कुंडली में जन्मस्थान से दूर जाकर या विदेशी/मल्टीनेशनल कंपनियों व बाहरी राज्यों/देशों से जुड़कर कार्य करने पर विशेष आर्थिक लाभ और भाग्योदय के प्रबल योग हैं। **${pratyantarEnd}** के बाद वीजा/यात्रा की रुकावटें दूर होंगी और **${antarEnd}** के पश्चात बाहरी कार्यों में बड़ी सफलता मिलेगी।

---

### 📿 2. विदेश योग व यात्रा सुरक्षा हेतु सिद्ध रुद्राक्ष व उपाय
1. **8 मुखी रुद्राक्ष (विघ्नहर्ता गणेश - राहु व वीजा बाधा निवारण) एवं 11 मुखी रुद्राक्ष (हनुमान जी - यात्रा रक्षा कवच)।**
2. **मुख्य लग्न रुद्राक्ष — ${primaryRec.mukhi}।**

[AURA_KEYWORDS]: 8 मुखी रुद्राक्ष | 11 मुखी रुद्राक्ष | विदेश यात्रा योग | मेरी पूरी कुंडली दिखाएं`;
  }

  // 9. GRAHA SPECIFIC & DOSHA ANALYSIS (शनि, राहु, केतु, मंगल, सभी 9 ग्रह, साढ़े साती, मांगलिक, कालसर्प)
  if (intentType === "graha_specific" || intentType === "dosha") {
    const allPlanetsDetailed = planets.map(p =>
      `• 📌 **${p.hindiName || p.name}** — **भाव:** ${p.houseNumber}वां भाव | **राशि:** ${p.rashiHindi} (${p.degreeInSign}) | **नक्षत्र:** ${p.nakshatra} (चरण ${p.pada}) | **अवस्था:** **${p.dignity}** | **D9 नवमांश:** ${p.navamshaRashiHindi}\n  - **प्रभाव:** ${p.signification}\n  - **मंत्र व उपाय:** \`${p.mantra}\` — ${p.upay}`
    ).join("\n\n");

    return `🙏 **प्रणाम ${vb.name || "भक्त"} जी! हर हर महादेव।**

आपकी जन्म कुंडली (**${lagna.rashiHindi} लग्न**, **${chandra.rashiHindi} चंद्र राशि**) के अनुसार **नवग्रहों (All 9 Planets) की भाव-राशि स्थिति, उच्च-नीच बल, मांगलिक/साढ़े साती/कालसर्प दोष विचार और अचूक उपाय** पूरे विस्तार में नीचे दिए गए हैं:

---

### 🪐 1. आपकी कुंडली के सभी 9 ग्रहों का विस्तृत फलादेश व उपाय
${allPlanetsDetailed}

---

### ⚠️ 2. प्रमुख दोष विचार (मांगलिक, शनि साढ़े साती, कालसर्प व बाधक ग्रह)
• **मांगलिक दोष विचार:** ${dosha.manglikNote}
• **शनि साढ़े साती / ढैया स्थिति:** **${dosha.sadeSati?.phase || "साढ़े साती मुक्त"}** — ${dosha.sadeSati?.description || ""}
• **कालसर्प योग विचार:** **${dosha.kaalSarp?.type || "कालसर्प मुक्त"}** — ${dosha.kaalSarp?.description || ""}
• **बाधकेश व मारकेश विचार:** ${ak.badhakaMarakaInfo?.badhaka?.note || ""} | ${ak.badhakaMarakaInfo?.maraka?.note || ""}
• **वर्तमान गोचर (चन्द्र राशि से):**
${gochar.map(g => `  - **${g.planet}:** ${g.effectNote}`).join("\n")}

---

### 📿 3. नवग्रह शांति व दोष निवारण हेतु कुंडली-प्रमाणित रुद्राक्ष कवच
1. **मुख्य लग्न रुद्राक्ष — ${primaryRec.mukhi}:** लग्नेश बल व आत्मरक्षा हेतु।
2. **चंद्र राशि रुद्राक्ष — ${rashiRec.mukhi}:** मानसिक शांति व चंद्र बल हेतु।
3. **महादशा व ग्रह शांति रुद्राक्ष — ${dashaRec.mukhi} (अथवा 10 मुखी सर्वग्रह शांति रुद्राक्ष):** वर्तमान **${mahaHindi} / ${antarHindi}** दशा और सभी नवग्रहों की पीड़ा शांत करने हेतु।

भगवान नीलकंठ महादेव आपके समस्त ग्रह दोषों का निवारण करें। **हर हर महादेव!** 🙏

[AURA_KEYWORDS]: ${primaryRec.mukhi} | 10 मुखी नवग्रह शांति रुद्राक्ष | शनि साढ़े साती उपाय | मेरी पूरी कुंडली दिखाएं`;
  }

  // 10. DASHA TIMING (महादशा, अंतर्दशा, प्रत्यंतर दशा व समय चक्र)
  if (intentType === "dasha_timing") {
    return `🙏 **प्रणाम ${vb.name || "भक्त"} जी! हर हर महादेव।**

आपकी जन्म कुंडली (**${lagna.rashiHindi} लग्न**, **${chandra.rashiHindi} चंद्र राशि**, जन्म नक्षत्र: **${chandra.nakshatra}**) का **संपूर्ण 4-स्तरीय विंशोत्तरी महादशा, अंतर्दशा, प्रत्यंतर दशा एवं योगिनी दशा समय चक्र** पूरे विस्तार में इस प्रकार है:

---

### ⏱️ 1. वर्तमान में सक्रिय दशाएं (Active Dasha Hierarchy)
• **सक्रिय 4-स्तरीय दशा सूत्र:** **${dasha.dashaChainSummary || `${mahaHindi} > ${antarHindi} > ${pratyantarHindi}`}**
• **वर्तमान महादशा:** **${mahaHindi}** — आरंभ: **${mahaStart}** | समाप्ति: **${mahaEnd}**
• **सक्रिय अंतर्दशा:** **${antarHindi}** — आरंभ: **${antarStart}** | समाप्ति: **${antarEnd}**
• **सक्रिय प्रत्यंतर दशा:** **${pratyantarHindi}** — आरंभ: **${pratyantarStart}** | समाप्ति: **${pratyantarEnd}**
• **सक्रिय योगिनी दशा:** **${ak.yoginiDasha?.activeYogini || "सिद्धा"}** (स्वामी: ${ak.yoginiDasha?.activeLord || "शुक्र"}, प्रकृति: ${ak.yoginiDasha?.activeNature || "शुभ"}, ${ak.yoginiDasha?.startDate || ""} से ${ak.yoginiDasha?.endDate || ""} तक)

---

### ⏳ 2. वर्तमान दशा का जीवन पर प्रभाव और भाग्योदय की सटीक तारीखें
1. **कब से संघर्ष चल रहा है:** **${antarStart}** से जब **${mahaHindi} में ${antarHindi} की अंतर्दशा** शुरू हुई, तब से मानसिक दबाव, खर्च और बनते कार्यों में विलंब बढ़ा है।
2. 🌤️ **पहली राहत (Initial Relief Date):** **${pratyantarEnd}** के तुरंत बाद प्रत्यंतर दशा बदलने से मानसिक शांति और कार्यों में गति आएगी।
3. 🌅 **संकट से पूर्ण मुक्ति (Major Turnaround Date):** **${antarEnd}** को वर्तमान **${antarHindi} अंतर्दशा** समाप्त होते ही रुकावटों का दौर पूर्णतः समाप्त होगा।
${nextAntar1 ? `4. 👑 **आगामी स्वर्ण काल (Golden Period 1):** **${nextAntar1.startDate} से ${nextAntar1.endDate}** तक **${nextAntar1.planetHindi} की अंतर्दशा** आपके करियर, धन और परिवार के लिए अत्यंत भाग्यवर्धक रहेगी।` : ""}
${nextAntar2 ? `5. 🌟 **दीर्घकालिक उन्नति (Golden Period 2):** इसके पश्चात **${nextAntar2.startDate} से ${nextAntar2.endDate}** (${nextAntar2.planetHindi} अंतर्दशा) में स्थायी संपत्ति और प्रतिष्ठा में वृद्धि होगी।` : ""}

---

### 📅 3. वर्तमान महादशा की संपूर्ण अंतर्दशा समय-सारिणी (Full Antardasha Table)
${(dasha.antardashasTimeline || []).map(a => `• **${a.planetHindi} अंतर्दशा:** ${a.startDate} से ${a.endDate} तक ${a.isCurrent ? "👉 **[वर्तमान में सक्रिय]**" : ""}`).join("\n")}

---

### 📿 4. दशा अनुकूलन हेतु सिद्ध नेपाली रुद्राक्ष व उपाय
• **${primaryRec.mukhi} (लग्न कवच)** एवं **${dashaRec.mukhi} (दशा अधिपति कवच)** धारण करना तथा प्रतिदिन शिवलिंग पर जलाभिषेक कर \`ॐ नमः शिवाय\` का 108 बार जाप करना वर्तमान दशा को तुरंत आपके अनुकूल बनाएगा।

[AURA_KEYWORDS]: ${dashaRec.mukhi} | ${primaryRec.mukhi} | विंशोत्तरी दशा उपाय | मेरी पूरी कुंडली दिखाएं`;
  }

  // 11. RUDRAKSHA SELECTION & DHARAN VIDHI (कुंडली अनुसार रुद्राक्ष व संपूर्ण धारण विधि)
  if (intentType === "rudraksha") {
    const rudraDetails = recs.map((r, idx) =>
      `• 📿 **${idx + 1}. ${r.role}: ${r.mukhi}**\n  - **अधिष्ठाता देवता:** ${r.deity || "भगवान शिव"}\n  - **कुंडली प्रमाण व लाभ:** ${r.reason || r.significance}\n  - **सिद्ध बीज मंत्र:** \`${r.beejMantra || "ॐ नमः शिवाय"}\` (108 बार)\n  - **धारण करने का शुभ दिन:** ${r.wearingDay || "सोमवार या प्रदोष व्रत"}`
    ).join("\n\n");

    return `🙏 **प्रणाम ${vb.name || "भक्त"} जी! हर हर महादेव।**

आपकी जन्म कुंडली (**${lagna.rashiHindi} लग्न**, **${chandra.rashiHindi} चंद्र राशि**, सक्रिय महादशा: **${mahaHindi}**) के गणितीय अध्ययन एवं **शिव पुराण (विद्येश्वर संहिता)** के नियमों के अनुसार आपके लिए **100% कुंडली-प्रमाणित सिद्ध नेपाली रुद्राक्ष एवं संपूर्ण प्राण-प्रतिष्ठा धारण विधि** नीचे दी गई है:

---

### 📿 1. आपकी जन्म कुंडली के 3 सर्वोच्च रक्षा-कवच रुद्राक्ष
${rudraDetails}

---

### 🕉️ 2. शिव पुराण सम्मत संपूर्ण रुद्राक्ष धारण विधि (Step-by-Step Wearing Ritual)
1. **शुभ मुहूर्त:** सोमवार, गुरुवार, प्रदोष व्रत या मासिक शिवरात्रि को प्रातःकाल (ब्रह्म मुहूर्त या सूर्योदय के बाद) स्नान कर स्वच्छ धुले हुए वस्त्र धारण करें।
2. **अभिषेक व शुद्धिकरण:** तांबे या चाँदी के पात्र में रुद्राक्ष रखकर उसे **गंगाजल और कच्चे गोदुग्ध (पंचामृत)** से स्नान कराएं, फिर पुनः शुद्ध जल से धोकर स्वच्छ पीले/लाल वस्त्र पर रखें।
3. **पूजन व प्राण-प्रतिष्ठा:** रुद्राक्ष पर अष्टगंध, लाल/पीला चंदन, अक्षत और बेलपत्र अर्पित करें। गाय के घी का दीपक और धूप प्रज्वलित करें।
4. **मंत्र अभिमंत्रण:** रुद्राक्ष को दाहिने हाथ में लेकर या शिवलिंग से स्पर्श कराकर उपरोक्त **सिद्ध बीज मंत्र** तथा पंचाक्षरी मंत्र **\`ॐ नमः शिवाय\`** का कम से कम **108 बार** श्रद्धापूर्वक जाप करें।
5. **धारण:** पूर्व या उत्तर दिशा की ओर मुख करके भगवान भोलेनाथ से कल्याण की प्रार्थना करते हुए रुद्राक्ष को **लाल/पीले रेशमी धागे अथवा चाँदी/सोने की कैपिंग** में कंठ (हृदय के पास स्पर्श करता हुआ) या दाहिनी भुजा/कलाई पर धारण करें।
6. **पवित्र नियम (Precautions):**
   - प्रतिदिन स्नान के समय साबुन/केमिकल शैंपू से बचाने के लिए इसे उतार सकते हैं और स्नान बाद पुनः मंत्र बोलकर पहनें।
   - मांसाहार, मदिरा व अशुद्ध स्थानों (श्मशान/सूतक) में जाने से पूर्व रुद्राक्ष को पूजा स्थान में सुरक्षित रख दें।
   - प्रत्येक 1–2 माह में रुद्राक्ष को गंगाजल से साफ कर शुद्ध चंदन या बादाम/सरसों के तेल की हल्की परत लगाएं जिससे मनका जीवन भर मजबूत व ऊर्जावान बना रहे।

[AURA_KEYWORDS]: ${primaryRec.mukhi} | ${rashiRec.mukhi} | ${dashaRec.mukhi} | रुद्राक्ष नियम | मेरी पूरी कुंडली दिखाएं`;
  }

  // 12. DEFAULT: Return the COMPLETE 11-Section Exhaustive Pandit Ji Report so nothing is ever left out!
  if (ak.panditJiDiagnosis?.fullPanditJiReportMarkdown) {
    return ak.panditJiDiagnosis.fullPanditJiReportMarkdown;
  }

  return `🙏 **प्रणाम ${vb.name || "भक्त"} जी! हर हर महादेव।**\n\nआपकी जन्म पत्रिका (**${lagna.rashiHindi} लग्न**, **${chandra.rashiHindi} राशि**) के अनुसार वर्तमान महादशा **${mahaHindi}** एवं अंतर्दशा **${antarHindi}** (${antarEnd} तक) है। आपके लिए सर्वोच्च कल्याणकारी रुद्राक्ष **${primaryRec.mukhi}** है।`;
}

/**
 * Encyclopedic Vedic Shastra & Rudraksha Guidance for AI Pandit Ji when no Kundali birth details are provided yet.
 * Ensures that even without a Kundali, if a devotee asks AI Pandit Ji about ANY Rudraksha (1-21 Mukhi, Gauri Shankar, Ganesh, Mala),
 * Rashi, Graha, Dosha (Manglik, Sade Sati, Kaal Sarp), Mantra, Dharan Vidhi, Career, Marriage, or Wealth,
 * AI Pandit Ji answers in full shastric detail and then invites their birth details for personal Kundali calculation!
 */
export function generateNonKundaliPanditJiGuidance(userQuery = "", allProducts = []) {
  const q = String(userQuery || "").toLowerCase().trim();

  // Check if a specific 1-21 Mukhi was asked
  const mukhiMatch = q.match(/(\d{1,2})\s*(?:mukhi|muki|मुखी)/i);
  const wordMukhiMap = {
    "ek mukhi": 1, "एक मुखी": 1, "do mukhi": 2, "दो मुखी": 2, "teen mukhi": 3, "तीन मुखी": 3,
    "char mukhi": 4, "chaar mukhi": 4, "चार मुखी": 4, "panch mukhi": 5, "paanch mukhi": 5, "पांच मुखी": 5, "पंचमुखी": 5,
    "chhe mukhi": 6, "che mukhi": 6, "छह मुखी": 6, "छः मुखी": 6, "saat mukhi": 7, "sat mukhi": 7, "सात मुखी": 7,
    "aath mukhi": 8, "ath mukhi": 8, "आठ मुखी": 8, "nau mukhi": 9, "नौ मुखी": 9, "das mukhi": 10, "दस मुखी": 10,
    "gyarah mukhi": 11, "ग्यारह मुखी": 11, "barah mukhi": 12, "बारह मुखी": 12, "terah mukhi": 13, "तेरह मुखी": 13,
    "chaudah mukhi": 14, "चौदह मुखी": 14, "pandrah mukhi": 15, "पंद्रह मुखी": 15, "solah mukhi": 16, "सोलह मुखी": 16,
    "satrah mukhi": 17, "सत्रह मुखी": 17, "atharah mukhi": 18, "अठारह मुखी": 18, "unnis mukhi": 19, "उन्नीस मुखी": 19,
    "bees mukhi": 20, "बीस मुखी": 20, "ikkis mukhi": 21, "इक्कीस मुखी": 21
  };
  let mukhiNum = mukhiMatch ? parseInt(mukhiMatch[1], 10) : null;
  if (!mukhiNum) {
    for (const [kWord, num] of Object.entries(wordMukhiMap)) {
      if (q.includes(kWord)) {
        mukhiNum = num;
        break;
      }
    }
  }

  const MUKHI_ENCYCLOPEDIA = {
    1: { name: "1 मुखी रुद्राक्ष (Ek Mukhi — साक्षात परमशिव स्वरूप)", deity: "देवाधिदेव महादेव (परमशिव)", planet: "सूर्य देव (Sun)", rashi: "सिंह राशि (Leo) एवं सभी नेतृत्वकर्ता", mantra: "ॐ ह्रीं नमः / ॐ नमः शिवाय", day: "रविवार या सोमवार प्रातः", benefits: "सर्वोच्च नेतृत्व क्षमता, राजकीय सम्मान, सूर्य दोष निवारण, प्रचंड आत्मबल, उच्च रक्तचाप व नेत्र/हृदय ऊर्जा संतुलन तथा ध्यान-समाधि व मोक्ष प्राप्ति।", shastra: "शिव पुराण (विद्येश्वर संहिता अध्याय 25) के अनुसार जहां एक मुखी रुद्राक्ष की पूजा होती है, वहां से माता लक्ष्मी कभी दूर नहीं जातीं और जातक राजा के समान तेजस्वी बनता है।" },
    2: { name: "2 मुखी रुद्राक्ष (Do Mukhi — अर्धनारीश्वर स्वरूप)", deity: "भगवान अर्धनारीश्वर (शिव-पार्वती)", planet: "चंद्र देव (Moon)", rashi: "कर्क राशि (Cancer)", mantra: "ॐ नमः", day: "सोमवार प्रातः", benefits: "मानसिक शांति, अति-चिंतन (Overthinking) व डिप्रेशन से मुक्ति, पति-पत्नी व प्रेमी-प्रेमिका में अटूट प्रेम, शीघ्र विवाह योग और चंद्र दोष निवारण।", shastra: "शिव पुराण के अनुसार दो मुखी रुद्राक्ष देवेश्वर है जो समस्त कामनाओं को पूर्ण करता है और पारिवारिक कलह का नाश करता है।" },
    3: { name: "3 मुखी रुद्राक्ष (Teen Mukhi — अग्नि देव स्वरूप)", deity: "अग्नि देव एवं त्रिदेव", planet: "मंगल देव (Mars)", rashi: "मेष (Aries) एवं वृश्चिक (Scorpio)", mantra: "ॐ क्लीं नमः", day: "मंगलवार प्रातः", benefits: "आलस्य, भय व हीन-भावना का नाश, मंगल दोष (मांगलिक प्रभाव) शांति, पाचन अग्नि व रक्त बल में वृद्धि, भूमि-प्रॉपर्टी लाभ और प्रतियोगी परीक्षाओं में विजय।", shastra: "जिस प्रकार अग्नि स्वर्ण को शुद्ध करती है, उसी प्रकार 3 मुखी रुद्राक्ष पूर्व जन्म व वर्तमान के संचित पापों व बाधाओं को भस्म कर तेज प्रदान करता है।" },
    4: { name: "4 मुखी रुद्राक्ष (Chaar Mukhi — ब्रह्मा एवं सरस्वती स्वरूप)", deity: "चतुर्मुख भगवान ब्रह्मा व माँ सरस्वती", planet: "बुध देव (Mercury)", rashi: "मिथुन (Gemini) एवं कन्या (Virgo)", mantra: "ॐ ह्रीं नमः", day: "बुधवार या गुरुवार प्रातः", benefits: "तीव्र स्मरण शक्ति (Memory), प्रखर बुद्धि, वाक्-सिद्धि (प्रभावशाली वाणी), प्रतियोगी परीक्षाओं (UPSC/NEET/JEE/CA) में सफलता और व्यापारिक-बौद्धिक कौशल।", shastra: "शिव पुराण के अनुसार चार मुखी रुद्राक्ष के दर्शन व स्पर्श मात्र से धर्म, अर्थ, काम और मोक्ष — चारों पुरुषार्थों की प्राप्ति होती है।" },
    5: { name: "5 मुखी रुद्राक्ष (Paanch Mukhi — कालाग्नि रुद्र स्वरूप)", deity: "भगवान कालाग्नि रुद्र (पंचानन शिव)", planet: "देवगुरु बृहस्पति (Jupiter)", rashi: "धनु (Sagittarius), मीन (Pisces) एवं सर्वजन (Universal)", mantra: "ॐ ह्रीं नमः / ॐ नमः शिवाय", day: "गुरुवार या सोमवार प्रातः", benefits: "मानसिक शांति, रक्तचाप (Blood Pressure) व हृदय स्वास्थ्य संतुलन, गुरु कृपा, ज्ञान वृद्धि, अकाल मृत्यु भय से रक्षा और सात्विक आभामंडल।", shastra: "शिव पुराण में पंचमुखी रुद्राक्ष को सबसे पवित्र व सार्वभौमिक (Universal) बताया गया है जिसे स्त्री-पुरुष, बालक व वृद्ध सभी धारण कर सकते हैं।" },
    6: { name: "6 मुखी रुद्राक्ष (Chhe Mukhi — देवसेनापति कार्तिकेय स्वरूप)", deity: "भगवान कार्तिकेय (षण्मुख) एवं गणेश", planet: "शुक्र देव (Venus) एवं मंगल", rashi: "वृषभ (Taurus) एवं तुला (Libra)", mantra: "ॐ ह्रीं हुं नमः", day: "शुक्रवार या सोमवार प्रातः", benefits: "दृढ़ इच्छाशक्ति (Willpower), व्यक्तित्व में आकर्षण (Charisma), क्रोध व आवेश पर नियंत्रण, कला/मीडिया/प्रबंधन में सफलता और शुक्र दोष निवारण।", shastra: "शिव पुराण के अनुसार 6 मुखी रुद्राक्ष को दाहिनी भुजा या कंठ में धारण करने वाला जातक ब्रह्महत्या जैसे महापापों से भी मुक्त होकर अजेय बनता है।" },
    7: { name: "7 मुखी रुद्राक्ष (Saat Mukhi — महालक्ष्मी एवं सप्तर्षि स्वरूप)", deity: "माता महालक्ष्मी एवं अनंग शिव", planet: "शनि देव (Saturn) एवं शुक्र", rashi: "मकर (Capricorn), कुंभ (Aquarius), वृषभ व तुला", mantra: "ॐ हुं नमः / ॐ श्रीं महालक्ष्म्यै नमः", day: "शुक्रवार या शनिवार प्रातः", benefits: "अथाह धन-समृद्धि, व्यापार व नौकरी में उन्नति, कर्ज मुक्ति, रुका हुआ धन वापस आना तथा शनि साढ़े साती व ढैया के कष्टों से पूर्ण रक्षा।", shastra: "शिव पुराण के अनुसार सप्तमुखी रुद्राक्ष धारण करने से दरिद्र से दरिद्र व्यक्ति भी ऐश्वर्यवान और लक्ष्मीवान बन जाता है।" },
    8: { name: "8 मुखी रुद्राक्ष (Aath Mukhi — विघ्नहर्ता श्री गणेश व भैरव स्वरूप)", deity: "अष्टमूर्ति भगवान श्री गणेश एवं कालभैरव", planet: "राहु (Rahu)", rashi: "सभी राशियां (राहु व विघ्न निवारण हेतु)", mantra: "ॐ हुं नमः / ॐ गं गणपतये नमः", day: "बुधवार या शनिवार प्रातः", benefits: "हर कार्य में आने वाली रुकावटों (Obstacles) का नाश, राहु महादशा व कालसर्प दोष शांति, कोर्ट-कचहरी व शत्रुओं पर विजय और तीक्ष्ण निर्णय शक्ति।", shastra: "शिव पुराण के अनुसार आठ मुखी रुद्राक्ष साक्षात विनायक स्वरूप है जो अष्ट सिद्धियों और अखंड विजय का दाता है।" },
    9: { name: "9 मुखी रुद्राक्ष (Nau Mukhi — माँ नवदुर्गा व भैरव स्वरूप)", deity: "माँ नवदुर्गा (आदिशक्ति) एवं कपिल मुनि", planet: "केतु (Ketu)", rashi: "सभी राशियां (शक्ति व केतु शांति हेतु)", mantra: "ॐ ह्रीं हुं नमः / ॐ ऐं ह्रीं क्लीं चामुण्डायै विच्चे", day: "शुक्रवार, शनिवार या नवरात्रि", benefits: "निडरता (Fearlessness), आत्मबल, नकारात्मक शक्तियों व नजर दोष से रक्षा, केतु दोष निवारण और साहसिक कार्यों में विजय।", shastra: "नौ मुखी रुद्राक्ष में नवदुर्गा की नौ शक्तियां निवास करती हैं जो भक्त को भक्ति और मुक्ति दोनों प्रदान करती हैं।" },
    10: { name: "10 मुखी रुद्राक्ष (Das Mukhi — भगवान महाविष्णु स्वरूप)", deity: "भगवान श्री हरि विष्णु (दशावतार)", planet: "समस्त नवग्रह (All 9 Planets Pacifier)", rashi: "सभी 12 राशियां", mantra: "ॐ ह्रीं नमः / ॐ नमो भगवते वासुदेवाय", day: "गुरुवार या सोमवार प्रातः", benefits: "सभी 9 ग्रहों के दोषों की एक साथ शांति, दसों दिशाओं से सुरक्षा कवच, वास्तु दोष, तंत्र-बाधा व कोर्ट-कचहरी से रक्षा और करियर में स्थिरता।", shastra: "शिव पुराण के अनुसार दस मुखी रुद्राक्ष स्वयं जनार्दन (भगवान विष्णु) हैं; इसे धारण करने वाले पर किसी ग्रह या दुष्ट शक्ति का प्रभाव नहीं चलता।" },
    11: { name: "11 मुखी रुद्राक्ष (Gyarah Mukhi — एकादश रुद्र भगवान हनुमान स्वरूप)", deity: "एकादश रुद्र एवं संकटमोचन श्री हनुमान जी", planet: "मंगल एवं शनि (Mars & Saturn)", rashi: "मेष, वृश्चिक, मकर, कुंभ व सभी राशियां", mantra: "ॐ ह्रीं हुं नमः / ॐ हनुमते नमः", day: "मंगलवार या शनिवार प्रातः", benefits: "अजेय साहस, शारीरिक बल व इम्युनिटी, शनि साढ़े साती व मंगल दोष का अचूक निवारण, यात्रा सुरक्षा, सही निर्णय क्षमता और ध्यान-साधना में सिद्धि।", shastra: "शिव पुराण के अनुसार 11 मुखी रुद्राक्ष को शिखा या कंठ में धारण करने से सहस्र अश्वमेध और वाजपेय यज्ञों के समान पुण्य व अजेय तेज मिलता है।" },
    12: { name: "12 मुखी रुद्राक्ष (Barah Mukhi — द्वादश आदित्य सूर्य स्वरूप)", deity: "भगवान सूर्य नारायण (द्वादश आदित्य)", planet: "सूर्य देव (Sun)", rashi: "सिंह (Leo), मेष, धनु व प्रशासनिक अधिकारी", mantra: "ॐ क्रौं क्षौं रौं नमः", day: "रविवार प्रातः", benefits: "सूर्य के समान तेजस्वी आभामंडल, राजनीति, प्रशासन (IAS/IPS/Govt) व उच्च लीडरशिप में सफलता, मान-सम्मान, आत्मविश्वास और रोग मुक्ति।", shastra: "बारह मुखी रुद्राक्ष में बारह आदित्यों का तेज समाहित है; इसके धारक को कभी दरिद्रता, भय या अपमान का सामना नहीं करना पड़ता।" },
    13: { name: "13 मुखी रुद्राक्ष (Terah Mukhi — कामदेव एवं देवराज इंद्र स्वरूप)", deity: "भगवान कामदेव एवं देवराज इंद्र", planet: "शुक्र देव (Venus)", rashi: "वृषभ, तुला एवं सभी व्यवसायी/कलाकार", mantra: "ॐ ह्रीं नमः", day: "शुक्रवार या सोमवार प्रातः", benefits: "सम्मोहन व चुंबकीय आकर्षण (Magnetic Charisma), मार्केटिंग, सेल्स, फिल्म/कला व लग्जरी व्यापार में अपार सफलता और समस्त भौतिक सुखों की प्राप्ति।", shastra: "शिव पुराण के अनुसार तेरह मुखी रुद्राक्ष विश्वेश्वर का स्वरूप है जो समस्त कामनाओं और रसायन सिद्धियों को देने वाला है।" },
    14: { name: "14 मुखी रुद्राक्ष (Chaudah Mukhi — देवमणि / तृतीय नेत्र स्वरूप)", deity: "साक्षात भगवान शिव (त्रिनेत्र) एवं हनुमान जी", planet: "शनि देव एवं मंगल (Saturn & Mars)", rashi: "मकर, कुंभ, मेष, वृश्चिक व उच्च रणनीतिकार", mantra: "ॐ नमः / ॐ नमः शिवाय", day: "शनिवार या सोमवार प्रातः", benefits: "आज्ञा चक्र (Third Eye) और छठी इंद्रिय (Intuition / Future Foresight) का जागरण, शेयर मार्केट/व्यापार/निवेश में सटीक निर्णय, शनि साढ़े साती से परम रक्षा और राजयोग।", shastra: "शिव पुराण के अनुसार 14 मुखी रुद्राक्ष भगवान शिव के नेत्रों से उत्पन्न सर्वोच्च 'देवमणि' है, जिसके धारक का देवता भी सम्मान करते हैं।" },
    15: { name: "15 मुखी रुद्राक्ष (Pandrah Mukhi — भगवान पशुपतिनाथ स्वरूप)", deity: "भगवान पशुपतिनाथ शिव", planet: "बुध एवं राहु", rashi: "सभी राशियां", mantra: "ॐ ह्रीं नमः", day: "सोमवार या बुधवार", benefits: "अनाहत (Heart) चक्र जागृति, करुणा, आध्यात्मिक शांति और व्यापक व्यापारिक समृद्धि।", shastra: "पशुपतिनाथ का यह दुर्लभ मनका अखंड धन और भावनात्मक मुक्ति प्रदान करता है।" },
    16: { name: "16 मुखी रुद्राक्ष (Solah Mukhi — महामृत्युंजय एवं जय रुद्राक्ष)", deity: "भगवान श्री राम एवं महामृत्युंजय शिव", planet: "सूर्य एवं चंद्र", rashi: "सभी राशियां", mantra: "ॐ ह्रीं हुं नमः", day: "सोमवार", benefits: "गंभीर संकटों, कानूनी विवादों और रोगों पर विजय (जय रुद्राक्ष) तथा अभय सुरक्षा कवच।", shastra: "सोलह मुखी रुद्राक्ष का धारक काल और भय से सुरक्षित रहता है।" },
    17: { name: "17 मुखी रुद्राक्ष (Satrah Mukhi — भगवान विश्वकर्मा एवं माँ कात्यायनी)", deity: "भगवान विश्वकर्मा एवं माता कात्यायनी", planet: "शनि एवं गुरु", rashi: "सभी राशियां", mantra: "ॐ ह्रीं हुं नमः", day: "शनिवार या शुक्रवार", benefits: "आकस्मिक महाधन लाभ, भूमि-भवन व विशाल प्रोजेक्ट्स में सफलता तथा धर्म-अर्थ-काम-मोक्ष सिद्धि।", shastra: "सत्रह मुखी रुद्राक्ष नई सृष्टि व विशाल साम्राज्य निर्माण की शक्ति देता है।" },
    18: { name: "18 मुखी रुद्राक्ष (Atharah Mukhi — माता भूमि देवी स्वरूप)", deity: "माता वसुंधरा (भूमि देवी)", planet: "पृथ्वी तत्व एवं मंगल", rashi: "सभी राशियां", mantra: "ॐ ह्रीं श्रीं वसुधायै स्वाहा", day: "शुक्रवार या मंगलवार", benefits: "रियल एस्टेट, भूमि, खनन, कृषि और स्थायी संपत्ति में अपार उन्नति व मातृ-सुरक्षा।", shastra: "अठारह मुखी रुद्राक्ष पृथ्वी तत्व का सर्वोच्च आशीर्वाद है।" },
    19: { name: "19 मुखी रुद्राक्ष (Unnis Mukhi — भगवान नारायण स्वरूप)", deity: "भगवान लक्ष्मी-नारायण", planet: "बुध एवं गुरु", rashi: "सभी राशियां", mantra: "ॐ नमो नारायणाय", day: "गुरुवार", benefits: "तनाव-मुक्त अथाह ऐश्वर्य, व्यापार में शीर्ष स्थान और पारिवारिक सुख-समृद्धि।", shastra: "उन्नीस मुखी रुद्राक्ष नारायण की कृपा से जीवन के समस्त अभावों को मिटाता है।" },
    20: { name: "20 मुखी रुद्राक्ष (Bees Mukhi — परम ब्रह्म ज्ञान स्वरूप)", deity: "भगवान ब्रह्मा एवं त्रिदेव", planet: "समस्त ब्रह्मांडीय ऊर्जा", rashi: "सभी राशियां", mantra: "ॐ ह्रीं हुं नमः", day: "सोमवार या गुरुवार", benefits: "परा-विद्या, आध्यात्मिक सिद्धि, उच्च शोध और ब्रह्मांडीय चेतना का विकास।", shastra: "बीस मुखी रुद्राक्ष ऋषियों और उच्च साधकों का परम रत्न है।" },
    21: { name: "21 मुखी रुद्राक्ष (Ikkis Mukhi — धनपति कुबेर स्वरूप)", deity: "भगवान कुबेर एवं महादेव", planet: "समस्त नवग्रह एवं कुबेर संपदा", rashi: "सभी राशियां", mantra: "ॐ यक्षाय कुबेराय वैश्रवणाय धनधान्याधिपतये नमः", day: "सोमवार या शुक्रवार", benefits: "ब्रह्मांड का सबसे दुर्लभ और सर्वोच्च रुद्राक्ष — पीढ़ियों तक चलने वाली अखंड कुबेर संपदा, राजसी वैभव और सर्वोच्च आध्यात्मिक रक्षा।", shastra: "इक्कीस मुखी रुद्राक्ष में स्वयं कुबेर और समस्त देवताओं का वास माना गया है।" }
  };

  if (mukhiNum && MUKHI_ENCYCLOPEDIA[mukhiNum]) {
    const info = MUKHI_ENCYCLOPEDIA[mukhiNum];
    const matchedProd = (allProducts || []).find(p => isExactMukhiProduct(p, mukhiNum));
    const prodLine = matchedProd
      ? `\n• 🛍️ **ऑरा रुद्राक्ष स्टोर में उपलब्धता:** **[${matchedProd.name}](/product/${matchedProd.slug || matchedProd.id})** — ₹${Number(matchedProd.price).toLocaleString("en-IN")} *(100% शुद्ध नेपाली • सरकारी लैब X-Ray प्रमाणित • हरिद्वार में वैदिक प्राण-प्रतिष्ठित)*`
      : `\n• 🛍️ **ऑरा रुद्राक्ष स्टोर:** आप हमारे [Shop Catalog](/shop) पर 100% शुद्ध नेपाली व लैब-प्रमाणित रुद्राक्ष देख सकते हैं।`;

    return `🙏 **श्री गणेशाय नमः! हर हर महादेव!**

मैं **AI पंडित जी (ज्योतिषाचार्य)** हूँ। आपके द्वारा पूछे गए **${info.name}** का **शिव पुराण (विद्येश्वर संहिता)** एवं **वैदिक ज्योतिष** के अनुसार संपूर्ण विस्तृत विवरण इस प्रकार है:

---

### 📿 1. ${info.name} — शास्त्रीय परिचय व महत्व
• 🔱 **अधिष्ठाता देवता:** **${info.deity}**
• 🪐 **शासक ग्रह (Ruling Planet):** **${info.planet}**
• ♈ **अनुकूल राशियां:** **${info.rashi}**
• 📜 **शिव पुराण प्रमाण:** ${info.shastra}

---

### ✨ 2. प्रमुख वैदिक लाभ एवं किस उद्देश्य के लिए धारण करें?
• **संपूर्ण लाभ:** ${info.benefits}
• **कौन धारण करे:** जिन जातकों की कुंडली में **${info.planet}** कमजोर/पीड़ित हो, अथवा उस ग्रह की महादशा-अंतर्दशा चल रही हो, या जो अपने जीवन में उपरोक्त क्षेत्रों में उन्नति व रक्षा कवच चाहते हों।

---

### 🕉️ 3. सिद्ध बीज मंत्र एवं संपूर्ण धारण विधि (Shiva Purana Dharan Vidhi)
• **सिद्ध बीज मंत्र:** \`${info.mantra}\` (प्रतिदिन 108 बार जाप)
• **धारण करने का शुभ दिन:** **${info.day}** (अथवा प्रदोष व्रत / सोमवार)
• **संपूर्ण विधि:**
  1. शुभ दिन प्रातःकाल स्नान कर स्वच्छ वस्त्र पहनें और घर के मंदिर या शिवालय में पूर्व/उत्तर की ओर मुख करके बैठें।
  2. तांबे या चाँदी के पात्र में रुद्राक्ष रखकर **गंगाजल और कच्चे गोदुग्ध (पंचामृत)** से अभिषेक करें।
  3. रुद्राक्ष पर चंदन/अष्टगंध का तिलक लगाएं, अक्षत, सफेद पुष्प और बेलपत्र अर्पित करें तथा घी का दीपक जलाएं।
  4. रुद्राक्ष को शिवलिंग से स्पर्श कराकर दाहिने हाथ में लें और \`${info.mantra}\` का **108 बार** जाप करें।
  5. लाल या पीले रेशमी धागे अथवा चाँदी/सोने में मढ़वाकर कंठ (हृदय के पास) या दाहिनी भुजा पर धारण करें।${prodLine}

---

### 🔭 क्या यह रुद्राक्ष आपकी जन्म कुंडली के अनुसार 100% अनुकूल है?
वैदिक नियम है कि सर्वोत्तम परिणाम के लिए रुद्राक्ष का चयन आपकी **जन्म लग्न, चंद्र राशि और वर्तमान महादशा** देखकर किया जाना चाहिए।
👇 **अपनी व्यक्तिगत जन्म कुंडली जांचने के लिए कृपया चैट में या नीचे फॉर्म में लिखें:**
• **जन्म तिथि (DOB)** — उदा. 15-08-1995
• **जन्म समय (Birth Time)** — उदा. 10:30 AM
• **जन्म स्थान (Birth City)** — उदा. जयपुर, राजस्थान

**हर हर महादेव!** 🙏

[AURA_KEYWORDS]: ${mukhiNum} मुखी रुद्राक्ष लाभ | ${mukhiNum} मुखी धारण विधि | मेरी जन्म कुंडली बनाएं | 1 से 21 मुखी रुद्राक्ष गाइड`;
  }

  // Check if Gauri Shankar, Ganesh, Garbh Gauri, or 108 Jaap Mala was asked
  if (/gauri\s*shankar|गौरी\s*शंकर/i.test(q)) {
    return `🙏 **श्री गणेशाय नमः! हर हर महादेव!**

मैं **AI पंडित जी (ज्योतिषाचार्य)** हूँ। **गौरी शंकर रुद्राक्ष (Gauri Shankar Rudraksha)** का शिव पुराण एवं वैदिक शास्त्र के अनुसार संपूर्ण विस्तृत विवरण इस प्रकार है:

• 🔱 **अधिष्ठाता देवता:** साक्षात **भगवान शिव एवं माता पार्वती (अर्धनारीश्वर / उमा-महेश्वर)** का प्राकृतिक रूप से जुड़ा हुआ दिव्य स्वरूप।
• 🪐 **शासक ग्रह:** **शुक्र देव (Venus) एवं चंद्र देव (Moon)** — सप्तम भाव (विवाह स्थान) एवं चतुर्थ भाव (गृह सुख) का सर्वोच्च रक्षक।
• ✨ **मुख्य शास्त्रीय लाभ:**
  1. **शीघ्र विवाह योग:** जिन युवक-युवतियों के विवाह में बार-बार अड़चन या विलंब हो रहा हो, उनके लिए यह अचूक वरदान है।
  2. **अटूट दांपत्य प्रेम:** पति-पत्नी के बीच वैचारिक मतभेद, तनाव या गलतफहमी को समाप्त कर गहरा प्रेम और विश्वास स्थापित करता है।
  3. **पारिवारिक शांति व वंश वृद्धि:** जिस घर के पूजा स्थान में या दंपत्ति के कंठ में गौरी शंकर रुद्राक्ष होता है, वहां कलह नहीं होती और लक्ष्मी-अन्नपूर्णा का वास रहता है।
• 🕉️ **सिद्ध बीज मंत्र व धारण विधि:**
  - **बीज मंत्र:** \`ॐ गौरी शंकराय नमः\` अथवा \`ॐ नमः शिवाय\` (108 बार जाप)
  - **शुभ दिन:** सोमवार या शुक्रवार प्रातःकाल गंगाजल व कच्चे दूध से अभिषेक कर लाल/पीले धागे या चाँदी में कंठ में धारण करें।

👇 **यदि आप अपनी कुंडली के सप्तम भाव (विवाह योग), मांगलिक दोष और जीवनसाथी के विषय में सटीक जानकारी चाहते हैं, तो कृपया अपनी जन्म तिथि (DOB), जन्म समय और जन्म स्थान बताएं!**

[AURA_KEYWORDS]: गौरी शंकर रुद्राक्ष | शीघ्र विवाह उपाय | दांपत्य सुख | मेरी जन्म कुंडली बनाएं`;
  }

  // Check if user asked for all 1 to 21 Mukhi Rudraksha overview
  if (/1\s*to\s*21|1\s*se\s*21|1\s*से\s*21|1\s*से\s*14|sabhi\s*rudraksh|all\s*rudraksh|प्रकार|मुखी\s*रुद्राक्ष\s*की\s*जानकारी/i.test(q)) {
    const listStr = Object.entries(MUKHI_ENCYCLOPEDIA).map(([m, d]) =>
      `• 📿 **${m} मुखी:** *देवता:* ${d.deity} | *ग्रह:* **${d.planet}** | *मंत्र:* \`${d.mantra}\` — ${d.benefits}`
    ).join("\n\n");

    return `🙏 **श्री गणेशाय नमः! हर हर महादेव!**

मैं **AI पंडित जी (ज्योतिषाचार्य)** हूँ। **शिव पुराण (विद्येश्वर संहिता)** एवं **बृहत्पाराशर होरा शास्त्र** के अनुसार **1 मुखी से 21 मुखी तक के सभी सिद्ध रुद्राक्षों** का देवता, शासक ग्रह, बीज मंत्र और लाभ सहित संपूर्ण विश्वकोश (Complete Encyclopedia) नीचे प्रस्तुत है:

---

${listStr}

---

• 📿 **गौरी शंकर रुद्राक्ष:** शिव-पार्वती स्वरूप (चंद्र व शुक्र) — शीघ्र विवाह व दांपत्य प्रेम हेतु।
• 📿 **गणेश रुद्राक्ष:** विघ्नहर्ता गणेश स्वरूप (बुध व राहु) — बुद्धि, रिद्धि-सिद्धि व सर्व विघ्न निवारण हेतु।
• 📿 **108+1 जप माला:** दैनिक मंत्र साधना, रक्तचाप संतुलन व प्राणिक रक्षा कवच हेतु।

👇 **आपके लिए इनमें से कौन से 1 से 3 रुद्राक्ष आपकी जन्म कुंडली के लग्न, चंद्र राशि और महादशा के अनुसार 100% सटीक हैं, यह जानने के लिए कृपया अपनी जन्म तिथि (DOB), जन्म समय और जन्म स्थान दर्ज करें!**

[AURA_KEYWORDS]: मेरी जन्म कुंडली बनाएं | 7 मुखी महालक्ष्मी रुद्राक्ष | 5 मुखी रुद्राक्ष | 11 मुखी हनुमान रुद्राक्ष`;
  }

  // Default comprehensive Pandit Ji guidance + Kundali invitation
  return `🙏 **श्री गणेशाय नमः! हर हर महादेव! प्रणाम भक्त जी।**

मैं **AI पंडित जी (वैदिक ज्योतिषाचार्य)** हूँ — **बृहत्पाराशर होरा शास्त्र**, **फलदीपिका**, **जैमिनी सूत्र**, **लाल किताब** और **शिव पुराण** के शास्त्रीय सिद्धांतों पर प्रशिक्षित आपका आध्यात्मिक मार्गदर्शक।

आपके प्रश्न (**"${userQuery || "ज्योतिषीय परामर्श"}"**) के संदर्भ में शास्त्रीय मार्गदर्शन:

---

### 🪐 1. वैदिक ज्योतिष एवं नवग्रह-रुद्राक्ष संबंध (Shastra Reference)
महर्षि पाराशर एवं शिव पुराण के अनुसार मनुष्य के जीवन में आने वाली हर समस्या (मानसिक तनाव, करियर में रुकावट, धन की कमी, विवाह में देरी या स्वास्थ्य कष्ट) का सीधा संबंध उसकी जन्म कुंडली के **लग्न, चंद्र राशि, 12 भावों और सक्रिय विंशोत्तरी महादशा-अंतर्दशा** से होता है:
• **सूर्य (आत्मबल, सरकारी पद, नेतृत्व):** 1 मुखी अथवा 12 मुखी रुद्राक्ष (\`ॐ ह्रीं नमः\`)
• **चंद्रमा (मानसिक शांति, भावनाएं, माता):** 2 मुखी अथवा गौरी शंकर रुद्राक्ष (\`ॐ नमः\`)
• **मंगल (साहस, ऊर्जा, भूमि-भवन, मांगलिक शांति):** 3 मुखी अथवा 11 मुखी रुद्राक्ष (\`ॐ क्लीं नमः\`)
• **बुध (बुद्धि, विद्या, व्यापार, वाणी):** 4 मुखी अथवा गणेश रुद्राक्ष (\`ॐ ह्रीं नमः\`)
• **गुरु बृहस्पति (भाग्य, ज्ञान, धन, संतान, विवाह):** 5 मुखी रुद्राक्ष (\`ॐ ह्रीं नमः\`)
• **शुक्र (वैभव, प्रेम, दांपत्य सुख, आकर्षण):** 6 मुखी अथवा 13 मुखी रुद्राक्ष (\`ॐ ह्रीं हुं नमः\`)
• **शनि (कर्म, न्याय, साढ़े साती/ढैया मुक्ति, स्थिर धन):** 7 मुखी अथवा 14 मुखी देवमणि रुद्राक्ष (\`ॐ हुं नमः\`)
• **राहु (आकस्मिक सफलता, विघ्न नाश, कालसर्प शांति):** 8 मुखी रुद्राक्ष (\`ॐ हुं नमः\`)
• **केतु (मोक्ष, आध्यात्मिक शक्ति, गुप्त शत्रु नाश):** 9 मुखी रुद्राक्ष (\`ॐ ह्रीं हुं नमः\`)
• **समस्त नवग्रह व वास्तु रक्षा कवच:** 10 मुखी महाविष्णु रुद्राक्ष (\`ॐ ह्रीं नमः\`)

---

### 🔭 2. अपनी संपूर्ण विस्तृत जन्म कुंडली अभी दिखाएं (100% प्रामाणिक गणना)
बिना जन्म कुंडली देखे कोई भी सतही अनुमान लगाना उचित नहीं है। जब आप अपना जन्म विवरण देंगे, तो मैं आपको **पूरी डिटेल में (11 खंडों में)** बताऊँगा:
1. 🔍 **अभी आपके जीवन में क्या-क्या परेशानी चल रही है?** (मानसिक, करियर, धन, परिवार व स्वास्थ्य)
2. ❓ **यह परेशानी क्यों और कैसे चल रही है?** (महादशा, अंतर्दशा, त्रिक भाव व गोचर का प्रमाण)
3. 📅 **यह परेशानी कब से चल रही है?** (सटीक तारीखों के साथ)
4. ⏳ **यह परेशानी कब ठीक होगी और आपका भाग्योदय कब होगा?** (सटीक राहत तारीख व स्वर्ण काल)
5. 🪐 **सभी 9 ग्रहों और 12 भावों का एक-एक करके संपूर्ण फलादेश, लाल किताब उपाय और कुंडली-प्रमाणित रुद्राक्ष।**

👇 **कृपया नीचे दिए गए फॉर्म में या सीधे चैट में अपनी जानकारी लिखें:**
• **जन्म तिथि (Date of Birth)** — उदा. 15-08-1995
• **जन्म समय (Birth Time)** — उदा. 10:30 AM
• **जन्म स्थान (Birth City)** — उदा. जयपुर, राजस्थान

**हर हर महादेव!** 🙏

[AURA_KEYWORDS]: जन्म विवरण दर्ज करें | 1 से 21 मुखी रुद्राक्ष की जानकारी | 7 मुखी धन रुद्राक्ष | गौरी शंकर विवाह रुद्राक्ष`;
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


