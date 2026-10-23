import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Store, MoreHorizontal, LogOut, Sparkles, Bot, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { useAdminAuth } from "../hooks/useAdminAuth";
import { useAdminMetrics } from "../hooks/useAdminMetrics";
import { getMenuItems, getBottomTabs } from "./admin/adminConfig";
import { AdminNavLinks } from "./admin/AdminNavLinks";
import { ADMIN_BASE_PATH } from "../lib/routes";

import { AdminAIAgentChat } from "./admin/AdminAIAgentChat";

export function AdminLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { loadingAuth, userEmail, handleLogout } = useAdminAuth();
  const counts = useAdminMetrics();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [floatingAgentOpen, setFloatingAgentOpen] = useState(false);

  const isDedicatedAiPage = location.pathname === "/admin/ai";

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const menuItems = getMenuItems(counts);
  const bottomTabs = getBottomTabs(counts);

  const currentItem = menuItems.find(
    (i) =>
      i.path === location.pathname ||
      (i.path !== ADMIN_BASE_PATH && location.pathname.startsWith(i.path))
  );
  const pageTitle = currentItem?.label || "Admin";

  if (loadingAuth) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#fdfbf7",
          fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              border: "3px solid #ebd8c5",
              borderTopColor: "#a54d2b",
              animation: "auraAdminSpin 0.8s linear infinite"
            }}
          />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "16px", color: "#2b170d", fontWeight: 700 }}>Aura Admin</div>
            <div style={{ fontSize: "13px", color: "#806f62", marginTop: "4px" }}>
              Verifying secure access...
            </div>
          </div>
          <style>{`
            @keyframes auraAdminSpin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-wrapper">
      {/* Mobile Header */}
      <header className="admin-mobile-header">
        <div className="mobile-header-left" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* History Back button if navigated into any subpage */}
          {location.pathname !== ADMIN_BASE_PATH && (
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate(ADMIN_BASE_PATH);
                }
              }}
              aria-label="Back to previous page"
              title="Go back to previous page"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                background: "#ffffff",
                border: "1px solid #e7ded5",
                color: "#7c2d12",
                padding: "6px 10px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 1px 3px rgba(43, 23, 13, 0.06)",
                flexShrink: 0
              }}
            >
              <ArrowLeft size={15} /> Back
            </button>
          )}

          <button className="menu-btn" onClick={() => setMobileMenuOpen(true)} aria-label="Open Admin Menu">
            <Menu size={22} />
          </button>
          <div className="mobile-header-title">
            <span>Aura Admin</span>
            <small>{pageTitle}</small>
          </div>
        </div>

        <div className="mobile-header-actions" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Link
            to="/admin/ai"
            className="mobile-store-icon"
            title="AURA AI - Admin Agent"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "12px",
              fontWeight: "700",
              color: isDedicatedAiPage ? "#ffffff" : "#a84118",
              background: isDedicatedAiPage ? "#7c2d12" : "#fff1f2",
              padding: "6px 10px",
              borderRadius: "8px",
              border: "1px solid #fecdd3"
            }}
          >
            <Sparkles size={14} /> Agent
          </Link>
          <Link
            to="/"
            className="mobile-store-icon"
            title="Return to Customer Store Home"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "12px",
              fontWeight: "600",
              color: "#7a320c",
              background: "#fdf5ef",
              padding: "6px 9px",
              borderRadius: "8px",
              border: "1px solid #e8dac9"
            }}
          >
            <Store size={14} />
          </Link>
          <button
            onClick={handleLogout}
            className="mobile-store-icon"
            title="Logout"
            style={{ background: "none", border: "none", color: "#c62828", cursor: "pointer", padding: "6px" }}
          >
            <LogOut size={17} />
          </button>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              className="admin-mobile-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              className="admin-mobile-drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
            >
              <div className="drawer-header">
                <div className="drawer-title">Admin Navigation</div>
                <button onClick={() => setMobileMenuOpen(false)} aria-label="Close Menu">
                  <X size={22} />
                </button>
              </div>
              <aside className="mobile-aside">
                <AdminNavLinks counts={counts} onLogout={handleLogout} />
              </aside>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="admin-desktop-sidebar">
        <AdminNavLinks counts={counts} onLogout={handleLogout} />
      </aside>

      {/* Main Content Area */}
      <section className="admin-main">
        <div className="admin-top-bar">
          <div className="page-title">{pageTitle}</div>
          <div className="admin-user-info">
            <Link 
              to="/admin/ai-chats" 
              className="view-store-pill" 
              style={{
                background: "#fef3c7", 
                color: "#92400e", 
                borderColor: "#fde68a",
                fontWeight: "700"
              }}
              title="AI Bot All Chats & User Logs"
            >
              <Bot size={14} /> AI Chats & Logs
            </Link>
            <Link 
              to="/admin/ai" 
              className="view-store-pill" 
              style={{
                background: "#fff1f2", 
                color: "#a84118", 
                borderColor: "#fecdd3",
                fontWeight: "700"
              }}
              title="AURA AI - Admin Agent"
            >
              <Sparkles size={14} /> Aura AI Agent
            </Link>
            <Link to="/" className="view-store-pill" target="_blank">
              <Store size={14} /> Store Preview
            </Link>
            <span
              style={{
                fontSize: "12px",
                color: "#555",
                background: "#f5f5f5",
                padding: "4px 10px",
                borderRadius: "20px",
                border: "1px solid #e0e0e0"
              }}
            >
              Signed in as: <b style={{ color: "#2b170d" }}>{userEmail}</b>
            </span>
            <button
              onClick={handleLogout}
              style={{
                background: "#ffebee",
                color: "#c62828",
                border: "none",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px"
              }}
              title="Sign Out of Admin"
            >
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>

        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="admin-content-wrapper"
        >
          {children}
        </motion.div>
      </section>

      {/* Floating Admin AI Co-Pilot Button & Drawer (Exclusive to Admin Dashboard) */}
      {!isDedicatedAiPage && (
        <>
          <button
            type="button"
            onClick={() => setFloatingAgentOpen(v => !v)}
            style={{
              position: "fixed",
              bottom: "74px",
              right: "18px",
              zIndex: 9998,
              background: "linear-gradient(135deg, #431407 0%, #7c2d12 100%)",
              color: "#fde68a",
              border: "1px solid #f59e0b",
              borderRadius: "999px",
              padding: "10px 16px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "12.5px",
              fontWeight: 800,
              boxShadow: "0 8px 24px rgba(43, 20, 8, 0.35)",
              cursor: "pointer"
            }}
          >
            <Sparkles size={16} />
            <span>{floatingAgentOpen ? "Close AI Agent" : "Aura AI Admin Agent"}</span>
          </button>

          {floatingAgentOpen && (
            <div
              style={{
                position: "fixed",
                bottom: "126px",
                right: "18px",
                width: "min(620px, calc(100vw - 28px))",
                zIndex: 9999,
                boxShadow: "0 16px 48px rgba(0,0,0,0.3)",
                borderRadius: "14px",
                overflow: "hidden"
              }}
            >
              <AdminAIAgentChat compact />
            </div>
          )}
        </>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav className="admin-mobile-bottom-nav">
        {bottomTabs.map((tab) => {
          const isActive =
            location.pathname === tab.path ||
            (tab.path !== ADMIN_BASE_PATH && location.pathname.startsWith(tab.path));
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`bottom-tab ${isActive ? "active" : ""}`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </Link>
          );
        })}
        <button
          className={`bottom-tab ${mobileMenuOpen ? "active" : ""}`}
          onClick={() => setMobileMenuOpen(true)}
        >
          <MoreHorizontal size={20} />
          <span>More</span>
        </button>
      </nav>

    </div>
  );
}
