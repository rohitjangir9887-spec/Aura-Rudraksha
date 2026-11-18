import { getProductPrimaryImage } from "../lib/imageUtils";
import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Sparkles, 
  Send, 
  Mic, 
  MicOff, 
  RotateCcw, 
  ShoppingCart, 
  Tag, 
  ShieldCheck, 
  PhoneCall, 
  Package, 
  Check, 
  Compass, 
  Flame, 
  ChevronRight,
  ChevronLeft,
  EyeOff,
  BookOpen,
  MessageSquare,
  ArrowDown,
  Copy,
  Share2,
  Bookmark,
  History,
  Maximize2,
  Minimize2,
  X
} from "lucide-react";
import { Shell } from "../components/Shell";
import { auraAiClient } from "../lib/auraAiClient";
import { parseAuraAiPayload, customerSafeAiText, isAuraResponseIncomplete, smartMergeContinuation } from "../lib/auraAiResponse";
import { auraChatStore, getDateDividerLabel, formatMessageTime } from "../lib/auraChatStore";
import { useCart } from "../hooks/useCart";
import { authClient } from "../lib/authClient";
import { db } from "../lib/db";
import { emitToast } from "../context/ToastContext";
import { AuraAIChatOrderModal } from "../components/AuraAIChatOrderModal";
import { AuraAIMessageContent } from "../components/AuraAIMessageContent";
import { VoiceReader } from "../components/VoiceReader";
import { AuraAIChatHistoryModal } from "../components/AuraAIChatHistoryModal";
import { AuraAISavedKundaliModal } from "../components/AuraAISavedKundaliModal";
import { PanditJiVedicTools } from "../components/PanditJiVedicTools";
import { AuraCommandDock } from "../components/AuraCommandDock";
import { AuraQuickAiAssistantCard } from "../components/AuraQuickAiAssistantCard";
import { AuraSuggestedActionsAccordion } from "../components/AuraSuggestedActionsAccordion";
import { AuraActiveKundaliCard } from "../components/AuraActiveKundaliCard";
import { AuraProductRecCard } from "../components/AuraProductRecCard";
import { AuraPanditWorkspacePanel, PANDIT_ASTROLOGY_QUICK_TOPICS } from "../components/AuraPanditWorkspacePanel";
import { useSeo } from "../hooks/useSeo";

