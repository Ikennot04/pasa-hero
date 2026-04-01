import express from "express";
import {
  listCurrentUserNotifications,
  markCurrentUserNotificationsAsRead,
  deleteCurrentUserNotificationById,
} from "./user_notification.controller.js";

const router = express.Router();

router.get("/", listCurrentUserNotifications);
router.patch("/read", markCurrentUserNotificationsAsRead);
router.delete("/:id", deleteCurrentUserNotificationById);

export default router;
