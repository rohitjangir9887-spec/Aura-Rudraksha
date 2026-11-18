import React, { useState, useEffect, useRef } from "react";
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
  Lightbulb,
  Maximize2,
  Minimize2,
  Notebook,
  X,
  Package,
  Gift,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";

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

  // Reset active tab cleanly when switching modes if tab id changed
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
          hint: `${savedSessions.length || 1} सत्र`,
          subtitle: "नया चैट, सक्रिय सत्र व इतिहास",
          icon: MessagesSquare
        },
        {
          id: "kundali",
          label: "कुंडली",
          hint: hasKundali ? "सक्रिय" : "सेट करें",
          subtitle: "जन्म विवरण, सेव कुंडली व बदलाव",
          icon: Compass,
          hasIndicator: hasKundali
        },
        {
          id: "style",
          label: "अंदाज़",
          hint: panditPrefs.responseStyle === "balanced" ? "सरल" : "विस्तृत",
          subtitle: "उत्तर शैली व चार्ट/ग्राफ प्रारूप",
          icon: SlidersHorizontal
        },
        {
          id: "tools",
          label: "टूल्स",
          hint: "4 टूल्स",
          subtitle: "मिलान, अंक ज्योतिष, पंचांग व कोष",
          icon: Sparkles
        }
      ]
    : [
        {
          id: "chats",
          label: "चैट",
          hint: "इतिहास",
          subtitle: "नया चैट, इतिहास व नोट्स",
          icon: MessagesSquare
        },
        {
          id: "prompts",
          label: "सुझाव",
          hint: "त्वरित",
          subtitle: "ऑर्डर ट्रैक, कूपन व रुद्राक्ष प्रश्न",
          icon: Lightbulb
        },
        {
          id: "kundali",
          label: "कुंडली",
          hint: hasKundali ? "सक्रिय" : "फ्री",
          subtitle: "पंडित जी व जन्म कुंडली विवरण",
          icon: Compass,
          hasIndicator: hasKundali
        },
        {
          id: "tools",
          label: "टूल्स",
          hint: "वैदिक",
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
    <div ref={dockRef} className="aura-dock-root" data-scope={scope}>
      {/* Single-Line 4-Option Dark Royal Bar */}
      <div
        role="tablist"
        aria-label="Aura AI Options"
        className="aura-dock-bar"
      >
        {dockItems.map((item) => {
          const Icon = item.icon;
          const isOpen = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isOpen}
              aria-expanded={isOpen}
              onClick={() => setActiveTab((prev) => (prev === item.id ? null : item.id))}
              className={`aura-dock-tab ${isOpen ? "is-open" : ""}`}
            >
              <span className="aura-dock-tab-top">
                <span className="aura-dock-tab-ico" aria-hidden="true">
                  <Icon size={13} strokeWidth={2.2} />
                </span>
                <span className="aura-dock-tab-label">{item.label}</span>
                {item.hasIndicator && !isOpen && (
                  <CheckCircle2
                    size={10}
                    className="aura-dock-tab-check"
                    aria-label="सक्रिय कुंडली लोड है"
                  />
                )}
                <ChevronDown
                  size={11}
                  strokeWidth={2.3}
                  className={`aura-dock-tab-caret ${isOpen ? "is-open" : ""}`}
                  aria-hidden="true"
                />
              </span>
              <span className="aura-dock-tab-hint">{item.hint}</span>
            </button>
          );
        })}
      </div>

      {/* Zero-Lag GPU Slide-Fade Expansion Sheet (Bounded inside viewport) */}
      {activeTab && activeItemMeta && (
        <div
          key={`aura-command-sheet-${activeTab}`}
          role="tabpanel"
          aria-label={activeItemMeta.label}
          className="aura-dock-sheet"
        >
          {/* Dark Espresso Sheet Header */}
          <div className="aura-dock-sheet-head">
            <div className="aura-dock-sheet-head-left">
              <span className="aura-dock-sheet-head-ico" aria-hidden="true">
                {React.createElement(activeItemMeta.icon, { size: 14, strokeWidth: 2.2 })}
              </span>
              <div className="aura-dock-sheet-head-meta">
                <div className="aura-dock-sheet-title">{activeItemMeta.label}</div>
                <div className="aura-dock-sheet-sub">{activeItemMeta.subtitle}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab(null)}
              className="aura-dock-sheet-close"
              aria-label="मेनू बंद करें"
            >
              <X size={12} strokeWidth={2.4} />
              <span>बंद करें</span>
            </button>
          </div>

          <div className="aura-dock-sheet-body">
            {/* PANEL 1: CHATS & SESSIONS */}
            {activeTab === "chats" && (
              <>
                <button
                  type="button"
                  onClick={() => closeAndRun(onNewChat)}
                  className="aura-dock-primary-cta"
                >
                  <div className="aura-dock-primary-cta-left">
                    <span className="aura-dock-primary-cta-ico">
                      <Plus size={16} strokeWidth={2.4} />
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#FFF9F0]">नया चैट शुरू करें (New Chat)</div>
                      <div className="text-[10.5px] text-[#E9D9C5] truncate">
                        नई बातचीत शुरू करें; पिछली चैट सुरक्षित रहेगी
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={15} className="shrink-0 text-[#F3D88B]" />
                </button>

                {isPandit && (
                  <div className="aura-dock-group-box">
                    <div className="aura-dock-group-head">
                      <span>चैट सत्र (Active & Saved Chats)</span>
                      <span className="tabular-nums text-[10px] font-bold text-[#702A20]">
                        {otherSessions.length + 1} सत्र
                      </span>
                    </div>

                    <div className="aura-dock-active-sess">
                      <span className="truncate">सक्रिय चैट (वर्तमान बातचीत)</span>
                      <span className="aura-dock-active-badge">चालू</span>
                    </div>

                    {otherSessions.length > 0 && (
                      <div className="space-y-1 max-h-36 overflow-y-auto pr-0.5">
                        {otherSessions.map((sess) => (
                          <button
                            key={sess.id}
                            type="button"
                            onClick={() => closeAndRun(() => onSelectSession?.(sess.id))}
                            className="aura-dock-sess-row"
                          >
                            <span className="text-[11.5px] font-semibold text-[#2b1408] truncate">
                              {sess.title || "पंडित जी परामर्श"}
                            </span>
                            <span className="text-[10px] font-bold text-[#702A20] shrink-0 whitespace-nowrap">
                              खोलें →
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => closeAndRun(onOpenHistory)}
                    className="aura-dock-tile"
                  >
                    <span className="aura-dock-tile-ico">
                      <History size={14} strokeWidth={2.2} />
                    </span>
                    <div className="min-w-0">
                      <div className="aura-dock-tile-title">चैट इतिहास</div>
                      <div className="aura-dock-tile-desc">सभी पुरानी चैट्स देखें</div>
                    </div>
                  </button>

                  {onOpenNotes ? (
                    <button
                      type="button"
                      onClick={() => closeAndRun(onOpenNotes)}
                      className="aura-dock-tile"
                    >
                      <span className="aura-dock-tile-ico">
                        <Notebook size={14} strokeWidth={2.2} />
                      </span>
                      <div className="min-w-0">
                        <div className="aura-dock-tile-title tabular-nums">
                          नोट्स {notesCount > 0 ? `(${notesCount})` : ""}
                        </div>
                        <div className="aura-dock-tile-desc">आध्यात्मिक डायरी</div>
                      </div>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => closeAndRun(onOpenSavedKundalis)}
                      className="aura-dock-tile"
                    >
                      <span className="aura-dock-tile-ico">
                        <Bookmark size={14} strokeWidth={2.2} />
                      </span>
                      <div className="min-w-0">
                        <div className="aura-dock-tile-title">सेव कुंडलियां</div>
                        <div className="aura-dock-tile-desc">प्रोफ़ाइल बदलें</div>
                      </div>
                    </button>
                  )}
                </div>
              </>
            )}

            {/* PANEL 2: KUNDALI PROFILE & FORM */}
            {activeTab === "kundali" && (
              <>
                {hasKundali ? (
                  <div className="aura-dock-kundali-banner">
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold uppercase tracking-wide text-[#F2D28B]">
                        ॐ सक्रिय कुंडली प्रोफ़ाइल
                      </div>
                      <div className="text-xs font-bold text-[#FFF9F0] truncate mt-0.5">
                        {activeBirthDetails.name || "Devotee"}
                      </div>
                      <div className="text-[11px] text-[#E9D9C5] tabular-nums truncate">
                        {activeBirthDetails.dob}
                        {activeBirthDetails.birthTime ? ` · ${activeBirthDetails.birthTime}` : ""}
                        {activeBirthDetails.birthPlace ? ` · ${activeBirthDetails.birthPlace}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => closeAndRun(onEditBirthDetails)}
                        className="aura-dock-kundali-edit"
                      >
                        <Pencil size={11} />
                        <span>बदलें</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => closeAndRun(onClearBirthDetails)}
                        className="aura-dock-kundali-del"
                      >
                        <Trash2 size={11} />
                        <span>हटाएं</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="aura-dock-empty-note">
                    कोई सक्रिय कुंडली चयनित नहीं है — सटीक लग्न, ग्रह-दशा व रुद्राक्ष चयन के लिए जन्म विवरण जोड़ें।
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => closeAndRun(() => {
                      if (!isPandit && onSwitchMode) onSwitchMode("panditji");
                      onToggleBirthForm?.();
                    })}
                    className={`aura-dock-tile ${showBirthForm ? "is-selected" : ""}`}
                  >
                    <span className="aura-dock-tile-ico">
                      <FileText size={15} strokeWidth={2.2} />
                    </span>
                    <div className="min-w-0">
                      <div className="aura-dock-tile-title">
                        {showBirthForm ? "कुंडली फॉर्म बंद करें" : "नया कुंडली फॉर्म भरें"}
                      </div>
                      <div className="aura-dock-tile-desc">
                        नाम, जन्म तिथि, समय व स्थान डालकर संपूर्ण विश्लेषण पाएं
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => closeAndRun(() => {
                      if (!isPandit && onSwitchMode) onSwitchMode("panditji");
                      onOpenSavedKundalis?.();
                    })}
                    className="aura-dock-tile"
                  >
                    <span className="aura-dock-tile-ico">
                      <Bookmark size={15} strokeWidth={2.2} />
                    </span>
                    <div className="min-w-0">
                      <div className="aura-dock-tile-title">सुरक्षित कुंडलियां</div>
                      <div className="aura-dock-tile-desc">
                        पहले से सेव की गई कुंडलियों में से 1-क्लिक में चुनें
                      </div>
                    </div>
                  </button>
                </div>
              </>
            )}

            {/* PANEL 3: STYLE & GRAPH VIEW */}
            {activeTab === "style" && (
              <>
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-[#3b1b08]">
                    उत्तर का अंदाज़ (Response Style)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {styleOptions.map((opt) => {
                      const Icon = opt.icon;
                      const active = panditPrefs.responseStyle === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => onChangePanditPref?.({ responseStyle: opt.id })}
                          className={`aura-dock-option-card ${active ? "is-active" : ""}`}
                        >
                          <div className="flex items-start gap-2 min-w-0">
                            <span className={`aura-dock-tile-ico ${active ? "is-active" : ""}`}>
                              <Icon size={14} strokeWidth={2.2} />
                            </span>
                            <div className="min-w-0">
                              <div className="aura-dock-tile-title">{opt.title}</div>
                              <div className="aura-dock-tile-desc">{opt.desc}</div>
                            </div>
                          </div>
                          {active && (
                            <span className="aura-dock-check-badge">
                              <Check size={11} strokeWidth={2.8} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-[#E9D9C5]">
                  <div className="text-[11px] font-bold text-[#3b1b08]">
                    ग्राफ और चार्ट प्रारूप (Visual Graph View)
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {chartOptions.map((opt) => {
                      const Icon = opt.icon;
                      const active = panditPrefs.chartStyle === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => onChangePanditPref?.({ chartStyle: opt.id })}
                          className={`aura-dock-option-card ${active ? "is-active" : ""}`}
                        >
                          <div className="flex items-start gap-2 min-w-0">
                            <span className={`aura-dock-tile-ico ${active ? "is-active" : ""}`}>
                              <Icon size={13} strokeWidth={2.2} />
                            </span>
                            <div className="min-w-0">
                              <div className="aura-dock-tile-title truncate">{opt.title}</div>
                              <div className="aura-dock-tile-desc">{opt.desc}</div>
                            </div>
                          </div>
                          {active && (
                            <span className="aura-dock-check-badge">
                              <Check size={10} strokeWidth={2.8} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* PANEL 2 ALT (STANDARD MODE): QUICK PROMPTS */}
            {activeTab === "prompts" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {standardQuickPrompts.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.title}
                      type="button"
                      onClick={() => closeAndRun(() => onSendQuickPrompt?.(item.prompt))}
                      className="aura-dock-tile"
                    >
                      <span className="aura-dock-tile-ico">
                        <Icon size={15} strokeWidth={2.2} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="aura-dock-tile-title truncate">{item.title}</div>
                        <div className="aura-dock-tile-desc">{item.desc}</div>
                      </div>
                      <ChevronRight size={14} className="shrink-0 text-[#887565] self-center" />
                    </button>
                  );
                })}
              </div>
            )}

            {/* PANEL 4: VEDIC TOOLS & SUGGESTIONS */}
            {activeTab === "tools" && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {vedicToolCards.map((tool) => {
                    const Icon = tool.icon;
                    return (
                      <button
                        key={tool.tab}
                        type="button"
                        onClick={() => closeAndRun(() => onOpenVedicTool?.(tool.tab))}
                        className="aura-dock-tile"
                      >
                        <span className="aura-dock-tile-ico is-active">
                          <Icon size={14} strokeWidth={2.2} />
                        </span>
                        <div className="min-w-0">
                          <div className="aura-dock-tile-title truncate">{tool.title}</div>
                          <div className="aura-dock-tile-desc">{tool.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {dynamicSuggestions.length > 0 && (
                  <div className="pt-2 border-t border-[#E9D9C5] space-y-1.5">
                    <div className="text-[11px] font-bold text-[#3b1b08]">
                      त्वरित प्रश्न (Suggested Questions)
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {dynamicSuggestions.slice(0, 4).map((sug, sIdx) => (
                        <button
                          key={sIdx}
                          type="button"
                          onClick={() => closeAndRun(() => onSendQuickPrompt?.(sug.query))}
                          className="aura-dock-chip-btn"
                        >
                          {sug.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {onToggleFullWindow && (
                  <div className="pt-2 border-t border-[#E9D9C5] flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-[#542B19]">
                      विंडो आकार (Window View)
                    </span>
                    <button
                      type="button"
                      onClick={() => closeAndRun(onToggleFullWindow)}
                      className="aura-dock-window-btn"
                    >
                      {isFullWindow ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                      <span>{isFullWindow ? "कॉम्पैक्ट विंडो" : "फुल विंडो खोलें"}</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
