import express from "express";
import {
  addNotification,
  listNotifications,
  listNotificationsByTerminal,
  listTodaysNotificationsByTerminal,
  listUserInboxNotifications,
} from "./notification.controller.js";

const router = express.Router();

router.get("/", listNotifications);
router.get("/inbox/:userId", listUserInboxNotifications);
router.get("/today/:terminalId", listTodaysNotificationsByTerminal);
router.get("/terminal/:terminalId", listNotificationsByTerminal);
router.post("/", addNotification);

export default router;
