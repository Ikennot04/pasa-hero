import express from "express";
import {
  listCurrentUserNotifications,
  markCurrentUserNotificationsAsRead,
} from "./user_notification.controller.js";

const router = express.Router();

router.get("/", listCurrentUserNotifications);
router.patch("/read", markCurrentUserNotificationsAsRead);

export default router;
