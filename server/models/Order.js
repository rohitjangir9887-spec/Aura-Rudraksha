import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    orderId: { type: String, index: true },
    orderNumber: { type: String, index: true },
    authUserId: { type: String, index: true },
    customerId: { type: String, index: true },
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
    txnid: { type: String, default: "", index: true },
    mihpayid: { type: String, default: "", index: true },
    bankRefNum: { type: String, default: "" },
    paymentMode: { type: String, default: "" },
    paymentDetails: { type: mongoose.Schema.Types.Mixed, default: {} },
    paymentAttempts: { type: Array, default: [] },
    refundDetails: { type: mongoose.Schema.Types.Mixed, default: null },
    refundHistory: { type: Array, default: [] },
    orderStatus: { type: String, default: "Pending" }, // "Pending" until paid, then "Confirmed"
    status: { type: String, default: "Pending" },
    address: { type: String, default: "" },
    shippingAddress: { type: mongoose.Schema.Types.Mixed, default: {} },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    pincode: { type: String, default: "" },
    notes: { type: String, default: "" },
    orderSource: { type: String, default: "website", index: true },
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
});

export const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);
