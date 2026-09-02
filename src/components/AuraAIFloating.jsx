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
  GripVertical
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
    };
  }, [mode]);

  // Scroll message area only (does not scroll page)
  useEffect(() => {
    if (isOpen && bodyScrollRef.current) {
      bodyScrollRef.current.scrollTop = bodyScrollRef.current.scrollHeight;
    }
  }, [messages, isOpen, loading, isFullWindow]);

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
    setLoading(true);

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
        onChunk: (delta, accumulated, partialData) => {
          if (!streamInitialized) {
            streamInitialized = true;
            setLoading(false);
          }
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
        }
      });
    } catch (err) {
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
    if (e) e.stopPropagation();
    auraChatStore.setFloatingDismissed(true);
    setIsDismissed(true);
    setShowUndoToast(true);
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
    }
    undoTimerRef.current = setTimeout(() => {
      setShowUndoToast(false);
      undoTimerRef.current = null;
    }, 7000);
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

  return (
    <>
      {/* 1. Floating Action Button - Draggable (Hidden when window is open or dismissed) */}
      <AnimatePresence>
        {!isOpen && !isDismissed && (
          <motion.div
            id="aura-ai-floating-trigger"
            className="aura-ai-floating-btn-wrap"
            style={{ touchAction: "none", userSelect: "none" }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            drag
            dragMomentum={false}
            dragElastic={0.08}
            dragConstraints={{
              left: -Math.max(100, window.innerWidth - 120),
              right: 15,
              top: -Math.max(100, window.innerHeight - 120),
              bottom: 15
            }}
            whileDrag={{ scale: 1.05, cursor: "grabbing" }}
            onDragStart={(_, info) => {
              isDraggingBtnRef.current = true;
              dragStartPos.current = { x: info.point.x, y: info.point.y };
            }}
            onDragEnd={(_, info) => {
              const dx = Math.abs(info.point.x - dragStartPos.current.x);
              const dy = Math.abs(info.point.y - dragStartPos.current.y);
              if (dx < 6 && dy < 6) {
                setIsOpen(true);
              }
              setTimeout(() => {
                isDraggingBtnRef.current = false;
              }, 50);
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!isDraggingBtnRef.current) {
                  setIsOpen(true);
                }
              }}
              className="aura-ai-floating-btn"
              aria-label="Open Aura AI Shopping Guide (Drag to reposition)"
              title="Chat with Aura AI (Drag to move anywhere)"
            >
              <div className="aura-ai-drag-handle" title="Drag to move">
                <GripVertical size={12} />
              </div>
              <div className="aura-ai-floating-pulse" />
              <div className="aura-ai-floating-icon">
                <Sparkles size={13} className="aura-ai-sparkle-spin" />
              </div>
              <span className="aura-ai-floating-label">Aura AI</span>
            </button>
            <button
              id="aura-ai-floating-dismiss"
              className="aura-ai-floating-dismiss"
              onClick={handleDismiss}
              title="Hide floating button from all pages / Sabhi page se hataayein"
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
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            transition={{ duration: 0.2 }}
          >
            <span>Aura AI sabhi pages se hide ho gaya hai</span>
            <button 
              onClick={handleRestore}
              className="aura-ai-undo-btn"
              title="Undo and show button again"
            >
              Undo
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Aura AI Window - True Floating Interactive Guide (Draggable across screen) */}
      <AnimatePresence>
        {isOpen && (
          <div className="aura-ai-floating-container">
            <motion.div
              id="aura-ai-floating-panel"
              className="aura-ai-panel aura-ai-panel-compact"
              initial={{ opacity: 0, y: 20, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              transition={{ 
                duration: 0.32,
                ease: [0.16, 1, 0.3, 1] // Smooth spring/cubic-bezier curve rising from button
              }}
              drag
              dragControls={dragControls}
              dragListener={false}
              dragMomentum={false}
              dragElastic={0.05}
              dragConstraints={{
                left: -Math.max(100, window.innerWidth - 300),
                right: Math.max(100, window.innerWidth - 300),
                top: -Math.max(100, window.innerHeight - 400),
                bottom: Math.max(100, window.innerHeight - 200)
              }}
              whileDrag={{ cursor: "grabbing" }}
              style={{ transformOrigin: "bottom center", willChange: "transform" }}
            >
              {/* Header - Drag Handle Area */}
              <div 
                className={`aura-ai-header aura-ai-header-draggable ${mode === "panditji" ? "aura-ai-header-panditji" : ""}`}
                style={{ touchAction: "none", userSelect: "none", WebkitUserSelect: "none" }}
                onPointerDown={(e) => {
                  if (!e.target.closest("button") && !e.target.closest("a") && !e.target.closest("textarea") && !e.target.closest("input")) {
                    dragControls.start(e, { snapToCursor: false });
                  }
                }}
              >
                <div 
                  className="aura-ai-header-left" 
                  style={{ touchAction: "none" }}
                >
                  <div className="aura-ai-panel-drag-cue" title="Drag window to move anywhere on screen" style={{ touchAction: "none" }}>
                    <GripVertical size={11} />
                  </div>
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

                  {/* Full Window / Spiritual Guide Page Navigation */}
                  <button 
                    onClick={() => {
                      setIsOpen(false);
                      navigate("/aura-ai");
                    }} 
                    className="aura-ai-btn-icon"
                    title="Full Spiritual Guide Window (Sari chat history ke sath open karein)"
                    aria-label="Open Full Aura AI Spiritual Guide Page"
                  >
                    <Maximize2 size={13} />
                  </button>

                  <button 
                    onClick={() => {
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
                <Link to="/aura-ai" onClick={() => setIsOpen(false)} className="aura-ai-strip-btn aura-ai-strip-btn-link">
                  Full Page <ChevronRight size={11} />
                </Link>
              </div>

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
                    <div className="aura-ai-typing-bubble">
                      <span className="dot" />
                      <span className="dot" />
                      <span className="dot" />
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
                    placeholder={mode === "panditji" ? "Poochiye Panditji se — Rashi, Rudraksha, Dharan Vidhi..." : "Poochiye — jaise '₹1000 ke andar Rudraksha'..."}
                    disabled={loading}
                    rows={1}
                    className="aura-ai-input-field aura-ai-textarea"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || loading}
                    className="aura-ai-send-btn"
                    aria-label="Send message"
                  >
                    <Send size={15} />
                  </button>
                </form>
                <div className="aura-ai-privacy-note">
                  <ShieldCheck size={11} /> {mode === "panditji" ? "Authentic Vedic & Astrological Guidance" : "Secure shopping assistance • Authentic Vedic guidance"}
                </div>
              </div>
            </motion.div>
          </div>
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
