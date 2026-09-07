import express from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

router.get("/whoami", requireAuth, (req, res) => {
  return res.json({
    success: true,
    authUserId: req.user.authUserId,
    username: req.user.username,
    email: req.user.email
  });
});

/**
 * GET /api/auth/admin-me
 * Authoritative server-side admin verification endpoint.
 * Protected by requireAdmin middleware:
 *   1. Verifies Firebase ID token (401 if missing/invalid/expired)
 *   2. Verifies initial admin (matching INITIAL_ADMIN_EMAIL/PHONE) OR Customer record with role === "admin"
 *   3. If valid admin: returns 200 OK with verified user identity
 *   4. If not valid admin: returns 403 Forbidden
 */
router.get("/admin-me", requireAdmin, (req, res) => {
  return res.json({
    success: true,
    authorized: true,
    role: "admin",
    user: {
      authUserId: req.user.authUserId,
      email: req.user.email || "",
      phone: req.user.phone || "",
      name: req.user.name || "Aura Admin",
      picture: req.user.picture || ""
    }
  });
});

export default router;

