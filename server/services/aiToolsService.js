import { Product } from "../models/Product.js";
import { Order } from "../models/Order.js";
import { Coupon } from "../models/Coupon.js";
import { Customer } from "../models/Customer.js";
import { isDbConnected } from "../config/db.js";
import { extractMukhiNumber } from "./vedicKnowledgeService.js";
import { inMemoryStore } from "../data/inMemoryStore.js";

/**
 * Tool Function Declarations for Gemini API (@google/genai format)
 */
export const GEMINI_TOOL_DECLARATIONS = [
  {
    name: "searchProducts",
    description: "Search live products in the Aura Rudraksha store catalog by query, price range, category, or mukhi count.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: { type: "STRING", description: "Search query e.g. '5 mukhi', 'rudraksha mala', 'peace', 'wealth'" },
        minPrice: { type: "NUMBER", description: "Minimum price in INR" },
        maxPrice: { type: "NUMBER", description: "Maximum price in INR" },
        category: { type: "STRING", description: "Category filter e.g. 'Rudraksha', 'Mala', 'Bracelet'" },
        mukhi: { type: "STRING", description: "Mukhi count e.g. '5', '7', '11', 'gauri_shankar'" },
        inStockOnly: { type: "BOOLEAN", description: "Whether to return only in-stock items" }
      }
    }
  },
  {
    name: "getProductDetails",
    description: "Get complete details, price, lab certificate status, stock, and images for a specific product.",
    parameters: {
      type: "OBJECT",
      properties: {
        productId: { type: "STRING", description: "Product ID or MongoDB ObjectId" },
        slug: { type: "STRING", description: "Product URL slug e.g. '5-mukhi-rudraksha'" },
        name: { type: "STRING", description: "Exact or partial product name" }
      }
    }
  },
  {
    name: "checkStock",
    description: "Check live stock availability and count for a Rudraksha or Mala.",
    parameters: {
      type: "OBJECT",
      properties: {
        productId: { type: "STRING", description: "Product ID" },
        mukhi: { type: "STRING", description: "Mukhi bead e.g. '5', '7'" },
        productName: { type: "STRING", description: "Product Name" }
      }
    }
  },
  {
    name: "getActiveOffers",
    description: "Get all active promotional discounts, site-wide coupons, and special deals available today.",
    parameters: {
      type: "OBJECT",
      properties: {}
    }
  },
  {
    name: "getApplicableCoupon",
    description: "Validate a coupon discount code and calculate exact discount amount for a cart total.",
    parameters: {
      type: "OBJECT",
      properties: {
        code: { type: "STRING", description: "Coupon code entered by user e.g. 'SHRAWAN200', 'AURA10'" },
        cartTotal: { type: "NUMBER", description: "Total cart value in INR" }
      },
      required: ["code"]
    }
  },
  {
    name: "getShippingInfo",
    description: "Get live shipping cost, estimated delivery days, courier partners, and tracking terms.",
    parameters: {
      type: "OBJECT",
      properties: {}
    }
  },
  {
    name: "getReturnPolicy",
    description: "Get live 7-day return, replacement, refund, and lab certification guarantee policy.",
    parameters: {
      type: "OBJECT",
      properties: {}
    }
  },
  {
    name: "getOrderStatus",
    description: "Fetch real-time order status, courier tracking ID, and delivery estimate for an authenticated customer.",
    parameters: {
      type: "OBJECT",
      properties: {
        orderId: { type: "STRING", description: "Order ID e.g. 'ORD-9821' or ObjectId" },
        phone: { type: "STRING", description: "Customer phone number" },
        email: { type: "STRING", description: "Customer email address" }
      }
    }
  },
  {
    name: "getCustomerContext",
    description: "Get authenticated customer profile, recent order history, and saved preferences.",
    parameters: {
      type: "OBJECT",
      properties: {}
    }
  },
  {
    name: "addToCartAction",
    description: "Trigger adding a product directly to the customer's cart on the website.",
    parameters: {
      type: "OBJECT",
      properties: {
        productId: { type: "STRING", description: "Product ID to add to cart" },
        quantity: { type: "NUMBER", description: "Quantity to add" }
      },
      required: ["productId"]
    }
  },
  {
    name: "navigateAction",
    description: "Trigger navigating the customer to a specific page or product URL in the browser.",
    parameters: {
      type: "OBJECT",
      properties: {
        path: { type: "STRING", description: "Target website relative path e.g. '/checkout', '/cart', '/products'" }
      },
      required: ["path"]
    }
  }
];

/**
 * Execute tool calls server-side with strict user authentication scoping
 */
