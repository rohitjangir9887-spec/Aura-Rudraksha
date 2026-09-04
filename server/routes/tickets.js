import express from "express";
import { getTickets, createTicket, updateTicket } from "../controllers/settingController.js";
import { requireAdmin, optionalAuth } from "../middleware/auth.js";

const router = express.Router();

router.route("/")
  .get(requireAdmin, getTickets)
  .post(optionalAuth, createTicket);

router.route("/:id")
  .put(requireAdmin, updateTicket);

export default router;

