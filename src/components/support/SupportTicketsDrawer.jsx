import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export function SupportTicketsDrawer({ showMyTickets, setShowMyTickets, customerTickets }) {
  return (
    <AnimatePresence>
      {showMyTickets && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          style={{
            background: "#fff",
            border: "1px solid #bbf7d0",
            borderRadius: 12,
            padding: 14,
            marginBottom: 14,
            maxHeight: 280,
            overflowY: "auto"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: "#166534", margin: 0 }}>
              Your Support Tickets & Admin Answers
            </h4>
            <button onClick={() => setShowMyTickets(false)} style={{ background: "none", border: "none", fontSize: 12, cursor: "pointer", color: "#666" }}>✕ Close</button>
          </div>
          {customerTickets.length === 0 ? (
            <p style={{ fontSize: 12, color: "#6b584c", margin: 0 }}>No support tickets raised yet. Click "Raise Support Ticket" to ask our spiritual care team.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {customerTickets.map(t => (
                <div key={t.id} style={{ background: "#fcfcfc", border: "1px solid #e5e7eb", borderRadius: 8, padding: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#2b1408" }}>#{t.id} • {t.subject}</span>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: t.status === 'Resolved' || t.status === 'Closed' ? '#dcfce7' : '#fef9c3',
                      color: t.status === 'Resolved' || t.status === 'Closed' ? '#15803d' : '#854d0e'
                    }}>
                      {t.status || 'Open'} {t.status === 'Resolved' ? '✓ (समाधान हो गया)' : ''}
                    </span>
                  </div>
                  <p style={{ fontSize: 11.5, color: "#4b5563", margin: "0 0 6px 0" }}><b>Issue:</b> {t.message}</p>
                  {t.adminResponse ? (
                    <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: 8, borderRadius: 6, fontSize: 11, color: "#166534" }}>
                      <b>Admin Answer (जवाब):</b> {t.adminResponse}
                    </div>
                  ) : (
                    <div style={{ fontSize: 10.5, color: "#d97706", fontStyle: "italic" }}>
                      ⏳ Pending Admin Review (Our team will reply soon)
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
