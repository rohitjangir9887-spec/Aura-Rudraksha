import React from "react";
import { AlertTriangle, RotateCcw, Home, ArrowLeft } from "lucide-react";
import { ADMIN_BASE_PATH } from "../../lib/routes";

export class AdminErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[Admin Error Boundary Caught Exception]:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  handleResetToDashboard = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (typeof window !== "undefined") {
      window.location.href = ADMIN_BASE_PATH;
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            background: "#fdfbf7",
            fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
          }}
        >
          <div
            style={{
              maxWidth: "520px",
              width: "100%",
              background: "#ffffff",
              border: "1px solid #ebd8c5",
              borderRadius: "16px",
              padding: "36px 28px",
              textAlign: "center",
              boxShadow: "0 12px 36px rgba(43,23,13,0.08)"
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "#fef2f2",
                color: "#dc2626",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 16px"
              }}
            >
              <AlertTriangle size={28} />
            </div>

            <h1
              style={{
                fontSize: "20px",
                color: "#2b170d",
                fontWeight: "700",
                margin: "0 0 8px",
                letterSpacing: "-0.01em"
              }}
            >
              Admin page couldn't load
            </h1>

            <p
              style={{
                fontSize: "14px",
                color: "#6b5d52",
                lineHeight: "1.5",
                margin: "0 0 20px"
              }}
            >
              A temporary issue occurred while rendering this section of the admin panel. Your data and customer storefront remain safe and unaffected.
            </p>

            {this.state.error?.message && (
              <div
                style={{
                  background: "#fdf8f4",
                  border: "1px dashed #e8dac9",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  fontSize: "12px",
                  color: "#8a4522",
                  marginBottom: "24px",
                  textAlign: "left",
                  wordBreak: "break-word",
                  fontFamily: "monospace"
                }}
              >
                {this.state.error.message}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "12px 20px",
                  background: "#2b170d",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "10px",
                  fontSize: "13.5px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "background 0.15s ease"
                }}
              >
                <RotateCcw size={16} /> Reload Admin
              </button>

              <button
                type="button"
                onClick={this.handleResetToDashboard}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "11px 20px",
                  background: "#fdfbf7",
                  color: "#7a320c",
                  border: "1px solid #ebd8c5",
                  borderRadius: "10px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
              >
                <Home size={15} /> Return to Dashboard Home
              </button>

              <a
                href="/"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "8px 12px",
                  color: "#806f62",
                  fontSize: "12.5px",
                  textDecoration: "none",
                  marginTop: "6px"
                }}
              >
                <ArrowLeft size={14} /> Back to Customer Store
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
