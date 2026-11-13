import mongoose from "mongoose";
import { Product } from "../models/Product.js";
import { Setting } from "../models/Setting.js";
import { Banner } from "../models/Banner.js";
import { Coupon } from "../models/Coupon.js";
import { Review } from "../models/Review.js";
import { ActiveOffer, Promotion, Offer } from "../models/Promotion.js";
import {
  defaultProducts,
  defaultBanners,
  defaultCoupons,
  defaultActiveOffer,
  defaultReviews,
  defaultSettings
} from "../data/defaultData.js";
import { applyOrderIndexes } from "./orderIndexService.js";
import { isDbConnected } from "../config/db.js";

let isInitializing = false;

/**
 * Initializes and auto-populates MongoDB with essential store data and indexes if collections are empty.
 * Safe, idempotent, insert-only semantics ($setOnInsert / exists check).
 */
export async function ensureDatabaseInitialized() {
  if (isInitializing) return { success: true, isInitializing: true };
  if (!isDbConnected() || !mongoose.connection || mongoose.connection.readyState !== 1) {
    return { success: false, message: "Database not connected" };
  }

  isInitializing = true;
  const start = Date.now();
  const summary = {
    productsSeeded: 0,
    couponsSeeded: 0,
    bannersSeeded: 0,
    reviewsSeeded: 0,
    settingsEnsured: false,
    activeOfferEnsured: false,
    indexesApplied: false
  };

  try {
    // Check system initialization state to avoid resurrecting deleted admin data
    const initState = await Setting.findOne({ id: "db_init_state" }).lean();
    const alreadySeededProducts = Boolean(initState?.productsInitialized);

    // 1. Ensure Products: NEVER auto-seed demo placeholder products into live stores.
    // Only seed in isolated test runs so schema/init tests remain verifiable without polluting live catalogs.
    const allowAutoSeedDemoProducts = Boolean(
      process.env.NODE_ENV === "test" ||
      process.env.VITEST === "true" ||
      process.env.AUTO_SEED_DEMO_PRODUCTS === "true"
    );
    const productCount = await Product.countDocuments();
    if (allowAutoSeedDemoProducts && !alreadySeededProducts && productCount === 0 && Array.isArray(defaultProducts) && defaultProducts.length > 0) {
      console.log("🌱 [DB Init] Test environment setup: seeding sample Rudraksha products...");
      for (const p of defaultProducts) {
        if (!p || !p.id) continue;
        const exists = await Product.exists({ id: String(p.id) });
        if (!exists) {
          const { _id, createdAt, updatedAt, ...cleanProduct } = p;
          try {
            await Product.create(cleanProduct);
            summary.productsSeeded++;
          } catch (_) {}
        }
      }
    }

    // Slug Migration for Existing MongoDB Products
    try {
      const noSlugProducts = await Product.find({
        $or: [
          { slug: { $exists: false } },
          { slug: null },
          { slug: "" }
        ]
      }).select("_id id name").lean();

      for (const doc of noSlugProducts) {
        const fallbackSlug = (doc.name || `product-${doc.id}`)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
        if (fallbackSlug) {
          await Product.updateOne({ _id: doc._id }, { $set: { slug: fallbackSlug } });
        }
      }

      // Clean any legacy demo image paths (/images/product-*.jpg) in existing MongoDB products & reviews
      const demoProducts = await Product.find({
        $or: [
          { img: { $regex: /^\/images\/product-/i } },
          { images: { $elemMatch: { $regex: /^\/images\/product-/i } } }
        ]
      }).lean();

      for (const prod of demoProducts) {
        const cleanedImages = (Array.isArray(prod.images) ? prod.images : [])
          .filter((u) => typeof u === "string" && !u.startsWith("/images/product-"));
        const finalImages = cleanedImages.length > 0 ? cleanedImages : ["/images/placeholder.svg"];
        const finalImg = (prod.img && !prod.img.startsWith("/images/product-")) ? prod.img : finalImages[0];
        await Product.updateOne(
          { _id: prod._id },
          { $set: { img: finalImg, images: finalImages } }
        );
      }

      await Review.updateMany(
        { images: { $elemMatch: { $regex: /^\/images\/product-/i } } },
        { $set: { images: [] } }
      );
    } catch (err) {
      console.warn("⚠️ [DB Init] Slug/Image migration notice:", err?.message);
    }

    // 2. Ensure Store Settings
    try {
      await Setting.findOneAndUpdate(
        { id: "STORE_SETTINGS" },
        { $setOnInsert: defaultSettings },
        { upsert: true }
      );
      summary.settingsEnsured = true;
    } catch (err) {
      console.warn("⚠️ [DB Init] Setting init warning:", err?.message);
    }

    // 3. Ensure Active Offer
    try {
      await ActiveOffer.findOneAndUpdate(
        { id: "OFFER-CENTRAL-1" },
        { $setOnInsert: defaultActiveOffer },
        { upsert: true }
      );
      summary.activeOfferEnsured = true;
    } catch (err) {
      console.warn("⚠️ [DB Init] Active offer init warning:", err?.message);
    }

    // 4. Ensure Banners
    const bannerCount = await Banner.countDocuments();
    if (bannerCount === 0 && Array.isArray(defaultBanners) && defaultBanners.length > 0) {
      const bannerDocs = defaultBanners.map((img, i) => ({
        id: `BANNER-${i + 1}`,
        image: img,
        position: "hero",
        isActive: true,
        sortOrder: i
      }));
      await Banner.insertMany(bannerDocs).catch(() => {});
      summary.bannersSeeded = bannerDocs.length;
    }

    // 5. Ensure coupons are initialized only on first setup without deleting admin coupons

    const alreadySeededCoupons = Boolean(initState?.couponsInitialized);
    if (!alreadySeededCoupons && Array.isArray(defaultCoupons) && defaultCoupons.length > 0) {
      console.log("🌱 [DB Init] First-time database setup: seeding initial discount coupons...");
      for (const c of defaultCoupons) {
        if (!c || !c.id) continue;
        const exists = await Coupon.exists({ id: String(c.id) });
        if (!exists) {
          const { _id, createdAt, updatedAt, ...cleanCoupon } = c;
          try {
            await Coupon.create(cleanCoupon);
            summary.couponsSeeded++;
          } catch (_) {}
        }
      }
    }
    await Setting.updateOne(
      { id: "db_init_state" },
      { $set: { productsInitialized: true, couponsInitialized: true, lastInitAt: new Date().toISOString() } },
      { upsert: true }
    );

    // 6. Ensure Sample Customer Reviews
    const reviewCount = await Review.countDocuments();
    if (reviewCount === 0 && Array.isArray(defaultReviews)) {
      for (const r of defaultReviews) {
        if (!r || !r.id) continue;
        const exists = await Review.exists({ id: String(r.id) });
        if (!exists) {
          const { _id, createdAt, updatedAt, ...cleanReview } = r;
          try {
            await Review.create({
              ...cleanReview,
              source: "customer",
              status: "Approved",
              isSample: true,
              sampleLabel: "Sample Review"
            });
            summary.reviewsSeeded++;
          } catch (_) {}
        }
      }
    }

    // 7. Apply and Verify Mongo Indexes on Orders collection
    try {
      const idxResult = await applyOrderIndexes();
      summary.indexesApplied = Boolean(idxResult?.success);
    } catch (idxErr) {
      console.warn("⚠️ [DB Init] Index build warning:", idxErr?.message);
    }

    const durationMs = Date.now() - start;
    return {
      success: true,
      summary,
      durationMs
    };
  } catch (err) {
    console.error("❌ [DB Init] Error during DB initialization:", err);
    return {
      success: false,
      error: err.message
    };
  } finally {
    isInitializing = false;
  }
}
