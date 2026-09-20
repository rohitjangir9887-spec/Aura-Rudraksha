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
  { id: "all", label: "🌟 संपूर्ण जीवन मार्गदर्शन (All Concerns - Complete Life Guidance)", bead: "1 Mukhi / 5 Mukhi / Siddha Mala" },
  { id: "career", label: "⚡ नौकरी, पदोन्नति व नेतृत्व (Career & Leadership)", bead: "7 Mukhi / 10 Mukhi / 14 Mukhi" },
  { id: "business", label: "💼 व्यापार, दुकान व व्यवसाय वृद्धि (Business & Trade)", bead: "7 Mukhi / 8 Mukhi / 12 Mukhi" },
  { id: "finance", label: "💰 धन समृद्धि, बचत व ऋण मुक्ति (Wealth & Debt Relief)", bead: "7 Mukhi / 13 Mukhi / 21 Mukhi" },
  { id: "health", label: "🩺 स्वास्थ्य, ऊर्जा व दीर्घायु (Health & Vitality)", bead: "3 Mukhi / 5 Mukhi / 11 Mukhi" },
  { id: "peace", label: "🧘 मानसिक शांति, एकाग्रता व तनाव मुक्ति (Mental Peace & Focus)", bead: "2 Mukhi / 5 Mukhi" },
  { id: "marriage", label: "❤️ विवाह, शीघ्र रिश्ता व दांपत्य सुख (Marriage & Harmony)", bead: "2 Mukhi / Gauri Shankar" },
  { id: "love", label: "💑 प्रेम संबंध व आकर्षण (Love & Relationships)", bead: "2 Mukhi / 6 Mukhi / 13 Mukhi" },
  { id: "family", label: "🏠 पारिवारिक शांति व सद्भाव (Family Peace & Unity)", bead: "2 Mukhi / 3 Mukhi / Gauri Shankar" },
  { id: "children", label: "👶 संतान सुख व बच्चों का कल्याण (Children & Progeny)", bead: "Garbh Gauri / 5 Mukhi / 9 Mukhi" },
  { id: "education", label: "📚 विद्या, पढ़ाई, परीक्षा व स्मरण शक्ति (Education & Memory)", bead: "4 Mukhi / 5 Mukhi / Saraswati Bandh" },
  { id: "property", label: "🏢 भूमि, भवन, घर व वाहन सुख (Property & Real Estate)", bead: "3 Mukhi / 10 Mukhi / 14 Mukhi" },
  { id: "foreign_travel", label: "✈️ विदेश यात्रा, वीजा व विदेश योग (Foreign Travel & Settlement)", bead: "8 Mukhi / 12 Mukhi" },
  { id: "legal", label: "⚖️ कोर्ट-कचहरी, शत्रु व कानूनी विजय (Legal Victory & Protection)", bead: "8 Mukhi / 10 Mukhi / 11 Mukhi" },
  { id: "shani_dosha", label: "🛡️ शनि साढ़े साती, ढैया व राहु-केतु शांति (Dosha Shanti)", bead: "7 Mukhi / 14 Mukhi / 11 Mukhi" },
  { id: "spiritual", label: "🕉️ आध्यात्मिक उन्नति, साधना व शिव कृपा (Moksha & Spiritual Growth)", bead: "1 Mukhi / 14 Mukhi / 108 Jaap Mala" },
  { id: "general", label: "🌸 सर्वकल्याण, रक्षा व सकारात्मक ऊर्जा (General Well-being & Luck)", bead: "5 Mukhi / 7 Mukhi / 108 Jaap Mala" },
  { id: "custom", label: "✍️ अन्य विशेष संकल्प (Custom Concern)", bead: "1 Mukhi / 5 Mukhi / 11 Mukhi" }
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
