import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useParams } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";
import { PageTransition } from "./components/PageTransition";
import { Home } from "./pages/Home";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AdminGuard } from "./components/admin/AdminGuard";
import { AdminErrorBoundary } from "./components/admin/AdminErrorBoundary";
import { ADMIN_BASE_PATH, ADMIN_LOGIN_PATH } from "./lib/routes";

// ---------------------------------------------------------------------------
// Code splitting: Customer secondary pages, Admin pages & heavy widgets are
// lazy-loaded so the Home bundle stays lean and first-paint / LCP stays fast.
// ---------------------------------------------------------------------------
const AuraAIFloating = lazy(() => import("./components/AuraAIFloating").then(m => ({ default: m.AuraAIFloating })));
const Shop = lazy(() => import("./pages/Shop").then(m => ({ default: m.Shop })));
const Wishlist = lazy(() => import("./pages/Wishlist").then(m => ({ default: m.Wishlist })));
const Product = lazy(() => import("./pages/Product").then(m => ({ default: m.Product })));
const Cart = lazy(() => import("./pages/Cart").then(m => ({ default: m.Cart })));
const Checkout = lazy(() => import("./pages/Checkout").then(m => ({ default: m.Checkout })));
const PaymentResult = lazy(() => import("./pages/PaymentResult").then(m => ({ default: m.PaymentResult })));
const Login = lazy(() => import("./pages/Login").then(m => ({ default: m.Login })));
const Policies = lazy(() => import("./pages/Policies").then(m => ({ default: m.Policies })));
const NotFound = lazy(() => import("./pages/NotFound").then(m => ({ default: m.NotFound })));
const Account = lazy(() => import("./pages/account/Account").then(m => ({ default: m.Account })));
const Profile = lazy(() => import("./pages/account/Profile").then(m => ({ default: m.Profile })));
const Orders = lazy(() => import("./pages/account/Orders").then(m => ({ default: m.Orders })));
const OrderDetail = lazy(() => import("./pages/account/OrderDetail").then(m => ({ default: m.OrderDetail })));
const AuraAIPage = lazy(() => import("./pages/AuraAIPage").then(m => ({ default: m.AuraAIPage })));
const AboutUs = lazy(() => import("./pages/AboutUs").then(m => ({ default: m.AboutUs })));
const TrackOrder = lazy(() => import("./pages/TrackOrder").then(m => ({ default: m.TrackOrder })));
const CategoriesPage = lazy(() => import("./pages/CategoriesPage").then(m => ({ default: m.CategoriesPage })));
const Wholesale = lazy(() => import("./pages/Wholesale").then(m => ({ default: m.Wholesale })));
const ContactUs = lazy(() => import("./pages/ContactUs").then(m => ({ default: m.ContactUs })));
const MobileDesignPage = lazy(() => import("./pages/MobileDesignPage").then(m => ({ default: m.MobileDesignPage })));
const CategoryLanding = lazy(() => import("./pages/CategoryLanding"));
const RudrakshaCalculator = lazy(() => import("./pages/RudrakshaCalculator"));
const RudrakshaGuide = lazy(() => import("./pages/RudrakshaGuide"));

const AdminLogin = lazy(() => import("./pages/admin/AdminLogin").then(m => ({ default: m.AdminLogin })));
const Admin = lazy(() => import("./pages/admin/Admin").then(m => ({ default: m.Admin })));
const AdminAI = lazy(() => import("./pages/admin/AdminAI").then(m => ({ default: m.AdminAI })));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts").then(m => ({ default: m.AdminProducts })));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders").then(m => ({ default: m.AdminOrders })));
const AdminCustomers = lazy(() => import("./pages/admin/AdminCustomers").then(m => ({ default: m.AdminCustomers })));
const AdminBanners = lazy(() => import("./pages/admin/AdminBanners").then(m => ({ default: m.AdminBanners })));
const HeroImages = lazy(() => import("./pages/admin/HeroImages").then(m => ({ default: m.HeroImages })));
const AdminPromotions = lazy(() => import("./pages/admin/AdminPromotions").then(m => ({ default: m.AdminPromotions })));
const AdminCategories = lazy(() => import("./pages/admin/AdminCategories").then(m => ({ default: m.AdminCategories })));
const AdminOffers = lazy(() => import("./pages/admin/AdminOffers").then(m => ({ default: m.AdminOffers })));
const AdminCoupons = lazy(() => import("./pages/admin/AdminCoupons").then(m => ({ default: m.AdminCoupons })));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics").then(m => ({ default: m.AdminAnalytics })));
const AdminReviews = lazy(() => import("./pages/admin/AdminReviews").then(m => ({ default: m.AdminReviews })));
const AdminSupport = lazy(() => import("./pages/admin/AdminSupport").then(m => ({ default: m.AdminSupport })));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings").then(m => ({ default: m.AdminSettings })));
const AdminZodiac = lazy(() => import("./pages/admin/AdminZodiac").then(m => ({ default: m.AdminZodiac })));

function PageLoader() {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "grid",
        placeItems: "center",
        background: "#fdfbf7"
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
  return (
    <>
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
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Login initialMode="signup" />} />
          <Route path="/sign-up" element={<Navigate to="/signup" replace />} />
          <Route path="/register" element={<Navigate to="/signup" replace />} />
          <Route path="/forgot-password" element={<Login initialMode="forgot" />} />
          <Route path="/reset-password" element={<Login initialMode="reset-password" />} />
          <Route path="/verify-email" element={<Login initialMode="verify-email" />} />
          <Route path="/auth/action" element={<Login />} />

          {/* Customer Account Routes */}
          <Route path="/account" element={<Account />} />
          <Route path="/account/profile" element={<Profile />} />
          <Route path="/account/orders" element={<Orders />} />
          <Route path="/account/orders/:id" element={<OrderDetail />} />
          <Route path="/orders" element={<Navigate to="/account/orders" replace />} />
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

          {/* Sacred Rudraksha Beads & Category Landings */}
          <Route path="/rudraksha" element={<CategoryLanding />} />
          <Route path="/rudraksha/:slug" element={<CategoryLanding />} />

          {/* Vedic Astrological Guides & Mukhi Calculator */}
          <Route path="/rudraksha-calculator" element={<RudrakshaCalculator />} />
          <Route path="/rudraksha-for-rashi" element={<RudrakshaCalculator />} />
          <Route path="/how-to-wear-rudraksha" element={<RudrakshaGuide />} />
          <Route path="/rudraksha-benefits" element={<RudrakshaGuide />} />
          <Route path="/rudraksha-authenticity" element={<RudrakshaGuide />} />
          <Route path="/rudraksha-care" element={<RudrakshaGuide />} />

          {/* Customer Route Aliases for smooth navigation */}
          <Route path="/about-us" element={<Navigate to="/about" replace />} />
          <Route path="/contact-us" element={<Navigate to="/contact" replace />} />
          <Route path="/track" element={<Navigate to="/track-order" replace />} />
          <Route path="/refund-policy" element={<Navigate to="/return-policy" replace />} />
          <Route path="/terms-and-conditions" element={<Navigate to="/terms" replace />} />
          <Route path="/terms-of-service" element={<Navigate to="/terms" replace />} />
          <Route path="/faq" element={<Navigate to="/about" replace />} />
          <Route path="/faqs" element={<Navigate to="/about" replace />} />

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
        <AuraAIFloating />
      </ErrorBoundary>
    </>
  );
}
export default App;
