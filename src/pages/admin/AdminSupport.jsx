import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "../../components/AdminLayout";
import { db, onStoreUpdate } from "../../lib/db";
import { emitToast } from "../../context/ToastContext";
import { Edit, ArrowLeft, Search, Headphones, CheckCircle, MessageSquare, Send } from "lucide-react";
import "./admin-pages.css";

export function AdminSupport() {
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [viewing, setViewing] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replyStatus, setReplyStatus] = useState("In Progress");

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
      result = result.filter(t => 
        t.id?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        t.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.subject?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter !== "All") {
      result = result.filter(t => (t.status || "Open") === statusFilter);
    }
    setFilteredTickets(result);
  }, [searchTerm, statusFilter, tickets]);

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

  const statuses = ["All", "Open", "In Progress", "Resolved", "Closed"];

  if (viewing) {
    return (
      <AdminLayout>
        <button className="admin-back-link" onClick={() => { setViewing(null); setReplyText(""); }}>
          <ArrowLeft size={16} /> Back to Support Tickets
        </button>
        <div className="admin-page-header">
          <div>
            <h1>Ticket #{viewing.id}</h1>
            <p className="admin-page-subtitle">Inquiry from {viewing.name || viewing.email || "Customer"}</p>
          </div>
          <div>
            <select 
              value={viewing.status || "Open"} 
              onChange={(e) => handleUpdateStatus(viewing.id, e.target.value)}
              style={{padding: '8px 15px', borderRadius: 8, border: '1px solid #dcd1c6', fontWeight: 600, background: '#fff', fontSize: 13}}
            >
              <option value="Open">Open (Active)</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved (समाधान हो गया)</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          {/* Customer Details */}
          <div className="admin-card" style={{ margin: 0 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: '#2b170d' }}>Customer Details</h3>
            <p style={{ fontSize: 13, marginBottom: 6 }}><b>Name:</b> {viewing.name || "Devotee / Guest"}</p>
            <p style={{ fontSize: 13, marginBottom: 6 }}><b>Email:</b> {viewing.email || "N/A"}</p>
            <p style={{ fontSize: 13, marginBottom: 6 }}><b>Phone:</b> {viewing.phone || "N/A"}</p>
            <p style={{ fontSize: 13, marginBottom: 6 }}><b>Order ID:</b> {viewing.orderId ? `#${viewing.orderId}` : "General Support"}</p>
            <p style={{ fontSize: 13, marginBottom: 0 }}><b>Date:</b> {new Date(viewing.date || viewing.createdAt || Date.now()).toLocaleString()}</p>
          </div>

          {/* Ticket Subject & Message */}
          <div className="admin-card" style={{ margin: 0 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: '#2b170d' }}>{viewing.subject || 'Support Request'}</h3>
            <div style={{ background: '#fdfbf7', border: '1px solid #f0ebe4', padding: 14, borderRadius: 8, whiteSpace: 'pre-wrap', lineHeight: 1.5, fontSize: 13, color: '#3b322c', minHeight: 90 }}>
              {viewing.message || 'No message provided.'}
            </div>
          </div>
        </div>

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
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b584c', display: 'block', marginBottom: 4 }}>Reply to Customer (जवाब दें):</label>
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
                  style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #dcd1c6', fontSize: 12, fontWeight: 600 }}
                >
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved (समाधान हो गया)</option>
                  <option value="Closed">Closed</option>
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

  return (
    <AdminLayout>
      <Link to="/admin" className="admin-back-link">
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>
      <div className="admin-page-header">
        <div>
          <h1>Customer Support Tickets</h1>
          <p className="admin-page-subtitle">{tickets.length} total customer inquiries recorded (Active until resolved)</p>
        </div>
      </div>

      <div className="admin-mobile-toolbar">
        <div className="admin-search-box">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search by ticket ID, customer name, email, or subject..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="admin-filter-chips">
          {statuses.map(st => (
            <button 
              key={st} 
              className={`admin-filter-chip ${statusFilter === st ? 'active' : ''}`}
              onClick={() => setStatusFilter(st)}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {filteredTickets.length === 0 ? <div className="admin-empty">No support tickets found.</div> : (
        <div className="admin-card" style={{padding: 0, overflowX: 'auto'}}>
          <table className="admin-table">
            <thead>
              <tr><th>ID</th><th>Customer</th><th>Date</th><th>Subject</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {filteredTickets.map(t => (
                <tr key={t.id}>
                  <td><b>{t.id}</b></td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#2b170d' }}>{t.name || "Devotee"}</div>
                    <div style={{ fontSize: 11, color: '#806f62' }}>{t.email}</div>
                  </td>
                  <td><small>{new Date(t.date || t.createdAt || Date.now()).toLocaleDateString()}</small></td>
                  <td>{t.subject}</td>
                  <td>
                    <span className={`admin-badge ${t.status==='Resolved'||t.status==='Closed'?'success':t.status==='In Progress'?'info':'warning'}`}>
                      {t.status || 'Open'}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => { setViewing(t); setReplyText(t.adminResponse || ""); setReplyStatus(t.status || "In Progress"); }} className="admin-btn secondary" style={{ padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Edit size={14}/> Manage & Reply
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
