import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "../../components/AdminLayout";
import { db, onStoreUpdate } from "../../lib/db";
import { emitToast } from "../../context/ToastContext";
import { 
  Edit, ArrowLeft, Search, Headphones, CheckCircle, MessageSquare, Send, 
  Paperclip, Image, Video, ExternalLink, Phone, MessageCircle, X, Sparkles, Box
} from "lucide-react";
import "./admin-pages.css";

export function AdminSupport() {
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [viewing, setViewing] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replyStatus, setReplyStatus] = useState("In Progress");
  const [activeMediaPreview, setActiveMediaPreview] = useState(null);

  useEffect(() => {
    load();
    const unsub = onStoreUpdate(() => load());
    return () => unsub();
  }, []);

  const load = async () => {
    try {
      await db.fetchTickets();
    } catch (_) {}
    const list = db.getTickets();
    setTickets(list);
    setFilteredTickets(list);
  };

  useEffect(() => {
    let result = tickets;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(t => 
        t.id?.toLowerCase().includes(q) || 
        t.email?.toLowerCase().includes(q) ||
        t.name?.toLowerCase().includes(q) ||
        t.phone?.toLowerCase().includes(q) ||
        t.subject?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "All") {
      result = result.filter(t => (t.status || "Open") === statusFilter);
    }
    if (categoryFilter !== "All") {
      if (categoryFilter === "Bulk Orders") {
        result = result.filter(t => 
          t.category?.toLowerCase().includes("bulk") || 
          t.subject?.toLowerCase().includes("bulk") || 
          t.message?.toLowerCase().includes("wholesale")
        );
      } else {
        result = result.filter(t => t.category === categoryFilter);
      }
    }
    setFilteredTickets(result);
  }, [searchTerm, statusFilter, categoryFilter, tickets]);

  const handleUpdateStatus = async (id, status) => {
    const t = tickets.find(x => x.id === id);
    if(t) {
      try {
        await db.saveTicket({...t, status});
        emitToast(`Ticket #${id} status changed to ${status}`, "success");
        load();
        if(viewing && viewing.id === id) setViewing({...t, status});
      } catch (err) {
        emitToast(err.message || "Failed to update ticket status", "error");
      }
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!viewing) return;
    try {
      const updated = {
        ...viewing,
        adminResponse: replyText.trim(),
        status: replyStatus
      };
      await db.saveTicket(updated);
      emitToast(`Reply sent for Ticket #${viewing.id}`, "success");
      setViewing(updated);
      load();
    } catch (err) {
      emitToast(err.message || "Failed to send reply", "error");
    }
  };

  const statuses = ["All", "Open", "Pending / In Progress", "Resolved", "Closed", "Cancelled"];

  const getBadgeClass = (status) => {
    switch (status) {
      case "Resolved": return "success";
      case "Closed": return "muted";
      case "Cancelled": return "error";
      case "Pending / In Progress":
      case "In Progress":
      case "Pending": return "info";
      default: return "warning";
    }
  };

  if (viewing) {
    const isBulk = viewing.category?.toLowerCase().includes("bulk") || viewing.subject?.toLowerCase().includes("bulk");
    const attachments = viewing.attachments || [];

    return (
      <AdminLayout>
        <button className="admin-back-link" onClick={() => { setViewing(null); setReplyText(""); }}>
          <ArrowLeft size={16} /> Back to Support Tickets
        </button>
        <div className="admin-page-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h1>Ticket #{viewing.id}</h1>
              {isBulk && (
                <span style={{ background: "#fcf4ed", border: "1.5px solid #ebdccb", color: "#a54d2b", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Box size={14} /> Bulk Order Enquiry
                </span>
              )}
            </div>
            <p className="admin-page-subtitle">Inquiry from {viewing.name || viewing.email || "Customer"}</p>
          </div>
          <div>
            <select 
              value={viewing.status || "Open"} 
              onChange={(e) => handleUpdateStatus(viewing.id, e.target.value)}
              style={{padding: '8px 15px', borderRadius: 8, border: '1px solid #dcd1c6', fontWeight: 600, background: '#fff', fontSize: 13, cursor: 'pointer'}}
            >
              <option value="Open">Open (Active)</option>
              <option value="Pending / In Progress">Pending / In Progress</option>
              <option value="Resolved">Resolved (Resolved / Done)</option>
              <option value="Closed">Closed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 20 }}>
          {/* Customer Details */}
          <div className="admin-card" style={{ margin: 0 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: '#2b170d' }}>Customer Details</h3>
            <p style={{ fontSize: 13, marginBottom: 6 }}><b>Name:</b> {viewing.name || "Devotee / Guest"}</p>
            <p style={{ fontSize: 13, marginBottom: 6 }}><b>Email:</b> {viewing.email || "N/A"}</p>
            <p style={{ fontSize: 13, marginBottom: 6 }}><b>Phone:</b> {viewing.phone || "N/A"}</p>
            <p style={{ fontSize: 13, marginBottom: 6 }}><b>Category:</b> <span style={{ fontWeight: 600, color: "#8c2b10" }}>{viewing.category || (isBulk ? "Bulk Order" : "General Support")}</span></p>
            <p style={{ fontSize: 13, marginBottom: 6 }}><b>Order ID:</b> {viewing.orderId ? `#${viewing.orderId}` : "N/A"}</p>
            <p style={{ fontSize: 13, marginBottom: 12 }}><b>Date:</b> {new Date(viewing.date || viewing.createdAt || Date.now()).toLocaleString()}</p>
            
            {viewing.phone && (
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #f0ebe4" }}>
                <a 
                  href={`https://wa.me/${viewing.phone.replace(/\D/g, "")}`} 
                  target="_blank" 
                  rel="noreferrer"
                  style={{
                    background: "#25D366",
                    color: "#fff",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 600,
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px"
                  }}
                >
                  <MessageCircle size={14} /> WhatsApp Customer
                </a>
                <a 
                  href={`tel:${viewing.phone}`}
                  style={{
                    background: "#f4ece5",
                    color: "#5c493d",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 600,
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px"
                  }}
                >
                  <Phone size={14} /> Call Customer
                </a>
              </div>
            )}
          </div>

          {/* Ticket Subject, Message & Attachments */}
          <div className="admin-card" style={{ margin: 0 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: '#2b170d' }}>{viewing.subject || 'Support Request'}</h3>
            <div style={{ background: '#fdfbf7', border: '1px solid #f0ebe4', padding: 14, borderRadius: 8, whiteSpace: 'pre-wrap', lineHeight: 1.5, fontSize: 13, color: '#3b322c', minHeight: 90 }}>
              {viewing.message || 'No message provided.'}
            </div>

            {/* Customer Media Attachments (Photos / Videos) */}
            {attachments.length > 0 && (
              <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #ebdccb" }}>
                <h4 style={{ fontSize: "13px", fontWeight: 700, color: "#4a3b32", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Paperclip size={14} /> Uploaded Photos / Videos ({attachments.length}):
                </h4>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {attachments.map((att, i) => (
                    <div
                      key={i}
                      onClick={() => setActiveMediaPreview(att)}
                      style={{
                        width: "80px",
                        height: "80px",
                        borderRadius: "8px",
                        border: "1px solid #dcd1c6",
                        overflow: "hidden",
                        position: "relative",
                        cursor: "pointer",
                        background: "#000"
                      }}
                      title={att.name || `Attachment ${i + 1}`}
                    >
                      {att.type === "video" ? (
                        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff", background: "#1f140e" }}>
                          <Video size={24} />
                          <span style={{ fontSize: "9px", marginTop: "2px" }}>Video</span>
                        </div>
                      ) : (
                        <img 
                          src={att.url} 
                          alt="Ticket media" 
                          referrerPolicy="no-referrer"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Media Preview Modal */}
        {activeMediaPreview && (
          <div 
            onClick={() => setActiveMediaPreview(null)}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              background: "rgba(0,0,0,0.85)",
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px"
            }}
          >
            <div onClick={e => e.stopPropagation()} style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }}>
              <button 
                onClick={() => setActiveMediaPreview(null)}
                style={{
                  position: "absolute",
                  top: "-40px",
                  right: 0,
                  background: "transparent",
                  border: "none",
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                <X size={24} /> Close
              </button>
              {activeMediaPreview.type === "video" ? (
                <video 
                  controls 
                  autoPlay 
                  src={activeMediaPreview.url} 
                  style={{ maxWidth: "100%", maxHeight: "80vh", borderRadius: "8px" }} 
                />
              ) : (
                <img 
                  src={activeMediaPreview.url} 
                  alt="Attachment preview" 
                  referrerPolicy="no-referrer"
                  style={{ maxWidth: "100%", maxHeight: "80vh", borderRadius: "8px", objectFit: "contain" }} 
                />
              )}
            </div>
          </div>
        )}

        {/* Admin Reply Section */}
        <div className="admin-card">
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 15, color: '#2b170d', display: 'flex', alignItems: 'center', gap: 8 }}>
            <MessageSquare size={18} color="#8c2b10" /> Admin Response & Resolution
          </h3>

          {viewing.adminResponse && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: 14, borderRadius: 8, marginBottom: 15 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#15803d', display: 'block', marginBottom: 4 }}>Last Sent Reply:</span>
              <p style={{ fontSize: 13, color: '#166534', margin: 0, whiteSpace: 'pre-wrap' }}>{viewing.adminResponse}</p>
            </div>
          )}

          <form onSubmit={handleSendReply} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b584c', display: 'block', marginBottom: 4 }}>Reply to Customer (Response):</label>
              <textarea
                rows={4}
                required
                placeholder="Type your official response to resolve this query..."
                value={replyText !== "" ? replyText : (viewing.adminResponse || "")}
                onChange={e => setReplyText(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #dcd1c6', fontSize: 13, outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6b584c' }}>Update Status:</label>
                <select
                  value={replyStatus}
                  onChange={e => setReplyStatus(e.target.value)}
                  style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #dcd1c6', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  <option value="Open">Open</option>
                  <option value="Pending / In Progress">Pending / In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <button type="submit" className="admin-btn primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Send size={14} /> Send Answer & Update Status
              </button>
            </div>
          </form>
        </div>
      </AdminLayout>
    );
  }

  const bulkCount = tickets.filter(t => 
    t.category?.toLowerCase().includes("bulk") || 
    t.subject?.toLowerCase().includes("bulk") || 
    t.message?.toLowerCase().includes("wholesale")
  ).length;

  return (
    <AdminLayout>
      <Link to="/admin" className="admin-back-link">
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>
      <div className="admin-page-header">
        <div>
          <h1>Customer Support & Queries</h1>
          <p className="admin-page-subtitle">{tickets.length} total customer inquiries & bulk orders recorded</p>
        </div>
      </div>

      <div className="admin-mobile-toolbar">
        <div className="admin-search-box">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search by ticket ID, customer name, email, subject, or bulk..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="admin-filter-chips">
          <button
            className={`admin-filter-chip ${categoryFilter === "Bulk Orders" ? 'active' : ''}`}
            onClick={() => setCategoryFilter(categoryFilter === "Bulk Orders" ? "All" : "Bulk Orders")}
            style={{ fontWeight: 700, borderColor: "#a54d2b" }}
          >
            📦 Bulk Orders ({bulkCount})
          </button>
          {statuses.map(st => (
            <button 
              key={st} 
              className={`admin-filter-chip ${statusFilter === st && categoryFilter === "All" ? 'active' : ''}`}
              onClick={() => {
                setStatusFilter(st);
                setCategoryFilter("All");
              }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {filteredTickets.length === 0 ? <div className="admin-empty">No support tickets or inquiries found.</div> : (
        <div className="admin-card" style={{padding: 0, overflowX: 'auto'}}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Category</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Subject & Attachments</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map(t => {
                const currentStatus = t.status || 'Open';
                const isBulk = t.category?.toLowerCase().includes("bulk") || t.subject?.toLowerCase().includes("bulk");
                const hasMedia = Array.isArray(t.attachments) && t.attachments.length > 0;

                return (
                  <tr key={t.id} style={{ background: isBulk ? "#fffbf7" : "transparent" }}>
                    <td><b>{t.id}</b></td>
                    <td>
                      {isBulk ? (
                        <span style={{ background: "#fcf4ed", color: "#a54d2b", border: "1px solid #ebdccb", padding: "3px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 700, whiteSpace: "nowrap" }}>
                          📦 Bulk Order
                        </span>
                      ) : (
                        <span style={{ background: "#f5f0ea", color: "#5c493d", padding: "3px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 600, whiteSpace: "nowrap" }}>
                          {t.category || "General"}
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#2b170d' }}>{t.name || "Devotee"}</div>
                      <div style={{ fontSize: 11, color: '#806f62' }}>{t.phone || t.email}</div>
                    </td>
                    <td><small>{new Date(t.date || t.createdAt || Date.now()).toLocaleDateString()}</small></td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{t.subject}</div>
                      {hasMedia && (
                        <span style={{ fontSize: "10.5px", color: "#15803d", display: "inline-flex", alignItems: "center", gap: 3, marginTop: 2 }}>
                          <Paperclip size={11} /> {t.attachments.length} Photo/Video attached
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className={`admin-badge ${getBadgeClass(currentStatus)}`}>
                          {currentStatus}
                        </span>
                        <select
                          value={currentStatus}
                          onChange={(e) => handleUpdateStatus(t.id, e.target.value)}
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '3px 6px',
                            borderRadius: '6px',
                            border: '1px solid #dcd1c6',
                            background: '#ffffff',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="Open">Open</option>
                          <option value="Pending / In Progress">Pending / In Progress</option>
                          <option value="Resolved">Resolved</option>
                          <option value="Closed">Closed</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>
                    </td>
                    <td>
                      <button onClick={() => { setViewing(t); setReplyText(t.adminResponse || ""); setReplyStatus(t.status || "Pending / In Progress"); }} className="admin-btn secondary" style={{ padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Edit size={14}/> Manage & Reply
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
