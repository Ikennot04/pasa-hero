import express from "express";
import { attachAuthUser } from "../../middlewear/auth.middleware.js";
import {
  createBusStatus,
  getBusStatusById,
  getBusStatusesByTerminalId,
  updateBusStatusById,
} from "./bus_status.controller.js";

const router = express.Router();

router.post("/", createBusStatus);
router.get("/terminal/:terminalId", getBusStatusesByTerminalId);
router.get("/:id", getBusStatusById);
router.patch("/:id", attachAuthUser, updateBusStatusById);

export default router;
