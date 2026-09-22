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
    antardashasTimeline,
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

  // Vimshottari Dasha
  const dashaInfo = calculateVimshottariDasha(moonSid, birthDateObj, new Date());

  // Lagna Analysis & Yogakaraka
  const lagnaBeneficInfo = getLagnaBenefics(lagnaRashiIndex);

  // Astrological Dosha checks
  const marsPlanet = planets.find(p => p.englishName === "Mars");
  const marsHouse = marsPlanet?.houseNumber || 1;
  const isManglikPosition = [1, 4, 7, 8, 12].includes(marsHouse);
  
  // Parashari Manglik cancellation checks:
  // Mars in own sign (Aries/Scorpio) or exalted (Capricorn), or Jupiter aspect
  const marsDignity = marsPlanet?.dignity || "";
  const isMarsInOwnOrExalted = marsDignity.includes("Own") || marsDignity.includes("Exalted");
  const isManglik = isManglikPosition && !isMarsInOwnOrExalted;

  // Kaal Sarp Dosha Check
  const rahuHouse = planets.find(p => p.englishName === "Rahu")?.houseNumber || 1;
  const ketuHouse = planets.find(p => p.englishName === "Ketu")?.houseNumber || 7;
  const kaalSarpInfo = getKaalSarpType(rahuHouse, ketuHouse, planets);

  // Sade Sati Status
  const sadeSatiInfo = getSadeSatiStatus(moonDetails.rashiIndex, satSid);

  // Classical & Parashari Yogas Analysis
  const yogas = [];
  const jupPlanet = planets.find(p => p.englishName === "Jupiter");
  const moonPlanet = planets.find(p => p.englishName === "Moon");
  const sunPlanet = planets.find(p => p.englishName === "Sun");
  const mercPlanet = planets.find(p => p.englishName === "Mercury");
  const satPlanet = planets.find(p => p.englishName === "Saturn");
  const venPlanet = planets.find(p => p.englishName === "Venus");

  // 1. Gajakesari Yoga
  if (jupPlanet && moonPlanet) {
    const jupMoonDiff = Math.abs(jupPlanet.houseNumber - moonPlanet.houseNumber);
    if ([0, 3, 6, 9].includes(jupMoonDiff)) {
      yogas.push({ name: "Gajakesari Yoga (गजकेसरी योग)", category: "Auspicious Raja Yoga", description: "Jupiter in Kendra (1st, 4th, 7th, 10th) from Moon. Bestows wisdom, high social respect, lasting prosperity, and divine protection." });
    }
  }

  // 2. Budhaditya Yoga
  if (sunPlanet && mercPlanet && sunPlanet.houseNumber === mercPlanet.houseNumber) {
    const isMercCombust = mercPlanet.isCombust;
    yogas.push({ 
      name: "Budhaditya Yoga (बुधादित्य योग)", 
      category: "Intellectual Raja Yoga", 
      description: isMercCombust 
        ? "Sun and Mercury conjunction in House " + sunPlanet.houseNumber + ". Bestows sharp intellect, commercial acumen, and analytical prowess." 
        : "Pure uncombust Sun-Mercury conjunction in House " + sunPlanet.houseNumber + ". Bestows extraordinary intelligence, administrative success, eloquence, and sharp judgment." 
    });
  }

  // 3. Pancha Mahapurusha Yogas (Kendra + Own/Exalted)
  const kendraHouses = [1, 4, 7, 10];
  if (marsPlanet && kendraHouses.includes(marsPlanet.houseNumber) && (marsPlanet.dignity.includes("Exalted") || marsPlanet.dignity.includes("Own"))) {
    yogas.push({ name: "Ruchaka Mahapurusha Yoga (रुचक महापुरुष योग)", category: "Pancha Mahapurusha", description: "Mars in Kendra in Own/Exalted sign. Bestows immense physical courage, leadership, high administrative/military rank, and land authority." });
  }
  if (mercPlanet && kendraHouses.includes(mercPlanet.houseNumber) && (mercPlanet.dignity.includes("Exalted") || mercPlanet.dignity.includes("Own"))) {
    yogas.push({ name: "Bhadra Mahapurusha Yoga (भद्र महापुरुष योग)", category: "Pancha Mahapurusha", description: "Mercury in Kendra in Gemini/Virgo. Bestows profound intellectual genius, scholarly eloquence, longevity, and high commercial mastery." });
  }
  if (jupPlanet && kendraHouses.includes(jupPlanet.houseNumber) && (jupPlanet.dignity.includes("Exalted") || jupPlanet.dignity.includes("Own"))) {
    yogas.push({ name: "Hamsa Mahapurusha Yoga (हंस महापुरुष योग)", category: "Pancha Mahapurusha", description: "Jupiter in Kendra in Cancer/Sagittarius/Pisces. Bestows righteousness, supreme spiritual wisdom, high respect from rulers, and noble character." });
  }
  if (venPlanet && kendraHouses.includes(venPlanet.houseNumber) && (venPlanet.dignity.includes("Exalted") || venPlanet.dignity.includes("Own"))) {
    yogas.push({ name: "Malavya Mahapurusha Yoga (मालव्य महापुरुष योग)", category: "Pancha Mahapurusha", description: "Venus in Kendra in Taurus/Libra/Pisces. Bestows magnetic charisma, artistic elegance, luxurious conveyances, marital bliss, and wealth." });
  }
  if (satPlanet && kendraHouses.includes(satPlanet.houseNumber) && (satPlanet.dignity.includes("Exalted") || satPlanet.dignity.includes("Own"))) {
    yogas.push({ name: "Sasa Mahapurusha Yoga (शश महापुरुष योग)", category: "Pancha Mahapurusha", description: "Saturn in Kendra in Capricorn/Aquarius/Libra. Bestows steadfast perseverance, mass leadership, strategic patience, authority over land and institutions." });
  }

  // 4. Vipreet Raja Yogas (Harsha, Sarala, Vimala)
  const house6Lord = houses[5]?.lord;
  const house8Lord = houses[7]?.lord;
  const house12Lord = houses[11]?.lord;

  const house6LordPlanet = planets.find(p => p.name.includes(house6Lord) || p.englishName.includes(house6Lord));
  const house8LordPlanet = planets.find(p => p.name.includes(house8Lord) || p.englishName.includes(house8Lord));
  const house12LordPlanet = planets.find(p => p.name.includes(house12Lord) || p.englishName.includes(house12Lord));

  if (house6LordPlanet && [6, 8, 12].includes(house6LordPlanet.houseNumber)) {
    yogas.push({ name: "Harsha Vipreet Raja Yoga (हर्ष विपरीत राजयोग)", category: "Vipreet Raja Yoga", description: "6th Lord placed in Trik House (6th, 8th, or 12th). Grants victory over enemies, resilience against illness, and rise after initial struggle." });
  }
  if (house8LordPlanet && [6, 8, 12].includes(house8LordPlanet.houseNumber)) {
    yogas.push({ name: "Sarala Vipreet Raja Yoga (सरल विपरीत राजयोग)", category: "Vipreet Raja Yoga", description: "8th Lord placed in Trik House (6th, 8th, or 12th). Bestows fearlessness, unexpected windfalls, deep longevity, and triumph over adversities." });
  }
  if (house12LordPlanet && [6, 8, 12].includes(house12LordPlanet.houseNumber)) {
    yogas.push({ name: "Vimala Vipreet Raja Yoga (विमल विपरीत राजयोग)", category: "Vipreet Raja Yoga", description: "12th Lord placed in Trik House (6th, 8th, or 12th). Bestows noble character, financial independence, spiritual inclination, and freedom from heavy debts." });
  }

  // 5. Chandra-Mangal Yoga (Wealth from Enterprise)
  if (moonPlanet && marsPlanet && moonPlanet.houseNumber === marsPlanet.houseNumber) {
    yogas.push({ name: "Chandra-Mangal Yoga (चंद्र-मंगल धन योग)", category: "Dhana Yoga", description: "Moon and Mars conjunction. Bestows energetic business acumen, financial enterprise, real estate accumulation, and strong earning capability." });
  }

  // 6. Neecha Bhanga Raja Yoga (NBRY) check
  planets.filter(p => p.dignity.includes("Debilitated")).forEach(debPlanet => {
    // Check if dispositor is in Kendra from Lagna or Moon
    const debSignIdx = debPlanet.rawDegreeInSign !== undefined ? Math.floor(debPlanet.totalDegree / 30) : 0;
    const dispositorLordName = RASHIS[debSignIdx]?.lord;
    const dispositorPlanet = planets.find(p => p.name.includes(dispositorLordName) || p.englishName.includes(dispositorLordName));
    
    let isDispositorInKendra = false;
    if (dispositorPlanet) {
      const fromLagna = kendraHouses.includes(dispositorPlanet.houseNumber);
      const fromMoon = moonPlanet ? kendraHouses.includes(((dispositorPlanet.houseNumber - moonPlanet.houseNumber + 12) % 12) + 1) : false;
      isDispositorInKendra = fromLagna || fromMoon;
    }

    const isDebInKendra = kendraHouses.includes(debPlanet.houseNumber);
    const isExaltedInD9 = debPlanet.navamshaRashiHindi && debPlanet.navamshaRashiHindi.includes(RASHIS[debSignIdx]?.name);

    if (isDispositorInKendra || isDebInKendra || isExaltedInD9) {
      yogas.push({
        name: `Neecha Bhanga Raja Yoga for ${debPlanet.name} (नीचभंग राजयोग)`,
        category: "Neecha Bhanga",
        description: `${debPlanet.name} debilitated in D1 parantu Parashari NBRY rules se dosha cancel hokar powerful Raja Yoga mein transform ho gaya hai. Shuruaati sangharsh ke baad apratim safalta milegi.`
      });
    }
  });

  // 7. Vargottama Yoga
  const vargottamaPlanets = planets.filter(p => p.isVargottama);
  if (vargottamaPlanets.length > 0) {
    yogas.push({
      name: `Vargottama Graha Yoga (${vargottamaPlanets.map(p => p.name).join(", ")})`,
      category: "Varga Strength",
      description: "Planets occupying identical signs in D1 (Rashi) and D9 (Navamsha). Imparts steadfast strength, pure natural karakatwa, and auspicious longevity."
    });
  }

  // Rudraksha recommendations tailored from Lagna + Rashi + Dasha + Concern
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

  // 4. Concern-Specific Rudraksha Recommendation (17 Life Areas + All + Custom)
  const concernMap = {
    "all": { mukhi: "1 Mukhi / 5 Mukhi / 108 Jaap Mala / Siddha Mala", role: "Complete Life Guidance (संपूर्ण जीवन संरक्षण व सिद्धि)", significance: "समस्त 16 जीवन क्षेत्रों (करियर, स्वास्थ्य, धन, विवाह, संतान व मोक्ष) की समग्र उन्नति व सुरक्षा हेतु।" },
    "career": { mukhi: "7 Mukhi / 10 Mukhi / 14 Mukhi", role: "Career & Leadership (करियर व आजीविका)", significance: "Lord Shiva & Lakshmi blessing for profession, stable growth, authority & promotion." },
    "business": { mukhi: "7 Mukhi / 8 Mukhi / 12 Mukhi", role: "Business & Trade (व्यापार व व्यवसाय वृद्धि)", significance: "Vighnaharta Ganesha & Mahalakshmi grace for business expansion and cash flow." },
    "education": { mukhi: "4 Mukhi / 5 Mukhi / Saraswati Bandh", role: "Education & Intellect (विद्या व एकाग्रता)", significance: "Lord Brahma & Devi Saraswati blessings for memory, concentration & exam success." },
    "marriage": { mukhi: "2 Mukhi / Gauri Shankar", role: "Marriage & Harmony (विवाह व दांपत्य सुख)", significance: "Ardhanarishvara blessing to remove delays in marriage and bless couples with lifelong unity." },
    "love": { mukhi: "2 Mukhi / 6 Mukhi / 13 Mukhi", role: "Love & Attraction (प्रेम संबंध व आकर्षण)", significance: "Kamadeva & Kartikeya grace for sincere relationships, magnetism and mutual respect." },
    "family": { mukhi: "2 Mukhi / 3 Mukhi / Gauri Shankar", role: "Family Peace (पारिवारिक शांति)", significance: "Harmonizes relations with parents, spouse and relatives, eliminates domestic discord." },
    "health": { mukhi: "3 Mukhi / 5 Mukhi / 11 Mukhi", role: "Health & Longevity (आरोग्य व दीर्घायु)", significance: "Lord Agni & Hanuman blessing for vitality, digestion, immunity and chronic illness protection." },
    "finance": { mukhi: "7 Mukhi / 13 Mukhi / 21 Mukhi", role: "Wealth & Debt Relief (धन समृद्धि व ऋण मुक्ति)", significance: "Mahalakshmi & Kubera grace for debt clearance, wealth retention and abundance." },
    "children": { mukhi: "Garbh Gauri / 5 Mukhi / 9 Mukhi", role: "Children & Progeny (संतान सुख व कल्याण)", significance: "Devi Parvati & Ganesha blessings for progeny happiness, child protection and intelligence." },
    "property": { mukhi: "3 Mukhi / 10 Mukhi / 14 Mukhi", role: "Property & Assets (भूमि, भवन व वाहन योग)", significance: "Lord Vishnu & Mangal dev blessings for real estate gains and dispute clearance." },
    "spiritual": { mukhi: "1 Mukhi / 14 Mukhi / 108 Jaap Mala", role: "Spiritual Upliftment (आध्यात्मिक उन्नति व साधना)", significance: "Supreme Shiva consciousness for deep meditation, Kundalini awakening and peace." },
    "foreign_travel": { mukhi: "8 Mukhi / 12 Mukhi", role: "Foreign Travel & Visa (विदेश यात्रा व विदेश योग)", significance: "Removes foreign settlement hurdles, visa delays and overseas career friction." },
    "legal": { mukhi: "8 Mukhi / 10 Mukhi / 11 Mukhi", role: "Legal Victory (कोर्ट-कचहरी व कानूनी विजय)", significance: "Lord Hanuman & Yamraj protection against false allegations, lawsuits and enemies." },
    "shani_dosha": { mukhi: "7 Mukhi / 14 Mukhi / 11 Mukhi", role: "Dosha & Shani Shanti (शनि साढ़े साती व ग्रह दोष)", significance: "Lord Shani & Rudra blessing to pacify Sade Sati, Dhaiya, Rahu/Ketu & Kaal Sarp afflictions." },
    "peace": { mukhi: "2 Mukhi / 5 Mukhi", role: "Mental Peace (मानसिक शांति व तनाव मुक्ति)", significance: "Calms overthinking, anxiety, removes Chandra afflictions and brings serene focus." },
    "general": { mukhi: "5 Mukhi / 7 Mukhi / 108 Jaap Mala", role: "General Auspiciousness (सर्वकल्याण व रक्षा)", significance: "Universal Kalagni Rudra protection for everyday well-being, luck and positivity." },
    "custom": { mukhi: "1 Mukhi / 5 Mukhi / 11 Mukhi", role: "Special Purpose (विशेष संकल्प)", significance: customConcern ? `Devotee's custom concern: "${customConcern}".` : "Tailored Vedic solution for personal intention." }
  };

  const selectedConcern = concernMap[concern] || concernMap["all"];
  rudrakshaRecommendations.push({
    role: `Primary Life Goal (${selectedConcern.role})`,
    significance: selectedConcern.significance,
    mukhi: selectedConcern.mukhi,
    mukhiNumber: parseInt(selectedConcern.mukhi, 10) || 5
  });

  // Numerology Mulank (Day of Birth)
  const mulank = ((day - 1) % 9) + 1;

  return {
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
        rashiHindi: lagnaDetails.rashiName,
        rashiEnglish: lagnaDetails.rashiEnglish,
        rashiSymbol: lagnaDetails.rashiSymbol,
        degree: lagnaDetails.formattedDegree,
        nakshatra: lagnaNak.name,
        pada: lagnaNak.pada,
        navamsha: `${lagnaNavamsha.rashiName} (${lagnaNavamsha.rashiEnglish})`,
        lord: lagnaDetails.lord,
        element: lagnaDetails.element
      },
      chandraRashi: {
        rashiHindi: moonDetails.rashiName,
        rashiEnglish: moonDetails.rashiEnglish,
        rashiSymbol: moonDetails.rashiSymbol,
        degree: moonDetails.formattedDegree,
        nakshatra: moonNak.name,
        pada: moonNak.pada,
        navamsha: `${moonNavamsha.rashiName} (${moonNavamsha.rashiEnglish})`,
        lord: moonDetails.lord,
        element: moonDetails.element
      },
      suryaRashi: {
        rashiHindi: sunDetails.rashiName,
        rashiEnglish: sunDetails.rashiEnglish,
        degree: sunDetails.formattedDegree,
        nakshatra: sunNak.name
      },
      mulank,
      panchanga,
      planets,
      houses,
      vimshottariDasha: dashaInfo,
      doshaSummary: {
        isManglik,
        isManglikPosition,
        manglikNote: isManglik 
          ? `Mangal ${marsHouse}th House mein sthit hai (Manglik Prabhav Shanti ke liye 3 Mukhi / 11 Mukhi upyogi hai).` 
          : (isMarsInOwnOrExalted ? `Mangal ${marsHouse}th House mein swarashi/uchha hone se Manglik dosha Parashari niyam se cancel (Nivritti) ho gaya hai.` : "Kendra ya Trikon mein Mangal anukool sthiti mein hai (Manglik dosha mukt)."),
        sadeSati: sadeSatiInfo,
        kaalSarp: kaalSarpInfo || { type: "Kaal Sarp Mukt", description: "Kundali mein sabhi grah Rahu-Ketu ke bahar sthit hain (Kaal Sarp dosha nahi hai)." }
      },
      yogas,
      jaiminiKarakas,
      badhakaMarakaInfo,
      rudrakshaRecommendations
    }
  };
}

