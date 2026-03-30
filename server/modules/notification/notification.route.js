import express from "express";
import { addNotification } from "./notification.controller.js";

const router = express.Router();

router.post("/", addNotification);

export default router;
