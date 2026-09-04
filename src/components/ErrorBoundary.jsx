import React from "react";
import { RotateCcw, AlertTriangle, ArrowLeft } from "lucide-react";

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

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      try {
        this.props.onReset();
      } catch (_) {}
    }
  };

  handleResetAndGoHome = () => {
    try {
      this.setState({ hasError: false, error: null });
    } catch (_) {}
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return typeof this.props.fallback === "function" 
          ? this.props.fallback({ error: this.state.error, retry: this.handleRetry })
          : this.props.fallback;
      }

      // Compact localized boundary for embedded widgets (e.g. Aura AI floating launcher, sidebar)
      if (this.props.compact || this.props.isolate) {
        return (
          <div
            style={{
              padding: "16px",
              borderRadius: "12px",
              background: "#fffdfa",
              border: "1px solid #ebd8c5",
              color: "#4a3528",
              textAlign: "center",
              fontSize: "13px",
              margin: "8px 0"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", color: "#b45309", marginBottom: "6px", fontWeight: "600" }}>
              <AlertTriangle size={15} />
              <span>Display update notice</span>
            </div>
            <p style={{ margin: "0 0 10px", fontSize: "12px", color: "#786457" }}>
              This section encountered a temporary issue.
            </p>
            <button
              onClick={this.handleRetry}
              type="button"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "6px 14px",
                borderRadius: "6px",
                background: "#2b170d",
                color: "#fff",
                border: "none",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              <RotateCcw size={12} />
              <span>Try Again</span>
            </button>
          </div>
        );
      }

      return (
        <div
          style={{
            minHeight: "60vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "32px 20px",
            background: "#fdfbf7",
            color: "#2b170d",
            fontFamily: "Inter, -apple-system, sans-serif",
            textAlign: "center"
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "rgba(165, 77, 43, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "16px",
              color: "#a54d2b"
            }}
          >
            <AlertTriangle size={28} />
          </div>

          <h2
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: "24px",
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
              maxWidth: "400px",
              lineHeight: 1.5,
              margin: "0 0 24px 0"
            }}
          >
            We encountered a temporary display issue with this view. You can retry loading or return to the home catalog.
          </p>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
            <button
              onClick={this.handleRetry}
              type="button"
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
              <span>Try Again</span>
            </button>

            <button
              onClick={this.handleResetAndGoHome}
              type="button"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "10px 20px",
                background: "#fff",
                color: "#7a6b61",
                border: "1px solid #ebd8c5",
                borderRadius: "99px",
                fontSize: "13.5px",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              <ArrowLeft size={15} />
              <span>Explore Catalog</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

