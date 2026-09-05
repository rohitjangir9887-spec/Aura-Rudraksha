import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Store, LogOut } from "lucide-react";
import { getMenuItems } from "./adminConfig";

export function AdminNavLinks({ counts, onLogout }) {
  const location = useLocation();
  const menuItems = getMenuItems(counts);

  return (
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
          onClick={onLogout}
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
}
