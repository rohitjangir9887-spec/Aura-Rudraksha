import { getProductPrimaryImage, getProductGalleryImages } from "../lib/imageUtils";
import { getProductRoute } from "../lib/routes";
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  Sparkles, 
  X, 
  Send, 
  Maximize2, 
  Minimize2, 
  RotateCcw, 
  ShoppingCart, 
  Eye, 
  Tag, 
  PhoneCall, 
  Check, 
  ChevronRight, 
  ChevronDown,
  ChevronLeft,
  Package, 
  ShieldCheck, 
  GripVertical,
  MessageCircle,
  Search,
  Calendar,
  Clock,
  MapPin,
  User,
  Mic,
  MicOff,
  ArrowDown,
  Notebook,
  Plus,
  Trash2,
  History,
  Bookmark,
  Copy,
  Share2
} from "lucide-react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { auraAiClient } from "../lib/auraAiClient";
import { parseAuraAiPayload, customerSafeAiText, isAuraResponseIncomplete, smartMergeContinuation } from "../lib/auraAiResponse";
import { auraChatStore, getDateDividerLabel, formatMessageTime } from "../lib/auraChatStore";
import { useCart } from "../hooks/useCart";
import { authClient } from "../lib/authClient";
import { emitToast } from "../context/ToastContext";
import { triggerHaptic } from "../lib/haptics";
import { safePrice } from "../lib/productHelper";
import { AuraAIChatOrderModal } from "./AuraAIChatOrderModal";
import { AuraAIMessageContent } from "./AuraAIMessageContent";
import { VoiceReader } from "./VoiceReader";
import { AuraAIChatHistoryModal } from "./AuraAIChatHistoryModal";
import { AuraAISavedKundaliModal } from "./AuraAISavedKundaliModal";


