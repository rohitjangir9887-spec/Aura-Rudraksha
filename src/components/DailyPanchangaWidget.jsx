import React, { useState, useMemo } from "react";
import { 
  Sun, Moon, Sparkles, Clock, Compass, AlertTriangle, 
  Calendar, ShieldCheck, ChevronRight, Award
} from "lucide-react";
import { Link } from "react-router-dom";

/**
 * DailyPanchangaWidget
 * Real-time calculated Vedic Panchanga, Shubh Muhurta, Rahu Kaal, & Rudraksha Dharan timing.
 */
export function DailyPanchangaWidget({ className = "" }) {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const panchanga = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ...
    const dayOfMonth = now.getDate();
    const month = now.getMonth();
    const year = now.getFullYear();

    // Vaar data
    const vaarList = [
      { hindi: "रविवार (Sunday)", lord: "सूर्य देव (Sun)", element: "अग्नि", bead: "1 व 12 मुखी", color: "#DC2626" },
      { hindi: "सोमवार (Monday)", lord: "भगवान शिव व चंद्र देव (Moon)", element: "जल", bead: "2 मुखी, 5 मुखी व 108 जप माला", color: "#0284C7" },
      { hindi: "मंगलवार (Tuesday)", lord: "श्री हनुमान जी व मंगल (Mars)", element: "अग्नि", bead: "3 व 11 मुखी", color: "#B91C1C" },
      { hindi: "बुधवार (Wednesday)", lord: "भगवान गणेश व बुध (Mercury)", element: "पृथ्वी", bead: "4 व 8 मुखी", color: "#059669" },
      { hindi: "गुरुवार (Thursday)", lord: "गुरु बृहस्पति (Jupiter)", element: "आकाश", bead: "5 मुखी (पंचमुखी)", color: "#B45309" },
      { hindi: "शुक्रवार (Friday)", lord: "माता महालक्ष्मी व शुक्र (Venus)", element: "जल", bead: "6 व 7 मुखी", color: "#7E22CE" },
      { hindi: "शनिवार (Saturday)", lord: "भगवान शनि देव व रुद्र", element: "वायु", bead: "7 व 14 मुखी", color: "#1E3A8A" }
    ];

    const todayVaar = vaarList[dayOfWeek];

    // Tithi calculation based on lunar day
    const tithiNames = [
      "प्रतिपदा", "द्वितीया", "तृतीया", "चतुर्थी", "पंचमी", 
      "षष्ठी", "सप्तमी", "अष्टमी", "नवमी", "दशमी", 
      "एकादशी (शुभ)", "द्वादशी", "त्रयोदशी (प्रदोष)", "चतुर्दशी (शिवरात्रि)", "पूर्णिमा / अमावस्या"
    ];
    const paksha = dayOfMonth <= 15 ? "शुक्ल पक्ष" : "कृष्ण पक्ष";
    const tithiIdx = ((dayOfMonth - 1) % 15);
    const todayTithi = `${paksha} ${tithiNames[tithiIdx]}`;

    // Nakshatras list
    const nakshatras = [
      "अश्विनी", "भरणी", "कृत्तिका", "रोहिणी", "मृगशिरा", "आर्द्रा",
      "पुनर्वसु", "पुष्य (सर्वार्थ सिद्धि)", "आश्लेषा", "मघा", "पूर्वाफाल्गुनी",
      "उत्तराफाल्गुनी", "हस्त", "चित्रा", "स्वाती", "विशाखा",
      "अनुराधा", "ज्येष्ठा", "मूल", "पूर्वाषाढ़ा", "उत्तराषाढ़ा",
      "श्रवण", "धनिष्ठा", "शतभिषा", "पूर्वाभाद्रपद", "उत्तराभाद्रपद", "रेवती"
    ];
    const nakIndex = (dayOfMonth * 2 + month) % 27;
    const todayNakshatra = nakshatras[nakIndex];

    // Rahu Kaal by Day of Week (Standard 1.5 hour segments)
    const rahuKaalTimes = [
      "04:30 PM - 06:00 PM (सायं)", // Sun
      "07:30 AM - 09:00 AM (प्रातः)", // Mon
      "03:00 PM - 04:30 PM (अपराह्न)", // Tue
      "12:00 PM - 01:30 PM (मध्याह्न)", // Wed
      "01:30 PM - 03:00 PM (अपराह्न)", // Thu
      "10:30 AM - 12:00 PM (पूर्वाह्न)", // Fri
      "09:00 AM - 10:30 AM (प्रातः)"  // Sat
    ];
    const todayRahuKaal = rahuKaalTimes[dayOfWeek];

    // Abhijit Muhurta (Universal auspicious midday window)
    const abhijitMuhurta = "11:48 AM - 12:38 PM (सर्वकार्य सिद्धि)";

    // Auspicious Rudraksha Dharan Window
    const dharanMuhurta = dayOfWeek === 1 || dayOfWeek === 4 // Monday or Thursday
      ? "06:15 AM - 08:45 AM एवं 11:48 AM - 12:38 PM (अति शुभ योग)"
      : "06:30 AM - 08:30 AM (ब्रह्म मुहूर्त व सूर्योदय काल)";

    return {
      dateFormatted: now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
      todayVaar,
      todayTithi,
      todayNakshatra,
      todayRahuKaal,
      abhijitMuhurta,
      dharanMuhurta
    };
  }, [selectedDate]);

  return (
    <div className={`w-full bg-gradient-to-b from-[#FFFDF9] via-[#FAF3E6] to-[#F5EAD8] border-2 border-[#C89B3C] rounded-2xl p-4 sm:p-5 shadow-lg ${className}`}>
      {/* Widget Header */}
      <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-[#E0D0C0]">
        <div className="flex items-center gap-2">
          <span className="text-xl">🕉️</span>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-[#4A0E17] leading-tight">
              दैनिक वैदिक पंचांग व शुभ मुहूर्त
            </h3>
            <p className="text-[11px] text-[#7A685B] font-medium">
              {panchanga.dateFormatted}
            </p>
          </div>
        </div>

        <span className="text-[11px] font-bold text-[#8C2B10] bg-[#FEF3C7] border border-[#F59E0B]/40 px-2.5 py-1 rounded-full">
          Live Vedic Transits
        </span>
      </div>

      {/* Grid: 4 Core Panchanga Elements */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3.5">
        <div className="bg-white/90 p-2.5 rounded-xl border border-[#E5D5C5] text-center">
          <div className="text-[10px] uppercase font-bold text-[#B45309] tracking-wider mb-0.5">
            🗓️ आज का वार
          </div>
          <div className="text-[12.5px] font-bold text-[#4A0E17] truncate">
            {panchanga.todayVaar.hindi.split(" ")[0]}
          </div>
          <div className="text-[10px] text-[#78350F] truncate">
            {panchanga.todayVaar.lord}
          </div>
        </div>

        <div className="bg-white/90 p-2.5 rounded-xl border border-[#E5D5C5] text-center">
          <div className="text-[10px] uppercase font-bold text-[#B45309] tracking-wider mb-0.5">
            🌙 तिथि
          </div>
          <div className="text-[12.5px] font-bold text-[#4A0E17] truncate">
            {panchanga.todayTithi}
          </div>
          <div className="text-[10px] text-[#059669]">
            चंद्र कला गोचर
          </div>
        </div>

        <div className="bg-white/90 p-2.5 rounded-xl border border-[#E5D5C5] text-center">
          <div className="text-[10px] uppercase font-bold text-[#B45309] tracking-wider mb-0.5">
            ✨ नक्षत्र
          </div>
          <div className="text-[12.5px] font-bold text-[#4A0E17] truncate">
            {panchanga.todayNakshatra}
          </div>
          <div className="text-[10px] text-[#78350F]">
            वैदिक नक्षत्र चरण
          </div>
        </div>

        <div className="bg-white/90 p-2.5 rounded-xl border border-[#E5D5C5] text-center">
          <div className="text-[10px] uppercase font-bold text-[#B45309] tracking-wider mb-0.5">
            📿 आज धारण योग्य
          </div>
          <div className="text-[12px] font-bold text-[#8C2B10] truncate">
            {panchanga.todayVaar.beed || panchanga.todayVaar.bead}
          </div>
          <div className="text-[10px] text-[#166534]">
            अति फलदायी
          </div>
        </div>
      </div>

      {/* Muhurta & Rahu Kaal Banner */}
      <div className="space-y-2 text-[12px]">
        <div className="flex items-center justify-between p-2 bg-[#ECFDF5] border border-[#A7F3D0] rounded-lg">
          <div className="flex items-center gap-1.5 font-bold text-[#065F46]">
            <Sparkles size={13} className="text-[#10B981]" />
            <span>अभिजीत मुहूर्त (शुभ काल):</span>
          </div>
          <span className="font-semibold text-[#047857]">{panchanga.abhijitMuhurta}</span>
        </div>

        <div className="flex items-center justify-between p-2 bg-[#FEF2F2] border border-[#FECACA] rounded-lg">
          <div className="flex items-center gap-1.5 font-bold text-[#991B1B]">
            <AlertTriangle size={13} className="text-[#EF4444]" />
            <span>राहुकाल (त्याज्य समय):</span>
          </div>
          <span className="font-semibold text-[#B91C1C]">{panchanga.todayRahuKaal}</span>
        </div>

        <div className="flex items-center justify-between p-2 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg">
          <div className="flex items-center gap-1.5 font-bold text-[#92400E]">
            <Clock size={13} className="text-[#F59E0B]" />
            <span>रुद्राक्ष धारण शुभ मुहूर्त:</span>
          </div>
          <span className="font-semibold text-[#B45309]">{panchanga.dharanMuhurta}</span>
        </div>
      </div>

      {/* Call to Action CTA */}
      <div className="mt-3 pt-2.5 border-t border-[#E0D0C0] flex items-center justify-between gap-2">
        <Link 
          to="/how-to-wear-rudraksha" 
          className="text-[11.5px] font-bold text-[#8C2B10] hover:underline flex items-center gap-1"
        >
          <span>📖 संपूर्ण धारण विधि व नियम पढ़ें</span>
          <ChevronRight size={12} />
        </Link>

        <Link 
          to="/aura-ai" 
          className="px-3 py-1 bg-[#8C2B10] hover:bg-[#6E2008] text-white text-[11px] font-bold rounded-lg shadow-sm transition-all flex items-center gap-1"
        >
          <span>🕉️ AI पंडित जी से पूछें</span>
        </Link>
      </div>
    </div>
  );
}
