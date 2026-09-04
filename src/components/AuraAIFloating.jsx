import React, { useState, useEffect, useRef, useCallback } from "react";
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
  Package, 
  ShieldCheck, 
  GripVertical,
  Calendar,
  Clock,
  MapPin,
  User,
  Mic,
  MicOff
} from "lucide-react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { auraAiClient } from "../lib/auraAiClient";
import { parseAuraAiPayload, customerSafeAiText } from "../lib/auraAiResponse";
import { auraChatStore, getDateDividerLabel, formatMessageTime } from "../lib/auraChatStore";
import { useCart } from "../hooks/useCart";
import { authClient } from "../lib/authClient";
import { AuraAIChatOrderModal } from "./AuraAIChatOrderModal";
import { AuraAIMessageContent } from "./AuraAIMessageContent";

export function AuraAIFloating() {
  const [isOpenState, setIsOpenState] = useState(() => auraChatStore.isFloatingOpen());
  const [isFullWindow, setIsFullWindow] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => auraChatStore.isFloatingDismissed());
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [settings, setSettings] = useState({ enabled: true, showFloatingButton: true });
  const [mode, setMode] = useState("standard"); // "standard" | "panditji"

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
  const [conversationId, setConversationId] = useState(() => auraChatStore.getConversationId());
  const [addedItems, setAddedItems] = useState({});
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [orderModalProduct, setOrderModalProduct] = useState(null);
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
      alert("Voice recognition is not supported in this browser. Please type your message.");
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

  // Aura AI Live Status and Stop/Retry State Variables
  const [statusText, setStatusText] = useState("Thinking...");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [errorOccurred, setErrorOccurred] = useState(false);
  const [lastUserQuery, setLastUserQuery] = useState("");
  const timerRef = useRef(null);
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

  const cart = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const messagesEndRef = useRef(null);
  const bodyScrollRef = useRef(null);
  const textareaRef = useRef(null);
  const isDraggingBtnRef = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const dragControls = useDragControls();
  const undoTimerRef = useRef(null);
  const dragAreaRef = useRef(null);

  // Lock body scroll on mobile when chat window is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      const originalDocOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
        document.documentElement.style.overflow = originalDocOverflow;
      };
    }
  }, [isOpen]);

  // Load server settings
  useEffect(() => {
    auraAiClient.getSettings().then(s => {
      if (s && typeof s.enabled === "boolean") {
        setSettings(s);
      }
    }).catch(() => {});
  }, []);

  // Update messages when switching mode (e.g. standard vs panditji)
  useEffect(() => {
    setMessages(auraChatStore.getMessages(mode));
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

    window.addEventListener("aura_ai_chat_sync", handleChatSync);
    window.addEventListener("aura_ai_floating_dismiss_sync", handleDismissSync);
    window.addEventListener("aura_ai_open_change", handleOpenChange);
    window.addEventListener("storage", handleStorageChange);

    const handleTriggerChat = (e) => {
      const prompt = e.detail?.prompt;
      if (e.detail?.mode) {
        setMode(e.detail.mode);
      } else if (prompt && (prompt.includes("पंडित") || prompt.includes("Pandit") || prompt.includes("kundli") || prompt.includes("कुंडली"))) {
        setMode("panditji");
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
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("aura_ai_trigger_chat", handleTriggerChat);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [mode]);

  // Scroll message area only (does not scroll page)
  useEffect(() => {
    if (isOpen && bodyScrollRef.current) {
      bodyScrollRef.current.scrollTop = bodyScrollRef.current.scrollHeight;
    }
  }, [messages, isOpen, loading, isFullWindow]);

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

  const path = location.pathname || "";
  const hideOnRoute =
    path.startsWith("/admin") ||
    path === "/aura-ai";

  if (settings.enabled === false || settings.showFloatingButton === false || hideOnRoute) {
    return null;
  }

  const handleSend = async (customText = null) => {
    const textToSend = customText || input;
    if (!textToSend || !textToSend.trim() || loading) return;

    const userMsg = {
      id: "msg_" + Date.now(),
      sender: "user",
      text: textToSend.trim(),
      timestamp: new Date().toISOString()
    };

    const currentMsgs = auraChatStore.appendMessage(userMsg, mode);
    setMessages(currentMsgs);
    if (!customText) setInput("");
    
    // Reset and Start Live Status Tracking
    setLastUserQuery(textToSend.trim());
    setErrorOccurred(false);
    setStatusText("Thinking...");
    setElapsedTime(0);
    setLoading(true);

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    const aiMsgId = "ai_" + Date.now();
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
        mode,
        cartItems: cart.lines || [],
        history: currentMsgs.slice(-8),
        onStatus: (statusMsg) => {
          setStatusText(statusMsg);
        },
        onChunk: (delta, accumulated, partialData) => {
          if (!streamInitialized) {
            streamInitialized = true;
            setLoading(false);
          }
          setStatusText("Writing answer...");
          const cleanText = customerSafeAiText(accumulated);
          setMessages((prev) => {
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
              timestamp: existing?.timestamp || new Date().toISOString()
            };
            if (idx >= 0) {
              const clone = [...prev];
              clone[idx] = liveMsg;
              return clone;
            }
            return [...prev, liveMsg];
          });
          if (bodyScrollRef.current) {
            bodyScrollRef.current.scrollTop = bodyScrollRef.current.scrollHeight;
          }
        },
        onDone: (finalData) => {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
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
            timestamp: new Date().toISOString()
          };
          auraChatStore.upsertMessage(aiMsg, mode);
          setMessages((prev) => {
            const idx = prev.findIndex((m) => m.id === aiMsgId);
            if (idx >= 0) {
              const clone = [...prev];
              clone[idx] = aiMsg;
              return clone;
            }
            return [...prev, aiMsg];
          });
          setLoading(false);
          if (bodyScrollRef.current) {
            bodyScrollRef.current.scrollTop = bodyScrollRef.current.scrollHeight;
          }
        },
        onError: (err) => {
          console.warn("Stream error in floating assistant:", err);
          setErrorOccurred(true);
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        }
      });
    } catch (err) {
      setErrorOccurred(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (!streamInitialized) {
        const errMsg = {
          id: "err_" + Date.now(),
          sender: "ai",
          text: mode === "panditji"
            ? "Namaste Devotee 🙏 Kshama karein, ek takneeki samasya aayi hai. Kripya punah prayas karein."
            : "Namaste 🙏 Kshama karein, ek takneeki samasya aayi. Kripya punah prayas karein ya WhatsApp par sampark karein.",
          requiresHuman: true,
          timestamp: new Date().toISOString()
        };
        const updatedMsgs = auraChatStore.appendMessage(errMsg, mode);
        setMessages(updatedMsgs);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBirthFormSubmit = (e) => {
    e.preventDefault();
    if (!birthForm.name.trim()) {
      alert("कृपया अपना नाम दर्ज करें (Please enter your name)");
      return;
    }
    if (!birthForm.dob) {
      alert("कृपया जन्म तिथि (Date of Birth) चुनें");
      return;
    }
    if (!birthForm.place.trim()) {
      alert("कृपया जन्म स्थान (Birth Place) दर्ज करें");
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

    const promptText = `नमस्ते पंडित जी 🙏 मेरा नाम ${birthForm.name.trim()} है।\n• जन्म तिथि (DOB): ${birthForm.dob}\n• जन्म समय: ${birthForm.time.trim() || "अज्ञात / Default"}\n• जन्म स्थान: ${birthForm.place.trim()}\n• मुख्य संकल्प / समस्या: ${concernLabels[birthForm.concern] || birthForm.concern}\n\nकृपया मेरी जन्म कुंडली व नक्षत्रों का वैदिक विश्लेषण करके मुझे सर्वोत्तम रुद्राक्ष, बीज मंत्र, शुभ धारण मुहूर्त और पूजन विधि बताइए।`;

    setShowBirthForm(false);
    setMode("panditji");
    handleSend(promptText);
  };

  // Start a new chat session with smooth fade-out and fade-in transition
  const handleNewChat = () => {
    if (isRefreshing) return;
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
    const updated = auraChatStore.appendMessage(confirmationMsg, mode);
    setMessages(updated);
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

  // Do not render floating trigger on checkout or admin dashboard to prevent UI/button occlusion
  if (location.pathname === "/checkout" || location.pathname.startsWith("/admin")) {
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

      {/* 1. Floating Action Button - Strictly fixed position with clean touch targets */}
      <AnimatePresence>
        {!isOpen && !isDismissed && (
          <motion.div
            id="aura-ai-floating-trigger"
            className="aura-ai-floating-btn-wrap"
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="aura-ai-floating-btn"
              aria-label="Open Aura AI Shopping Guide"
              title="Chat with Aura AI"
            >
              <div className="aura-ai-floating-pulse" />
              <div className="aura-ai-floating-icon">
                <Sparkles size={14} className="aura-ai-sparkle-spin" />
              </div>
              <span className="aura-ai-floating-label">Aura AI</span>
            </button>
            <button
              id="aura-ai-floating-dismiss"
              type="button"
              className="aura-ai-floating-dismiss"
              onClick={handleDismiss}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDismiss(e);
              }}
              title="Hide floating button from all pages"
              aria-label="Hide Aura AI floating button"
            >
              <X size={12} />
            </button>
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

      {/* 3. Aura AI Window - Floating Interactive Guide + Full Window Mode */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              className={`aura-ai-floating-backdrop ${isFullWindow ? "aura-ai-backdrop-full" : ""}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => {
                if (isFullWindow) {
                  setIsFullWindow(false);
                } else {
                  setIsOpen(false);
                }
              }}
              onPointerDown={(e) => {
                if (e.target === e.currentTarget) {
                  if (isFullWindow) {
                    setIsFullWindow(false);
                  } else {
                    setIsOpen(false);
                  }
                }
              }}
            />
            <div className={`aura-ai-floating-container ${isFullWindow ? "aura-ai-floating-container-full" : ""}`}>
            <motion.div
              id="aura-ai-floating-panel"
              className={`aura-ai-panel ${isFullWindow ? "aura-ai-panel-full" : "aura-ai-panel-compact"}`}
              initial={{ opacity: 0, y: 20, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              transition={{ 
                duration: 0.28,
                ease: [0.16, 1, 0.3, 1]
              }}
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
              style={{ transformOrigin: isFullWindow ? "center center" : "bottom left", willChange: "transform, width, height" }}
            >
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
                  <button 
                    onClick={handleNewChat} 
                    className={`aura-ai-btn-icon ${isRefreshing ? "aura-ai-btn-refreshing" : ""}`} 
                    title="New Chat / Nayi Baat-cheet (Purani chat safe rahegi)"
                    aria-label="New Chat"
                    disabled={isRefreshing}
                  >
                    <RotateCcw size={12} />
                  </button>

                  {/* Full Window / Maximize Toggle */}
                  <button 
                    type="button"
                    onClick={() => setIsFullWindow((prev) => !prev)} 
                    className="aura-ai-btn-icon"
                    title={isFullWindow ? "Restore compact window" : "Maximize to full window"}
                    aria-label={isFullWindow ? "Restore compact window" : "Maximize to full window"}
                  >
                    {isFullWindow ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                  </button>

                  <button 
                    type="button"
                    onClick={(e) => {
                      if (e) {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                      setIsOpen(false);
                    }} 
                    onPointerDown={(e) => e.stopPropagation()}
                    onTouchEnd={(e) => {
                      if (e) {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                      setIsOpen(false);
                    }}
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

              {/* Mode Selector Pill Bar */}
              <div className="aura-ai-mode-bar">
                <button
                  onClick={() => setMode("standard")}
                  className={`aura-ai-mode-btn ${mode === "standard" ? "active" : ""}`}
                  type="button"
                >
                  <Sparkles size={11} /> ⚡ Quick AI
                </button>
                <button
                  onClick={() => setMode("panditji")}
                  className={`aura-ai-mode-btn ${mode === "panditji" ? "active" : ""}`}
                  type="button"
                >
                  <span>🕉️</span> AI Panditji
                </button>
              </div>

              {/* Quick Suggestion Strip */}
              <div className="aura-ai-nav-strip">
                {mode === "panditji" ? (
                  <>
                    <button 
                      onClick={() => setShowBirthForm((prev) => !prev)} 
                      className={`aura-ai-strip-btn ${showBirthForm ? "active" : ""}`}
                      style={{ background: "#fef3c7", color: "#78350f", border: "1.5px solid #f59e0b", fontWeight: 700 }}
                    >
                      📋 {showBirthForm ? "✕ बंद करें" : "📋 जन्म विवरण भरें (Kundli Form)"}
                    </button>
                    <button 
                      onClick={() => handleSend("🌸 Mere Rashi ke liye kaunsa Rudraksha sabse uttam hai?")} 
                      className="aura-ai-strip-btn"
                    >
                      🌸 Rashi Rudraksha
                    </button>
                    <button 
                      onClick={() => handleSend("🕉️ Rudraksha dharan karne ki sahi Vedic Vidhi bataiye")} 
                      className="aura-ai-strip-btn"
                    >
                      🕉️ Dharan Vidhi
                    </button>
                    <button 
                      onClick={() => handleSend("📿 1 to 14 Mukhi Rudraksha ke traditional benefits")} 
                      className="aura-ai-strip-btn"
                    >
                      📿 Mukhi Guide
                    </button>
                    <button 
                      onClick={() => handleSend("🙏 Gauri Shankar Rudraksha ka kya mahatva hai?")} 
                      className="aura-ai-strip-btn"
                    >
                      🙏 Gauri Shankar
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => handleSend("✨ Mujhe apne liye best Rudraksha suggest karein")} 
                      className="aura-ai-strip-btn"
                    >
                      ✨ Find Rudraksha
                    </button>
                    <button 
                      onClick={() => handleSend("🎁 Aaj ke active discount coupon codes batao")} 
                      className="aura-ai-strip-btn"
                    >
                      🎁 Today's Offers
                    </button>
                    <button 
                      onClick={() => handleSend("📦 Track my recent order status")} 
                      className="aura-ai-strip-btn"
                    >
                      📦 Track Order
                    </button>
                    <button 
                      onClick={() => handleSend("🕉 Original 108 bead Jaap Mala dikhao")} 
                      className="aura-ai-strip-btn"
                    >
                      🕉 Jaap Mala
                    </button>
                  </>
                )}
                <button 
                  type="button" 
                  onClick={() => setIsFullWindow((prev) => !prev)} 
                  className="aura-ai-strip-btn aura-ai-strip-btn-link"
                >
                  {isFullWindow ? "Compact" : "Full Window"} <ChevronRight size={11} />
                </button>
              </div>

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
                            जन्म समय (Time)
                          </label>
                          <input
                            type="time"
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
                          <option value="career">⚡ व्यापार, नौकरी व धन वृद्धि (Career & Wealth)</option>
                          <option value="peace">🧘 मानसिक शांति व तनाव मुक्ति (Peace & Focus)</option>
                          <option value="shani_dosha">🛡️ शनि साढ़े साती व ग्रह दोष (Dosha Shanti)</option>
                          <option value="marriage">❤️ विवाह, प्रेम व परिवार (Relationships)</option>
                          <option value="health">🩺 स्वास्थ्य व आरोग्य (Health & Vitality)</option>
                          <option value="spiritual">🕉️ आध्यात्मिक उन्नति व शिव कृपा (Moksha & Sadhana)</option>
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

                      <div className={`aura-ai-msg ${m.sender === "user" ? "aura-ai-msg-user" : "aura-ai-msg-ai"}`}>
                        {m.sender === "ai" && (
                          <div className="aura-ai-msg-avatar">
                            <Sparkles size={13} />
                          </div>
                        )}
                        <div className="aura-ai-msg-content">
                          <div className="aura-ai-msg-text">
                            <AuraAIMessageContent text={customerSafeAiText(m.text)} sender={m.sender} />
                          </div>

                          {/* Product Recommendations Vertical Compact List (No Horizontal Scroll) */}
                          {m.products && m.products.length > 0 && (
                            <div className="aura-ai-prods-reel">
                              <div className="aura-ai-prods-title">
                                <Sparkles size={12} /> Recommended for you:
                              </div>
                              <div className="aura-ai-prods-list">
                                {m.products.slice(0, 3).map(p => {
                                  const isAdded = addedItems[p.id];
                                  // Real discount from real MRP - never invented
                                  const realMrp = Number(p.comparePrice || p.mrp || 0);
                                  const discountPercent = realMrp > Number(p.price || 0)
                                    ? Math.round(((realMrp - Number(p.price)) / realMrp) * 100)
                                    : 0;
                                  const oos = Number(p.stock) <= 0;
                                  const realImg = p.image || (p.images && p.images[0]) || p.img || "/images/product-5mukhi.jpg";

                                  return (
                                    <div key={p.id} className="aura-ai-prod-card-row">
                                      <div className="aura-ai-prod-img-wrap">
                                        <img
                                          src={realImg}
                                          alt={p.name}
                                          className="aura-ai-prod-img"
                                          referrerPolicy="no-referrer"
                                          loading="lazy"
                                          onError={(e) => { if (!e.target.src.includes("product-5mukhi.jpg")) e.target.src = "/images/product-5mukhi.jpg"; }}
                                        />
                                        {discountPercent > 0 && (
                                          <span className="aura-ai-prod-disc">
                                            {discountPercent}%
                                          </span>
                                        )}
                                      </div>
                                      <div className="aura-ai-prod-info">
                                        <h4 className="aura-ai-prod-name" title={p.name}>{p.name}</h4>
                                        <div className="aura-ai-prod-meta">
                                          <span className="aura-ai-prod-price">₹{Number(p.price).toLocaleString('en-IN')}</span>
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
                                            to={`/product/${p.id}`}
                                            onClick={() => setIsOpen(false)}
                                            className="aura-ai-prod-btn-view"
                                          >
                                            <Eye size={10} /> View
                                          </Link>
                                          <button
                                            type="button"
                                            onClick={() => setOrderModalProduct(p)}
                                            disabled={oos}
                                            style={oos ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                                            className="aura-ai-prod-btn-buy"
                                            title="Order directly in chat"
                                          >
                                            <Sparkles size={10} /> Order
                                          </button>
                                          <button
                                            onClick={() => handleAddToCart(p)}
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

                          {/* Quick Reply Chips */}
                          {index === messages.length - 1 && m.quickReplies && m.quickReplies.length > 0 && (
                            <div className="aura-ai-quick-chips">
                              {m.quickReplies.map((q, qi) => (
                                <button
                                  key={qi}
                                  onClick={() => handleSend(q)}
                                  className="aura-ai-chip-btn"
                                >
                                  {q}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Message Time display */}
                          {timeString && (
                            <div className="aura-ai-msg-time">
                              {timeString}
                            </div>
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}

                {loading && (
                  <div className="aura-ai-msg aura-ai-msg-ai">
                    <div className="aura-ai-msg-avatar">
                      <Sparkles size={13} />
                    </div>
                    <div className="flex flex-col gap-1 items-start" style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-start" }}>
                      <div className="aura-ai-typing-bubble">
                        <span className="dot" />
                        <span className="dot" />
                        <span className="dot" />
                      </div>
                      <span className="aura-ai-status-text" style={{ fontSize: "10.5px", color: "#8c2b10", fontStyle: "italic", fontWeight: "500", paddingLeft: "4px" }}>
                        {statusText} {elapsedTime > 0 ? `(${elapsedTime}s)` : ""}
                      </span>
                    </div>
                  </div>
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
                    onChange={e => setInput(e.target.value)}
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
                    disabled={loading}
                    rows={1}
                    className="aura-ai-input-field aura-ai-textarea"
                  />
                  {loading ? (
                    <button
                      type="button"
                      onClick={() => {
                        auraAiClient.abortActiveStream();
                        setLoading(false);
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
                      disabled={!input.trim() || loading}
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
          </div>
          </>
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
    </>
  );
}
