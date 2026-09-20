// Astrological Rashi & Rudraksha mapping rules
export const RASHI_DATA = [
  { nameHindi: "मेष", nameEng: "Aries", symbol: "♈", lord: "मंगल देव (Mars)", element: "अग्नि (Fire)", start: [3, 21], end: [4, 19], primaryMukhi: "3 Mukhi", fallbackMukhi: "11 Mukhi", mantra: "ॐ क्लीं नमः", day: "मंगलवार (Tuesday)", productId: "5" },
  { nameHindi: "वृषभ", nameEng: "Taurus", symbol: "♉", lord: "शुक्र देव (Venus)", element: "पृथ्वी (Earth)", start: [4, 20], end: [5, 20], primaryMukhi: "6 Mukhi", fallbackMukhi: "7 Mukhi", mantra: "ॐ ह्रीं हुं नमः", day: "शुक्रवार (Friday)", productId: "7" },
  { nameHindi: "मिथुन", nameEng: "Gemini", symbol: "♊", lord: "बुध देव (Mercury)", element: "वायु (Air)", start: [5, 21], end: [6, 20], primaryMukhi: "4 Mukhi", fallbackMukhi: "5 Mukhi", mantra: "ॐ ह्रीं नमः", day: "बुधवार (Wednesday)", productId: "5" },
  { nameHindi: "कर्क", nameEng: "Cancer", symbol: "♋", lord: "चंद्र देव (Moon)", element: "जल (Water)", start: [6, 21], end: [7, 22], primaryMukhi: "2 Mukhi", fallbackMukhi: "5 Mukhi", mantra: "ॐ नमः शिवाय", day: "सोमवार (Monday)", productId: "5" },
  { nameHindi: "सिंह", nameEng: "Leo", symbol: "♌", lord: "सूर्य देव (Sun)", element: "अग्नि (Fire)", start: [7, 23], end: [8, 22], primaryMukhi: "1 Mukhi", fallbackMukhi: "12 Mukhi", mantra: "ॐ ह्रीं नमः", day: "रविवार या सोमवार (Sunday/Monday)", productId: "1" },
  { nameHindi: "कन्या", nameEng: "Virgo", symbol: "♍", lord: "बुध देव (Mercury)", element: "पृथ्वी (Earth)", start: [8, 23], end: [9, 22], primaryMukhi: "4 Mukhi", fallbackMukhi: "5 Mukhi", mantra: "ॐ ह्रीं नमः", day: "बुधवार (Wednesday)", productId: "5" },
  { nameHindi: "तुला", nameEng: "Libra", symbol: "♎", lord: "शुक्र देव (Venus)", element: "वायु (Air)", start: [9, 23], end: [10, 22], primaryMukhi: "6 Mukhi", fallbackMukhi: "7 Mukhi", mantra: "ॐ ह्रीं हुं नमः", day: "शुक्रवार (Friday)", productId: "7" },
  { nameHindi: "वृश्चिक", nameEng: "Scorpio", symbol: "♏", lord: "मंगल देव (Mars)", element: "जल (Water)", start: [10, 23], end: [11, 21], primaryMukhi: "3 Mukhi", fallbackMukhi: "11 Mukhi", mantra: "ॐ क्लीं नमः", day: "मंगलवार (Tuesday)", productId: "11" },
  { nameHindi: "धनु", nameEng: "Sagittarius", symbol: "♐", lord: "बृहस्पति देव (Jupiter)", element: "अग्नि (Fire)", start: [11, 22], end: [12, 21], primaryMukhi: "5 Mukhi", fallbackMukhi: "1 Mukhi", mantra: "ॐ ह्रीं नमः", day: "गुरुवार (Thursday)", productId: "5" },
  { nameHindi: "मकर", nameEng: "Capricorn", symbol: "♑", lord: "शनि देव (Saturn)", element: "पृथ्वी (Earth)", start: [12, 22], end: [1, 19], primaryMukhi: "7 Mukhi", fallbackMukhi: "14 Mukhi", mantra: "ॐ हुं नमः", day: "शनिवार (Saturday)", productId: "7" },
  { nameHindi: "कुंभ", nameEng: "Aquarius", symbol: "♒", lord: "शनि देव (Saturn)", element: "वायु (Air)", start: [1, 20], end: [2, 18], primaryMukhi: "7 Mukhi", fallbackMukhi: "11 Mukhi", mantra: "ॐ हुं नमः", day: "शनिवार (Saturday)", productId: "7" },
  { nameHindi: "मीन", nameEng: "Pisces", symbol: "♓", lord: "बृहस्पति देव (Jupiter)", element: "जल (Water)", start: [2, 19], end: [3, 20], primaryMukhi: "5 Mukhi", fallbackMukhi: "1 Mukhi", mantra: "ॐ ह्रीं नमः", day: "गुरुवार (Thursday)", productId: "5" },
];

export const CONCERN_OPTIONS = [
  { id: "career", label: "⚡ व्यापार, नौकरी व धन वृद्धि (Career & Wealth)", bead: "7 Mukhi / 1 Mukhi" },
  { id: "peace", label: "🧘 मानसिक शांति, एकाग्रता व तनाव मुक्ति (Peace & Focus)", bead: "5 Mukhi / 2 Mukhi" },
  { id: "shani_dosha", label: "🛡️ शनि साढ़े साती, राहु-केतु व ग्रह दोष निवारण (Dosha Shanti)", bead: "7 Mukhi / 11 Mukhi" },
  { id: "marriage", label: "❤️ विवाह, प्रेम व पारिवारिक सद्भाव (Relationships)", bead: "2 Mukhi / 6 Mukhi" },
  { id: "health", label: "🩺 स्वास्थ्य, ऊर्जा व दीर्घायु (Health & Vitality)", bead: "3 Mukhi / 5 Mukhi" },
  { id: "spiritual", label: "🕉️ आध्यात्मिक उन्नति व शिव कृपा (Moksha & Sadhana)", bead: "1 Mukhi / Rudraksha Mala" },
];

// Helper to get Rashi from DOB
export const calculateRashi = (dateStr) => {
  if (!dateStr) return RASHI_DATA[4]; // Default to Leo (Simha)
  const dateObj = new Date(dateStr);
  const month = dateObj.getMonth() + 1;
  const day = dateObj.getDate();

  for (const r of RASHI_DATA) {
    const [sm, sd] = r.start;
    const [em, ed] = r.end;
    if (sm === em) {
      if (month === sm && day >= sd && day <= ed) return r;
    } else if (sm < em) {
      if ((month === sm && day >= sd) || (month === em && day <= ed)) return r;
    } else {
      // Capricorn wraps year end (Dec 22 - Jan 19)
      if ((month === sm && day >= sd) || (month === em && day <= ed)) return r;
    }
  }
  return RASHI_DATA[0];
};
