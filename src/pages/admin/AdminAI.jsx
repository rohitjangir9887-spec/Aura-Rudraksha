import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Bot, 
  MessageSquare, 
  Users, 
  ShoppingCart, 
  TrendingUp, 
  DollarSign, 
  Headphones, 
  Sliders, 
  Settings as SettingsIcon, 
  Tag, 
  Boxes, 
  Check, 
  X, 
  Eye, 
  RotateCcw, 
  Search, 
  ExternalLink, 
  ShieldCheck, 
  BarChart3,
  Calendar,
  Layers,
  PhoneCall
} from "lucide-react";
import { AdminLayout } from "../../components/AdminLayout";
import { auraAiClient } from "../../lib/auraAiClient";
import { db } from "../../lib/db";

export function AdminAI() {
  const [activeTab, setActiveTab] = useState("overview");
  const [analytics, setAnalytics] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConvo, setSelectedConvo] = useState(null);
  const [settings, setSettings] = useState({
    enabled: true,
    showFloatingButton: true,
    showHeaderButton: true,
    language: "auto",
    tone: "polite_spiritual",
    greeting: "Namaste 🙏 Main Aura AI hoon — Aura Rudraksha ka personal shopping aur support assistant. Aaj main aapki kis cheez mein help karun?",
    recommendProducts: true,
    recommendOffers: true,
    cartActions: true,
    orderSupport: true,
    humanSupport: true
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [products, setProducts] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [searchConvo, setSearchConvo] = useState("");

  const loadAll = () => {
    // Live data from MongoDB (admin endpoints)
    auraAiClient.getAnalytics().then(data => {
      setAnalytics(data || null);
    });
    auraAiClient.getConversations().then(list => {
      setConversations(list || []);
    });
    auraAiClient.getSettings().then(setSettingsSafe);
    Promise.all([db.fetchProducts(), db.fetchCoupons ? db.fetchCoupons() : Promise.resolve()]).then(() => {
      setProducts(db.getProducts());
      setCoupons(db.getCoupons ? db.getCoupons() : []);
    });
  };

  const setSettingsSafe = (s) => {
    if (s) setSettings(prev => ({ ...prev, ...s }));
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await auraAiClient.updateSettings(settings);
      if (res && res.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      alert("Failed to save settings: " + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const filteredConvos = conversations.filter(c => {
    if (!searchConvo) return true;
    const q = searchConvo.toLowerCase();
    return (
      (c.userName && c.userName.toLowerCase().includes(q)) ||
      (c.userEmail && c.userEmail.toLowerCase().includes(q)) ||
      (c.title && c.title.toLowerCase().includes(q))
    );
  });

  const escalations = conversations.filter(c => c.requiresHumanSupport || c.status === "Escalated");

  return (
    <AdminLayout>
      <div className="admin-ai-page">
        {/* Top Header */}
        <div className="admin-ai-topbar">
          <div className="admin-ai-title-wrap">
            <div className="admin-ai-icon-box">
              <Sparkles size={24} />
            </div>
            <div>
              <h1 className="admin-ai-title">AURA AI Control Center</h1>
              <p className="admin-ai-subtitle">
                Personalized spiritual shopping, real-time product recommendations, order tracking & customer support intelligence.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={loadAll}
              style={{
                background: "#fff", border: "1px solid #ebd8c5", borderRadius: "8px",
                padding: "8px 14px", fontSize: "12.5px", fontWeight: 600, color: "#7a320c",
                cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px"
              }}
            >
              <RotateCcw size={14} /> Refresh
            </button>
            <div className="admin-ai-status-pill">
              <span className={`status-dot ${settings.enabled ? "active" : "inactive"}`} />
              <span>{settings.enabled ? "Aura AI Active" : "Aura AI Paused"}</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="admin-ai-tabs">
          <button 
            className={`admin-ai-tab ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            <BarChart3 size={16} /> Overview & Metrics
          </button>
          <button 
            className={`admin-ai-tab ${activeTab === "conversations" ? "active" : ""}`}
            onClick={() => setActiveTab("conversations")}
          >
            <MessageSquare size={16} /> Conversations ({conversations.length})
          </button>
          <button 
            className={`admin-ai-tab ${activeTab === "products" ? "active" : ""}`}
            onClick={() => setActiveTab("products")}
          >
            <Boxes size={16} /> Product Controls
          </button>
          <button 
            className={`admin-ai-tab ${activeTab === "offers" ? "active" : ""}`}
            onClick={() => setActiveTab("offers")}
          >
            <Tag size={16} /> Offer Controls
          </button>
          <button 
            className={`admin-ai-tab ${activeTab === "escalations" ? "active" : ""}`}
            onClick={() => setActiveTab("escalations")}
          >
            <Headphones size={16} /> Support Escalations ({escalations.length})
          </button>
          <button 
            className={`admin-ai-tab ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            <SettingsIcon size={16} /> AI Settings & Toggles
          </button>
        </div>

        {/* TAB 1: OVERVIEW & ANALYTICS */}
        {activeTab === "overview" && (
          <div className="admin-ai-tab-content">
            {/* KPI Metric Cards */}
            <div className="admin-ai-metrics-grid">
              <div className="admin-ai-kpi-card">
                <div className="kpi-icon-wrap" style={{ background: '#fef3e2', color: '#b45309' }}>
                  <MessageSquare size={22} />
                </div>
                <div className="kpi-info">
                  <span className="kpi-label">Total Conversations</span>
                  <strong className="kpi-value">{analytics?.totalConvos ?? 0}</strong>
                  <span className="kpi-sub">Real Aura AI sessions</span>
                </div>
              </div>

              <div className="admin-ai-kpi-card">
                <div className="kpi-icon-wrap" style={{ background: '#eff6ff', color: '#1d4ed8' }}>
                  <Users size={22} />
                </div>
                <div className="kpi-info">
                  <span className="kpi-label">Active AI Users</span>
                  <strong className="kpi-value">{analytics?.activeUsers ?? 0}</strong>
                  <span className="kpi-sub">Unique devotees guided</span>
                </div>
              </div>

              <div className="admin-ai-kpi-card">
                <div className="kpi-icon-wrap" style={{ background: '#fdf2f8', color: '#be185d' }}>
                  <Boxes size={22} />
                </div>
                <div className="kpi-info">
                  <span className="kpi-label">Products Recommended</span>
                  <strong className="kpi-value">{analytics?.recommendedCount ?? 0}</strong>
                  <span className="kpi-sub">Suggested in AI chats</span>
                </div>
              </div>

              <div className="admin-ai-kpi-card">
                <div className="kpi-icon-wrap" style={{ background: '#ecfdf5', color: '#047857' }}>
                  <ShoppingCart size={22} />
                </div>
                <div className="kpi-info">
                  <span className="kpi-label">Add to Cart from AI</span>
                  <strong className="kpi-value">{analytics?.cartConversions ?? 0}</strong>
                  <span className="kpi-sub">Direct AI additions</span>
                </div>
              </div>

              <div className="admin-ai-kpi-card">
                <div className="kpi-icon-wrap" style={{ background: '#fefce8', color: '#a16207' }}>
                  <TrendingUp size={22} />
                </div>
                <div className="kpi-info">
                  <span className="kpi-label">AI Conversion Rate</span>
                  <strong className="kpi-value">{analytics?.conversionRate ?? "0.0"}%</strong>
                  <span className="kpi-sub">AI-attributed orders / conversations</span>
                </div>
              </div>

              <div className="admin-ai-kpi-card">
                <div className="kpi-icon-wrap" style={{ background: '#f0fdf4', color: '#15803d' }}>
                  <DollarSign size={22} />
                </div>
                <div className="kpi-info">
                  <span className="kpi-label">Revenue Generated via AI</span>
                  <strong className="kpi-value">₹{(analytics?.revenueFromAI ?? 0).toLocaleString('en-IN')}</strong>
                  <span className="kpi-sub">Real orders matching AI cart adds</span>
                </div>
              </div>
            </div>

            {!analytics?.hasData && (
              <div className="admin-ai-panel-card" style={{ marginBottom: "16px", background: "#fffdf9", border: "1.5px dashed #ebd8c5", color: "#806f62", fontSize: "13px" }}>
                 <b>No Aura AI data yet.</b> Metrics above are real counters starting at 0 - they populate as customers use the Aura AI assistant.
              </div>
            )}

            {/* Visual Insights & Top Inquiries */}
            <div className="admin-ai-insights-grid">
              {/* Funnel & Categories */}
              <div className="admin-ai-panel-card">
                <h3 className="panel-card-title">Category Inquiries Distribution</h3>
                <p className="panel-card-sub">Top categories devotees ask Aura AI to recommend</p>
                <div className="admin-ai-cat-breakdown">
                  {(!analytics?.categoryBreakdown || analytics.categoryBreakdown.length === 0) ? (
                    <p style={{ color: "#806f62", fontSize: "12.5px", fontStyle: "italic", margin: 0 }}>
                      No AI recommendation data yet - categories appear as customers chat with Aura AI.
                    </p>
                  ) : analytics.categoryBreakdown.map((cat, idx) => (
                    <div key={idx} className="cat-bar-row">
                      <div className="cat-bar-header">
                        <span>{cat.name}</span>
                        <b>{cat.percentage}%</b>
                      </div>
                      <div className="cat-progress-track">
                        <div 
                          className="cat-progress-fill" 
                          style={{ 
                            width: `${cat.percentage}%`,
                            background: idx === 0 ? '#b45309' : idx === 1 ? '#047857' : idx === 2 ? '#1d4ed8' : '#7c3aed'
                          }} 
                        />
                      </div>
                    </div>
                  ))
                  }
                </div>
              </div>

              {/* Top Questions Table */}
              <div className="admin-ai-panel-card">
                <h3 className="panel-card-title">Top Asked Questions & Themes</h3>
                <p className="panel-card-sub">Most frequent user search prompts handled by Aura AI</p>
                <div className="top-queries-list">
                  {(analytics?.topQuestions || []).map((q, idx) => (
                    <div key={idx} className="query-row">
                      <span className="query-rank">#{idx + 1}</span>
                      <span className="query-text">{q.query}</span>
                      <span className="query-count-badge">{q.count} queries</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CONVERSATIONS HISTORY */}
        {activeTab === "conversations" && (
          <div className="admin-ai-tab-content">
            <div className="admin-ai-table-header">
              <div className="admin-ai-search-box">
                <Search size={16} />
                <input 
                  type="text" 
                  placeholder="Search by customer name, email or topic..."
                  value={searchConvo}
                  onChange={e => setSearchConvo(e.target.value)}
                />
              </div>
              <div className="admin-ai-table-count">
                Showing {filteredConvos.length} conversation(s)
              </div>
            </div>

            <div className="admin-ai-table-wrap">
              <table className="admin-ai-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Topic / Title</th>
                    <th>Messages</th>
                    <th>Recommended</th>
                    <th>Added to Cart</th>
                    <th>Status</th>
                    <th>Last Active</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredConvos.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '32px' }}>
                        No conversations found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredConvos.map(c => (
                      <tr key={c.id}>
                        <td>
                          <div className="customer-cell">
                            <strong>{c.userName || "Guest Devotee"}</strong>
                            <small>{c.userEmail || "guest-session"}</small>
                          </div>
                        </td>
                        <td>
                          <span className="convo-topic-badge">{c.title || "Rudraksha Guidance"}</span>
                        </td>
                        <td>
                          <span className="msg-count-pill">{c.messages?.length || 2}</span>
                        </td>
                        <td>
                          <span className="rec-count-badge">
                            {c.productsRecommended?.length || 1} item(s)
                          </span>
                        </td>
                        <td>
                          {c.addedToCart && c.addedToCart.length > 0 ? (
                            <span className="cart-added-badge">✓ {c.addedToCart.length} Added</span>
                          ) : (
                            <span className="cart-none-badge">-</span>
                          )}
                        </td>
                        <td>
                          <span className={`status-badge ${c.requiresHumanSupport ? "escalated" : "active"}`}>
                            {c.requiresHumanSupport ? "Needs Support" : "Completed"}
                          </span>
                        </td>
                        <td>
                          <small>{c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recently"}</small>
                        </td>
                        <td>
                          <button 
                            onClick={() => setSelectedConvo(c)}
                            className="btn-view-timeline"
                          >
                            <Eye size={14} /> Timeline
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Conversation Timeline Modal */}
            {selectedConvo && (
              <div className="admin-ai-modal-backdrop" onClick={() => setSelectedConvo(null)}>
                <div className="admin-ai-modal" onClick={e => e.stopPropagation()}>
                  <div className="modal-header">
                    <div>
                      <h3 style={{ margin: 0 }}>Conversation Timeline: {selectedConvo.userName || "Devotee"}</h3>
                      <small style={{ color: '#666' }}>{selectedConvo.userEmail || "Guest"} • Session #{selectedConvo.id}</small>
                    </div>
                    <button onClick={() => setSelectedConvo(null)} className="modal-close-btn">
                      <X size={20} />
                    </button>
                  </div>

                  <div className="modal-body">
                    <div className="timeline-thread">
                      {(selectedConvo.messages || []).map((m, idx) => (
                        <div key={idx} className={`timeline-msg ${m.sender === "user" ? "user" : "ai"}`}>
                          <div className="timeline-msg-header">
                            <b>{m.sender === "user" ? (selectedConvo.userName || "User") : "Aura AI"}</b>
                            <small>{m.timestamp ? new Date(m.timestamp).toLocaleTimeString() : ""}</small>
                          </div>
                          <div className="timeline-msg-text">
                            {m.text}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button onClick={() => setSelectedConvo(null)} className="btn-close-modal">
                      Close Timeline
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PRODUCT CONTROLS */}
        {activeTab === "products" && (
          <div className="admin-ai-tab-content">
            <div className="panel-intro-box">
              <h3>AI Catalog Recommendation Rules</h3>
              <p>Configure which energized beads, Malas, and combos Aura AI prioritizes when customers request guidance.</p>
            </div>

            <div className="admin-ai-table-wrap">
              <table className="admin-ai-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock Status</th>
                    <th>AI Recommend</th>
                    <th>Featured in AI</th>
                  </tr>
                </thead>
                <tbody>
                  {products.slice(0, 10).map(p => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img 
                            src={p.image || "https://i.ibb.co/LdQy0rC/rudraksha-placeholder.jpg"} 
                            alt={p.name} 
                            style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover' }}
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <strong>{p.name}</strong>
                          </div>
                        </div>
                      </td>
                      <td>{p.category || "Rudraksha"}</td>
                      <td><b>₹{Number(p.price).toLocaleString("en-IN")}</b></td>
                      <td>
                        {Number(p.stock) > 0 ? (
                          <span className="stock-pill in-stock">In Stock ({p.stock})</span>
                        ) : (
                          <span className="stock-pill" style={{ background: "#ffebee", color: "#c62828" }}>Out of Stock</span>
                        )}
                      </td>
                      <td>
                        {(p.status === "Active" || !p.status) && Number(p.stock) > 0 ? (
                          <span className="toggle-pill active">✓ Eligible</span>
                        ) : (
                          <span className="toggle-pill" style={{ background: "#f5f5f4", color: "#806f62" }}>Hidden from AI</span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: "12px", color: "#806f62" }}>{p.badge || p.highlight ? "Catalog priority" : "Standard"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: OFFER CONTROLS */}
        {activeTab === "offers" && (
          <div className="admin-ai-tab-content">
            <div className="panel-intro-box">
              <h3>AI Active Offer & Coupon Suggestion Engine</h3>
              <p>Aura AI will only suggest verified, non-expired coupons to customers that meet cart minimum requirements.</p>
            </div>

            <div className="admin-ai-table-wrap">
              <table className="admin-ai-table">
                <thead>
                  <tr>
                    <th>Coupon Code</th>
                    <th>Discount</th>
                    <th>Minimum Cart</th>
                    <th>Status</th>
                    <th>AI Suggestion</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: "28px", color: "#806f62", fontSize: "13px" }}>
                        No coupons in the database yet. Create them under Admin → Coupons.
                      </td>
                    </tr>
                  ) : coupons.map((c) => {
                    const minAmt = Number(c.minAmount || c.minOrder || c.minOrderValue || 0);
                    const expired = Boolean(c.expiry && new Date(c.expiry).getTime() < Date.now());
                    const st = expired ? "Expired" : (c.status || "Active");
                    return (
                      <tr key={c.id || c.code}>
                        <td>
                          <span className="coupon-code-pill">{c.code}</span>
                        </td>
                        <td>
                          <b>{c.type === "percentage" ? `${c.discount}% OFF` : `Flat ₹${c.discount} OFF`}</b>
                        </td>
                        <td>{minAmt > 0 ? `₹${minAmt.toLocaleString("en-IN")}` : "No minimum"}</td>
                        <td>
                          <span className={`stock-pill ${st === "Active" ? "in-stock" : ""}`} style={st !== "Active" ? { background: st === "Expired" ? "#ffebee" : "#fff8e1", color: st === "Expired" ? "#c62828" : "#d97706" } : undefined}>
                            {st}
                          </span>
                        </td>
                        <td>
                          {st === "Active" ? (
                            <span className="toggle-pill active">✓ Recommended by AI</span>
                          ) : (
                            <span className="toggle-pill" style={{ background: "#f5f5f4", color: "#806f62" }}>Not offered</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: SUPPORT ESCALATIONS */}
        {activeTab === "escalations" && (
          <div className="admin-ai-tab-content">
            <div className="panel-intro-box">
              <h3>Human Support Escalation Queue</h3>
              <p>Devotees who requested live spiritual advice or complex custom combination queries.</p>
            </div>

            <div className="admin-ai-table-wrap">
              <table className="admin-ai-table">
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Contact Info</th>
                    <th>Inquiry Summary</th>
                    <th>Time</th>
                    <th>Direct Action</th>
                  </tr>
                </thead>
                <tbody>
                  {escalations.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '32px' }}>
                        No pending human support escalations. Aura AI is resolving customer queries smoothly!
                      </td>
                    </tr>
                  ) : (
                    escalations.map((esc, i) => (
                      <tr key={i}>
                        <td><strong>{esc.userName || "Devotee"}</strong></td>
                        <td>{esc.userEmail || "+91 9672996531"}</td>
                        <td>{esc.title || "Custom combination guidance"}</td>
                        <td><small>{new Date(esc.updatedAt || Date.now()).toLocaleTimeString()}</small></td>
                        <td>
                          <a 
                            href={`https://wa.me/919672996531?text=Namaste%20${encodeURIComponent(esc.userName || 'Devotee')},%20this%20is%20Aura%20Rudraksha%20support%20following%20up%20on%20your%20query`}
                            target="_blank" 
                            rel="noreferrer"
                            className="btn-wa-action"
                          >
                            <PhoneCall size={13} /> Follow Up on WhatsApp
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: SETTINGS */}
        {activeTab === "settings" && (
          <div className="admin-ai-tab-content">
            <form onSubmit={handleSaveSettings} className="admin-ai-settings-form">
              <div className="settings-section-card">
                <h3 className="section-title">General Availability & Placement</h3>
                
                <div className="setting-toggle-row">
                  <div>
                    <strong>Master Aura AI Engine</strong>
                    <p>Globally enable or pause Aura AI assistant across the website.</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={settings.enabled} 
                    onChange={e => setSettings({ ...settings, enabled: e.target.checked })}
                    className="toggle-switch"
                  />
                </div>

                <div className="setting-toggle-row">
                  <div>
                    <strong>Show Floating Aura AI Button</strong>
                    <p>Show the bottom-right animated assistant launcher button.</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={settings.showFloatingButton} 
                    onChange={e => setSettings({ ...settings, showFloatingButton: e.target.checked })}
                    className="toggle-switch"
                  />
                </div>

                <div className="setting-toggle-row">
                  <div>
                    <strong>Show Header ✨ Aura AI Pill</strong>
                    <p>Show animated pill button right before Wishlist icon in Header.</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={settings.showHeaderButton} 
                    onChange={e => setSettings({ ...settings, showHeaderButton: e.target.checked })}
                    className="toggle-switch"
                  />
                </div>
              </div>

              <div className="settings-section-card">
                <h3 className="section-title">Language & Tone Persona</h3>

                <div className="form-field-group">
                  <label>Primary Language Support</label>
                  <select 
                    value={settings.language} 
                    onChange={e => setSettings({ ...settings, language: e.target.value })}
                    className="admin-select"
                  >
                    <option value="auto">Auto Detect (Hindi, English & Hinglish)</option>
                    <option value="hi">Hindi (Spiritual Shuddh & Natural)</option>
                    <option value="en">English (Professional & Respectful)</option>
                    <option value="hinglish">Hinglish (Casual & Conversational)</option>
                  </select>
                </div>

                <div className="form-field-group">
                  <label>Spiritual Tone & Persona</label>
                  <select 
                    value={settings.tone} 
                    onChange={e => setSettings({ ...settings, tone: e.target.value })}
                    className="admin-select"
                  >
                    <option value="polite_spiritual">Polite, Respectful & Vedic Spiritual (Recommended)</option>
                    <option value="concise">Concise & Direct E-Commerce Guide</option>
                    <option value="friendly">Warm, Energetic & Friendly</option>
                  </select>
                </div>

                <div className="form-field-group">
                  <label>Default Welcoming Greeting</label>
                  <textarea 
                    rows={3} 
                    value={settings.greeting} 
                    onChange={e => setSettings({ ...settings, greeting: e.target.value })}
                    className="admin-textarea"
                  />
                </div>
              </div>

              <div className="settings-section-card">
                <h3 className="section-title">Feature Capabilities</h3>

                <div className="setting-toggle-row">
                  <div>
                    <strong>Product Recommendations</strong>
                    <p>Allow AI to suggest matched Rudraksha beads & Malas from catalog.</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={settings.recommendProducts} 
                    onChange={e => setSettings({ ...settings, recommendProducts: e.target.checked })}
                    className="toggle-switch"
                  />
                </div>

                <div className="setting-toggle-row">
                  <div>
                    <strong>Active Offer & Coupon Recommendations</strong>
                    <p>Allow AI to suggest active discount coupons to eligible carts.</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={settings.recommendOffers} 
                    onChange={e => setSettings({ ...settings, recommendOffers: e.target.checked })}
                    className="toggle-switch"
                  />
                </div>

                <div className="setting-toggle-row">
                  <div>
                    <strong>Direct Cart Control</strong>
                    <p>Allow 1-click Add to Cart from AI recommendations.</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={settings.cartActions} 
                    onChange={e => setSettings({ ...settings, cartActions: e.target.checked })}
                    className="toggle-switch"
                  />
                </div>

                <div className="setting-toggle-row">
                  <div>
                    <strong>Order Status Support</strong>
                    <p>Allow authenticated users to track their verified orders via AI.</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={settings.orderSupport} 
                    onChange={e => setSettings({ ...settings, orderSupport: e.target.checked })}
                    className="toggle-switch"
                  />
                </div>

                <div className="setting-toggle-row">
                  <div>
                    <strong>Human Support Escalation</strong>
                    <p>Provide WhatsApp and phone escalation when user asks for human consultant.</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={settings.humanSupport} 
                    onChange={e => setSettings({ ...settings, humanSupport: e.target.checked })}
                    className="toggle-switch"
                  />
                </div>
              </div>

              <div className="settings-submit-bar">
                {savedSuccess && (
                  <span className="save-success-msg">
                    <Check size={16} /> Aura AI settings updated and deployed live!
                  </span>
                )}
                <button 
                  type="submit" 
                  disabled={savingSettings}
                  className="btn-save-settings"
                >
                  {savingSettings ? "Saving Settings..." : "Save AI Configuration"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
