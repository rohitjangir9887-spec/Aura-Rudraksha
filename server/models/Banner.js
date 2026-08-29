import mongoose from "mongoose";

const bannerSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    image: { type: String, required: true },
    title: { type: String, default: "" },
    subtitle: { type: String, default: "" },
    link: { type: String, default: "/shop" },
    position: { type: String, default: "hero" },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

export const Banner = mongoose.models.Banner || mongoose.model("Banner", bannerSchema);
