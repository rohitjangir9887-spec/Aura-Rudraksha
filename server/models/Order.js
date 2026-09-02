import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    orderId: { type: String, index: true },
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
    paymentProvider: { type: String, default: "cashfree", index: true },
    cashfreeOrderId: { type: String, default: "", index: true },
    cashfreePaymentSessionId: { type: String, default: "" },
    cashfreeTransactionId: { type: String, default: "" },
    cashfreePaymentStatus: { type: String, default: "CREATED" },
    cashfreePaymentDetails: { type: mongoose.Schema.Types.Mixed, default: {} },
    paidAt: { type: String, default: "" },
    paymentMethod: { type: String, default: "Cashfree Payment Gateway (UPI, Cards, Netbanking)" },
    paymentStatus: { type: String, default: "Pending" },
    orderStatus: { type: String, default: "Created" },
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
