import express from "express";
import {
  getCustomers,
  getCustomerById,
  saveCustomer,
  updateCustomer,
  getCustomerMe,
  updateCustomerMe
} from "../controllers/customerController.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

router.route("/me")
  .get(requireAuth, getCustomerMe)
  .put(requireAuth, updateCustomerMe);

router.route("/")
  .get(requireAdmin, getCustomers)
  .post(requireAdmin, saveCustomer);

router.route("/:id")
  .get(requireAdmin, getCustomerById)
  .put(requireAdmin, updateCustomer);

export default router;
