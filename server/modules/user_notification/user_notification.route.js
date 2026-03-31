import express from "express";
import { listCurrentUserNotifications } from "./user_notification.controller.js";

const router = express.Router();

router.get("/", listCurrentUserNotifications);

export default router;
