import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    code: { type: String, required: true, uppercase: true, trim: true, unique: true, index: true },
    discount: { type: Number, required: true, min: 0 },
    type: { type: String, enum: ["percentage", "fixed"], default: "percentage" },
    limit: { type: Number, default: 1000 },
    usage: { type: Number, default: 0 },
    minAmount: { type: Number, default: 0 },
    minOrderValue: { type: Number, default: 0 }, // legacy alias of minAmount
    expiry: { type: String, default: null },
    status: { type: String, enum: ["Active", "Inactive", "Expired"], default: "Active" }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

export const Coupon = mongoose.models.Coupon || mongoose.model("Coupon", couponSchema);
