import React from "react";
import { LayoutDashboard, Boxes, ClipboardList, Users, Megaphone, Tag, TicketPercent, BarChart3, Headphones, Settings, Star, Sparkles } from "lucide-react";

export const getMenuItems = (counts) => [
  { path: "/admin", icon: <LayoutDashboard size={20}/>, label: "Dashboard" },
  { path: "/admin/ai", icon: <Sparkles size={20}/>, label: "Aura AI" },
  { path: "/admin/products", icon: <Boxes size={20}/>, label: "Products" },
  { path: "/admin/categories", icon: <Tag size={20}/>, label: "Categories" },
  { path: "/admin/orders", icon: <ClipboardList size={20}/>, label: "Orders", count: counts.pendingOrdersCount },
  { path: "/admin/customers", icon: <Users size={20}/>, label: "Customers" },
  { path: "/admin/reviews", icon: <Star size={20}/>, label: "Reviews", count: counts.pendingReviewsCount },
  { path: "/admin/banners", icon: <Megaphone size={20}/>, label: "Home Content" },
  { path: "/admin/offers", icon: <Tag size={20}/>, label: "Offers" },
  { path: "/admin/coupons", icon: <TicketPercent size={20}/>, label: "Coupons" },
  { path: "/admin/zodiac", icon: <LayoutDashboard size={20}/>, label: "Zodiac" },
  { path: "/admin/analytics", icon: <BarChart3 size={20}/>, label: "Analytics" },
  { path: "/admin/support", icon: <Headphones size={20}/>, label: "Support", count: counts.openTicketsCount },
  { path: "/admin/settings", icon: <Settings size={20}/>, label: "Settings" }
];

export const getBottomTabs = (counts) => [
  { path: "/admin", icon: <LayoutDashboard size={20}/>, label: "Home" },
  { path: "/admin/products", icon: <Boxes size={20}/>, label: "Products" },
  { path: "/admin/orders", icon: <ClipboardList size={20}/>, label: "Orders", count: counts.pendingOrdersCount },
  { path: "/admin/customers", icon: <Users size={20}/>, label: "Customers" },
];
