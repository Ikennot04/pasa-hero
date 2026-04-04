import express from "express";
import {
  getAllSystemLogs,
  getSystemLogById,
} from "./system_log.controller.js";

const router = express.Router();

router.get("/", getAllSystemLogs);
router.get("/:id", getSystemLogById);

export default router;
