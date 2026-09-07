import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useParams } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";
import { PageTransition } from "./components/PageTransition";
import { Home } from "./pages/Home";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AdminGuard } from "./components/admin/AdminGuard";
import { AdminErrorBoundary } from "./components/admin/AdminErrorBoundary";
import { ADMIN_BASE_PATH, ADMIN_LOGIN_PATH } from "./lib/routes";
import { initInstantRoutePrefetch } from "./lib/prefetchRoutes";

// ---------------------------------------------------------------------------
// Resilient code splitting: Customer secondary pages & Admin pages are lazy-loaded.
// Failed dynamic imports (e.g. stale deployment hashes or network drop) are safely handled.
// ---------------------------------------------------------------------------
function safeLazy(importFn) {
  return lazy(async () => {
    try {
      return await importFn();
    } catch (error) {
      const isChunkError = 
        error?.message?.includes?.("dynamically imported module") ||
        error?.message?.includes?.("Loading chunk") ||
        error?.message?.includes?.("Failed to fetch dynamically imported module") ||
        error?.name === "ChunkLoadError";

      if (isChunkError && typeof window !== "undefined") {
        const key = "aura_chunk_reload_" + window.location.pathname;
        const lastReload = sessionStorage.getItem(key);
        if (!lastReload || Date.now() - Number(lastReload) > 10000) {
          sessionStorage.setItem(key, String(Date.now()));
          window.location.reload();
          return new Promise(() => {}); // hold until reload
        }
      }
      throw error;
    }
  });
}

const Shop = safeLazy(() => import("./pages/Shop").then(m => ({ default: m.Shop })));
const Wishlist = safeLazy(() => import("./pages/Wishlist").then(m => ({ default: m.Wishlist })));
const Product = safeLazy(() => import("./pages/Product").then(m => ({ default: m.Product })));
const Cart = safeLazy(() => import("./pages/Cart").then(m => ({ default: m.Cart })));
const Checkout = safeLazy(() => import("./pages/Checkout").then(m => ({ default: m.Checkout })));
const PaymentResult = safeLazy(() => import("./pages/PaymentResult").then(m => ({ default: m.PaymentResult })));
const Login = safeLazy(() => import("./pages/Login").then(m => ({ default: m.Login })));
const Policies = safeLazy(() => import("./pages/Policies").then(m => ({ default: m.Policies })));
const NotFound = safeLazy(() => import("./pages/NotFound").then(m => ({ default: m.NotFound })));
const Account = safeLazy(() => import("./pages/account/Account").then(m => ({ default: m.Account })));
const Profile = safeLazy(() => import("./pages/account/Profile").then(m => ({ default: m.Profile })));
const Orders = safeLazy(() => import("./pages/account/Orders").then(m => ({ default: m.Orders })));
const OrderDetail = safeLazy(() => import("./pages/account/OrderDetail").then(m => ({ default: m.OrderDetail })));
const AuraAIPage = safeLazy(() => import("./pages/AuraAIPage").then(m => ({ default: m.AuraAIPage })));
const AboutUs = safeLazy(() => import("./pages/AboutUs").then(m => ({ default: m.AboutUs })));
const TrackOrder = safeLazy(() => import("./pages/TrackOrder").then(m => ({ default: m.TrackOrder })));
const CategoriesPage = safeLazy(() => import("./pages/CategoriesPage").then(m => ({ default: m.CategoriesPage })));
const Wholesale = safeLazy(() => import("./pages/Wholesale").then(m => ({ default: m.Wholesale })));
const ContactUs = safeLazy(() => import("./pages/ContactUs").then(m => ({ default: m.ContactUs })));
const MobileDesignPage = safeLazy(() => import("./pages/MobileDesignPage").then(m => ({ default: m.MobileDesignPage })));
const CategoryLanding = safeLazy(() => import("./pages/CategoryLanding").then(m => ({ default: m.default })));
const RudrakshaGuide = safeLazy(() => import("./pages/RudrakshaGuide").then(m => ({ default: m.default })));
const RudrakshaCalculator = safeLazy(() => import("./pages/RudrakshaCalculator").then(m => ({ default: m.default })));

