import crypto from "crypto";
import { Customer } from "../models/Customer.js";
import { Order } from "../models/Order.js";
import { isDbConnected, connectDB } from "../config/db.js";
import { pickFields } from "../utils/sanitize.js";
import { normalizePhoneNumber, buildPhoneQueryVariants, extractRaw10DigitPhone } from "../utils/phoneUtils.js";

// Fields an admin may create/update on a customer record via the admin
// dashboard. `role`, `id`, and `authUserId` are deliberately excluded so an
// admin-panel write can never grant admin access or hijack another
// customer's identity - role is only ever derived server-side from the
// verified initial-admin email/phone (see middleware/auth.js hasAdminRole).
const ADMIN_CUSTOMER_FIELDS = {
  name: "string", email: "string", phone: "string", address: "string",
  addresses: "array", status: "string", wishlist: "array"
};

export async function getCustomers(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: "Database unavailable",
        message: "Database is temporarily unavailable. Please try again shortly.",
        databaseUnavailable: true
      });
    }
    const customers = await Customer.find().sort({ updatedAt: -1 }).lean();
    return res.json({ success: true, data: customers, count: customers.length });
  } catch (err) {
    next(err);
  }
}

export async function getCustomerById(req, res, next) {
  try {
    const { id } = req.params;
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: "Database unavailable",
        message: "Database is temporarily unavailable. Please try again shortly.",
        databaseUnavailable: true
      });
    }

    let customer = await Customer.findOne({
      $or: [{ id: String(id) }, { email: String(id).toLowerCase() }, { phone: String(id) }]
    }).lean();
    if (!customer && id.match(/^[0-9a-fA-F]{24}$/)) {
      customer = await Customer.findById(id).lean();
    }
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }
    return res.json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
}

export async function saveCustomer(req, res, next) {
  try {
    const data = pickFields(req.body, ADMIN_CUSTOMER_FIELDS);
    const email = (data.email || "").trim().toLowerCase();
    const phone = (data.phone || "").trim();
    const now = new Date().toISOString();

    const id = req.body.id || ("CUS-" + crypto.randomBytes(4).toString("hex").toUpperCase());
    const customerPayload = {
      ...data,
      id,
      email,
      phone,
      lastSeen: now,
      joined: now
    };

    if (!Array.isArray(inMemoryStore.customers)) inMemoryStore.customers = [];
    const idx = inMemoryStore.customers.findIndex(c => c.id === id || (email && c.email === email) || (phone && c.phone === phone));
    if (idx !== -1) {
      Object.assign(inMemoryStore.customers[idx], data, { lastSeen: now });
    } else {
      inMemoryStore.customers.push(customerPayload);
    }

    if (!isDbConnected()) {
      await connectDB().catch(() => {});
    }

    if (!isDbConnected()) {
      return res.json({ success: true, data: customerPayload });
    }

    let query = { id };
    if (email) query = { $or: [{ id }, { email }] };
    else if (phone) query = { $or: [{ id }, { phone }] };

    const existing = await Customer.findOne(query);
    if (existing) {
      Object.assign(existing, data);
      existing.lastSeen = now;
      existing.visits = (existing.visits || 1) + 1;
      await existing.save();
      return res.json({ success: true, data: existing });
    } else {
      const created = await Customer.create(customerPayload);
      return res.status(201).json({ success: true, data: created });
    }
  } catch (err) {
    next(err);
  }
}

