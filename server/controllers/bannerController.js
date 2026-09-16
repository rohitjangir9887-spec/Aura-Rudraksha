import mongoose from "mongoose";
import { Banner } from "../models/Banner.js";
import { isDbConnected, connectDB } from "../config/db.js";
import { isSafeImageValue } from "../utils/imageValidation.js";
import { inMemoryStore } from "../data/inMemoryStore.js";
import { defaultBanners } from "../data/defaultData.js";

export async function getBanners(req, res, next) {
  try {
    if (!isDbConnected()) {
      await connectDB().catch(() => {});
    }
    if (!isDbConnected()) {
      const bannerUrls = inMemoryStore.banners || defaultBanners;
      return res.json({ success: true, data: bannerUrls, full: [], isFallback: true });
    }
    res.setHeader("Cache-Control", "no-cache, must-revalidate");
    const banners = await Banner.find().sort({ sortOrder: 1, createdAt: 1 }).lean();
    const bannerUrls = banners.map(b => b.image || b);
    return res.json({ success: true, data: bannerUrls, full: banners });
  } catch (err) {
    next(err);
  }
}

export async function saveBanners(req, res, next) {
  try {
    const data = req.body;
    let bannerArray = Array.isArray(data) ? data : (data.banners || []);

    bannerArray = bannerArray.filter((item) => {
      const img = typeof item === "string" ? item : (item?.image || item?.url || "");
      return isSafeImageValue(img);
    });

    inMemoryStore.banners = bannerArray;

    if (!isDbConnected()) {
      await connectDB().catch(() => {});
    }

    if (isDbConnected()) {
      await Banner.deleteMany({});
      const docs = bannerArray.map((item, idx) => ({
        id: typeof item === "object" && item.id ? item.id : `BANNER-${Date.now()}-${idx}`,
        image: typeof item === "string" ? item : (item.image || item.url || ""),
        title: typeof item === "object" ? item.title : "",
        subtitle: typeof item === "object" ? item.subtitle : "",
        link: typeof item === "object" ? item.link : "/shop",
        position: typeof item === "object" ? item.position || "hero" : "hero",
        isActive: typeof item === "object" && item.isActive !== undefined ? item.isActive : true,
        sortOrder: idx
      }));
      await Banner.insertMany(docs);
    }

    return res.json({ success: true, data: bannerArray });
  } catch (err) {
    next(err);
  }
}

export async function createBanner(req, res, next) {
  try {
    const data = req.body;
    const img = data.image || data.url || "";
    if (!isSafeImageValue(img)) {
      return res.status(400).json({
        success: false,
        message: "Invalid banner image. Only http(s) URLs, site-relative paths, or JPEG/PNG/WebP/GIF data URLs are allowed."
      });
    }
    const id = data.id || `BANNER-${Date.now()}`;
    const payload = { ...data, id };

    if (!Array.isArray(inMemoryStore.banners)) inMemoryStore.banners = [];
    inMemoryStore.banners.push(payload);

    if (!isDbConnected()) {
      await connectDB().catch(() => {});
    }

    if (isDbConnected()) {
      const created = await Banner.create(payload);
      return res.status(201).json({ success: true, data: created });
    }

    return res.status(201).json({ success: true, data: payload });
  } catch (err) {
    next(err);
  }
}

export async function deleteBanner(req, res, next) {
  try {
    const { id } = req.params;
    const bannerId = String(id).trim();

    if (Array.isArray(inMemoryStore.banners)) {
      inMemoryStore.banners = inMemoryStore.banners.filter(b => {
        if (typeof b === "string") return b !== bannerId;
        return b?.id !== bannerId && b?.image !== bannerId && String(b?._id) !== bannerId;
      });
    }

    if (!isDbConnected()) {
      await connectDB().catch(() => {});
    }

    if (isDbConnected()) {
      const deleteConds = [{ id: bannerId }, { image: bannerId }];
      if (mongoose.Types.ObjectId.isValid(bannerId)) {
        deleteConds.push({ _id: bannerId });
      }
      await Banner.findOneAndDelete({ $or: deleteConds });
    }

    return res.json({ success: true, message: "Banner deleted", id: bannerId });
  } catch (err) {
    next(err);
  }
}

