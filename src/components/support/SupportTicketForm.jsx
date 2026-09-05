import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

export function SupportTicketForm({
  showTicketForm,
  setShowTicketForm,
  ticketSuccess,
  ticketSubject,
  setTicketSubject,
  ticketMessage,
  setTicketMessage,
  handleCreateTicket
}) {
  return (
    <AnimatePresence>
      {showTicketForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          style={{
            background: "#fff",
            border: "1px solid #ebdccb",
            borderRadius: 12,
            padding: 14,
            marginBottom: 14
          }}
        >
          <h4 style={{ fontSize: 13, fontWeight: 700, color: "#2b1408", margin: "0 0 8px 0" }}>
            Create Customer Support Ticket
          </h4>
          {ticketSuccess ? (
            <div style={{ color: "#16a34a", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <CheckCircle2 size={16} /> Ticket submitted! Our spiritual care team is reviewing it.
            </div>
          ) : (
            <form onSubmit={handleCreateTicket} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input
                type="text"
                required
                placeholder="Subject (e.g. Need delivery address update / Mukhi query)"
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid #dfcfbc",
                  fontSize: 12,
                  outline: "none"
                }}
              />
              <textarea
                required
                rows={3}
                placeholder="Describe your issue or order inquiry..."
                value={ticketMessage}
                onChange={(e) => setTicketMessage(e.target.value)}
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid #dfcfbc",
                  fontSize: 12,
                  outline: "none",
                  resize: "vertical"
                }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowTicketForm(false)}
                  style={{
                    background: "#f4ede2",
                    border: "none",
                    padding: "6px 12px",
                    borderRadius: 6,
                    fontSize: 12,
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: "#8c2b10",
                    color: "#fff",
                    border: "none",
                    padding: "6px 14px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  Submit Ticket
                </button>
              </div>
            </form>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
