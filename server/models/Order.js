import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    orderId: { type: String },
    orderNumber: { type: String },
    authUserId: { type: String },
    guestToken: { type: String, default: "" },
    customerId: { type: String },
    customerName: { type: String, default: "Customer" },
    customerEmail: { type: String, default: "" },
    customerPhone: { type: String, default: "" },
    phone: { type: String, default: "" },
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    items: { type: Array, default: [] },
    snapshotItems: { type: Array, default: [] },
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    couponCode: { type: String, default: "" },
    couponDiscount: { type: Number, default: 0 },
    shipping: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
    finalAmount: { type: Number, default: 0 },
    amountRefunded: { type: Number, default: 0 },
    paymentMethod: { type: String, default: "PayU Hosted Checkout (UPI / Cards / NetBanking)" },
    paymentStatus: { type: String, default: "Pending" }, // "Pending", "Paid", "Failed", "Refunded", "Partially Refunded"
    txnid: { type: String, default: "" },
    mihpayid: { type: String, default: "" },
    bankRefNum: { type: String, default: "" },
    paymentMode: { type: String, default: "" },
    paymentDetails: { type: mongoose.Schema.Types.Mixed, default: {} },
    paymentAttempts: { type: Array, default: [] },
    refundDetails: { type: mongoose.Schema.Types.Mixed, default: null },
    refundHistory: { type: Array, default: [] },
    messages: { type: Array, default: [] },
    refundStatus: { type: String, default: "None" }, // "None", "Refund Pending", "Partially Refunded", "Refunded"
    refundNote: { type: String, default: "" },
    refundNotes: { type: String, default: "" },
    cancelledBy: { type: String, default: "" }, // "Seller", "Customer", "System"
    cancelReason: { type: String, default: "" },
    cancelledAt: { type: String, default: "" },
    orderStatus: { type: String, default: "Pending" }, // "Pending", "Confirmed", "Processing", "Shipped", "Delivered", "Cancelled"
    status: { type: String, default: "Pending" },
    address: { type: String, default: "" },
    shippingAddress: { type: mongoose.Schema.Types.Mixed, default: {} },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    pincode: { type: String, default: "" },
    notes: { type: String, default: "" },
    orderSource: { type: String, default: "website" },
    source: { type: String, default: "website" },
    trackingNumber: { type: String, default: "" },
    trackingId: { type: String, default: "" },
    courierName: { type: String, default: "" },
    carrier: { type: String, default: "" },
    trackingUrl: { type: String, default: "" },
    shippingLink: { type: String, default: "" },
    estimatedDelivery: { type: String, default: "" },
    estimatedDeliveryDate: { type: String, default: "" },
    date: { type: String, default: () => new Date().toISOString() }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

orderSchema.index({ orderId: 1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ authUserId: 1 });
orderSchema.index({ email: 1 });
orderSchema.index({ customerEmail: 1 });
orderSchema.index({ phone: 1 });
orderSchema.index({ customerPhone: 1 });
orderSchema.index({ "shippingAddress.email": 1 });
orderSchema.index({ "shippingAddress.phone": 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ guestToken: 1 });
orderSchema.index({ customerId: 1 });
orderSchema.index({ txnid: 1 });
orderSchema.index({ mihpayid: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ refundStatus: 1 });
orderSchema.index({ orderSource: 1 });
orderSchema.index({ "paymentAttempts.txnid": 1 });

orderSchema.pre("save", function () {
  if (!this.orderId && this.id) {
    this.orderId = this.id;
  }
  if (!this.id && this.orderId) {
    this.id = this.orderId;
  }
  if (!this.orderNumber) {
    this.orderNumber = this.orderId || this.id;
  }
  if (!this.amount && this.total) {
    this.amount = this.total;
  }
  if (!this.total && this.amount) {
    this.total = this.amount;
  }
  if (!this.finalAmount) {
    this.finalAmount = this.total || this.amount || 0;
  }
  if (!this.phone && this.customerPhone) {
    this.phone = this.customerPhone;
  }
  if (!this.customerPhone && this.phone) {
    this.customerPhone = this.phone;
  }

  // Invariant Enforcement
  const isCancelled = this.status === "Cancelled" || this.orderStatus === "Cancelled" || Boolean(this.cancelledAt);
  if (isCancelled) {
    this.status = "Cancelled";
    this.orderStatus = "Cancelled";
    if (!this.cancelledBy) this.cancelledBy = "Seller";
  }

  const amtRefunded = Number(this.amountRefunded || 0);
  const totalAmt = Number(this.finalAmount || this.total || this.amount || 0);
  if (amtRefunded > 0 && amtRefunded >= (totalAmt - 0.01)) {
    this.refundStatus = "Refunded";
  } else if (amtRefunded > 0) {
    this.refundStatus = "Partially Refunded";
  } else if (isCancelled && (!this.paymentStatus || ["Pending", "Failed", "Not Received", "Unpaid"].includes(this.paymentStatus))) {
    this.paymentStatus = "Not Received";
    this.refundStatus = "None";
  }
});

export const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);
