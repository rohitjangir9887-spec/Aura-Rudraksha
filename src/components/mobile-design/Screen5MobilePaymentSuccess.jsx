import React from "react";
import { MobileBottomNav } from "./MobileBottomNav";
import { SuccessHeader } from "./payment-success/SuccessHeader";
import { ConfirmationMessage } from "./payment-success/ConfirmationMessage";
import { OrderSummaryCard } from "./payment-success/OrderSummaryCard";
import { SuccessActionButtons } from "./payment-success/SuccessActionButtons";

/**
 * Screen 5 — Payment Success & Order Confirmation
 * 
 * Specifically designed for 390px mobile viewport:
 * - Premium success banner with large green circular check icon
 * - Heading: "Payment Successful!"
 * - Subheading: "Your Rudraksha order has been confirmed."
 * - Order details card (Order ID #AUR-88942, Amount Paid ₹36,950, Payment Method UPI, Date & Time)
 * - Green confirmation card: "Your order is confirmed and will be dispatched soon."
 * - Action buttons: "View Order →" & "Continue Shopping"
 * - Mobile bottom navigation (Home, Shop, Orders, Wishlist, Account)
 */
export function Screen5MobilePaymentSuccess({
  onViewOrder,
  onContinueShopping,
  onTabChange
}) {
  const orderId = "AUR-88942";
  const amountPaid = 36950;
  const paymentMethod = "UPI (Google Pay)";
  const now = new Date();
  const formattedDate = `${now.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} • ${now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100%",
        background: "#fcfaf7",
        position: "relative",
        boxSizing: "border-box"
      }}
    >
      {/* 1. Content Container */}
      <div
        style={{
          flex: 1,
          padding: "20px 14px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "16px"
        }}
      >
        <SuccessHeader />

        <ConfirmationMessage />

        <OrderSummaryCard
          orderId={orderId}
          amountPaid={amountPaid}
          paymentMethod={paymentMethod}
          formattedDate={formattedDate}
        />

        <SuccessActionButtons
          onViewOrder={onViewOrder}
          onContinueShopping={onContinueShopping}
        />
      </div>

      {/* 2. Bottom Navigation */}
      <MobileBottomNav activeTab="orders" onTabChange={onTabChange} />
    </div>
  );
}
