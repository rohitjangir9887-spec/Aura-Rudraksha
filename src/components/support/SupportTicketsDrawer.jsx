import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../../lib/db";
import { emitToast } from "../../context/ToastContext";
import { Trash2, MessageSquare, Send, CheckCircle2, Clock, Paperclip, X } from "lucide-react";

export function SupportTicketsDrawer({ showMyTickets, setShowMyTickets, customerTickets }) {
  const [replyingId, setReplyingId] = useState(null);
  const [replyMsg, setReplyMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (ticketId, e) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete support ticket #${ticketId}?`)) return;
    setDeletingId(ticketId);
    try {
      await db.deleteTicket(ticketId);
      emitToast(`Ticket #${ticketId} deleted successfully`, "success");
    } catch (err) {
      emitToast("Failed to delete ticket", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSendFollowUp = async (t, e) => {
    e.preventDefault();
    if (!replyMsg.trim()) return;
    setIsSubmitting(true);
    try {
      const existingReplies = t.replies || [];
      const newReply = {
        id: "rep_" + Date.now(),
        sender: "customer",
        senderName: t.name || "Customer",
        message: replyMsg.trim(),
        createdAt: new Date().toISOString()
      };
      const updated = {
        ...t,
        status: "Pending Admin Review",
        replies: [...existingReplies, newReply]
      };
      await db.saveTicket(updated);
      emitToast("Follow-up message sent to support team", "success");
      setReplyMsg("");
      setReplyingId(null);
    } catch (err) {
      emitToast("Failed to send message", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = status || "Pending Admin Review";
    if (s === "Resolved") {
      return { label: "Resolved ✓", bg: "#dcfce7", color: "#15803d" };
    }
    if (s === "Closed") {
      return { label: "Closed", bg: "#f3f4f6", color: "#4b5563" };
    }
    if (s === "Replied") {
      return { label: "Admin Replied ✨", bg: "#dbeafe", color: "#1e40af" };
    }
    if (s === "In Progress") {
      return { label: "In Progress ⚙️", bg: "#e0e7ff", color: "#3730a3" };
    }
    return { label: "Pending Admin Review ⏳", bg: "#fef9c3", color: "#854d0e" };
  };

  return (
    <AnimatePresence>
      {showMyTickets && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          style={{
            background: "#fff",
            border: "1.5px solid #e2e8f0",
            borderRadius: 12,
            padding: 14,
            marginBottom: 14,
            maxHeight: 380,
            overflowY: "auto"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: "#166534", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
              <MessageSquare size={15} /> Your Support Tickets & Admin Answers
            </h4>
            <button onClick={() => setShowMyTickets(false)} style={{ background: "none", border: "none", fontSize: 12, cursor: "pointer", color: "#666" }}>✕ Close</button>
          </div>

          {customerTickets.length === 0 ? (
            <p style={{ fontSize: 12, color: "#6b584c", margin: 0 }}>No support tickets raised yet. Submit a message below to connect with our spiritual care team.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {customerTickets.map(t => {
                const badge = getStatusBadge(t.status);
                const isReplying = replyingId === t.id;
                const replies = t.replies || [];
                const attachments = t.attachments || [];

                return (
                  <div key={t.id} style={{ background: "#fcfcfc", border: "1px solid #e5e7eb", borderRadius: 10, padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                      <div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#2b1408" }}>#{t.id} • {t.subject || "Support Inquiry"}</span>
                        {t.category && <span style={{ fontSize: 10, color: "#6b7280", marginLeft: 8 }}>({t.category})</span>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 6,
                          background: badge.bg,
                          color: badge.color
                        }}>
                          {badge.label}
                        </span>
                        <button
                          type="button"
                          disabled={deletingId === t.id}
                          onClick={(e) => handleDelete(t.id, e)}
                          title="Delete Ticket"
                          style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", padding: 2, display: "flex", alignItems: "center" }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <p style={{ fontSize: 12, color: "#374151", margin: "0 0 8px 0", lineHeight: 1.4 }}>
                      <b>Message:</b> {t.message}
                    </p>

                    {attachments.length > 0 && (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                        {attachments.map((att, idx) => (
                          <a key={idx} href={typeof att === "string" ? att : att.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#0284c7", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: 3 }}>
                            <Paperclip size={12} /> Attachment #{idx + 1}
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Admin Response Block */}
                    {t.adminResponse ? (
                      <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: 10, borderRadius: 8, fontSize: 11.5, color: "#166534", marginBottom: 6 }}>
                        <b>Admin Reply (टीम का जवाब):</b> {t.adminResponse}
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: "#d97706", fontStyle: "italic", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                        <Clock size={13} /> Pending Admin Review (Our team will reply soon)
                      </div>
                    )}

                    {/* Replies Conversation Thread */}
                    {replies.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8, paddingTop: 8, borderTop: "1px dashed #e5e7eb" }}>
                        {replies.map((rep) => (
                          <div
                            key={rep.id || Math.random()}
                            style={{
                              background: rep.sender === "admin" ? "#f0fdf4" : "#f8fafc",
                              border: `1px solid ${rep.sender === "admin" ? "#bbf7d0" : "#e2e8f0"}`,
                              borderRadius: 6,
                              padding: "6px 10px",
                              fontSize: 11,
                              alignSelf: rep.sender === "admin" ? "flex-start" : "flex-end",
                              maxWidth: "92%"
                            }}
                          >
                            <span style={{ fontWeight: 700, color: rep.sender === "admin" ? "#166534" : "#334155" }}>
                              {rep.sender === "admin" ? "Aura Support Admin" : "You"}:
                            </span>{" "}
                            {rep.message}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Follow-up button / form */}
                    <div style={{ marginTop: 8 }}>
                      {!isReplying ? (
                        <button
                          type="button"
                          onClick={() => setReplyingId(t.id)}
                          style={{ background: "none", border: "none", color: "#8c2b10", fontSize: 11.5, fontWeight: 600, cursor: "pointer", padding: 0 }}
                        >
                          + Add Follow-up Message
                        </button>
                      ) : (
                        <form onSubmit={(e) => handleSendFollowUp(t, e)} style={{ display: "flex", gap: 6, marginTop: 4 }}>
                          <input
                            type="text"
                            value={replyMsg}
                            onChange={(e) => setReplyMsg(e.target.value)}
                            placeholder="Type follow-up response..."
                            style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 12 }}
                          />
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            style={{ background: "#8c2b10", color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}
                          >
                            Send
                          </button>
                          <button
                            type="button"
                            onClick={() => { setReplyingId(null); setReplyMsg(""); }}
                            style={{ background: "#e5e7eb", color: "#374151", border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 12, cursor: "pointer" }}
                          >
                            Cancel
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
