import express from "express";
import {
  getUserSubscriptionById,
  listCurrentUserSubscriptions,
  subscribeToRouteOrBus,
} from "./user_subscription.controller.js";

const router = express.Router();

router.post("/", subscribeToRouteOrBus);
router.get("/", listCurrentUserSubscriptions);
router.get("/:id", getUserSubscriptionById);

export default router;
