import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Store, MoreHorizontal, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { useAdminAuth } from "../hooks/useAdminAuth";
import { useAdminMetrics } from "../hooks/useAdminMetrics";
import { getMenuItems, getBottomTabs } from "./admin/adminConfig";
import { AdminNavLinks } from "./admin/AdminNavLinks";

export function AdminLayout({children}) {
  const location = useLocation();
  const { loadingAuth, userEmail, handleLogout } = useAdminAuth();
  const counts = useAdminMetrics();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const menuItems = getMenuItems(counts);
  const bottomTabs = getBottomTabs(counts);

  const currentItem = menuItems.find(i => i.path === location.pathname || (i.path !== '/admin' && location.pathname.startsWith(i.path)));
  const pageTitle = currentItem?.label || "Admin";

  if (loadingAuth) return <div style={{ display: 'grid', placeItems: 'center', height: '100vh' }}>Verifying Admin Privileges...</div>;

  return (
    <div className="admin-wrapper">
      {/* Mobile Header */}
      <header className="admin-mobile-header">
        <div className="mobile-header-left">
          <button className="menu-btn" onClick={() => setMobileMenuOpen(true)} aria-label="Open Admin Menu">
            <Menu size={22} />
          </button>
          <div className="mobile-header-title">
            <span>Aura Admin</span>
            <small>{pageTitle}</small>
          </div>
        </div>

        <div className="mobile-header-actions">
          <Link to="/" className="mobile-store-icon" title="Return to Customer Store Home" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '600', color: '#7a320c', background: '#fdf5ef', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e8dac9' }}>
            <Store size={16} /> Home
          </Link>
          <button onClick={handleLogout} className="mobile-store-icon" title="Logout" style={{ background: 'none', border: 'none', color: '#c62828', cursor: 'pointer' }}>
            <LogOut size={18} />
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
                <button onClick={() => setMobileMenuOpen(false)} aria-label="Close Menu"><X size={22} /></button>
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
            <Link to="/" className="view-store-pill" target="_blank"><Store size={14} /> Store Preview</Link>
            <span style={{ fontSize: '12px', color: '#555', background: '#f5f5f5', padding: '4px 10px', borderRadius: '20px', border: '1px solid #e0e0e0' }}>
              Signed in as: <b style={{ color: '#2b170d' }}>{userEmail}</b>
            </span>
            <button 
              onClick={handleLogout}
              style={{ background: '#ffebee', color: '#c62828', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
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

      {/* Mobile Bottom Navigation Bar */}
      <nav className="admin-mobile-bottom-nav">
        {bottomTabs.map(tab => {
          const isActive = location.pathname === tab.path || (tab.path !== '/admin' && location.pathname.startsWith(tab.path));
          return (
            <Link 
              key={tab.path} 
              to={tab.path} 
              className={`bottom-tab ${isActive ? 'active' : ''}`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </Link>
          );
        })}
        <button 
          className={`bottom-tab ${mobileMenuOpen ? 'active' : ''}`}
          onClick={() => setMobileMenuOpen(true)}
        >
          <MoreHorizontal size={20} />
          <span>More</span>
        </button>
      </nav>
    </div>
  );
}