export async function executeAiToolCall(toolName, args = {}, authContext = {}) {
  const { authenticatedUserId, userEmail, userPhone } = authContext;

  try {
    switch (toolName) {
      case "searchProducts": {
        const { query = "", minPrice = 0, maxPrice = Infinity, category = "", mukhi = "", inStockOnly = false } = args;

        let filter = { status: { $nin: ["Draft", "draft", "Inactive", "inactive"] } };

        if (inStockOnly) {
          filter.inStock = { $ne: false };
        }

        if (category) {
          filter.category = new RegExp(category, "i");
        }

        if (minPrice > 0 || maxPrice < Infinity) {
          filter.price = {};
          if (minPrice > 0) filter.price.$gte = minPrice;
          if (maxPrice < Infinity) filter.price.$lte = maxPrice;
        }

        let products = [];
        if (isDbConnected()) {
          try {
            products = await Product.find(filter).lean();
          } catch (_) {
            products = [...(inMemoryStore.products || [])];
          }
        } else {
          products = [...(inMemoryStore.products || [])];
        }

        // Search text matching if query supplied
        if (query || mukhi) {
          const qLower = (query || mukhi).toLowerCase();
          const targetMukhi = mukhi || extractMukhiNumber(qLower);

          products = products.filter(p => {
            const pName = (p.name || "").toLowerCase();
            const pDesc = (p.description || p.highlight || "").toLowerCase();

            if (targetMukhi) {
              if (targetMukhi === "mala") return pName.includes("mala") || pName.includes("108");
              if (targetMukhi === "gauri_shankar") return pName.includes("gauri");
              if (targetMukhi === "ganesh") return pName.includes("ganesh");
              return pName.includes(`${targetMukhi} mukhi`) || pName.includes(`${targetMukhi}-mukhi`) || pName.includes(`${targetMukhi}mukhi`);
            }

            return pName.includes(qLower) || pDesc.includes(qLower);
          });
        }

        return {
          foundCount: products.length,
          products: products.slice(0, 5).map(p => ({
            id: String(p.id || p._id),
            name: p.name,
            price: Number(p.price),
            mrp: Number(p.mrp || p.comparePrice || Math.round(p.price * 1.35)),
            inStock: p.inStock !== false && (p.stock !== undefined ? Number(p.stock) : 0) > 0,
            rating: p.rating || 4.9,
            image: (p.images && p.images[0]) || p.img || p.image || "/images/product-5mukhi.jpg",
            category: p.category || "Rudraksha",
            slug: p.slug
          }))
        };
      }

      case "getProductDetails": {
        const { productId, slug, name } = args;
        let p = null;

        if (isDbConnected()) {
          try {
            if (productId) p = await Product.findOne({ $or: [{ id: productId }, { _id: productId }] }).lean();
            else if (slug) p = await Product.findOne({ slug }).lean();
            else if (name) p = await Product.findOne({ name: new RegExp(name, "i") }).lean();
          } catch (_) {
            p = null;
          }
        }

        if (!p) {
          if (productId) p = (inMemoryStore.products || []).find(prod => String(prod.id) === String(productId) || String(prod._id) === String(productId));
          else if (slug) p = (inMemoryStore.products || []).find(prod => prod.slug === slug);
          else if (name) p = (inMemoryStore.products || []).find(prod => String(prod.name || "").toLowerCase().includes(String(name).toLowerCase()));
        }

        if (!p) {
          return { error: "Product not found in current store inventory." };
        }

        const actualStock = p.stock !== undefined ? Number(p.stock) : 0;
        const actualInStock = p.inStock !== false && actualStock > 0;

        return {
          id: String(p.id || p._id),
          name: p.name,
          price: Number(p.price),
          mrp: Number(p.mrp || p.comparePrice || Math.round(p.price * 1.35)),
          inStock: actualInStock,
          stockCount: actualStock,
          rating: p.rating || 4.9,
          reviewsCount: p.reviews || 24,
          labCertificateIncluded: true,
          origin: "100% Nepali Origin (X-Ray Tested)",
          highlight: p.highlight || p.description,
          category: p.category || "Rudraksha",
          images: p.images || [p.img || p.image || "/images/product-5mukhi.jpg"]
        };
      }

      case "checkStock": {
        const { productId, mukhi, productName } = args;
        let stock = 0;
        let inStock = false;
        let name = productName || "Requested Rudraksha";

        let found = null;
        if (isDbConnected()) {
          try {
            let query = {};
            if (productId) query = { $or: [{ id: productId }, { _id: productId }] };
            else if (productName) query = { name: new RegExp(productName, "i") };
            else if (mukhi) {
              const num = parseInt(mukhi, 10);
              if (!isNaN(num)) query = { name: new RegExp(`${num}\\s*mukhi`, "i") };
            }

            found = await Product.findOne(query).lean();
          } catch (_) {
            found = null;
          }
        }

        if (!found) {
          if (productId) found = (inMemoryStore.products || []).find(prod => String(prod.id) === String(productId) || String(prod._id) === String(productId));
          else if (productName) found = (inMemoryStore.products || []).find(prod => String(prod.name || "").toLowerCase().includes(String(productName).toLowerCase()));
          else if (mukhi) {
            const num = parseInt(mukhi, 10);
            if (!isNaN(num)) found = (inMemoryStore.products || []).find(prod => String(prod.name || "").toLowerCase().includes(`${num} mukhi`) || String(prod.mukhi || "") === String(num));
          }
        }

        if (found) {
          name = found.name;
          stock = found.stock !== undefined ? Number(found.stock) : 0;
          inStock = found.inStock !== false && stock > 0;
        }

        return {
          productName: name,
          inStock,
          availableQuantity: stock,
          statusMessage: inStock ? `In Stock (${stock} pieces remaining)` : "Currently Out of Stock in Store"
        };
      }

      case "getActiveOffers": {
        let coupons = [];
        if (isDbConnected()) {
          coupons = await Coupon.find({ status: "Active" }).lean();
        }

        return {
          siteOffers: [
            { code: "SHRAWAN200", description: "Flat ₹200 OFF on orders above ₹1499", minOrder: 1499 },
            { code: "AURA10", description: "10% Instant Discount on all Lab-Certified Beads", minOrder: 999 }
          ],
          activeCoupons: coupons.map(c => ({
            code: c.code,
            discount: c.discount,
            type: c.type,
            minPurchase: c.minPurchase
          })),
          freeShipping: "FREE Express Delivery on all prepaid & COD orders across India"
        };
      }

      case "getApplicableCoupon": {
        const { code, cartTotal = 0 } = args;
        if (!code) return { valid: false, message: "Coupon code required." };

        const upperCode = code.toUpperCase().trim();
        let coupon = null;

        if (isDbConnected()) {
          coupon = await Coupon.findOne({ code: upperCode, status: "Active" }).lean();
        }

        if (!coupon) {
          if (upperCode === "SHRAWAN200") {
            if (cartTotal >= 1499) return { valid: true, discountAmount: 200, finalPrice: cartTotal - 200, message: "₹200 discount applied!" };
            return { valid: false, message: "Code 'SHRAWAN200' requires minimum cart total of ₹1499." };
          }
          if (upperCode === "AURA10") {
            const discount = Math.round(cartTotal * 0.10);
            return { valid: true, discountAmount: discount, finalPrice: cartTotal - discount, message: "10% discount applied!" };
          }
          return { valid: false, message: `Coupon code '${upperCode}' is not active or invalid.` };
        }

        if (cartTotal < (coupon.minPurchase || 0)) {
          return { valid: false, message: `Coupon '${upperCode}' requires minimum purchase of ₹${coupon.minPurchase}.` };
        }

        let discountAmount = 0;
        if (coupon.type === "percentage") {
          discountAmount = Math.round((cartTotal * coupon.discount) / 100);
        } else {
          discountAmount = coupon.discount;
        }

        return {
          valid: true,
          code: upperCode,
          discountAmount,
          finalPrice: Math.max(0, cartTotal - discountAmount),
          message: `Coupon '${upperCode}' successfully applied!`
        };
      }

      case "getShippingInfo": {
        let shippingInfo = {
          freeShipping: true,
          timeline: "3 to 5 business days across India",
          dispatchTime: "Same day dispatch for orders placed before 2 PM",
          courierPartners: ["BlueDart Express", "Delhivery", "India Post SpeedPost"],
          packaging: "Tamper-proof protective spiritual velvet box with Lab Test Report"
        };
        if (isDbConnected()) {
          try {
            const mongoose = (await import("mongoose")).default;
            const SettingModel = mongoose.model("Setting");
            const ss = await SettingModel.findOne({ id: "STORE_SETTINGS" }).lean();
            if (ss) {
               if (ss.shippingPolicy) shippingInfo.policy = ss.shippingPolicy;
               shippingInfo.standardShippingFee = ss.standardShippingFee;
               shippingInfo.freeShippingThreshold = ss.freeShippingThreshold;
               shippingInfo.freeShipping = ss.standardShippingFee === 0;
            }
          } catch(e) {}
        }
        return shippingInfo;
      }

      case "getReturnPolicy": {
        let returnInfo = {
          returnWindow: "7 Days Easy Replacement & Refund",
          conditions: "Full refund or exchange if damaged, defective, or incorrect item received",
          authenticityGuarantee: "100% Original Nepali Origin with Official Government-Approved Gemological Lab Test Certificate",
          process: "Contact Aura Support via AI Chat or email support@aurarudraksha.com"
        };
        if (isDbConnected()) {
           try {
             const mongoose = (await import("mongoose")).default;
             const SettingModel = mongoose.model("Setting");
             const ss = await SettingModel.findOne({ id: "STORE_SETTINGS" }).lean();
             if (ss && ss.returnPolicy) {
                returnInfo.policy = ss.returnPolicy;
             }
           } catch(e) {}
        }
        return returnInfo;
      }

      case "getOrderStatus": {
        const { orderId, phone, email } = args;

        if (!isDbConnected()) {
          return {
            found: false,
            message: "Database connection unavailable. Cannot fetch order status."
          };
        }

        // Strict Owner Isolation: Match authUserId, customerEmail, or customerPhone
        let userCondition = {};
        if (authenticatedUserId && authenticatedUserId !== "guest") {
          userCondition = { $or: [{ authUserId: authenticatedUserId }, { userId: authenticatedUserId }] };
        } else {
          // Guest lookup: MUST provide orderId AND (email OR phone)
          if (!orderId) {
            return {
              error: "Order ID is required to track an order as a guest."
            };
          }
          if (email || userEmail) {
            const targetEmail = (email || userEmail).toLowerCase().trim();
            userCondition = { $or: [{ customerEmail: targetEmail }, { email: targetEmail }] };
          } else if (phone || userPhone) {
            const targetPhone = (phone || userPhone).trim();
            userCondition = { $or: [{ customerPhone: targetPhone }, { phone: targetPhone }] };
          } else {
            return {
              error: "Authentication required to fetch order details. Please log in or provide your registered email/phone."
            };
          }
        }

        let query = { ...userCondition };
        if (orderId) {
          const cleanId = String(orderId).trim();
          query.$and = [
            userCondition,
            {
              $or: [
                { id: cleanId },
                { orderId: cleanId },
                { orderNumber: cleanId },
                ...(cleanId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: cleanId }] : [])
              ]
            }
          ];
        }

        const foundOrder = await Order.findOne(query).sort({ createdAt: -1 }).lean();

        if (!foundOrder) {
          return {
            found: false,
            message: "No order found matching your credentials. Please verify your Order ID and registered phone/email."
          };
        }

        return {
          found: true,
          orderId: foundOrder.orderNumber || foundOrder.orderId || foundOrder.id || String(foundOrder._id),
          status: foundOrder.orderStatus || foundOrder.status || "Processing",
          paymentStatus: foundOrder.paymentStatus || "Pending",
          total: foundOrder.finalAmount || foundOrder.total || foundOrder.amount,
          itemsCount: (foundOrder.items || foundOrder.snapshotItems || []).length,
          trackingId: foundOrder.trackingNumber || foundOrder.trackingId || "",
          courier: foundOrder.courierName || foundOrder.carrier || foundOrder.courierPartner || "Express Shipping",
          estimatedDelivery: foundOrder.estimatedDeliveryDate || foundOrder.estimatedDelivery || "3-5 Business Days",
          createdAt: foundOrder.createdAt || foundOrder.date
        };
      }

      case "getCustomerContext": {
        if (!authenticatedUserId || authenticatedUserId === "guest") {
          return {
            isAuthenticated: false,
            role: "Guest Devotee",
            message: "Guest user. Log in to view personal order history and saved addresses."
          };
        }

        let custProfile = null;
        let ordersCount = 0;

        if (isDbConnected()) {
          custProfile = await Customer.findOne({
            $or: [
              { authUserId: authenticatedUserId },
              { userId: authenticatedUserId },
              ...(userEmail ? [{ email: userEmail.toLowerCase() }] : [])
            ]
          }).lean();
          ordersCount = await Order.countDocuments({
            $or: [{ authUserId: authenticatedUserId }, { userId: authenticatedUserId }]
          });
        }

        return {
          isAuthenticated: true,
          userId: authenticatedUserId,
          name: custProfile?.name || userEmail?.split("@")[0] || "Devotee",
          email: userEmail || custProfile?.email,
          phone: custProfile?.phone || userPhone || "",
          totalOrdersPlaced: ordersCount,
          addresses: custProfile?.addresses || []
        };
      }

      case "addToCartAction": {
        const { productId, quantity = 1 } = args;
        return {
          action: "ADD_TO_CART",
          productId,
          quantity,
          message: `Signaled browser to add product ${productId} to cart.`
        };
      }

      case "navigateAction": {
        const { path } = args;
        return {
          action: "NAVIGATE",
          path,
          message: `Signaled browser to navigate to ${path}.`
        };
      }

      default:
        return { error: `Unknown tool execution requested: ${toolName}` };
    }
  } catch (err) {
    console.error(`[AI Tool Error] Tool ${toolName} execution failed:`, err?.message);
    return { error: `Failed to execute ${toolName}: ${err?.message}` };
  }
}