const AuraAIFloating = safeLazy(() => import("./components/AuraAIFloating").then(m => ({ default: m.AuraAIFloating })));
import { TopLoadingBar } from "./components/TopLoadingBar";

const AdminLogin = safeLazy(() => import("./pages/admin/AdminLogin").then(m => ({ default: m.AdminLogin })));
const Admin = safeLazy(() => import("./pages/admin/Admin").then(m => ({ default: m.Admin })));
const AdminAI = safeLazy(() => import("./pages/admin/AdminAI").then(m => ({ default: m.AdminAI })));
const AdminProducts = safeLazy(() => import("./pages/admin/AdminProducts").then(m => ({ default: m.AdminProducts })));
const AdminOrders = safeLazy(() => import("./pages/admin/AdminOrders").then(m => ({ default: m.AdminOrders })));
const AdminCustomers = safeLazy(() => import("./pages/admin/AdminCustomers").then(m => ({ default: m.AdminCustomers })));
const AdminBanners = safeLazy(() => import("./pages/admin/AdminBanners").then(m => ({ default: m.AdminBanners })));
const HeroImages = safeLazy(() => import("./pages/admin/HeroImages").then(m => ({ default: m.HeroImages })));
const AdminPromotions = safeLazy(() => import("./pages/admin/AdminPromotions").then(m => ({ default: m.AdminPromotions })));
const AdminCategories = safeLazy(() => import("./pages/admin/AdminCategories").then(m => ({ default: m.AdminCategories })));
const AdminOffers = safeLazy(() => import("./pages/admin/AdminOffers").then(m => ({ default: m.AdminOffers })));
const AdminCoupons = safeLazy(() => import("./pages/admin/AdminCoupons").then(m => ({ default: m.AdminCoupons })));
const AdminAnalytics = safeLazy(() => import("./pages/admin/AdminAnalytics").then(m => ({ default: m.AdminAnalytics })));
const AdminReviews = safeLazy(() => import("./pages/admin/AdminReviews").then(m => ({ default: m.AdminReviews })));
const AdminSupport = safeLazy(() => import("./pages/admin/AdminSupport").then(m => ({ default: m.AdminSupport })));
const AdminSettings = safeLazy(() => import("./pages/admin/AdminSettings").then(m => ({ default: m.AdminSettings })));
const AdminZodiac = safeLazy(() => import("./pages/admin/AdminZodiac").then(m => ({ default: m.AdminZodiac })));

