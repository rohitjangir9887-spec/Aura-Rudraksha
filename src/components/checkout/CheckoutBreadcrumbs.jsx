import React from "react";
import { Check, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * CheckoutBreadcrumbs
 * Visual sacred sequence: Cart → Shipping Address → Order Review → Payment
 */
export function CheckoutBreadcrumbs({ currentStep = "payment" }) {
  const steps = [
    { id: "cart", label: "Cart", link: "/cart", stepNum: 1, completed: true },
    { id: "shipping", label: "Shipping Address", stepNum: 2, completed: currentStep === "review" || currentStep === "payment" },
    { id: "review", label: "Order Review", stepNum: 3, completed: currentStep === "payment" },
    { id: "payment", label: "Payment", stepNum: 4, completed: false, active: true }
  ];

  return (
    <div 
      id="checkout-progress-stepper"
      style={{
        background: "#ffffff",
        border: "1px solid #ebd9c8",
        borderRadius: "14px",
        padding: "12px 16px",
        marginBottom: "20px",
        boxShadow: "0 2px 8px rgba(43, 23, 13, 0.02)"
      }}
    >
      <div 
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          maxWidth: "720px",
          margin: "0 auto",
          overflowX: "auto",
          gap: "8px"
        }}
      >
        {steps.map((step, idx) => {
          const isCurrent = step.id === currentStep;
          const isDone = step.completed;

          return (
            <React.Fragment key={step.id}>
              <div 
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  flexShrink: 0,
                  opacity: isCurrent || isDone ? 1 : 0.5
                }}
              >
                {/* Step Circle Badge */}
                <div 
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: isDone 
                      ? "#16a34a" 
                      : isCurrent 
                        ? "linear-gradient(135deg, #b88a58 0%, #8c5d2e 100%)" 
                        : "#f0e6da",
                    color: isDone || isCurrent ? "#ffffff" : "#806f62",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    fontWeight: "800",
                    boxShadow: isCurrent ? "0 2px 6px rgba(184, 138, 88, 0.35)" : "none"
                  }}
                >
                  {isDone ? <Check size={13} strokeWidth={3} /> : step.stepNum}
                </div>

                {/* Step Name */}
                {step.link ? (
                  <Link 
                    to={step.link} 
                    style={{
                      fontSize: "12.5px",
                      fontWeight: isCurrent ? "700" : "600",
                      color: isCurrent ? "#2b170d" : isDone ? "#166534" : "#806f62",
                      textDecoration: "none"
                    }}
                  >
                    {step.label}
                  </Link>
                ) : (
                  <span 
                    style={{
                      fontSize: "12.5px",
                      fontWeight: isCurrent ? "700" : "600",
                      color: isCurrent ? "#2b170d" : isDone ? "#166534" : "#806f62"
                    }}
                  >
                    {step.label}
                  </span>
                )}
              </div>

              {idx < steps.length - 1 && (
                <div 
                  style={{
                    color: isDone ? "#16a34a" : "#d9c6b3",
                    display: "flex",
                    alignItems: "center",
                    flexShrink: 0
                  }}
                >
                  <ChevronRight size={14} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