export async function recordCustomerOrder({ authUserId, email, phone, name, address, amount, shippingAddress }) {
  const now = new Date().toISOString();
  const cleanEmail = (email || "").trim().toLowerCase();
  const rawPhone = (phone || "").trim();
  const cleanPhone = normalizePhoneNumber(rawPhone) || rawPhone;
  const cleanName = (name || "Customer").trim();

  if (isDbConnected()) {
    let existingCust = null;
    if (authUserId) {
      existingCust = await Customer.findOne({ authUserId });
    }
    if (!existingCust && cleanEmail) {
      existingCust = await Customer.findOne({ email: cleanEmail });
    }
    if (!existingCust && rawPhone) {
      const phoneQueries = buildPhoneQueryVariants(rawPhone, ["phone"]);
      if (phoneQueries.length > 0) {
        existingCust = await Customer.findOne({ $or: phoneQueries });
      }
    }

    if (existingCust) {
      if (authUserId && !existingCust.authUserId) {
        existingCust.authUserId = authUserId;
      }
      existingCust.totalOrders = (existingCust.totalOrders || 0) + 1;
      existingCust.totalSpent = (existingCust.totalSpent || 0) + (amount || 0);
      existingCust.lastOrderDate = now;
      existingCust.lastSeen = now;
      if (cleanName && (!existingCust.name || existingCust.name === "Customer")) {
        existingCust.name = cleanName;
      }
      if (cleanEmail && !existingCust.email) {
        existingCust.email = cleanEmail;
      }
      if (cleanPhone && !existingCust.phone) {
        existingCust.phone = cleanPhone;
      }
      if (shippingAddress) {
        if (!Array.isArray(existingCust.addresses)) existingCust.addresses = [];
        const normShipping = normalizeAddressInput(shippingAddress);
        const existingIdx = existingCust.addresses.findIndex(a => 
          (shippingAddress.id && String(a.id) === String(shippingAddress.id)) ||
          areAddressesEqual(a, normShipping)
        );
        if (existingIdx !== -1) {
          existingCust.addresses[existingIdx] = {
            ...existingCust.addresses[existingIdx],
            ...normShipping,
            id: existingCust.addresses[existingIdx].id || ("ADDR-" + Date.now())
          };
        } else {
          existingCust.addresses.push({
            id: "ADDR-" + Date.now(),
            ...normShipping,
            isDefault: existingCust.addresses.length === 0
          });
        }
      }
      await existingCust.save();
      return existingCust;
    } else {
      const addresses = shippingAddress ? [{
        id: "ADDR-" + Date.now(),
        ...shippingAddress,
        isDefault: true
      }] : [];
      const created = await Customer.create({
        id: "CUS-" + Math.floor(1000 + Math.random() * 9000),
        authUserId: authUserId || undefined,
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        address: address || "",
        addresses,
        joined: now,
        firstSeen: now,
        lastSeen: now,
        visits: 1,
        totalOrders: 1,
        totalSpent: amount || 0,
        status: "Active"
      });
      return created;
    }
  }

  return null;
}

export async function updateCustomer(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database unavailable. Cannot update customer without a connected MongoDB database."
      });
    }

    const { id } = req.params;
    const data = pickFields(req.body, ADMIN_CUSTOMER_FIELDS);

    const updated = await Customer.findOneAndUpdate(
      { $or: [{ id: String(id) }, { email: String(id).toLowerCase() }] },
      { $set: data },
      { returnDocument: "after" }
    );
    if (!updated) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}




