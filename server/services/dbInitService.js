import mongoose from "mongoose";
import { Product } from "../models/Product.js";
import { Setting } from "../models/Setting.js";
import { Banner } from "../models/Banner.js";
import { Coupon } from "../models/Coupon.js";
import { Review } from "../models/Review.js";
import { ActiveOffer } from "../models/Promotion.js";
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
    // 1. Check and Seed Products if collection is empty
    const productCount = await Product.countDocuments();
    if (productCount === 0 && Array.isArray(defaultProducts)) {
      console.log("🌱 [DB Init] Product collection empty. Seeding default Rudraksha catalog...");
      for (const p of defaultProducts) {
        if (!p || !p.id) continue;
        const exists = await Product.exists({ id: String(p.id) });
        if (!exists) {
          const { _id, createdAt, updatedAt, ...cleanProduct } = p;
          try {
            await Product.create(cleanProduct);
            summary.productsSeeded++;
          } catch (err) {
            // ignore duplicate keys if race condition
          }
        }
      }
      console.log(`✅ [DB Init] Seeded ${summary.productsSeeded} products.`);
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

    // Check system initialization state to avoid resurrecting deleted admin data
    const initState = await Setting.findOne({ id: "db_init_state" }).lean();
    const alreadySeededCoupons = Boolean(initState?.couponsInitialized);

    // 5. Ensure Coupons (ONLY on very first database creation, NEVER reseed after admin deletes them)
    const couponCount = await Coupon.countDocuments();
    if (!alreadySeededCoupons && couponCount === 0 && Array.isArray(defaultCoupons)) {
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
      { $set: { couponsInitialized: true, lastInitAt: new Date().toISOString() } },
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
