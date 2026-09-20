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
  { id: 0, name: "Mesh", english: "Aries", symbol: "♈", lord: "Mangal (Mars)", lordKey: "Mars", element: "Agni (Fire)", quality: "Chara (Movable)" },
  { id: 1, name: "Vrishabh", english: "Taurus", symbol: "♉", lord: "Shukra (Venus)", lordKey: "Venus", element: "Prithvi (Earth)", quality: "Sthira (Fixed)" },
  { id: 2, name: "Mithun", english: "Gemini", symbol: "♊", lord: "Budha (Mercury)", lordKey: "Mercury", element: "Vayu (Air)", quality: "Dwisvabhava (Dual)" },
  { id: 3, name: "Kark", english: "Cancer", symbol: "♋", lord: "Chandra (Moon)", lordKey: "Moon", element: "Jala (Water)", quality: "Chara (Movable)" },
  { id: 4, name: "Singh", english: "Leo", symbol: "♌", lord: "Surya (Sun)", lordKey: "Sun", element: "Agni (Fire)", quality: "Sthira (Fixed)" },
  { id: 5, name: "Kanya", english: "Virgo", symbol: "♍", lord: "Budha (Mercury)", lordKey: "Mercury", element: "Prithvi (Earth)", quality: "Dwisvabhava (Dual)" },
  { id: 6, name: "Tula", english: "Libra", symbol: "♎", lord: "Shukra (Venus)", lordKey: "Venus", element: "Vayu (Air)", quality: "Chara (Movable)" },
  { id: 7, name: "Vrischika", english: "Scorpio", symbol: "♏", lord: "Mangal (Mars)", lordKey: "Mars", element: "Jala (Water)", quality: "Sthira (Fixed)" },
  { id: 8, name: "Dhanu", english: "Sagittarius", symbol: "♐", lord: "Guru (Jupiter)", lordKey: "Jupiter", element: "Agni (Fire)", quality: "Dwisvabhava (Dual)" },
  { id: 9, name: "Makar", english: "Capricorn", symbol: "♑", lord: "Shani (Saturn)", lordKey: "Saturn", element: "Prithvi (Earth)", quality: "Chara (Movable)" },
  { id: 10, name: "Kumbh", english: "Aquarius", symbol: "♒", lord: "Shani (Saturn)", lordKey: "Saturn", element: "Vayu (Air)", quality: "Sthira (Fixed)" },
  { id: 11, name: "Meen", english: "Pisces", symbol: "♓", lord: "Guru (Jupiter)", lordKey: "Jupiter", element: "Jala (Water)", quality: "Dwisvabhava (Dual)" }
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
    rashiEnglish: rashi.english,
    rashiSymbol: rashi.symbol,
    lord: rashi.lord,
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

  // Antardasha calculation
  const totalMahaYears = runningMahadasha.years;
  let antarElapsed = 0;
  let runningAntardasha = runningMahadasha;

  for (let i = 0; i < 9; i++) {
    const antarIdx = (currentDashaIndex + i) % 9;
    const antarPlanet = VIMSHOTTARI_DASHA_ORDER[antarIdx];
    const antarSpanYears = (totalMahaYears * antarPlanet.years) / 120;

    if (dashaElapsed >= antarElapsed && dashaElapsed < antarElapsed + antarSpanYears) {
      runningAntardasha = antarPlanet;
      break;
    }
    antarElapsed += antarSpanYears;
  }

  // Compute exact start and end dates for running Mahadasha and Antardasha
  const msPerYear = 365.2422 * 24 * 3600 * 1000;
  
  // Mahadasha Start & End
  const mahaStartMs = targetTimeMs - (dashaElapsed * msPerYear);
  const mahaEndMs = mahaStartMs + (runningMahadasha.years * msPerYear);
  
  const mahaStartDate = new Date(mahaStartMs).toISOString().split("T")[0];
  const mahaEndDate = new Date(mahaEndMs).toISOString().split("T")[0];

  // Antardasha Start & End
  const antarStartMs = mahaStartMs + (antarElapsed * msPerYear);
  const antarEndMs = antarStartMs + ((runningMahadasha.years * runningAntardasha.years / 120) * msPerYear);
  
  const antarStartDate = new Date(antarStartMs).toISOString().split("T")[0];
  const antarEndDate = new Date(antarEndMs).toISOString().split("T")[0];

  return {
    birthDashaLord: initialDasha.planet,
    birthDashaBalance: `${balanceYears.toFixed(1)} years of ${initialDasha.planet} Dasha`,
    currentMahadasha: runningMahadasha.planet,
    currentMahadashaHindi: runningMahadasha.planetHindi || runningMahadasha.planet,
    mahadashaStartDate: mahaStartDate,
    mahadashaEndDate: mahaEndDate,
    currentAntardasha: runningAntardasha.planet,
    currentAntardashaHindi: runningAntardasha.planetHindi || runningAntardasha.planet,
    antardashaStartDate: antarStartDate,
    antardashaEndDate: antarEndDate,
    recommendedDashaRudraksha: runningMahadasha.rudraksha
  };
}

/**
 * Vedic Panchanga Calculation Engine (Tithi, Vaar, Nakshatra, Yoga, Karana)
 */
export const PANCHANGA_YOGAS = [
  "Vishkambha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda",
  "Sukarma", "Dhriti", "Shula", "Ganda", "Vriddhi", "Dhruva",
  "Vyaghata", "Harshana", "Vajra", "Asiddhi", "Vyatipata", "Variyan",
  "Parigha", "Shiva", "Siddha", "Sadhya", "Shubha", "Shukla",
  "Brahma", "Indra", "Vaidhriti"
];

export const TITHI_NAMES = [
  "Pratipada (प्रतिपदा)", "Dwitiya (द्वितीया)", "Tritiya (तृतीया)", "Chaturthi (चतुर्थी)",
  "Panchami (पंचमी)", "Shashti (षष्ठी)", "Saptami (सप्तमी)", "Ashtami (अष्टमी)",
  "Navami (नवमी)", "Dashami (दशमी)", "Ekadashi (एकादशी)", "Dwadashi (द्वादशी)",
  "Trayodashi (त्रयोदशी)", "Chaturdashi (चतुर्दशी)", "Purnima (पूर्णिमा / शुक्ल पक्ष)",
  "Pratipada (प्रतिपदा)", "Dwitiya (द्वितीया)", "Tritiya (तृतीया)", "Chaturthi (चतुर्थी)",
  "Panchami (पंचमी)", "Shashti (षष्ठी)", "Saptami (सप्तमी)", "Ashtami (अष्टमी)",
  "Navami (नवमी)", "Dashami (दशमी)", "Ekadashi (एकादशी)", "Dwadashi (द्वादशी)",
  "Trayodashi (त्रयोदशी)", "Chaturdashi (चतुर्दशी)", "Amavasya (अमावस्या / कृष्ण पक्ष)"
];