export async function getCustomerMe(req, res, next) {
  try {
    const authUserId = req.user.authUserId;
    const allowedEmails = [];
    if (process.env.INITIAL_ADMIN_EMAIL) {
      allowedEmails.push(process.env.INITIAL_ADMIN_EMAIL.trim().toLowerCase());
    }
    const initialAdminPhone = (process.env.INITIAL_ADMIN_PHONE || "").trim();
    const userEmail = (req.user.email || "").trim().toLowerCase();
    const cleanUserPhone = (req.user.phone || "").replace(/[^0-9]/g, "");
    const cleanAdminPhone = initialAdminPhone.replace(/[^0-9]/g, "");
    const isInitialAdmin = Boolean(
      (userEmail && allowedEmails.length > 0 && allowedEmails.includes(userEmail)) ||
      (cleanUserPhone && cleanAdminPhone && cleanUserPhone === cleanAdminPhone)
    );
    const now = new Date().toISOString();

    const googleName = (req.user.name || "").trim();
    const googleAvatar = (req.user.picture || "").trim();

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: "Database unavailable",
        message: "Customer profile service is temporarily unavailable. Please try again shortly.",
        databaseUnavailable: true
      });
    }

    // 1. Ultra-fast lookup for existing customer by verified authUserId
    let customer = await Customer.findOne({ authUserId }).lean();

    if (customer) {
      // Check if bootstrap updates are needed
      let needsSave = false;
      const updates = {
        lastLoginAt: new Date(),
        lastSeen: now
      };

      let currentRole = customer.role || "customer";
      if (isInitialAdmin && currentRole !== "admin") {
        updates.role = "admin";
        currentRole = "admin";
        needsSave = true;
      } else if (!isInitialAdmin && currentRole === "admin") {
        updates.role = "customer";
        currentRole = "customer";
        needsSave = true;
      }

      let currentEmail = customer.email;
      if (req.user.email && !currentEmail) {
        updates.email = req.user.email;
        currentEmail = req.user.email;
        needsSave = true;
      }

      let currentName = customer.name;
      if (googleName && (!currentName || currentName === "Customer" || currentName === "Aura Devotee")) {
        updates.name = googleName;
        currentName = googleName;
        needsSave = true;
      }

      let currentAvatar = customer.avatar;
      if (googleAvatar && !currentAvatar) {
        updates.avatar = googleAvatar;
        currentAvatar = googleAvatar;
        needsSave = true;
      }

      // Asynchronously update MongoDB in background without blocking customer render
      setImmediate(() => {
        Customer.updateOne({ _id: customer._id }, { $set: updates }).catch(() => {});
      });

      const responseData = {
        ...customer,
        role: currentRole,
        email: currentEmail,
        name: currentName,
        avatar: currentAvatar,
        lastLoginAt: updates.lastLoginAt,
        lastSeen: updates.lastSeen
      };

      return res.json({ success: true, data: responseData });
    }

    // 2. Safe migration: link existing customer or guest record by verified email or phone
    const userPhone = (req.user.phone || "").trim();

    if (userEmail || userPhone) {
      const query = [];
      if (userEmail) query.push({ email: userEmail });
      if (userPhone) {
        const phoneVariants = buildPhoneQueryVariants(userPhone, ["phone"]);
        query.push(...phoneVariants);
      }
      const guestCustomer = await Customer.findOne({ $or: query });
      if (guestCustomer) {
        guestCustomer.authUserId = authUserId;
        if (isInitialAdmin) {
          guestCustomer.role = "admin";
        }
        if (googleName && (!guestCustomer.name || guestCustomer.name === "Customer" || guestCustomer.name === "Aura Devotee")) {
          guestCustomer.name = googleName;
        }
        if (googleAvatar && !guestCustomer.avatar) {
          guestCustomer.avatar = googleAvatar;
        }
        guestCustomer.lastLoginAt = new Date();
        guestCustomer.lastSeen = now;
        await guestCustomer.save();

        // Link previous guest orders placed with this verified email/phone in background
        setImmediate(() => {
          const orderOr = [];
          if (userEmail) {
            orderOr.push({ customerEmail: userEmail }, { email: userEmail }, { "shippingAddress.email": userEmail });
          }
          if (userPhone) {
            const phoneVariants = buildPhoneQueryVariants(userPhone, ["customerPhone", "phone", "shippingAddress.phone"]);
            orderOr.push(...phoneVariants);
          }
          if (orderOr.length > 0) {
            Order.updateMany(
              {
                $and: [
                  { $or: [{ authUserId: { $exists: false } }, { authUserId: null }, { authUserId: "guest" }] },
                  { $or: orderOr }
                ]
              },
              { $set: { authUserId: authUserId } }
            ).catch(() => {});
          }
        });

        return res.json({ success: true, data: guestCustomer.toObject ? guestCustomer.toObject() : guestCustomer });
      }
    }

    // 3. Create new Customer record securely keyed by verified authUserId with automatic Gmail / Google name
    const id = "CUS-" + crypto.randomBytes(4).toString("hex").toUpperCase();
    const resolvedName = googleName || (req.user.email ? req.user.email.split("@")[0] : "Customer");
    const newCust = await Customer.create({
      id,
      authUserId,
      role: isInitialAdmin ? "admin" : "customer",
      name: resolvedName,
      email: userEmail || "",
      phone: userPhone ? (normalizePhoneNumber(userPhone) || userPhone) : "",
      avatar: googleAvatar || "",
      lastLoginAt: new Date(),
      lastSeen: now,
      firstSeen: now,
      joined: now,
      status: "Active"
    });

    // Link previous guest orders placed with this verified email/phone in background
    if (userEmail || userPhone) {
      setImmediate(() => {
        const orderOr = [];
        if (userEmail) {
          orderOr.push({ customerEmail: userEmail }, { email: userEmail }, { "shippingAddress.email": userEmail });
        }
        if (userPhone) {
          const phoneVariants = buildPhoneQueryVariants(userPhone, ["customerPhone", "phone", "shippingAddress.phone"]);
          orderOr.push(...phoneVariants);
        }
        if (orderOr.length > 0) {
          Order.updateMany(
            {
              $and: [
                { $or: [{ authUserId: { $exists: false } }, { authUserId: null }, { authUserId: "guest" }] },
                { $or: orderOr }
              ]
            },
            { $set: { authUserId: authUserId } }
          ).catch(() => {});
        }
      });
    }

    return res.json({ success: true, data: newCust.toObject ? newCust.toObject() : newCust });
  } catch (err) {
    next(err);
  }
}

