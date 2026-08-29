import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { getAddresses, addAddress, updateAddress, deleteAddress } from "../controllers/customerController.js";

const router = express.Router();

router.use(requireAuth);

router.route("/")
  .get(getAddresses)
  .post(addAddress);

router.route("/:id")
  .put(updateAddress)
  .delete(deleteAddress);

export default router;
