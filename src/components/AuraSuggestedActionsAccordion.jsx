import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  Search,
  Sparkles,
  Tag,
  Calculator,
  BookOpen,
  ShoppingBag,
  Compass
} from "lucide-react";

const PANEL_EASE = [0.16, 1, 0.3, 1];

const QUICK_AI_DEFAULT_SUGGESTIONS = [
  { label: "1-14 मुखी रुद्राक्ष व कीमत", query: "1-14 मुखी रुद्राक्ष की जानकारी और कीमत बताओ", icon: Sparkles },
  { label: "7 मुखी रुद्राक्ष की कीमत बताओ", query: "7 मुखी रुद्राक्ष की कीमत बताओ", icon: Tag },
  { label: "2 पीस 5 मुखी का total calculate करो", query: "2 पीस 5 मुखी रुद्राक्ष का total calculate करो", icon: Calculator },
  { label: "आज के एक्टिव डिस्काउंट कूपन", query: "आज के एक्टिव डिस्काउंट कूपन बताओ", icon: Tag }
];

function getPanditSuggestions(canonicalMukhi) {
  const mukhi = (canonicalMukhi && String(canonicalMukhi).trim()) || "1 Mukhi Rudraksha";
  return [
    {
      label: `${mukhi} धारण विधि व बीज मंत्र`,
      query: `कृपया ${mukhi} की संपूर्ण वैदिक धारण विधि व बीज मंत्र बताएं`,
      icon: BookOpen
    },
    {
      label: `कुंडली अनुसार ${mukhi} लाभ`,
      query: `मेरी कुंडली अनुसार ${mukhi} के प्रमुख लाभ क्या हैं?`,
      icon: Sparkles
    },
    {
      label: `सिद्ध ${mukhi} स्टोर में देखें`,
      query: `सिद्ध ${mukhi} स्टोर में दिखाएं`,
      icon: ShoppingBag
    },
    {
      label: "विशोंत्तरी महादशा व ग्रह उपाय",
      query: "मेरी वर्तमान विशोंत्तरी महादशा और ग्रह शांति के उपाय बताएं",
      icon: Compass
    }
  ];
}

function pickIconForLabel(label) {
  const s = String(label || "").toLowerCase();
  if (s.includes("कूपन") || s.includes("coupon") || s.includes("कीमत") || s.includes("price")) return Tag;
  if (s.includes("calculate") || s.includes("टोटल") || s.includes("पीस")) return Calculator;
  if (s.includes("स्टोर") || s.includes("देखें") || s.includes("खरीद")) return ShoppingBag;
  if (s.includes("मंत्र") || s.includes("विधि")) return BookOpen;
  if (s.includes("दशा") || s.includes("ग्रह") || s.includes("कुंडली")) return Compass;
  return Sparkles;
}

export function AuraSuggestedActionsAccordion({
  mode = "standard",
  parsedKeywords = [],
  canonicalMukhi = null,
  isLatest = false,
  isWelcome = false,
  loading = false,
  onSelectSuggestion
}) {
  const [isOpen, setIsOpen] = useState(Boolean(isLatest));

  if (loading && isLatest) {
    return null;
  }

  let items = [];
  if (mode === "panditji") {
    if (canonicalMukhi || isWelcome) {
      items = getPanditSuggestions(canonicalMukhi);
    } else if (parsedKeywords.length > 0) {
      items = parsedKeywords.slice(0, 4).map((kw) => ({
        label: kw.replace(/^[📿🪐🛍️✨🔍🔎•]+\s*/, "").trim(),
        query: kw,
        icon: pickIconForLabel(kw)
      }));
    } else if (isLatest) {
      items = getPanditSuggestions(null);
    }
  } else {
    if (isWelcome || !parsedKeywords.length) {
      if (isLatest || isWelcome) {
        items = QUICK_AI_DEFAULT_SUGGESTIONS;
      }
    } else {
      items = parsedKeywords.slice(0, 4).map((kw) => ({
        label: kw.replace(/^[🔍🔎•✨🎁📦]+\s*/, "").trim(),
        query: kw,
        icon: pickIconForLabel(kw)
      }));
    }
  }

  if (!items.length) return null;

  const isPandit = mode === "panditji";
  const headingText = isPandit
    ? "✨ सुझाए गए विषय व आगे का परामर्श (Suggested Actions)"
    : "🔎 सुझाए गए विषय व आगे का परामर्श";

  return (
    <div className="aura-suggest-accordion">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        aria-expanded={isOpen}
        className="aura-suggest-accordion-trigger"
      >
        <span className="aura-suggest-accordion-heading">
          {!isPandit && (
            <Search size={12} strokeWidth={2.2} className="shrink-0 text-[#702A20] hidden" aria-hidden="true" />
          )}
          <span>{headingText}</span>
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2, ease: PANEL_EASE }}
          className="aura-suggest-accordion-chevron"
          aria-hidden="true"
        >
          <ChevronDown size={14} strokeWidth={2.2} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: PANEL_EASE }}
            className="overflow-hidden"
          >
            <div className="aura-suggest-accordion-list">
              {items.map((item, idx) => {
                const Icon = item.icon || Sparkles;
                return (
                  <motion.button
                    key={`${item.label}-${idx}`}
                    type="button"
                    whileTap={{ scale: 0.985 }}
                    transition={{ duration: 0.18, ease: PANEL_EASE }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (typeof onSelectSuggestion === "function") {
                        onSelectSuggestion(item.query || item.label);
                      }
                    }}
                    className="aura-suggest-row"
                  >
                    <span className="aura-suggest-row-left">
                      <span className="aura-suggest-row-icon" aria-hidden="true">
                        <Icon size={13} strokeWidth={2.1} />
                      </span>
                      <span className="aura-suggest-row-text">{item.label}</span>
                    </span>
                    <ChevronRight
                      size={13}
                      strokeWidth={2.2}
                      className="aura-suggest-row-arrow"
                      aria-hidden="true"
                    />
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
