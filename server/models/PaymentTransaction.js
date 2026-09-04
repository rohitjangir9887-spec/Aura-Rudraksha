import mongoose from "mongoose";

const paymentTransactionSchema = new mongoose.Schema(
  {
    transactionId: { type: String, required: true, unique: true, index: true }, // Internal txnid sent to PayU
    orderId: { type: String, required: true, index: true },
    orderNumber: { type: String, default: "", index: true },
    authUserId: { type: String, default: "", index: true },
    provider: { type: String, default: "payu" },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    status: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED", "REVIEW", "REFUND_PENDING", "PARTIAL_REFUND", "REFUNDED"],
      default: "PENDING",
      index: true
    },
    gatewayPaymentId: { type: String, default: "", index: true }, // mihpayid from PayU
    bankRefNum: { type: String, default: "" },
    paymentMode: { type: String, default: "" }, // UPI, DC, CC, NB
    errorMessage: { type: String, default: "" },
    idempotencyKey: { type: String, default: "", index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    refunds: { type: Array, default: [] },
    initiatedAt: { type: Date, default: Date.now },
    verifiedAt: { type: Date },
    completedAt: { type: Date }
  },
  { timestamps: true }
);

export const PaymentTransaction =
  mongoose.models.PaymentTransaction || mongoose.model("PaymentTransaction", paymentTransactionSchema);
