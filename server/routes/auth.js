import express from "express";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/whoami", requireAuth, (req, res) => {
  return res.json({
    success: true,
    authUserId: req.user.authUserId,
    username: req.user.username,
    email: req.user.email
  });
});

export default router;
