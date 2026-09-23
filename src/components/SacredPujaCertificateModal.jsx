import React, { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, ShieldCheck, Award, Sparkles, CheckCircle2, 
  Printer, Share2, Copy, Check, Download, Flame, Eye
} from "lucide-react";
import { emitToast } from "../context/ToastContext";

/**
 * SacredPujaCertificateModal
 * Displays an authentic Vedic Prana-Pratishtha Consecration & Gemological Lab Certificate
 * for orders, products, or certificate verifications.
 */
export function SacredPujaCertificateModal({ isOpen, onClose, order = null, product = null, certificateId = null }) {
  const [copied, setCopied] = useState(false);
  const printRef = useRef(null);

  if (!isOpen) return null;

  // Resolve dynamic order/product data
  const orderNum = order?.orderNumber || order?.id || order?._id || "AUR-2026-LIVE";
  const customerName = order?.customerName || order?.shippingAddress?.firstName 
    ? `${order.shippingAddress.firstName} ${order.shippingAddress.lastName || ''}`.trim()
    : "Devotee of Lord Shiva";

  const rawDate = order?.createdAt || order?.date || new Date().toISOString();
  const consecrationDate = new Date(rawDate).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const items = Array.isArray(order?.items) && order.items.length > 0
    ? order.items
    : (Array.isArray(order?.snapshotItems) ? order.snapshotItems : (product ? [product] : []));

  const primaryItemName = items[0]?.name || product?.name || "100% Nepali Sacred Rudraksha Bead";
  const certCode = certificateId || `AURA-LAB-NEP-${String(orderNum).replace(/[^\w]/g, '').slice(-8).toUpperCase() || '778899'}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(certCode);
    setCopied(true);
    emitToast("Certificate ID copied!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const text = `🕉️ *Vedic Prana-Pratishtha & Lab Certificate — Aura Rudraksha*\n\n` +
      `📜 *Certificate ID:* ${certCode}\n` +
      `👤 *Devotee:* ${customerName}\n` +
      `📿 *Sanctified Artifact:* ${primaryItemName}\n` +
      `🗓️ *Consecration Date:* ${consecrationDate}\n` +
      `🌊 *Consecration:* Haridwar Holy Ganga Jal Abhishekam & Vedic Shiva Puja\n` +
      `🛡️ *Lab Verification:* 100% Nepali Origin & High-Resolution X-Ray Tested\n\n` +
      `🔗 *Verify Live Online:* https://aurarudraksha.bond/verify-certificate?id=${certCode}`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  return (
    <AnimatePresence>
      <div 
        className="aura-modal-backdrop"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(30, 15, 8, 0.75)",
          backdropFilter: "blur(6px)",
          zIndex: 999999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
          overflowY: "auto"
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          style={{
            background: "#FFFDF9",
            borderRadius: "20px",
            maxWidth: "640px",
            width: "100%",
            maxHeight: "92vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 25px 60px rgba(0,0,0,0.35)",
            border: "2px solid #C89B3C",
            overflow: "hidden",
            position: "relative"
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Bar */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 18px",
            background: "linear-gradient(135deg, #4A0E17, #782218)",
            color: "#FFFDF8",
            borderBottom: "1px solid #C89B3C"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "18px" }}>🕉️</span>
              <div>
                <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, letterSpacing: "0.5px" }}>
                  वैदिक प्रतिष्ठा व प्रयोगशाला प्रमाण-पत्र
                </h3>
                <p style={{ margin: 0, fontSize: "11px", color: "#FDE68A", opacity: 0.9 }}>
                  Sacred Consecration & Authenticity Certificate
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.15)",
                border: "none",
                borderRadius: "50%",
                width: "30px",
                height: "30px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFFFFF",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Certificate Body (Printable Area) */}
          <div 
            ref={printRef}
            style={{
              padding: "24px 22px",
              overflowY: "auto",
              background: "radial-gradient(circle at 50% 30%, #FFFDF7 0%, #FAF3E6 100%)",
              position: "relative"
            }}
          >
            {/* Ornamental Inner Border Frame */}
            <div style={{
              border: "2px solid #8C2B10",
              borderRadius: "14px",
              padding: "20px 18px",
              position: "relative",
              background: "#FFFFFF",
              boxShadow: "inset 0 0 15px rgba(200, 155, 60, 0.08)"
            }}>
              {/* Corner Ornaments */}
              <span style={{ position: "absolute", top: "4px", left: "6px", color: "#C89B3C", fontSize: "12px" }}>❖</span>
              <span style={{ position: "absolute", top: "4px", right: "6px", color: "#C89B3C", fontSize: "12px" }}>❖</span>
              <span style={{ position: "absolute", bottom: "4px", left: "6px", color: "#C89B3C", fontSize: "12px" }}>❖</span>
              <span style={{ position: "absolute", bottom: "4px", right: "6px", color: "#C89B3C", fontSize: "12px" }}>❖</span>

              {/* Certificate Header */}
              <div style={{ textAlign: "center", marginBottom: "16px" }}>
                <div style={{ fontSize: "24px", color: "#8C2B10", marginBottom: "4px" }}>
                  🕉️ || श्री रुद्राय नमः || 🕉️
                </div>
                <h2 style={{ 
                  fontFamily: "Cormorant Garamond, serif", 
                  fontSize: "22px", 
                  fontWeight: 800, 
                  color: "#4A0E17",
                  margin: "0 0 4px",
                  letterSpacing: "0.8px"
                }}>
                  AURA RUDRAKSHA
                </h2>
                <div style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#B45309",
                  textTransform: "uppercase",
                  letterSpacing: "1.5px"
                }}>
                  CERTIFICATE OF VEDIC PRANA-PRATISHTHA &amp; AUTHENTICITY
                </div>
                <div style={{
                  display: "inline-block",
                  margin: "8px auto 0",
                  padding: "3px 12px",
                  background: "#FEF3C7",
                  border: "1px solid #F59E0B",
                  borderRadius: "20px",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#78350F"
                }}>
                  Certificate ID: <b>{certCode}</b>
                </div>
              </div>

              {/* Devotee & Artifact Description */}
              <div style={{ 
                fontSize: "13px", 
                lineHeight: "1.6", 
                color: "#2D211B", 
                textAlign: "center",
                margin: "16px 0",
                padding: "12px 14px",
                background: "#FFFDF8",
                borderRadius: "10px",
                border: "1px dashed #D4C3B0"
              }}>
                This is to solemnly certify that the sacred artifact{" "}
                <b style={{ color: "#8C2B10" }}>{primaryItemName}</b>{" "}
                has been duly sanctified in the name of{" "}
                <b style={{ color: "#4A0E17" }}>{customerName}</b>{" "}
                under strict Vedic rites according to the Shiva Purana (Vidyeshvara Samhita).
              </div>

              {/* 4 Pillars of Verification Grid */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                gap: "10px",
                margin: "18px 0"
              }}>
                <div style={{
                  padding: "10px",
                  background: "#FAF4E8",
                  borderRadius: "8px",
                  border: "1px solid #E5D5C5",
                  textAlign: "center"
                }}>
                  <ShieldCheck size={18} color="#166534" style={{ margin: "0 auto 4px" }} />
                  <div style={{ fontSize: "10.5px", fontWeight: 700, color: "#78350F" }}>100% Nepali Origin</div>
                  <div style={{ fontSize: "10px", color: "#555" }}>High Altitude Himalayan</div>
                </div>

                <div style={{
                  padding: "10px",
                  background: "#FAF4E8",
                  borderRadius: "8px",
                  border: "1px solid #E5D5C5",
                  textAlign: "center"
                }}>
                  <Award size={18} color="#B45309" style={{ margin: "0 auto 4px" }} />
                  <div style={{ fontSize: "10.5px", fontWeight: 700, color: "#78350F" }}>X-Ray Radiography</div>
                  <div style={{ fontSize: "10px", color: "#555" }}>100% Solid Compartments</div>
                </div>

                <div style={{
                  padding: "10px",
                  background: "#FAF4E8",
                  borderRadius: "8px",
                  border: "1px solid #E5D5C5",
                  textAlign: "center"
                }}>
                  <Flame size={18} color="#DC2626" style={{ margin: "0 auto 4px" }} />
                  <div style={{ fontSize: "10.5px", fontWeight: 700, color: "#78350F" }}>Ganga Jal Abhishekam</div>
                  <div style={{ fontSize: "10px", color: "#555" }}>Haridwar Temple Puja</div>
                </div>

                <div style={{
                  padding: "10px",
                  background: "#FAF4E8",
                  borderRadius: "8px",
                  border: "1px solid #E5D5C5",
                  textAlign: "center"
                }}>
                  <Sparkles size={18} color="#7E22CE" style={{ margin: "0 auto 4px" }} />
                  <div style={{ fontSize: "10.5px", fontWeight: 700, color: "#78350F" }}>Mantra Energized</div>
                  <div style={{ fontSize: "10px", color: "#555" }}>108 Shiva Japa Consecrated</div>
                </div>
              </div>

              {/* Sacred Beej Mantra & Dharan Day */}
              <div style={{
                margin: "16px 0",
                padding: "10px 14px",
                background: "linear-gradient(135deg, #FEF3C7 0%, #FFFBEB 100%)",
                border: "1px solid #F59E0B",
                borderRadius: "10px",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#B45309", marginBottom: "3px" }}>
                  📿 महामृत्युंजय व शिव बीज मंत्र (Sacred Beej Mantra)
                </div>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "#8C2B10" }}>
                  "ॐ नमः शिवाय" || "ॐ ह्रीं नमः"
                </div>
              </div>

              {/* Footer Stamp & Authority Seal */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: "16px",
                paddingTop: "12px",
                borderTop: "1px solid #E5D5C5",
                fontSize: "11px",
                color: "#6A5343"
              }}>
                <div>
                  <div><b>Order Ref:</b> #{orderNum}</div>
                  <div><b>Consecrated Date:</b> {consecrationDate}</div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ 
                    display: "inline-flex", 
                    alignItems: "center", 
                    gap: "4px", 
                    color: "#166534", 
                    fontWeight: 700 
                  }}>
                    <CheckCircle2 size={13} /> ISO 9001:2015 Verified
                  </div>
                  <div style={{ fontSize: "10px", color: "#8C2B10", fontWeight: 600 }}>
                    Aura Rudraksha Sansthan
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div style={{
            padding: "14px 18px",
            background: "#FAF4E8",
            borderTop: "1px solid #E5D5C5",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "10px"
          }}>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={handleCopyCode}
                style={{
                  padding: "7px 12px",
                  background: "#FFFFFF",
                  border: "1px solid #D4C3B0",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#4A0E17",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer"
                }}
              >
                {copied ? <Check size={13} color="#166534" /> : <Copy size={13} />}
                <span>{copied ? "Copied" : "Copy ID"}</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                style={{
                  padding: "7px 12px",
                  background: "#FFFFFF",
                  border: "1px solid #D4C3B0",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#4A0E17",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer"
                }}
              >
                <Printer size={13} />
                <span>Print / PDF</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              style={{
                padding: "8px 16px",
                background: "linear-gradient(135deg, #25D366, #128C7E)",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "8px",
                fontSize: "12.5px",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(37, 211, 102, 0.3)"
              }}
            >
              <Share2 size={13} />
              <span>Share on WhatsApp</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
