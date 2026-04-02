import express from "express";
import {
  listCurrentUserNotifications,
  markCurrentUserNotificationsAsRead,
  deleteCurrentUserNotificationById,
  deleteAllReadUserNotifications,
} from "./user_notification.controller.js";

const router = express.Router();

router.get("/", listCurrentUserNotifications);
router.patch("/read", markCurrentUserNotificationsAsRead);
router.delete("/read", deleteAllReadUserNotifications);
router.delete("/:id", deleteCurrentUserNotificationById);

export default router;
