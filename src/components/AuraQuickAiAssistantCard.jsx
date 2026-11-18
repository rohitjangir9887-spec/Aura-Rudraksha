import React from "react";
import { motion } from "framer-motion";
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
    prompt: "असली नेपाली रुद्राक्ष खरीदें — कृपया सिद्ध 1 से 14 मुखी कलेक्शन व कीमत दिखाएं",
    icon: ShoppingBag
  },
  {
    id: "dharan_vidhi",
    label: "धारण विधि / मंत्र / राशि अनुसार चयन",
    prompt: "रुद्राक्ष धारण विधि, बीज मंत्र और राशि अनुसार सही रुद्राक्ष चयन बताएं",
    icon: Compass
  },
  {
    id: "track_order",
    label: "ऑर्डर ट्रैक करें",
    prompt: "मेरा ऑर्डर ट्रैक करें (Track My Order)",
    icon: Package
  },
  {
    id: "lab_cert",
    label: "लैब सर्टिफिकेट / X-Ray प्रमाणिकता",
    prompt: "रुद्राक्ष लैब सर्टिफिकेट व X-Ray प्रमाणिकता की जानकारी दें",
    icon: ShieldCheck
  },
  {
    id: "live_price",
    label: "लाइव कीमत / स्टॉक / कूपन",
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
          <h4 className="aura-quick-assist-title">मैं आपकी कैसे सहायता कर सकता हूँ?</h4>
        </div>

        <div className="aura-quick-assist-list">
          {ASSISTANCE_ROWS.map((row) => {
            const Icon = row.icon;
            return (
              <motion.button
                key={row.id}
                type="button"
                whileTap={{ scale: 0.985 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => handleSelect(e, row.prompt)}
                className="aura-quick-assist-row group"
              >
                <span className="aura-quick-assist-row-left">
                  <span className="aura-quick-assist-row-icon" aria-hidden="true">
                    <Icon size={14} strokeWidth={2.1} />
                  </span>
                  <span className="aura-quick-assist-row-label">{row.label}</span>
                </span>
                <ChevronRight
                  size={15}
                  strokeWidth={2.2}
                  className="aura-quick-assist-row-arrow"
                  aria-hidden="true"
                />
              </motion.button>
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
            <motion.button
              key={chip.label}
              type="button"
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => handleSelect(e, chip.prompt)}
              className="aura-quick-suggest-chip"
            >
              <Icon size={12} strokeWidth={2.2} className="shrink-0 text-[#702A20]" aria-hidden="true" />
              <span>{chip.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
