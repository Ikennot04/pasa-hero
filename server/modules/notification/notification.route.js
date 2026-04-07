import express from "express";
import {
  addNotification,
  getOperationNotificationCountsByTerminal,
  listNotifications,
} from "./notification.controller.js";

const router = express.Router();

router.get(
  "/terminal/:terminalId/operation-counts",
  getOperationNotificationCountsByTerminal,
);
router.get("/", listNotifications);
router.post("/", addNotification);

export default router;
