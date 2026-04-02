import express from "express";
import { listCurrentUserSubscriptions } from "./user_subscription.controller.js";

const router = express.Router();

router.get("/", listCurrentUserSubscriptions);

export default router;