export function AuraAIPage() {
  useSeo({
    title: "Aura AI Astrologer - Live Vedic Rudraksha Recommendation | Aura Rudraksha",
    description: "Consult Aura AI Vedic Astrologer for personalized Rudraksha recommendations based on your birth date, zodiac Rashi, career aspirations, and spiritual goals.",
    canonical: "https://aurarudraksha.bond/aura-ai"
  });

  const [mode, setMode] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlMode = params.get("mode");
      if (urlMode === "panditji" || urlMode === "standard") return urlMode;
    } catch (_) {}
    return "standard";
  }); // "standard" | "panditji"
  // Shared persistent chat history per mode
  const [messages, setMessages] = useState(() => auraChatStore.getMessages(mode));
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(() => auraChatStore.getConversationId());
  const [addedItems, setAddedItems] = useState({});
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [orderModalProduct, setOrderModalProduct] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [activeOffers, setActiveOffers] = useState([]);
  const [isFloatingDismissed, setIsFloatingDismissed] = useState(() => auraChatStore.isFloatingDismissed());
  const [mobileTab, setMobileTab] = useState("chat"); // "chat" | "topics" | "deals"
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshPhase, setRefreshPhase] = useState("idle"); // "idle" | "fading-out" | "fading-in"
  const [showRefreshToast, setShowRefreshToast] = useState(false);
  const [showChatHistoryModal, setShowChatHistoryModal] = useState(false);
  const [showSavedKundaliModal, setShowSavedKundaliModal] = useState(false);
  const [showVedicToolsModal, setShowVedicToolsModal] = useState(false);
  const [vedicToolsTab, setVedicToolsTab] = useState("milan");
  const [showBirthForm, setShowBirthForm] = useState(false);
  const [birthForm, setBirthForm] = useState({
    name: "",
    dob: "",
    time: "",
    place: "",
    concern: "career"
  });
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeBirthDetails, setActiveBirthDetails] = useState(() => auraChatStore.getVerifiedBirthDetails());
  const [panditPrefs, setPanditPrefs] = useState(() => auraChatStore.getPanditPreferences());
  const [savedPanditSessions, setSavedPanditSessions] = useState(() => auraChatStore.getSavedSessions("panditji"));

  // Helper to parse [AURA_KEYWORDS]: kw1 | kw2 | ... from AI text
  const parseAuraKeywords = (text) => {
    if (!text) return [];
    const match = text.match(/\[AURA_KEYWORDS\]:\s*([^\n]+)/);
    if (!match) return [];
    return match[1].split("|").map(k => k.trim()).filter(Boolean).slice(0, 6);
  };

  // Helper to strip [AURA_KEYWORDS] line from visible display text
  const stripAuraKeywords = (text) => {
    if (!text) return text;
    return text.replace(/\[AURA_KEYWORDS\]:[^\n]*/g, "").trim();
  };

  // Dynamic engaging status messages while AI analyzes / calculates before writing
  const getDynamicThinkingStatus = (seconds, currentMode) => {
    if (currentMode === "panditji") {
      const panditMessages = [
        "🪐 ग्रहों की स्थिति का विश्लेषण किया जा रहा है...",
        "📜 आपकी जन्म कुंडली का अध्ययन हो रहा है...",
        "⏱️ दशा और अंतर्दशा की गणना की जा रही है...",
        "✨ महत्वपूर्ण योगों की जाँच की जा रही है...",
        "🔮 आपके प्रश्न के अनुसार ज्योतिषीय संकेत देखे जा रहे हैं...",
        "✍️ अंतिम उत्तर तैयार किया जा रहा है..."
      ];
      const idx = Math.min(Math.floor(seconds / 2.5), panditMessages.length - 1);
      return panditMessages[idx];
    } else {
      const standardMessages = [
        "🔍 प्रामाणिक स्टोर कैटलॉग व रुद्राक्ष खोज रहे हैं...",
        "🛡️ 100% लैब टेस्ट व X-Ray सर्टिफिकेशन जांच रहे हैं...",
        "🎁 सक्रिय डिस्काउंट कूपन व ऑफर्स चेक कर रहे हैं...",
        "✨ आपके लिए सर्वोत्तम उत्तर तैयार हो रहा है..."
      ];
      const idx = Math.min(Math.floor(seconds / 2.5), standardMessages.length - 1);
      return standardMessages[idx];
    }
  };

  // Aura AI Live Status and Stop/Retry State Variables
  const [statusText, setStatusText] = useState("Thinking...");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [errorOccurred, setErrorOccurred] = useState(false);
  const [lastUserQuery, setLastUserQuery] = useState("");
  const [activePassCount, setActivePassCount] = useState(0);
  const [streamingMsgId, setStreamingMsgId] = useState(null);
  const timerRef = useRef(null);

  const cart = useCart();
  const messagesEndRef = useRef(null);
  const chatScrollContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const isInitialMount = useRef(true);
  const turnSeqRef = useRef(0);
  const autoContinuationCountRef = useRef(0);
  const activeAiMsgIdRef = useRef(null);
  const skipNextModeResetRef = useRef(false);

  const handlePanditPrefChange = (patch) => {
    const updated = auraChatStore.savePanditPreferences(patch);
    setPanditPrefs(updated);
  };

  const handleBirthFormSubmit = (e) => {
    e.preventDefault();
    if (!birthForm.name.trim()) {
      emitToast("कृपया अपना नाम दर्ज करें (Please enter your name)", "warning");
      return;
    }
    if (!birthForm.dob) {
      emitToast("कृपया जन्म तिथि (Date of Birth) चुनें", "warning");
      return;
    }
    if (!birthForm.time || !birthForm.time.trim()) {
      emitToast("कृपया जन्म समय (Birth Time) दर्ज करें", "warning");
      return;
    }
    if (!birthForm.place.trim()) {
      emitToast("कृपया जन्म स्थान (Birth Place) दर्ज करें", "warning");
      return;
    }

    const concernLabels = {
      career: "⚡ व्यापार, नौकरी व धन वृद्धि (Career & Wealth)",
      peace: "🧘 मानसिक शांति व तनाव मुक्ति (Peace & Focus)",
      shani_dosha: "🛡️ शनि साढ़े साती व ग्रह दोष (Dosha Shanti)",
      marriage: "❤️ विवाह, प्रेम व पारिवारिक समृद्धि (Relationships)",
      health: "🩺 स्वास्थ्य व आरोग्य (Health & Vitality)",
      spiritual: "🕉️ आध्यात्मिक उन्नति व शिव कृपा (Moksha & Sadhana)"
    };

    const promptText = `नमस्ते पंडित जी 🙏 मेरा नाम ${birthForm.name.trim()} है।\n• जन्म तिथि: ${birthForm.dob}\n• जन्म समय: ${birthForm.time.trim()}\n• जन्म स्थान: ${birthForm.place.trim()}\n• मुख्य संकल्प / समस्या: ${concernLabels[birthForm.concern] || birthForm.concern}\n\nकृपया एक अनुभवी वैदिक पंडित जी की तरह मेरी संपूर्ण विस्तृत जन्म कुंडली (Full Detailed Kundali) देखकर बताइए:\n1. अभी मेरे जीवन में क्या-क्या परेशानी चल रही है?\n2. यह परेशानी क्यों, कब से और कैसे चल रही है?\n3. यह परेशानी कब ठीक होगी और मेरा भाग्योदय कब होगा?\n4. सभी 9 ग्रहों, 12 भावों व महादशा का पूरा फल तथा सर्वोत्तम सिद्ध नेपाली रुद्राक्ष व लाल किताब उपाय बताइए।`;

    const verifiedDetails = {
      name: birthForm.name.trim(),
      dob: birthForm.dob,
      birthTime: birthForm.time.trim(),
      birthPlace: birthForm.place.trim(),
      concern: birthForm.concern
    };
    auraChatStore.saveVerifiedBirthDetails(verifiedDetails);
    setActiveBirthDetails(verifiedDetails);
    setShowBirthForm(false);
    if (mode !== "panditji") {
      skipNextModeResetRef.current = true;
      setMode("panditji");
    }
    handleSend(promptText, verifiedDetails);
  };

  // Check for pending prompts and birth details (e.g. from RudrakshaCalculator)
  useEffect(() => {
    try {
      const pendingPrompt = sessionStorage.getItem("aura_pending_prompt");
      const pendingDetailsRaw = sessionStorage.getItem("aura_pending_birth_details");
      if (pendingPrompt) {
        sessionStorage.removeItem("aura_pending_prompt");
        let parsedDetails = null;
        if (pendingDetailsRaw) {
          sessionStorage.removeItem("aura_pending_birth_details");
          try { parsedDetails = JSON.parse(pendingDetailsRaw); } catch (_) {}
        }
        if (parsedDetails) {
          skipNextModeResetRef.current = true;
          setMode("panditji");
          setActiveBirthDetails(parsedDetails);
          auraChatStore.saveVerifiedBirthDetails(parsedDetails);
        }
        setTimeout(() => {
          handleSend(pendingPrompt, parsedDetails);
        }, 150);
      }
    } catch (_) {}
  }, []);

  // Update messages when switching mode (e.g. standard vs panditji) without aborting auto-promoted active sends
  useEffect(() => {
    if (skipNextModeResetRef.current) {
      skipNextModeResetRef.current = false;
      return;
    }
    auraAiClient.abortActiveStream();
    turnSeqRef.current++;
    setLoading(false);
    setErrorOccurred(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const msgs = auraChatStore.getMessages(mode);
    setMessages(msgs);
    if (mode === "panditji") {
      setSavedPanditSessions(auraChatStore.getSavedSessions("panditji"));
    }
    requestAnimationFrame(() => {
      if (chatScrollContainerRef.current) {
        chatScrollContainerRef.current.scrollTop = chatScrollContainerRef.current.scrollHeight;
      }
    });
  }, [mode]);

  // Handle Auth changes safely without aborting live turns on transient auth refresh
  useEffect(() => {
    let isMounted = true;
    const unsub = authClient.onAuthStateChanged(async (currentUser) => {
      const syncResult = auraChatStore.syncAuthSession(currentUser, mode);
      if (syncResult?.accountSwitched) {
        auraAiClient.abortActiveStream();
      }
      if (isMounted) {
        if (syncResult?.accountSwitched && Array.isArray(syncResult.messages) && syncResult.messages.length > 0) {
          setMessages(syncResult.messages);
        }
        if (syncResult?.conversationId) {
          setConversationId(syncResult.conversationId);
        }
      }
    });

    return () => {
      isMounted = false;
      if (typeof unsub === "function") unsub();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [mode]);

  // Auto-grow textarea height on input change
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "38px";
      const scrollH = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollH, 38), 100)}px`;
    }
  }, [input]);

  // Sync with global store changes across tabs and components
  useEffect(() => {
    const handleChatSync = (e) => {
      if (e.detail && Array.isArray(e.detail.messages)) {
        if (!e.detail.mode || e.detail.mode === mode) {
          setMessages(e.detail.messages);
        }
      } else if (e.detail && Array.isArray(e.detail)) {
        setMessages(e.detail);
      }
    };

    const handleSessionSwitched = (e) => {
      if (e.detail?.conversationId) {
        setConversationId(e.detail.conversationId);
      }
      if (!e.detail?.mode || e.detail.mode === mode) {
        setMessages(e.detail?.messages || auraChatStore.getMessages(mode));
      }
      setSavedPanditSessions(auraChatStore.getSavedSessions("panditji"));
    };

    const handleHistoryUpdated = () => {
      setSavedPanditSessions(auraChatStore.getSavedSessions("panditji"));
    };

    const handlePrefsUpdated = (e) => {
      setPanditPrefs(e.detail || auraChatStore.getPanditPreferences());
    };

    const handleDismissSync = (e) => {
      setIsFloatingDismissed(!!e.detail);
    };

    const handleStorageChange = (e) => {
      if (e.key === auraChatStore.getStorageKey(mode)) {
        setMessages(auraChatStore.getMessages(mode));
      }
      if (e.key === "aura_ai_floating_dismissed") {
        setIsFloatingDismissed(auraChatStore.isFloatingDismissed());
      }
    };

    const handleBirthDetailsUpdate = (e) => {
      setActiveBirthDetails(e.detail?.details || auraChatStore.getVerifiedBirthDetails());
    };
    const handleBirthDetailsCleared = () => {
      setActiveBirthDetails(null);
    };

    window.addEventListener("aura_ai_chat_sync", handleChatSync);
    window.addEventListener("aura_ai_session_switched", handleSessionSwitched);
    window.addEventListener("aura_ai_history_updated", handleHistoryUpdated);
    window.addEventListener("aura_ai_pandit_prefs_updated", handlePrefsUpdated);
    window.addEventListener("aura_ai_floating_dismiss_sync", handleDismissSync);
    window.addEventListener("aura_ai_birth_details_updated", handleBirthDetailsUpdate);
    window.addEventListener("aura_ai_birth_details_cleared", handleBirthDetailsCleared);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("aura_ai_chat_sync", handleChatSync);
      window.removeEventListener("aura_ai_session_switched", handleSessionSwitched);
      window.removeEventListener("aura_ai_history_updated", handleHistoryUpdated);
      window.removeEventListener("aura_ai_pandit_prefs_updated", handlePrefsUpdated);
      window.removeEventListener("aura_ai_floating_dismiss_sync", handleDismissSync);
      window.removeEventListener("aura_ai_birth_details_updated", handleBirthDetailsUpdate);
      window.removeEventListener("aura_ai_birth_details_cleared", handleBirthDetailsCleared);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [mode]);

  // Load products & offers for side panel
  useEffect(() => {
    const prods = db.getProducts();
    if (prods && prods.length > 0) {
      setFeaturedProducts(prods.slice(0, 4));
    }
    const offers = db.getCoupons ? db.getCoupons() : [];
    setActiveOffers(offers.length > 0 ? offers.slice(0, 3) : []);
  }, []);

  // Keep page at the top when navigating to /aura-ai
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  const userHasScrolledUpRef = useRef(false);
  const isNearBottomRef = useRef(true);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);

  const handleScroll = () => {
    if (!chatScrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatScrollContainerRef.current;
    const distanceToBottom = scrollHeight - (scrollTop + clientHeight);
    const isScrolledUp = distanceToBottom > 15;
    userHasScrolledUpRef.current = isScrolledUp;
    isNearBottomRef.current = !isScrolledUp;
    setShowJumpToBottom(isScrolledUp && scrollHeight > clientHeight + 40);
  };

  const handleWheel = (e) => {
    if (Math.abs(e.deltaY) > 1) {
      if (e.deltaY < 0) {
        userHasScrolledUpRef.current = true;
        isNearBottomRef.current = false;
        setShowJumpToBottom(true);
      }
    }
  };

  const touchStartYRef = useRef(0);
  const handleTouchStart = (e) => {
    if (e.touches && e.touches[0]) {
      touchStartYRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches && e.touches[0]) {
      const deltaY = e.touches[0].clientY - touchStartYRef.current;
      if (Math.abs(deltaY) > 2) {
        if (deltaY > 0) {
          // Swiping down = scrolling up
          userHasScrolledUpRef.current = true;
          isNearBottomRef.current = false;
          setShowJumpToBottom(true);
        }
      }
    }
  };

  // Only scroll on initial mount so existing conversation is visible
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (chatScrollContainerRef.current) {
        chatScrollContainerRef.current.scrollTop = chatScrollContainerRef.current.scrollHeight;
      }
    }
  }, []);

  const handleSend = async (customText = null, customBirthDetails = null) => {
    const textToSend = customText || input;
    if (!textToSend || !textToSend.trim()) return;

    // 1. Immediately abort active stream and increment sequence to discard superseded events
    auraAiClient.abortActiveStream();
    const currentTurnSeq = ++turnSeqRef.current;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const effectiveBirthDetails = customBirthDetails || activeBirthDetails || auraChatStore.getVerifiedBirthDetails() || null;
    const isAstroQuery = (
      mode === "panditji" ||
      Boolean(effectiveBirthDetails) ||
      /kundli|kundali|horoscope|birth chart|rashi|nakshatra|graha|dasha|mahadasha|antardasha|lagna|astrology|jyotish|dob|janma|milan|gun milan|ashtakoot|mulank|bhagyank|numerology|panchang|muhurat|rahu kaal|chakra|kaal sarp|pitra|kemadruma|sade sati|dhaiya|lal kitab|bhava|महादशा|अंतर्दशा|विंशोत्तरी|दशा|कुंडली|जन्मपत्रिका|राशि|नक्षत्र|लग्न|मांगलिक|साढ़े साती|साढ़े साती|ग्रह|दोष|भविष्य|विवाह योग|करियर योग|भाग्य|किस की महादशा|पंडित|पण्डित|शादी कब|नौकरी कब|विवाह|शनि|राहु|केतु|मंगल|गुरु|सूर्य|चंद्र|पंचांग|मुहूर्त|मिलान|गुण मिलान|मूलांक|भाग्यांक|अंक ज्योतिष|चक्र|कालसर्प|पितृ|केमद्रुम|नेपाली रुद्राक्ष|असली नकली|एक्स रे|प्राण प्रतिष्ठा|धारण विधि/i.test(textToSend || "")
    );
    const targetMode = isAstroQuery ? "panditji" : mode;
    if (isAstroQuery && mode !== "panditji") {
      skipNextModeResetRef.current = true;
      setMode("panditji");
    }

    const userMsg = {
      id: "msg_" + Date.now(),
      sender: "user",
      text: textToSend.trim(),
      timestamp: new Date().toISOString()
    };

    const currentMsgs = auraChatStore.appendMessage(userMsg, targetMode);
    setMessages(currentMsgs);
    if (!customText) setInput("");
    setMobileTab("chat");
    userHasScrolledUpRef.current = false;
    setShowJumpToBottom(false);

    // Scroll smoothly to bottom of viewing area
    requestAnimationFrame(() => {
      if (chatScrollContainerRef.current) {
        chatScrollContainerRef.current.scrollTo({ top: chatScrollContainerRef.current.scrollHeight, behavior: "smooth" });
      }
    });

    // Reset and Start Live Status Tracking
    setLastUserQuery(textToSend.trim());
    setErrorOccurred(false);
    autoContinuationCountRef.current = 0;
    setStatusText(getDynamicThinkingStatus(0, targetMode));
    setElapsedTime(0);
    setLoading(true);

    timerRef.current = setInterval(() => {
      setElapsedTime((prev) => {
        const next = prev + 1;
        if (!streamInitialized) {
          setStatusText(getDynamicThinkingStatus(next, targetMode));
        }
        return next;
      });
    }, 1000);

    const aiMsgId = "ai_" + Date.now();
    activeAiMsgIdRef.current = aiMsgId;
    setStreamingMsgId(aiMsgId);
    let streamInitialized = false;

    try {
      const currentUser = authClient.getUser();
      const userEmail = currentUser?.email || "";
      const userName = currentUser?.displayName || "Devotee";

      await auraAiClient.sendMessageStream({
        message: textToSend,
        conversationId,
        userEmail,
        userName,
        mode: targetMode,
        cartItems: cart.lines || [],
        history: currentMsgs.slice(-8),
        birthDetails: effectiveBirthDetails,
        panditPreferences: targetMode === "panditji" ? panditPrefs : null,
        onStatus: (statusMsg) => {
          if (currentTurnSeq !== turnSeqRef.current) return;
          setStatusText(statusMsg);
        },
        onChunk: (delta, accumulated, partialData) => {
          if (currentTurnSeq !== turnSeqRef.current) return;
          const cleanText = customerSafeAiText(accumulated);
          if (!streamInitialized && cleanText.trim().length > 0) {
            streamInitialized = true;
            setLoading(false);
            setErrorOccurred(false);
          }
          if (partialData?.kundali) {
            const verified = partialData.kundali.verifiedBirthData || {
              dob: partialData.kundali.dob,
              birthTime: partialData.kundali.birthTime,
              birthPlace: partialData.kundali.birthPlace,
              name: partialData.kundali.devoteeName || partialData.kundali.name || "Devotee",
              concern: partialData.kundali.concern || "career"
            };
            if (verified && verified.dob) {
              auraChatStore.saveVerifiedBirthDetails(verified);
              setActiveBirthDetails(verified);
            }
          }
          setStatusText(targetMode === "panditji" ? "✍️ वैदिक परामर्श लिखा जा रहा है..." : "✍️ उत्तर लिखा जा रहा है...");
          setMessages((prev) => {
            if (currentTurnSeq !== turnSeqRef.current) return prev;
            const idx = prev.findIndex((m) => m.id === aiMsgId);
            const existing = idx >= 0 ? prev[idx] : null;
            const liveMsg = {
              id: aiMsgId,
              sender: "ai",
              text: cleanText,
              products: (partialData?.products && partialData.products.length > 0) ? partialData.products : (existing?.products || []),
              coupons: (partialData?.coupons && partialData.coupons.length > 0) ? partialData.coupons : (existing?.coupons || []),
              orderInfo: partialData?.orderInfo || existing?.orderInfo || null,
              requiresHuman: Boolean(partialData?.requiresHuman || existing?.requiresHuman),
              quickReplies: (partialData?.quickReplies && partialData.quickReplies.length > 0) ? partialData.quickReplies : (existing?.quickReplies || []),
              kundali: partialData?.kundali || existing?.kundali || null,
              timestamp: existing?.timestamp || new Date().toISOString()
            };
            if (idx >= 0) {
              const clone = [...prev];
              clone[idx] = liveMsg;
              return clone;
            }
            return [...prev, liveMsg];
          });
        },
        onDone: (finalData) => {
          if (currentTurnSeq !== turnSeqRef.current) return;
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          if (finalData.kundali) {
            const verified = finalData.kundali.verifiedBirthData || {
              dob: finalData.kundali.dob,
              birthTime: finalData.kundali.birthTime,
              birthPlace: finalData.kundali.birthPlace,
              name: finalData.kundali.devoteeName || finalData.kundali.name || "Devotee",
              concern: finalData.kundali.concern || "career"
            };
            if (verified && verified.dob) {
              auraChatStore.saveVerifiedBirthDetails(verified);
              setActiveBirthDetails(verified);
            }
          }
          const cleanText = customerSafeAiText(finalData.text);
          const aiMsg = {
            id: aiMsgId,
            sender: "ai",
            text: cleanText,
            products: finalData.products || [],
            coupons: finalData.coupons || [],
            orderInfo: finalData.orderInfo || null,
            requiresHuman: finalData.requiresHuman || false,
            quickReplies: finalData.quickReplies || [],
            kundali: finalData.kundali || null,
            timestamp: new Date().toISOString()
          };
          auraChatStore.upsertMessage(aiMsg, targetMode);
          setMessages((prev) => {
            if (currentTurnSeq !== turnSeqRef.current) return prev;
            const idx = prev.findIndex((m) => m.id === aiMsgId);
            if (idx >= 0) {
              const clone = [...prev];
              clone[idx] = aiMsg;
              return clone;
            }
            return [...prev, aiMsg];
          });
          setLoading(false);

          // Automatic background continuation when response appears cut off
          if (currentTurnSeq === turnSeqRef.current && isAuraResponseIncomplete(cleanText, targetMode)) {
            autoContinuationCountRef.current = 1;
            setTimeout(() => {
              if (currentTurnSeq === turnSeqRef.current) {
                handleContinueChat(aiMsg, 1, 10);
              }
            }, 300);
            return;
          }
          autoContinuationCountRef.current = 0;
          setStreamingMsgId((prev) => (prev === aiMsgId ? null : prev));
        },
        onError: (err) => {
          if (currentTurnSeq !== turnSeqRef.current) return;
          console.warn("Stream error in full-page Aura AI:", err);
          const fallbackText = "Namaste 🙏 Server se connect karne mein samasya aayi. Hamare live catalog ke sabhi Rudraksha lab-tested aur energized hain. Kripya punah prayas karein.";
          
          setMessages((prev) => {
            const idx = prev.findIndex((m) => m.id === aiMsgId);
            const existing = idx >= 0 ? prev[idx] : null;
            const hasStreamedText = Boolean(existing && existing.text && existing.text.trim().length > 0);
            if (!hasStreamedText) {
              setErrorOccurred(true);
            }
            const finalMsgText = hasStreamedText ? existing.text : fallbackText;
            const updatedMsg = {
              id: aiMsgId,
              sender: "ai",
              text: finalMsgText,
              requiresHuman: !hasStreamedText,
              timestamp: existing?.timestamp || new Date().toISOString()
            };
            auraChatStore.upsertMessage(updatedMsg, targetMode);
            if (idx >= 0) {
              const clone = [...prev];
              clone[idx] = updatedMsg;
              return clone;
            }
            return [...prev, updatedMsg];
          });
          setLoading(false);
          setStreamingMsgId((prev) => (prev === aiMsgId ? null : prev));
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        }
      });
    } catch (err) {
      if (currentTurnSeq !== turnSeqRef.current) return;
      setErrorOccurred(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      const fallbackText = "Namaste 🙏 Server se connect karne mein samasya aayi. Hamare live catalog ke sabhi Rudraksha lab-tested aur energized hain.";
      
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === aiMsgId);
        const existing = idx >= 0 ? prev[idx] : null;
        const finalMsgText = (existing && existing.text && existing.text.trim()) ? existing.text : fallbackText;
        const updatedMsg = {
          id: aiMsgId,
          sender: "ai",
          text: finalMsgText,
          requiresHuman: true,
          timestamp: existing?.timestamp || new Date().toISOString()
        };
        auraChatStore.upsertMessage(updatedMsg, targetMode);
        if (idx >= 0) {
          const clone = [...prev];
          clone[idx] = updatedMsg;
          return clone;
        }
        return [...prev, updatedMsg];
      });
    } finally {
      if (currentTurnSeq === turnSeqRef.current) {
        setLoading(false);
        setStreamingMsgId((prev) => (prev === aiMsgId && autoContinuationCountRef.current === 0 ? null : prev));
      }
    }
  };

  const handleContinueChat = async (targetMsg, autoPassNumber = 0, maxPasses = 10) => {
    if (!targetMsg) return;
    if (autoPassNumber === 0 && (loading || streamingMsgId === targetMsg.id) && activeAiMsgIdRef.current === targetMsg.id) {
      return;
    }
    const baseText = targetMsg.text || "";

    const prompt = "कृपया पिछले उत्तर को जहाँ से रुका था, वहीं से बिना कोई प्रारंभिक वाक्य या नमस्कार दोहराए आगे जारी रखें और पूरा करें। यदि उत्तर पहले ही पूर्ण हो चुका है, तो कुछ भी दोहराएं नहीं। (Please continue the rest of the answer seamlessly right from where it stopped without repeating any previous text).";

    auraAiClient.abortActiveStream();
    const currentTurnSeq = ++turnSeqRef.current;
    activeAiMsgIdRef.current = targetMsg.id;
    setStreamingMsgId(targetMsg.id);
    setActivePassCount(autoPassNumber + 1);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setLastUserQuery(prompt);
    setErrorOccurred(false);
    setStatusText(mode === "panditji" ? `🕉️ उत्तर का अगला भाग तैयार हो रहा है (${autoPassNumber + 1}/${maxPasses})...` : `🔍 Analyzing continuation (${autoPassNumber + 1}/${maxPasses})...`);
    setElapsedTime(0);
    setLoading(true);

    timerRef.current = setInterval(() => {
      setElapsedTime((prev) => {
        const next = prev + 1;
        if (!streamInitialized) {
          setStatusText(mode === "panditji" ? `🕉️ वैदिक गणना व विश्लेषण जारी है (${autoPassNumber + 1}/${maxPasses})...` : `🔍 Completing response (${autoPassNumber + 1}/${maxPasses})...`);
        }
        return next;
      });
    }, 1000);

    const aiMsgId = targetMsg.id;
    let streamInitialized = false;

    try {
      const currentUser = authClient.getUser();
      const userEmail = currentUser?.email || "";
      const userName = currentUser?.displayName || "Devotee";
      const currentStoreMsgs = auraChatStore.getMessages(mode);
      const effectiveHistory = [...currentStoreMsgs];
      const existingIdx = effectiveHistory.findIndex(m => m.id === targetMsg.id);
      if (existingIdx >= 0) {
        effectiveHistory[existingIdx] = targetMsg;
      } else {
        effectiveHistory.push(targetMsg);
      }

      await auraAiClient.sendMessageStream({
        message: prompt,
        conversationId,
        userEmail,
        userName,
        mode,
        cartItems: cart.lines || [],
        history: effectiveHistory.slice(-8),
        birthDetails: mode === "panditji" ? (activeBirthDetails || auraChatStore.getVerifiedBirthDetails()) : null,
        isContinuation: true,
        continuationTail: baseText.slice(-500),
        panditPreferences: mode === "panditji" ? panditPrefs : null,
        onStatus: (statusMsg) => {
          if (currentTurnSeq !== turnSeqRef.current) return;
          setStatusText(statusMsg);
        },
        onChunk: (delta, accumulated, partialData) => {
          if (currentTurnSeq !== turnSeqRef.current) return;
          const cleanAccumulated = customerSafeAiText(accumulated);
          if (!streamInitialized && cleanAccumulated.trim().length > 0) {
            streamInitialized = true;
            setLoading(false);
            setErrorOccurred(false);
          }
          setStatusText(mode === "panditji" ? `वैदिक परामर्श पूरा लिखा जा रहा है (${autoPassNumber + 1}/${maxPasses})...` : `Writing answer (${autoPassNumber + 1}/${maxPasses})...`);
          const merged = smartMergeContinuation(baseText, cleanAccumulated);
          setMessages((prev) => {
            if (currentTurnSeq !== turnSeqRef.current) return prev;
            const idx = prev.findIndex((m) => m.id === aiMsgId);
            const existing = idx >= 0 ? prev[idx] : null;
            const liveMsg = {
              ...(existing || targetMsg),
              id: aiMsgId,
              sender: "ai",
              text: merged,
              products: (partialData?.products && partialData.products.length > 0) ? partialData.products : (existing?.products || []),
              coupons: (partialData?.coupons && partialData.coupons.length > 0) ? partialData.coupons : (existing?.coupons || []),
              orderInfo: partialData?.orderInfo || existing?.orderInfo || null,
              requiresHuman: Boolean(partialData?.requiresHuman || existing?.requiresHuman),
              quickReplies: (partialData?.quickReplies && partialData.quickReplies.length > 0) ? partialData.quickReplies : (existing?.quickReplies || []),
              kundali: partialData?.kundali || existing?.kundali || targetMsg.kundali || null,
              timestamp: existing?.timestamp || new Date().toISOString()
            };
            if (idx >= 0) {
              const clone = [...prev];
              clone[idx] = liveMsg;
              return clone;
            }
            return [...prev, liveMsg];
          });
        },
        onDone: (finalData) => {
          if (currentTurnSeq !== turnSeqRef.current) return;
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          const cleanFinal = customerSafeAiText(finalData.text || "");
          const finalMerged = smartMergeContinuation(baseText, cleanFinal);
          const hasNewContent = finalMerged.length > baseText.length + 10;
          const aiMsg = {
            ...targetMsg,
            id: aiMsgId,
            sender: "ai",
            text: finalMerged,
            products: (finalData.products && finalData.products.length > 0) ? finalData.products : (targetMsg.products || []),
            coupons: (finalData.coupons && finalData.coupons.length > 0) ? finalData.coupons : (targetMsg.coupons || []),
            orderInfo: finalData.orderInfo || targetMsg.orderInfo || null,
            requiresHuman: finalData.requiresHuman || targetMsg.requiresHuman || false,
            quickReplies: (finalData.quickReplies && finalData.quickReplies.length > 0) ? finalData.quickReplies : (targetMsg.quickReplies || []),
            kundali: finalData.kundali || targetMsg.kundali || null,
            timestamp: new Date().toISOString()
          };
          auraChatStore.upsertMessage(aiMsg, mode);
          setMessages((prev) => {
            if (currentTurnSeq !== turnSeqRef.current) return prev;
            const idx = prev.findIndex((m) => m.id === aiMsgId);
            if (idx >= 0) {
              const clone = [...prev];
              clone[idx] = aiMsg;
              return clone;
            }
            return [...prev, aiMsg];
          });
          setLoading(false);

          // Automated background continuation: Continue up to 10 passes for big chats if still incomplete
          const nextPass = autoPassNumber + 1;
          const shouldContinue = hasNewContent && isAuraResponseIncomplete(finalMerged, mode) && nextPass < maxPasses;

          if (shouldContinue) {
            autoContinuationCountRef.current = nextPass;
            setTimeout(() => {
              if (currentTurnSeq === turnSeqRef.current) {
                handleContinueChat(aiMsg, nextPass, maxPasses);
              }
            }, 300);
          } else {
            autoContinuationCountRef.current = 0;
            setActivePassCount(0);
            setStreamingMsgId((prev) => (prev === aiMsgId ? null : prev));
            if (activeAiMsgIdRef.current === aiMsgId) {
              activeAiMsgIdRef.current = null;
            }
          }
        },
        onError: (err) => {
          if (currentTurnSeq !== turnSeqRef.current) return;
          console.warn("Continue stream notice in full-page:", err);
          setLoading(false);
          setActivePassCount(0);
          setStreamingMsgId((prev) => (prev === aiMsgId ? null : prev));
          if (activeAiMsgIdRef.current === aiMsgId) {
            activeAiMsgIdRef.current = null;
          }
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          if (!streamInitialized && autoPassNumber === 0) {
            emitToast("उत्तर पूरा करने में संपर्क त्रुटि, कृपया 'शुरू करें' बटन पर दोबारा क्लिक करें।", "info");
          }
        }
      });
    } catch (err) {
      if (currentTurnSeq !== turnSeqRef.current) return;
      setLoading(false);
      setActivePassCount(0);
      setStreamingMsgId((prev) => (prev === aiMsgId ? null : prev));
      if (activeAiMsgIdRef.current === aiMsgId) {
        activeAiMsgIdRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (autoPassNumber === 0) {
        emitToast("उत्तर पूरा करने में समस्या आई, कृपया पुनः प्रयास करें।", "error");
      }
    }
  };

  // Start a new chat session with smooth fade-out and fade-in transition
  const handleNewChat = () => {
    if (isRefreshing) return;
    auraAiClient.abortActiveStream();
    turnSeqRef.current++;
    activeAiMsgIdRef.current = null;
    setStreamingMsgId(null);
    setLoading(false);
    setErrorOccurred(false);
    setStatusText(mode === "panditji" ? "गणित व नक्षत्र गणना..." : "Thinking...");
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsRefreshing(true);
    setRefreshPhase("fading-out");
    setShowRefreshToast(true);

    setTimeout(() => {
      const { newConvId, messages: updatedMsgs } = auraChatStore.startNewSession(mode);
      setConversationId(newConvId);
      setMessages(updatedMsgs);
      setRefreshPhase("fading-in");

      setTimeout(() => {
        setIsRefreshing(false);
        setRefreshPhase("idle");
      }, 320);
    }, 180);

    setTimeout(() => {
      setShowRefreshToast(false);
    }, 1400);
  };

  const handleToggleFloatingButton = () => {
    const nextState = !isFloatingDismissed;
    auraChatStore.setFloatingDismissed(nextState);
    setIsFloatingDismissed(nextState);
  };

  const handleAddToCart = (product) => {
    cart.add(product.id, 1);
    setAddedItems(prev => ({ ...prev, [product.id]: true }));
    auraAiClient.trackAction({ conversationId, action: "cart", productId: product.id });
    setTimeout(() => {
      setAddedItems(prev => ({ ...prev, [product.id]: false }));
    }, 2500);
  };

  const handleApplyCoupon = (code) => {
    setAppliedCoupon(code);
    try {
      localStorage.setItem("aura_pending_coupon", code);
    } catch (_) {}
  };

  const handleChatOrderSuccess = (createdOrder, prod, meta) => {
    const confirmationMsg = {
      id: "ai_order_" + Date.now(),
      sender: "ai",
      text: `Namaste! 🙏 Your order for **${prod.name}** (x${meta.qty}) has been placed successfully!\n\n• **Order ID**: #${createdOrder.id || createdOrder.orderId}\n• **Total Amount**: ₹${(meta.finalAmount || 0).toLocaleString('en-IN')}\n• **Status**: Confirmed & Preparing for Vedic Energization\n• **Packaging**: Sacred Gangajal Consecrated Box\n\nA confirmation email and tracking updates have been sent to your registered contact. May Lord Shiva bless you! ✨`,
      orderInfo: {
        id: createdOrder.id || createdOrder.orderId,
        finalAmount: meta.finalAmount,
        status: "Confirmed",
        paymentStatus: createdOrder.paymentStatus || "Confirmed"
      },
      timestamp: new Date().toISOString()
    };
    const updated = auraChatStore.appendMessage(confirmationMsg);
    setMessages(updated);
  };

  // Voice to text using browser Speech Recognition
  const toggleVoice = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      emitToast("Voice recognition is not supported in this browser. Please type your message.", "info");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "hi-IN";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
      handleSend(transcript);
    };

    recognition.start();
  };

  const suggestedTopics = [
    { title: "Find by Zodiac / Rashi (राशि अनुसार)", prompt: "Meri rashi ke anusar kaun sa Rudraksha dharan karna chahiye?", icon: <Compass size={14} /> },
    { title: "Meditation & Jaap Mala (108 दाने)", prompt: "Daily mantra jaap ke liye 108 bead Siddh Rudraksha mala suggest karo", icon: <Flame size={14} /> },
    { title: "Under ₹1,000 Budget (किफायती)", prompt: "Mujhe ₹1000 ke andar best genuine Rudraksha dikhao", icon: <Tag size={14} /> },
    { title: "1 Mukhi Supreme Bead (एक मुखी)", prompt: "1 Mukhi Rudraksha ke spiritual benefits, vidhi aur price kya hai?", icon: <Sparkles size={14} /> },
    { title: "Today's Active Offers (कूपन कोड्स)", prompt: "Aaj ke active discount coupon codes aur offers batao", icon: <Tag size={14} /> },
    { title: "Track My Order (ऑर्डर ट्रैकिंग)", prompt: "Mera recent order status track karo", icon: <Package size={14} /> },
  ];

  return (
    <Shell>
      <div className="aura-ai-page-container">
        
        {/* Mobile Navigation Tabs */}
        <div className="aura-ai-mobile-tabs sm:hidden">
          <button 
            onClick={() => setMobileTab("chat")} 
            className={`aura-ai-mobile-tab ${mobileTab === "chat" ? "active" : ""}`}
          >
            <MessageSquare size={14} /> Consultation ({messages.filter(m => m.type !== "session_divider").length})
          </button>
          <button 
            onClick={() => setMobileTab("topics")} 
            className={`aura-ai-mobile-tab ${mobileTab === "topics" ? "active" : ""}`}
          >
            <BookOpen size={14} /> Vedic Topics
          </button>
          <button 
            onClick={() => setMobileTab("deals")} 
            className={`aura-ai-mobile-tab ${mobileTab === "deals" ? "active" : ""}`}
          >
            <Tag size={14} /> Offers & Cart ({cart.count})
          </button>
        </div>

        {/* 3-Column Luxury Layout */}
        <div className={`aura-ai-grid ${isExpanded ? "aura-ai-grid-expanded" : ""}`}>
          
          {/* Left Column: Vedic Identity, Topics & History */}
          {!isExpanded && (
            <div className={`aura-ai-sidebar-left ${mobileTab !== "topics" ? "hidden-mobile" : ""}`}>
              {/* Spiritual Brand Profile Card */}
              <div className="aura-ai-card aura-ai-profile-card">
                <div className="aura-ai-profile-header">
                  <div className="aura-ai-profile-avatar">
                    <Sparkles size={16} className="aura-ai-profile-sparkle" />
                  </div>
                  <div>
                    <h3 className="aura-ai-profile-name">Aura AI</h3>
                    <div className="aura-ai-profile-sub">Sacred Vedic Guide</div>
                  </div>
                </div>
                <p className="aura-ai-profile-desc">
                  Dedicated spiritual shopping assistant trained on sacred scriptures, Mukhi benefits, lab-certification, and real store stock.
                </p>
                <div className="aura-ai-profile-tags">
                  <span>✓ 100% Lab Tested & Certified Data</span>
                  <span>✓ Hindi & English Support</span>
                  <span>✓ Direct 1-Click Cart Addition</span>
                </div>
              </div>

              {/* Popular Consultations */}
              <div className="aura-ai-card">
                <h4 className="aura-ai-card-title">Popular Consultations</h4>
                <div className="aura-ai-topics-list">
                  {suggestedTopics.map((t, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(t.prompt)}
                      className="aura-ai-topic-item"
                    >
                      <span className="aura-ai-topic-icon">{t.icon}</span>
                      <span className="aura-ai-topic-text">{t.title}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Management & Floating Controls */}
              <div className="aura-ai-card aura-ai-history-card">
                <div className="aura-ai-history-header">
                  <h4 className="aura-ai-card-title" style={{ margin: 0 }}>Chat Controls</h4>
                  <button onClick={handleNewChat} className="aura-ai-action-btn" title="New Chat (History preserved)">
                    <RotateCcw size={12} /> New Chat
                  </button>
                </div>

                {/* Saved Kundalis & History buttons */}
                <div className="grid grid-cols-2 gap-1.5 mt-2.5">
                  <button
                    type="button"
                    onClick={() => setShowSavedKundaliModal(true)}
                    className="aura-pandit-ctrl-btn"
                    title="Manage Saved Kundalis"
                  >
                    <Bookmark size={12} /> <span>Saved Kundalis</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowChatHistoryModal(true)}
                    className="aura-pandit-ctrl-btn"
                    title="Past Chat Sessions"
                  >
                    <History size={12} /> <span>History</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setVedicToolsTab("milan");
                    setShowVedicToolsModal(true);
                  }}
                  className="aura-pandit-ctrl-btn aura-pandit-ctrl-btn-primary w-full mt-1.5"
                  title="कुंडली मिलान, अंक ज्योतिष, आज का पंचांग व 1-21 मुखी रुद्राक्ष विश्वकोश"
                >
                  <Compass size={13} /> <span>वैदिक टूल्स (मिलान · अंक · पंचांग)</span>
                </button>

                {/* Floating icon toggle */}
                <div className="mt-2.5 pt-2.5 border-t border-[#E9D9C5]">
                  <div className="text-[12px] text-[#542B19] mb-1.5 font-semibold">
                    Floating AI Button Status:
                  </div>
                  <button 
                    onClick={handleToggleFloatingButton}
                    className="aura-ai-action-btn w-full justify-center py-1.5"
                  >
                    {isFloatingDismissed ? (
                      <><Sparkles size={12} /> Unhide Floating Icon (Show on all pages)</>
                    ) : (
                      <><EyeOff size={12} /> Hide Floating Icon (from all pages)</>
                    )}
                  </button>
                </div>

                <div className="aura-ai-privacy-badge mt-2.5">
                  <ShieldCheck size={12} />
                  <span>All chat history is safe and stored permanently on your device.</span>
                </div>
              </div>
            </div>
          )}

          {/* Center Column: Interactive Conversational Stream */}
          <div className={`aura-ai-main-chat ${isExpanded ? "aura-ai-main-chat-expanded" : ""} ${mobileTab !== "chat" ? "hidden-mobile" : ""}`} style={{ position: "relative" }}>
            {/* PART 1 – COMMON HEADER */}
            <div className={`aura-ai-chat-topbar ${mode === "panditji" ? "is-panditji" : ""}`}>
              <div className="aura-ai-header-left">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="aura-ai-header-back-btn"
                  title="वापस जाएं (Back)"
                  aria-label="Back"
                >
                  <ChevronLeft size={14} strokeWidth={2.3} />
                  <span className="aura-ai-back-text">वापस</span>
                </button>

                <div className={`aura-ai-avatar ${mode === "panditji" ? "aura-ai-avatar-panditji" : ""}`}>
                  {mode === "panditji" ? (
                    <span className="text-[13px] font-bold leading-none">ॐ</span>
                  ) : (
                    <Sparkles size={13} strokeWidth={2.2} />
                  )}
                </div>

                <div className="aura-ai-header-info">
                  <div className="aura-ai-title">
                    <span>{mode === "panditji" ? "AI Panditji" : "Aura AI"}</span>
                    <span className={`aura-ai-badge ${mode === "panditji" ? "aura-ai-badge-panditji" : ""}`}>
                      {mode === "panditji" ? "Vedic Astrology" : "Quick AI"}
                    </span>
                  </div>
                  <div className="aura-ai-status">
                    <span className="aura-ai-online-dot" />
                    <span>Online • Hindi & English</span>
                  </div>
                </div>
              </div>

              {/* Common Header Actions: History, Bookmark, Expand, Reset, Cart, Close */}
              <div className="aura-ai-header-actions" role="toolbar" aria-label="Aura AI Common Controls">
                <button
                  type="button"
                  onClick={() => setShowChatHistoryModal(true)}
                  className="aura-ai-btn-icon"
                  title="पुरानी चैट व इतिहास (History)"
                  aria-label="History"
                >
                  <History size={13} strokeWidth={2.1} />
                </button>

                <button
                  type="button"
                  onClick={() => setShowSavedKundaliModal(true)}
                  className="aura-ai-btn-icon"
                  title="सुरक्षित कुंडलियां (Bookmarks)"
                  aria-label="Bookmark"
                >
                  <Bookmark size={13} strokeWidth={2.1} />
                </button>

                <button
                  type="button"
                  onClick={() => setIsExpanded((prev) => !prev)}
                  className="aura-ai-btn-icon hidden md:inline-flex"
                  title={isExpanded ? "Restore 3-column view" : "Expand chat area"}
                  aria-label={isExpanded ? "Collapse" : "Expand"}
                >
                  {isExpanded ? <Minimize2 size={13} strokeWidth={2.1} /> : <Maximize2 size={13} strokeWidth={2.1} />}
                </button>

                <button
                  type="button"
                  onClick={handleNewChat}
                  className={`aura-ai-btn-icon aura-ai-btn-newchat ${isRefreshing ? "aura-ai-btn-refreshing" : ""}`}
                  title="Reset / New Chat Session"
                  aria-label="Reset Chat"
                  disabled={isRefreshing}
                >
                  <RotateCcw size={13} strokeWidth={2.1} />
                </button>

                <Link
                  to="/cart"
                  className="aura-ai-btn-icon aura-ai-cart-action-btn"
                  title={`Shopping Cart (${cart.count} item${cart.count === 1 ? "" : "s"})`}
                  aria-label={`Shopping Cart with ${cart.count} items`}
                >
                  <ShoppingCart size={13} strokeWidth={2.1} />
                  {cart.count > 0 && (
                    <span className="aura-ai-action-cart-badge" aria-hidden="true">
                      {cart.count > 9 ? "9+" : cart.count}
                    </span>
                  )}
                </Link>

                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="aura-ai-btn-icon aura-ai-btn-close"
                  title="होमपेज पर जाएं (Close)"
                  aria-label="Close"
                >
                  <X size={14} strokeWidth={2.2} />
                </button>
              </div>
            </div>

            {/* Smooth Mode Selector Bar */}
            <div className="aura-ai-mode-bar" role="tablist" aria-label="AI Mode">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "standard"}
                onClick={() => setMode("standard")}
                className={`aura-ai-mode-btn ${mode === "standard" ? "active" : ""}`}
              >
                <span className="aura-ai-mode-btn-label">
                  <Sparkles size={12} strokeWidth={2.1} /> Quick AI
                </span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "panditji"}
                onClick={() => setMode("panditji")}
                className={`aura-ai-mode-btn ${mode === "panditji" ? "active" : ""}`}
              >
                <span className="aura-ai-mode-btn-label">
                  <span>ॐ</span> AI Panditji
                </span>
              </button>
            </div>

            {/* Mode-Specific Controls */}
            {mode === "standard" ? (
              <AuraCommandDock
                scope="page"
                mode={mode}
                onSwitchMode={(nextMode) => setMode(nextMode)}
                conversationId={conversationId}
                savedSessions={savedPanditSessions}
                onNewChat={handleNewChat}
                onSelectSession={(sessId) => {
                  auraAiClient.abortActiveStream();
                  turnSeqRef.current++;
                  setLoading(false);
                  const switched = auraChatStore.switchToSession(sessId, "panditji");
                  if (switched) {
                    setConversationId(switched.conversationId);
                    setMessages(switched.messages);
                    setSavedPanditSessions(auraChatStore.getSavedSessions("panditji"));
                  }
                }}
                onOpenHistory={() => setShowChatHistoryModal(true)}
                activeBirthDetails={activeBirthDetails}
                showBirthForm={showBirthForm}
                onToggleBirthForm={() => setShowBirthForm((prev) => !prev)}
                onEditBirthDetails={() => {
                  if (activeBirthDetails) {
                    setBirthForm({
                      name: activeBirthDetails.name || "",
                      dob: activeBirthDetails.dob || "",
                      time: activeBirthDetails.birthTime || "",
                      place: activeBirthDetails.birthPlace || "",
                      concern: activeBirthDetails.concern || "career"
                    });
                  }
                  setShowBirthForm(true);
                }}
                onClearBirthDetails={() => {
                  auraChatStore.clearActiveBirthDetails();
                  setActiveBirthDetails(null);
                  emitToast("सक्रिय कुंडली हटा दी गई", "info");
                }}
                onOpenSavedKundalis={() => setShowSavedKundaliModal(true)}
                panditPrefs={panditPrefs}
                onChangePanditPref={handlePanditPrefChange}
                onOpenVedicTool={(tabId) => {
                  setVedicToolsTab(tabId || "milan");
                  setShowVedicToolsModal(true);
                }}
                onSendQuickPrompt={(q) => handleSend(q)}
                dynamicSuggestions={suggestedTopics.slice(0, 4).map((t) => ({ label: t.title, query: t.prompt }))}
              />
            ) : (
              <div className="aura-pandit-top-area">
                <AuraPanditWorkspacePanel
                  conversationId={conversationId}
                  savedSessions={savedPanditSessions}
                  onNewChat={() => {
                    auraAiClient.abortActiveStream();
                    turnSeqRef.current++;
                    setLoading(false);
                    const { newConvId, messages: fresh } = auraChatStore.startNewSession("panditji");
                    setConversationId(newConvId);
                    setMessages(fresh);
                    setSavedPanditSessions(auraChatStore.getSavedSessions("panditji"));
                    emitToast("नया पंडित जी चैट बन गया", "success");
                  }}
                  onSelectSession={(sessId) => {
                    auraAiClient.abortActiveStream();
                    turnSeqRef.current++;
                    setLoading(false);
                    const switched = auraChatStore.switchToSession(sessId, "panditji");
                    if (switched) {
                      setConversationId(switched.conversationId);
                      setMessages(switched.messages);
                      setSavedPanditSessions(auraChatStore.getSavedSessions("panditji"));
                    }
                  }}
                  onToggleBirthForm={() => setShowBirthForm((prev) => !prev)}
                  onOpenSavedKundalis={() => setShowSavedKundaliModal(true)}
                  onOpenHistory={() => setShowChatHistoryModal(true)}
                  onSendQuickPrompt={(q) => handleSend(q)}
                  panditPrefs={panditPrefs}
                  onChangePanditPref={handlePanditPrefChange}
                  onOpenVedicTool={(tabId) => {
                    setVedicToolsTab(tabId || "milan");
                    setShowVedicToolsModal(true);
                  }}
                  onOpenVedicTools={(tabId) => {
                    setVedicToolsTab(tabId || "milan");
                    setShowVedicToolsModal(true);
                  }}
                />

                <AuraActiveKundaliCard
                  activeBirthDetails={activeBirthDetails}
                  onEdit={() => {
                    if (activeBirthDetails) {
                      setBirthForm({
                        name: activeBirthDetails.name || "",
                        dob: activeBirthDetails.dob || "",
                        time: activeBirthDetails.birthTime || "",
                        place: activeBirthDetails.birthPlace || "",
                        concern: activeBirthDetails.concern || "career"
                      });
                    }
                    setShowBirthForm(true);
                  }}
                  onDelete={() => {
                    auraChatStore.clearActiveBirthDetails();
                    setActiveBirthDetails(null);
                    emitToast("सक्रिय कुंडली हटा दी गई", "info");
                  }}
                />
              </div>
            )}

            {/* Interactive Kundli Birth Details Form Card */}
            {showBirthForm && (
              <div className="aura-birth-form-drawer aura-gpu-slide-in">
                  <div className="aura-birth-form-head">
                    <div className="aura-birth-form-title">
                      <span>ॐ</span>
                      <span>पंडित जी हेतु जन्म विवरण (Vedic Birth Details)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowBirthForm(false)}
                      className="aura-birth-form-close"
                    >
                      ✕ बंद करें
                    </button>
                  </div>

                  <form onSubmit={handleBirthFormSubmit} className="space-y-2">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <label className="aura-birth-form-label">आपका नाम *</label>
                        <input
                          type="text"
                          required
                          placeholder="उदा. राहुल शर्मा"
                          value={birthForm.name}
                          onChange={(e) => setBirthForm({ ...birthForm, name: e.target.value })}
                          className="aura-birth-form-input"
                        />
                      </div>
                      <div>
                        <label className="aura-birth-form-label">जन्म तिथि (DOB) *</label>
                        <input
                          type="date"
                          required
                          value={birthForm.dob}
                          onChange={(e) => setBirthForm({ ...birthForm, dob: e.target.value })}
                          className="aura-birth-form-input"
                        />
                      </div>
                      <div>
                        <label className="aura-birth-form-label">जन्म समय *</label>
                        <input
                          type="time"
                          required
                          value={birthForm.time}
                          onChange={(e) => setBirthForm({ ...birthForm, time: e.target.value })}
                          className="aura-birth-form-input"
                        />
                      </div>
                      <div>
                        <label className="aura-birth-form-label">जन्म स्थान (City) *</label>
                        <input
                          type="text"
                          required
                          placeholder="उदा. जयपुर"
                          value={birthForm.place}
                          onChange={(e) => setBirthForm({ ...birthForm, place: e.target.value })}
                          className="aura-birth-form-input"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                      <select
                        value={birthForm.concern}
                        onChange={(e) => setBirthForm({ ...birthForm, concern: e.target.value })}
                        className="aura-birth-form-input flex-1"
                      >
                        <option value="all">🌟 संपूर्ण जीवन मार्गदर्शन (All Concerns)</option>
                        <option value="career">⚡ नौकरी, पदोन्नति व व्यवसाय (Career)</option>
                        <option value="finance">💰 धन समृद्धि व ऋण मुक्ति (Wealth)</option>
                        <option value="marriage">❤️ विवाह व दांपत्य सुख (Marriage)</option>
                        <option value="health">🩺 स्वास्थ्य व दीर्घायु (Health)</option>
                        <option value="peace">🧘 मानसिक शांति व एकाग्रता (Peace)</option>
                        <option value="shani_dosha">🛡️ शनि साढ़े साती व ग्रह दोष (Dosha Shanti)</option>
                        <option value="spiritual">🕉️ आध्यात्मिक उन्नति (Spiritual)</option>
                      </select>
                      <button
                        type="submit"
                        className="aura-birth-form-submit sm:w-auto px-4 whitespace-nowrap"
                      >
                        पंडित जी को कुंडली भेजें
                      </button>
                    </div>
                  </form>
              </div>
            )}

            {/* Refresh Toast Banner */}
            {showRefreshToast && (
              <div className="aura-ai-refresh-toast aura-gpu-slide-in" style={{ top: '65px' }}>
                <Sparkles size={13} className="aura-refresh-spinner" />
                <span>Nayi Vedic Consultation shuru ho rahi hai...</span>
              </div>
            )}

            {/* Messages Thread with Full History Display & Smooth Refresh Transitions */}
            <div 
              className={`aura-ai-page-messages ${
                refreshPhase === "fading-out" 
                  ? "aura-ai-refresh-fading-out" 
                  : refreshPhase === "fading-in" 
                  ? "aura-ai-refresh-fading-in" 
                  : ""
              }`} 
              ref={chatScrollContainerRef}
              onScroll={handleScroll}
              onWheel={handleWheel}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
            >
              {messages.map((m, index) => {
                // Session divider
                if (m.type === "session_divider") {
                  return (
                    <div key={m.id || index} className="aura-ai-page-session-divider">
                      <div className="aura-ai-page-session-divider-line" />
                      <span className="aura-ai-page-session-divider-label">
                        <Sparkles size={12} /> {m.text || "Nayi Consultation Shuru Hui"}
                      </span>
                      <div className="aura-ai-page-session-divider-line" />
                    </div>
                  );
                }

                // Dynamic Date Header Logic
                const currentDateGroup = getDateDividerLabel(m.timestamp);
                const prevDateGroup = index > 0 && messages[index - 1].type !== "session_divider"
                  ? getDateDividerLabel(messages[index - 1].timestamp)
                  : null;
                const showDateDivider = index === 0 || (prevDateGroup !== null && currentDateGroup !== prevDateGroup);
                const timeString = formatMessageTime(m.timestamp);

                return (
                  <React.Fragment key={m.id || index}>
                    {showDateDivider && (
                      <div className="aura-ai-page-date-divider">
                        <span>{currentDateGroup}</span>
                      </div>
                    )}

                    <div 
                      id={m.id} 
                      className={`aura-ai-page-msg ${m.sender === "user" ? "user-msg" : "ai-msg"}`}
                    >
                      {m.sender === "ai" && (
                        <div className="aura-ai-page-msg-avatar">
                          {mode === "panditji" ? <span className="text-[12px] font-bold leading-none">ॐ</span> : <Sparkles size={14} />}
                        </div>
                      )}
                      <div className="aura-ai-page-msg-bubble">
                        {(() => {
                          const isWelcomeMsg = m.sender === "ai" && (
                            m.id?.startsWith("init_welcome") ||
                            m.id?.startsWith("init_standard_") ||
                            m.id?.startsWith("init_panditji_")
                          );
                          if (mode === "standard" && isWelcomeMsg) {
                            return (
                              <AuraQuickAiAssistantCard
                                onSendPrompt={(q) => handleSend(q)}
                              />
                            );
                          }
                          return (
                            <>
                              <div className="aura-ai-page-text">
                                {!m.text && m.sender === "ai" ? (
                                  <div className="aura-ai-inline-thinking">
                                    <Sparkles size={14} className="text-[#C69A45]" />
                                    <span>विश्लेषण चल रहा है (Thinking...)...</span>
                                  </div>
                                ) : (
                                  <AuraAIMessageContent 
                                    text={customerSafeAiText(stripAuraKeywords(m.text))} 
                                    sender={m.sender} 
                                    fullKundaliData={m.kundali}
                                    birthData={m.kundali?.verifiedBirthData}
                                    products={m.products}
                                    defaultChartStyle={mode === "panditji" ? panditPrefs.chartStyle : "auto"}
                                  />
                                )}
                              </div>
                              {m.sender === "ai" && m.text && (
                                <div className="aura-ai-voice-row">
                                  <VoiceReader text={customerSafeAiText(stripAuraKeywords(m.text))} />
                                </div>
                              )}
                              {mode === "panditji" && isWelcomeMsg && (
                                <div className="aura-pandit-quick-topics" role="group" aria-label="ज्योतिष मुख्य विषय">
                                  {PANDIT_ASTROLOGY_QUICK_TOPICS.map((topic) => (
                                    <button
                                      key={topic.label}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSend(topic.query);
                                      }}
                                      className="aura-pandit-topic-chip"
                                    >
                                      {topic.label}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </>
                          );
                        })()}

                        {/* Product Recommendation Cards (Part 3 F) */}
                        {m.products && m.products.length > 0 && (
                          <div className="aura-ai-inline-prods">
                            <div className="aura-ai-inline-title">
                              <Sparkles size={14} /> 
                              <span>सिद्ध रुद्राक्ष व उत्पाद (Lab Certified & Energized)</span>
                            </div>
                            <div className="aura-ai-prods-grid">
                              {m.products.filter(p => p && typeof p === "object").slice(0, 6).map((p, pIdx) => {
                                const pId = p.id || p._id || p.slug || `prod-${pIdx}`;
                                return (
                                  <AuraProductRecCard
                                    key={pId}
                                    product={p}
                                    isAdded={Boolean(addedItems[pId])}
                                    variant="page"
                                    onBuy={(prod) => setOrderModalProduct(prod)}
                                    onAddToCart={(prod) => handleAddToCart(prod)}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Coupons Box */}
                        {m.coupons && m.coupons.length > 0 && (
                          <div className="aura-ai-page-coupons">
                            {m.coupons.map((c, ci) => (
                              <div key={ci} className="aura-ai-page-coupon-card">
                                <div className="aura-ai-coupon-details">
                                  <Tag size={15} className="aura-ai-tag-icon" />
                                  <div>
                                    <span className="aura-ai-coupon-title">{c.code}</span>
                                    <span className="aura-ai-coupon-subtitle">
                                      {c.type === "percentage" ? `${c.discount}% OFF on all items` : `Flat ₹${c.discount} OFF instant discount`}
                                    </span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleApplyCoupon(c.code)}
                                  className={`aura-ai-coupon-apply-btn ${appliedCoupon === c.code ? "applied" : ""}`}
                                >
                                  {appliedCoupon === c.code ? "Applied ✓" : "Apply Coupon"}
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Order Details Tracking Widget */}
                        {m.orderInfo && (
                          <div className="aura-ai-page-order-box">
                            <div className="aura-ai-order-top">
                              <Package size={15} />
                              <div>
                                <strong>Order #{m.orderInfo.id || m.orderInfo.orderId}</strong>
                                <div className="aura-ai-order-placed-date">Placed: {new Date().toLocaleDateString('en-IN')}</div>
                              </div>
                              <span className="aura-ai-order-status-pill">{m.orderInfo.status || "In Transit"}</span>
                            </div>
                            <div className="aura-ai-order-steps">
                              <div className="step done"><Check size={11} /> Confirmed</div>
                              <div className="step done"><Check size={11} /> Packed</div>
                              <div className="step active">→ Shipped</div>
                              <div className="step">Out for Delivery</div>
                            </div>
                            <div className="aura-ai-order-bottom">
                              <span>Total: <b>₹{m.orderInfo.finalAmount || m.orderInfo.total}</b></span>
                              <Link to="/account/orders" className="aura-ai-view-order-btn">
                                View in My Orders <ChevronRight size={13} />
                              </Link>
                            </div>
                          </div>
                        )}

                        {/* Human Support Escalation */}
                        {m.requiresHuman && (
                          <div className="aura-ai-page-support-card">
                            <div className="support-header">
                              <PhoneCall size={15} />
                              <div>
                                <strong>Connect with Human Rudraksha Consultant</strong>
                                <p>Our Vedic experts are available to guide you personally.</p>
                              </div>
                            </div>
                            <div className="support-actions">
                              <a
                                href="https://wa.me/919672996531?text=Namaste,%20I%20need%20expert%20help%20with%20Aura%20Rudraksha"
                                target="_blank"
                                rel="noreferrer"
                                className="support-wa-btn"
                              >
                                Chat on WhatsApp (+91 9672996531)
                              </a>
                              <a href="tel:+919672996531" className="support-call-btn">
                                Call Us Now
                              </a>
                            </div>
                          </div>
                        )}

                        {/* Quick Suggestion Chips (non-welcome Quick AI turns) */}
                        {!(mode === "standard" && (m.id?.startsWith("init_welcome") || m.id?.startsWith("init_standard_"))) &&
                          index === messages.length - 1 &&
                          m.quickReplies &&
                          m.quickReplies.length > 0 && (
                          <div className="aura-ai-page-chips">
                            {m.quickReplies.map((q, qi) => (
                              <button
                                key={qi}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSend(q);
                                }}
                                className="aura-ai-page-chip"
                              >
                                {q}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Part 2 D & Part 3 H: Expandable Suggested Actions Accordion */}
                        {m.sender === "ai" && (
                          <AuraSuggestedActionsAccordion
                            mode={mode}
                            parsedKeywords={parseAuraKeywords(m.text || "")}
                            canonicalMukhi={m.kundali?.rudrakshaRecommendations?.[0]?.mukhi || m.kundali?.recommendedMukhi || null}
                            isLatest={index === messages.length - 1}
                            isWelcome={Boolean(m.id?.startsWith("init_welcome") || m.id?.startsWith("init_standard_") || m.id?.startsWith("init_panditji_"))}
                            loading={loading}
                            onSelectSuggestion={(kw) => handleSend(kw)}
                          />
                        )}

                        {/* Part 2 E & Part 3 I: Bottom Actions (Start/Continue, Copy, Share, Timestamp) */}
                        <div className="aura-ai-msg-actions-bar">
                          {timeString && (
                            <span className="aura-ai-page-msg-time">
                              {timeString}
                            </span>
                          )}

                          {m.sender === "ai" && (
                            <div className="aura-ai-msg-action-group">
                              {(() => {
                                const isThisStreaming = streamingMsgId === m.id;
                                const isIncomplete = !isThisStreaming && isAuraResponseIncomplete(m.text, mode);
                                const isThisContinuing = isThisStreaming || (loading && activeAiMsgIdRef.current === m.id);
                                const isWelcomeMsg = Boolean(m.id?.startsWith("init_welcome") || m.id?.startsWith("init_standard_") || m.id?.startsWith("init_panditji_"));
                                const buttonLabel = isThisContinuing
                                  ? (activePassCount > 0 ? `जारी है (${activePassCount}/10)...` : "लिखा जा रहा है...")
                                  : mode === "panditji"
                                    ? "शुरू करें (आगे पूरा करें)"
                                    : "Start / Continue";

                                return (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (isThisContinuing) return;
                                      if (isIncomplete) {
                                        handleContinueChat(m, 0, 10);
                                      } else if (isWelcomeMsg) {
                                        textareaRef.current?.focus();
                                      } else {
                                        handleSend("कृपया इसी विषय पर और विस्तार से उदाहरण व विशेष मार्गदर्शन बताएं।");
                                      }
                                    }}
                                    disabled={isThisContinuing}
                                    className={`aura-ai-msg-action-btn aura-ai-msg-action-continue ${isThisContinuing ? "is-busy" : ""}`}
                                    title="उत्तर जहाँ से रुका है, वहीं से आगे पूरा करें"
                                  >
                                    <Sparkles size={11} strokeWidth={2.2} />
                                    <span>{buttonLabel}</span>
                                  </button>
                                );
                              })()}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  auraChatStore.copyChatToClipboard([m]);
                                  emitToast("उत्तर कॉपी हो गया (Copied)", "success");
                                }}
                                className="aura-ai-msg-action-btn"
                                title="उत्तर कॉपी करें (Copy)"
                              >
                                <Copy size={11} strokeWidth={2.1} />
                                <span>कॉपी</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  auraChatStore.shareChatOnWhatsApp([m]);
                                }}
                                className="aura-ai-msg-action-btn aura-ai-msg-action-share"
                                title="WhatsApp पर शेयर करें (Share)"
                              >
                                <Share2 size={11} strokeWidth={2.1} />
                                <span>शेयर</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}

              {loading && (
                <div className="aura-ai-page-msg ai-msg">
                  <div className="aura-ai-page-msg-avatar">
                    {mode === "panditji" ? <span className="text-[12px] font-bold leading-none">ॐ</span> : <Sparkles size={14} />}
                  </div>
                  <div className="flex flex-col gap-1.5 items-start">
                    <div className="aura-ai-typing-bubble">
                      <span className="dot" />
                      <span className="dot" />
                      <span className="dot" />
                      <span className="text-[12px] text-[#542B19] font-semibold ml-1">
                        {statusText || "विश्लेषण व गणना जारी है..."}
                      </span>
                      {elapsedTime > 0 && (
                        <span className="text-[11px] text-[#887565] tabular-nums ml-1">
                          ({elapsedTime}s)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Smart Jump to Latest Button */}
            {showJumpToBottom && (
              <button
                type="button"
                onClick={() => {
                  userHasScrolledUpRef.current = false;
                  setShowJumpToBottom(false);
                  if (chatScrollContainerRef.current) {
                    chatScrollContainerRef.current.scrollTo({ top: chatScrollContainerRef.current.scrollHeight, behavior: "smooth" });
                  }
                }}
                className="aura-ai-jump-bottom-btn"
              >
                <ArrowDown size={12} />
                <span>Jump to latest</span>
              </button>
            )}

            {/* Input Bar */}
            <div className="aura-ai-page-input-area">
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleSend();
                }}
                className="aura-ai-page-form"
              >
                <button
                  type="button"
                  onClick={toggleVoice}
                  className={`aura-ai-voice-btn ${isListening ? "listening" : ""}`}
                  title={isListening ? "Listening... Speak now" : "Voice input (Hindi/English)"}
                >
                  {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => {
                    setInput(e.target.value);
                    if (errorOccurred) setErrorOccurred(false);
                  }}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={mode === "panditji" ? "Poochiye Panditji se — Rashi, Rudraksha, Dharan Vidhi..." : "Apna sawaal likhein — jaise '5 Mukhi Rudraksha ke benefits' ya 'Budget under 1000'..."}
                  rows={1}
                  className="aura-ai-page-input aura-ai-textarea"
                />
                {loading && !input.trim() ? (
                  <button
                    type="button"
                    onClick={() => {
                      auraAiClient.abortActiveStream();
                      turnSeqRef.current++;
                      setLoading(false);
                      setErrorOccurred(false);
                      setStatusText("Stopped");
                      if (timerRef.current) {
                        clearInterval(timerRef.current);
                        timerRef.current = null;
                      }
                    }}
                    className="aura-ai-page-send animate-pulse"
                    style={{ background: "#c62828", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}
                    aria-label="Stop generation"
                    title="Stop generation"
                  >
                    <span style={{ width: "8px", height: "8px", background: "white", borderRadius: "1px", display: "block" }} />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="aura-ai-page-send"
                    aria-label="Send query"
                  >
                    <Send size={15} />
                  </button>
                )}
              </form>
              {errorOccurred && lastUserQuery && (
                <div className="aura-ai-retry-banner" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", padding: "6px 12px", background: "#fef2f2", borderTop: "1px solid #fee2e2", borderBottom: "1px solid #fee2e2", fontSize: "11px", color: "#991b1b" }}>
                  <span>An error occurred. Would you like to retry?</span>
                  <button
                    type="button"
                    onClick={() => handleSend(lastUserQuery)}
                    className="aura-ai-retry-btn"
                    style={{ padding: "3px 8px", background: "#dc2626", color: "white", fontWeight: "600", borderRadius: "4px", fontSize: "10.5px", cursor: "pointer" }}
                  >
                    Retry
                  </button>
                </div>
              )}
              <div className="aura-ai-input-footer-note">
                <ShieldCheck size={12} />
                <span>Aura AI uses real database knowledge. Sensitive personal credentials (PIN/OTP/Card) are never requested.</span>
              </div>
            </div>
          </div>

          {/* Right Column: Live Recommendations, Offers & Quick Cart */}
          <div className={`aura-ai-sidebar-right ${mobileTab !== "deals" ? "hidden-mobile" : ""}`}>
            {/* Live Cart Snapshot */}
            <div className="aura-ai-card">
              <div className="aura-ai-cart-summary-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShoppingCart size={15} />
                  <h4 style={{ margin: 0, fontSize: '14px' }}>Shopping Cart</h4>
                </div>
                <span className="aura-ai-cart-count-badge">{cart.count} items</span>
              </div>

              {cart.count > 0 ? (
                <div className="aura-ai-cart-preview">
                  <p className="aura-ai-cart-text">You have {cart.count} item(s) selected in your divine cart.</p>
                  <Link to="/cart" className="aura-ai-checkout-link">
                    Proceed to Cart & Checkout <ChevronRight size={13} />
                  </Link>
                </div>
              ) : (
                <p className="aura-ai-cart-empty-text">Your cart is empty. Ask Aura AI for energized recommendations!</p>
              )}

              <div className="aura-ai-free-shipping-strip">
                🚚 <b>Free Shipping</b> on all orders above ₹1,499 across India.
              </div>
            </div>

            {/* Active Verified Offers */}
            <div className="aura-ai-card">
              <h4 className="aura-ai-card-title">Active Coupons</h4>
              <div className="aura-ai-sidebar-coupons">
                {activeOffers.map((c, i) => (
                  <div key={i} className="aura-ai-sidebar-coupon-item">
                    <div>
                      <span className="coupon-code-pill">{c.code}</span>
                      <span className="coupon-desc-text">
                        {c.type === "percentage" ? `${c.discount}% OFF` : `Flat ₹${c.discount} OFF`}
                      </span>
                    </div>
                    <button
                      onClick={() => handleApplyCoupon(c.code)}
                      className={`coupon-copy-btn ${appliedCoupon === c.code ? "applied" : ""}`}
                    >
                      {appliedCoupon === c.code ? "Applied" : "Apply"}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Best Sellers in Store */}
            <div className="aura-ai-card">
              <h4 className="aura-ai-card-title">Featured Sacred Items</h4>
              <div className="aura-ai-sidebar-prods">
                {featuredProducts.slice(0, 4).map(p => {
                  const realImg = getProductPrimaryImage(p);
                  return (
                  <div key={p.id} className="aura-ai-sidebar-prod-row">
                    <img
                      src={realImg}
                      alt={p.name}
                      className="aura-ai-sidebar-prod-thumb"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      onError={(e) => { if (!e.target.src.includes("product-5mukhi.jpg")) e.target.src = "/images/placeholder.svg"; }}
                    />
                    <div className="aura-ai-sidebar-prod-info">
                      <div className="aura-ai-sidebar-prod-name">{p.name}</div>
                      <div className="aura-ai-sidebar-prod-price">₹{Number(p.price).toLocaleString('en-IN')}</div>
                    </div>
                    <button
                      onClick={() => handleAddToCart(p)}
                      className="aura-ai-sidebar-add-btn"
                      title="Add to Cart"
                    >
                      <ShoppingCart size={12} />
                    </button>
                  </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* In-Chat Instant Order Modal */}
      {orderModalProduct && (
        <AuraAIChatOrderModal
          product={orderModalProduct}
          isOpen={!!orderModalProduct}
          prefilledCoupon={appliedCoupon}
          onClose={() => setOrderModalProduct(null)}
          onOrderSuccess={(order, prod, meta) => {
            handleChatOrderSuccess(order, prod, meta);
          }}
        />
      )}

      {/* Chat Sessions History Modal */}
      <AuraAIChatHistoryModal
        isOpen={showChatHistoryModal}
        onClose={() => setShowChatHistoryModal(false)}
        currentMode={mode}
        onSelectSession={(session) => {
          const convId = typeof session === "string" ? session : session?.id;
          if (convId) {
            auraChatStore.setConversationId(convId);
            setConversationId(convId);
          }
          if (session?.messages && Array.isArray(session.messages)) {
            setMessages(session.messages);
            auraChatStore.saveMessages(session.messages, mode);
          } else {
            setMessages(auraChatStore.getMessages(mode));
          }
        }}
      />

      {/* Saved Devotee Kundali Modal */}
      <AuraAISavedKundaliModal
        isOpen={showSavedKundaliModal}
        onClose={() => setShowSavedKundaliModal(false)}
        onSelectKundali={(profile) => {
          setShowSavedKundaliModal(false);
          const name = profile.name || profile.devoteeName || "Devotee";
          const dob = profile.dob || "";
          const birthTime = profile.birthTime || profile.time || "12:00";
          const birthPlace = profile.birthPlace || profile.place || "";
          const concern = profile.concern || "all";
          const profileData = { name, dob, birthTime, birthPlace, concern };

          skipNextModeResetRef.current = true;
          setMode("panditji");
          setActiveBirthDetails(profileData);
          auraChatStore.saveVerifiedBirthDetails(profileData);

          handleSend(`🙏 श्री ${name} जी की जन्म कुंडली का संपूर्ण वैदिक विश्लेषण व रुद्राक्ष परामर्श (DOB: ${dob}, Time: ${birthTime}, Place: ${birthPlace})`, profileData);
        }}
        onSelectProfile={(profile) => {
          setShowSavedKundaliModal(false);
          const name = profile.name || profile.devoteeName || "Devotee";
          const dob = profile.dob || "";
          const birthTime = profile.birthTime || profile.time || "12:00";
          const birthPlace = profile.birthPlace || profile.place || "";
          const concern = profile.concern || "all";
          const profileData = { name, dob, birthTime, birthPlace, concern };

          skipNextModeResetRef.current = true;
          setMode("panditji");
          setActiveBirthDetails(profileData);
          auraChatStore.saveVerifiedBirthDetails(profileData);

          handleSend(`🙏 श्री ${name} जी की जन्म कुंडली का संपूर्ण वैदिक विश्लेषण व रुद्राक्ष परामर्श (DOB: ${dob}, Time: ${birthTime}, Place: ${birthPlace})`, profileData);
        }}
      />

      {/* Interactive Vedic Astrology & Rudraksha Tools Modal */}
      <PanditJiVedicTools
        isOpen={showVedicToolsModal}
        onClose={() => setShowVedicToolsModal(false)}
        initialTab={vedicToolsTab}
        defaultBirthDetails={activeBirthDetails}
        onAskPanditJi={(promptText) => {
          skipNextModeResetRef.current = true;
          setMode("panditji");
          handleSend(promptText);
        }}
      />
    </Shell>
  );
}
