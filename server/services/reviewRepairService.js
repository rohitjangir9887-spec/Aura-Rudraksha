import { Review } from "../models/Review.js";
import { Product } from "../models/Product.js";
import { isDbConnected } from "../config/db.js";
import { sanitizeAuthorName, sanitizeReviewText, parseSingleRating } from "./aiReviewService.js";
import { syncProductReviewStats } from "../controllers/reviewController.js";

/**
 * Scans all reviews in the MongoDB database to identify malformed records.
 * Generates proposed fixes for preview before saving.
 */
export async function auditReviewHealth() {
  if (!isDbConnected()) {
    return {
      success: false,
      message: "Database connection required for audit"
    };
  }

  const allReviews = await Review.find({ status: { $ne: "deleted" } }).lean();
  const allProducts = await Product.find({}).select("id name slug").lean();
  const productMap = new Map();
  allProducts.forEach(p => {
    productMap.set(String(p.id), p.name);
    if (p.slug) productMap.set(String(p.slug), p.name);
  });

  const issuesFound = [];
  const cleanCount = { total: allReviews.length, healthy: 0, malformed: 0 };

  for (const rev of allReviews) {
    const rawName = rev.name || "";
    const rawText = rev.text || "";
    const cleanName = sanitizeAuthorName(rawName);
    const cleanText = sanitizeReviewText(rawText);

    const nameChanged = cleanName !== rawName;
    const textChanged = cleanText !== rawText;
    const ratingNum = Number(rev.rating);
    const ratingInvalid = isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5;
    const missingProduct = rev.productId && rev.productId !== "all" && !productMap.has(String(rev.productId));

    if (nameChanged || textChanged || ratingInvalid || missingProduct) {
      cleanCount.malformed++;
      issuesFound.push({
        id: rev.id,
        current: {
          name: rawName,
          rating: rev.rating,
          text: rawText,
          productId: rev.productId,
          productName: rev.productName,
          status: rev.status,
          source: rev.source,
          publicDisplay: rev.publicDisplay
        },
        proposed: {
          name: cleanName,
          rating: ratingInvalid ? 5 : ratingNum,
          text: cleanText,
          productId: missingProduct ? "all" : rev.productId,
          productName: missingProduct ? "Aura Rudraksha Sacred Store" : rev.productName
        },
        reasons: [
          nameChanged ? "Author name contained artifact/prefix" : null,
          textChanged ? "Review body contained prefix/label/number" : null,
          ratingInvalid ? "Rating was out of range or NaN" : null,
          missingProduct ? "Assigned product not found in catalog" : null
        ].filter(Boolean)
      });
    } else {
      cleanCount.healthy++;
    }
  }

  return {
    success: true,
    summary: cleanCount,
    issues: issuesFound
  };
}

/**
 * Safely applies approved repairs to malformed review records in MongoDB.
 */
export async function repairMalformedReviews(reviewIds = []) {
  if (!isDbConnected()) {
    return {
      success: false,
      message: "Database connection required for repair"
    };
  }

  const query = { status: { $ne: "deleted" } };
  if (Array.isArray(reviewIds) && reviewIds.length > 0) {
    query.id = { $in: reviewIds.map(String) };
  }

  const reviewsToRepair = await Review.find(query);
  const repairedList = [];
  const affectedProductIds = new Set();

  for (const rev of reviewsToRepair) {
    const cleanName = sanitizeAuthorName(rev.name);
    const cleanText = sanitizeReviewText(rev.text);
    let ratingNum = Number(rev.rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) ratingNum = 5;

    let hasChanges = false;
    if (cleanName !== rev.name) {
      rev.name = cleanName;
      hasChanges = true;
    }
    if (cleanText !== rev.text) {
      rev.text = cleanText;
      hasChanges = true;
    }
    if (ratingNum !== rev.rating) {
      rev.rating = ratingNum;
      hasChanges = true;
    }

    if (hasChanges) {
      await rev.save();
      repairedList.push({ id: rev.id, name: rev.name, rating: rev.rating, text: rev.text });
      if (rev.productId) affectedProductIds.add(String(rev.productId));
    }
  }

  // Recalculate stats for all affected products
  for (const pid of affectedProductIds) {
    await syncProductReviewStats(pid);
  }

  return {
    success: true,
    repairedCount: repairedList.length,
    repaired: repairedList
  };
}
