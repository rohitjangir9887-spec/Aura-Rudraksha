import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Paperclip, Image, Video, X, Loader2, Plus } from "lucide-react";
import { uploadMedia } from "../../lib/imageUtils";
import { emitToast } from "../../context/ToastContext";

export function SupportTicketForm({
  showTicketForm,
  setShowTicketForm,
  ticketSuccess,
  ticketSubject,
  setTicketSubject,
  ticketMessage,
  setTicketMessage,
  ticketCategory = "Order Issue",
  setTicketCategory = null,
  attachments = [],
  setAttachments = null,
  handleCreateTicket
}) {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (attachments.length + files.length > 5) {
      emitToast("You can upload a maximum of 5 media attachments (photos/videos).", "warning");
      return;
    }

    setUploading(true);
    try {
      const newItems = [];
      for (const file of files) {
        if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
          emitToast(`File ${file.name} is not a valid image or video.`, "warning");
          continue;
        }
        if (file.size > 25 * 1024 * 1024) {
          emitToast(`File ${file.name} is too large (max 25MB).`, "warning");
          continue;
        }

        try {
          const res = await uploadMedia(file);
          const url = (res && res.url) ? res.url : (typeof res === "string" ? res : "");
          if (url) {
            newItems.push({
              url,
              name: file.name,
              type: file.type.startsWith("video/") ? "video" : "image"
            });
          }
        } catch (uploadErr) {
          console.warn("Upload fallback using Data URL", uploadErr);
          const reader = new FileReader();
          const base64 = await new Promise((resolve) => {
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(file);
          });
          newItems.push({
            url: base64,
            name: file.name,
            type: file.type.startsWith("video/") ? "video" : "image"
          });
        }
      }

      if (setAttachments && newItems.length > 0) {
        setAttachments(prev => [...prev, ...newItems]);
        emitToast(`Uploaded ${newItems.length} media attachment(s).`, "success");
      }
    } catch (err) {
      emitToast("Failed to upload media. Please try again.", "error");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemoveAttachment = (idx) => {
    if (setAttachments) {
      setAttachments(prev => prev.filter((_, i) => i !== idx));
    }
  };

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
              {setTicketCategory && (
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#5c4d42" }}>Category:</label>
                  <select
                    value={ticketCategory}
                    onChange={(e) => setTicketCategory(e.target.value)}
                    style={{
                      flex: 1,
                      padding: "6px 10px",
                      borderRadius: 6,
                      border: "1px solid #dfcfbc",
                      fontSize: 12,
                      background: "#fcfaf7",
                      outline: "none"
                    }}
                  >
                    <option value="Order Issue">Order Issue</option>
                    <option value="Delivery / Tracking">Delivery / Tracking</option>
                    <option value="Refund Inquiry">Refund Inquiry</option>
                    <option value="Product Quality / Certificate">Product Quality / Certificate</option>
                    <option value="Bulk Order">Bulk Order / Wholesale</option>
                    <option value="General Support">General Support</option>
                  </select>
                </div>
              )}

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

              {/* Photo & Video Attachment Section */}
              <div style={{
                background: "#fdfbf7",
                border: "1px dashed #dfcfbc",
                borderRadius: "8px",
                padding: "8px 10px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "#7a6a5d", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <Paperclip size={12} /> Attach Photos / Videos of Product or Box ({attachments.length}/5)
                  </span>
                  <label style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    background: "#f2eae0",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#6e3b1c",
                    cursor: uploading ? "not-allowed" : "pointer"
                  }}>
                    {uploading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                    {uploading ? "Uploading..." : "Upload Media"}
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      disabled={uploading}
                      onChange={handleFileUpload}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>

                {attachments.length > 0 && (
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "6px" }}>
                    {attachments.map((att, idx) => (
                      <div
                        key={idx}
                        style={{
                          position: "relative",
                          width: "56px",
                          height: "56px",
                          borderRadius: "6px",
                          overflow: "hidden",
                          border: "1px solid #dcd1c6",
                          background: "#000"
                        }}
                      >
                        {att.type === "video" ? (
                          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#2b170d" }}>
                            <Video size={20} color="#fbf5ef" />
                          </div>
                        ) : (
                          <img
                            src={att.url}
                            alt="Attachment"
                            referrerPolicy="no-referrer"
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(idx)}
                          style={{
                            position: "absolute",
                            top: "2px",
                            right: "2px",
                            background: "rgba(0,0,0,0.6)",
                            color: "#fff",
                            border: "none",
                            borderRadius: "50%",
                            width: "16px",
                            height: "16px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            padding: 0
                          }}
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: "4px" }}>
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
                  disabled={uploading}
                  style={{
                    background: "#8c2b10",
                    color: "#fff",
                    border: "none",
                    padding: "6px 14px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: uploading ? "not-allowed" : "pointer"
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
