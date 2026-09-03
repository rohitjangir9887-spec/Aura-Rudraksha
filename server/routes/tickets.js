import express from "express";
import { getTickets, createTicket, updateTicket } from "../controllers/settingController.js";
import { optionalAuth } from "../middleware/auth.js";

const router = express.Router();

router.route("/")
  .get(optionalAuth, getTickets)
  .post(optionalAuth, createTicket);

router.route("/:id")
  .put(optionalAuth, updateTicket);

export default router;

