import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useParams } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";
import { Home } from "./pages/Home";
import { AuraAIFloating } from "./components/AuraAIFloating";

// ---------------------------------------------------------------------------
// Code splitting: Customer secondary pages & Admin pages are lazy-loaded so
// the Home bundle stays lean and first-paint stays fast.
// ---------------------------------------------------------------------------
const Shop = lazy(() => import("./pages/Shop").then(m => ({ default: m.Shop })));
const Wishlist = lazy(() => import("./pages/Wishlist").then(m => ({ default: m.Wishlist })));
const Product = lazy(() => import("./pages/Product").then(m => ({ default: m.Product })));
const Cart = lazy(() => import("./pages/Cart").then(m => ({ default: m.Cart })));
const Checkout = lazy(() => import("./pages/Checkout").then(m => ({ default: m.Checkout })));
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
      aria-busy="true"
      aria-label="Loading"
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "14px" }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: "50%",
            border: "3px solid #eadecd",
            borderTopColor: "#a54d2b",
            animation: "aura-spin 0.9s linear infinite"
          }}
        />
        <span style={{ fontSize: "12px", color: "#806f62", fontWeight: 600, letterSpacing: "0.5px" }}>
          Aura Rudraksha
        </span>
        <style>{`@keyframes aura-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
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
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Canonical Customer Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/product/:id" element={<Product />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/login" element={<Login />} />
          <Route path="/account" element={<Account />} />
          <Route path="/account/profile" element={<Profile />} />
          <Route path="/account/orders" element={<Orders />} />
          <Route path="/account/orders/:id" element={<OrderDetail />} />

          {/* Compatibility Redirects for Legacy Routes */}
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

          {/* Isolated Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/ai" element={<AdminAI />} />
          <Route path="/admin/products" element={<AdminProducts />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/admin/customers" element={<AdminCustomers />} />
          <Route path="/admin/reviews" element={<AdminReviews />} />
          <Route path="/admin/banners" element={<AdminBanners />} />
          <Route path="/admin/banners/hero" element={<HeroImages />} />
          <Route path="/admin/banners/promotions" element={<AdminPromotions />} />
          <Route path="/admin/categories" element={<AdminCategories />} />
          <Route path="/admin/offers" element={<AdminOffers />} />
          <Route path="/admin/coupons" element={<AdminCoupons />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
          <Route path="/admin/support" element={<AdminSupport />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/zodiac" element={<AdminZodiac />} />

          {/* Catch-all 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <AuraAIFloating />
    </>
  );
}
