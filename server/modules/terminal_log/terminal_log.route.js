import express from "express";
import {
  getAllTerminalLogs,
  getTerminalLogsByTerminalId,
  getTerminalLogById,
  createTerminalLog,
  confirmTerminalLogById,
  rejectTerminalLogById,
  deleteTerminalLogById,
} from "./terminal_log.controller.js";

const router = express.Router();

router.get("/", getAllTerminalLogs);
router.get("/terminal/:terminalId", getTerminalLogsByTerminalId);
router.get("/:id", getTerminalLogById);
router.post("/", createTerminalLog);
router.patch("/:id/confirm", confirmTerminalLogById);
router.patch("/:id/reject", rejectTerminalLogById);
router.delete("/:id", deleteTerminalLogById);

export default router;
