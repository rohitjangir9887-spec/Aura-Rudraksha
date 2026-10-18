# Central Live Offer & Cart Coupon System Improvements

Fixing the Central Live Offer saving and editing in automatic mode, ensuring the default status remains OFF/Inactive, fixing the Cart page price recalculation bug when deleting coupons, and providing an admin toggle to control whether generated coupons are publicly visible on the cart page.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following key decisions were confirmed through interactive clarification and will govern the build:

- **Confirmed Decision 1 (Cart Visibility Toggle Default)**: In the Admin Coupon Management screen, new coupons will have `showOnCart: true` by default ("Show by default on cart page for all customers"), with an explicit switch allowing the store owner to hide private/special codes from customer cart suggestions.
- **Confirmed Decision 2 (Central Live Offer Default State)**: The Central Live Offer system will remain **Default Inactive / Disabled (OFF)** until the administrator explicitly turns it ON.
- **Confirmed Decision 3 (Coupon Removal Price Recalculation)**: When a customer deletes or removes an applied coupon on the Cart page, the subtotal and total must immediately recalculate back to the authoritative original product catalog prices without resetting to ₹0.

---

### 1. Overview & Core Concept

- **What It Does**:
  1. **Fixes Cart Price Reset Bug**: Eliminates the issue where removing an applied coupon erroneously displayed ₹0 total for items in the cart. Provides resilient fallback and synchronous reconciliation directly from authoritative line items.
  2. **Admin Coupon Cart Visibility Control**: Adds a dedicated toggle in Admin Coupon Management (`showOnCart`) allowing administrators to choose whether a coupon code is publicly suggested to all customers on the Cart page or kept secret (manual entry only).
  3. **Central Live Offer System Robustness & Default OFF**: Resolves failure when editing and saving Central Live Offers in automatic mode. Ensures the offer defaults to OFF (Disabled) until intentionally activated by admin, and synchronizes cleanly between MongoDB and in-memory cache.
- **Target Audience / Persona**: Store owners and administrators managing promotions in the Aura Rudraksha dashboard, and end-customers shopping on mobile and desktop.
- **Key Value**: Prevents pricing anomalies at checkout, gives admins granular promotional control, and guarantees smooth saving of automated store-wide discounts.

---

### 2. User Experience & Visual Design

- **Admin Coupon Form (`AdminCoupons.jsx`)**:
  - A clean toggle card in the coupon creation/edit modal:
    `Show on Cart Page (Shopping Bag)`
  - Subtext: *"When enabled (default), this coupon appears in the available offers section on the cart page for all customers. When disabled, customers must type the code manually."*
  - In the coupons table, a clear visual tag indicating visibility: `Cart: Visible` (emerald text) vs `Cart: Hidden` (muted amber text).
- **Cart Page (`Cart.jsx` & `OrderSummaryOffers.jsx`)**:
  - `availableCoupons` filters strictly for `c.status === "Active" && c.showOnCart !== false`.
  - Hidden coupons will no longer appear in the "Available Offers" carousel, but remain 100% valid when entered into the coupon input field.
  - Removing an applied coupon immediately transitions the price tag and summary back to the clean subtotal + shipping calculation with zero flicker and no ₹0 glitch.
- **Central Live Offer Manager (`AdminOffers.jsx`)**:
  - Prevents race conditions during form editing by isolating editing state from background poll cycles.
  - Clearly exposes the Master Offer Status toggle (`Active (ON)` vs `Disabled (OFF)`), defaulting to **Disabled (OFF)**.
  - In "Automatic Discount at Checkout" mode (`autoApply: true`), cleanly handles empty coupon codes without Mongoose validation errors or saving failures.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Authoritative Cart Calculation Flow**:
  - *Chosen Approach*: When a coupon is removed, `useCart` will synchronously compute fallback totals from current line items and instantly re-query `/api/cart/calculate` with empty `couponCode: ""`.
  - *Why*: Resolves the race condition where `db.calculateCart` was previously discarding the server response and relying on potentially unhydrated client caches.
  - *Alternatives Considered*: Pure client-side recalculation only (rejected because per-product shipping rules and bundle discounts require authoritative server validation).
- **Decision 2: Coupon Cart Visibility Model**:
  - *Chosen Approach*: Add `showOnCart: { type: Boolean, default: true }` to the `Coupon` schema and sanitize it through `couponController.js`.
  - *Why*: Existing coupons already in production will seamlessly default to visible (`true`), maintaining backwards compatibility while allowing new or edited coupons to be hidden on demand.
- **Decision 3: Central Live Offer Default State**:
  - *Chosen Approach*: Enforce `enabled: false` and `status: "Disabled"` in `defaultData.js`, database initialization, and admin state presets.
  - *Why*: Guarantees that promotional banners, countdown timers, and automatic checkout discounts will never display to customers until the store owner explicitly toggles the offer to Active.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│                   Admin Dashboard                      │
│   • AdminOffers.jsx (Live Offer Master Toggle & Save)  │
│   • AdminCoupons.jsx (showOnCart Toggle & Management)  │
└──────────────────────────┬─────────────────────────────┘
                           │ POST /api/active-offer
                           │ POST /api/coupons
                           ▼
┌────────────────────────────────────────────────────────┐
│                Express & MongoDB API                   │
│   • promotionController.js (Save Active Offer)         │
│   • couponController.js (CRUD with showOnCart)         │
│   • pricingService.js (Authoritative Cart Totals)      │
└──────────────────────────┬─────────────────────────────┘
                           │ GET /api/coupons
                           │ POST /api/cart/calculate
                           ▼
┌────────────────────────────────────────────────────────┐
│                   Customer Cart                        │
│   • useCart.jsx (Recalculation on Coupon Remove)       │
│   • Cart.jsx (Filters availableCoupons: showOnCart)    │
│   • OrderSummaryCard.jsx (Accurate Totals & Offers)    │
└────────────────────────────────────────────────────────┘
```

#### State & Data Changes:
1. **`server/models/Coupon.js` & `server/controllers/couponController.js`**:
   - Add `showOnCart` field (Boolean, default `true`).
   - Add `showOnCart` to allowed sanitize fields.
2. **`src/pages/admin/AdminCoupons.jsx`**:
   - Add `showOnCart` toggle with default `true` on new coupon creation.
   - Display `showOnCart` status in coupon list table.
3. **`src/pages/Cart.jsx` & `src/components/checkout/OrderSummaryCard.jsx`**:
   - Filter `availableCoupons` by `c.status === "Active" && c.showOnCart !== false`.
4. **`src/hooks/useCart.jsx` & `src/lib/db.js`**:
   - In `db.calculateCart`: await `/api/cart/calculate` and return authoritative data; fix client-side `calculateCartSync` product resolver fallback so subtotal never drops to 0 when items exist in lines.
   - In `useCart.jsx`: ensure `removeCoupon` cleanly triggers recalculation with empty coupon and restores original product prices immediately.
5. **`src/pages/admin/AdminOffers.jsx` & `server/controllers/promotionController.js`**:
   - Ensure default state is OFF (`enabled: false`, `status: "Disabled"`).
   - Fix save and edit handler for automatic mode so saving never fails when `couponCode` is blank.
   - Avoid background store update race condition overwriting form state while user is editing.
