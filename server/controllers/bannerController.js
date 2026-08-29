import { Banner } from "../models/Banner.js";
import { isDbConnected } from "../config/db.js";
import { inMemoryStore } from "../data/inMemoryStore.js";
import { isSafeImageValue } from "../utils/imageValidation.js";

export async function getBanners(req, res, next) {
  try {
    if (isDbConnected()) {
      const banners = await Banner.find().sort({ sortOrder: 1, createdAt: 1 }).lean();
      const bannerUrls = banners.map(b => b.image || b);
      return res.json({ success: true, data: bannerUrls, full: banners });
    }

    const banners = inMemoryStore.getBanners();
    return res.json({ success: true, data: banners, demoMode: true });
  } catch (err) {
    next(err);
  }
}

export async function saveBanners(req, res, next) {
  try {
    const data = req.body;
    let bannerArray = Array.isArray(data) ? data : (data.banners || []);

    // Server-side image allowlist: same MIME/size rules as review photos
    // and product images. Drops any banner whose image isn't a plain
    // http(s) URL, a same-origin relative path, or an allowlisted raster
    // data URL - in particular this rejects data:image/svg+xml, which can
    // carry embedded script (a stored-XSS vector).
    bannerArray = bannerArray.filter((item) => {
      const img = typeof item === "string" ? item : (item?.image || item?.url || "");
      return isSafeImageValue(img);
    });

    if (isDbConnected()) {
      // Clear and re-populate in MongoDB
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
      inMemoryStore.saveBanners(bannerArray);
      return res.json({ success: true, data: bannerArray });
    }

    inMemoryStore.saveBanners(bannerArray);
    return res.json({ success: true, data: bannerArray, demoMode: true });
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

    if (isDbConnected()) {
      const created = await Banner.create(payload);
      return res.status(201).json({ success: true, data: created });
    }

    const banners = inMemoryStore.getBanners();
    banners.push(payload.image || payload.url || "");
    inMemoryStore.saveBanners(banners);
    return res.status(201).json({ success: true, data: payload, demoMode: true });
  } catch (err) {
    next(err);
  }
}

export async function deleteBanner(req, res, next) {
  try {
    const { id } = req.params;
    if (isDbConnected()) {
      await Banner.findOneAndDelete({ $or: [{ id: String(id) }, { image: String(id) }] });
      inMemoryStore.deleteBanner(id);
      return res.json({ success: true, message: "Banner deleted", id });
    }

    inMemoryStore.deleteBanner(id);
    return res.json({ success: true, message: "Banner deleted", id, demoMode: true });
  } catch (err) {
    next(err);
  }
}

