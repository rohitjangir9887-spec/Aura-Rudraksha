import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    authUserId: { type: String, unique: true, sparse: true, index: true },
    role: { type: String, enum: ["customer", "admin"], default: "customer" },
    name: { type: String, default: "Customer", trim: true },
    email: { type: String, default: "", trim: true, lowercase: true, index: true },
    phone: { type: String, default: "", trim: true, index: true },
    address: { type: String, default: "" },
    addresses: { type: Array, default: [] },
    wishlist: { type: [String], default: [] },
    joined: { type: String, default: () => new Date().toISOString() },
    firstSeen: { type: String, default: () => new Date().toISOString() },
    lastSeen: { type: String, default: () => new Date().toISOString() },
    lastLoginAt: { type: Date },
    visits: { type: Number, default: 1 },
    status: { type: String, default: "Active" },
    totalOrders: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    avgOrderValue: { type: Number, default: 0 },
    lastOrderDate: { type: String, default: null }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

export const Customer = mongoose.models.Customer || mongoose.model("Customer", customerSchema);
export default Customer;
