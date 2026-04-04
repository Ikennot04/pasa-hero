import express from "express";
import {
  getUserSubscriptionById,
  listCurrentUserSubscriptions,
} from "./user_subscription.controller.js";

const router = express.Router();

router.get("/", listCurrentUserSubscriptions);
router.get("/:id", getUserSubscriptionById);

export default router;