export async function updateCustomerMe(req, res, next) {
  try {
    const authUserId = req.user.authUserId;
    const { name, phone, address, addresses, wishlist } = req.body;

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: "Database unavailable",
        message: "Customer service is temporarily unavailable. Please try again shortly.",
        databaseUnavailable: true
      });
    }

    const updateFields = {
      lastSeen: new Date().toISOString()
    };
    if (name !== undefined) updateFields.name = String(name).trim();
    if (phone !== undefined) updateFields.phone = String(phone).trim();
    if (address !== undefined) updateFields.address = address;
    if (Array.isArray(addresses)) updateFields.addresses = addresses;
    if (Array.isArray(wishlist)) updateFields.wishlist = wishlist;
    
    const updated = await Customer.findOneAndUpdate(
      { authUserId },
      { $set: updateFields },
      { returnDocument: "after", runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

// Helper to reliably retrieve or bootstrap a customer document for an authenticated request
async function findCustomerForAuthUser(user) {
  if (!user || !user.authUserId) return null;
  const authUserId = user.authUserId;

  let customer = await Customer.findOne({ authUserId });
  if (customer) return customer;

  const email = (user.email || "").trim().toLowerCase();
  const phone = (user.phone || "").trim();

  if (email || phone) {
    const orCond = [];
    if (email) orCond.push({ email });
    if (phone) {
      const phoneVars = buildPhoneQueryVariants(phone, ["phone"]);
      orCond.push(...phoneVars);
    }
    customer = await Customer.findOne({ $or: orCond });
    if (customer) {
      customer.authUserId = authUserId;
      if (email && !customer.email) customer.email = email;
      if (phone && !customer.phone) customer.phone = phone;
      await customer.save();
      return customer;
    }
  }

  // Create new customer if record does not exist
  const now = new Date().toISOString();
  const created = await Customer.create({
    id: "CUS-" + crypto.randomBytes(4).toString("hex").toUpperCase(),
    authUserId,
    name: user.name || (email ? email.split("@")[0] : "Customer"),
    email,
    phone,
    addresses: [],
    joined: now,
    firstSeen: now,
    lastSeen: now,
    visits: 1,
    status: "Active"
  });
  return created;
}

export async function getAddresses(req, res, next) {
  try {
    if (!isDbConnected()) {
      await connectDB().catch(() => {});
    }
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: "Database unavailable",
        message: "Addresses service is temporarily unavailable. Please try again shortly.",
        databaseUnavailable: true
      });
    }
    const customer = await findCustomerForAuthUser(req.user);
    return res.json({ success: true, data: customer?.addresses || [] });
  } catch(err) { next(err); }
}

