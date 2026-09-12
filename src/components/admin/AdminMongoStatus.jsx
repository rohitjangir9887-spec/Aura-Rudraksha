import React, { useState, useEffect, useCallback } from "react";
import { db } from "../../lib/db";
import { emitToast } from "../../context/ToastContext";
import {
  Database, CheckCircle2, AlertTriangle, AlertCircle, XCircle, RefreshCw, Activity,
  Server, Clock, Copy, Check, Terminal, ShieldAlert, Wifi, WifiOff,
  Trash2, HelpCircle, ChevronDown, ChevronUp, Layers, Key, Zap, Info
} from "lucide-react";

export function AdminMongoStatus({ onStatusChange, compact = false }) {
  const [diagnostics, setDiagnostics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchDiagnostics = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setErrorMsg(null);
    try {
      const res = await db.getDbDiagnostics();
      if (res?.success && res.data) {
        setDiagnostics(res.data);
        if (onStatusChange) {
          onStatusChange(res.data);
        }
      } else {
        setErrorMsg(res?.message || "Could not retrieve MongoDB diagnostics");
      }
    } catch (err) {
      setErrorMsg(err?.message || "Failed to reach MongoDB diagnostics service");
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [onStatusChange]);

  useEffect(() => {
    fetchDiagnostics();
  }, [fetchDiagnostics]);

  // Optional auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchDiagnostics(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchDiagnostics]);

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const res = await db.testDbConnection();
      if (res?.success) {
        emitToast(res.message || "MongoDB connection is healthy!", "success");
      } else {
        emitToast(res.message || "MongoDB connection test failed.", "error");
      }
      if (res?.data) {
        setDiagnostics(res.data);
        if (onStatusChange) onStatusChange(res.data);
      } else {
        fetchDiagnostics(true);
      }
    } catch (err) {
      emitToast("Connection test error: " + err.message, "error");
      fetchDiagnostics(true);
    } finally {
      setTesting(false);
    }
  };

  const handleClearErrors = async () => {
    setClearing(true);
    try {
      const res = await db.clearDbErrorLogs();
      if (res?.success) {
        emitToast("MongoDB error logs cleared.", "success");
        if (res.data) setDiagnostics(res.data);
        else fetchDiagnostics(true);
      } else {
        emitToast(res?.message || "Failed to clear error logs.", "error");
      }
    } catch (err) {
      emitToast("Error clearing logs: " + err.message, "error");
    } finally {
      setClearing(false);
    }
  };

  const handleCopyLog = (log) => {
    const text = `[${log.timestamp}] [${log.type || 'Error'}] (Context: ${log.context || 'none'})\nMessage: ${log.message}\n${log.details ? 'Details:\n' + log.details : ''}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(log.id);
      emitToast("Error log copied to clipboard", "info");
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => {
      emitToast("Failed to copy log to clipboard", "error");
    });
  };

  const isConnected = diagnostics?.isConnected === true;
  const status = diagnostics?.status || (loading ? "loading" : "unknown");
  const lastErrors = diagnostics?.lastErrors || [];

  const getStatusBadge = () => {
    if (loading && !diagnostics) {
      return (
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          background: "#f1f5f9",
          color: "#475569",
          fontSize: "12px",
          fontWeight: 600,
          padding: "4px 12px",
          borderRadius: "20px"
        }}>
          <RefreshCw size={12} className="spin" /> Checking Status...
        </span>
      );
    }

    if (isConnected) {
      return (
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          background: "#ecfdf5",
          border: "1px solid #a7f3d0",
          color: "#047857",
          fontSize: "12px",
          fontWeight: 700,
          padding: "4px 12px",
          borderRadius: "20px"
        }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 0 2px rgba(16, 185, 129, 0.2)" }} />
          MongoDB Active & Connected
        </span>
      );
    }

    if (status === "connecting") {
      return (
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          background: "#fffbeb",
          border: "1px solid #fde68a",
          color: "#b45309",
          fontSize: "12px",
          fontWeight: 700,
          padding: "4px 12px",
          borderRadius: "20px"
        }}>
          <RefreshCw size={12} className="spin" />
          Connecting to MongoDB...
        </span>
      );
    }

    if (status === "unconfigured") {
      return (
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          background: "#fef2f2",
          border: "1px solid #fecaca",
          color: "#b91c1c",
          fontSize: "12px",
          fontWeight: 700,
          padding: "4px 12px",
          borderRadius: "20px"
        }}>
          <WifiOff size={12} />
          URI Not Configured
        </span>
      );
    }

    return (
      <span style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        background: "#fef2f2",
        border: "1px solid #fecaca",
        color: "#dc2626",
        fontSize: "12px",
        fontWeight: 700,
        padding: "4px 12px",
        borderRadius: "20px"
      }}>
        <XCircle size={12} />
        Disconnected / Offline
      </span>
    );
  };

  const formatTimestamp = (isoString) => {
    if (!isoString) return "Never";
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + " (" + date.toLocaleDateString() + ")";
    } catch (_) {
      return isoString;
    }
  };

  return (
    <div
      id="admin-mongo-status-card"
      style={{
        background: "linear-gradient(135deg, #ffffff 0%, #faf8f5 100%)",
        border: "1px solid #e7ded5",
        borderRadius: "14px",
        padding: compact ? "16px" : "20px 22px",
        boxShadow: "0 4px 16px rgba(43, 23, 13, 0.04)",
        display: "flex",
        flexDirection: "column",
        gap: "18px"
      }}
    >
      {/* Header Bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            background: isConnected ? "#047857" : "#854d0e",
            color: "#ffffff",
            width: 36,
            height: 36,
            borderRadius: "10px",
            display: "grid",
            placeItems: "center",
            boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
          }}>
            <Database size={20} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#2b170d", margin: 0, letterSpacing: "-0.01em" }}>
                MongoDB Connection Status
              </h3>
              {getStatusBadge()}
            </div>
            <p style={{ fontSize: "12px", color: "#786b61", margin: "3px 0 0" }}>
              Live database connectivity metrics, health check, and connection error logging
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <button
            id="btn-auto-refresh-toggle"
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{
              fontSize: "11px",
              fontWeight: 600,
              padding: "6px 10px",
              borderRadius: "6px",
              border: autoRefresh ? "1px solid #10b981" : "1px solid #d1d5db",
              background: autoRefresh ? "#ecfdf5" : "#ffffff",
              color: autoRefresh ? "#047857" : "#4b5563",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px"
            }}
            title={autoRefresh ? "Auto-refreshing every 15s" : "Click to auto-refresh every 15s"}
          >
            <Activity size={12} className={autoRefresh ? "spin" : ""} />
            {autoRefresh ? "Auto (15s)" : "Auto-Refresh"}
          </button>

          <button
            id="btn-refresh-mongo-diagnostics"
            onClick={() => fetchDiagnostics(false)}
            disabled={loading || testing}
            style={{
              fontSize: "12px",
              fontWeight: 600,
              padding: "7px 12px",
              borderRadius: "6px",
              border: "1px solid #d1d5db",
              background: "#ffffff",
              color: "#374151",
              cursor: loading || testing ? "wait" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "5px"
            }}
            title="Refresh database diagnostics"
          >
            <RefreshCw size={13} className={loading ? "spin" : ""} />
            <span>Refresh</span>
          </button>

          <button
            id="btn-test-mongo-connection"
            onClick={handleTestConnection}
            disabled={testing || loading}
            style={{
              fontSize: "12px",
              fontWeight: 700,
              padding: "7px 14px",
              borderRadius: "6px",
              border: "none",
              background: "#7a320c",
              color: "#ffffff",
              cursor: testing ? "wait" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 2px 4px rgba(122, 50, 12, 0.2)"
            }}
            title="Perform a live ping / connection test"
          >
            {testing ? <RefreshCw size={13} className="spin" /> : <Zap size={13} />}
            <span>{testing ? "Testing..." : "Test Connection"}</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div style={{
          background: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: "8px",
          padding: "10px 14px",
          color: "#991b1b",
          fontSize: "12px",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Metrics Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
        gap: "12px"
      }}>
        {/* Metric 1: Host / Cluster */}
        <div style={{
          background: "#ffffff",
          border: "1px solid #eae2d9",
          borderRadius: "10px",
          padding: "12px 14px",
          display: "flex",
          flexDirection: "column",
          gap: "4px"
        }}>
          <div style={{ fontSize: "11px", color: "#806f62", display: "flex", alignItems: "center", gap: "5px", fontWeight: 600 }}>
            <Server size={13} color="#7a320c" /> Host / Cluster
          </div>
          <div style={{
            fontSize: "13px",
            fontWeight: 700,
            color: "#2b170d",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis"
          }} title={diagnostics?.host || "Not connected"}>
            {diagnostics?.host || (diagnostics?.uriConfigured ? "Cluster Configured" : "None")}
          </div>
          <div style={{ fontSize: "10px", color: "#9ca3af" }}>
            Database: <strong style={{ color: "#4b5563" }}>{diagnostics?.databaseName || "aura_rudraksha"}</strong>
          </div>
        </div>

        {/* Metric 2: Ready State */}
        <div style={{
          background: "#ffffff",
          border: "1px solid #eae2d9",
          borderRadius: "10px",
          padding: "12px 14px",
          display: "flex",
          flexDirection: "column",
          gap: "4px"
        }}>
          <div style={{ fontSize: "11px", color: "#806f62", display: "flex", alignItems: "center", gap: "5px", fontWeight: 600 }}>
            <Activity size={13} color="#7a320c" /> Ready State
          </div>
          <div style={{ fontSize: "13px", fontWeight: 700, color: isConnected ? "#047857" : "#b45309" }}>
            {diagnostics?.readyState?.label || "Unknown"} ({diagnostics?.readyState?.code ?? 0})
          </div>
          <div style={{ fontSize: "10px", color: "#9ca3af" }}>
            Driver: Mongoose (Node {diagnostics?.environment || "production"})
          </div>
        </div>

        {/* Metric 3: Ping Latency */}
        <div style={{
          background: "#ffffff",
          border: "1px solid #eae2d9",
          borderRadius: "10px",
          padding: "12px 14px",
          display: "flex",
          flexDirection: "column",
          gap: "4px"
        }}>
          <div style={{ fontSize: "11px", color: "#806f62", display: "flex", alignItems: "center", gap: "5px", fontWeight: 600 }}>
            <Zap size={13} color="#7a320c" /> Ping Latency
          </div>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "#2b170d" }}>
            {diagnostics?.pingMs !== null && diagnostics?.pingMs !== undefined ? (
              <span style={{ color: diagnostics.pingMs < 100 ? "#047857" : (diagnostics.pingMs < 300 ? "#b45309" : "#dc2626") }}>
                {diagnostics.pingMs} ms
              </span>
            ) : (
              <span style={{ color: "#9ca3af" }}>N/A (Offline)</span>
            )}
          </div>
          <div style={{ fontSize: "10px", color: "#9ca3af" }}>
            {diagnostics?.serverVersion ? `Mongo v${diagnostics.serverVersion}` : "Admin DB Ping"}
          </div>
        </div>

        {/* Metric 4: Collections & Last Sync */}
        <div style={{
          background: "#ffffff",
          border: "1px solid #eae2d9",
          borderRadius: "10px",
          padding: "12px 14px",
          display: "flex",
          flexDirection: "column",
          gap: "4px"
        }}>
          <div style={{ fontSize: "11px", color: "#806f62", display: "flex", alignItems: "center", gap: "5px", fontWeight: 600 }}>
            <Layers size={13} color="#7a320c" /> Collections
          </div>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "#2b170d" }}>
            {diagnostics?.collectionsCount !== undefined ? `${diagnostics.collectionsCount} Active Collections` : "Local Sync"}
          </div>
          <div style={{ fontSize: "10px", color: "#9ca3af" }} title={diagnostics?.lastConnected || "Never"}>
            Last Connected: {diagnostics?.lastConnected ? new Date(diagnostics.lastConnected).toLocaleTimeString() : "Never"}
          </div>
        </div>
      </div>

      {/* URI Info & Config Helper */}
      <div style={{
        background: "#fbf9f6",
        border: "1px solid #eae2d9",
        borderRadius: "8px",
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "10px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: "240px" }}>
          <Key size={14} color="#7a320c" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: "11px", color: "#4b5563" }}>
            <span style={{ fontWeight: 600, color: "#2b170d" }}>Connection URI: </span>
            <code style={{
              background: "#ede5dc",
              padding: "2px 6px",
              borderRadius: "4px",
              fontFamily: "monospace",
              color: "#3b281c",
              fontSize: "11px"
            }}>
              {diagnostics?.maskedUri || "MONGODB_URI not configured"}
            </code>
          </div>
        </div>

        <button
          onClick={() => setShowTroubleshooting(!showTroubleshooting)}
          style={{
            background: "none",
            border: "none",
            color: "#7a320c",
            fontSize: "11px",
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            padding: "4px 8px",
            borderRadius: "4px"
          }}
        >
          <HelpCircle size={13} />
          <span>Troubleshooting Tips</span>
          {showTroubleshooting ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      {/* Troubleshooting Hints Drawer */}
      {showTroubleshooting && (
        <div style={{
          background: "#fdf8f3",
          border: "1px solid #f2dfce",
          borderRadius: "8px",
          padding: "14px 16px",
          fontSize: "12px",
          color: "#4b382a"
        }}>
          <div style={{ fontWeight: 700, marginBottom: "8px", color: "#7a320c", display: "flex", alignItems: "center", gap: "6px" }}>
            <Info size={14} /> Quick Troubleshooting Guide for MongoDB Connection Issues:
          </div>
          <ul style={{ margin: 0, paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "6px", lineHeight: "1.5" }}>
            <li>
              <strong>IP Access List (Network Access):</strong> Ensure <code>0.0.0.0/0</code> (Allow Access from Anywhere) is whitelisted under <em>MongoDB Atlas &gt; Network Access</em>.
            </li>
            <li>
              <strong>Database User & Password:</strong> Verify that the database user exists in <em>MongoDB Atlas &gt; Database Access</em> and has <code>readWriteAnyDatabase</code> permissions. If the password has special characters (e.g. <code>@</code>, <code>#</code>, <code>%</code>), make sure they are properly URL-encoded.
            </li>
            <li>
              <strong>Connection String Format:</strong> Use standard SRV format: <code>mongodb:// or srv format &lt;username&gt;:&lt;password&gt;@&lt;cluster-name&gt;.mongodb.net/&lt;dbname&gt;?retryWrites=true&amp;w=majority</code>.
            </li>
            <li>
              <strong>Connection Pooling:</strong> Mongoose is configured with <code>serverSelectionTimeoutMS: 15000</code>, <code>maxPoolSize: 20</code>, and <code>minPoolSize: 1</code> for cloud container reliability.
            </li>
          </ul>
        </div>
      )}

      {/* Last Five Error Logs Section */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <ShieldAlert size={16} color={lastErrors.length > 0 ? "#dc2626" : "#047857"} />
            <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#2b170d", margin: 0 }}>
              Last 5 Connection Error Logs
            </h4>
            <span style={{
              fontSize: "11px",
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: "12px",
              background: lastErrors.length > 0 ? "#fef2f2" : "#ecfdf5",
              color: lastErrors.length > 0 ? "#b91c1c" : "#047857",
              border: lastErrors.length > 0 ? "1px solid #fecaca" : "1px solid #a7f3d0"
            }}>
              {lastErrors.length} {lastErrors.length === 1 ? "Error Logged" : "Errors Logged"}
            </span>
          </div>

          {lastErrors.length > 0 && (
            <button
              onClick={handleClearErrors}
              disabled={clearing}
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#6b7280",
                background: "#ffffff",
                border: "1px solid #d1d5db",
                padding: "4px 10px",
                borderRadius: "5px",
                cursor: clearing ? "wait" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px"
              }}
              title="Clear error log history"
            >
              <Trash2 size={12} />
              <span>{clearing ? "Clearing..." : "Clear Logs"}</span>
            </button>
          )}
        </div>

        {/* Log Entries */}
        {lastErrors.length === 0 ? (
          <div style={{
            background: "#ffffff",
            border: "1px dashed #d6cfc7",
            borderRadius: "8px",
            padding: "20px",
            textAlign: "center",
            color: "#6b7280",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "6px"
          }}>
            <CheckCircle2 size={24} color="#10b981" />
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#1f2937" }}>
              No Connection Errors Recorded
            </div>
            <div style={{ fontSize: "11px", color: "#6b7280" }}>
              MongoDB driver and network connection have experienced zero dropped sockets or handshake errors.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {lastErrors.map((log, index) => (
              <div
                key={log.id || index}
                style={{
                  background: "#ffffff",
                  border: "1px solid #fca5a5",
                  borderLeft: "4px solid #dc2626",
                  borderRadius: "6px",
                  padding: "10px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                    <span style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      background: "#fee2e2",
                      color: "#991b1b",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontFamily: "monospace"
                    }}>
                      #{index + 1} {log.type || "ConnectionError"}
                    </span>
                    {log.context && (
                      <span style={{
                        fontSize: "10px",
                        background: "#f3f4f6",
                        color: "#4b5563",
                        padding: "2px 6px",
                        borderRadius: "4px"
                      }}>
                        Context: {log.context}
                      </span>
                    )}
                    {log.code && (
                      <span style={{
                        fontSize: "10px",
                        background: "#fef3c7",
                        color: "#92400e",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontWeight: 600
                      }}>
                        Code: {log.code}
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "11px", color: "#6b7280", display: "flex", alignItems: "center", gap: "4px" }} title={log.timestamp}>
                      <Clock size={11} /> {formatTimestamp(log.timestamp)}
                    </span>
                    <button
                      onClick={() => handleCopyLog(log)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: copiedId === log.id ? "#047857" : "#6b7280",
                        padding: "2px 4px",
                        display: "flex",
                        alignItems: "center",
                        gap: "2px",
                        fontSize: "10px",
                        fontWeight: 600
                      }}
                      title="Copy error details"
                    >
                      {copiedId === log.id ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedId === log.id ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                <div style={{
                  background: "#1e1e1e",
                  color: "#f87171",
                  padding: "8px 12px",
                  borderRadius: "5px",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  fontSize: "11px",
                  lineHeight: "1.4",
                  overflowX: "auto",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word"
                }}>
                  {log.message}
                </div>

                {log.details && (
                  <details style={{ fontSize: "10px", color: "#6b7280", marginTop: "2px" }}>
                    <summary style={{ cursor: "pointer", color: "#4b5563", fontWeight: 600 }}>
                      View Stack Details
                    </summary>
                    <pre style={{
                      margin: "4px 0 0",
                      padding: "6px 8px",
                      background: "#f9fafb",
                      border: "1px solid #e5e7eb",
                      borderRadius: "4px",
                      fontFamily: "monospace",
                      fontSize: "10px",
                      color: "#374151",
                      whiteSpace: "pre-wrap"
                    }}>
                      {log.details}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
export default AdminMongoStatus;
