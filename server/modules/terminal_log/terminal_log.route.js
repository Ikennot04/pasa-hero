import express from "express";
import { getAllTerminalLogs, createTerminalLog } from "./terminal_log.controller.js";

const router = express.Router();

router.get("/", getAllTerminalLogs);
router.post("/", createTerminalLog);

export default router;
