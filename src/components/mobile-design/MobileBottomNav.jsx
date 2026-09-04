import React from "react";
import { Home, Compass, Package, Heart, User } from "lucide-react";

/**
 * MobileBottomNav
 * 
 * Standard mobile bottom navigation:
 * Home | Shop | Orders | Wishlist | Account
 */
export function MobileBottomNav({ activeTab = "orders", onTabChange }) {
  const tabs = [
    { id: "home", label: "Home", icon: Home },
    { id: "shop", label: "Shop", icon: Compass },
    { id: "orders", label: "Orders", icon: Package },
    { id: "wishlist", label: "Wishlist", icon: Heart },
    { id: "account", label: "Account", icon: User }
  ];

  return (
    <nav
      style={{
        position: "sticky",
        bottom: 0,
        left: 0,
        right: 0,
        height: "60px",
        background: "#ffffff",
        borderTop: "1px solid #ede3d8",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        zIndex: 35,
        boxShadow: "0 -2px 10px rgba(43, 23, 13, 0.04)"
      }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange && onTabChange(tab.id)}
            style={{
              flex: 1,
              height: "100%",
              background: "none",
              border: "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "3px",
              cursor: "pointer",
              padding: "4px 0",
              color: isActive ? "#99582a" : "#8c796d"
            }}
          >
            <div
              style={{
                position: "relative",
                padding: "2px 10px",
                borderRadius: "12px",
                background: isActive ? "#f8efe6" : "transparent"
              }}
            >
              <Icon size={19} color={isActive ? "#99582a" : "#8c796d"} strokeWidth={isActive ? 2.4 : 1.8} />
            </div>
            <span
              style={{
                fontSize: "10px",
                fontWeight: isActive ? "700" : "500",
                color: isActive ? "#2b170d" : "#8c796d",
                letterSpacing: "0.2px"
              }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