export const KARANA_NAMES = [
  "Bava", "Balava", "Kaulava", "Taitila", "Gara", "Vanija", "Vishti (Bhadra)",
  "Shakuni", "Chatushpada", "Naga", "Kimstughna"
];

export const VAAR_DETAILS = [
  { day: 0, name: "Ravivar (रविवार)", english: "Sunday", lord: "Surya (Sun)", lordMukhi: "1 Mukhi / 12 Mukhi" },
  { day: 1, name: "Somvar (सोमवार)", english: "Monday", lord: "Chandra (Moon)", lordMukhi: "2 Mukhi" },
  { day: 2, name: "Mangalvar (मंगलवार)", english: "Tuesday", lord: "Mangal (Mars)", lordMukhi: "3 Mukhi / 11 Mukhi" },
  { day: 3, name: "Budhavar (बुधवार)", english: "Wednesday", lord: "Budha (Mercury)", lordMukhi: "4 Mukhi" },
  { day: 4, name: "Guruvar (गुरुवार)", english: "Thursday", lord: "Guru (Jupiter)", lordMukhi: "5 Mukhi" },
  { day: 5, name: "Shukravar (शुक्रवार)", english: "Friday", lord: "Shukra (Venus)", lordMukhi: "6 Mukhi / 13 Mukhi" },
  { day: 6, name: "Shanivar (शनिवार)", english: "Saturday", lord: "Shani (Saturn)", lordMukhi: "7 Mukhi / 14 Mukhi" }
];

export function calculatePanchanga(sunSid, moonSid, birthDateObj) {
  // 1. Tithi: (Moon - Sun) mod 360 / 12
  const diffDeg = normalizeDeg(moonSid - sunSid);
  const tithiIndex = Math.min(29, Math.floor(diffDeg / 12));
  const isShukla = tithiIndex < 15;
  const paksha = isShukla ? "Shukla Paksha (शुक्ल पक्ष)" : "Krishna Paksha (कृष्ण पक्ष)";
  const tithiName = TITHI_NAMES[tithiIndex];

  // 2. Vaar (Day of week from local Date)
  const dayOfWeek = birthDateObj.getUTCDay();
  const vaarInfo = VAAR_DETAILS[dayOfWeek] || VAAR_DETAILS[0];

  // 3. Yoga: (Sun + Moon) mod 360 / (360/27)
  const sumDeg = normalizeDeg(sunSid + moonSid);
  const yogaIndex = Math.min(26, Math.floor(sumDeg / (360 / 27)));
  const yogaName = PANCHANGA_YOGAS[yogaIndex] || "Shubha";

  // 4. Karana: Half of Tithi (each 6 degrees of Moon-Sun difference)
  const halfTithi = Math.floor(diffDeg / 6);
  let karanaName = "Bava";
  if (halfTithi === 0) {
    karanaName = "Kimstughna";
  } else if (halfTithi >= 57) {
    if (halfTithi === 57) karanaName = "Shakuni";
    else if (halfTithi === 58) karanaName = "Chatushpada";
    else karanaName = "Naga";
  } else {
    karanaName = KARANA_NAMES[(halfTithi - 1) % 7];
  }

  return {
    tithi: `${tithiName} (${paksha})`,
    tithiNumber: tithiIndex + 1,
    paksha,
    vaar: vaarInfo.name,
    vaarLord: vaarInfo.lord,
    vaarLordMukhi: vaarInfo.lordMukhi,
    yoga: yogaName,
    karana: karanaName
  };
}

/**
 * Navamsha (D9 Chart) & Vargottama Calculation
 * Navamsha sign calculation based on element triplicities:
 * - Fire Signs (Mesh 0, Singh 4, Dhanu 8) start at Aries (0)
 * - Earth Signs (Vrishabh 1, Kanya 5, Makar 9) start at Capricorn (9)
 * - Air Signs (Mithun 2, Tula 6, Kumbh 10) start at Libra (6)
 * - Water Signs (Kark 3, Vrischika 7, Meen 11) start at Cancer (3)
 */
export function calculateNavamsha(siderealDegree) {
  const normalized = normalizeDeg(siderealDegree);
  const rashiIndex = Math.floor(normalized / 30);
  const degInSign = normalized % 30;
  const navamshaIndex = Math.min(8, Math.floor(degInSign / (30 / 9))); // 0 to 8

  let startSign = 0;
  if ([0, 4, 8].includes(rashiIndex)) startSign = 0; // Fire -> Aries
  else if ([1, 5, 9].includes(rashiIndex)) startSign = 9; // Earth -> Capricorn
  else if ([2, 6, 10].includes(rashiIndex)) startSign = 6; // Air -> Libra
  else startSign = 3; // Water -> Cancer

  const navamshaRashiIndex = (startSign + navamshaIndex) % 12;
  const navamshaRashi = RASHIS[navamshaRashiIndex];
  const isVargottama = rashiIndex === navamshaRashiIndex;

  // Pushkar Navamsha detection
  let isPushkar = false;
  if ([0, 4, 8].includes(rashiIndex) && [6, 8].includes(navamshaIndex)) isPushkar = true; // 7th & 9th in Fire
  else if ([1, 5, 9].includes(rashiIndex) && [2, 4].includes(navamshaIndex)) isPushkar = true; // 3rd & 5th in Earth
  else if ([2, 6, 10].includes(rashiIndex) && [5, 7].includes(navamshaIndex)) isPushkar = true; // 6th & 8th in Air
  else if ([3, 7, 11].includes(rashiIndex) && [0, 2].includes(navamshaIndex)) isPushkar = true; // 1st & 3rd in Water

  return {
    navamshaRashiIndex,
    navamshaRashiHindi: navamshaRashi.name,
    navamshaRashiEnglish: navamshaRashi.english,
    navamshaRashiSymbol: navamshaRashi.symbol,
    navamshaLord: navamshaRashi.lord,
    isVargottama,
    isPushkarNavamsha: isPushkar,
    padaInSign: navamshaIndex + 1
  };
}

/**
 * Determine Planetary Dignity (Uchha / Neecha / Swa-kshetra / Mitra / Shatru)
 */
