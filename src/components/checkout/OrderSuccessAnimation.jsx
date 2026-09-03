import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { Check, ShieldCheck, Sparkles, Star, Award, CheckCircle2 } from "lucide-react";
import confetti from "canvas-confetti";

export function OrderSuccessAnimation({ orderNum, txnid }) {
  // Fire layered celebratory confetti sequence
  useEffect(() => {
    try {
      // First immediate burst
      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.55 },
        colors: ["#b85d25", "#d97706", "#22c55e", "#166534", "#f59e0b"]
      });

      // Secondary delayed gold & green burst
      const timer = setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ["#b85d25", "#fbbf24", "#22c55e"]
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ["#b85d25", "#fbbf24", "#22c55e"]
        });
      }, 350);

      return () => clearTimeout(timer);
    } catch (_) {}
  }, []);

  // Floating sparkle positions relative to badge center
  const sparkles = [
    { top: "-10px", left: "12px", delay: 0.4, color: "#eab308", size: 18 },
    { top: "-6px", right: "10px", delay: 0.5, color: "#22c55e", size: 16 },
    { bottom: "-8px", left: "16px", delay: 0.6, color: "#b85d25", size: 20 },
    { bottom: "-4px", right: "14px", delay: 0.7, color: "#eab308", size: 16 },
    { top: "50%", left: "-18px", delay: 0.45, color: "#166534", size: 14 },
    { top: "50%", right: "-18px", delay: 0.55, color: "#d97706", size: 14 },
  ];

  return (
    <div style={{ position: "relative", display: "inline-block", margin: "10px auto 20px" }}>
      {/* 1. Concentric Pulsing Aura Rings */}
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: [0.8, 1.4, 1.1], opacity: [0.7, 0.25, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
        style={{
          position: "absolute",
          top: "-20px",
          left: "-20px",
          right: "-20px",
          bottom: "-20px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(34, 197, 94, 0.3) 0%, rgba(34, 197, 94, 0) 70%)",
          pointerEvents: "none",
          zIndex: 0
        }}
      />
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: [0.9, 1.6, 1.2], opacity: [0.5, 0.15, 0] }}
        transition={{ duration: 2.2, delay: 0.4, repeat: Infinity, ease: "easeOut" }}
        style={{
          position: "absolute",
          top: "-30px",
          left: "-30px",
          right: "-30px",
          bottom: "-30px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(184, 93, 37, 0.25) 0%, rgba(184, 93, 37, 0) 70%)",
          pointerEvents: "none",
          zIndex: 0
        }}
      />

      {/* 2. Floating Sparkles */}
      {sparkles.map((sp, idx) => (
        <motion.div
          key={idx}
          initial={{ scale: 0, opacity: 0, y: 10 }}
          animate={{ scale: [0, 1.3, 1], opacity: [0, 1, 0.8], y: [10, -4, 0] }}
          transition={{ duration: 0.8, delay: sp.delay, ease: "backOut" }}
          style={{
            position: "absolute",
            top: sp.top,
            bottom: sp.bottom,
            left: sp.left,
            right: sp.right,
            zIndex: 3,
            pointerEvents: "none"
          }}
        >
          <Sparkles size={sp.size} color={sp.color} />
        </motion.div>
      ))}

      {/* 3. Central Spring Check Badge */}
      <motion.div
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 16,
          delay: 0.1
        }}
        style={{
          position: "relative",
          zIndex: 2,
          width: "96px",
          height: "96px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #eef6f0 0%, #dcf0e2 100%)",
          border: "3px solid #22c55e",
          boxShadow: "0 10px 30px rgba(34, 197, 94, 0.35), 0 0 0 6px rgba(34, 197, 94, 0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        {/* SVG Drawing Checkmark Animation */}
        <svg width="52" height="52" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
          <motion.circle
            cx="25"
            cy="25"
            r="22"
            stroke="#22c55e"
            strokeWidth="3.5"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
          <motion.path
            d="M14 26L22 34L36 18"
            fill="transparent"
            stroke="#166534"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.35, ease: "easeOut" }}
          />
        </svg>
      </motion.div>
    </div>
  );
}
