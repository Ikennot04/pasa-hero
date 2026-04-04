import express from "express";
import { getAllSystemLogs } from "./system_log.controller.js";

const router = express.Router();

router.get("/", getAllSystemLogs);

export default router;
