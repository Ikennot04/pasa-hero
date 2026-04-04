import express from "express";
import {
  getAllSystemLogs,
  getSystemLogById,
  createSystemLog,
} from "./system_log.controller.js";

const router = express.Router();

router.get("/", getAllSystemLogs);
router.get("/:id", getSystemLogById);
router.post("/", createSystemLog);

export default router;