function PageLoader() {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "grid",
        placeItems: "center",
        background: "#fdfbf7",
        pointerEvents: "none"
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: "50%",
          border: "3px solid #ebd8c5",
          borderTopColor: "#a54d2b",
          animation: "auraPageSpin 0.75s linear infinite"
        }}
      />
      <style>{`
        @keyframes auraPageSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function OrderParamRedirect() {
  const { id } = useParams();
  return <Navigate to={id ? `/account/orders/${id}` : "/account/orders"} replace />;
}

export function App() {
  React.useEffect(() => {
    initInstantRoutePrefetch();
  }, []);

  return (
    <>
      <TopLoadingBar />
      <ScrollToTop />
      <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <PageTransition>
        <Routes>
          {/* Customer Storefront Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/product/:id" element={<Product />} />
          <Route path="/product/:id/view" element={<Product />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/payment/result" element={<PaymentResult />} />
          <Route path="/payment-result" element={<PaymentResult />} />
          <Route path="/payment_result" element={<PaymentResult />} />
          <Route path="/payment-status" element={<PaymentResult />} />
          <Route path="/payment/status" element={<PaymentResult />} />
          <Route path="/payment-success" element={<PaymentResult />} />
          <Route path="/payment/success" element={<PaymentResult />} />
          <Route path="/payment-failed" element={<PaymentResult />} />
          <Route path="/payment/failed" element={<PaymentResult />} />
          <Route path="/payment-failure" element={<PaymentResult />} />
          <Route path="/payment/failure" element={<PaymentResult />} />
          <Route path="/order-success" element={<PaymentResult />} />
          <Route path="/order-confirmation" element={<PaymentResult />} />
          <Route path="/checkout/success" element={<PaymentResult />} />
          <Route path="/checkout/result" element={<PaymentResult />} />
          <Route path="/checkout/status" element={<PaymentResult />} />
          <Route path="/login" element={<Login />} />

          {/* Customer Account Routes */}
          <Route path="/account" element={<Account />} />
          <Route path="/account/profile" element={<Profile />} />
          <Route path="/account/orders" element={<Orders />} />
          <Route path="/account/orders/:id" element={<OrderDetail />} />
          <Route path="/my-orders" element={<Navigate to="/account/orders" replace />} />
          <Route path="/orders/:id" element={<OrderParamRedirect />} />
          <Route path="/order/:id" element={<OrderParamRedirect />} />

          {/* Customer Content & Policy Routes */}
          <Route path="/shipping-policy" element={<Policies />} />
          <Route path="/return-policy" element={<Policies />} />
          <Route path="/privacy-policy" element={<Policies />} />
          <Route path="/terms" element={<Policies />} />
          <Route path="/cancellation" element={<Policies />} />
          <Route path="/secure-payment" element={<Policies />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/track-order" element={<TrackOrder />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/wholesale" element={<Wholesale />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/aura-ai" element={<AuraAIPage />} />
          <Route path="/mobile-design" element={<MobileDesignPage />} />

          {/* Sacred Rudraksha SEO Landing & Mukhi Pages */}
          <Route path="/rudraksha" element={<CategoryLanding />} />
          <Route path="/rudraksha/:slug" element={<CategoryLanding />} />
          <Route path="/rudraksha-calculator" element={<RudrakshaCalculator />} />
          <Route path="/rudraksha-for-rashi" element={<RudrakshaCalculator />} />
          <Route path="/how-to-wear-rudraksha" element={<RudrakshaGuide />} />
          <Route path="/rudraksha-benefits" element={<RudrakshaGuide />} />
          <Route path="/rudraksha-authenticity" element={<RudrakshaGuide />} />
          <Route path="/rudraksha-care" element={<RudrakshaGuide />} />

          {/* Admin Login Route */}
          <Route
            path={ADMIN_LOGIN_PATH}
            element={
              <AdminErrorBoundary>
                <AdminLogin />
              </AdminErrorBoundary>
            }
          />

          {/* Secure Isolated Admin Route Tree Protected by AdminGuard & AdminErrorBoundary */}
          <Route
            path={ADMIN_BASE_PATH}
            element={
              <AdminErrorBoundary>
                <AdminGuard />
              </AdminErrorBoundary>
            }
          >
            <Route index element={<Admin />} />
            <Route path="ai" element={<AdminAI />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="customers" element={<AdminCustomers />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="banners" element={<AdminBanners />} />
            <Route path="banners/hero" element={<HeroImages />} />
            <Route path="banners/promotions" element={<AdminPromotions />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="offers" element={<AdminOffers />} />
            <Route path="coupons" element={<AdminCoupons />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="support" element={<AdminSupport />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="zodiac" element={<AdminZodiac />} />
          </Route>

          {/* Legacy /aura-control-8740 Redirects: Alias to /admin */}
          <Route path="/aura-control-8740" element={<Navigate to="/admin" replace />} />
          <Route path="/aura-control-8740/login" element={<Navigate to="/admin/login" replace />} />
          <Route path="/aura-control-8740/*" element={<Navigate to="/admin" replace />} />

          {/* Catch-all 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </PageTransition>
      </Suspense>
      </ErrorBoundary>
      <ErrorBoundary isolate fallback={null}>
        <Suspense fallback={null}>
          <AuraAIFloating />
        </Suspense>
      </ErrorBoundary>
    </>
  );
}
export default App;
