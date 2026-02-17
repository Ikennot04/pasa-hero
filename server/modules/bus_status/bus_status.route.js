import express from "express";
import { createBusStatus } from "./bus_status.controller.js";

const router = express.Router();

router.post("/", createBusStatus);

export default router;