export function AuraAIFloating() {
  const location = useLocation();
  const [isOpenState, setIsOpenState] = useState(() => auraChatStore.isFloatingOpen());
  const [isFullWindow, setIsFullWindow] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => auraChatStore.isFloatingDismissed());
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [settings, setSettings] = useState({ enabled: true, showFloatingButton: true });
  const [mode, setMode] = useState("standard");
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [timeTheme, setTimeTheme] = useState("theme-classic");
  const [pillState, setPillState] = useState("default");

  const executeQuickAction = (prompt) => {
    setShowQuickActions(false);
    setIsFullWindow(false);
    setIsOpen(true);
    if (prompt) {
      setTimeout(() => {
        handleSend(prompt);
      }, 50);
    }
  };


  useEffect(() => {
    const updateTheme = () => {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) setTimeTheme("theme-dawn");
      else if (hour >= 12 && hour < 17) setTimeTheme("theme-classic");
      else if (hour >= 17 && hour < 21) setTimeTheme("theme-sunset");
      else setTimeTheme("theme-night");
    };
    updateTheme();
    const interval = setInterval(updateTheme, 60000);
    return () => clearInterval(interval);
  }, []);


  // Unified persistent setIsOpen that updates global store
  const setIsOpen = useCallback((val) => {
    setIsOpenState((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      auraChatStore.setFloatingOpen(next);
      return next;
    });
  }, []);

  const isOpen = isOpenState;
  
  // Shared persistent chat history
  const [messages, setMessages] = useState(() => auraChatStore.getMessages(mode));
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Keep pill state in sync with assistant thinking & answer ready states
  useEffect(() => {
    if (loading) {
      setPillState("thinking");
    } else if (pillState === "thinking") {
      setPillState("ready");
      const readyTimer = setTimeout(() => {
        setPillState("default");
      }, 3000);
      return () => clearTimeout(readyTimer);
    }
  }, [loading]);

  // Universal Touch & Screen Unlocker: Guarantees main UI and product clicks work 100% with zero touch lock
  const unlockScreenAndTouch = useCallback(() => {
    if (typeof document !== "undefined") {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.pointerEvents = "";
      document.body.style.touchAction = "";
      document.documentElement.style.overflow = "";
      document.documentElement.style.pointerEvents = "";
      document.documentElement.style.touchAction = "";
      const rootEl = document.getElementById("root");
      if (rootEl) {
        rootEl.style.pointerEvents = "";
      }
    }
  }, []);

  // Listen for link navigation events from AI messages to close drawer smoothly & unlock touch
  useEffect(() => {
    const handleNavigate = () => {
      setIsOpen(false);
      setIsFullWindow(false);
      setShowChatHistoryModal(false);
      setShowSavedKundaliModal(false);
      setShowNotepad(false);
      setShowBirthForm(false);
      setOrderModalProduct(null);
      unlockScreenAndTouch();
    };
    window.addEventListener("aura-ai-navigate", handleNavigate);
    return () => window.removeEventListener("aura-ai-navigate", handleNavigate);
  }, [setIsOpen, unlockScreenAndTouch]);
  const [conversationId, setConversationId] = useState(() => auraChatStore.getConversationId());
  const [showChatHistoryModal, setShowChatHistoryModal] = useState(false);
  const [showSavedKundaliModal, setShowSavedKundaliModal] = useState(false);

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

  const [addedItems, setAddedItems] = useState({});
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [orderModalProduct, setOrderModalProduct] = useState(null);
  const [activeBirthDetails, setActiveBirthDetails] = useState(() => auraChatStore.getVerifiedBirthDetails());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshPhase, setRefreshPhase] = useState("idle"); // "idle" | "fading-out" | "fading-in"
  const [showRefreshToast, setShowRefreshToast] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);


  const handleMicToggle = useCallback(() => {
    if (isListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_) {}
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      emitToast("Voice recognition is not supported in this browser. Please type your message.", "info");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = mode === "panditji" ? "hi-IN" : "en-IN";

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (e) => {
        const transcript = e.results[0]?.[0]?.transcript;
        if (transcript) {
          setInput((prev) => (prev ? prev + " " + transcript : transcript));
        }
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn("Speech recognition error:", err);
      setIsListening(false);
    }
  }, [isListening, mode]);
  
  // Interactive Birth Details Kundli Form state for AI Panditji mode
  const [showBirthForm, setShowBirthForm] = useState(false);
  const [birthForm, setBirthForm] = useState({
    name: "",
    dob: "",
    time: "",
    place: "",
    concern: "career"
  });

  // Smart Scroll Lock & Jump to Bottom states
  const userHasScrolledUpRef = useRef(false);
  const isNearBottomRef = useRef(true);
  const bodyScrollRef = useRef(null);
  const textareaRef = useRef(null);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);

  const handleScroll = () => {
    if (!bodyScrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = bodyScrollRef.current;
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

  // Spiritual / Shopping Notepad states
  const [showNotepad, setShowNotepad] = useState(false);
  const [notesList, setNotesList] = useState([]);
  const [newNoteText, setNewNoteText] = useState("");
  const [loadingNotes, setLoadingNotes] = useState(false);

  const fetchNotes = useCallback(async () => {
    setLoadingNotes(true);
    try {
      const guestSessionId = auraChatStore.getGuestSessionId();
      const token = await authClient.getToken();
      const API_BASE = (import.meta.env.VITE_API_BASE || "/api").replace(/\/+$/, "") + "/aura-ai";
      const res = await fetch(`${API_BASE}/notes`, {
        headers: {
          "X-Guest-Session-ID": guestSessionId,
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.notes)) {
        setNotesList(data.notes);
      }
    } catch (_) {}
    setLoadingNotes(false);
  }, []);

  const handleAddNote = async () => {
    if (!newNoteText.trim()) return;
    try {
      const guestSessionId = auraChatStore.getGuestSessionId();
      const token = await authClient.getToken();
      const API_BASE = (import.meta.env.VITE_API_BASE || "/api").replace(/\/+$/, "") + "/aura-ai";
      await fetch(`${API_BASE}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Guest-Session-ID": guestSessionId,
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ value: newNoteText.trim() })
      });
      setNewNoteText("");
      fetchNotes();
    } catch (_) {}
  };

  const handleDeleteNote = async (key) => {
    try {
      const guestSessionId = auraChatStore.getGuestSessionId();
      const token = await authClient.getToken();
      const API_BASE = (import.meta.env.VITE_API_BASE || "/api").replace(/\/+$/, "") + "/aura-ai";
      await fetch(`${API_BASE}/notes/${encodeURIComponent(key)}`, {
        method: "DELETE",
        headers: {
          "X-Guest-Session-ID": guestSessionId,
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      fetchNotes();
    } catch (_) {}
  };

  // Aura AI Live Status and Stop/Retry State Variables
  const [statusText, setStatusText] = useState("Thinking...");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [errorOccurred, setErrorOccurred] = useState(false);
  const [lastUserQuery, setLastUserQuery] = useState("");
  const [activePassCount, setActivePassCount] = useState(0);
  const timerRef = useRef(null);
  const turnSeqRef = useRef(0);
  const autoContinuationCountRef = useRef(0);
  const activeAiMsgIdRef = useRef(null);
  const [windowSize, setWindowSize] = useState({ width: 1200, height: 800 });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleResize = () => {
        setWindowSize({ width: window.innerWidth, height: window.innerHeight });
      };
      handleResize();
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  // Dynamic AI suggestion keywords generator based on conversation context
  const dynamicSuggestions = useMemo(() => {
    const lastAiMsg = [...messages].reverse().find(m => m.sender === "bot" || m.role === "assistant" || m.sender === "ai");
    const lastText = (lastAiMsg?.text || "").toLowerCase();
    const kundali = lastAiMsg?.kundali;
    const primaryMukhi = kundali?.rudrakshaRecommendations?.[0]?.mukhi || kundali?.recommendedMukhi;

    if (mode === "panditji") {
      if (primaryMukhi) {
        return [
          { label: `📿 ${primaryMukhi} धारण विधि`, query: `कृपया ${primaryMukhi} की संपूर्ण वैदिक धारण विधि व बीज मंत्र बताएं` },
          { label: `🪐 ${primaryMukhi} लाभ`, query: `मेरी जन्म कुंडली अनुसार ${primaryMukhi} के प्रमुख लाभ क्या हैं?` },
          { label: `✨ महादशा उपाय`, query: `मेरी वर्तमान महादशा और ग्रह शांति के उपाय बताएं` },
          { label: `🛍️ ${primaryMukhi} देखें`, query: `सिद्ध ${primaryMukhi} स्टोर में दिखाएं` }
        ];
      }
      const list = [];
      if (lastText.includes("mukhi") || lastText.includes("rudraksha") || lastText.includes("रुद्राक्ष") || lastText.includes("धारण")) {
        list.push({ label: "🕉️ शुद्ध धारण विधि", query: "रुद्राक्ष को शुद्ध और धारण करने की वैदिक विधि बताएं" });
        list.push({ label: "📿 सिद्ध बीज मंत्र", query: "इस रुद्राक्ष का प्राण-प्रतिष्ठा और सिद्ध बीज मंत्र क्या है?" });
        list.push({ label: "💎 चांदी पेंडेंट या धागा", query: "रुद्राक्ष को चांदी में धारण करना चाहिए या तांबे/लाल धागे में?" });
      }
      if (lastText.includes("kundli") || lastText.includes("kundali") || lastText.includes("दोष") || lastText.includes("rashi") || lastText.includes("राशि") || lastText.includes("शनि") || lastText.includes("राहु")) {
        list.push({ label: "🪐 महादशा व ग्रह शांति", query: "मेरी वर्तमान दशा और ग्रह शांति के सर्वोत्तम वैदिक उपाय बताएं" });
        list.push({ label: "🌙 जन्म राशि रुद्राक्ष", query: "मेरी जन्म राशि के अनुसार सबसे शुभ रुद्राक्ष कौन सा है?" });
      }
      if (list.length < 4) {
        list.push({ label: "🌸 1 से 14 मुखी गाइड", query: "1 से 14 मुखी रुद्राक्ष के लाभ और महत्व बताएं" });
        list.push({ label: "🙏 गौरी शंकर महत्व", query: "गौरी शंकर रुद्राक्ष के लाभ और वैवाहिक सुख के प्रभाव बताएं" });
        list.push({ label: "✨ सिद्ध प्राण-प्रतिष्ठा", query: "ऑरा रुद्राक्ष की प्राण-प्रतिष्ठा और शुद्धता कैसे जांची जाती है?" });
        list.push({ label: "🕉️ सावन व शिवरात्रि मुहूर्त", query: "रुद्राक्ष धारण करने का सबसे शुभ दिन और नक्षत्र कौन सा है?" });
      }
      return list.slice(0, 5);
    } else {
      const list = [];
      if (lastText.includes("track") || lastText.includes("order") || lastText.includes("ऑर्डर") || lastText.includes("डिलीवरी")) {
        list.push({ label: "📦 Track My Order", query: "Track my recent order status" });
        list.push({ label: "🚚 Delivery Timeline", query: "Standard delivery time kitna lagta hai?" });
      }
      if (lastText.includes("coupon") || lastText.includes("offer") || lastText.includes("discount") || lastText.includes("छूट")) {
        list.push({ label: "🎟️ Today's Coupons", query: "Aaj ke active discount coupon codes batao" });
        list.push({ label: "🎁 Free Lab Certificate", query: "Free Lab Certificate and gift offers kya hain?" });
      }
      if (lastText.includes("mukhi") || lastText.includes("rudraksha") || lastText.includes("price") || lastText.includes("कीमत")) {
        list.push({ label: "🏷️ Best Seller Beads", query: "Best selling original Nepali Rudraksha beads dikhao" });
        list.push({ label: "🛡️ 100% Lab Tested", query: "Rudraksha lab testing and authenticity certificate details" });
        list.push({ label: "🕉️ 108 Jaap Mala", query: "Original 108 bead Jaap Mala dikhao" });
      }
      if (list.length < 4) {
        list.push({ label: "✨ Suggest Rudraksha", query: "Mujhe apne liye best Rudraksha suggest karein" });
        list.push({ label: "📦 Track Order", query: "Track my order status" });
        list.push({ label: "🎟️ Active Offers", query: "Active discount offers aur coupon codes dikhao" });
        list.push({ label: "🕉️ Jaap Mala", query: "Original 108 bead Jaap Mala dikhao" });
      }
      return list.slice(0, 5);
    }
  }, [messages, mode]);

  const cart = useCart();
  const navigate = useNavigate();

  // Automatically close AI assistant & clear background modal/overlay when user navigates to another page
  const prevPathnameRef = useRef(location.pathname);
  useEffect(() => {
    if (prevPathnameRef.current !== location.pathname) {
      prevPathnameRef.current = location.pathname;
      setIsOpenState(false);
      auraChatStore.setFloatingOpen(false);
      setIsFullWindow(false);
      setShowChatHistoryModal(false);
      setShowSavedKundaliModal(false);
      setShowNotepad(false);
      setShowBirthForm(false);
      setOrderModalProduct(null);
      unlockScreenAndTouch();
    }
  }, [location.pathname, unlockScreenAndTouch]);
  const messagesEndRef = useRef(null);
  const isDraggingBtnRef = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const dragControls = useDragControls();
  const undoTimerRef = useRef(null);
  const dragAreaRef = useRef(null);

  // Auto-close AI assistant and remove background modal/overlay on URL changes
  const prevLocationRef = useRef(location.pathname + location.search);
  useEffect(() => {
    const currentLocation = location.pathname + location.search;
    if (prevLocationRef.current !== currentLocation) {
      prevLocationRef.current = currentLocation;
      setIsOpenState(false);
      auraChatStore.setFloatingOpen(false);
      setIsFullWindow(false);
      setShowChatHistoryModal(false);
      setShowSavedKundaliModal(false);
      setShowNotepad(false);
      setShowBirthForm(false);
      setOrderModalProduct(null);
      unlockScreenAndTouch();
    }
  }, [location.pathname, location.search, unlockScreenAndTouch]);

  // Handle hardware Back button, browser back, and swipe gestures smoothly
  useEffect(() => {
    if (isOpen) {
      // Push history state so back button closes the chat rather than navigating away / breaking page
      try {
        if (!window.history.state || !window.history.state.auraAiOpen) {
          window.history.pushState({ ...window.history.state, auraAiOpen: true }, "");
        }
      } catch (_) {}

      const handlePopState = () => {
        setIsOpenState(false);
        auraChatStore.setFloatingOpen(false);
        setIsFullWindow(false);
        setShowChatHistoryModal(false);
        setShowSavedKundaliModal(false);
        setShowNotepad(false);
        setShowBirthForm(false);
        setOrderModalProduct(null);
        unlockScreenAndTouch();
      };

      window.addEventListener("popstate", handlePopState);
      return () => {
        window.removeEventListener("popstate", handlePopState);
        unlockScreenAndTouch();
      };
    } else {
      unlockScreenAndTouch();
    }
  }, [isOpen, unlockScreenAndTouch]);

  // Dedicated clean close handler
  const handleCloseChat = useCallback((e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsOpenState(false);
    auraChatStore.setFloatingOpen(false);
    setIsFullWindow(false);
    setShowChatHistoryModal(false);
    setShowSavedKundaliModal(false);
    setShowNotepad(false);
    setShowBirthForm(false);
    setOrderModalProduct(null);
    unlockScreenAndTouch();
  }, [unlockScreenAndTouch]);

  // Load server settings
  useEffect(() => {
    auraAiClient.getSettings().then(s => {
      if (s && typeof s.enabled === "boolean") {
        setSettings(s);
      }
    }).catch(() => {});
  }, []);

  const prevIsOpenRef = useRef(false);

  // Update messages when switching mode (e.g. standard vs panditji)
  useEffect(() => {
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
    requestAnimationFrame(() => {
      if (bodyScrollRef.current) {
        bodyScrollRef.current.scrollTop = bodyScrollRef.current.scrollHeight;
      }
    });
  }, [mode]);

  // Handle Auth changes safely without wiping chats on page refresh
  useEffect(() => {
    let isMounted = true;
    const unsub = authClient.onAuthStateChanged(async (currentUser) => {
      auraAiClient.abortActiveStream();
      const syncResult = auraChatStore.syncAuthSession(currentUser, mode);
      if (isMounted) {
        if (syncResult && Array.isArray(syncResult.messages) && syncResult.messages.length > 0) {
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
    };
  }, [mode]);

  // Auto-grow textarea height on input change
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "36px";
      const scrollH = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollH, 36), 96)}px`;
    }
  }, [input]);

  // Listen to shared cross-component and cross-tab chat sync events
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

    const handleDismissSync = (e) => {
      setIsDismissed(!!e.detail);
    };

    const handleOpenChange = (e) => {
      if (typeof e.detail === "boolean") {
        setIsOpenState(e.detail);
        if (e.detail) {
          setIsDismissed(false);
          auraChatStore.setFloatingDismissed(false);
        }
      }
    };

    const handleStorageChange = (e) => {
      if (e.key === auraChatStore.getStorageKey(mode)) {
        setMessages(auraChatStore.getMessages(mode));
      }
      if (e.key === "aura_ai_floating_dismissed") {
        setIsDismissed(auraChatStore.isFloatingDismissed());
      }
    };

    const handleBirthDetailsUpdate = (e) => {
      setActiveBirthDetails(e.detail?.details || auraChatStore.getVerifiedBirthDetails());
    };
    const handleBirthDetailsCleared = () => {
      setActiveBirthDetails(null);
    };

    window.addEventListener("aura_ai_chat_sync", handleChatSync);
    window.addEventListener("aura_ai_floating_dismiss_sync", handleDismissSync);
    window.addEventListener("aura_ai_open_change", handleOpenChange);
    window.addEventListener("aura_ai_birth_details_updated", handleBirthDetailsUpdate);
    window.addEventListener("aura_ai_birth_details_cleared", handleBirthDetailsCleared);
    window.addEventListener("storage", handleStorageChange);

    const handleTriggerChat = (e) => {
      const prompt = e.detail?.prompt;
      if (e.detail?.mode) {
        setMode(e.detail.mode);
      } else if (prompt && (prompt.includes("पंडित") || prompt.includes("Pandit") || prompt.includes("kundli") || prompt.includes("कुंडली"))) {
        setMode("panditji");
      }
      if (typeof e.detail?.fullWindow === "boolean") {
        setIsFullWindow(e.detail.fullWindow);
      }
      setIsDismissed(false);
      setIsOpen(true);
      if (prompt && prompt.trim()) {
        setTimeout(() => {
          handleSend(prompt.trim());
        }, 150);
      }
    };
    window.addEventListener("aura_ai_trigger_chat", handleTriggerChat);

    return () => {
      window.removeEventListener("aura_ai_chat_sync", handleChatSync);
      window.removeEventListener("aura_ai_floating_dismiss_sync", handleDismissSync);
      window.removeEventListener("aura_ai_open_change", handleOpenChange);
      window.removeEventListener("aura_ai_birth_details_updated", handleBirthDetailsUpdate);
      window.removeEventListener("aura_ai_birth_details_cleared", handleBirthDetailsCleared);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("aura_ai_trigger_chat", handleTriggerChat);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [mode]);

  // Scroll message area only when window first opens so existing history is visible
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current && bodyScrollRef.current) {
      bodyScrollRef.current.scrollTop = bodyScrollRef.current.scrollHeight;
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  // Keyboard Escape listener to close floating window or modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (orderModalProduct) {
          setOrderModalProduct(null);
        } else if (isOpen) {
          setIsOpen(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, orderModalProduct, setIsOpen]);

  const path = (location.pathname || "").toLowerCase();
  const isAdminPage = path.startsWith("/admin");
  const isDedicatedAiPage = path === "/aura-ai" || path.startsWith("/aura-ai");

  const isAiEnabled = settings?.enabled !== false;
  const isFloatingVisible = settings?.showFloatingButton !== false;

  if (!isAiEnabled || isAdminPage || isDedicatedAiPage) {
    return null;
  }

  if (!isOpen && !isFloatingVisible) {
    return null;
  }

  const handleSend = async (customText = null, customBirthDetails = null) => {
    const textToSend = customText || input;
    if ((!textToSend || !textToSend.trim()) && !customBirthDetails) return;

    // 1. Immediately abort active stream and increment sequence to discard superseded events
    auraAiClient.abortActiveStream();
    const currentTurnSeq = ++turnSeqRef.current;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Reset scroll lock state on sending new user message
    isNearBottomRef.current = true;
    setShowJumpToBottom(false);

    const userMsg = {
      id: "msg_" + Date.now(),
      sender: "user",
      text: textToSend ? textToSend.trim() : `Kundali Request (${customBirthDetails?.dob})`,
      timestamp: new Date().toISOString()
    };

    const currentMsgs = auraChatStore.appendMessage(userMsg, mode);
    setMessages(currentMsgs);
    if (!customText) setInput("");
    userHasScrolledUpRef.current = false;
    setShowJumpToBottom(false);

    // Scroll smoothly to newly sent user message at bottom of viewing area
    requestAnimationFrame(() => {
      if (bodyScrollRef.current) {
        bodyScrollRef.current.scrollTo({ top: bodyScrollRef.current.scrollHeight, behavior: "smooth" });
      }
    });

    // Reset and Start Live Status Tracking
    setLastUserQuery(textToSend ? textToSend.trim() : "Kundali Request");
    setErrorOccurred(false);
    autoContinuationCountRef.current = 0;
    setStatusText(getDynamicThinkingStatus(0, mode));
    setElapsedTime(0);
    setLoading(true);

    timerRef.current = setInterval(() => {
      setElapsedTime((prev) => {
        const next = prev + 1;
        if (!streamInitialized) {
          setStatusText(getDynamicThinkingStatus(next, mode));
        }
        return next;
      });
    }, 1000);

    const aiMsgId = "ai_" + Date.now();
    let streamInitialized = false;

    try {
      const currentUser = authClient.getUser();
      const userEmail = currentUser?.email || "";
      const userName = currentUser?.displayName || "Devotee";
      const notesContext = notesList.map(n => `${n.memoryKey}: ${n.memoryValue}`).join("; ");
      const effectiveBirthDetails = customBirthDetails || (mode === "panditji" ? (activeBirthDetails || auraChatStore.getVerifiedBirthDetails()) : null);

      await auraAiClient.sendMessageStream({
        message: textToSend || "",
        conversationId,
        userEmail,
        userName,
        mode,
        cartItems: cart.lines || [],
        history: currentMsgs.slice(-8),
        birthDetails: effectiveBirthDetails,
        notesContext,
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
          setStatusText(mode === "panditji" ? "✍️ वैदिक परामर्श लिखा जा रहा है..." : "✍️ उत्तर लिखा जा रहा है...");
          
          const liveMsg = {
            id: aiMsgId,
            sender: "ai",
            text: cleanText,
            products: (partialData?.products && partialData.products.length > 0) ? partialData.products : [],
            coupons: (partialData?.coupons && partialData.coupons.length > 0) ? partialData.coupons : [],
            orderInfo: partialData?.orderInfo || null,
            requiresHuman: Boolean(partialData?.requiresHuman),
            quickReplies: (partialData?.quickReplies && partialData.quickReplies.length > 0) ? partialData.quickReplies : [],
            kundali: partialData?.kundali || null,
            timestamp: new Date().toISOString()
          };

          // Save live stream chunk to store so user can close and reopen anytime without losing progress
          auraChatStore.upsertMessage(liveMsg, mode);

          setMessages((prev) => {
            if (currentTurnSeq !== turnSeqRef.current) return prev;
            const idx = prev.findIndex((m) => m.id === aiMsgId);
            const existing = idx >= 0 ? prev[idx] : null;
            const updatedMsg = {
              ...(existing || {}),
              ...liveMsg,
              products: (partialData?.products && partialData.products.length > 0) ? partialData.products : (existing?.products || []),
              coupons: (partialData?.coupons && partialData.coupons.length > 0) ? partialData.coupons : (existing?.coupons || []),
            };
            if (idx >= 0) {
              const clone = [...prev];
              clone[idx] = updatedMsg;
              return clone;
            }
            return [...prev, updatedMsg];
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
          if (finalData.showBirthForm) {
            const existingDetails = auraChatStore.getVerifiedBirthDetails();
            if (!existingDetails) {
              setShowBirthForm(true);
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

          // Automated background continuation: If the AI cuts off mid-sentence or mid-analysis, automatically continue
          const shouldAutoContinue = isAuraResponseIncomplete(cleanText, mode);
          if (shouldAutoContinue) {
            autoContinuationCountRef.current = 1;
            setTimeout(() => {
              handleContinueChat(aiMsg, 1, 10);
            }, 300);
            return;
          }

          autoContinuationCountRef.current = 0;
        },
        onError: (err) => {
          if (currentTurnSeq !== turnSeqRef.current) return;
          console.warn("Stream notice in floating assistant:", err);
          setErrorOccurred(true);
          const fallbackText = mode === "panditji"
            ? "Namaste Devotee 🙏 Kshama karein, ek takneeki samasya aayi hai. Kripya punah prayas karein."
            : "Namaste 🙏 Kshama karein, ek takneeki samasya aayi. Kripya punah prayas karein ya WhatsApp par sampark karein.";
          
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
            auraChatStore.upsertMessage(updatedMsg, mode);
            if (idx >= 0) {
              const clone = [...prev];
              clone[idx] = updatedMsg;
              return clone;
            }
            return [...prev, updatedMsg];
          });
          setLoading(false);
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
      const fallbackText = mode === "panditji"
        ? "Namaste Devotee 🙏 Kshama karein, ek takneeki samasya aayi hai. Kripya punah prayas karein."
        : "Namaste 🙏 Kshama karein, ek takneeki samasya aayi. Kripya punah prayas karein ya WhatsApp par sampark karein.";
      
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
        auraChatStore.upsertMessage(updatedMsg, mode);
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
      }
    }
  };

  const handleContinueChat = async (targetMsg, autoPassNumber = 0, maxPasses = 10) => {
    if (!targetMsg) return;
    const baseText = targetMsg.text || "";

    const prompt = "कृपया पिछले उत्तर को जहाँ से रुका था, वहीं से बिना कोई प्रारंभिक वाक्य या नमस्कार दोहराए आगे जारी रखें और पूरा करें। यदि उत्तर पहले ही पूर्ण हो चुका है, तो कुछ भी दोहराएं नहीं। (Please continue the rest of the answer seamlessly right from where it stopped without repeating any previous text).";

    auraAiClient.abortActiveStream();
    const currentTurnSeq = ++turnSeqRef.current;
    activeAiMsgIdRef.current = targetMsg.id;
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
              products: (partialData?.products && partialData.products.length > 0) ? partialData.products : (existing?.products || targetMsg.products || []),
              coupons: (partialData?.coupons && partialData.coupons.length > 0) ? partialData.coupons : (existing?.coupons || targetMsg.coupons || []),
              orderInfo: partialData?.orderInfo || existing?.orderInfo || targetMsg.orderInfo || null,
              requiresHuman: Boolean(partialData?.requiresHuman || existing?.requiresHuman || targetMsg.requiresHuman),
              quickReplies: (partialData?.quickReplies && partialData.quickReplies.length > 0) ? partialData.quickReplies : (existing?.quickReplies || targetMsg.quickReplies || []),
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
              handleContinueChat(aiMsg, nextPass, maxPasses);
            }, 300);
          } else {
            autoContinuationCountRef.current = 0;
            setActivePassCount(0);
            if (activeAiMsgIdRef.current === aiMsgId) {
              activeAiMsgIdRef.current = null;
            }
          }
        },
        onError: (err) => {
          if (currentTurnSeq !== turnSeqRef.current) return;
          console.warn("Continue stream notice:", err);
          setLoading(false);
          setActivePassCount(0);
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
      emitToast("कृपया जन्म समय (Birth Time) दर्ज करें (Time is required)", "warning");
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

    const promptText = `नमस्ते पंडित जी 🙏 मेरा नाम ${birthForm.name.trim()} है।\n• जन्म तिथि: ${birthForm.dob}\n• जन्म समय: ${birthForm.time.trim()}\n• जन्म स्थान: ${birthForm.place.trim()}\n• मुख्य संकल्प / समस्या: ${concernLabels[birthForm.concern] || birthForm.concern}\n\nकृपया मेरी जन्म कुंडली व नक्षत्रों का प्रामाणिक वैदिक विश्लेषण करके सर्वोत्तम रुद्राक्ष, बीज मंत्र और पूजन विधि बताइए।`;

    const verifiedDetails = {
      name: birthForm.name.trim(),
      dob: birthForm.dob,
      birthTime: birthForm.time.trim(),
      birthPlace: birthForm.place.trim(),
      concern: birthForm.concern
    };
    auraChatStore.saveVerifiedBirthDetails(verifiedDetails);

    setShowBirthForm(false);
    setMode("panditji");
    handleSend(promptText, verifiedDetails);
  };

  // Start a new chat session with smooth fade-out and fade-in transition
  const handleNewChat = () => {
    if (isRefreshing) return;
    auraAiClient.abortActiveStream();
    turnSeqRef.current++;
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

  const handleAddToCart = (product) => {
    if (!product) return;
    triggerHaptic("medium");
    cart.add(product.id, 1);
    setAddedItems(prev => ({ ...prev, [product.id]: true }));
    auraAiClient.trackAction({ conversationId, action: "cart", productId: product.id });
    setTimeout(() => {
      setAddedItems(prev => ({ ...prev, [product.id]: false }));
    }, 2500);
  };

  const handleApplyCoupon = (code) => {
    triggerHaptic("success");
    setAppliedCoupon(code);
    try {
      localStorage.setItem("aura_pending_coupon", code);
    } catch (_) {}
  };

  const handleChatOrderSuccess = (createdOrder, prod, meta) => {
    triggerHaptic("success");
    const safeFinal = Number(meta?.finalAmount || 0);
    const confirmationMsg = {
      id: "ai_order_" + Date.now(),
      sender: "ai",
      text: `Namaste! 🙏 Your order for **${prod?.name || "Sacred Bead"}** (x${meta?.qty || 1}) has been placed successfully!\n\n• **Order ID**: #${createdOrder.id || createdOrder.orderId}\n• **Total Amount**: ₹${safeFinal.toLocaleString('en-IN')}\n• **Status**: Confirmed & Preparing for Vedic Energization\n• **Packaging**: Sacred Gangajal Consecrated Box\n\nA confirmation email and tracking updates have been sent to your registered contact. May Lord Shiva bless you! ✨`,
      orderInfo: {
        id: createdOrder.id || createdOrder.orderId,
        finalAmount: safeFinal,
        status: "Confirmed",
        paymentStatus: createdOrder.paymentStatus || "Confirmed"
      },
      timestamp: new Date().toISOString()
    };
    const updated = auraChatStore.appendMessage(confirmationMsg, mode);
    setMessages(updated);
  };

  const handleOpen = () => {
    triggerHaptic("light");
    setIsFullWindow(false);
    setIsOpen(true);
  };

  // Dismissal across pages for this session
  const handleDismiss = (e) => {
    if (e) {
      if (typeof e.preventDefault === "function") e.preventDefault();
      if (typeof e.stopPropagation === "function") e.stopPropagation();
    }
    setIsOpen(false);
    auraChatStore.setFloatingDismissed(true);
    setIsDismissed(true);
    setShowUndoToast(true);
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
    }
    undoTimerRef.current = setTimeout(() => {
      setShowUndoToast(false);
      undoTimerRef.current = null;
    }, 3000); // Automatically disappears in 3 seconds (2-4s range)
  };

  const handleRestore = () => {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    setShowUndoToast(false);
    auraChatStore.setFloatingDismissed(false);
    setIsDismissed(false);
  };

  // Aura AI must appear ONLY on the Home page ("/")
  if (location.pathname !== "/") {
    return null;
  }

  return (
    <>
      {/* Safe viewport bounds overlay: strictly protects bottom navigation icons (Home, Shop, Cart, Orders, Account) */}
      <div 
        ref={dragAreaRef} 
        style={{ 
          position: "fixed", 
          top: 10, 
          left: 10, 
          right: 10, 
          bottom: "calc(78px + env(safe-area-inset-bottom, 0px))", 
          pointerEvents: "none", 
          zIndex: -1 
        }} 
      />

      {/* 1. Floating Action Pill - Modern, compact, floating animated Aura AI pill */}
      <AnimatePresence>
        {!isOpen && !isDismissed && (
          <motion.div
            id="aura-ai-floating-trigger"
            className="aura-ai-floating-btn-wrap"
            initial={{ scale: 0.82, opacity: 0, y: 15 }}
            animate={{ 
              scale: 1, 
              opacity: 1, 
              y: [0, -6, 0]
            }}
            exit={{ scale: 0.82, opacity: 0, y: 15 }}
            transition={{ 
              opacity: { duration: 0.25, ease: "easeOut" },
              scale: { duration: 0.25, ease: "easeOut" },
              y: { repeat: Infinity, duration: 3.2, ease: "easeInOut" }
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.94 }}
          >
            <div className={`aura-ai-floating-pill-container ${timeTheme}`}>
              {/* Compact Quick Actions Menu */}
              <AnimatePresence>
                {showQuickActions && (
                  <motion.div 
                    className="aura-ai-quick-actions"
                    initial={{ opacity: 0, y: 8, scale: 0.94 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.94 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    <div className="aura-qa-header">
                      <span className="aura-qa-header-title">✦ Aura Assistant</span>
                      <button
                        type="button"
                        className="aura-qa-header-close"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowQuickActions(false);
                        }}
                        aria-label="Close menu"
                      >
                        <X size={12} strokeWidth={2.4} />
                      </button>
                    </div>
                    <button type="button" className="aura-qa-btn" onClick={() => executeQuickAction("")}>
                      <MessageCircle size={15} className="qa-icon" />
                      <span>Ask anything</span>
                    </button>
                    <button type="button" className="aura-qa-btn" onClick={() => executeQuickAction("Find a product")}>
                      <Search size={15} className="qa-icon" />
                      <span>Find a product</span>
                    </button>
                    <button type="button" className="aura-qa-btn" onClick={() => executeQuickAction("Track my order")}>
                      <Package size={15} className="qa-icon" />
                      <span>Track order</span>
                    </button>
                    <button type="button" className="aura-qa-btn" onClick={() => executeQuickAction("I need Rudraksha guidance")}>
                      <Sparkles size={15} className="qa-icon" />
                      <span>Rudraksha guidance</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            
              {/* Refined Floating Pill Component with Living Light Aura & Floating Animation */}
              <div 
                className={`aura-ai-floating-pill ${pillState !== "default" ? `pill-state-${pillState}` : ""} ${showQuickActions ? "pill-qa-open" : ""}`}
                role="region"
                aria-label="Aura AI Floating Assistant"
              >
                {/* Ambient Living Light Halo behind the pill */}
                <div className="aura-ai-living-halo" aria-hidden="true">
                  <div className="aura-ai-living-halo-glow" />
                  <div className="aura-ai-living-halo-edge" />
                </div>

                {/* Soft Gold Shimmer during Answer Ready state */}
                {pillState === "ready" && (
                  <div className="aura-ai-ready-shimmer" aria-hidden="true" />
                )}

                {/* Main Interactive Button */}
                <button
                  type="button"
                  onClick={handleOpen}
                  className="aura-ai-floating-main-btn"
                  aria-expanded={isOpen}
                  aria-label="Open Aura AI Shopping and Vedic Guide"
                >
                  <span className="aura-ai-sparkle-glyph" aria-hidden="true">
                    {/* Core Living Light Aura directly behind the sparkle icon */}
                    <span className="aura-ai-living-core-light" aria-hidden="true" />
                    <Sparkles size={13} strokeWidth={2.2} className={pillState === "thinking" ? "aura-ai-sparkle-spin" : ""} />
                  </span>
                  <span className="aura-ai-floating-label">
                    AI
                  </span>
                  <span className="aura-ai-state-indicator" aria-hidden="true">
                    {pillState === "thinking" ? (
                      <span className="aura-ai-dots-anim">•••</span>
                    ) : pillState === "ready" ? (
                      <Check size={13} strokeWidth={2.8} className="aura-ai-check-ready" />
                    ) : (isOpen || showQuickActions) ? (
                      <ChevronDown size={13} strokeWidth={2.5} />
                    ) : (
                      <span className="aura-ai-chevron-glyph">›</span>
                    )}
                  </span>
                </button>

                {/* Quick Actions Dropdown Trigger */}
                <button
                  type="button"
                  className={`aura-ai-floating-menu-trigger ${showQuickActions ? "active" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowQuickActions((prev) => !prev);
                  }}
                  title="Quick Actions"
                  aria-label="Open Quick Actions menu"
                  aria-expanded={showQuickActions}
                >
                  <ChevronDown size={12} strokeWidth={2.2} className={`aura-ai-qa-caret ${showQuickActions ? "open" : ""}`} />
                </button>

                {/* Dismiss / Close Button with Divider */}
                <div className="aura-ai-floating-divider" />
                <button
                  type="button"
                  className="aura-ai-floating-dismiss-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDismiss(e);
                  }}
                  title="Hide Aura AI Assistant"
                  aria-label="Close Aura AI"
                >
                  <X size={12} strokeWidth={2.2} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* 2. Toast when user dismisses the button */}
      <AnimatePresence>
        {showUndoToast && !isOpen && (
          <motion.div
            className="aura-ai-dismissed-toast"
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <span className="aura-ai-dismissed-toast-text">Aura AI sabhi pages se hide ho gaya hai</span>
            <button 
              type="button"
              onClick={handleRestore}
              className="aura-ai-undo-btn"
              title="Undo and show Aura AI button again"
              aria-label="Undo hide"
            >
              <RotateCcw size={11} className="aura-ai-undo-icon" />
              <span>Undo</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Aura AI Window - Fluid Opening & Spring Animations */}
      <AnimatePresence>
        {isOpen && (
          <React.Fragment key="aura-ai-window-portal">
            {/* Backdrop overlay - rendered ONLY for full-window mode to focus conversation */}
            {isFullWindow && (
              <motion.div
                key="aura-ai-backdrop-overlay"
                className="aura-ai-floating-backdrop aura-ai-backdrop-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: "easeInOut" }}
                style={{ pointerEvents: "auto" }}
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    setIsFullWindow(false);
                    unlockScreenAndTouch();
                  }
                }}
              />
            )}
            <motion.div
              key={isFullWindow ? "aura-ai-full-container" : "aura-ai-compact-container"}
              className={`aura-ai-floating-container ${isFullWindow ? "aura-ai-floating-container-full" : ""}`}
              initial={{ 
                opacity: 0, 
                scale: isFullWindow ? 0.94 : 0.82, 
                y: isFullWindow ? 20 : 35,
                transformOrigin: isFullWindow ? "center center" : "bottom left" 
              }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ 
                opacity: 0, 
                scale: isFullWindow ? 0.94 : 0.82, 
                y: isFullWindow ? 20 : 25,
                transition: { duration: 0.15, ease: [0.32, 0, 0.67, 0] }
              }}
              transition={{ type: "spring", damping: 25, stiffness: 320, mass: 0.85 }}
              style={{ pointerEvents: "none" }}
            >
              <motion.div
                id="aura-ai-floating-panel"
                className={`aura-ai-panel ${isFullWindow ? "aura-ai-panel-full" : "aura-ai-panel-compact"}`}
                drag={!isFullWindow}
                dragControls={dragControls}
                dragListener={false}
                dragMomentum={false}
                dragElastic={0.05}
                dragConstraints={{
                  left: -Math.max(100, window.innerWidth - 300),
                  right: Math.max(100, window.innerWidth - 300),
                  top: -Math.max(100, window.innerHeight - 400),
                  bottom: 0
                }}
                whileDrag={{ cursor: "grabbing" }}
                style={{ transformOrigin: isFullWindow ? "center center" : "bottom right", willChange: "transform, width, height", pointerEvents: "auto" }}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
              {/* iOS Style Top Grabber Bar Handle (iPhone bottom sheet / dynamic window effect) */}
              {!isFullWindow && (
                <div 
                  className="aura-ai-ios-grabber-wrap"
                  style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    paddingTop: "6px",
                    paddingBottom: "3px",
                    touchAction: "none",
                    cursor: "grab",
                    background: mode === "panditji" ? "linear-gradient(180deg, #3d1605 0%, #2f1003 100%)" : "linear-gradient(180deg, #2a1307 0%, #1c0b03 100%)",
                    borderTopLeftRadius: "inherit",
                    borderTopRightRadius: "inherit"
                  }}
                  onPointerDown={(e) => {
                    if (!e.target.closest("button") && !e.target.closest("a") && !e.target.closest("input")) {
                      dragControls.start(e, { snapToCursor: false });
                    }
                  }}
                >
                  <div className="aura-ai-ios-grabber" />
                </div>
              )}

              {/* Header - Drag Handle Area (when compact) */}
              <div 
                className={`aura-ai-header ${!isFullWindow ? "aura-ai-header-draggable" : ""} ${mode === "panditji" ? "aura-ai-header-panditji" : ""}`}
                style={{ touchAction: "none", userSelect: "none", WebkitUserSelect: "none" }}
                onPointerDown={(e) => {
                  if (!isFullWindow && !e.target.closest("button") && !e.target.closest("a") && !e.target.closest("textarea") && !e.target.closest("input")) {
                    dragControls.start(e, { snapToCursor: false });
                  }
                }}
              >
                <div 
                  className="aura-ai-header-left" 
                  style={{ touchAction: "none" }}
                >
                  {/* Dedicated Back to Website Button */}
                  <button
                    type="button"
                    onClick={handleCloseChat}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="aura-ai-btn-icon aura-ai-header-back-btn"
                    title="वापस वेबसाइट पर जाएं (Back to website)"
                    aria-label="Back to website"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "2px",
                      padding: "4px 7px",
                      background: "rgba(255,255,255,0.7)",
                      border: "1px solid rgba(212,175,55,0.4)",
                      borderRadius: "7px",
                      color: "#5c2b09",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: "pointer",
                      marginRight: "4px"
                    }}
                  >
                    <ChevronLeft size={14} strokeWidth={2.5} />
                    <span>वापस</span>
                  </button>

                  {!isFullWindow && (
                    <div className="aura-ai-panel-drag-cue" title="Drag window to move anywhere on screen" style={{ touchAction: "none" }}>
                      <GripVertical size={11} />
                    </div>
                  )}
                  <div className={`aura-ai-avatar ${mode === "panditji" ? "aura-ai-avatar-panditji" : ""}`}>
                    {mode === "panditji" ? (
                      <span style={{ fontSize: "14px", lineHeight: 1 }}>🕉️</span>
                    ) : (
                      <Sparkles size={12} />
                    )}
                  </div>
                  <div className="aura-ai-header-info">
                    <div className="aura-ai-title">
                      <span>{mode === "panditji" ? "AI Panditji" : "Aura AI"}</span>
                      <span className={`aura-ai-badge ${mode === "panditji" ? "aura-ai-badge-panditji" : ""}`}>
                        {mode === "panditji" ? "Vedic Astrologer" : "Vedic Guide"}
                      </span>
                    </div>
                    <div className="aura-ai-status">
                      <span className="aura-ai-online-dot" style={mode === "panditji" ? { background: "#ff9900" } : undefined} />
                      <span>{mode === "panditji" ? "Online • 35+ Yrs Vedic Wisdom" : "Online • Hindi & English"}</span>
                    </div>
                  </div>
                </div>

                <div className="aura-ai-header-actions">
                  {/* Chat History Button */}
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowChatHistoryModal(true);
                    }} 
                    onPointerDown={(e) => e.stopPropagation()}
                    className="aura-ai-btn-icon"
                    title="पुरानी चैट व इतिहास (Chat History)"
                    aria-label="Chat History"
                  >
                    <History size={13} />
                  </button>

                  {/* Saved Kundalis Button (in Panditji mode) */}
                  {mode === "panditji" && (
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowSavedKundaliModal(true);
                      }} 
                      onPointerDown={(e) => e.stopPropagation()}
                      className="aura-ai-btn-icon"
                      title="सुरक्षित कुंडलियां (Saved Kundalis)"
                      aria-label="Saved Kundalis"
                    >
                      <Bookmark size={13} />
                    </button>
                  )}

                  {/* Full Window / Maximize Toggle */}
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsFullWindow((prev) => !prev);
                    }} 
                    onPointerDown={(e) => e.stopPropagation()}
                    className="aura-ai-btn-icon"
                    title={isFullWindow ? "Restore compact window" : "Maximize to full window"}
                    aria-label={isFullWindow ? "Restore compact window" : "Maximize to full window"}
                  >
                    {isFullWindow ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                  </button>

                  {/* New Chat Button */}
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleNewChat();
                    }} 
                    onPointerDown={(e) => e.stopPropagation()}
                    className={`aura-ai-btn-icon aura-ai-btn-newchat ${isRefreshing ? "aura-ai-btn-refreshing" : ""}`} 
                    title="New Chat (पुरानी चैट ऑटोमैटिक सुरक्षित रहेगी)"
                    aria-label="New Chat"
                    disabled={isRefreshing}
                  >
                    <RotateCcw size={13} />
                  </button>

                  {/* Close Chat Button */}
                  <button 
                    type="button"
                    onClick={handleCloseChat} 
                    onPointerDown={(e) => e.stopPropagation()}
                    onTouchEnd={handleCloseChat}
                    className="aura-ai-btn-icon aura-ai-btn-close" 
                    title="Close / Band karein"
                    aria-label="Close Chat"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Toast when refreshing consultation */}
              <AnimatePresence>
                {showRefreshToast && (
                  <div className="aura-ai-refresh-toast">
                    <Sparkles size={13} className="aura-refresh-spinner" />
                    <span>Nayi Vedic Consultation taiyaar ho rahi hai...</span>
                  </div>
                )}
              </AnimatePresence>

              {/* Mode Selector Pill Bar with Smooth Sliding Animated Indicator */}
              <div className="aura-ai-mode-bar" style={{ position: "relative" }}>
                <button
                  onClick={() => {
                    triggerHaptic("light");
                    setMode("standard");
                  }}
                  className={`aura-ai-mode-btn ${mode === "standard" ? "active" : ""}`}
                  type="button"
                  style={{ position: "relative" }}
                >
                  {mode === "standard" && (
                    <motion.div
                      layoutId="activeAuraModeIndicator"
                      className="aura-ai-mode-active-pill"
                      transition={{ type: "spring", stiffness: 480, damping: 32 }}
                    />
                  )}
                  <span style={{ position: "relative", zIndex: 2, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <Sparkles size={11} /> ⚡ Quick AI
                  </span>
                </button>
                <button
                  onClick={() => {
                    triggerHaptic("light");
                    setMode("panditji");
                  }}
                  className={`aura-ai-mode-btn ${mode === "panditji" ? "active" : ""}`}
                  type="button"
                  style={{ position: "relative" }}
                >
                  {mode === "panditji" && (
                    <motion.div
                      layoutId="activeAuraModeIndicator"
                      className="aura-ai-mode-active-pill"
                      transition={{ type: "spring", stiffness: 480, damping: 32 }}
                    />
                  )}
                  <span style={{ position: "relative", zIndex: 2, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <span>🕉️</span> AI Panditji
                  </span>
                </button>
              </div>

              {/* Quick AI & Vedic Suggestion Strip with dynamic keywords & option transition animations */}
              <div className="aura-ai-nav-strip">
                <AnimatePresence mode="wait">
                  {mode === "panditji" ? (
                    <motion.div 
                      key="strip-panditji"
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 6 }}
                      transition={{ duration: 0.2 }}
                      style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                    >
                      <motion.button 
                        type="button"
                        whileHover={{ scale: 1.05, y: -1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleNewChat} 
                        className="aura-ai-strip-btn"
                        title="New Chat / Nayi Baat-cheet"
                        style={{ background: "#fef3c7", color: "#78350f", border: "1px solid #f59e0b", fontWeight: 700 }}
                      >
                        <RotateCcw size={10.5} />
                        <span>🔄 New Chat</span>
                      </motion.button>

                      <motion.button 
                        whileHover={{ scale: 1.05, y: -1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowBirthForm((prev) => !prev)} 
                        className={`aura-ai-strip-btn ${showBirthForm ? "active" : ""}`}
                        style={{ background: "#fef3c7", color: "#78350f", border: "1.5px solid #f59e0b", fontWeight: 700 }}
                      >
                        📋 {showBirthForm ? "✕ बंद करें" : "📋 Kundli Form"}
                      </motion.button>

                      <motion.button 
                        type="button"
                        whileHover={{ scale: 1.05, y: -1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowSavedKundaliModal(true)} 
                        className="aura-ai-strip-btn"
                        title="Saved Kundali Profiles"
                        style={{ background: "#fef3c7", color: "#78350f", border: "1px solid #f59e0b" }}
                      >
                        <Bookmark size={11} />
                        <span>💾 Saved Kundalis</span>
                      </motion.button>
                      <motion.button 
                        type="button"
                        whileHover={{ scale: 1.05, y: -1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowChatHistoryModal(true)} 
                        className="aura-ai-strip-btn"
                        title="View Past Consultations"
                      >
                        <History size={11} />
                        <span>📜 History</span>
                      </motion.button>
                      <motion.button 
                        type="button"
                        whileHover={{ scale: 1.05, y: -1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          fetchNotes();
                          setShowNotepad(true);
                        }}
                        className="aura-ai-strip-btn"
                        title="Spiritual Notes"
                      >
                        <Notebook size={11} />
                        <span>📝 Notes {notesList.length > 0 ? `(${notesList.length})` : ""}</span>
                      </motion.button>
                      {dynamicSuggestions.map((sug, idx) => (
                        <motion.button 
                          key={idx}
                          whileHover={{ scale: 1.05, y: -1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleSend(sug.query)} 
                          className="aura-ai-strip-btn"
                        >
                          {sug.label}
                        </motion.button>
                      ))}
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="strip-standard"
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 6 }}
                      transition={{ duration: 0.2 }}
                      style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                    >
                      <motion.button 
                        type="button"
                        whileHover={{ scale: 1.05, y: -1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleNewChat} 
                        className="aura-ai-strip-btn"
                        title="New Chat / Nayi Baat-cheet"
                        style={{ background: "#fdf3e3", color: "#8c2b10", border: "1px solid #d4af37", fontWeight: 700 }}
                      >
                        <RotateCcw size={10.5} />
                        <span>🔄 New Chat</span>
                      </motion.button>

                      <motion.button 
                        whileHover={{ scale: 1.05, y: -1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleSend("📦 Track my recent order status")} 
                        className="aura-ai-strip-btn"
                      >
                        📦 Track Order
                      </motion.button>
                      <motion.button 
                        whileHover={{ scale: 1.05, y: -1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleSend("🎁 Aaj ke active discount coupon codes batao")} 
                        className="aura-ai-strip-btn"
                      >
                        🎁 Today's Offers
                      </motion.button>
                      <motion.button 
                        type="button"
                        whileHover={{ scale: 1.05, y: -1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowChatHistoryModal(true)} 
                        className="aura-ai-strip-btn"
                        title="View Past Consultations"
                      >
                        <History size={11} />
                        <span>📜 History</span>
                      </motion.button>
                      <motion.button 
                        type="button"
                        whileHover={{ scale: 1.05, y: -1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          fetchNotes();
                          setShowNotepad(true);
                        }}
                        className="aura-ai-strip-btn"
                        title="Saved Notes"
                      >
                        <Notebook size={11} />
                        <span>📝 Notes {notesList.length > 0 ? `(${notesList.length})` : ""}</span>
                      </motion.button>
                      {dynamicSuggestions.map((sug, idx) => (
                        <motion.button 
                          key={idx}
                          whileHover={{ scale: 1.05, y: -1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleSend(sug.query)} 
                          className="aura-ai-strip-btn"
                        >
                          {sug.label}
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
                <button 
                  type="button" 
                  onClick={() => setIsFullWindow((prev) => !prev)} 
                  className="aura-ai-strip-btn aura-ai-strip-btn-link"
                >
                  {isFullWindow ? "Compact" : "Full Window"} <ChevronRight size={11} />
                </button>
              </div>

              {/* Persistent Active Kundali Profile Banner */}
              {mode === "panditji" && activeBirthDetails && activeBirthDetails.dob && (
                <div 
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 12px",
                    background: "linear-gradient(135deg, #FFFDF8 0%, #FEF3C7 100%)",
                    borderBottom: "1.5px solid #F59E0B",
                    fontSize: "11px",
                    color: "#78350F",
                    gap: "8px"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <span style={{ fontSize: "12px" }}>🕉️</span>
                    <span style={{ fontWeight: 700, color: "#8c2b10" }}>सक्रिय कुंडली:</span>
                    <span style={{ fontWeight: 600 }}>{activeBirthDetails.name || "Devotee"}</span>
                    <span style={{ opacity: 0.8, fontSize: "10.5px" }}>({activeBirthDetails.dob}{activeBirthDetails.birthTime ? ` ${activeBirthDetails.birthTime}` : ""}{activeBirthDetails.birthPlace ? ` • ${activeBirthDetails.birthPlace}` : ""})</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setBirthForm({
                          name: activeBirthDetails.name || "",
                          dob: activeBirthDetails.dob || "",
                          time: activeBirthDetails.birthTime || "",
                          place: activeBirthDetails.birthPlace || "",
                          concern: activeBirthDetails.concern || "career"
                        });
                        setShowBirthForm(true);
                      }}
                      style={{
                        background: "#FFFFFF",
                        border: "1px solid #D97706",
                        color: "#78350F",
                        borderRadius: "8px",
                        padding: "2px 6px",
                        fontSize: "10px",
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                      title="जन्म विवरण बदलें (Change Details)"
                    >
                      🔄 बदलें
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        auraChatStore.clearActiveBirthDetails();
                        setActiveBirthDetails(null);
                        emitToast("सक्रिय कुंडली हटा दी गई", "info");
                      }}
                      style={{
                        background: "#FEE2E2",
                        border: "1px solid #EF4444",
                        color: "#991B1B",
                        borderRadius: "8px",
                        padding: "2px 6px",
                        fontSize: "10px",
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                      title="कुंडली हटाएं (Delete Kundali)"
                    >
                      🗑️ हटाएं
                    </button>
                  </div>
                </div>
              )}

              {/* Interactive Kundli Birth Details Form Card for AI Panditji */}
              <AnimatePresence>
                {showBirthForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -6 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -6 }}
                    style={{
                      background: "linear-gradient(135deg, #FFFDF8 0%, #FAF3E6 100%)",
                      borderBottom: "2px solid #D4AF37",
                      padding: "12px 14px",
                      boxShadow: "0 4px 12px rgba(74, 14, 23, 0.12)",
                      position: "relative",
                      zIndex: 15
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", borderBottom: "1px dashed #e8d0b5", paddingBottom: "6px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 700, color: "#4A0E17" }}>
                        <span>🕉️</span>
                        <span>पंडित जी हेतु जन्म विवरण (Vedic Birth Details)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowBirthForm(false)}
                        style={{ background: "none", border: "none", fontSize: "11px", color: "#8a6014", cursor: "pointer", fontWeight: 600 }}
                      >
                        ✕ बंद करें
                      </button>
                    </div>

                    <form onSubmit={handleBirthFormSubmit}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                        <div>
                          <label style={{ display: "block", fontSize: "10.5px", fontWeight: 700, color: "#4A0E17", marginBottom: "2px" }}>
                            आपका नाम (Name) *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="उदा. राहुल शर्मा"
                            value={birthForm.name}
                            onChange={(e) => setBirthForm({ ...birthForm, name: e.target.value })}
                            style={{ width: "100%", padding: "5px 8px", border: "1px solid #d4af37", borderRadius: "5px", fontSize: "11.5px", background: "#fff", color: "#333", outline: "none" }}
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: "10.5px", fontWeight: 700, color: "#4A0E17", marginBottom: "2px" }}>
                            जन्म तिथि (DOB) *
                          </label>
                          <input
                            type="date"
                            required
                            value={birthForm.dob}
                            onChange={(e) => setBirthForm({ ...birthForm, dob: e.target.value })}
                            style={{ width: "100%", padding: "4px 6px", border: "1px solid #d4af37", borderRadius: "5px", fontSize: "11.5px", background: "#fff", color: "#333", outline: "none" }}
                          />
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                        <div>
                          <label style={{ display: "block", fontSize: "10.5px", fontWeight: 700, color: "#4A0E17", marginBottom: "2px" }}>
                            जन्म स्थान (City) *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="उदा. जयपुर, राजस्थान"
                            value={birthForm.place}
                            onChange={(e) => setBirthForm({ ...birthForm, place: e.target.value })}
                            style={{ width: "100%", padding: "5px 8px", border: "1px solid #d4af37", borderRadius: "5px", fontSize: "11.5px", background: "#fff", color: "#333", outline: "none" }}
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: "10.5px", fontWeight: 700, color: "#4A0E17", marginBottom: "2px" }}>
                            जन्म समय (Birth Time) *
                          </label>
                          <input
                            type="time"
                            required
                            value={birthForm.time}
                            onChange={(e) => setBirthForm({ ...birthForm, time: e.target.value })}
                            style={{ width: "100%", padding: "4px 6px", border: "1px solid #d4af37", borderRadius: "5px", fontSize: "11.5px", background: "#fff", color: "#333", outline: "none" }}
                          />
                        </div>
                      </div>

                      <div style={{ marginBottom: "10px" }}>
                        <label style={{ display: "block", fontSize: "10.5px", fontWeight: 700, color: "#4A0E17", marginBottom: "2px" }}>
                          मुख्य संकल्प / समस्या (Primary Concern)
                        </label>
                        <select
                          value={birthForm.concern}
                          onChange={(e) => setBirthForm({ ...birthForm, concern: e.target.value })}
                          style={{ width: "100%", padding: "5px 8px", border: "1px solid #d4af37", borderRadius: "5px", fontSize: "11px", background: "#fff", color: "#333", outline: "none" }}
                        >
                          <option value="all">🌟 संपूर्ण जीवन मार्गदर्शन (All Concerns - Complete Life Guidance)</option>
                          <option value="career">⚡ नौकरी, पदोन्नति व नेतृत्व (Career & Leadership)</option>
                          <option value="business">💼 व्यापार, दुकान व व्यवसाय वृद्धि (Business & Trade)</option>
                          <option value="finance">💰 धन समृद्धि, बचत व ऋण मुक्ति (Wealth & Debt Relief)</option>
                          <option value="health">🩺 स्वास्थ्य, ऊर्जा व दीर्घायु (Health & Vitality)</option>
                          <option value="peace">🧘 मानसिक शांति, एकाग्रता व तनाव मुक्ति (Mental Peace & Focus)</option>
                          <option value="marriage">❤️ विवाह, शीघ्र रिश्ता व दांपत्य सुख (Marriage & Harmony)</option>
                          <option value="love">💑 प्रेम संबंध व आकर्षण (Love & Relationships)</option>
                          <option value="family">🏠 पारिवारिक शांति व सद्भाव (Family Peace & Unity)</option>
                          <option value="children">👶 संतान सुख व बच्चों का कल्याण (Children & Progeny)</option>
                          <option value="education">📚 विद्या, पढ़ाई, परीक्षा व स्मरण शक्ति (Education & Memory)</option>
                          <option value="property">🏢 भूमि, भवन, घर व वाहन सुख (Property & Real Estate)</option>
                          <option value="foreign_travel">✈️ विदेश यात्रा, वीजा व विदेश योग (Foreign Travel & Settlement)</option>
                          <option value="legal">⚖️ कोर्ट-कचहरी, शत्रु व कानूनी विजय (Legal Victory & Protection)</option>
                          <option value="shani_dosha">🛡️ शनि साढ़े साती, ढैया व राहु-केतु शांति (Dosha Shanti)</option>
                          <option value="spiritual">🕉️ आध्यात्मिक उन्नति, साधना व शिव कृपा (Moksha & Spiritual Growth)</option>
                          <option value="general">🌸 सर्वकल्याण, रक्षा व सकारात्मक ऊर्जा (General Well-being & Luck)</option>
                          <option value="custom">✍️ अन्य विशेष संकल्प (Custom Concern)</option>
                        </select>

                      </div>

                      <button
                        type="submit"
                        style={{
                          width: "100%",
                          padding: "7px 10px",
                          background: "linear-gradient(135deg, #a54d2b 0%, #7d3318 100%)",
                          color: "#ffffff",
                          border: "1px solid #ffd700",
                          borderRadius: "6px",
                          fontSize: "11.5px",
                          fontWeight: 700,
                          cursor: "pointer",
                          boxShadow: "0 2px 6px rgba(165, 77, 43, 0.25)"
                        }}
                      >
                        🙏 पंडित जी को कुंडली भेजें (Analyze Kundli)
                      </button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Messages Body with Date & Time dividers & Smooth Refresh Transitions */}
              <div 
                ref={bodyScrollRef}
                onScroll={handleScroll}
                onWheel={handleWheel}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                className={`aura-ai-body ${
                  refreshPhase === "fading-out" 
                    ? "aura-ai-refresh-fading-out" 
                    : refreshPhase === "fading-in" 
                    ? "aura-ai-refresh-fading-in" 
                    : ""
                }`}
              >
                {messages.map((m, index) => {
                  // Session divider
                  if (m.type === "session_divider") {
                    return (
                      <div key={m.id || index} className="aura-ai-session-divider">
                        <div className="aura-ai-session-divider-line" />
                        <span className="aura-ai-session-divider-label">
                          <Sparkles size={11} /> {m.text || "New Consultation Started"}
                        </span>
                        <div className="aura-ai-session-divider-line" />
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
                        <div className="aura-ai-date-divider">
                          <span>{currentDateGroup}</span>
                        </div>
                      )}

                      <motion.div 
                        id={m.id} 
                        initial={{ opacity: 0, y: 12, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                        className={`aura-ai-msg ${m.sender === "user" ? "aura-ai-msg-user" : "aura-ai-msg-ai"}`}
                      >
                        {m.sender === "ai" && (
                          <div className="aura-ai-msg-avatar">
                            <Sparkles size={13} />
                          </div>
                        )}
                        <div className="aura-ai-msg-content">
                          <div className="aura-ai-msg-text">
                            {!m.text && m.sender === "ai" ? (
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#8c2b10", fontWeight: "600", padding: "2px 0" }}>
                                <Sparkles size={13} className="animate-spin" style={{ color: "#d4af37" }} />
                                <span>💭 विश्लेषण चल रहा है (Thinking...)...</span>
                              </div>
                            ) : (
                              <AuraAIMessageContent 
                                text={customerSafeAiText(stripAuraKeywords(m.text))} 
                                sender={m.sender} 
                                fullKundaliData={m.kundali}
                                birthData={m.kundali?.verifiedBirthData}
                              />
                            )}
                          </div>
                          {m.sender === "ai" && m.text && (
                            <div style={{ marginTop: "4px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                              <VoiceReader text={customerSafeAiText(stripAuraKeywords(m.text))} />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleContinueChat(m, 0, 10);
                                }}
                                disabled={loading && activeAiMsgIdRef.current === m.id}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  padding: "4px 10px",
                                  borderRadius: "14px",
                                  background: (loading && activeAiMsgIdRef.current === m.id)
                                    ? "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)"
                                    : "linear-gradient(135deg, #FFF7ED 0%, #FEF3C7 100%)",
                                  color: "#8C2B10",
                                  border: "1.5px solid #D97706",
                                  cursor: (loading && activeAiMsgIdRef.current === m.id) ? "wait" : "pointer",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  boxShadow: "0 1px 4px rgba(217, 119, 6, 0.18)",
                                  transition: "all 0.2s ease",
                                  userSelect: "none"
                                }}
                                title="उत्तर को जहाँ से रुका है, वहाँ से आगे शुरू करें (ऑटोमैटिक 10 बार तक / Auto continue up to 10 passes)"
                              >
                                <Sparkles size={11} className={(loading && activeAiMsgIdRef.current === m.id) ? "animate-spin text-amber-600" : "text-amber-700"} />
                                <span>
                                  {(loading && activeAiMsgIdRef.current === m.id)
                                    ? `शुरू है (${activePassCount || 1}/10)...`
                                    : "✨ शुरू करें (पूरा करें)"}
                                </span>
                              </button>
                            </div>
                          )}


                          {/* Authentic Vedic Kundli Result Card */}
                          {m.kundali && (
                            <div className="aura-ai-kundali-card">
                              <div className="aura-ai-kundali-header">
                                <span className="aura-ai-om">🕉️</span>
                                <div>
                                  <h4 className="aura-ai-kundali-title">
                                    {m.kundali.devoteeName ? `श्री ${m.kundali.devoteeName} जी का वैदिक परामर्श` : "वैदिक जन्म पत्रिका विश्लेषण"}
                                  </h4>
                                  <div className="aura-ai-kundali-subtitle">
                                    {m.kundali.dob && `जन्म: ${m.kundali.dob}`} {m.kundali.birthTime ? `• ${m.kundali.birthTime}` : ""} {m.kundali.birthPlace ? `• ${m.kundali.birthPlace}` : ""}
                                  </div>
                                </div>
                              </div>

                              <div className="aura-ai-kundali-grid">
                                {/* Lagna / Ascendant */}
                                {(m.kundali.lagna?.rashiHindi || m.kundali.lagnaRashiHindi) && (
                                  <div className="aura-ai-kundali-cell">
                                    <span className="aura-ai-cell-label">लग्न (Ascendant)</span>
                                    <span className="aura-ai-cell-val">
                                      {m.kundali.lagna?.rashiSymbol || "🚩"} {m.kundali.lagna?.rashiHindi || m.kundali.lagnaRashiHindi}
                                      {(m.kundali.lagna?.degree || m.kundali.lagnaDegree) ? ` (${m.kundali.lagna?.degree || m.kundali.lagnaDegree})` : ""}
                                    </span>
                                  </div>
                                )}

                                {/* Chandra Rashi */}
                                {(m.kundali.chandraRashi?.rashiHindi || m.kundali.rashiHindi) && (
                                  <div className="aura-ai-kundali-cell">
                                    <span className="aura-ai-cell-label">चंद्र राशि (Moon Sign)</span>
                                    <span className="aura-ai-cell-val">
                                      {m.kundali.chandraRashi?.rashiSymbol || m.kundali.symbol || "🌙"} {m.kundali.chandraRashi?.rashiHindi || m.kundali.rashiHindi}
                                      {(m.kundali.chandraRashi?.rashiEnglish || m.kundali.rashiEng) ? ` (${m.kundali.chandraRashi?.rashiEnglish || m.kundali.rashiEng})` : ""}
                                      {(m.kundali.chandraRashi?.degree || m.kundali.chandraDegree) ? ` ${m.kundali.chandraRashi?.degree || m.kundali.chandraDegree}` : ""}
                                    </span>
                                  </div>
                                )}

                                {/* Nakshatra + Pada */}
                                {(m.kundali.chandraRashi?.nakshatra || m.kundali.nakshatra) && (
                                  <div className="aura-ai-kundali-cell">
                                    <span className="aura-ai-cell-label">नक्षत्र व पद</span>
                                    <span className="aura-ai-cell-val">
                                      {m.kundali.chandraRashi?.nakshatra || m.kundali.nakshatra}
                                      {(m.kundali.chandraRashi?.pada || m.kundali.pada) ? ` (पद ${m.kundali.chandraRashi?.pada || m.kundali.pada})` : ""}
                                    </span>
                                  </div>
                                )}

                                {/* Surya Rashi */}
                                {(m.kundali.suryaRashi?.rashiHindi || m.kundali.suryaRashiHindi) && (
                                  <div className="aura-ai-kundali-cell">
                                    <span className="aura-ai-cell-label">सूर्य राशि (Sun Sign)</span>
                                    <span className="aura-ai-cell-val">
                                      ☀️ {m.kundali.suryaRashi?.rashiHindi || m.kundali.suryaRashiHindi}
                                      {(m.kundali.suryaRashi?.degree || m.kundali.suryaDegree) ? ` (${m.kundali.suryaRashi?.degree || m.kundali.suryaDegree})` : ""}
                                    </span>
                                  </div>
                                )}

                                {/* Lord */}
                                {(m.kundali.chandraRashi?.lord || m.kundali.lord) && (
                                  <div className="aura-ai-kundali-cell">
                                    <span className="aura-ai-cell-label">स्वामी ग्रह</span>
                                    <span className="aura-ai-cell-val">{m.kundali.chandraRashi?.lord || m.kundali.lord}</span>
                                  </div>
                                )}

                                {/* Mahadasha */}
                                {(m.kundali.vimshottariDasha?.currentMahadashaHindi || m.kundali.mahadashaHindi) && (
                                  <div className="aura-ai-kundali-cell">
                                    <span className="aura-ai-cell-label">विंशोत्तरी दशा</span>
                                    <span className="aura-ai-cell-val">
                                      {m.kundali.vimshottariDasha?.currentMahadashaHindi || m.kundali.mahadashaHindi} महादशा
                                      {(m.kundali.vimshottariDasha?.currentAntardashaHindi || m.kundali.antardashaHindi) ? ` (${m.kundali.vimshottariDasha?.currentAntardashaHindi || m.kundali.antardashaHindi} अंतर)` : ""}
                                    </span>
                                  </div>
                                )}

                                {/* Mulank */}
                                {m.kundali.mulank && (
                                  <div className="aura-ai-kundali-cell">
                                    <span className="aura-ai-cell-label">मूलांक (Mulank)</span>
                                    <span className="aura-ai-cell-val">अंक {m.kundali.mulank}</span>
                                  </div>
                                )}
                              </div>

                              {/* Planetary Placements Table / Badges if available */}
                              {Array.isArray(m.kundali.planets) && m.kundali.planets.length > 0 && (
                                <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px dashed rgba(212, 160, 23, 0.3)" }}>
                                  <div className="aura-ai-cell-label" style={{ marginBottom: "4px", fontWeight: 700, color: "#8b5a2b" }}>ग्रह स्थिति (Planetary Placements):</div>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                                    {m.kundali.planets.map((p, pIdx) => (
                                      <span key={pIdx} style={{ fontSize: "10.5px", background: "rgba(251, 247, 238, 0.9)", border: "1px solid #e2d1a6", borderRadius: "4px", padding: "2px 6px", color: "#4a3b2c" }}>
                                        <b>{p.englishName || p.name}:</b> {p.rashiHindi || p.rashi} ({p.degreeInSign || p.degree || "—"}) - भाव {p.houseNumber || "—"}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Rudraksha Recommendations */}
                              {((Array.isArray(m.kundali.rudrakshaRecommendations) && m.kundali.rudrakshaRecommendations.length > 0) || m.kundali.recommendedMukhi) && (() => {
                                const primaryMukhi = m.kundali.rudrakshaRecommendations?.[0]?.mukhi || m.kundali.recommendedMukhi;
                                const primaryMantra = m.kundali.rudrakshaRecommendations?.[0]?.beejMantra || m.kundali.beejMantra;
                                const secondaryRecs = Array.isArray(m.kundali.rudrakshaRecommendations) ? m.kundali.rudrakshaRecommendations.slice(1) : [];

                                return (
                                  <div className="aura-ai-kundali-rec">
                                    <div className="aura-ai-rec-header" style={{ fontSize: "12.5px", fontWeight: 700, color: "#92400e", marginBottom: "4px" }}>
                                      ★ आपकी Kundali के अनुसार मुख्य Rudraksha: <span style={{ color: "#78350f" }}>{primaryMukhi}</span>
                                    </div>
                                    {primaryMantra && (
                                      <div className="aura-ai-rec-mantra" style={{ fontSize: "11.5px", color: "#5c2a0c" }}>
                                        📿 मुख्य बीज मंत्र: <b>{primaryMantra}</b>
                                      </div>
                                    )}
                                    {m.kundali.wearingDay && (
                                      <div className="aura-ai-rec-day" style={{ marginTop: "2px", fontSize: "11px", color: "#6b2a0c" }}>
                                        🗓️ धारण वार: <b>{m.kundali.wearingDay}</b>
                                      </div>
                                    )}
                                    {secondaryRecs.length > 0 && (
                                      <div style={{ marginTop: "6px", paddingTop: "5px", borderTop: "1px dashed rgba(212, 175, 55, 0.3)" }}>
                                        <div style={{ fontSize: "10.5px", fontWeight: 600, color: "#8a6014" }}>पूरक मार्गदर्शन (Complementary Guidance):</div>
                                        {secondaryRecs.map((rec, rIdx) => (
                                          <div key={rIdx} style={{ fontSize: "11px", color: "#7d3318" }}>
                                            • <b>{rec.role || "विशेष प्रयोजन"}:</b> {rec.mukhi}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          )}

                          {/* Product Recommendations Vertical Compact List (No Horizontal Scroll) */}
                          {m.products && m.products.length > 0 && (
                            <div className="aura-ai-prods-reel">
                              <div className="aura-ai-prods-title">
                                <Sparkles size={12} /> Recommended for you:
                              </div>
                              <div className="aura-ai-prods-list">
                                {m.products.filter(p => p && typeof p === "object").slice(0, 3).map((p, pIdx) => {
                                  const pId = p.id || p._id || p.slug || `prod-${pIdx}`;
                                  const isAdded = addedItems[pId];
                                  const priceNum = Math.max(0, safePrice(p.price, 0));
                                  const realMrp = Math.max(0, safePrice(p.comparePrice || p.mrp, 0));
                                  const discountPercent = realMrp > priceNum && realMrp > 0
                                    ? Math.round(((realMrp - priceNum) / realMrp) * 100)
                                    : 0;
                                  const oos = Number(p.stock) <= 0 && p.stock !== undefined;
                                  const realImg = getProductPrimaryImage(p);
                                  const pName = p.name || "Sacred Himalayan Rudraksha";

                                  return (
                                    <div key={pId} className="aura-ai-prod-card-row">
                                      <div className="aura-ai-prod-img-wrap">
                                        <img
                                          src={realImg}
                                          alt={pName}
                                          className="aura-ai-prod-img"
                                          referrerPolicy="no-referrer"
                                          loading="lazy"
                                          onError={(e) => { if (!e.target.src.includes("product-5mukhi.jpg")) e.target.src = "/images/placeholder.svg"; }}
                                        />
                                        {discountPercent > 0 && (
                                          <span className="aura-ai-prod-disc">
                                            {discountPercent}%
                                          </span>
                                        )}
                                      </div>
                                      <div className="aura-ai-prod-info">
                                        <h4 className="aura-ai-prod-name" title={pName}>{pName}</h4>
                                        <div className="aura-ai-prod-meta">
                                          <span className="aura-ai-prod-price">₹{priceNum.toLocaleString('en-IN')}</span>
                                          {discountPercent > 0 && (
                                            <span className="aura-ai-prod-mrp">₹{realMrp.toLocaleString('en-IN')}</span>
                                          )}
                                          {Number(p.rating) > 0 && (
                                            <span className="aura-ai-prod-rating">★ {Number(p.rating)}</span>
                                          )}
                                          <span className={`aura-ai-prod-stock ${oos ? "oos" : ""}`} style={oos ? { color: "#c62828" } : undefined}>
                                            {oos ? "Out of Stock" : "In Stock"}
                                          </span>
                                        </div>
                                        <div className="aura-ai-prod-actions">
                                          <Link
                                            to={getProductRoute(p)}
                                            onClick={() => setIsOpen(false)}
                                            className="aura-ai-prod-btn-view"
                                          >
                                            <Eye size={10} /> View
                                          </Link>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              triggerHaptic("light");
                                              setOrderModalProduct(p);
                                            }}
                                            disabled={oos}
                                            style={oos ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                                            className="aura-ai-prod-btn-buy"
                                            title="Order directly in chat"
                                          >
                                            <Sparkles size={10} /> Order
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              triggerHaptic("medium");
                                              handleAddToCart(p);
                                            }}
                                            disabled={oos}
                                            style={oos ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                                            className={`aura-ai-prod-btn-add ${isAdded ? "added" : ""}`}
                                          >
                                            {isAdded ? (
                                              <><Check size={10} /> Added</>
                                            ) : oos ? (
                                              "Sold Out"
                                            ) : (
                                              <><ShoppingCart size={10} /> Add</>
                                            )}
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Active Coupons Chip in Chat */}
                          {m.coupons && m.coupons.length > 0 && (
                            <div className="aura-ai-coupons-box">
                              {m.coupons.map((c, ci) => (
                                <div key={ci} className="aura-ai-coupon-card">
                                  <div className="aura-ai-coupon-left">
                                    <Tag size={15} className="aura-ai-tag-icon" />
                                    <div>
                                      <div className="aura-ai-coupon-code">{c.code}</div>
                                      <div className="aura-ai-coupon-desc">
                                        {c.type === "percentage" ? `${c.discount}% OFF` : `Flat ₹${c.discount} OFF`}
                                      </div>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleApplyCoupon(c.code)}
                                    className={`aura-ai-coupon-btn ${appliedCoupon === c.code ? "applied" : ""}`}
                                  >
                                    {appliedCoupon === c.code ? "Applied ✓" : "Apply Coupon"}
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Order Info Card if tracked */}
                          {m.orderInfo && (
                            <div className="aura-ai-order-tracker">
                              <div className="aura-ai-order-header">
                                <Package size={15} />
                                <strong>Order #{m.orderInfo.id || m.orderInfo.orderId}</strong>
                                <span className="aura-ai-order-status-badge">{m.orderInfo.status || "In Transit"}</span>
                              </div>
                              <div className="aura-ai-order-details">
                                <div>Amount: <b>₹{m.orderInfo.finalAmount || m.orderInfo.total}</b></div>
                                <div>Payment: <b>{m.orderInfo.paymentStatus || "Paid"}</b></div>
                              </div>
                              <Link 
                                to={`/account/orders`} 
                                onClick={() => setIsOpen(false)}
                                className="aura-ai-order-link"
                              >
                                View Order Details <ChevronRight size={13} />
                              </Link>
                            </div>
                          )}

                          {/* Human Support Escalation */}
                          {m.requiresHuman && (
                            <div className="aura-ai-support-escalation">
                              <div className="aura-ai-support-title">
                                <PhoneCall size={14} /> Need Human Spiritual Guidance?
                              </div>
                              <p>Connect with our expert Rudraksha consultants directly:</p>
                              <div className="aura-ai-support-btns">
                                <a
                                  href="https://wa.me/919672996531?text=Namaste,%20I%20need%20help%20with%20Aura%20Rudraksha%20selection"
                                  target="_blank"
                                  rel="noreferrer"
                                  className="aura-ai-btn-wa"
                                >
                                  Chat on WhatsApp
                                </a>
                                <a href="tel:+919672996531" className="aura-ai-btn-call">
                                  Call Support
                                </a>
                              </div>
                            </div>
                          )}

                          {/* Quick Reply Chips with Spring Transitions */}
                          {index === messages.length - 1 && m.quickReplies && m.quickReplies.length > 0 && (
                            <div className="aura-ai-quick-chips">
                              {m.quickReplies.map((q, qi) => (
                                <motion.button
                                  key={qi}
                                  type="button"
                                  whileHover={{ scale: 1.05, y: -1 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSend(q);
                                  }}
                                  className="aura-ai-chip-btn"
                                >
                                  {q}
                                </motion.button>
                              ))}
                            </div>
                          )}

                          {/* AURA_KEYWORDS Interactive Suggested Search Chips with animated transitions */}
                          {m.sender === "ai" && (() => {
                            const parsedKws = parseAuraKeywords(m.text || "");
                            const isLastAi = index === messages.length - 1;
                            let effectiveKws = parsedKws;
                            if (!effectiveKws.length && isLastAi && !loading) {
                              const canonicalMukhi = m.kundali?.rudrakshaRecommendations?.[0]?.mukhi || m.kundali?.recommendedMukhi;
                              if (canonicalMukhi) {
                                effectiveKws = [
                                  `📿 ${canonicalMukhi} धारण विधि व बीज मंत्र`,
                                  `🪐 कुंडली अनुसार ${canonicalMukhi} लाभ`,
                                  `🛍️ सिद्ध ${canonicalMukhi} स्टोर में देखें`,
                                  `✨ विंशोत्तरी महादशा व ग्रह उपाय`
                                ];
                              } else if (mode === "panditji") {
                                effectiveKws = ["विवाह योग और विवाह का समय", "करियर और सरकारी नौकरी", "धन और आर्थिक स्थिति", "महादशा और अंतर्दशा"];
                              } else {
                                effectiveKws = ["सिद्ध 1 से 14 मुखी रुद्राक्ष", "आज के एक्टिव डिस्काउंट कूपन", "ऑर्डर डिलीवरी व ट्रैकिंग", "100% X-Ray लैब सर्टिफिकेट"];
                              }
                            }
                            if (!effectiveKws.length) return null;
                            return (
                              <div className="aura-ai-keyword-chips-wrap" style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px dashed rgba(212, 175, 55, 0.3)" }}>
                                <div style={{ fontSize: "10.5px", color: "#8a6014", fontWeight: 700, marginBottom: "5px", display: "flex", alignItems: "center", gap: "4px" }}>
                                  <span>🔍</span> <span>सुझावित विषय व आगे का परामर्श (Suggested Actions):</span>
                                </div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                  {effectiveKws.map((kw, ki) => (
                                    <motion.button
                                      key={ki}
                                      type="button"
                                      whileHover={{ scale: 1.05, y: -1 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSend(kw);
                                      }}
                                      style={{
                                        padding: "4px 10px",
                                        background: "linear-gradient(135deg, #FFFDF8, #FBF3E4)",
                                        border: "1px solid #D4AF37",
                                        borderRadius: "20px",
                                        fontSize: "11px",
                                        fontWeight: 600,
                                        color: "#6b2a0c",
                                        cursor: "pointer",
                                        boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
                                      }}
                                    >
                                      🔎 {kw}
                                    </motion.button>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}

                          {/* Message Time & Action Toolbar (Copy & WhatsApp Share) */}
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px", marginTop: "4px" }}>
                            {timeString && (
                              <div className="aura-ai-msg-time">
                                {timeString}
                              </div>
                            )}

                            {m.sender === "ai" && (
                              <div style={{ display: "flex", alignItems: "center", gap: "5px", marginLeft: "auto", flexWrap: "wrap" }}>
                                {isAuraResponseIncomplete(m.text, mode) && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleContinueChat(m, 0, 10);
                                    }}
                                    disabled={loading && activeAiMsgIdRef.current === m.id}
                                    style={{
                                      padding: "4px 10px",
                                      background: "linear-gradient(135deg, #FFF7ED, #FEF3C7)",
                                      border: "1.5px solid #D97706",
                                      borderRadius: "14px",
                                      fontSize: "11px",
                                      color: "#8c2b10",
                                      fontWeight: 700,
                                      cursor: "pointer",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "4px",
                                      boxShadow: "0 2px 6px rgba(217, 119, 6, 0.25)",
                                      transition: "all 0.15s ease"
                                    }}
                                    title="उत्तर जहाँ से रुका है, वहीं से आगे पूरा करें (Continue response from cutoff - 10 passes)"
                                  >
                                    <Sparkles size={11} className={(loading && activeAiMsgIdRef.current === m.id) ? "animate-spin" : ""} style={{ color: "#d97706" }} />
                                    <span>{(loading && activeAiMsgIdRef.current === m.id) ? `जारी है (${activePassCount || 1}/10)...` : "✨ उत्तर आगे पूरा करें"}</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    auraChatStore.copyChatToClipboard([m]);
                                    emitToast("📋 उत्तर कॉपी हो गया (Copied)", "success");
                                  }}
                                  style={{
                                    padding: "3px 7px",
                                    background: "rgba(0,0,0,0.04)",
                                    border: "1px solid rgba(0,0,0,0.09)",
                                    borderRadius: "4px",
                                    fontSize: "10.5px",
                                    color: "#555",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "3px"
                                  }}
                                  title="उत्तर कॉपी करें (Copy answer)"
                                >
                                  <Copy size={11} /> <span>कॉपी</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    auraChatStore.shareChatOnWhatsApp([m]);
                                  }}
                                  style={{
                                    padding: "3px 7px",
                                    background: "rgba(37, 211, 102, 0.12)",
                                    border: "1px solid rgba(37, 211, 102, 0.35)",
                                    borderRadius: "4px",
                                    fontSize: "10.5px",
                                    color: "#075e54",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "3px"
                                  }}
                                  title="WhatsApp पर शेयर करें (Share on WhatsApp)"
                                >
                                  <Share2 size={11} /> <span>शेयर</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    </React.Fragment>
                  );
                })}


                {loading && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="aura-ai-msg aura-ai-msg-ai"
                  >
                    <div className="aura-ai-msg-avatar">
                      <Sparkles size={13} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "5px", alignItems: "flex-start" }}>
                      <div className="aura-ai-typing-bubble" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px" }}>
                        <span className="dot" />
                        <span className="dot" />
                        <span className="dot" />
                        <span style={{ fontSize: "11px", color: "#8c2b10", fontWeight: "700", marginLeft: "4px" }}>
                          💭 विश्लेषण चल रहा है (Thinking...)...
                        </span>
                      </div>
                      <div className="aura-ai-status-text" style={{ fontSize: "11px", color: "#8c2b10", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "5px", background: "linear-gradient(135deg, #FFFDF8, #FBF3E4)", padding: "4px 10px", borderRadius: "14px", border: "1px solid rgba(212, 175, 55, 0.4)", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                        <span>💭 {statusText || "विश्लेषण व गणना जारी है..."}</span>
                        {elapsedTime > 0 && <span style={{ opacity: 0.7, fontSize: "10px" }}>({elapsedTime}s)</span>}
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Footer */}
              <div className="aura-ai-footer">
                <form 
                  onSubmit={e => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="aura-ai-input-box"
                >
                  <button
                    type="button"
                    onClick={handleMicToggle}
                    className={`aura-ai-mic-btn ${isListening ? "listening" : ""}`}
                    title={isListening ? "Stop listening" : "Voice input"}
                    aria-label="Voice input"
                  >
                    {isListening ? <MicOff size={13} className="aura-ai-mic-pulse" /> : <Mic size={13} />}
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
                    placeholder={
                      isListening
                        ? "Listening... boliyen..."
                        : mode === "panditji"
                        ? "Poochiye Panditji se — Rashi, Rudraksha, Dharan Vidhi..."
                        : "Poochiye — jaise '₹1000 ke andar Rudraksha'..."
                    }
                    rows={1}
                    className="aura-ai-input-field aura-ai-textarea"
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
                      className="aura-ai-send-btn"
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
                      className="aura-ai-send-btn"
                      aria-label="Send message"
                    >
                      <Send size={15} />
                    </button>
                  )}
                </form>
                {errorOccurred && lastUserQuery && (
                  <div className="aura-ai-retry-banner" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", padding: "6px 12px", background: "#fef2f2", borderTop: "1px solid #fee2e2", fontSize: "11px", color: "#991b1b" }}>
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
                <div className="aura-ai-privacy-note">
                  <ShieldCheck size={11} /> {mode === "panditji" ? "Authentic Vedic & Astrological Guidance" : "Secure shopping assistance • Authentic Vedic guidance"}
                </div>
              </div>
            </motion.div>
          </motion.div>
          </React.Fragment>
        )}
      </AnimatePresence>

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

      {/* Spiritual & Shopping Notepad Modal */}
      <AnimatePresence>
        {showNotepad && (
          <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              className="w-full max-w-md bg-[#fdfaf5] border border-[#dfcfbc] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#8c2b10] to-[#5c1c0a] text-white">
                <div className="flex items-center gap-2">
                  <Notebook size={16} className="text-amber-300" />
                  <h3 className="text-sm font-bold tracking-wide">
                    {mode === "panditji" ? "📝 आध्यात्मिक डायरी (Vedic Notepad)" : "📝 Shopping Notes & Reminders"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNotepad(false)}
                  className="p-1 rounded-full hover:bg-white/10 transition-colors text-amber-100"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Add Note Input */}
              <div className="p-3 bg-white border-b border-[#e5d2b8] flex gap-2">
                <input
                  type="text"
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddNote();
                  }}
                  placeholder={
                    mode === "panditji"
                      ? "उदा. 5 मुखी नेपाल रुद्राक्ष - धनु राशि..."
                      : "Add a note or reminder for AI..."
                  }
                  className="flex-1 px-3 py-1.5 text-xs border border-[#dfcfbc] rounded-lg bg-[#fbf7ee] text-[#2b1408] outline-none focus:border-[#8c2b10]"
                />
                <button
                  type="button"
                  onClick={handleAddNote}
                  className="px-3 py-1.5 bg-[#8c2b10] text-white text-xs font-semibold rounded-lg hover:bg-[#6a200a] transition-colors flex items-center gap-1"
                >
                  <Plus size={13} />
                  <span>Save</span>
                </button>
              </div>

              {/* Notes List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[160px]">
                {loadingNotes ? (
                  <div className="text-center py-6 text-xs text-amber-800 animate-pulse">
                    Loading saved notes...
                  </div>
                ) : notesList.length === 0 ? (
                  <div className="text-center py-8 text-xs text-amber-800/70">
                    <p>No notes saved yet.</p>
                    <p className="mt-1 text-[11px]">Save key preferences, Rudraksha recommendations, or reminders here!</p>
                  </div>
                ) : (
                  notesList.map((note, idx) => (
                    <div
                      key={note.memoryKey || idx}
                      className="flex items-start justify-between gap-2 p-2.5 bg-white border border-[#ebdccb] rounded-xl shadow-sm text-xs text-[#2b1408]"
                    >
                      <div className="flex-1">
                        <p className="font-medium leading-relaxed">{note.memoryValue}</p>
                        <span className="text-[10px] text-amber-800/60 font-mono">
                          {note.category || "note"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteNote(note.memoryKey)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete note"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Footer info */}
              <div className="px-4 py-2 bg-[#f4ebd9] border-t border-[#e5d2b8] text-[11px] text-[#5c3014] text-center">
                ✨ Saved notes are automatically referenced by AI Pandit Ji in future conversations.
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Chat History Modal */}
      <AuraAIChatHistoryModal

        isOpen={showChatHistoryModal}
        onClose={() => setShowChatHistoryModal(false)}
        currentMode={mode}
        onSelectSession={(session) => {
          if (session?.id) {
            auraChatStore.setConversationId(session.id);
            setConversationId(session.id);
          }
          if (session?.messages) {
            setMessages(session.messages);
            auraChatStore.saveMessages(session.messages, mode);
          }
        }}
      />

      {/* Saved Kundalis Modal */}
      <AuraAISavedKundaliModal
        isOpen={showSavedKundaliModal}
        onClose={() => setShowSavedKundaliModal(false)}
        onSelectKundali={(prof) => {
          setShowSavedKundaliModal(false);
          const devoteeName = prof.name || prof.devoteeName || "Devotee";
          const dob = prof.dob || "";
          const birthTime = prof.birthTime || prof.time || "12:00";
          const birthPlace = prof.birthPlace || prof.place || "";
          const concern = prof.concern || "all";

          setBirthForm({
            name: devoteeName,
            dob,
            place: birthPlace,
            time: birthTime,
            concern
          });
          setShowBirthForm(false);

          // Auto-send kundali calculation request for this profile
          const query = `🙏 श्री ${devoteeName} जी की जन्म कुंडली का संपूर्ण वैदिक विश्लेषण व रुद्राक्ष परामर्श (DOB: ${dob}, Time: ${birthTime}, Place: ${birthPlace})`;
          handleSend(query, {
            name: devoteeName,
            dob,
            birthTime,
            birthPlace,
            concern
          });
        }}
      />
    </>
  );
}

