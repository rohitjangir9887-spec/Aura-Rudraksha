import { Banner } from "../models/Banner.js";
import { isDbConnected } from "../config/db.js";
import { isSafeImageValue } from "../utils/imageValidation.js";
import { inMemoryStore } from "../data/inMemoryStore.js";

export async function getBanners(req, res, next) {
  try {
    if (!isDbConnected()) {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      const bannerUrls = inMemoryStore.banners.map(b => typeof b === "string" ? b : (b.image || b.url || ""));
      return res.json({ success: true, data: bannerUrls, full: inMemoryStore.banners });
    }
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
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

    if (!isDbConnected()) {
      inMemoryStore.banners = bannerArray;
      return res.json({ success: true, data: bannerArray });
    }

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

    if (!isDbConnected()) {
      inMemoryStore.banners.push(payload);
      return res.status(201).json({ success: true, data: payload });
    }

    const created = await Banner.create(payload);
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
}

export async function deleteBanner(req, res, next) {
  try {
    const { id } = req.params;
    if (!isDbConnected()) {
      inMemoryStore.banners = inMemoryStore.banners.filter(b => {
        const bId = typeof b === "string" ? b : (b.id || b.image);
        return String(bId) !== String(id);
      });
      return res.json({ success: true, message: "Banner deleted", id });
    }

    await Banner.findOneAndDelete({ $or: [{ id: String(id) }, { image: String(id) }] });
    return res.json({ success: true, message: "Banner deleted", id });
  } catch (err) {
    next(err);
  }
}

