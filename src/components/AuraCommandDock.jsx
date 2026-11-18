import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessagesSquare,
  Compass,
  SlidersHorizontal,
  Sparkles,
  Plus,
  History,
  Bookmark,
  FileText,
  Pencil,
  Trash2,
  Check,
  ChevronDown,
  ChevronRight,
  HeartHandshake,
  Hash,
  Calendar,
  BookOpen,
  LayoutGrid,
  Table2,
  PieChart,
  ScrollText,
  MessageCircle,
  Zap,
  Maximize2,
  Minimize2,
  Notebook,
  X,
  Package,
  Gift,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";

const PANEL_EASE = [0.16, 1, 0.3, 1];

export function AuraCommandDock({
  scope = "floating", // "floating" | "page"
  mode = "standard", // "standard" | "panditji"
  onSwitchMode,
  conversationId,
  savedSessions = [],
  onNewChat,
  onSelectSession,
  onOpenHistory,
  activeBirthDetails,
  showBirthForm = false,
  onToggleBirthForm,
  onEditBirthDetails,
  onClearBirthDetails,
  onOpenSavedKundalis,
  panditPrefs = { responseStyle: "detailed", chartStyle: "auto" },
  onChangePanditPref,
  onOpenVedicTool, // (tabId: "milan" | "numerology" | "panchang" | "rudraksha") => void
  onSendQuickPrompt,
  dynamicSuggestions = [],
  onOpenNotes, // optional (floating notepad)
  notesCount = 0,
  isFullWindow = false,
  onToggleFullWindow // optional (floating full-window toggle)
}) {
  const [activeTab, setActiveTab] = useState(null); // null | "chats" | "kundali" | "style" | "tools" | "prompts"
  const dockRef = useRef(null);

  // Close drawer on Escape or outside click
  useEffect(() => {
    if (!activeTab) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setActiveTab(null);
      }
    };
    const handlePointerDown = (e) => {
      if (dockRef.current && !dockRef.current.contains(e.target)) {
        setActiveTab(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [activeTab]);

  // Reset active tab smoothly when switching modes if tab id changed
  useEffect(() => {
    if (mode === "standard" && activeTab === "style") {
      setActiveTab(null);
    }
    if (mode === "panditji" && activeTab === "prompts") {
      setActiveTab(null);
    }
  }, [mode, activeTab]);

  const isPandit = mode === "panditji";
  const hasKundali = Boolean(activeBirthDetails && activeBirthDetails.dob);

  const dockItems = isPandit
    ? [
        {
          id: "chats",
          label: "चैट",
          subtitle: "नया चैट, सक्रिय सत्र व इतिहास",
          icon: MessagesSquare
        },
        {
          id: "kundali",
          label: "कुंडली",
          subtitle: "जन्म विवरण, सेव कुंडली व बदलाव",
          icon: Compass,
          hasIndicator: hasKundali
        },
        {
          id: "style",
          label: "अंदाज़",
          subtitle: "उत्तर शैली व चार्ट/ग्राफ प्रारूप",
          icon: SlidersHorizontal
        },
        {
          id: "tools",
          label: "टूल्स",
          subtitle: "मिलान, अंक ज्योतिष, पंचांग व कोष",
          icon: Sparkles
        }
      ]
    : [
        {
          id: "chats",
          label: "चैट",
          subtitle: "नया चैट, इतिहास व नोट्स",
          icon: MessagesSquare
        },
        {
          id: "prompts",
          label: "सुझाव",
          subtitle: "ऑर्डर ट्रैक, कूपन व रुद्राक्ष प्रश्न",
          icon: Zap
        },
        {
          id: "kundali",
          label: "कुंडली",
          subtitle: "पंडित जी व जन्म कुंडली विवरण",
          icon: Compass,
          hasIndicator: hasKundali
        },
        {
          id: "tools",
          label: "टूल्स",
          subtitle: "वैदिक टूल्स व 1-21 मुखी कोष",
          icon: Sparkles
        }
      ];

  const activeItemMeta = dockItems.find((item) => item.id === activeTab);

  const closeAndRun = (fn) => {
    setActiveTab(null);
    if (typeof fn === "function") fn();
  };

  const styleOptions = [
    {
      id: "detailed",
      title: "विस्तृत वैदिक विश्लेषण",
      desc: "ग्रह-बल, महादशा, शास्त्र प्रमाण और संपूर्ण उपाय सहित गहन मार्गदर्शन",
      icon: ScrollText
    },
    {
      id: "balanced",
      title: "अपनी मर्ज़ी की बात",
      desc: "सरल, सटीक और सीधे आपके प्रश्न के मुख्य बिंदु पर संवादात्मक उत्तर",
      icon: MessageCircle
    }
  ];

  const chartOptions = [
    {
      id: "auto",
      title: "Auto",
      desc: "प्रश्नानुसार स्वतः सर्वश्रेष्ठ दृश्य",
      icon: Sparkles
    },
    {
      id: "chart",
      title: "चक्र + ग्राफ",
      desc: "लग्न चक्र व ग्रह-बल ग्राफ",
      icon: PieChart
    },
    {
      id: "cards",
      title: "कार्ड",
      desc: "सुव्यवस्थित वैदिक कार्ड्स",
      icon: LayoutGrid
    },
    {
      id: "table",
      title: "तालिका",
      desc: "ग्रह, डिग्री व दशा सारणी",
      icon: Table2
    }
  ];

  const vedicToolCards = [
    {
      tab: "milan",
      title: "गुण मिलान (36)",
      desc: "अष्टकूट मिलान, नाड़ी व मांगलिक जांच",
      icon: HeartHandshake
    },
    {
      tab: "numerology",
      title: "अंक ज्योतिष",
      desc: "मूलांक, भाग्यांक व शुभ रुद्राक्ष गणना",
      icon: Hash
    },
    {
      tab: "panchang",
      title: "पंचांग व मुहूर्त",
      desc: "आज की तिथि, नक्षत्र व राहुकाल",
      icon: Calendar
    },
    {
      tab: "rudraksha",
      title: "1–21 मुखी कोष",
      desc: "सभी रुद्राक्षों के देवता, ग्रह व मंत्र",
      icon: BookOpen
    }
  ];

  const standardQuickPrompts = [
    {
      title: "ऑर्डर ट्रैक करें",
      desc: "अपने हाल के ऑर्डर की डिलीवरी स्थिति देखें",
      prompt: "Mera recent order status track karo",
      icon: Package
    },
    {
      title: "आज के ऑफर व कूपन",
      desc: "सक्रिय डिस्काउंट कोड्स और छूट प्राप्त करें",
      prompt: "Aaj ke active discount coupon codes aur offers batao",
      icon: Gift
    },
    {
      title: "1–14 मुखी कीमत व लाभ",
      desc: "असली नेपाली रुद्राक्ष के रेट और विवरण जानें",
      prompt: "1-14 मुखी रुद्राक्ष की जानकारी और कीमत बताओ",
      icon: Sparkles
    },
    {
      title: "X-Ray लैब सर्टिफिकेट",
      desc: "100% शुद्धता और सरकारी लैब प्रमाणन जांचें",
      prompt: "Rudraksha lab testing and authenticity certificate details",
      icon: ShieldCheck
    }
  ];

  const otherSessions = savedSessions.filter((s) => s.id !== conversationId).slice(0, 5);

  return (
    <div ref={dockRef} className="relative z-20 shrink-0 select-none">
      {/* Single-Line 4-Option Bar */}
      <div
        role="tablist"
        aria-label="Aura AI Options"
        className="grid grid-cols-4 gap-1.5 px-2.5 py-1.5 bg-[#FFF9F0] border-b border-[#E9D9C5]"
      >
        {dockItems.map((item) => {
          const Icon = item.icon;
          const isOpen = activeTab === item.id;
          return (
            <motion.button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isOpen}
              aria-expanded={isOpen}
              onClick={() => setActiveTab((prev) => (prev === item.id ? null : item.id))}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.18, ease: PANEL_EASE }}
              className={`relative min-h-[36px] sm:min-h-[38px] px-1.5 sm:px-2.5 py-1.5 rounded-[10px] flex items-center justify-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-semibold whitespace-nowrap overflow-hidden transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C69A45] ${
                isOpen
                  ? "text-white border border-[#702A20]"
                  : "text-[#542B19] bg-white border border-[#E9D9C5] hover:border-[#C69A45] hover:bg-[#FFF9F0]"
              }`}
            >
              {isOpen && (
                <motion.span
                  layoutId={`aura-dock-active-bg-${scope}`}
                  transition={{ duration: 0.2, ease: PANEL_EASE }}
                  className="absolute inset-0 rounded-[9px] bg-[#702A20] shadow-[0_2px_6px_rgba(84,43,25,0.18)]"
                  aria-hidden="true"
                />
              )}
              <span className="relative z-10 inline-flex items-center gap-1 min-w-0">
                <Icon size={13} className="shrink-0" strokeWidth={2.1} />
                <span className="truncate">{item.label}</span>
                {item.hasIndicator && !isOpen && (
                  <CheckCircle2
                    size={11}
                    className="shrink-0 text-[#C69A45]"
                    aria-label="सक्रिय कुंडली लोड है"
                  />
                )}
                <motion.span
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.2, ease: PANEL_EASE }}
                  className="inline-flex shrink-0 opacity-75"
                  aria-hidden="true"
                >
                  <ChevronDown size={11} strokeWidth={2.2} />
                </motion.span>
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Animated Feature Expansion Sheet (Bounded inside viewport) */}
      <AnimatePresence>
        {activeTab && activeItemMeta && (
          <motion.div
            key="aura-command-sheet"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: PANEL_EASE }}
            role="tabpanel"
            aria-label={activeItemMeta.label}
            className="absolute left-1.5 right-1.5 sm:left-2 sm:right-2 top-full mt-1 bg-white rounded-xl border border-[#E9D9C5] shadow-[0_14px_32px_-8px_rgba(84,43,25,0.2)] max-h-[min(390px,56vh)] overflow-y-auto z-30"
          >
            {/* Sheet Header with Feature Context */}
            <div className="sticky top-0 z-10 flex items-center justify-between gap-2.5 px-3 py-2 bg-[#FFF9F0]/95 backdrop-blur-sm border-b border-[#E9D9C5]">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-7 h-7 rounded-lg bg-[#702A20]/10 text-[#702A20] flex items-center justify-center shrink-0">
                  {React.createElement(activeItemMeta.icon, { size: 14, strokeWidth: 2.1 })}
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#542B19] truncate">
                    {activeItemMeta.label}
                  </div>
                  <div className="text-[10.5px] text-[#887565] truncate">
                    {activeItemMeta.subtitle}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab(null)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-[#E9D9C5] text-[11px] font-semibold text-[#542B19] hover:border-[#C69A45] hover:bg-[#FFF9F0] transition-colors whitespace-nowrap shrink-0"
                aria-label="मेनू बंद करें"
              >
                <X size={12} />
                <span>बंद करें</span>
              </button>
            </div>

            <div className="p-3 space-y-2.5">
              {/* PANEL 1: CHATS & SESSIONS */}
              {activeTab === "chats" && (
                <>
                  <motion.button
                    type="button"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.02, duration: 0.18, ease: PANEL_EASE }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => closeAndRun(onNewChat)}
                    className="w-full flex items-center justify-between gap-3 p-2.5 rounded-xl bg-[#702A20] hover:bg-[#542B19] text-white shadow-sm transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                        <Plus size={16} strokeWidth={2.4} />
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold">नया चैट शुरू करें (New Chat)</div>
                        <div className="text-[10.5px] text-[#FFF9F0]/85 truncate">
                          नई बातचीत शुरू करें; पिछली चैट सुरक्षित रहेगी
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={15} className="shrink-0 opacity-85" />
                  </motion.button>

                  {isPandit && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.04, duration: 0.18, ease: PANEL_EASE }}
                      className="rounded-xl border border-[#E9D9C5] bg-[#FFF9F0] p-2.5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold text-[#542B19]">
                        <span>चैट सत्र (Active & Saved Chats)</span>
                        <span className="tabular-nums text-[10px] font-semibold text-[#887565]">
                          {otherSessions.length + 1} सत्र
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-white border border-[#C69A45] text-xs font-semibold text-[#542B19]">
                        <span className="truncate">सक्रिय चैट (वर्तमान बातचीत)</span>
                        <span className="text-[10px] font-bold text-[#702A20] shrink-0">चालू</span>
                      </div>

                      {otherSessions.length > 0 && (
                        <div className="space-y-1 max-h-36 overflow-y-auto pr-0.5">
                          {otherSessions.map((sess, idx) => (
                            <motion.button
                              key={sess.id}
                              type="button"
                              initial={{ opacity: 0, x: -4 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.05 + idx * 0.025, duration: 0.18, ease: PANEL_EASE }}
                              whileTap={{ scale: 0.985 }}
                              onClick={() => closeAndRun(() => onSelectSession?.(sess.id))}
                              className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-white border border-[#E9D9C5] hover:border-[#C69A45] hover:bg-[#FFF9F0] text-left transition-colors"
                            >
                              <span className="text-[11.5px] font-medium text-[#542B19] truncate">
                                {sess.title || "पंडित जी परामर्श"}
                              </span>
                              <span className="text-[10px] font-semibold text-[#702A20] shrink-0 whitespace-nowrap">
                                खोलें →
                              </span>
                            </motion.button>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}

                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.06, duration: 0.18, ease: PANEL_EASE }}
                    className="grid grid-cols-2 gap-2"
                  >
                    <button
                      type="button"
                      onClick={() => closeAndRun(onOpenHistory)}
                      className="flex items-start gap-2 p-2.5 rounded-xl bg-white border border-[#E9D9C5] hover:border-[#C69A45] hover:bg-[#FFF9F0] text-left transition-colors"
                    >
                      <span className="w-7 h-7 rounded-lg bg-[#FFF9F0] border border-[#E9D9C5] text-[#702A20] flex items-center justify-center shrink-0">
                        <History size={14} />
                      </span>
                      <div className="min-w-0">
                        <div className="text-[11.5px] font-bold text-[#542B19] truncate">चैट इतिहास</div>
                        <div className="text-[10px] text-[#887565] leading-snug">सभी पुरानी चैट्स देखें</div>
                      </div>
                    </button>

                    {onOpenNotes ? (
                      <button
                        type="button"
                        onClick={() => closeAndRun(onOpenNotes)}
                        className="flex items-start gap-2 p-2.5 rounded-xl bg-white border border-[#E9D9C5] hover:border-[#C69A45] hover:bg-[#FFF9F0] text-left transition-colors"
                      >
                        <span className="w-7 h-7 rounded-lg bg-[#FFF9F0] border border-[#E9D9C5] text-[#702A20] flex items-center justify-center shrink-0">
                          <Notebook size={14} />
                        </span>
                        <div className="min-w-0">
                          <div className="text-[11.5px] font-bold text-[#542B19] truncate tabular-nums">
                            नोट्स {notesCount > 0 ? `(${notesCount})` : ""}
                          </div>
                          <div className="text-[10px] text-[#887565] leading-snug">आध्यात्मिक डायरी</div>
                        </div>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => closeAndRun(onOpenSavedKundalis)}
                        className="flex items-start gap-2 p-2.5 rounded-xl bg-white border border-[#E9D9C5] hover:border-[#C69A45] hover:bg-[#FFF9F0] text-left transition-colors"
                      >
                        <span className="w-7 h-7 rounded-lg bg-[#FFF9F0] border border-[#E9D9C5] text-[#702A20] flex items-center justify-center shrink-0">
                          <Bookmark size={14} />
                        </span>
                        <div className="min-w-0">
                          <div className="text-[11.5px] font-bold text-[#542B19] truncate">सेव कुंडलियां</div>
                          <div className="text-[10px] text-[#887565] leading-snug">प्रोफ़ाइल बदलें</div>
                        </div>
                      </button>
                    )}
                  </motion.div>
                </>
              )}

              {/* PANEL 2: KUNDALI PROFILE & FORM */}
              {activeTab === "kundali" && (
                <>
                  {hasKundali ? (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.02, duration: 0.18, ease: PANEL_EASE }}
                      className="rounded-xl border border-[#C69A45] bg-[#FFF9F0] p-3 flex items-center justify-between gap-2.5"
                    >
                      <div className="min-w-0">
                        <div className="text-[10.5px] font-bold text-[#702A20]">
                          सक्रिय कुंडली प्रोफ़ाइल
                        </div>
                        <div className="text-xs font-bold text-[#542B19] truncate mt-0.5">
                          {activeBirthDetails.name || "Devotee"}
                        </div>
                        <div className="text-[11px] text-[#887565] tabular-nums truncate">
                          {activeBirthDetails.dob}
                          {activeBirthDetails.birthTime ? ` · ${activeBirthDetails.birthTime}` : ""}
                          {activeBirthDetails.birthPlace ? ` · ${activeBirthDetails.birthPlace}` : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => closeAndRun(onEditBirthDetails)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-[#C69A45] text-[#542B19] text-[11px] font-bold hover:bg-[#FFF9F0] transition-colors whitespace-nowrap"
                        >
                          <Pencil size={11} />
                          <span>बदलें</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => closeAndRun(onClearBirthDetails)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#FFF1F2] border border-[#FECDD3] text-[#9F1239] text-[11px] font-bold hover:bg-[#FFE4E6] transition-colors whitespace-nowrap"
                        >
                          <Trash2 size={11} />
                          <span>हटाएं</span>
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.02, duration: 0.18, ease: PANEL_EASE }}
                      className="rounded-xl border border-dashed border-[#E9D9C5] bg-[#FFF9F0] px-3 py-2.5 text-[11px] text-[#887565]"
                    >
                      कोई सक्रिय कुंडली चयनित नहीं है — सटीक लग्न, ग्रह-दशा व रुद्राक्ष चयन के लिए जन्म विवरण जोड़ें।
                    </motion.div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <motion.button
                      type="button"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.04, duration: 0.18, ease: PANEL_EASE }}
                      whileTap={{ scale: 0.985 }}
                      onClick={() => closeAndRun(() => {
                        if (!isPandit && onSwitchMode) onSwitchMode("panditji");
                        onToggleBirthForm?.();
                      })}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-colors ${
                        showBirthForm
                          ? "bg-[#FFF9F0] border-[#C69A45]"
                          : "bg-white border-[#E9D9C5] hover:border-[#C69A45] hover:bg-[#FFF9F0]"
                      }`}
                    >
                      <span className="w-8 h-8 rounded-lg bg-[#702A20]/10 text-[#702A20] flex items-center justify-center shrink-0">
                        <FileText size={15} />
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#542B19]">
                          {showBirthForm ? "कुंडली फॉर्म बंद करें" : "नया कुंडली फॉर्म भरें"}
                        </div>
                        <div className="text-[10.5px] text-[#887565] leading-snug mt-0.5">
                          नाम, जन्म तिथि, समय व स्थान डालकर संपूर्ण विश्लेषण पाएं
                        </div>
                      </div>
                    </motion.button>

                    <motion.button
                      type="button"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.06, duration: 0.18, ease: PANEL_EASE }}
                      whileTap={{ scale: 0.985 }}
                      onClick={() => closeAndRun(() => {
                        if (!isPandit && onSwitchMode) onSwitchMode("panditji");
                        onOpenSavedKundalis?.();
                      })}
                      className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-[#E9D9C5] hover:border-[#C69A45] hover:bg-[#FFF9F0] text-left transition-colors"
                    >
                      <span className="w-8 h-8 rounded-lg bg-[#FFF9F0] border border-[#E9D9C5] text-[#702A20] flex items-center justify-center shrink-0">
                        <Bookmark size={15} />
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#542B19]">सुरक्षित कुंडलियां</div>
                        <div className="text-[10.5px] text-[#887565] leading-snug mt-0.5">
                          पहले से सेव की गई कुंडलियों में से 1-क्लिक में चुनें
                        </div>
                      </div>
                    </motion.button>
                  </div>
                </>
              )}

              {/* PANEL 3: STYLE & GRAPH VIEW */}
              {activeTab === "style" && (
                <>
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-[#542B19]">
                      उत्तर का अंदाज़ (Response Style)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {styleOptions.map((opt, idx) => {
                        const Icon = opt.icon;
                        const active = panditPrefs.responseStyle === opt.id;
                        return (
                          <motion.button
                            key={opt.id}
                            type="button"
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.03, duration: 0.18, ease: PANEL_EASE }}
                            whileTap={{ scale: 0.985 }}
                            onClick={() => {
                              onChangePanditPref?.({ responseStyle: opt.id });
                            }}
                            className={`flex items-start justify-between gap-2 p-2.5 rounded-xl border text-left transition-colors ${
                              active
                                ? "bg-[#FFF9F0] border-[#C69A45] shadow-[0_2px_6px_rgba(84,43,25,0.08)]"
                                : "bg-white border-[#E9D9C5] hover:border-[#C69A45]"
                            }`}
                          >
                            <div className="flex items-start gap-2 min-w-0">
                              <span
                                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                  active ? "bg-[#702A20] text-white" : "bg-[#FFF9F0] border border-[#E9D9C5] text-[#702A20]"
                                }`}
                              >
                                <Icon size={14} />
                              </span>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-[#542B19]">{opt.title}</div>
                                <div className="text-[10.5px] text-[#887565] leading-snug mt-0.5">
                                  {opt.desc}
                                </div>
                              </div>
                            </div>
                            {active && (
                              <span className="w-5 h-5 rounded-full bg-[#702A20] text-white flex items-center justify-center shrink-0">
                                <Check size={11} strokeWidth={2.6} />
                              </span>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1.5 border-t border-[#E9D9C5]">
                    <div className="text-[11px] font-bold text-[#542B19]">
                      ग्राफ और चार्ट प्रारूप (Visual Graph View)
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {chartOptions.map((opt, idx) => {
                        const Icon = opt.icon;
                        const active = panditPrefs.chartStyle === opt.id;
                        return (
                          <motion.button
                            key={opt.id}
                            type="button"
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.04 + idx * 0.025, duration: 0.18, ease: PANEL_EASE }}
                            whileTap={{ scale: 0.985 }}
                            onClick={() => {
                              onChangePanditPref?.({ chartStyle: opt.id });
                            }}
                            className={`flex items-start justify-between gap-2 p-2.5 rounded-xl border text-left transition-colors ${
                              active
                                ? "bg-[#FFF9F0] border-[#C69A45] shadow-[0_2px_6px_rgba(84,43,25,0.08)]"
                                : "bg-white border-[#E9D9C5] hover:border-[#C69A45]"
                            }`}
                          >
                            <div className="flex items-start gap-2 min-w-0">
                              <span
                                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                  active ? "bg-[#702A20] text-white" : "bg-[#FFF9F0] border border-[#E9D9C5] text-[#702A20]"
                                }`}
                              >
                                <Icon size={13} />
                              </span>
                              <div className="min-w-0">
                                <div className="text-[11.5px] font-bold text-[#542B19] truncate">
                                  {opt.title}
                                </div>
                                <div className="text-[10px] text-[#887565] leading-snug mt-0.5">
                                  {opt.desc}
                                </div>
                              </div>
                            </div>
                            {active && (
                              <span className="w-4 h-4 rounded-full bg-[#702A20] text-white flex items-center justify-center shrink-0 mt-0.5">
                                <Check size={10} strokeWidth={2.6} />
                              </span>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* PANEL 2 ALT (STANDARD MODE): QUICK PROMPTS */}
              {activeTab === "prompts" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {standardQuickPrompts.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <motion.button
                        key={item.title}
                        type="button"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03, duration: 0.18, ease: PANEL_EASE }}
                        whileTap={{ scale: 0.985 }}
                        onClick={() => closeAndRun(() => onSendQuickPrompt?.(item.prompt))}
                        className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-[#E9D9C5] hover:border-[#C69A45] hover:bg-[#FFF9F0] text-left transition-colors"
                      >
                        <span className="w-8 h-8 rounded-lg bg-[#FFF9F0] border border-[#E9D9C5] text-[#702A20] flex items-center justify-center shrink-0">
                          <Icon size={15} />
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#542B19] truncate">{item.title}</div>
                          <div className="text-[10.5px] text-[#887565] leading-snug mt-0.5">
                            {item.desc}
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {/* PANEL 4: VEDIC TOOLS & SUGGESTIONS */}
              {activeTab === "tools" && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {vedicToolCards.map((tool, idx) => {
                      const Icon = tool.icon;
                      return (
                        <motion.button
                          key={tool.tab}
                          type="button"
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.03, duration: 0.18, ease: PANEL_EASE }}
                          whileTap={{ scale: 0.985 }}
                          onClick={() => closeAndRun(() => onOpenVedicTool?.(tool.tab))}
                          className="flex items-start gap-2 p-2.5 rounded-xl bg-white border border-[#E9D9C5] hover:border-[#C69A45] hover:bg-[#FFF9F0] text-left transition-colors"
                        >
                          <span className="w-8 h-8 rounded-lg bg-[#702A20] text-white flex items-center justify-center shrink-0">
                            <Icon size={14} />
                          </span>
                          <div className="min-w-0">
                            <div className="text-[11.5px] font-bold text-[#542B19] truncate">
                              {tool.title}
                            </div>
                            <div className="text-[10px] text-[#887565] leading-snug mt-0.5">
                              {tool.desc}
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>

                  {dynamicSuggestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1, duration: 0.18, ease: PANEL_EASE }}
                      className="pt-2 border-t border-[#E9D9C5] space-y-1.5"
                    >
                      <div className="text-[11px] font-bold text-[#542B19]">
                        त्वरित प्रश्न (Suggested Questions)
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {dynamicSuggestions.slice(0, 4).map((sug, sIdx) => (
                          <button
                            key={sIdx}
                            type="button"
                            onClick={() => closeAndRun(() => onSendQuickPrompt?.(sug.query))}
                            className="px-2.5 py-1.5 rounded-lg bg-[#FFF9F0] border border-[#E9D9C5] hover:border-[#C69A45] text-[11px] font-semibold text-[#542B19] transition-colors whitespace-nowrap"
                          >
                            {sug.label}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {onToggleFullWindow && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.12, duration: 0.18, ease: PANEL_EASE }}
                      className="pt-1.5 border-t border-[#E9D9C5] flex items-center justify-between"
                    >
                      <span className="text-[11px] font-medium text-[#887565]">
                        विंडो आकार (Window View)
                      </span>
                      <button
                        type="button"
                        onClick={() => closeAndRun(onToggleFullWindow)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E9D9C5] hover:border-[#C69A45] text-[11px] font-bold text-[#542B19] transition-colors whitespace-nowrap"
                      >
                        {isFullWindow ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                        <span>{isFullWindow ? "कॉम्पैक्ट विंडो" : "फुल विंडो खोलें"}</span>
                      </button>
                    </motion.div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
