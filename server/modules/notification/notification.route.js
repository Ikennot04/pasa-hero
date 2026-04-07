import express from "express";
import {
  addNotification,
  listNotifications,
  listTodaysNotificationsByTerminal,
} from "./notification.controller.js";

const router = express.Router();

router.get("/", listNotifications);
router.get("/today/:terminalId", listTodaysNotificationsByTerminal);
router.post("/", addNotification);

export default router;