function areAddressesEqual(a, b) {
  if (!a || !b) return false;
  const clean = str => String(str || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const addrA = clean(a.address);
  const addrB = clean(b.address);
  const pinA = clean(a.pincode);
  const pinB = clean(b.pincode);
  const cityA = clean(a.city);
  const cityB = clean(b.city);
  const phoneA = clean(a.phone);
  const phoneB = clean(b.phone);

  if (!addrA || !addrB) return false;

  // Exact address and pincode match
  if (addrA === addrB && (pinA === pinB || !pinA || !pinB)) return true;

  // Substring address match with same pincode
  if (pinA && pinA === pinB && (addrA.includes(addrB) || addrB.includes(addrA))) return true;

  // Same street, city, and phone
  if (addrA === addrB && cityA === cityB && phoneA === phoneB) return true;

  return false;
}

function normalizeAddressInput(input = {}) {
  const firstName = String(input.firstName || (input.name ? input.name.split(" ")[0] : "") || "").trim();
  const lastName = String(input.lastName || (input.name ? input.name.split(" ").slice(1).join(" ") : "") || "").trim();
  const phone = String(input.phone || "").replace(/[^0-9]/g, "").slice(0, 10);
  const email = String(input.email || "").trim().toLowerCase();
  const address = String(input.address || "").trim();
  const landmark = String(input.landmark || "").trim();
  const locality = String(input.locality || "").trim();
  const pincode = String(input.pincode || "").replace(/[^0-9]/g, "").slice(0, 6);
  const city = String(input.city || "").trim();
  const state = String(input.state || "").trim();
  const isDefault = input.isDefault !== false;

  return {
    firstName,
    lastName,
    name: `${firstName} ${lastName}`.trim(),
    phone,
    email,
    address,
    landmark,
    locality,
    pincode,
    city,
    state,
    isDefault
  };
}

export async function addAddress(req, res, next) {
  try {
    if (!isDbConnected()) {
      await connectDB().catch(() => {});
    }
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: "Database unavailable",
        message: "Addresses service is temporarily unavailable. Please try again shortly.",
        databaseUnavailable: true
      });
    }

    const address = req.body || {};
    const normalized = normalizeAddressInput(address);
    const customer = await findCustomerForAuthUser(req.user);
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer profile not found" });
    }
    if (!Array.isArray(customer.addresses)) {
      customer.addresses = [];
    }

    const addrId = address.id || ("ADDR-" + crypto.randomBytes(4).toString("hex").toUpperCase());
    let existingIdx = -1;
    if (address.id) {
      existingIdx = customer.addresses.findIndex(a => String(a.id) === String(address.id));
    }
    if (existingIdx === -1) {
      existingIdx = customer.addresses.findIndex(a => areAddressesEqual(a, normalized));
    }

    if (existingIdx !== -1) {
      const existingId = customer.addresses[existingIdx].id || addrId;
      customer.addresses[existingIdx] = {
        ...customer.addresses[existingIdx],
        ...normalized,
        id: existingId
      };
      if (normalized.isDefault !== false) {
        customer.addresses.forEach((a, i) => { a.isDefault = (i === existingIdx); });
        customer.addresses[existingIdx].isDefault = true;
      }
    } else {
      const newAddress = { ...normalized, id: addrId };
      if (newAddress.isDefault !== false || customer.addresses.length === 0) {
        customer.addresses.forEach(a => { a.isDefault = false; });
        newAddress.isDefault = true;
      }
      customer.addresses.push(newAddress);
    }

    // Sync top-level customer address fields for convenience
    const defaultAddr = customer.addresses.find(a => a.isDefault) || customer.addresses[0];
    if (defaultAddr) {
      if (defaultAddr.address) customer.address = defaultAddr.address;
      if (defaultAddr.pincode) customer.pincode = defaultAddr.pincode;
      if (defaultAddr.city) customer.city = defaultAddr.city;
      if (defaultAddr.state) customer.state = defaultAddr.state;
      if (defaultAddr.phone) customer.phone = defaultAddr.phone;
    }

    customer.markModified('addresses');
    await customer.save();

    return res.status(201).json({ success: true, data: customer.addresses, added: address });
  } catch(err) { next(err); }
}

