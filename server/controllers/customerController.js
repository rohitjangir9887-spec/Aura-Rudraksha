import { Customer } from "../models/Customer.js";
import { isDbConnected } from "../config/db.js";
import { pickFields } from "../utils/sanitize.js";

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
        message: "Database is unavailable. Cannot retrieve customers."
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
    if (isDbConnected()) {
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
    }

    return res.status(503).json({
      success: false,
      message: "Database is unavailable."
    });
  } catch (err) {
    next(err);
  }
}

export async function saveCustomer(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database unavailable. Cannot save customer without a connected MongoDB database."
      });
    }

    const data = pickFields(req.body, ADMIN_CUSTOMER_FIELDS);
    const email = (data.email || "").trim().toLowerCase();
    const phone = (data.phone || "").trim();
    const now = new Date().toISOString();

    const id = req.body.id || ("CUS-" + Math.floor(1000 + Math.random() * 9000));
    const customerPayload = {
      ...data,
      id,
      email,
      phone,
      lastSeen: now,
      joined: now
    };

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
  const cleanPhone = (phone || "").trim();
  const cleanName = (name || "Customer").trim();

  if (isDbConnected()) {
    let existingCust = null;
    if (authUserId) {
      existingCust = await Customer.findOne({ authUserId });
    }
    if (!existingCust && cleanEmail) {
      existingCust = await Customer.findOne({ email: cleanEmail });
    }
    if (!existingCust && cleanPhone) {
      existingCust = await Customer.findOne({ phone: cleanPhone });
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
      if (address) existingCust.address = address;
      if (shippingAddress) {
        if (!Array.isArray(existingCust.addresses)) existingCust.addresses = [];
        const exists = existingCust.addresses.some(a => 
          a.address === shippingAddress.address && 
          a.pincode === shippingAddress.pincode
        );
        if (!exists) {
          existingCust.addresses.push({
            id: "ADDR-" + Date.now(),
            ...shippingAddress,
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
    if (!isDbConnected()) {
      return res.status(503).json({ success: false, message: "Database unavailable." });
    }
    const authUserId = req.user.authUserId;
    const initialAdminEmail = (process.env.INITIAL_ADMIN_EMAIL || "rohitjangir8740@gmail.com").trim().toLowerCase();
    const initialAdminPhone = (process.env.INITIAL_ADMIN_PHONE || "+919672996531").trim();
    const cleanUserPhone = (req.user.phone || "").replace(/[^0-9]/g, "");
    const cleanAdminPhone = initialAdminPhone.replace(/[^0-9]/g, "");
    const isInitialAdmin = Boolean(
      (req.user.email && req.user.email.toLowerCase() === initialAdminEmail) ||
      (cleanUserPhone && (cleanUserPhone === cleanAdminPhone || cleanUserPhone.endsWith("9672996531")))
    );
    const now = new Date().toISOString();

    const googleName = (req.user.name || "").trim();
    const googleAvatar = (req.user.picture || "").trim();

    // 1. Look for existing customer by verified authUserId
    let customer = await Customer.findOne({ authUserId });

    if (customer) {
      // If configured as initial admin and role in MongoDB isn't admin, bootstrap and persist it
      let needsSave = false;
      if (isInitialAdmin) {
        if (customer.role !== "admin") {
          customer.role = "admin";
          needsSave = true;
        }
      } else {
        if (customer.role === "admin") {
          customer.role = "customer";
          needsSave = true;
        }
      }
      customer.lastLoginAt = new Date();
      customer.lastSeen = now;
      if (req.user.email && !customer.email) {
        customer.email = req.user.email;
        needsSave = true;
      }
      // Automatically adopt name from Gmail / Google if not set or generic
      if (googleName && (!customer.name || customer.name === "Customer" || customer.name === "Aura Devotee")) {
        customer.name = googleName;
        needsSave = true;
      }
      // Automatically adopt avatar from Gmail / Google if missing
      if (googleAvatar && !customer.avatar) {
        customer.avatar = googleAvatar;
        needsSave = true;
      }

      if (needsSave) {
        await customer.save();
      } else {
        await Customer.updateOne({ _id: customer._id }, { $set: { lastLoginAt: new Date(), lastSeen: now } });
      }
      return res.json({ success: true, data: customer.toObject ? customer.toObject() : customer });
    }

    // 2. Safe migration: link existing customer or guest record by verified email or phone
    if (req.user.email || req.user.phone) {
      const query = [];
      if (req.user.email) query.push({ email: req.user.email });
      if (req.user.phone) query.push({ phone: req.user.phone });
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
        return res.json({ success: true, data: guestCustomer.toObject ? guestCustomer.toObject() : guestCustomer });
      }
    }

    // 3. Create new Customer record securely keyed by verified authUserId with automatic Gmail / Google name
    const id = "CUS-" + Math.floor(1000 + Math.random() * 9000);
    const resolvedName = googleName || (req.user.email ? req.user.email.split("@")[0] : "Customer");
    const newCust = await Customer.create({
      id,
      authUserId,
      role: isInitialAdmin ? "admin" : "customer",
      name: resolvedName,
      email: req.user.email || "",
      avatar: googleAvatar || "",
      lastLoginAt: new Date(),
      lastSeen: now,
      firstSeen: now,
      joined: now,
      status: "Active"
    });

    return res.json({ success: true, data: newCust.toObject ? newCust.toObject() : newCust });
  } catch (err) {
    next(err);
  }
}

export async function updateCustomerMe(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ success: false, message: "Database unavailable." });
    }
    const authUserId = req.user.authUserId;
    // Strictly whitelist allowed customer fields - never allow changing role, id, or authUserId
    const { name, phone, address, addresses, wishlist } = req.body;
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

export async function getAddresses(req, res, next) {
  try {
    const customer = await Customer.findOne({ authUserId: req.user.authUserId }).lean();
    return res.json({ success: true, data: customer?.addresses || [] });
  } catch(err) { next(err); }
}

export async function addAddress(req, res, next) {
  try {
    const address = req.body;
    const addrId = address.id || ("ADDR-" + Math.floor(1000 + Math.random() * 9000));
    const newAddress = { ...address, id: addrId };

    const customer = await Customer.findOne({ authUserId: req.user.authUserId });
    if (!customer) {
      const now = new Date().toISOString();
      const newCust = await Customer.create({
        id: "CUS-" + Math.floor(1000 + Math.random() * 9000),
        authUserId: req.user.authUserId,
        name: req.user.username || "Customer",
        email: req.user.email || "",
        addresses: [newAddress],
        lastSeen: now,
        joined: now
      });
      return res.status(201).json({ success: true, data: newCust.addresses, added: newAddress });
    }

    if (!Array.isArray(customer.addresses)) {
      customer.addresses = [];
    }
    customer.addresses.push(newAddress);
    customer.markModified('addresses');
    await customer.save();

    return res.status(201).json({ success: true, data: customer.addresses, added: newAddress });
  } catch(err) { next(err); }
}

export async function updateAddress(req, res, next) {
  try {
    const target = req.params.id || req.params.index;
    const addressData = req.body;
    const customer = await Customer.findOne({ authUserId: req.user.authUserId });
    if (!customer) return res.status(404).json({ success: false, message: "Customer not found" });
    
    if (Array.isArray(customer.addresses)) {
      const idx = customer.addresses.findIndex((a, i) => String(a.id) === String(target) || String(i) === String(target));
      if (idx !== -1) {
        customer.addresses[idx] = { ...customer.addresses[idx], ...addressData };
        customer.markModified('addresses');
        await customer.save();
        return res.json({ success: true, data: customer.addresses, updated: customer.addresses[idx] });
      }
    }
    return res.status(404).json({ success: false, message: "Address not found" });
  } catch(err) { next(err); }
}

export async function deleteAddress(req, res, next) {
  try {
    const target = req.params.id || req.params.index;
    const customer = await Customer.findOne({ authUserId: req.user.authUserId });
    if (!customer) return res.status(404).json({ success: false, message: "Customer not found" });
    
    if (Array.isArray(customer.addresses)) {
      const idx = customer.addresses.findIndex((a, i) => String(a.id) === String(target) || String(i) === String(target));
      if (idx !== -1) {
        customer.addresses.splice(idx, 1);
        customer.markModified('addresses');
        await customer.save();
        return res.json({ success: true, data: customer.addresses });
      }
    }
    return res.status(404).json({ success: false, message: "Address not found" });
  } catch(err) { next(err); }
}

export async function getWishlist(req, res, next) {
  try {
    const customer = await Customer.findOne({ authUserId: req.user.authUserId }).lean();
    return res.json({ success: true, data: customer?.wishlist || [] });
  } catch(err) { next(err); }
}

export async function addWishlist(req, res, next) {
  try {
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
    const { productId } = req.params;
    const customer = await Customer.findOneAndUpdate(
      { authUserId: req.user.authUserId },
      { $pull: { wishlist: String(productId) } },
      { returnDocument: "after" }
    );
    return res.json({ success: true, data: customer?.wishlist || [] });
  } catch(err) { next(err); }
}
