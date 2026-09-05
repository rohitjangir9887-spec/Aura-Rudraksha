import React from "react";
import { PartyPopper, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { money } from "../../../data";

export function OrderSummaryCelebration({ showCelebration, appliedCoupon, couponDiscount, setShowCelebration }) {
  return (
    <AnimatePresence>
      {showCelebration && appliedCoupon && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          style={{
            background: "linear-gradient(135deg, #15803d 0%, #166534 100%)",
            color: "#ffffff",
            borderRadius: "12px",
            padding: "12px 14px",
            marginTop: "14px",
            boxShadow: "0 4px 15px rgba(22, 101, 52, 0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}
            >
              <PartyPopper size={18} color="#ffffff" />
            </div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: "800", letterSpacing: "0.2px", display: "flex", alignItems: "center", gap: "5px" }}>
                <span>🎉 Congratulations!</span>
              </div>
              <div style={{ fontSize: "11.5px", opacity: 0.95, marginTop: "1px" }}>
                Coupon <b>'{appliedCoupon.code}'</b> applied! You save {couponDiscount > 0 ? money(couponDiscount) : "extra discount"}.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowCelebration(false)}
            style={{
              background: "rgba(255, 255, 255, 0.2)",
              border: "none",
              borderRadius: "50%",
              width: "22px",
              height: "22px",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer"
            }}
          >
            <X size={13} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