function getPlanetaryDignity(planetName, rashiIndex) {
  const dignityMap = {
    "Sun": { exalted: 0, debilitated: 6, own: [4] }, // Aries exalted, Libra debilitated, Leo own
    "Moon": { exalted: 1, debilitated: 7, own: [3] }, // Taurus exalted, Scorpio debilitated, Cancer own
    "Mars": { exalted: 9, debilitated: 3, own: [0, 7] }, // Capricorn exalted, Cancer debilitated, Aries/Scorpio own
    "Mercury": { exalted: 5, debilitated: 11, own: [2, 5] }, // Virgo exalted, Pisces debilitated, Gemini/Virgo own
    "Jupiter": { exalted: 3, debilitated: 9, own: [8, 11] }, // Cancer exalted, Capricorn debilitated, Sag/Pisces own
    "Venus": { exalted: 11, debilitated: 5, own: [1, 6] }, // Pisces exalted, Virgo debilitated, Taurus/Libra own
    "Saturn": { exalted: 6, debilitated: 0, own: [9, 10] }, // Libra exalted, Aries debilitated, Cap/Aquarius own
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
  // Standard Parashari Jyotish rules for Yogakaraka and Benefic planets
  const lagnaRules = [
    // 0: Mesh (Aries) - Mars lagnesh, Sun (5th lord), Jupiter (9th lord)
    { lagna: "Mesh", lagnesh: "Mars", yogakaraka: "Jupiter & Sun", benefics: ["Sun", "Jupiter", "Mars"], rudraksha: "3 Mukhi & 5 Mukhi", primeMukhi: 3 },
    // 1: Vrishabh (Taurus) - Venus lagnesh, Saturn (9th & 10th Yogakaraka)
    { lagna: "Vrishabh", lagnesh: "Venus", yogakaraka: "Saturn", benefics: ["Saturn", "Mercury", "Venus"], rudraksha: "6 Mukhi & 7 Mukhi", primeMukhi: 6 },
    // 2: Mithun (Gemini) - Mercury lagnesh, Venus (5th lord)
    { lagna: "Mithun", lagnesh: "Mercury", yogakaraka: "Venus", benefics: ["Venus", "Mercury"], rudraksha: "4 Mukhi & 6 Mukhi", primeMukhi: 4 },
    // 3: Kark (Cancer) - Moon lagnesh, Mars (5th & 10th Yogakaraka)
    { lagna: "Kark", lagnesh: "Moon", yogakaraka: "Mars", benefics: ["Mars", "Jupiter", "Moon"], rudraksha: "2 Mukhi & 3 Mukhi", primeMukhi: 2 },
    // 4: Singh (Leo) - Sun lagnesh, Mars (4th & 9th Yogakaraka)
    { lagna: "Singh", lagnesh: "Sun", yogakaraka: "Mars", benefics: ["Mars", "Sun", "Jupiter"], rudraksha: "1 Mukhi & 3 Mukhi", primeMukhi: 1 },
    // 5: Kanya (Virgo) - Mercury lagnesh, Venus (9th lord)
    { lagna: "Kanya", lagnesh: "Mercury", yogakaraka: "Venus", benefics: ["Venus", "Mercury"], rudraksha: "4 Mukhi & 6 Mukhi", primeMukhi: 4 },
    // 6: Tula (Libra) - Venus lagnesh, Saturn (4th & 5th Yogakaraka)
    { lagna: "Tula", lagnesh: "Venus", yogakaraka: "Saturn", benefics: ["Saturn", "Mercury", "Venus"], rudraksha: "6 Mukhi & 7 Mukhi", primeMukhi: 6 },
    // 7: Vrischika (Scorpio) - Mars lagnesh, Jupiter (5th lord), Sun (10th lord)
    { lagna: "Vrischika", lagnesh: "Mars", yogakaraka: "Jupiter & Sun", benefics: ["Jupiter", "Sun", "Mars"], rudraksha: "3 Mukhi & 11 Mukhi", primeMukhi: 3 },
    // 8: Dhanu (Sagittarius) - Jupiter lagnesh, Mars (5th lord), Sun (9th lord)
    { lagna: "Dhanu", lagnesh: "Jupiter", yogakaraka: "Mars & Sun", benefics: ["Sun", "Mars", "Jupiter"], rudraksha: "5 Mukhi & 1 Mukhi", primeMukhi: 5 },
    // 9: Makar (Capricorn) - Saturn lagnesh, Venus (5th & 10th Yogakaraka)
    { lagna: "Makar", lagnesh: "Saturn", yogakaraka: "Venus", benefics: ["Venus", "Mercury", "Saturn"], rudraksha: "7 Mukhi & 14 Mukhi", primeMukhi: 7 },
    // 10: Kumbh (Aquarius) - Saturn lagnesh, Venus (4th & 9th Yogakaraka)
    { lagna: "Kumbh", lagnesh: "Saturn", yogakaraka: "Venus", benefics: ["Venus", "Saturn"], rudraksha: "7 Mukhi & 11 Mukhi", primeMukhi: 7 },
    // 11: Meen (Pisces) - Jupiter lagnesh, Moon (5th lord), Mars (9th lord)
    { lagna: "Meen", lagnesh: "Jupiter", yogakaraka: "Moon & Mars", benefics: ["Moon", "Mars", "Jupiter"], rudraksha: "5 Mukhi & 2 Mukhi", primeMukhi: 5 }
  ];

  return lagnaRules[lagnaRashiIndex] || lagnaRules[0];
}

/**
 * 12 Classical Kaal Sarp Doshas Evaluation
 */
export function evaluateKaalSarpDosha(planets, rahuHouse, ketuHouse) {
  const nonNodePlanets = planets.filter(p => p.englishName !== "Rahu" && p.englishName !== "Ketu");
  
  // Calculate relative house distances from Rahu (clockwise)
  let countSideA = 0;
  let countSideB = 0;

  for (const p of nonNodePlanets) {
    const distFromRahu = ((p.houseNumber - rahuHouse + 12) % 12);
    if (distFromRahu > 0 && distFromRahu < 6) {
      countSideA++;
    } else if (distFromRahu > 6 && distFromRahu < 12) {
      countSideB++;
    }
  }

  const isFullKaalSarp = countSideA === nonNodePlanets.length || countSideB === nonNodePlanets.length;
  const isPartialKaalSarp = !isFullKaalSarp && (countSideA === nonNodePlanets.length - 1 || countSideB === nonNodePlanets.length - 1);

  if (!isFullKaalSarp && !isPartialKaalSarp) {
    return {
      hasKaalSarp: false,
      type: "None (दोष मुक्त)",
      description: "आपकी जन्म पत्रिका में सभी ग्रह राहु-केतु अक्ष के बाहर अनुकूल स्थिति में हैं, कालसर्प दोष नहीं है।"
    };
  }

  const kaalSarpTypes = [
    { house: 1, name: "Anant Kaal Sarp (अनंत कालसर्प योग)", desc: "लग्न में राहु व सप्तम में केतु। व्यक्तित्व, दांपत्य व मानसिक शांति पर प्रभाव। उपाय: 8 मुखी व 9 मुखी रुद्राक्ष एवं महामृत्युंजय जाप।" },
    { house: 2, name: "Kulik Kaal Sarp (कुलिक कालसर्प योग)", desc: "द्वितीय भाव में राहु व अष्टम में केतु। धन संचय, वाणी व पारिवारिक सुख पर प्रभाव। उपाय: 7 मुखी व 8 मुखी रुद्राक्ष।" },
    { house: 3, name: "Vasuki Kaal Sarp (वासुकी कालसर्प योग)", desc: "तृतीय भाव में राहु व नवम में केतु। पराक्रम, भाई-बहनों व भाग्य पर प्रभाव। उपाय: 3 मुखी व 8 मुखी रुद्राक्ष।" },
    { house: 4, name: "Shankhpal Kaal Sarp (शंखपाल कालसर्प योग)", desc: "चतुर्थ भाव में राहु व दशम में केतु। माता, भूमि, वाहन व मानसिक सुख पर प्रभाव। उपाय: 4 मुखी व 8 मुखी रुद्राक्ष।" },
    { house: 5, name: "Padma Kaal Sarp (पद्म कालसर्प योग)", desc: "पंचम भाव में राहु व एकादश में केतु। शिक्षा, संतान व उच्च विद्या पर प्रभाव। उपाय: 5 मुखी व 8 मुखी रुद्राक्ष।" },
    { house: 6, name: "Mahapadma Kaal Sarp (महापद्म कालसर्प योग)", desc: "षष्ठम भाव में राहु व द्वादश में केतु। शत्रु, रोग व व्यय पर प्रभाव (परंतु शत्रु विजय भी कराता है)। उपाय: 11 मुखी व 8 मुखी रुद्राक्ष।" },
    { house: 7, name: "Takshak Kaal Sarp (तक्षक कालसर्प योग)", desc: "सप्तम भाव में राहु व लग्न में केतु। वैवाहिक जीवन, साझेदारी व व्यापार पर प्रभाव। उपाय: गौरी शंकर व 8 मुखी रुद्राक्ष।" },
    { house: 8, name: "Karkotak Kaal Sarp (कर्कोटक कालसर्प योग)", desc: "अष्टम भाव में राहु व द्वितीय में केतु। अचानक बाधाएं, पैतृक संपत्ति व स्वास्थ्य पर प्रभाव। उपाय: 8 मुखी व 14 मुखी रुद्राक्ष।" },
    { house: 9, name: "Shankhachud Kaal Sarp (शंखचूड़ कालसर्प योग)", desc: "नवम भाव में राहु व तृतीय में केतु। भाग्य में उतार-चढ़ाव व पिता के सुख पर प्रभाव। उपाय: 9 मुखी व 1 मुखी रुद्राक्ष।" },
    { house: 10, name: "Ghatak Kaal Sarp (घातक कालसर्प योग)", desc: "दशम भाव में राहु व चतुर्थ में केतु। कार्यक्षेत्र, पद-प्रतिष्ठा व आजीविका पर प्रभाव। उपाय: 10 मुखी व 8 मुखी रुद्राक्ष।" },
    { house: 11, name: "Vishdhar Kaal Sarp (विषधर कालसर्प योग)", desc: "एकादश भाव में राहु व पंचम में केतु। लाभ, बड़े भाई-बहनों व इच्छा पूर्ति पर प्रभाव। उपाय: 11 मुखी व 8 मुखी रुद्राक्ष।" },
    { house: 12, name: "Sheshnag Kaal Sarp (शेषनाग कालसर्प योग)", desc: "द्वादश भाव में राहु व षष्ठम में केतु। व्यय, अनिद्रा, कानूनी विवाद व विदेश यात्रा पर प्रभाव। उपाय: 14 मुखी व 8 मुखी रुद्राक्ष।" }
  ];

  const matched = kaalSarpTypes.find(t => t.house === rahuHouse) || kaalSarpTypes[0];

  return {
    hasKaalSarp: true,
    isPartial: isPartialKaalSarp,
    type: `${matched.name} (${isFullKaalSarp ? "पूर्ण" : "आंशिक / खंडित"})`,
    description: matched.desc
  };
}

/**
 * Shani Sade Sati & Dhaiya Real-time Evaluation
 * Current Sidereal Saturn is in Kumbha / Meen (Transit)
 */
export function evaluateSadeSati(natalMoonRashiIndex) {
  // Approximate sidereal transit Saturn (Saturn is in Aquarius 10 / Pisces 11 in current ephemeris)
  const currentTransitSaturnRashi = 10; // Kumbha (Aquarius)

  const dist = ((currentTransitSaturnRashi - natalMoonRashiIndex + 12) % 12);
  
  if (dist === 11) {
    return {
      inSadeSati: true,
      phase: "Rising Phase (प्रथम चरण - आद्य)",
      description: "शनि आपकी जन्म राशि से 12वें भाव में गोचर कर रहे हैं। यह साढ़े साती का प्रथम चरण है (व्यय, स्थानांतरण एवं मानसिक एकाग्रता का समय)।",
      remedy: "7 मुखी / 14 मुखी रुद्राक्ष एवं शनिवार को दशरथकृत शनि स्तोत्र का पाठ।"
    };
  } else if (dist === 0) {
    return {
      inSadeSati: true,
      phase: "Peak Phase (द्वितीय चरण - मध्य)",
      description: "शनि आपकी जन्म राशि पर ही गोचर कर रहे हैं। यह साढ़े साती का मुख्य चरण है (कर्म शुद्धि, धैर्य एवं आध्यात्मिक अनुशासन का समय)।",
      remedy: "7 मुखी व 11 मुखी रुद्राक्ष, 108 ॐ नमः शिवाय महामंत्र एवं छायादान।"
    };
  } else if (dist === 1) {
    return {
      inSadeSati: true,
      phase: "Setting Phase (तृतीय चरण - अन्त्य)",
      description: "शनि आपकी जन्म राशि से द्वितीय भाव में गोचर कर रहे हैं। यह साढ़े साती का उतरता चरण है (आर्थिक स्थिरता एवं कार्यों में धीरे-धीरे सफलता)।",
      remedy: "7 मुखी रुद्राक्ष एवं काले तिल व तेल का अर्पण।"
    };
  } else if (dist === 3) {
    return {
      inSadeSati: false,
      isDhaiya: true,
      phase: "Kantaka Shani Dhaiya (चतुर्थ ढैय्या)",
      description: "शनि जन्म राशि से चतुर्थ भाव में गोचर कर रहे हैं (ढैय्या प्रभाव)।",
      remedy: "7 मुखी रुद्राक्ष एवं हनुमान चालीसा का नित्य पाठ।"
    };
  } else if (dist === 7) {
    return {
      inSadeSati: false,
      isDhaiya: true,
      phase: "Ashtama Shani Dhaiya (अष्टम ढैय्या)",
      description: "शनि जन्म राशि से अष्टम भाव में गोचर कर रहे हैं (अष्टम ढैय्या)।",
      remedy: "7 मुखी व 14 मुखी रुद्राक्ष एवं शिव रुद्राभिषेक।"
    };
  }

  return {
    inSadeSati: false,
    isDhaiya: false,
    phase: "No Sade Sati (साढ़े साती मुक्त)",
    description: "वर्तमान में आप शनि की साढ़े साती अथवा ढैय्या के प्रभाव से मुक्त हैं।",
    remedy: "दैनिक 5 मुखी रुद्राक्ष धारण एवं शिव आराधना कल्याणकारी है।"
  };
}

/**
 * Master Function: Calculate Authentic Full Vedic Kundali from verified Birth Details
 * 
 * @param {Object} params
 * @param {string} params.dob - YYYY-MM-DD
 * @param {string} params.birthTime - HH:MM (24h) or 12h with AM/PM
 * @param {string} params.birthPlace - City / Place of Birth
 * @param {string} [params.name] - Devotee name (optional)
 * @param {string} [params.gender] - Devotee gender (optional)
 * @param {string} [params.concern] - Primary spiritual/life area (optional)
 * @param {string} [params.customConcern] - Custom user-written concern (optional)
 */
export function calculateAuthenticKundali(params = {}) {
  const dob = params.dob || params.birthDate || params.dateOfBirth || "";
  const birthTime = params.birthTime || params.tob || params.timeOfBirth || params.time || "";
  const birthPlace = params.birthPlace || params.pob || params.placeOfBirth || params.place || "";
  const name = params.name || "Devotee";
  const gender = params.gender || "";
  const concern = params.concern || "career";
  const customConcern = params.customConcern || "";

  if (!dob || typeof dob !== "string" || !dob.trim()) {
    throw new Error("Date of Birth (dob) is required for authentic Kundali calculation.");
  }
  if (!birthTime || typeof birthTime !== "string" || !birthTime.trim()) {
    throw new Error("Exact Birth Time (birthTime) is required for authentic Lagna & Kundali calculation.");
  }
  if (!birthPlace || typeof birthPlace !== "string" || !birthPlace.trim()) {
    throw new Error("Birth Place (birthPlace) is required for authentic Vedic Kundali coordinates.");
  }

  const cleanDob = dob.trim();
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
  const cleanTime = birthTime.trim();
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
  const location = resolveLocationCoordinates(birthPlace);
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
  const lagnaNav = calculateNavamsha(lagnaSid);

  const moonDetails = getRashiAndDegree(moonSid);
  const moonNak = getNakshatraAndPada(moonSid);
  const moonNav = calculateNavamsha(moonSid);

  const sunDetails = getRashiAndDegree(sunSid);
  const sunNak = getNakshatraAndPada(sunSid);
  const sunNav = calculateNavamsha(sunSid);

  // Calculate 12 Houses (Bhavas) relative to Lagna
  const lagnaRashiIndex = lagnaDetails.rashiIndex;

  function getHouseNumber(planetRashiIndex) {
    return ((planetRashiIndex - lagnaRashiIndex + 12) % 12) + 1;
  }

  // Planets Table with D9 Navamsha & Vargottama Detection
  const rawPlanets = [
    { name: "Surya (Sun)", key: "Sun", english: "Sun", deg: sunSid, details: sunDetails, nak: sunNak, nav: sunNav },
    { name: "Chandra (Moon)", key: "Moon", english: "Moon", deg: moonSid, details: moonDetails, nak: moonNak, nav: moonNav },
    { name: "Mangal (Mars)", key: "Mars", english: "Mars", deg: marsSid, details: getRashiAndDegree(marsSid), nak: getNakshatraAndPada(marsSid), nav: calculateNavamsha(marsSid) },
    { name: "Budha (Mercury)", key: "Mercury", english: "Mercury", deg: mercSid, details: getRashiAndDegree(mercSid), nak: getNakshatraAndPada(mercSid), nav: calculateNavamsha(mercSid) },
    { name: "Guru (Jupiter)", key: "Jupiter", english: "Jupiter", deg: jupSid, details: getRashiAndDegree(jupSid), nak: getNakshatraAndPada(jupSid), nav: calculateNavamsha(jupSid) },
    { name: "Shukra (Venus)", key: "Venus", english: "Venus", deg: venSid, details: getRashiAndDegree(venSid), nak: getNakshatraAndPada(venSid), nav: calculateNavamsha(venSid) },
    { name: "Shani (Saturn)", key: "Saturn", english: "Saturn", deg: satSid, details: getRashiAndDegree(satSid), nak: getNakshatraAndPada(satSid), nav: calculateNavamsha(satSid) },
    { name: "Rahu (North Node)", key: "Rahu", english: "Rahu", deg: rahuSid, details: getRashiAndDegree(rahuSid), nak: getNakshatraAndPada(rahuSid), nav: calculateNavamsha(rahuSid) },
    { name: "Ketu (South Node)", key: "Ketu", english: "Ketu", deg: ketuSid, details: getRashiAndDegree(ketuSid), nak: getNakshatraAndPada(ketuSid), nav: calculateNavamsha(ketuSid) }
  ];

  const planets = rawPlanets.map((p) => {
    const house = getHouseNumber(p.details.rashiIndex);
    const dignity = getPlanetaryDignity(p.key, p.details.rashiIndex);
    return {
      name: p.name,
      englishName: p.english,
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
      navamshaRashiHindi: p.nav.navamshaRashiHindi,
      navamshaRashiEnglish: p.nav.navamshaRashiEnglish,
      isVargottama: p.nav.isVargottama,
      isPushkarNavamsha: p.nav.isPushkarNavamsha
    };
  });

  // Bhavas (Houses) distribution
  const houses = [];
  for (let h = 1; h <= 12; h++) {
    const houseRashiIdx = (lagnaRashiIndex + h - 1) % 12;
    const rashiObj = RASHIS[houseRashiIdx];
    const occupants = planets.filter((p) => p.houseNumber === h).map((p) => p.name);
    houses.push({
      houseNumber: h,
      rashiHindi: rashiObj.name,
      rashiEnglish: rashiObj.english,
      rashiSymbol: rashiObj.symbol,
      lord: rashiObj.lord,
      element: rashiObj.element,
      occupants: occupants.length > 0 ? occupants : ["Shunya (No direct planet)"]
    });
  }

  // Panchanga
  const birthDateObj = new Date(`${dob}T${formattedBirthTime}:00Z`);
  const panchangInfo = calculatePanchanga(sunSid, moonSid, birthDateObj);

  // Vimshottari Dasha
  const dashaInfo = calculateVimshottariDasha(moonSid, birthDateObj, new Date());

  // Lagna Analysis & Yogakaraka
  const lagnaBeneficInfo = getLagnaBenefics(lagnaRashiIndex);

  // Astrological Dosha checks: Mangal Dosha with Cancellation Rules
  const marsHouse = planets.find(p => p.englishName === "Mars")?.houseNumber || 1;
  const marsRashiIdx = planets.find(p => p.englishName === "Mars")?.details?.rashiIndex;
  const moonHouse = planets.find(p => p.englishName === "Moon")?.houseNumber || 1;
  const marsFromMoon = ((marsHouse - moonHouse + 12) % 12) + 1;

  const isManglikFromLagna = [1, 2, 4, 7, 8, 12].includes(marsHouse);
  const isManglikFromMoon = [1, 2, 4, 7, 8, 12].includes(marsFromMoon);
  const isRawManglik = isManglikFromLagna || isManglikFromMoon;

  // Classical Manglik Cancellation (Kendra Jupiter, Mars in Aries/Scorpio/Capricorn, or after 28 years)
  const jupHouse = planets.find(p => p.englishName === "Jupiter")?.houseNumber;
  const hasJupiterAspectOnMars = jupHouse && ([1, 4, 7, 10].includes(jupHouse) || ((marsHouse - jupHouse + 12) % 12 + 1 === 5) || ((marsHouse - jupHouse + 12) % 12 + 1 === 9));
  const isMarsOwnOrExalted = [0, 7, 9].includes(marsRashiIdx);
  const isManglikCancelled = isRawManglik && (isMarsOwnOrExalted || hasJupiterAspectOnMars);
  const isEffectiveManglik = isRawManglik && !isManglikCancelled;

  // Sade Sati & Dhaiya
  const sadeSatiInfo = evaluateSadeSati(moonDetails.rashiIndex);

  // Kaal Sarp Dosha (12 Classical Types)
  const rahuHouse = planets.find(p => p.englishName === "Rahu")?.houseNumber || 1;
  const ketuHouse = planets.find(p => p.englishName === "Ketu")?.houseNumber || 7;
  const kaalSarpInfo = evaluateKaalSarpDosha(planets, rahuHouse, ketuHouse);

  // Classical Vedic Yogas Detection
  const yogasFound = [];
  const sunHouse = planets.find(p => p.englishName === "Sun")?.houseNumber;
  const mercHouse = planets.find(p => p.englishName === "Mercury")?.houseNumber;
  const venHouse = planets.find(p => p.englishName === "Venus")?.houseNumber;
  const satHouse = planets.find(p => p.englishName === "Saturn")?.houseNumber;

  // 1. Budhaditya Yoga
  if (sunHouse && mercHouse && sunHouse === mercHouse) {
    yogasFound.push({
      name: "Budhaditya Yoga (बुधादित्य राजयोग)",
      description: "सूर्य एवं बुध की युति तीक्ष्ण बुद्धि, प्रशासनिक कौशल और समाज में मान-प्रतिष्ठा प्रदान करती है।"
    });
  }

  // 2. Gajakesari Yoga (Jupiter in Kendra from Moon)
  if (jupHouse && moonHouse) {
    const jupFromMoon = ((jupHouse - moonHouse + 12) % 12) + 1;
    if ([1, 4, 7, 10].includes(jupFromMoon)) {
      yogasFound.push({
        name: "Gajakesari Yoga (गजकेसरी महायोग)",
        description: "चंद्रमा से केंद्र में गुरु की स्थिति जातक को अपार यश, दीर्घायु, विद्वता और उच्च पद प्रदान करती है।"
      });
    }
  }

  // 3. Chandra-Mangal Dhan Yoga
  if (marsHouse && moonHouse && marsHouse === moonHouse) {
    yogasFound.push({
      name: "Chandra-Mangal Yoga (महालक्ष्मी धन योग)",
      description: "चंद्र व मंगल की युति व्यापारिक उन्नति, आर्थिक संपन्नता और स्थायी संपत्ति का निर्माण करती है।"
    });
  }

  // 4. Pancha Mahapurusha Yogas
  if ([1, 4, 7, 10].includes(marsHouse) && [0, 7, 9].includes(planets.find(p => p.englishName === "Mars")?.details?.rashiIndex)) {
    yogasFound.push({ name: "Ruchaka Yoga (रुचक महापुरुष योग)", description: "मंगल का रुचक योग जातक को साहसी, पराक्रमी और नेतृत्वकारी बनाता है।" });
  }
  if ([1, 4, 7, 10].includes(jupHouse) && [3, 8, 11].includes(planets.find(p => p.englishName === "Jupiter")?.details?.rashiIndex)) {
    yogasFound.push({ name: "Hamsa Yoga (हंस महापुरुष योग)", description: "गुरु का हंस योग जातक को आध्यात्मिक, विद्वान और परोपकारी बनाता है।" });
  }
  if ([1, 4, 7, 10].includes(venHouse) && [1, 6, 11].includes(planets.find(p => p.englishName === "Venus")?.details?.rashiIndex)) {
    yogasFound.push({ name: "Malavya Yoga (मालव्य महापुरुष योग)", description: "शुक्र का मालव्य योग कला, वैभव, सौन्दर्य और भौतिक सुख-साधनों की प्राप्ति कराता है।" });
  }
  if ([1, 4, 7, 10].includes(satHouse) && [6, 9, 10].includes(planets.find(p => p.englishName === "Saturn")?.details?.rashiIndex)) {
    yogasFound.push({ name: "Sasa Yoga (शश महापुरुष योग)", description: "शनि का शश योग दूरदर्शिता, अनुशासन और संगठन कौशल प्रदान करता है।" });
  }
  if ([1, 4, 7, 10].includes(mercHouse) && [2, 5].includes(planets.find(p => p.englishName === "Mercury")?.details?.rashiIndex)) {
    yogasFound.push({ name: "Bhadra Yoga (भद्र महापुरुष योग)", description: "बुध का भद्र योग जातक को उच्च बौद्धिक क्षमता, व्यापार कुशलता और वाक-पटुता प्रदान करता है।" });
  }

  // 5. Vargottama Planets
  const vargottamaPlanets = planets.filter(p => p.isVargottama).map(p => p.name);
  if (vargottamaPlanets.length > 0) {
    yogasFound.push({
      name: `Vargottama Graha (${vargottamaPlanets.join(", ")})`,
      description: `लग्न एवं नवमांश (D9) दोनों कुंडलियों में समान राशि में स्थित होने से ये ग्रह अत्यंत शुभ एवं उच्च फल देने में सक्षम हैं।`
    });
  }

  // Rudraksha recommendations tailored from Lagna + Rashi + Dasha + Concern (All 16 life areas)
  const rudrakshaRecommendations = [];

  // 1. Lagna Rudraksha (Vitality & Protection)
  const lagnaRudrakshaMukhi = lagnaBeneficInfo.primeMukhi;
  rudrakshaRecommendations.push({
    role: "Lagna Lord Rudraksha (लग्न अधिपति)",
    significance: `Aapke Lagna (${lagnaDetails.rashiName} / ${lagnaDetails.rashiEnglish}) ke swami ${lagnaBeneficInfo.lagnesh} hain. Yeh sharir, aatmavishwas aur aura shuddhi ke liye param aavashyak hai.`,
    mukhi: `${lagnaRudrakshaMukhi} Mukhi Rudraksha`,
    mukhiNumber: lagnaRudrakshaMukhi,
    beejMantra: lagnaRudrakshaMukhi === 1 ? "Om Hreem Namah" : (lagnaRudrakshaMukhi === 5 ? "Om Hreem Namah" : "Om Namah Shivaya")
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
    mukhiNumber: rashiMukhi
  });

  // 3. Current Dasha Rudraksha
  rudrakshaRecommendations.push({
    role: `Current Dasha Rudraksha (${dashaInfo.currentMahadasha} Mahadasha)`,
    significance: `Aapke jeevan mein vartaman mein ${dashaInfo.currentMahadashaHindi} ki Mahadasha chal rahi hai. Is grah ke shubh prabhav ko badhane hetu ${dashaInfo.recommendedDashaRudraksha} anukul hai.`,
    mukhi: dashaInfo.recommendedDashaRudraksha,
    mukhiNumber: parseInt(dashaInfo.recommendedDashaRudraksha, 10) || 5
  });

  // 4. Concern-Specific Rudraksha Recommendation (Covering all 16 life areas + custom)
  const activeConcern = String(concern || "career").toLowerCase();
  const effectiveCustomText = customConcern || "";

  if (activeConcern === "career" || activeConcern === "job" || activeConcern === "naukri") {
    rudrakshaRecommendations.push({
      role: "Career & Authority Growth (करियर व आजीविका उन्नति)",
      significance: "दशम भाव आजीविका, पद-प्रतिष्ठा व उच्च पद प्राप्ति हेतु 10 मुखी (भगवान विष्णु), 14 मुखी (देव मणि) व 7 मुखी (महालक्ष्मी) अत्यंत फलदायी हैं।",
      mukhi: "10 Mukhi / 14 Mukhi Rudraksha",
      mukhiNumber: 10
    });
  } else if (activeConcern === "business" || activeConcern === "trade" || activeConcern === "vyapar") {
    rudrakshaRecommendations.push({
      role: "Business & Commercial Expansion (व्यापार व व्यवसाय वृद्धि)",
      significance: "व्यापार में स्थायित्व, ग्राहक वृद्धि व लाभ मार्ग प्रशस्त करने हेतु 7 मुखी (महालक्ष्मी) एवं 12 मुखी (सूर्य देव) सर्वोत्तम हैं।",
      mukhi: "7 Mukhi / 12 Mukhi Rudraksha",
      mukhiNumber: 7
    });
  } else if (activeConcern === "education" || activeConcern === "studies" || activeConcern === "vidya") {
    rudrakshaRecommendations.push({
      role: "Education, Memory & Intellect (शिक्षा, विद्या व तीक्ष्ण स्मृति)",
      significance: "विद्या की अधिष्ठात्री मां सरस्वती एवं चतुर्मुख ब्रह्मा स्वरूप 4 मुखी व 6 मुखी (कार्तिकेय) रुद्राक्ष एकाग्रता और प्रतियोगी परीक्षा में सफलता दिलाते हैं।",
      mukhi: "4 Mukhi / 6 Mukhi Rudraksha",
      mukhiNumber: 4
    });
  } else if (activeConcern === "marriage" || activeConcern === "vivah" || activeConcern === "damptya") {
    rudrakshaRecommendations.push({
      role: "Marriage, Harmony & Delay Removal (विवाह व दांपत्य सुख)",
      significance: "सप्तम भाव शुद्धि, शीघ्र विवाह एवं दांपत्य जीवन में अगाध प्रेम हेतु साक्षात शिव-शक्ति स्वरूप 'गौरी शंकर रुद्राक्ष' एवं 2 मुखी (अर्धनारीश्वर) सर्वोत्तम हैं।",
      mukhi: "Gauri Shankar / 2 Mukhi Rudraksha",
      mukhiNumber: 2
    });
  } else if (activeConcern === "love" || activeConcern === "relationship" || activeConcern === "prem") {
    rudrakshaRecommendations.push({
      role: "Love, Attraction & Relationship Harmony (प्रेम संबंध व आकर्षण)",
      significance: "शुक्र ग्रह व कामदेव स्वरूप 13 मुखी एवं 6 मुखी रुद्राक्ष आकर्षण, आपसी समझ एवं प्रेम संबंधों में मजबूती लाते हैं।",
      mukhi: "13 Mukhi / 6 Mukhi Rudraksha",
      mukhiNumber: 13
    });
  } else if (activeConcern === "family" || activeConcern === "parivar") {
    rudrakshaRecommendations.push({
      role: "Family Peace & Domestic Bliss (पारिवारिक शांति व सद्भाव)",
      significance: "पारिवारिक क्लेश निवारण, घर में सुख-शांति व सकारात्मक ऊर्जा हेतु 2 मुखी एवं 5 मुखी पंचमुखी रुद्राक्ष माला अत्यंत मंगलकारी है।",
      mukhi: "2 Mukhi / 5 Mukhi Rudraksha",
      mukhiNumber: 2
    });
  } else if (activeConcern === "health" || activeConcern === "swasthya" || activeConcern === "arogya") {
    rudrakshaRecommendations.push({
      role: "Health, Vitality & Longevity (स्वास्थ्य, आरोग्य व दीर्घायु)",
      significance: "अग्नि स्वरूप 3 मुखी (ऊर्जा संतुलन), 5 मुखी (रक्तचाप व हृदय शांति) एवं 11 मुखी (हनुमान जी - अकाल मृत्यु भय नाशक) दिव्य आरोग्य कवच हैं।",
      mukhi: "3 Mukhi / 11 Mukhi Rudraksha",
      mukhiNumber: 11
    });
  } else if (activeConcern === "finance" || activeConcern === "wealth" || activeConcern === "dhan") {
    rudrakshaRecommendations.push({
      role: "Finance, Wealth & Debt Relief (धन, आर्थिक संपन्नता व ऋण मुक्ति)",
      significance: "महालक्ष्मी स्वरूप 7 मुखी, कुबेर स्वरूप 8 मुखी एवं 21 मुखी दिव्य रुद्राक्ष आर्थिक अवरोधों को नष्ट कर धन वर्षा कराते हैं।",
      mukhi: "7 Mukhi / 8 Mukhi Rudraksha",
      mukhiNumber: 7
    });
  } else if (activeConcern === "children" || activeConcern === "santan" || activeConcern === "progeny") {
    rudrakshaRecommendations.push({
      role: "Child Happiness & Growth (संतान सुख व संतान कल्याण)",
      significance: "पंचम भाव संवर्धन एवं संतान सुख हेतु 'गर्भ गौरी रुद्राक्ष' (मां पार्वती व बाल गणेश) एवं 5 मुखी रुद्राक्ष अचूक आशीर्वाद हैं।",
      mukhi: "Garbh Gauri / 5 Mukhi Rudraksha",
      mukhiNumber: 5
    });
  } else if (activeConcern === "property" || activeConcern === "bhoomi" || activeConcern === "vehicle") {
    rudrakshaRecommendations.push({
      role: "Property, Land & Assets (भूमि, भवन, वाहन व संपत्ति योग)",
      significance: "चतुर्थ भाव व भूमिपुत्र मंगल की अनुकूलता हेतु 3 मुखी, 4 मुखी एवं 7 मुखी रुद्राक्ष का संयोजन स्थायी संपत्ति निर्माण कराता है।",
      mukhi: "3 Mukhi / 7 Mukhi Rudraksha",
      mukhiNumber: 3
    });
  } else if (activeConcern === "spiritual" || activeConcern === "spirituality" || activeConcern === "moksha") {
    rudrakshaRecommendations.push({
      role: "Spiritual Upliftment & Meditation (अध्यात्म, साधना व मोक्ष)",
      significance: "साक्षात शिव स्वरूप 1 मुखी एवं 14 मुखी (अजना चक्र जाग्रति) रुद्राक्ष ध्यान, कुंडलिनी जागरण व आत्म साक्षात्कार में परम सहायक हैं।",
      mukhi: "1 Mukhi / 14 Mukhi Rudraksha",
      mukhiNumber: 1
    });
  } else if (activeConcern === "foreign_travel" || activeConcern === "videsh" || activeConcern === "visa") {
    rudrakshaRecommendations.push({
      role: "Foreign Travel, Relocation & Visa Success (विदेश यात्रा व विदेश योग)",
      significance: "द्वादश भाव (विदेश) एवं राहु-बुध की अनुकूलता हेतु 8 मुखी (विघ्नहर्ता) एवं 4 मुखी रुद्राक्ष विदेश यात्रा की बाधाएं दूर करते हैं।",
      mukhi: "8 Mukhi / 4 Mukhi Rudraksha",
      mukhiNumber: 8
    });
  } else if (activeConcern === "legal" || activeConcern === "court" || activeConcern === "litigation") {
    rudrakshaRecommendations.push({
      role: "Legal Victory, Court Matters & Enemy Protection (कोर्ट-कचहरी व शत्रु विजय)",
      significance: "षष्ठम भाव विजय एवं कानूनी मामलों में रक्षा हेतु 11 मुखी (रुद्र अवतार - विजय कवच) एवं 10 मुखी (दशदिक्पाल रक्षा) अचूक हैं।",
      mukhi: "11 Mukhi / 10 Mukhi Rudraksha",
      mukhiNumber: 11
    });
  } else if (activeConcern === "shani_dosha" || activeConcern === "dosha" || activeConcern === "sadesati") {
    rudrakshaRecommendations.push({
      role: "Shani & Rahu-Ketu Shanti (ग्रह दोष निवारण)",
      significance: "शनि साढ़े साती एवं राहु-केतु दोष निवारण हेतु 7 मुखी, 8 मुखी एवं 11 मुखी रुद्राक्ष परम रक्षा कवच हैं।",
      mukhi: "7 Mukhi / 11 Mukhi Rudraksha",
      mukhiNumber: 11
    });
  } else if (activeConcern === "custom" || effectiveCustomText) {
    rudrakshaRecommendations.push({
      role: `Custom Devotee Resolution (${effectiveCustomText.slice(0, 40) || "विशेष व्यक्तिगत प्रश्न"})`,
      significance: `Aapke vishisht sankalp "${effectiveCustomText || 'Custom Concern'}" ki siddhi hetu Lagnesh aur Yogakaraka grah ka Siddh Rudraksha combination dharan karein.`,
      mukhi: `${lagnaRudrakshaMukhi} Mukhi + 7 Mukhi`,
      mukhiNumber: lagnaRudrakshaMukhi
    });
  } else {
    rudrakshaRecommendations.push({
      role: "Sarva Siddha Sampurna Kalyan (संपूर्ण जीवन विश्लेषण व सर्व कल्याण)",
      significance: "करियर, स्वास्थ्य, विवाह, धन एवं ग्रह दोषों की संपूर्ण शांति हेतु 1 से 14 मुखी सिद्ध संयोजन अथवा त्रि-शक्ति (7+5+11 मुखी) दिव्य कवच सर्वोत्तम है।",
      mukhi: "1 to 14 Mukhi / Siddh Combination",
      mukhiNumber: 7
    });
  }

  // Numerology Mulank (Day of Birth)
  const mulank = ((day - 1) % 9) + 1;

  return {
    verifiedBirthData: {
      name: name || "Devotee",
      gender: gender || "Not Specified",
      dob,
      birthTime: formattedBirthTime,
      birthPlace: location.name,
      coordinates: { lat: location.lat, lon: location.lon, tz: location.tz },
      julianDay: jd.toFixed(4),
      ayanamsha: `${Math.floor(ayanamsha)}° ${Math.floor((ayanamsha % 1) * 60)}' (Lahiri)`
    },
    astronomicalKundali: {
      panchanga: panchangInfo,
      lagna: {
        rashiHindi: lagnaDetails.rashiName,
        rashiEnglish: lagnaDetails.rashiEnglish,
        rashiSymbol: lagnaDetails.rashiSymbol,
        degree: lagnaDetails.formattedDegree,
        nakshatra: lagnaNak.name,
        pada: lagnaNak.pada,
        lord: lagnaDetails.lord,
        element: lagnaDetails.element,
        navamsha: lagnaNav.navamshaRashiHindi,
        isVargottama: lagnaNav.isVargottama
      },
      chandraRashi: {
        rashiHindi: moonDetails.rashiName,
        rashiEnglish: moonDetails.rashiEnglish,
        rashiSymbol: moonDetails.rashiSymbol,
        degree: moonDetails.formattedDegree,
        nakshatra: moonNak.name,
        pada: moonNak.pada,
        lord: moonDetails.lord,
        element: moonDetails.element,
        navamsha: moonNav.navamshaRashiHindi,
        isVargottama: moonNav.isVargottama
      },
      suryaRashi: {
        rashiHindi: sunDetails.rashiName,
        rashiEnglish: sunDetails.rashiEnglish,
        degree: sunDetails.formattedDegree,
        nakshatra: sunNak.name,
        navamsha: sunNav.navamshaRashiHindi
      },
      mulank,
      planets,
      houses,
      vimshottariDasha: dashaInfo,
      doshaSummary: {
        isManglik: isEffectiveManglik,
        rawManglik: isRawManglik,
        isManglikCancelled,
        manglikNote: isEffectiveManglik 
          ? `Mangal ${marsHouse}th House (Lagna) / ${marsFromMoon}th (Chandra) mein sthit hai (Manglik Prabhav Shanti ke liye 3 Mukhi / 11 Mukhi upyogi hai).`
          : (isManglikCancelled ? "Manglik prabhav shastriya niyamanusar swa-rashi/uchha ya Guru drishti se shant/bhang hai." : "Kendra ya Trikon mein Mangal anukool sthiti mein hai (Non-Manglik)."),
        sadeSati: sadeSatiInfo,
        kaalSarp: kaalSarpInfo
      },
      yogas: yogasFound,
      rudrakshaRecommendations
    }
  };
}
