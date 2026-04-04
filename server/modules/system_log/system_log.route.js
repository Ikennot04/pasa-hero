import express from "express";
import {
  getAllSystemLogs,
  getSystemLogById,
  createSystemLog,
  deleteManySystemLogs,
} from "./system_log.controller.js";

const router = express.Router();

router.get("/", getAllSystemLogs);
router.post("/", createSystemLog);
router.post("/bulk-delete", deleteManySystemLogs);
router.get("/:id", getSystemLogById);

export default router;
