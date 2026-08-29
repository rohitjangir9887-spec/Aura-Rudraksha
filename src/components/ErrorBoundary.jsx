import React from "react";
import { RotateCcw, AlertTriangle } from "lucide-react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Aura Rudraksha caught UI exception:", error, errorInfo);
  }

  handleReload = () => {
    try {
      localStorage.removeItem("aura_ai_floating_dismissed");
    } catch (_) {}
    window.location.reload();
  };

  handleResetAndGoHome = () => {
    try {
      sessionStorage.clear();
    } catch (_) {}
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            background: "#fdfbf7",
            color: "#2b170d",
            fontFamily: "Inter, -apple-system, sans-serif",
            textAlign: "center"
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: "rgba(165, 77, 43, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "16px",
              color: "#a54d2b"
            }}
          >
            <AlertTriangle size={32} />
          </div>

          <h2
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: "26px",
              fontWeight: 700,
              margin: "0 0 8px 0",
              color: "#2b170d"
            }}
          >
            Aura Rudraksha
          </h2>

          <p
            style={{
              fontSize: "14px",
              color: "#7a6b61",
              maxWidth: "380px",
              lineHeight: 1.5,
              margin: "0 0 24px 0"
            }}
          >
            A temporary screen refresh is needed. Kripya page ko refresh karein ya Home page par jayein.
          </p>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
            <button
              onClick={this.handleReload}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                background: "#2b170d",
                color: "#fbf5ef",
                border: "none",
                borderRadius: "99px",
                fontSize: "13.5px",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(43, 23, 13, 0.15)"
              }}
            >
              <RotateCcw size={15} />
              <span>Refresh Page</span>
            </button>

            <button
              onClick={this.handleResetAndGoHome}
              style={{
                padding: "10px 20px",
                background: "#f4eee6",
                color: "#2b170d",
                border: "1px solid #ebd8c5",
                borderRadius: "99px",
                fontSize: "13.5px",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Go to Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
