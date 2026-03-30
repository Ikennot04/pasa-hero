import express from "express";
import { addNotification, listNotifications } from "./notification.controller.js";

const router = express.Router();

router.get("/", listNotifications);
router.post("/", addNotification);

export default router;
