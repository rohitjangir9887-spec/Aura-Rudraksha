import express from "express";
import { getDbDiagnostics, testDbConnection, clearDbErrorLogs } from "../config/db.js";
import { requireAdmin } from "../middleware/auth.js";

const router = express.Router();

/**
 * GET /api/admin/db-status
 * Returns full MongoDB connection state, metrics, configuration status, and last 5 error logs.
 */
router.get("/", requireAdmin, async (req, res) => {
  try {
    const diagnostics = await getDbDiagnostics();
    return res.json({
      success: true,
      data: diagnostics
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch database diagnostics"
    });
  }
});

/**
 * POST /api/admin/db-status/test
 * Triggers a live reconnection/ping test and returns diagnostic output.
 */
router.post("/test", requireAdmin, async (req, res) => {
  try {
    const result = await testDbConnection();
    return res.json({
      success: result.success,
      message: result.message,
      durationMs: result.durationMs,
      data: result.diagnostics
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Database connection test failed"
    });
  }
});

/**
 * POST /api/admin/db-status/clear-errors
 * Clears in-memory error logs buffer after resolution.
 */
router.post("/clear-errors", requireAdmin, async (req, res) => {
  try {
    clearDbErrorLogs();
    const diagnostics = await getDbDiagnostics();
    return res.json({
      success: true,
      message: "Database connection error logs cleared.",
      data: diagnostics
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to clear error logs"
    });
  }
});

export default router;
