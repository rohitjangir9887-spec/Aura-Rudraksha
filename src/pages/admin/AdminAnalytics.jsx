import React, { useState, useEffect, useRef, useCallback } from "react";
import { AdminLayout } from "../../components/AdminLayout";
import { db } from "../../lib/db";
import {
  BarChart3,
  Sparkles,
  Globe,
  TrendingUp,
  RotateCcw,
  AlertCircle,
  Clock,
  Users,
  Eye,
  ShoppingBag,
  ShieldCheck,
  Calendar,
  Activity,
  Smartphone,
  Monitor,
  Database
} from "lucide-react";
import "./admin-pages.css";

const RANGE_OPTIONS = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "Last 7 Days" },
  { key: "30d", label: "Last 30 Days" },
  { key: "all", label: "All Time" }
];

export function AdminAnalytics() {
  const [range, setRange] = useState("today");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [analyticsError, setAnalyticsError] = useState(null);
  const [hoveredHour, setHoveredHour] = useState(null);
  const [hoveredDay, setHoveredDay] = useState(null);
  const [showAllHours, setShowAllHours] = useState(false);
  const mountedRef = useRef(true);

  const loadData = useCallback(async (selectedRange = range) => {
    setLoading(true);
    setAnalyticsError(null);

    try {
      const [analyticsRes, dbHealthRes] = await Promise.allSettled([
        db.fetchAnalytics(selectedRange),
        db.checkDbHealth().catch(() => ({ connected: false }))
      ]);

      if (!mountedRef.current) return;

      if (analyticsRes.status === "fulfilled" && analyticsRes.value) {
        const healthConnected = dbHealthRes.status === "fulfilled" ? Boolean(dbHealthRes.value?.connected) : analyticsRes.value.dbConnected;
        setData({ ...analyticsRes.value, dbConnected: healthConnected ?? analyticsRes.value.dbConnected });
      } else {
        setAnalyticsError(analyticsRes.reason?.message || "Analytics counters are temporarily unavailable.");
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setAnalyticsError(err?.message || "Failed to load analytics.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    mountedRef.current = true;
    loadData(range);
    return () => {
      mountedRef.current = false;
    };
  }, [range, loadData]);

  const handleRangeChange = (nextRange) => {
    setRange(nextRange);
    setHoveredHour(null);
    setHoveredDay(null);
  };

  const summary = data?.summary || {
    pageViews: 0,
    uniqueVisitors: 0,
    uniqueIps: 0,
    productViews: 0,
    ordersCount: 0,
    revenue: 0,
    conversionRate: "0.0",
    webOrdersCount: 0,
    webRevenue: 0,
    auraAiOrdersCount: 0,
    auraAiRevenue: 0,
    auraSharePercent: "0.0"
  };

  const periods = data?.periods || {};
  const hourlyTimeline = Array.isArray(data?.hourlyTimeline) ? data.hourlyTimeline : [];
  const dailyTrend = Array.isArray(data?.dailyTrend) ? data.dailyTrend : [];
  const recentVisits = Array.isArray(data?.recentVisits) ? data.recentVisits : [];
  const peakHour = data?.peakHour || { label: "N/A", pageViews: 0, uniqueVisitors: 0 };

  const maxHourlyViews = Math.max(1, ...hourlyTimeline.map(h => Math.max(h.pageViews || 0, h.uniqueVisitors || 0)));
  const maxDailyViews = Math.max(1, ...dailyTrend.map(d => Math.max(d.pageViews || 0, d.uniqueVisitors || 0)));

  const activeHours = showAllHours
    ? hourlyTimeline
    : hourlyTimeline.filter(h => (h.pageViews || 0) > 0 || (h.productViews || 0) > 0);

  if (loading && !data) {
    return (
      <AdminLayout>
        <div className="admin-page-header">
          <div>
            <h1>Analytics & Traffic Intelligence</h1>
            <p className="admin-page-subtitle">Loading live visitor tracking, IP/device deduplication & hourly charts...</p>
          </div>
        </div>
        <div style={{ display: "grid", placeItems: "center", padding: "60px 20px" }}>
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
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Header */}
      <div className="admin-page-header" style={{ gap: "12px", flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <h1 style={{ margin: 0 }}>Analytics & Traffic Intelligence</h1>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "11px",
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: "20px",
                background: data?.dbConnected ? "#e5f6ea" : "#fef2f2",
                color: data?.dbConnected ? "#166534" : "#b91c1c",
                border: `1px solid ${data?.dbConnected ? "#bbf7d0" : "#fecaca"}`
              }}
            >
              <Database size={12} />
              {data?.dbConnected ? "MongoDB Live Sync" : "Offline"}
            </span>
          </div>
          <p className="admin-page-subtitle">
            Per-day IP & Device deduplicated visitors, IST hourly traffic timings, peak hours & revenue trends.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadData(range)}
          disabled={loading}
          className="admin-btn secondary"
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <RotateCcw size={14} className={loading ? "spin" : ""} /> Refresh
        </button>
      </div>

      {/* Period Comparison Strip (Today / Yesterday / 7d / 30d / All Time) */}
      <div
        className="admin-card"
        style={{
          marginBottom: "18px",
          padding: "14px 16px",
          background: "linear-gradient(135deg, #fffdf9 0%, #f9f2e8 100%)",
          border: "1px solid #e6d4bf"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px", fontWeight: 700, color: "#7a320c" }}>
            <Calendar size={15} /> Timeframe Filter (IST • Asia/Kolkata)
          </div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {RANGE_OPTIONS.map(opt => {
              const active = range === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => handleRangeChange(opt.key)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: 700,
                    border: active ? "1px solid #8c2b10" : "1px solid #e0d1c1",
                    background: active ? "#8c2b10" : "#ffffff",
                    color: active ? "#ffffff" : "#5b4a3e",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Side-by-Side Comparison Mini-Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: "10px" }}>
          {RANGE_OPTIONS.map(opt => {
            const p = periods[opt.key] || { uniqueVisitors: 0, pageViews: 0, ordersCount: 0, revenue: 0 };
            const isSelected = range === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => handleRangeChange(opt.key)}
                style={{
                  textAlign: "left",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: isSelected ? "1.5px solid #a54d2b" : "1px solid #e7dbce",
                  background: isSelected ? "#fff8f1" : "#ffffff",
                  cursor: "pointer",
                  boxShadow: isSelected ? "0 3px 10px rgba(165,77,43,0.1)" : "none"
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: 700, color: isSelected ? "#a54d2b" : "#806f62", marginBottom: "4px" }}>
                  {opt.label}
                </div>
                <div style={{ fontSize: "16px", fontWeight: 800, color: "#2b170d" }}>
                  {p.uniqueVisitors || 0} <span style={{ fontSize: "11px", fontWeight: 600, color: "#6b5d52" }}>unique</span>
                </div>
                <div style={{ fontSize: "11px", color: "#6b5d52", marginTop: "2px" }}>
                  {p.pageViews || 0} views • {p.ordersCount || 0} orders
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {analyticsError && (
        <div
          style={{
            background: "#fffbeb",
            border: "1px solid #fef3c7",
            borderRadius: "10px",
            padding: "12px 16px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "10px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#92400e", fontSize: "13px" }}>
            <AlertCircle size={16} />
            <span>{analyticsError}</span>
          </div>
          <button
            type="button"
            onClick={() => loadData(range)}
            style={{
              background: "#d97706",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              padding: "4px 10px",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Selected Range KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "14px", marginBottom: "22px" }}>
        <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: "6px", borderLeft: "4px solid #0d9488" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#0f766e", fontSize: "12px", fontWeight: 700 }}>
            <span>Unique Visitors (Device+IP)</span>
            <Users size={16} />
          </div>
          <b style={{ fontSize: "26px", color: "#134e4a", lineHeight: 1.1 }}>{summary.uniqueVisitors}</b>
          <small style={{ color: "#6b7280", fontSize: "11px" }}>
            <ShieldCheck size={11} style={{ display: "inline", verticalAlign: "middle", marginRight: "3px" }} />
            {summary.uniqueIps || 0} Unique IP(s) • 10x visits/day = 1 user
          </small>
        </div>

        <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: "6px", borderLeft: "4px solid #0284c7" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#0369a1", fontSize: "12px", fontWeight: 700 }}>
            <span>Total Page Views</span>
            <Eye size={16} />
          </div>
          <b style={{ fontSize: "26px", color: "#0c4a6e", lineHeight: 1.1 }}>{summary.pageViews}</b>
          <small style={{ color: "#6b7280", fontSize: "11px" }}>
            Lifetime Total: {(data?.visits || 0).toLocaleString("en-IN")}
          </small>
        </div>

        <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: "6px", borderLeft: "4px solid #9333ea" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#7e22ce", fontSize: "12px", fontWeight: 700 }}>
            <span>Product Views</span>
            <Activity size={16} />
          </div>
          <b style={{ fontSize: "26px", color: "#581c87", lineHeight: 1.1 }}>{summary.productViews}</b>
          <small style={{ color: "#6b7280", fontSize: "11px" }}>
            Lifetime Product Views: {(data?.productViews || 0).toLocaleString("en-IN")}
          </small>
        </div>

        <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: "6px", borderLeft: "4px solid #d97706" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#b45309", fontSize: "12px", fontWeight: 700 }}>
            <span>Peak Traffic Time (IST)</span>
            <Clock size={16} />
          </div>
          <b style={{ fontSize: "16px", color: "#78350f", lineHeight: 1.25 }}>
            {peakHour.pageViews > 0 ? peakHour.label : "No visits yet"}
          </b>
          <small style={{ color: "#6b7280", fontSize: "11px" }}>
            {peakHour.pageViews > 0 ? `${peakHour.pageViews} views • ${peakHour.uniqueVisitors} unique` : "Tracking 24h IST slots"}
          </small>
        </div>

        <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: "6px", borderLeft: "4px solid #a54d2b" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#8c2b10", fontSize: "12px", fontWeight: 700 }}>
            <span>Orders & Conversion</span>
            <ShoppingBag size={16} />
          </div>
          <b style={{ fontSize: "26px", color: "#2b170d", lineHeight: 1.1 }}>{summary.ordersCount}</b>
          <small style={{ color: "#6b7280", fontSize: "11px" }}>
            Conversion Rate: <b>{summary.conversionRate}%</b>
          </small>
        </div>

        <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: "6px", borderLeft: "4px solid #16a34a" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#15803d", fontSize: "12px", fontWeight: 700 }}>
            <span>Revenue ({RANGE_OPTIONS.find(r => r.key === range)?.label})</span>
            <TrendingUp size={16} />
          </div>
          <b style={{ fontSize: "24px", color: "#166534", lineHeight: 1.1 }}>₹{(summary.revenue || 0).toLocaleString("en-IN")}</b>
          <small style={{ color: "#6b7280", fontSize: "11px" }}>
            Today: ₹{(data?.todayRevenue || 0).toLocaleString("en-IN")}
          </small>
        </div>
      </div>

      {/* Interactive Chart 1: Hourly Traffic & Timing Graph (00:00 - 23:00 IST) */}
      <div className="admin-card" style={{ marginBottom: "22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px", marginBottom: "14px" }}>
          <div>
            <h3 style={{ fontSize: "16px", color: "#7a320c", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
              <Clock size={18} /> Hourly Traffic & Timing Graph (IST 24 Hours)
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#806f62" }}>
              Kis samay (hour) par kitne page views aur unique visitors aaye — tap/hover any bar for exact timing details.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "11.5px", fontWeight: 600 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", color: "#a54d2b" }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: "#a54d2b", display: "inline-block" }} /> Page Views
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", color: "#0d9488" }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: "#0d9488", display: "inline-block" }} /> Unique Visitors
            </span>
          </div>
        </div>

        {/* Interactive Tooltip Box */}
        <div
          style={{
            background: "#fffaf3",
            border: "1px solid #ebd8c5",
            borderRadius: "8px",
            padding: "8px 12px",
            marginBottom: "12px",
            fontSize: "12px",
            color: "#3b2316",
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "8px"
          }}
        >
          {hoveredHour ? (
            <>
              <span>
                🕒 <b>Time Slot:</b> {hoveredHour.label} (IST)
              </span>
              <span>
                👁️ <b>{hoveredHour.pageViews}</b> Page Views • 👤 <b>{hoveredHour.uniqueVisitors}</b> Unique Visitors • 🛍️ <b>{hoveredHour.productViews}</b> Product Views
              </span>
            </>
          ) : (
            <>
              <span>
                🏆 <b>Peak Hour:</b> {peakHour.pageViews > 0 ? `${peakHour.label} (IST)` : "No traffic recorded in this period yet"}
              </span>
              <span>
                {peakHour.pageViews > 0
                  ? `${peakHour.pageViews} views • ${peakHour.uniqueVisitors} unique visitor(s)`
                  : "Bars populate automatically on customer visits"}
              </span>
            </>
          )}
        </div>

        {/* Responsive 24-Hour Dual Bar Chart */}
        <div style={{ overflowX: "auto", paddingBottom: "6px" }}>
          <div style={{ minWidth: "560px", height: "190px", display: "flex", alignItems: "flex-end", gap: "4px", padding: "12px 6px 0", borderBottom: "1.5px solid #e7ded5" }}>
            {hourlyTimeline.map(slot => {
              const viewsH = Math.max(slot.pageViews > 0 ? 8 : 2, Math.round((slot.pageViews / maxHourlyViews) * 145));
              const uniqH = Math.max(slot.uniqueVisitors > 0 ? 6 : 2, Math.round((slot.uniqueVisitors / maxHourlyViews) * 145));
              const isPeak = peakHour.pageViews > 0 && slot.hour === peakHour.hour;
              const isSelected = hoveredHour?.hour === slot.hour;
              return (
                <div
                  key={slot.hour}
                  onMouseEnter={() => setHoveredHour(slot)}
                  onClick={() => setHoveredHour(slot)}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    height: "100%",
                    cursor: "pointer",
                    background: isSelected ? "rgba(165, 77, 43, 0.08)" : isPeak ? "rgba(217, 119, 6, 0.07)" : "transparent",
                    borderRadius: "6px 6px 0 0",
                    padding: "0 2px"
                  }}
                  title={`${slot.label}: ${slot.pageViews} views, ${slot.uniqueVisitors} unique`}
                >
                  {slot.pageViews > 0 && (
                    <span style={{ fontSize: "9px", fontWeight: 700, color: "#7a320c", marginBottom: "2px" }}>
                      {slot.pageViews}
                    </span>
                  )}
                  <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", width: "100%", justifyContent: "center" }}>
                    <div
                      style={{
                        width: "42%",
                        maxWidth: "12px",
                        height: `${viewsH}px`,
                        background: isPeak ? "#d97706" : "#a54d2b",
                        borderRadius: "3px 3px 0 0",
                        transition: "height 0.25s ease"
                      }}
                    />
                    <div
                      style={{
                        width: "42%",
                        maxWidth: "12px",
                        height: `${uniqH}px`,
                        background: "#0d9488",
                        borderRadius: "3px 3px 0 0",
                        transition: "height 0.25s ease"
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ minWidth: "560px", display: "flex", gap: "4px", padding: "5px 6px 0" }}>
            {hourlyTimeline.map(slot => (
              <div
                key={slot.hour}
                style={{
                  flex: 1,
                  textAlign: "center",
                  fontSize: "9.5px",
                  fontWeight: peakHour.pageViews > 0 && slot.hour === peakHour.hour ? 800 : 500,
                  color: peakHour.pageViews > 0 && slot.hour === peakHour.hour ? "#b45309" : "#806f62"
                }}
              >
                {slot.shortLabel}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Chart 2: Daily Traffic & Revenue Trend */}
      <div className="admin-card" style={{ marginBottom: "22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "12px" }}>
          <div>
            <h3 style={{ fontSize: "16px", color: "#7a320c", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
              <BarChart3 size={18} /> Daily Visitors & Views Trend ({dailyTrend.length} Days)
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#806f62" }}>
              Rozana kitne Unique Visitors aur total Page Views / Orders aaye.
            </p>
          </div>
          {hoveredDay && (
            <div style={{ fontSize: "12px", background: "#f0fdfa", border: "1px solid #99f6e4", color: "#115e59", padding: "5px 10px", borderRadius: "8px", fontWeight: 600 }}>
              📅 {hoveredDay.dateKey} ({hoveredDay.label}): <b>{hoveredDay.uniqueVisitors}</b> unique • <b>{hoveredDay.pageViews}</b> views • <b>{hoveredDay.ordersCount}</b> orders (₹{(hoveredDay.revenue || 0).toLocaleString("en-IN")})
            </div>
          )}
        </div>

        <div style={{ overflowX: "auto", paddingBottom: "4px" }}>
          <div style={{ minWidth: dailyTrend.length > 10 ? "680px" : "420px", height: "175px", display: "flex", alignItems: "flex-end", gap: "8px", padding: "10px 6px 0", borderBottom: "1.5px solid #e7ded5" }}>
            {dailyTrend.map(day => {
              const viewsH = Math.max(day.pageViews > 0 ? 10 : 3, Math.round((day.pageViews / maxDailyViews) * 135));
              const uniqH = Math.max(day.uniqueVisitors > 0 ? 8 : 3, Math.round((day.uniqueVisitors / maxDailyViews) * 135));
              const isSelected = hoveredDay?.dateKey === day.dateKey;
              return (
                <div
                  key={day.dateKey}
                  onMouseEnter={() => setHoveredDay(day)}
                  onClick={() => setHoveredDay(day)}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    height: "100%",
                    cursor: "pointer",
                    background: isSelected ? "rgba(13, 148, 136, 0.08)" : "transparent",
                    borderRadius: "6px 6px 0 0",
                    padding: "0 2px"
                  }}
                >
                  {(day.pageViews > 0 || day.uniqueVisitors > 0) && (
                    <span style={{ fontSize: "9.5px", fontWeight: 700, color: "#2b170d", marginBottom: "2px" }}>
                      {day.uniqueVisitors}/{day.pageViews}
                    </span>
                  )}
                  <div style={{ display: "flex", alignItems: "flex-end", gap: "3px", width: "100%", justifyContent: "center" }}>
                    <div
                      style={{
                        width: "38%",
                        maxWidth: "16px",
                        height: `${viewsH}px`,
                        background: "#a54d2b",
                        borderRadius: "4px 4px 0 0"
                      }}
                    />
                    <div
                      style={{
                        width: "38%",
                        maxWidth: "16px",
                        height: `${uniqH}px`,
                        background: "#0d9488",
                        borderRadius: "4px 4px 0 0"
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ minWidth: dailyTrend.length > 10 ? "680px" : "420px", display: "flex", gap: "8px", padding: "6px 6px 0" }}>
            {dailyTrend.map(day => (
              <div key={day.dateKey} style={{ flex: 1, textAlign: "center", fontSize: "10px", color: "#6b5d52", fontWeight: day.label === "Today" ? 700 : 500 }}>
                {dailyTrend.length > 14 ? day.shortDate.split(" ")[0] : day.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Time-Wise Breakdown + Live Recent Visitor Log */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "18px", marginBottom: "22px" }}>
        {/* Hourly Timing Schedule */}
        <div className="admin-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", gap: "8px" }}>
            <h3 style={{ fontSize: "15.5px", color: "#7a320c", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
              <Clock size={16} /> Hourly View Breakdown (IST)
            </h3>
            <button
              type="button"
              onClick={() => setShowAllHours(prev => !prev)}
              style={{
                background: "#fdf5ef",
                border: "1px solid #e5d2be",
                color: "#7a320c",
                borderRadius: "6px",
                padding: "4px 9px",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              {showAllHours ? "Active Hours Only" : "Show All 24 Hours"}
            </button>
          </div>

          {activeHours.length === 0 ? (
            <div style={{ padding: "24px 12px", textAlign: "center", color: "#806f62", fontSize: "12.5px" }}>
              Is avadhi (period) me abhi koi hourly view record nahi hua hai.
            </div>
          ) : (
            <div style={{ maxHeight: "310px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
              {activeHours.map(slot => {
                const pct = Math.round(((slot.pageViews || 0) / maxHourlyViews) * 100);
                return (
                  <div key={slot.hour} style={{ padding: "8px 10px", borderRadius: "8px", background: "#fffcf8", border: "1px solid #eee3d7" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                      <strong style={{ color: "#2b170d" }}>{slot.label}</strong>
                      <span style={{ color: "#7a320c", fontWeight: 700 }}>
                        {slot.pageViews} views • {slot.uniqueVisitors} unique
                      </span>
                    </div>
                    <div style={{ height: "6px", borderRadius: "4px", background: "#f2e8dd", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #a54d2b, #0d9488)" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Live Visitor Timing Log (IP + Device + IST Time) */}
        <div className="admin-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ fontSize: "15.5px", color: "#7a320c", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
              <Activity size={16} /> Recent Visitor Timings (Device & IP)
            </h3>
            <span style={{ fontSize: "11px", color: "#806f62", fontWeight: 600 }}>
              Latest {recentVisits.length}
            </span>
          </div>

          {recentVisits.length === 0 ? (
            <div style={{ padding: "24px 12px", textAlign: "center", color: "#806f62", fontSize: "12.5px" }}>
              Is period me koi recent visit log nahi hai.
            </div>
          ) : (
            <div style={{ maxHeight: "310px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
              {recentVisits.map((v, idx) => {
                const isMobile = /android|iphone|ipad|meta app/i.test(v.deviceType || "");
                return (
                  <div
                    key={`${v.timestamp || idx}-${idx}`}
                    style={{
                      padding: "8px 10px",
                      borderRadius: "8px",
                      background: "#ffffff",
                      border: "1px solid #ede4da",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "10px",
                      flexWrap: "wrap"
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "11.5px", fontWeight: 800, color: "#7a320c" }}>
                          {v.istTimeLabel || ""} ({v.istDate || ""})
                        </span>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "1px 6px",
                            borderRadius: "10px",
                            background: v.type === "product_view" ? "#f3e8ff" : v.isUniqueToday ? "#ccfbf1" : "#f3f4f6",
                            color: v.type === "product_view" ? "#6b21a8" : v.isUniqueToday ? "#0f766e" : "#4b5563"
                          }}
                        >
                          {v.type === "product_view" ? "Product View" : v.isUniqueToday ? "New Unique Today" : "Repeat Visit"}
                        </span>
                      </div>
                      <div style={{ fontSize: "11.5px", color: "#3b322c", marginTop: "3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {v.productName ? `${v.productName} (${v.path})` : (v.path || "/")}
                      </div>
                    </div>

                    <div style={{ textAlign: "right", fontSize: "10.5px", color: "#6b5d52", flexShrink: 0 }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: 600 }}>
                        {isMobile ? <Smartphone size={11} /> : <Monitor size={11} />}
                        {v.deviceType || "Browser"}
                      </div>
                      <div style={{ fontFamily: "monospace", fontSize: "10px", color: "#806f62" }}>
                        IP: {v.ipMasked || "***.***.***"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Order Attribution Breakdown: Web vs Aura AI */}
      <div className="admin-card">
        <h3 style={{ fontSize: "16px", color: "#7a320c", display: "flex", alignItems: "center", gap: "8px", margin: "0 0 16px" }}>
          <TrendingUp size={18} /> Sales Channel Attribution ({RANGE_OPTIONS.find(r => r.key === range)?.label})
        </h3>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
          {/* Web Storefront Channel */}
          <div style={{ background: "#fffdf9", border: "1.5px solid #e8dac9", borderRadius: "12px", padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <span style={{ fontWeight: "700", color: "#3b322c", display: "flex", alignItems: "center", gap: "6px" }}>
                <Globe size={16} color="#7a320c" /> Web Storefront Checkout
              </span>
              <span className="admin-badge" style={{ fontSize: "11px", padding: "2px 8px" }}>Standard</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: "12px" }}>
              <div>
                <small style={{ color: "#806f62", display: "block" }}>Orders</small>
                <b style={{ fontSize: "20px", color: "#2b170d" }}>{summary.webOrdersCount}</b>
              </div>
              <div style={{ textAlign: "right" }}>
                <small style={{ color: "#806f62", display: "block" }}>Revenue</small>
                <b style={{ fontSize: "20px", color: "#166534" }}>₹{(summary.webRevenue || 0).toLocaleString("en-IN")}</b>
              </div>
            </div>
          </div>

          {/* Aura AI Chat Channel */}
          <div style={{ background: "linear-gradient(135deg, #fffcf4 0%, #fef8eb 100%)", border: "1.5px solid #fde68a", borderRadius: "12px", padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <span style={{ fontWeight: "700", color: "#92400e", display: "flex", alignItems: "center", gap: "6px" }}>
                <Sparkles size={16} color="#d97706" /> Aura AI Assistant Orders
              </span>
              <span className="admin-badge warning" style={{ fontSize: "11px", padding: "2px 8px", background: "#fef3c7", color: "#92400e" }}>
                {summary.auraSharePercent}% Share
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: "12px" }}>
              <div>
                <small style={{ color: "#806f62", display: "block" }}>AI Orders</small>
                <b style={{ fontSize: "20px", color: "#92400e" }}>{summary.auraAiOrdersCount}</b>
              </div>
              <div style={{ textAlign: "right" }}>
                <small style={{ color: "#806f62", display: "block" }}>AI Revenue</small>
                <b style={{ fontSize: "20px", color: "#166534" }}>₹{(summary.auraAiRevenue || 0).toLocaleString("en-IN")}</b>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
