import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Receipt, 
  ShieldCheck, 
  Tag, 
  Sparkles, 
  Truck, 
  PiggyBank, 
  Lock, 
  ArrowRight, 
  RotateCcw, 
  Check, 
  X, 
  AlertCircle,
  ShoppingBag,
  PartyPopper,
  CreditCard
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { PlaceOrderButton } from "./PlaceOrderButton";
import { money, pct } from "../../data";

/**
 * OrderSummaryCard - Premium Luxury Spiritual E-Commerce Order Summary Component
 * Redesigned specifically for Aura Rudraksha with celebratory coupon interactions & receipt view.
 */
export function OrderSummaryCard({
  lines = [],
  products = [],
  cartItemCount = 0,
  subtotal = 0,
  totalMrp = 0,
  productSavings = 0,
  appliedCoupon = null,
  couponDiscount = 0,
  availableCoupons = [],
  onApplyCoupon,
  onRemoveCoupon,
  couponError = "",
  couponSuccessMsg = "",
  shippingFee = 0,
  finalTotal = 0,
  onCheckout,
  ctaText = "Proceed to Checkout",
  isCheckoutPage = false,
  isReceipt = false,
  order = null,
  loading = false,
  className = ""
}) {
  const [couponInput, setCouponInput] = useState("");
  const [showCelebration, setShowCelebration] = useState(false);
  const prevCouponRef = useRef(null);

  // Trigger celebration effect whenever a new coupon is successfully applied
  useEffect(() => {
    if (appliedCoupon && appliedCoupon.code && (!prevCouponRef.current || prevCouponRef.current.code !== appliedCoupon.code)) {
      setShowCelebration(true);
      
      // Fire celebratory confetti bursts
      try {
        confetti({
          particleCount: 60,
          spread: 60,
          origin: { y: 0.65 },
          colors: ['#8c2b10', '#166534', '#eab308', '#d97706', '#f59e0b']
        });
      } catch (err) {
        // Fallback gracefully if canvas-confetti fails
      }

      const timer = setTimeout(() => {
        setShowCelebration(false);
      }, 6000);
      prevCouponRef.current = appliedCoupon;
      return () => clearTimeout(timer);
    } else if (!appliedCoupon) {
      prevCouponRef.current = null;
      setShowCelebration(false);
    }
  }, [appliedCoupon]);

  // Build featured offers from real availableCoupons (server-provided), falling back gracefully
  const featuredOffers = useMemo(() => {
    if (Array.isArray(availableCoupons) && availableCoupons.length > 0) {
      return availableCoupons
        .filter(c => c && c.code && c.status !== "Expired" && c.status !== "Inactive" && c.status !== "Disabled")
        .slice(0, 3)
        .map(c => ({
          code: c.code,
          type: c.type || "fixed",
          discount: Number(c.discount) || 0,
          description: c.description
            || (c.type === "percentage" ? `${c.discount}% OFF on your order` : `Flat ₹${c.discount} OFF`),
          calcSavings: (sub) => c.type === "percentage"
            ? Math.round(sub * (Number(c.discount) / 100))
            : Math.min(Number(c.discount) || 0, sub)
        }));
    }
    return [];
  }, [availableCoupons]);

  const count = cartItemCount || lines.reduce((acc, l) => acc + (l.qty || 1), 0);
  
  // Shipping calculations
  const standardShippingCost = 50;
  const isFreeShipping = shippingFee === 0 && subtotal > 0;
  const shippingSavings = isFreeShipping ? standardShippingCost : 0;

  // Dynamic Total Savings: Product MRP savings + Coupon discount + Shipping discount
  const totalSavings = Math.max(0, (productSavings || 0) + (couponDiscount || 0) + shippingSavings);

  // Original theoretical total before any savings
  const effectiveTotalMrp = totalMrp > subtotal ? totalMrp : subtotal;
  const originalTotal = effectiveTotalMrp + standardShippingCost;

  const handleManualApply = (e) => {
    if (e) e.preventDefault();
    if (onApplyCoupon && couponInput.trim()) {
      onApplyCoupon(couponInput.trim().toUpperCase());
      setCouponInput("");
    }
  };

  const handleSelectOffer = (offerCode) => {
    if (appliedCoupon && appliedCoupon.code === offerCode) {
      return;
    }
    if (onApplyCoupon) {
      onApplyCoupon(offerCode);
    }
  };

  return (
    <div 
      id="aura-order-summary-card"
      className={`aura-order-summary-container ${className}`}
      style={{
        background: "#fffdf9",
        border: "1px solid #ebdccb",
        borderRadius: "16px",
        padding: "20px 18px",
        boxShadow: "0 4px 20px rgba(43, 23, 13, 0.04)",
        color: "#2b170d",
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        width: "100%",
        boxSizing: "border-box",
        position: "relative"
      }}
    >
      {/* 1. ORDER SUMMARY HEADER */}
      <div 
        id="order-summary-header"
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "10px",
          paddingBottom: "14px",
          borderBottom: "1px solid #f0e6da"
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
            <Receipt size={18} color="#8c2b10" strokeWidth={1.8} />
            <h2 
              style={{
                fontFamily: '"Cormorant Garamond", serif',
                fontSize: "23px",
                fontWeight: "700",
                color: "#2b170d",
                margin: 0,
                lineHeight: "1.15",
                letterSpacing: "-0.2px"
              }}
            >
              {isReceipt ? "Order & Payment Summary" : "Order Summary"}
            </h2>
          </div>
          <p 
            style={{
              fontSize: "12px",
              color: "#7c685b",
              margin: "3px 0 0 0",
              fontWeight: "400"
            }}
          >
            {isReceipt ? "Complete breakdown of your placed order" : "Review your order & savings"}
          </p>
        </div>

        {/* Top Right Trust Badge */}
        <div 
          id="order-summary-safe-badge"
          style={{
            background: "#fbf5eb",
            border: "1px solid #eedcc6",
            borderRadius: "999px",
            padding: "4px 10px",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            color: "#4a2810",
            fontSize: "11px",
            fontWeight: "600",
            whiteSpace: "nowrap",
            flexShrink: 0
          }}
        >
          <ShieldCheck size={13} color="#8c2b10" strokeWidth={2} />
          <span>{isReceipt ? "Verified Purchase" : "100% Safe & Protected"}</span>
        </div>
      </div>

      {/* CONGRATULATIONS CELEBRATORY BANNER (Fired on Coupon Apply) */}
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

      {/* 2. COUPON SECTION (Hidden on receipt view if no coupon, or shows locked coupon state) */}
      {!isReceipt ? (
        <div 
          id="order-summary-coupon-section"
          style={{
            background: appliedCoupon ? "#f2f8f3" : "#fdfaf5",
            border: appliedCoupon ? "1px solid #cbe6d2" : "1px dashed #dfcfbc",
            borderRadius: "12px",
            padding: "12px 14px",
            marginTop: "14px",
            boxSizing: "border-box",
            transition: "all 0.25s ease"
          }}
        >
          {!appliedCoupon ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <div 
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "6px",
                    background: "#f7eee3",
                    color: "#8c2b10",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}
                >
                  <Tag size={13} strokeWidth={2} />
                </div>
                <div style={{ lineHeight: "1.25" }}>
                  <div style={{ fontSize: "12.5px", fontWeight: "700", color: "#2b170d" }}>
                    Have a coupon code?
                  </div>
                  <div style={{ fontSize: "11px", color: "#8a7566" }}>
                    Enter code to get extra discount
                  </div>
                </div>
              </div>

              <form onSubmit={handleManualApply} style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <input 
                  id="input-summary-coupon"
                  type="text"
                  placeholder="Enter coupon code"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  style={{
                    flex: 1,
                    background: "#ffffff",
                    border: "1px solid #dfcfbc",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    fontSize: "12.5px",
                    fontWeight: "600",
                    letterSpacing: "0.5px",
                    color: "#2b170d",
                    textTransform: "uppercase",
                    outline: "none",
                    transition: "border-color 0.2s"
                  }}
                />
                <button
                  type="submit"
                  id="btn-summary-apply-coupon"
                  style={{
                    background: "#7c3114",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "8px 16px",
                    fontSize: "12.5px",
                    fontWeight: "700",
                    cursor: "pointer",
                    transition: "background 0.2s ease",
                    whiteSpace: "nowrap"
                  }}
                >
                  Apply
                </button>
              </form>

              {couponError && (
                <div 
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    marginTop: "8px",
                    fontSize: "11.5px",
                    color: "#b91c1c",
                    fontWeight: "500"
                  }}
                >
                  <AlertCircle size={13} />
                  <span>{couponError}</span>
                </div>
              )}
            </div>
          ) : (
            (() => {
              const isApplied = appliedCoupon.status === "APPLIED" || appliedCoupon.valid;
              const isExpired = appliedCoupon.status === "EXPIRED";
              const isNotEligible = appliedCoupon.status === "NOT_ELIGIBLE";

              return (
                <div 
                  id="summary-applied-coupon-card"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                    background: isApplied ? "#f2f8f3" : (isExpired ? "#fef2f2" : "#fffbeb"),
                    padding: "6px 8px",
                    borderRadius: "8px"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                    <div 
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        background: isApplied ? "#166534" : (isExpired ? "#dc2626" : "#d97706"),
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0
                      }}
                    >
                      {isApplied ? <Check size={15} strokeWidth={2.5} /> : <AlertCircle size={15} />}
                    </div>
                    <div>
                      <div style={{ 
                        fontSize: "12.5px", 
                        fontWeight: "700", 
                        color: isApplied ? "#166534" : (isExpired ? "#991b1b" : "#92400e"), 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "5px" 
                      }}>
                        <span>Coupon <b>'{appliedCoupon.code}'</b> {isApplied ? "Active" : (isExpired ? "Expired" : "Ineligible")}</span>
                        <span style={{ 
                          fontSize: "10px", 
                          background: isApplied ? "#dcfce7" : (isExpired ? "#fee2e2" : "#fef3c7"), 
                          color: isApplied ? "#166534" : (isExpired ? "#991b1b" : "#92400e"), 
                          padding: "1px 6px", 
                          borderRadius: "4px", 
                          fontWeight: "700" 
                        }}>
                          {isApplied ? "APPLIED" : (isExpired ? "EXPIRED" : "INELIGIBLE")}
                        </span>
                      </div>
                      <div style={{ fontSize: "11px", color: isApplied ? "#15803d" : (isExpired ? "#b91c1c" : "#b45309"), marginTop: "1px" }}>
                        {isApplied 
                          ? (couponDiscount > 0 ? `You saved ${money(couponDiscount)} with this offer` : "Offer successfully activated")
                          : (appliedCoupon.reason || (isExpired ? "This coupon is expired (Discount: ₹0)" : "Add more items to activate"))}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    id="btn-summary-remove-coupon"
                    onClick={onRemoveCoupon}
                    title="Remove Coupon to choose another"
                    style={{
                      background: "#ffffff",
                      border: "1px solid #dfcfbc",
                      color: "#8a7566",
                      borderRadius: "6px",
                      padding: "5px 10px",
                      fontSize: "11.5px",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      transition: "all 0.15s ease",
                      flexShrink: 0
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#b91c1c";
                      e.currentTarget.style.borderColor = "#fca5a5";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "#8a7566";
                      e.currentTarget.style.borderColor = "#dfcfbc";
                    }}
                  >
                    <X size={13} />
                    <span>Remove</span>
                  </button>
                </div>
              );
            })()
          )}
        </div>
      ) : (
        /* In Receipt Mode, if a coupon was used, show a clean applied badge */
        appliedCoupon && (
          <div 
            style={{
              background: "#f2f8f3",
              border: "1px solid #cbe6d2",
              borderRadius: "10px",
              padding: "10px 12px",
              marginTop: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Tag size={15} color="#166534" />
              <div style={{ fontSize: "12.5px", color: "#166534", fontWeight: "700" }}>
                Coupon '{appliedCoupon.code}' applied
              </div>
            </div>
            <div style={{ fontSize: "12.5px", color: "#166534", fontWeight: "700" }}>
              − {money(couponDiscount)}
            </div>
          </div>
        )
      )}

      {/* 3. AVAILABLE OFFERS (CRITICAL: HIDE WHEN A COUPON IS APPLIED! Show ONLY when appliedCoupon is null) */}
      {!isReceipt && !appliedCoupon && (
        <div id="order-summary-offers-section" style={{ marginTop: "14px" }}>
          <div 
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "8px"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px", fontWeight: "700", color: "#2b170d" }}>
              <Sparkles size={14} color="#8c2b10" strokeWidth={2} />
              <span>Available Offers</span>
            </div>

            <div 
              style={{
                background: "#fbf0dc",
                border: "1px solid #ebd29f",
                color: "#8c2b10",
                fontSize: "10px",
                fontWeight: "700",
                padding: "2px 7px",
                borderRadius: "999px",
                display: "inline-flex",
                alignItems: "center",
                gap: "3px"
              }}
            >
              <span>★ Best Value</span>
            </div>
          </div>

          {/* Selectable Offer Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
            {featuredOffers.map((offer) => {
              const savingsVal = offer.calcSavings(subtotal || 1000);

              return (
                <div
                  key={offer.code}
                  id={`offer-card-${offer.code}`}
                  onClick={() => handleSelectOffer(offer.code)}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #ebdccb",
                    borderRadius: "10px",
                    padding: "9px 12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#8c2b10";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(140, 43, 16, 0.08)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#ebdccb";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  {/* Left: Radio + Code + Description */}
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                    <div 
                      style={{
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        border: "1.5px solid #d4c3b3",
                        background: "transparent",
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0
                      }}
                    />

                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span 
                          style={{
                            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                            fontSize: "12px",
                            fontWeight: "800",
                            color: "#2b170d",
                            letterSpacing: "0.5px"
                          }}
                        >
                          {offer.code}
                        </span>
                      </div>
                      <div 
                        style={{
                          fontSize: "11px",
                          color: "#6e5d50",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis"
                        }}
                      >
                        {offer.description}
                      </div>
                    </div>
                  </div>

                  {/* Right: Savings Badge */}
                  <div 
                    style={{
                      background: "#f0f9f2",
                      border: "1px solid #cbe6d2",
                      color: "#166534",
                      fontSize: "11px",
                      fontWeight: "700",
                      padding: "3px 8px",
                      borderRadius: "6px",
                      whiteSpace: "nowrap",
                      flexShrink: 0
                    }}
                  >
                    You save {money(savingsVal)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. PRICE DETAILS */}
      <div id="order-summary-price-details" style={{ marginTop: "16px" }}>
        <div 
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "13px",
            fontWeight: "700",
            color: "#2b170d",
            marginBottom: "10px",
            paddingBottom: "6px",
            borderBottom: "1px solid #f0e6da"
          }}
        >
          <ShoppingBag size={14} color="#8c2b10" strokeWidth={2} />
          <span>Price Details</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12.5px" }}>
          {/* Subtotal Row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#4a3528" }}>
              Subtotal {count > 0 ? `(${count} item${count !== 1 ? "s" : ""})` : ""}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {totalMrp > subtotal && (
                <span 
                  style={{
                    fontSize: "11.5px",
                    color: "#8a7566",
                    textDecoration: "line-through"
                  }}
                >
                  {money(totalMrp)}
                </span>
              )}
              <span style={{ fontSize: "13.5px", fontWeight: "700", color: "#2b170d" }}>
                {money(subtotal)}
              </span>
            </div>
          </div>

          {/* Product Savings / Discount (if any) */}
          {productSavings > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#166534", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                <span>Product MRP Discount</span>
              </span>
              <span style={{ color: "#166534", fontWeight: "700", fontSize: "12.5px" }}>
                − {money(productSavings)}
              </span>
            </div>
          )}

          {/* Shipping Charges Row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#4a3528", display: "inline-flex", alignItems: "center", gap: "5px" }}>
              <Truck size={13} color="#8c2b10" />
              <span>Shipping Charges</span>
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {isFreeShipping ? (
                <>
                  <span 
                    style={{
                      fontSize: "11.5px",
                      color: "#8a7566",
                      textDecoration: "line-through"
                    }}
                  >
                    ₹50
                  </span>
                  <span style={{ color: "#166534", fontWeight: "700", fontSize: "12.5px" }}>
                    FREE
                  </span>
                </>
              ) : (
                <span style={{ color: "#4a3528", fontWeight: "600" }}>
                  {money(shippingFee || 50)}
                </span>
              )}
            </div>
          </div>

          {/* Discount (Coupon) Row */}
          {appliedCoupon && couponDiscount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#166534", display: "inline-flex", alignItems: "center", gap: "5px", fontWeight: "600" }}>
                <Tag size={13} color="#166534" />
                <span>Coupon Discount ({appliedCoupon.code})</span>
              </span>
              <span style={{ color: "#166534", fontWeight: "700", fontSize: "13px" }}>
                − {money(couponDiscount)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 5. SAVINGS HIGHLIGHT BOX */}
      {totalSavings > 0 && (
        <div 
          id="order-summary-savings-highlight"
          style={{
            background: "#f2f8f3",
            border: "1px solid #cbe6d2",
            borderRadius: "10px",
            padding: "10px 12px",
            marginTop: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div 
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "#dcf3e1",
                color: "#166534",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}
            >
              <PiggyBank size={16} strokeWidth={2} />
            </div>
            <div style={{ fontSize: "12px", color: "#166534", fontWeight: "600", lineHeight: "1.35" }}>
              {isReceipt ? "You saved" : "Great choice! You are saving"} <b>{money(totalSavings)}</b> on this order.
            </div>
          </div>

          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: "9.5px", color: "#2e7d32", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: "700" }}>
              Total Savings
            </div>
            <div style={{ fontSize: "14px", fontWeight: "800", color: "#166534" }}>
              {money(totalSavings)}
            </div>
          </div>
        </div>
      )}

      {/* 6. TOTAL AMOUNT SECTION */}
      <div 
        id="order-summary-total-section"
        style={{
          borderTop: "1px dashed #dfcfbc",
          marginTop: "14px",
          paddingTop: "12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <div>
          <div style={{ fontSize: "15px", fontWeight: "700", color: "#2b170d", lineHeight: "1.2" }}>
            {isReceipt ? "Paid Amount" : "Total Amount"}
          </div>
          <div style={{ fontSize: "11px", color: "#8a7566", marginTop: "1px" }}>
            Inclusive of all taxes
          </div>
        </div>

        <div style={{ textAlign: "right", display: "flex", alignItems: "baseline", gap: "6px" }}>
          {totalSavings > 0 && originalTotal > finalTotal && (
            <span 
              style={{
                fontSize: "13px",
                color: "#8a7566",
                textDecoration: "line-through"
              }}
            >
              {money(originalTotal)}
            </span>
          )}
          <span 
            id="order-summary-final-price"
            style={{
              fontSize: "22px",
              fontWeight: "800",
              color: "#2b170d",
              letterSpacing: "-0.3px"
            }}
          >
            {money(finalTotal)}
          </span>
        </div>
      </div>

      {/* 7. FREE SHIPPING MESSAGE */}
      {isFreeShipping && (
        <div 
          id="order-summary-shipping-unlocked"
          style={{
            background: "#fff9f0",
            border: "1px solid #fae6cb",
            borderRadius: "8px",
            padding: "8px 12px",
            marginTop: "10px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "11.5px",
            color: "#166534",
            fontWeight: "600"
          }}
        >
          <Truck size={14} color="#166534" strokeWidth={2} />
          <span>
            <b>Free Shipping Unlocked!</b> You saved ₹50 on express delivery.
          </span>
        </div>
      )}

      {/* 8. CHECKOUT CTA (Only shown when not in receipt mode) */}
      {!isReceipt && (
        <div style={{ marginTop: "14px" }}>
          <PlaceOrderButton
            id="btn-summary-checkout-cta"
            loading={loading}
            disabled={count === 0}
            onClick={onCheckout}
            variant="summary"
            ctaText={ctaText}
            finalTotal={finalTotal}
          />
        </div>
      )}

      {/* In Receipt Mode: Payment Method Strip */}
      {isReceipt && order && (
        <div 
          style={{
            marginTop: "14px",
            paddingTop: "12px",
            borderTop: "1px solid #f0e6da",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "12.5px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#4a3528" }}>
            <CreditCard size={15} color="#8c2b10" />
            <span>Payment Mode: <b>{order.paymentMethod || "Online Payment"}</b></span>
          </div>
          <span 
            style={{
              background: order.status === "Cancelled" ? "#fee2e2" : "#dcfce7",
              color: order.status === "Cancelled" ? "#991b1b" : "#166534",
              padding: "2px 8px",
              borderRadius: "999px",
              fontSize: "11px",
              fontWeight: "700"
            }}
          >
            {order.status === "Cancelled" ? "Refunded/Void" : "Paid"}
          </span>
        </div>
      )}

      {/* 9. TRUST FEATURES */}
      <div 
        id="order-summary-trust-features"
        style={{
          marginTop: "14px",
          paddingTop: "12px",
          borderTop: "1px solid #f0e6da",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "6px",
          textAlign: "center"
        }}
      >
        {/* Trust 1: Secure Payment */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
          <div style={{ color: "#8c2b10", marginBottom: "2px" }}>
            <ShieldCheck size={15} strokeWidth={1.8} />
          </div>
          <div style={{ fontSize: "10.5px", fontWeight: "700", color: "#2b170d", lineHeight: "1.2" }}>
            Secure Payment
          </div>
          <div style={{ fontSize: "9px", color: "#8a7566" }}>
            256-bit SSL Encrypted
          </div>
        </div>

        {/* Trust 2: Easy Returns */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
          <div style={{ color: "#8c2b10", marginBottom: "2px" }}>
            <RotateCcw size={15} strokeWidth={1.8} />
          </div>
          <div style={{ fontSize: "10.5px", fontWeight: "700", color: "#2b170d", lineHeight: "1.2" }}>
            Easy Returns
          </div>
          <div style={{ fontSize: "9px", color: "#8a7566" }}>
            Hassle-free Returns
          </div>
        </div>

        {/* Trust 3: 100% Authentic */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
          <div style={{ color: "#8c2b10", marginBottom: "2px" }}>
            <ShieldCheck size={15} strokeWidth={1.8} />
          </div>
          <div style={{ fontSize: "10.5px", fontWeight: "700", color: "#2b170d", lineHeight: "1.2" }}>
            100% Authentic
          </div>
          <div style={{ fontSize: "9px", color: "#8a7566" }}>
            Certified Products
          </div>
        </div>
      </div>
    </div>
  );
}

