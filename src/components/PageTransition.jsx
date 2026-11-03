import React from "react";

export function PageTransition({ children }) {
  return (
    <div style={{ position: "relative", minHeight: "100vh", width: "100%" }}>
      {children}
    </div>
  );
}


