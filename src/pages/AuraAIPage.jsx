import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { 
  Sparkles, 
  Send, 
  Mic, 
  MicOff, 
  RotateCcw, 
  ShoppingCart, 
  Eye, 
  Tag, 
  ShieldCheck, 
  PhoneCall, 
  Package, 
  Check, 
  Compass, 
  Flame, 
  ChevronRight,
  EyeOff,
  BookOpen,
  Award,
  HeartHandshake,
  MessageSquare,
  Sparkle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Shell } from "../components/Shell";
import { auraAiClient } from "../lib/auraAiClient";
import { parseAuraAiPayload, customerSafeAiText } from "../lib/auraAiResponse";
import { auraChatStore, getDateDividerLabel, formatMessageTime } from "../lib/auraChatStore";
import { useCart } from "../hooks/useCart";
import { authClient } from "../lib/authClient";
import { db } from "../lib/db";
import { AuraAIChatOrderModal } from "../components/AuraAIChatOrderModal";

export function AuraAIPage() {
  // Shared persistent chat history
  const [messages, setMessages] = useState(() => auraChatStore.getMessages());
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

  const cart = useCart();
  const messagesEndRef = useRef(null);
  const chatScrollContainerRef = useRef(null);
  const isInitialMount = useRef(true);

  // Sync with global store changes across tabs and components
  useEffect(() => {
    const handleChatSync = (e) => {
      if (e.detail && Array.isArray(e.detail)) {
        setMessages(e.detail);
      }
    };

    const handleDismissSync = (e) => {
      setIsFloatingDismissed(!!e.detail);
    };

    const handleStorageChange = (e) => {
      if (e.key === "aura_ai_unified_chat_history") {
        setMessages(auraChatStore.getMessages());
      }
      if (e.key === "aura_ai_floating_dismissed") {
        setIsFloatingDismissed(auraChatStore.isFloatingDismissed());
      }
    };

    window.addEventListener("aura_ai_chat_sync", handleChatSync);
    window.addEventListener("aura_ai_floating_dismiss_sync", handleDismissSync);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("aura_ai_chat_sync", handleChatSync);
      window.removeEventListener("aura_ai_floating_dismiss_sync", handleDismissSync);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

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

  // Only scroll the internal chat container when messages change after initial mount (without moving window)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (chatScrollContainerRef.current) {
      chatScrollContainerRef.current.scrollTo({
        top: chatScrollContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [messages, loading]);

  const handleSend = async (customText = null) => {
    const textToSend = customText || input;
    if (!textToSend || !textToSend.trim() || loading) return;

    const userMsg = {
      id: "msg_" + Date.now(),
      sender: "user",
      text: textToSend.trim(),
      timestamp: new Date().toISOString()
    };

    const currentMsgs = auraChatStore.appendMessage(userMsg);
    setMessages(currentMsgs);
    if (!customText) setInput("");
    setLoading(true);
    setMobileTab("chat");

    try {
      const currentUser = authClient.getUser();
      const userEmail = currentUser?.email || "";
      const userName = currentUser?.displayName || "Devotee";

      const res = await auraAiClient.sendMessage({
        message: textToSend,
        conversationId,
        userEmail,
        userName,
        cartItems: cart.lines || [],
        history: currentMsgs.slice(-8)
      });

      if (res) {
        const parsed = parseAuraAiPayload(res);
        const aiMsg = {
          id: "ai_" + Date.now(),
          sender: "ai",
          text: customerSafeAiText(parsed.text),
          products: parsed.products || [],
          coupons: parsed.coupons || [],
          orderInfo: parsed.orderInfo || null,
          requiresHuman: parsed.requiresHuman || false,
          quickReplies: parsed.quickReplies || [],
          timestamp: new Date().toISOString()
        };
        const updatedMsgs = auraChatStore.appendMessage(aiMsg);
        setMessages(updatedMsgs);
      }
    } catch (err) {
      const errMsg = {
        id: "err_" + Date.now(),
        sender: "ai",
        text: "Namaste 🙏 Server se connect karne mein samasya aayi. Hamare live catalog ke sabhi Rudraksha lab-tested aur energized hain.",
        requiresHuman: true,
        timestamp: new Date().toISOString()
      };
      const updatedMsgs = auraChatStore.appendMessage(errMsg);
      setMessages(updatedMsgs);
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
      const { newConvId, messages: updatedMsgs } = auraChatStore.startNewSession();
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
      alert("Voice recognition is not supported in this browser. Please type your message.");
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
        <div className="aura-ai-grid">
          
          {/* Left Column: Vedic Identity, Topics & History */}
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

              {/* Floating icon toggle */}
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #ebdccb' }}>
                <div style={{ fontSize: '12px', color: '#5c3516', marginBottom: '6px', fontWeight: 600 }}>
                  Floating AI Button Status:
                </div>
                <button 
                  onClick={handleToggleFloatingButton}
                  className="aura-ai-action-btn"
                  style={{ width: '100%', justifyContent: 'center', padding: '7px 10px' }}
                >
                  {isFloatingDismissed ? (
                    <><Sparkles size={12} /> Unhide Floating Icon (Show on all pages)</>
                  ) : (
                    <><EyeOff size={12} /> Hide Floating Icon (from all pages)</>
                  )}
                </button>
              </div>

              <div className="aura-ai-privacy-badge" style={{ marginTop: '10px' }}>
                <ShieldCheck size={12} />
                <span>All chat history is safe and stored permanently on your device.</span>
              </div>
            </div>
          </div>

          {/* Center Column: Interactive Conversational Stream */}
          <div className={`aura-ai-main-chat ${mobileTab !== "chat" ? "hidden-mobile" : ""}`}>
            {/* Chat Top Banner */}
            <div className="aura-ai-chat-topbar">
              <div className="aura-ai-chat-status">
                <span className="aura-ai-online-pulse" />
                <div>
                  <strong>Aura AI Spiritual Guide</strong>
                  <span className="aura-ai-topbar-sub">Active Consultation • Permanent History Preserved</span>
                </div>
              </div>
              <div className="aura-ai-chat-topbar-actions">
                <button 
                  onClick={handleNewChat} 
                  className={`aura-ai-topbar-btn ${isRefreshing ? "aura-ai-btn-refreshing" : ""}`} 
                  title="Start New Session without deleting history"
                  disabled={isRefreshing}
                >
                  <RotateCcw size={13} /> New Chat
                </button>
                <Link to="/cart" className="aura-ai-topbar-btn">
                  <ShoppingCart size={13} /> Cart ({cart.count})
                </Link>
              </div>
            </div>

            {/* Refresh Toast Banner */}
            <AnimatePresence>
              {showRefreshToast && (
                <div className="aura-ai-refresh-toast" style={{ top: '65px' }}>
                  <Sparkles size={13} className="aura-refresh-spinner" />
                  <span>Nayi Vedic Consultation shuru ho rahi hai...</span>
                </div>
              )}
            </AnimatePresence>

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

                    <div className={`aura-ai-page-msg ${m.sender === "user" ? "user-msg" : "ai-msg"}`}>
                      {m.sender === "ai" && (
                        <div className="aura-ai-page-msg-avatar">
                          <Sparkles size={14} />
                        </div>
                      )}
                      <div className="aura-ai-page-msg-bubble">
                        <div className="aura-ai-page-text">
                          {m.text && m.text.split("\n").map((line, i) => (
                            <React.Fragment key={i}>
                              {line.startsWith("• ") ? (
                                <div className="aura-ai-bullet">{line}</div>
                              ) : line.startsWith("**") && line.endsWith("**") ? (
                                <div className="aura-ai-bold-heading">{line.replace(/\*\*/g, "")}</div>
                              ) : (
                                <p>{line}</p>
                              )}
                            </React.Fragment>
                          ))}
                        </div>

                        {/* Inline Recommended Product Cards */}
                        {m.products && m.products.length > 0 && (
                          <div className="aura-ai-inline-prods">
                            <div className="aura-ai-inline-title">
                              <Sparkles size={14} /> 
                              <span>Vedic Recommendations (Lab Tested & Energized)</span>
                            </div>
                            <div className="aura-ai-prods-grid">
                              {m.products.slice(0, 3).map(p => {
                                const isAdded = addedItems[p.id];
                                // Real discount from real MRP - never invented
                                const realMrp = Number(p.comparePrice || p.mrp || 0);
                                const discountPercent = realMrp > Number(p.price || 0)
                                  ? Math.round(((realMrp - Number(p.price)) / realMrp) * 100)
                                  : 0;
                                const oos = Number(p.stock) <= 0;
                                const realImg = p.image || p.img || (Array.isArray(p.images) && p.images[0]) || "/images/product-5mukhi.jpg";

                                return (
                                  <div key={p.id} className="aura-ai-full-prod-card">
                                    <div className="aura-ai-full-prod-img-wrap">
                                      <img
                                        src={realImg}
                                        alt={p.name}
                                        className="aura-ai-full-prod-img"
                                        referrerPolicy="no-referrer"
                                        loading="lazy"
                                        onError={(e) => { if (!e.target.src.includes("product-5mukhi.jpg")) e.target.src = "/images/product-5mukhi.jpg"; }}
                                      />
                                      {discountPercent > 0 && (
                                        <span className="aura-ai-full-prod-badge">
                                          {discountPercent}% OFF
                                        </span>
                                      )}
                                      <div className="aura-ai-full-prod-verified-tag">
                                        <ShieldCheck size={11} /> Lab Certified
                                      </div>
                                    </div>
                                    <div className="aura-ai-full-prod-details">
                                      <h4 className="aura-ai-full-prod-title" title={p.name}>{p.name}</h4>
                                      <div className="aura-ai-full-prod-meta">
                                        <div className="aura-ai-full-prod-prices">
                                          <span className="aura-ai-full-prod-price">₹{Number(p.price).toLocaleString('en-IN')}</span>
                                          {discountPercent > 0 && (
                                            <span className="aura-ai-full-prod-mrp">₹{realMrp.toLocaleString('en-IN')}</span>
                                          )}
                                        </div>
                                        {Number(p.rating) > 0 && (
                                          <span className="aura-ai-full-prod-rating">★ {Number(p.rating)}</span>
                                        )}
                                        {oos && (
                                          <span style={{ fontSize: "10px", color: "#c62828", fontWeight: 700 }}>Out of Stock</span>
                                        )}
                                      </div>
                                      <p className="aura-ai-full-prod-desc">
                                        {p.highlight ? p.highlight.substring(0, 85) + "..." : "Authentic 100% natural Rudraksha, energised with sacred Vedic mantras."}
                                      </p>
                                      <div className="aura-ai-full-prod-btns">
                                        <Link to={`/product/${p.id}`} className="aura-ai-btn-secondary">
                                          <Eye size={12} /> Details
                                        </Link>
                                        <button
                                          type="button"
                                          onClick={() => setOrderModalProduct(p)}
                                          disabled={oos}
                                          style={oos ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                                          className="aura-ai-prod-btn-buy"
                                        >
                                          <Sparkles size={11} /> Quick Order
                                        </button>
                                        <button
                                          onClick={() => handleAddToCart(p)}
                                          disabled={oos}
                                          style={oos ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                                          className={`aura-ai-btn-primary ${isAdded ? "added" : ""}`}
                                          aria-label={`Add ${p.name} to cart`}
                                        >
                                          {isAdded ? (
                                            <><Check size={13} /> Added ✓</>
                                          ) : oos ? (
                                            "Sold Out"
                                          ) : (
                                            <><ShoppingCart size={12} /> Add</>
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

                        {/* Quick Suggestion Chips */}
                        {index === messages.length - 1 && m.quickReplies && m.quickReplies.length > 0 && (
                          <div className="aura-ai-page-chips">
                            {m.quickReplies.map((q, qi) => (
                              <button
                                key={qi}
                                onClick={() => handleSend(q)}
                                className="aura-ai-page-chip"
                              >
                                {q}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Timestamp */}
                        {timeString && (
                          <div className="aura-ai-page-msg-time">
                            {timeString}
                          </div>
                        )}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}

              {loading && (
                <div className="aura-ai-page-msg ai-msg">
                  <div className="aura-ai-page-msg-avatar">
                    <Sparkles size={14} />
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
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Apna sawaal likhein — jaise '5 Mukhi Rudraksha ke benefits' ya 'Budget under 1000'..."
                  disabled={loading}
                  className="aura-ai-page-input"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="aura-ai-page-send"
                  aria-label="Send query"
                >
                  <Send size={15} />
                </button>
              </form>
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
                  const realImg = p.image || p.img || (Array.isArray(p.images) && p.images[0]) || "/images/product-5mukhi.jpg";
                  return (
                  <div key={p.id} className="aura-ai-sidebar-prod-row">
                    <img
                      src={realImg}
                      alt={p.name}
                      className="aura-ai-sidebar-prod-thumb"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      onError={(e) => { if (!e.target.src.includes("product-5mukhi.jpg")) e.target.src = "/images/product-5mukhi.jpg"; }}
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
    </Shell>
  );
}
