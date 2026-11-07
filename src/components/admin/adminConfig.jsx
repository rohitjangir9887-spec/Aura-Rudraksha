import React from "react";
import {
  LayoutDashboard,
  Boxes,
  ClipboardList,
  Users,
  Megaphone,
  Tag,
  TicketPercent,
  BarChart3,
  Headphones,
  Settings,
  Star,
  Sparkles,
  Bot
} from "lucide-react";
import { ADMIN_BASE_PATH } from "../../lib/routes";

export const getMenuItems = (counts = {}) => [
  { path: ADMIN_BASE_PATH, icon: <LayoutDashboard size={20} />, label: "Dashboard" },
  { path: `${ADMIN_BASE_PATH}/ai-chats`, icon: <Bot size={20} />, label: "AI Bot Customer Chats" },
  { path: `${ADMIN_BASE_PATH}/ai`, icon: <Bot size={20} />, label: "Aura AI Chat Bot" },
  { path: `${ADMIN_BASE_PATH}/home-products`, icon: <Megaphone size={20} />, label: "Home Products Order" },
  { path: `${ADMIN_BASE_PATH}/products`, icon: <Boxes size={20} />, label: "Products" },
  { path: `${ADMIN_BASE_PATH}/categories`, icon: <Tag size={20} />, label: "Categories" },
  { path: `${ADMIN_BASE_PATH}/orders`, icon: <ClipboardList size={20} />, label: "Orders", count: counts.pendingOrdersCount },
  { path: `${ADMIN_BASE_PATH}/customers`, icon: <Users size={20} />, label: "Customers" },
  { path: `${ADMIN_BASE_PATH}/reviews`, icon: <Star size={20} />, label: "Reviews", count: counts.pendingReviewsCount },
  { path: `${ADMIN_BASE_PATH}/banners`, icon: <Megaphone size={20} />, label: "Home Content" },
  { path: `${ADMIN_BASE_PATH}/offers`, icon: <Tag size={20} />, label: "Offers" },
  { path: `${ADMIN_BASE_PATH}/coupons`, icon: <TicketPercent size={20} />, label: "Coupons" },
  { path: `${ADMIN_BASE_PATH}/zodiac`, icon: <LayoutDashboard size={20} />, label: "Zodiac" },
  { path: `${ADMIN_BASE_PATH}/analytics`, icon: <BarChart3 size={20} />, label: "Analytics" },
  { path: `${ADMIN_BASE_PATH}/support`, icon: <Headphones size={20} />, label: "Support", count: counts.openTicketsCount },
  { path: `${ADMIN_BASE_PATH}/settings`, icon: <Settings size={20} />, label: "Settings" }
];

export const getBottomTabs = (counts = {}) => [
  { path: ADMIN_BASE_PATH, icon: <LayoutDashboard size={20} />, label: "Home" },
  { path: `${ADMIN_BASE_PATH}/products`, icon: <Boxes size={20} />, label: "Products" },
  { path: `${ADMIN_BASE_PATH}/orders`, icon: <ClipboardList size={20} />, label: "Orders", count: counts.pendingOrdersCount },
  { path: `${ADMIN_BASE_PATH}/customers`, icon: <Users size={20} />, label: "Customers" }
];
