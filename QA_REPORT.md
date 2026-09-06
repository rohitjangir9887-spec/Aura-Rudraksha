# QA Report - Aura Rudraksha - Production Fixes

## 1. MongoDB Connection Stabilization
- **Root Cause**: The `serverSelectionTimeoutMS` was set to a very short `5000` ms. In serverless environments like Vercel connecting to MongoDB Atlas, this can cause premature timeouts during cold starts or if the connection needs to be re-established.
- **Fix**: Updated `serverSelectionTimeoutMS` to `30000` ms in `server/config/db.js` to allow sufficient time for connections to establish, without hiding real issues.
- **Files Changed**: `server/config/db.js`

## 2. Mongoose Deprecation Cleanup
- **Root Cause**: The codebase was using the deprecated `new: true` and `new: false` options in `findOneAndUpdate` calls, generating deprecation warnings.
- **Fix**: Replaced `{ new: true }` with `{ returnDocument: "after" }` and `{ new: false }` with `{ returnDocument: "before" }`.
- **Files Changed**:
  - `server/controllers/paymentController.js`
  - `server/services/memoryService.js`

## 3. Reconciliation Safety Check
- **Analysis**: Checked `server/services/orderReconciliationService.js` and `server.ts`. The `reconcileAllOrders` function does **not** create fake orders or inject synthetic data into MongoDB. It merely ensures that order statuses are logically consistent (e.g., if a payment was refunded, it marks the refund status appropriately). This is safe and non-destructive. No changes were necessary.

## 4. Product Not Found Fix
- **Root Cause**: There was a bug where non-admin users could potentially receive "Product Not Found" errors for active products because the logic for checking `isAdmin` was inconsistently applied or failed, causing valid products to be treated as drafts and thus hidden.
- **Fix**: Standardized the `isAdmin` check using `authClient.getUser().role` in `src/pages/Product.jsx` and `req.user.isAdmin` in `server/controllers/productController.js` to accurately determine if the user has admin privileges.
- **Files Changed**:
  - `src/pages/Product.jsx`
  - `server/controllers/productController.js`

## 5. My Orders First-Paint Improvement
- **Root Cause**: The Orders page waited for the full API response before rendering any data, causing a slow first paint and showing a skeleton loader for too long.
- **Fix**: Updated `db.getMyOrders()` to immediately return cached orders from `storeCache.myOrders` if available, and then trigger a background revalidation to fetch fresh data. Also updated `authClient.signOut()` to trigger a `aura:clear-cache` event, effectively wiping user data from the memory cache when signing out.
- **Files Changed**:
  - `src/lib/db.js`
  - `src/lib/authClient.js`

## Tests Executed
- **`pnpm test`**: Ran successfully (1 suite failed earlier due to mocking, resolved correctly by updating the mock event dispatch for cache clearing).
- **`pnpm run lint`**: Completed without errors.
- **`pnpm run build`**: Completed successfully without errors.

All targeted production blockers have been addressed securely.
