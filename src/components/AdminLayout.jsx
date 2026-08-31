import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Boxes, ClipboardList, Users, Megaphone, Tag, TicketPercent, BarChart3, Headphones, Settings, Menu, X, User, Store, MoreHorizontal, LogOut, Star, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { authClient } from "../lib/authClient";
import { db, onStoreUpdate } from "../lib/db";

export function AdminLayout({children}) {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [adminSession, setAdminSession] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [openTicketsCount, setOpenTicketsCount] = useState(0);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [pendingReviewsCount, setPendingReviewsCount] = useState(0);

  const userEmail = adminSession?.email || "admin@aurarudraksha.com";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  useEffect(() => {
    async function initialLoad() {
      try {
        await Promise.all([
          db.fetchTickets().catch(() => {}),
          db.fetchOrders().catch(() => {})
        ]);
        updateCounts();
      } catch (_) {}
    }
    
    function updateCounts() {
      try {
        const tickets = db.getTickets() || [];
        const orders = db.getOrders() || [];
        const reviews = db.getReviews ? db.getReviews() : [];

        const openT = tickets.filter(t => !t.status || t.status === 'Open' || t.status === 'In Progress').length;
        const pendO = orders.filter(o => !o.status || o.status === 'Pending' || o.status === 'Processing').length;
        const pendR = reviews.filter(r => !r.approved && r.status !== 'approved').length;

        setOpenTicketsCount(openT);
        setPendingOrdersCount(pendO);
        setPendingReviewsCount(pendR);
      } catch (_) {}
    }
    
    initialLoad();
    const unsub = onStoreUpdate(() => updateCounts());
    return () => unsub();
  }, []);

  useEffect(() => {
    // Check role from backend
    async function checkAuth() {
      if (!authClient.isSignedIn()) {
         navigate("/admin/login", { replace: true, state: { from: location.pathname } });
         return;
      }
      try {
        const apiBase = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");
        const doFetch = window.fetch; // We can use direct fetch to /api/customers/me
        const token = await authClient.getToken();
        const res = await doFetch(`${apiBase}/customers/me`, {
           headers: { "Authorization": "Bearer " + token }
        });
        const json = await res.json();
        const allowedEmails = ["rohitjangir8740@gmail.com", "rohitjangir9887@gmail.com"];
        const targetPhoneDigits = "9672996531";
        const resEmail = (json.data?.email || authClient.getUser()?.email || "").trim().toLowerCase();
        const resPhone = (json.data?.phone || authClient.getUser()?.phoneNumber || "").replace(/[^0-9]/g, "");
        const isAuthorizedAdmin = allowedEmails.includes(resEmail) || resPhone.endsWith(targetPhoneDigits);

        if (json.success && json.data && (json.data.role === 'admin' || json.data.isAdmin) && isAuthorizedAdmin) {
           setAdminSession({ email: json.data.email || 'rohitjangir8740@gmail.com' });
        } else {
           navigate("/account", { replace: true });
        }
      } catch (err) {
        navigate("/admin/login", { replace: true });
      } finally {
        setLoadingAuth(false);
      }
    }
    checkAuth();
  }, [location.pathname, navigate]);
  
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await authClient.signOut();
    } catch (_) {}
    navigate("/admin/login", { replace: true });
  };

  const menuItems = [
    { path: "/admin", icon: <LayoutDashboard size={20}/>, label: "Dashboard" },
    { path: "/admin/ai", icon: <Sparkles size={20}/>, label: "Aura AI" },
    { path: "/admin/products", icon: <Boxes size={20}/>, label: "Products" },
    { path: "/admin/orders", icon: <ClipboardList size={20}/>, label: "Orders", count: pendingOrdersCount },
    { path: "/admin/customers", icon: <Users size={20}/>, label: "Customers" },
    { path: "/admin/reviews", icon: <Star size={20}/>, label: "Reviews", count: pendingReviewsCount },
    { path: "/admin/banners", icon: <Megaphone size={20}/>, label: "Home Content" },
    { path: "/admin/offers", icon: <Tag size={20}/>, label: "Offers" },
    { path: "/admin/coupons", icon: <TicketPercent size={20}/>, label: "Coupons" },
    { path: "/admin/zodiac", icon: <LayoutDashboard size={20}/>, label: "Zodiac" },
    { path: "/admin/analytics", icon: <BarChart3 size={20}/>, label: "Analytics" },
    { path: "/admin/support", icon: <Headphones size={20}/>, label: "Support", count: openTicketsCount },
    { path: "/admin/settings", icon: <Settings size={20}/>, label: "Settings" }
  ];

  const currentItem = menuItems.find(i => i.path === location.pathname || (i.path !== '/admin' && location.pathname.startsWith(i.path)));
  const pageTitle = currentItem?.label || "Admin";

  const bottomTabs = [
    { path: "/admin", icon: <LayoutDashboard size={20}/>, label: "Home" },
    { path: "/admin/products", icon: <Boxes size={20}/>, label: "Products" },
    { path: "/admin/orders", icon: <ClipboardList size={20}/>, label: "Orders", count: pendingOrdersCount },
    { path: "/admin/customers", icon: <Users size={20}/>, label: "Customers" },
  ];

  const NavLinks = () => (
    <>
      <div className="admin-brand">
        Aura<span>Admin</span>
        <span className="live-status-pill"><span className="pulse-dot"></span> Live</span>
      </div>
      <div className="nav-links">
        {menuItems.map(item => (
          <Link 
            key={item.path} 
            to={item.path}
            className={location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path)) ? 'active' : ''}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {item.icon} {item.label}
            </span>
            {item.count > 0 && (
              <span style={{
                background: '#d64b2e',
                color: '#fff',
                fontSize: '11px',
                fontWeight: '700',
                padding: '2px 7px',
                borderRadius: '10px',
                minWidth: '20px',
                textAlign: 'center',
                boxShadow: '0 2px 6px rgba(214,75,46,0.3)'
              }}>
                {item.count}
              </span>
            )}
            {item.count === 0 && (item.path === '/admin/support' || item.path === '/admin/orders') && (
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#cbd5e1'
              }} />
            )}
          </Link>
        ))}
        <Link to="/" className="store-link-btn" target="_blank">
          <Store size={18}/> View Customer Store
        </Link>
        <button 
          onClick={handleLogout} 
          style={{
            background: 'none',
            border: 'none',
            color: '#c62828',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            marginTop: '15px'
          }}
        >
          <LogOut size={18} /> Admin Logout
        </button>
      </div>
    </>
  );

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
                <NavLinks />
              </aside>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="admin-desktop-sidebar">
        <NavLinks />
      </aside>

      {/* Main Content Area */}
      <section className="admin-main">
        <div className="admin-top-bar">
          <div className="page-title">{pageTitle}</div>
          <div className="admin-user-info">
            <Link to="/" className="view-store-pill" target="_blank"><Store size={14} /> Store Preview</Link>
            <span>{userEmail}</span>
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


