import express from "express";
import {
  getAllSystemLogs,
  getSystemLogsByUserId,
  getSystemLogById,
  createSystemLog,
  deleteManySystemLogs,
} from "./system_log.controller.js";

const router = express.Router();

router.get("/", getAllSystemLogs);
router.get("/user/:userId", getSystemLogsByUserId);
router.post("/", createSystemLog);
router.post("/bulk-delete", deleteManySystemLogs);
router.get("/:id", getSystemLogById);

export default router;
