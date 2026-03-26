import express from "express";
import { getAllTerminalLogs } from "./terminal_log.controller.js";

const router = express.Router();

router.get("/", getAllTerminalLogs);

export default router;
