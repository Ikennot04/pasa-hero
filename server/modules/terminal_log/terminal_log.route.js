import express from "express";
import {
  getAllTerminalLogs,
  getTerminalLogById,
  createTerminalLog,
  deleteTerminalLogById,
} from "./terminal_log.controller.js";

const router = express.Router();

router.get("/", getAllTerminalLogs);
router.get("/:id", getTerminalLogById);
router.post("/", createTerminalLog);
router.delete("/:id", deleteTerminalLogById);

export default router;