export async function updateAddress(req, res, next) {
  try {
    if (!isDbConnected()) {
      await connectDB().catch(() => {});
    }
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: "Database unavailable",
        message: "Addresses service is temporarily unavailable. Please try again shortly.",
        databaseUnavailable: true
      });
    }

    const target = req.params.id || req.params.index || req.body.id;
    const addressData = req.body || {};
    const normalized = normalizeAddressInput(addressData);

    const customer = await findCustomerForAuthUser(req.user);
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer profile not found" });
    }
    if (!Array.isArray(customer.addresses)) {
      customer.addresses = [];
    }
    
    let targetIdx = customer.addresses.findIndex((a, i) => 
      String(a.id) === String(target) || String(i) === String(target)
    );

    if (targetIdx !== -1) {
      customer.addresses[targetIdx] = { 
        ...customer.addresses[targetIdx], 
        ...normalized, 
        id: customer.addresses[targetIdx].id || target 
      };
    } else {
      const newId = target || addressData.id || ("ADDR-" + Date.now());
      customer.addresses.push({ ...normalized, id: newId });
      targetIdx = customer.addresses.length - 1;
    }

    if (normalized.isDefault !== false) {
      customer.addresses.forEach((a, i) => {
        a.isDefault = (i === targetIdx);
      });
      customer.addresses[targetIdx].isDefault = true;
    }

    // Sync top-level customer address fields for convenience
    const updatedAddr = customer.addresses[targetIdx];
    if (updatedAddr) {
      if (updatedAddr.address) customer.address = updatedAddr.address;
      if (updatedAddr.pincode) customer.pincode = updatedAddr.pincode;
      if (updatedAddr.city) customer.city = updatedAddr.city;
      if (updatedAddr.state) customer.state = updatedAddr.state;
      if (updatedAddr.phone) customer.phone = updatedAddr.phone;
    }

    customer.markModified('addresses');
    await customer.save();
    return res.json({ success: true, data: customer.addresses, updated: customer.addresses[targetIdx] });
  } catch(err) { next(err); }
}

export async function deleteAddress(req, res, next) {
  try {
    if (!isDbConnected()) {
      await connectDB().catch(() => {});
    }
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: "Database unavailable",
        message: "Addresses service is temporarily unavailable. Please try again shortly.",
        databaseUnavailable: true
      });
    }

    const target = req.params.id || req.params.index;
    const customer = await findCustomerForAuthUser(req.user);
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer profile not found" });
    }
    
    if (Array.isArray(customer.addresses)) {
      const idx = customer.addresses.findIndex((a, i) => String(a.id) === String(target) || String(i) === String(target));
      if (idx !== -1) {
        customer.addresses.splice(idx, 1);
        if (customer.addresses.length > 0 && !customer.addresses.some(a => a.isDefault)) {
          customer.addresses[0].isDefault = true;
        }
        customer.markModified('addresses');
        await customer.save();
        return res.json({ success: true, data: customer.addresses });
      }
    }
    return res.json({ success: true, data: customer.addresses || [] });
  } catch(err) { next(err); }
}

export async function getWishlist(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: "Database unavailable",
        message: "Wishlist service is temporarily unavailable. Please try again shortly.",
        databaseUnavailable: true
      });
    }
    const customer = await Customer.findOne({ authUserId: req.user.authUserId }).lean();
    return res.json({ success: true, data: customer?.wishlist || [] });
  } catch(err) { next(err); }
}

export async function addWishlist(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: "Database unavailable",
        message: "Wishlist service is temporarily unavailable. Please try again shortly.",
        databaseUnavailable: true
      });
    }

    const { productId } = req.body;

    const customer = await Customer.findOneAndUpdate(
      { authUserId: req.user.authUserId },
      { $addToSet: { wishlist: String(productId) } },
      { returnDocument: "after", upsert: true }
    );
    return res.json({ success: true, data: customer.wishlist });
  } catch(err) { next(err); }
}

export async function deleteWishlist(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: "Database unavailable",
        message: "Wishlist service is temporarily unavailable. Please try again shortly.",
        databaseUnavailable: true
      });
    }

    const { productId } = req.params;

    const customer = await Customer.findOneAndUpdate(
      { authUserId: req.user.authUserId },
      { $pull: { wishlist: String(productId) } },
      { returnDocument: "after" }
    );
    return res.json({ success: true, data: customer?.wishlist || [] });
  } catch(err) { next(err); }
}
