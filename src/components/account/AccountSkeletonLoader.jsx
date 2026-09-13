import React from "react";

export function AccountSkeletonLoader() {
  return (
    <div 
      className="account-skeleton-wrapper"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "18px",
        width: "100%",
        maxWidth: 880,
        margin: "0 auto",
        animation: "pulse 1.5s ease-in-out infinite"
      }}
    >
      {/* 1. Header Profile Card Skeleton */}
      <div
        style={{
          background: "linear-gradient(135deg, #fffdf9 0%, #fbf4ea 100%)",
          border: "1px solid #e8dac9",
          borderRadius: "18px",
          padding: "24px 20px",
          boxShadow: "0 4px 20px rgba(43, 23, 13, 0.04)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {/* Avatar skeleton */}
            <div
              style={{
                width: "74px",
                height: "74px",
                borderRadius: "50%",
                background: "#ebdccb",
                flexShrink: 0
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ width: "160px", height: "24px", background: "#ebdccb", borderRadius: "6px" }} />
              <div style={{ width: "210px", height: "14px", background: "#f2e7dc", borderRadius: "4px" }} />
              <div style={{ width: "110px", height: "20px", background: "#ebdccb", borderRadius: "12px", marginTop: "4px" }} />
            </div>
          </div>
          <div style={{ width: "110px", height: "40px", background: "#ebdccb", borderRadius: "10px" }} />
        </div>
      </div>

      {/* 2. Quick Stat Badges Skeleton */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: "12px"
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              background: "#fffdf9",
              border: "1px solid #ebdccb",
              borderRadius: "14px",
              padding: "16px 14px",
              height: "76px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: "8px"
            }}
          >
            <div style={{ width: "40px", height: "22px", background: "#ebdccb", borderRadius: "4px" }} />
            <div style={{ width: "70px", height: "12px", background: "#f2e7dc", borderRadius: "3px" }} />
          </div>
        ))}
      </div>

      {/* 3. Action Cards Grid Skeleton */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "14px"
        }}
      >
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            style={{
              background: "#fffdf9",
              border: "1px solid #ebdccb",
              borderRadius: "14px",
              padding: "18px 16px",
              height: "82px",
              display: "flex",
              alignItems: "center",
              gap: "14px"
            }}
          >
            <div style={{ width: "44px", height: "44px", borderRadius: "10px", background: "#ebdccb", flexShrink: 0 }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ width: "110px", height: "16px", background: "#ebdccb", borderRadius: "4px" }} />
              <div style={{ width: "160px", height: "12px", background: "#f2e7dc", borderRadius: "3px" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
