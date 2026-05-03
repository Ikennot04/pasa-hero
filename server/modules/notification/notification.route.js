import express from "express";
import {
  addNotification,
  bulkDeleteNotifications,
  listNotifications,
  listNotificationsByTerminal,
  listLatestNotificationsByTerminal,
  listUserInboxNotifications,
} from "./notification.controller.js";

const router = express.Router();

router.get("/", listNotifications);
router.get("/inbox/:userId", listUserInboxNotifications);
router.get("/latest/:terminalId", listLatestNotificationsByTerminal);
router.get("/terminal/:terminalId", listNotificationsByTerminal);
router.post("/", addNotification);
router.delete("/bulk", bulkDeleteNotifications);

export default router;