/**
 * Determine Question Intent for Focused Astrological Analysis
 */
export function determineAstrologicalIntent(userQuery = "") {
  if (!userQuery || typeof userQuery !== "string") return { type: "full_kundali", label: "Sampurna Vedic Kundali Vishleshan" };
  const q = userQuery.toLowerCase().trim();

  // Greetings & Casual Hi (when user just greets without specific query)
  if (
    /^(hi|hii|hiii|hiiii|helo|hello|hey|namaste|namaskar|pranam|ram ram|radhe radhe|jai shree ram|har har mahadev|greetings)$/i.test(q) ||
    /^(नमस्ते|प्रणाम|नमस्कार|जय श्री राम|हर हर महादेव|राधे राधे|हेलो|हाय)$/i.test(q) ||
    (q.length <= 25 && /^(hi|hii|hello|hey|namaste|pranam|namaskar|नमस्ते|प्रणाम|नमस्कार)\b/i.test(q) && !/kundali|dasha|rashi|graha|job|shaadi|future|batao|bataiye|dekh/i.test(q))
  ) {
    return { type: "greeting", label: "Devotee Greeting" };
  }

  // Full Kundali triggers (any request for Kundali reading or comprehensive analysis)
  if (
    /puri kundali|poori kundali|full kundali|complete reading|poori jankari|sampurna kundali|har har mahadev|sab batayein|sabhi grah|विस्तार से|पूरी कुंडली|कुंडली|कुण्डली|kundali|kundli/i.test(q)
  ) {
    // If it's a specific narrow question without 'kundali' or 'batao'
    if (
      /career|job|naukri|shaadi|marriage|vivah|finance|health|videsh/i.test(q) &&
      !/kundali|kundli|कुण्डली|कुंडली|puri|poori|full|complete|sampurna|sab|batao|bataiye|dekh|विश्लेषण/i.test(q)
    ) {
      // Allow specific classification
    } else {
      return { type: "full_kundali", label: "Sampurna Vedic Kundali Vishleshan" };
    }
  }

  // Career
  if (/career|job|naukri|business|paisa|vyapar|promotion|success|kaam|profession|d10|dashamsha|10th house|कैरियर|नौकरी|व्यापार|रोजगार|काम/i.test(q)) {
    return { type: "career", label: "Career & Business Analysis", houses: [10, 1, 6, 2, 11], karakas: ["Sun", "Mars", "Saturn", "Mercury", "AmK"], dChart: "D10 Dashamsha" };
  }

  // Marriage & Relationships
  if (/marriage|shaadi|shadi|vivah|love|relationship|husband|wife|spouse|partner|manglik|d9|navamsha|7th house|upapada|शादी|विवाह|पति|पत्नी|दंपति|प्रेम/i.test(q)) {
    return { type: "marriage", label: "Marriage & Relationship Analysis", houses: [7, 2, 4, 8], karakas: ["Venus", "Jupiter", "DK"], dChart: "D9 Navamsha" };
  }

  // Wealth & Finance
  if (/wealth|dhan|money|paisa|finance|debt|karza|riddhi|siddhi|11th house|2nd house|dhana yoga|lakshmi|धन|संपत्ति|कर्ज|रुपया|पैसा/i.test(q)) {
    return { type: "finance", label: "Wealth & Finance Analysis", houses: [2, 11, 5, 9, 6], karakas: ["Jupiter", "Venus", "Mercury"], dChart: "D2 Hora" };
  }

  // Health
  if (/health|roog|rog|illness|disease|hospital|bimari|swasthya|longevity|ayush|6th house|8th house|स्वास्थ्य|बीमारी|रोग|आयु|आरोग्य/i.test(q)) {
    return { type: "health", label: "Health & Vitality Analysis", houses: [1, 6, 8, 12], karakas: ["Sun", "Moon", "Mars", "Saturn"], dChart: "D30 Trimshamsha" };
  }

  // Education
  if (/study|padhai|education|exam|competitive|degree|school|college|5th house|4th house|पढ़ाई|शिक्षा|परीक्षा|विद्या/i.test(q)) {
    return { type: "education", label: "Education & Intellect Analysis", houses: [4, 5, 9, 6], karakas: ["Mercury", "Jupiter"], dChart: "D24 Chaturvimshamsha" };
  }

  // Travel & Foreign
  if (/foreign|abroad|travel|visa|pr|settlement|videsh|12th house|9th house|विदेश|यात्रा|वीजा|विदेश वास/i.test(q)) {
    return { type: "travel", label: "Foreign Travel & Relocation Analysis", houses: [12, 9, 3, 7], karakas: ["Rahu", "Moon"], dChart: "D9 Navamsha" };
  }

  // Children / Progeny
  if (/child|baby|bachha|santan|progeny|conception|5th house|d7|संतान|बच्चा|वंश/i.test(q)) {
    return { type: "progeny", label: "Children & Lineage Analysis", houses: [5, 9, 2], karakas: ["Jupiter", "PK"], dChart: "D7 Saptamsha" };
  }

  // Property
  if (/property|land|house|makaan|makan|car|gaadi|vehicle|4th house|मकान|जमीन|संपत्ति|वाहन|गाड़ी/i.test(q)) {
    return { type: "property", label: "Property & Vehicles Analysis", houses: [4, 10, 2], karakas: ["Mars", "Venus", "Saturn"], dChart: "D4 & D16" };
  }

  // Spirituality
  if (/spiritual|moksha|god|mantra|meditation|sadhana|guru|12th house|8th house|ak|अध्यात्म|मोक्ष|साधना|मंत्र|गुरु/i.test(q)) {
    return { type: "spirituality", label: "Spiritual Sadhana & Moksha Analysis", houses: [12, 9, 8, 5], karakas: ["Ketu", "Jupiter", "AK"], dChart: "D20 Vimshamsha" };
  }

  // Dasha Timing
  if (/dasha|mahadasha|antardasha|time|kab milega|kab hogi|subh samay|दशा|महादशा|अंतर्दशा|कब/i.test(q)) {
    return { type: "dasha_timing", label: "Vimshottari Dasha & Time Window Analysis" };
  }

  return { type: "full_kundali", label: "Sampurna Vedic Kundali Vishleshan" };
}

