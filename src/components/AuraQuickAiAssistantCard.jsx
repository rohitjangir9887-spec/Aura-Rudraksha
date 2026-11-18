import React from "react";
import {
  ShoppingBag,
  Compass,
  Package,
  ShieldCheck,
  Tag,
  ChevronRight,
  Sparkles,
  Gift
} from "lucide-react";

const ASSISTANCE_ROWS = [
  {
    id: "buy_rudraksha",
    label: "असली नेपाली रुद्राक्ष खरीदें",
    detail: "सिद्ध 1–21 मुखी नेपाल व इंडोनेशिया संग्रह",
    prompt: "असली नेपाली रुद्राक्ष खरीदें — कृपया सिद्ध 1 से 14 मुखी कलेक्शन व कीमत दिखाएं",
    icon: ShoppingBag
  },
  {
    id: "dharan_vidhi",
    label: "धारण विधि / मंत्र / राशि अनुसार चयन",
    detail: "शुद्धिकरण, प्राण-प्रतिष्ठा, बीज मंत्र व शुभ दिन",
    prompt: "रुद्राक्ष धारण विधि, बीज मंत्र और राशि अनुसार सही रुद्राक्ष चयन बताएं",
    icon: Compass
  },
  {
    id: "track_order",
    label: "ऑर्डर ट्रैक करें",
    detail: "लाइव डिस्पैच व डिलीवरी स्टेटस तुरंत जानें",
    prompt: "मेरा ऑर्डर ट्रैक करें (Track My Order)",
    icon: Package
  },
  {
    id: "lab_cert",
    label: "लैब सर्टिफिकेट / X-Ray प्रमाणिकता",
    detail: "100% सरकारी लैब टेस्टेड व X-Ray वेरीफाइड",
    prompt: "रुद्राक्ष लैब सर्टिफिकेट व X-Ray प्रमाणिकता की जानकारी दें",
    icon: ShieldCheck
  },
  {
    id: "live_price",
    label: "लाइव कीमत / स्टॉक / कूपन",
    detail: "ताज़ा मूल्य, उपलब्ध स्टॉक व डिस्काउंट कोड्स",
    prompt: "लाइव कीमत, स्टॉक और आज के एक्टिव डिस्काउंट कूपन बताएं",
    icon: Tag
  }
];

const QUICK_SUGGESTION_CHIPS = [
  {
    label: "सिद्ध 1 से 14 मुखी रुद्राक्ष देखें",
    prompt: "सिद्ध 1 से 14 मुखी रुद्राक्ष देखें और कीमत बताएं",
    icon: Sparkles
  },
  {
    label: "फ्री कुंडली व राशि अनुसार रुद्राक्ष",
    prompt: "फ्री कुंडली व राशि अनुसार मेरे लिए सबसे शुभ रुद्राक्ष बताएं",
    icon: Compass
  },
  {
    label: "आज के एक्टिव डिस्काउंट कूपन",
    prompt: "आज के एक्टिव डिस्काउंट कूपन कोड्स और ऑफर बताएं",
    icon: Gift
  },
  {
    label: "मेरा ऑर्डर ट्रैक करें",
    prompt: "मेरा ऑर्डर ट्रैक करें",
    icon: Package
  }
];

export function AuraQuickAiAssistantCard({ onSendPrompt }) {
  const handleSelect = (e, prompt) => {
    e.stopPropagation();
    if (typeof onSendPrompt === "function") {
      onSendPrompt(prompt);
    }
  };

  return (
    <div className="aura-quick-welcome-wrap">
      {/* A. Main Assistance Card */}
      <div className="aura-quick-assist-card" role="region" aria-label="सहायता विकल्प">
        <div className="aura-quick-assist-head">
          <span className="aura-quick-assist-head-icon" aria-hidden="true">
            <Sparkles size={14} strokeWidth={2.2} />
          </span>
          <div className="min-w-0">
            <h4 className="aura-quick-assist-title">मैं आपकी कैसे सहायता कर सकता हूँ?</h4>
            <p className="aura-quick-assist-subtitle">असली रुद्राक्ष, वैदिक परामर्श व ऑर्डर सहायता</p>
          </div>
        </div>

        <div className="aura-quick-assist-list">
          {ASSISTANCE_ROWS.map((row) => {
            const Icon = row.icon;
            return (
              <button
                key={row.id}
                type="button"
                onClick={(e) => handleSelect(e, row.prompt)}
                className="aura-quick-assist-row group"
              >
                <span className="aura-quick-assist-row-left">
                  <span className="aura-quick-assist-row-icon" aria-hidden="true">
                    <Icon size={14} strokeWidth={2.1} />
                  </span>
                  <span className="aura-quick-assist-row-text">
                    <span className="aura-quick-assist-row-label">{row.label}</span>
                    <span className="aura-quick-assist-row-detail">{row.detail}</span>
                  </span>
                </span>
                <ChevronRight
                  size={15}
                  strokeWidth={2.2}
                  className="aura-quick-assist-row-arrow"
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* B. Assistance Prompt */}
      <p className="aura-quick-assist-prompt">
        कृपया बताएं, आज कौन सा रुद्राक्ष या सेवा आपकी सहायता कर सकती है?
      </p>

      {/* C. Pandit Ji Suggestions */}
      <div className="aura-quick-suggest-chips" role="group" aria-label="त्वरित सुझाव">
        {QUICK_SUGGESTION_CHIPS.map((chip) => {
          const Icon = chip.icon;
          return (
            <button
              key={chip.label}
              type="button"
              onClick={(e) => handleSelect(e, chip.prompt)}
              className="aura-quick-suggest-chip"
            >
              <Icon size={12} strokeWidth={2.2} className="shrink-0 text-[#8c2b10]" aria-hidden="true" />
              <span>{chip.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
