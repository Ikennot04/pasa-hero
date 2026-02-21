import express from "express";
import { createBusStatus, getBusStatusById, updateBusStatusById } from "./bus_status.controller.js";

const router = express.Router();

router.post("/", createBusStatus);
router.get("/:id", getBusStatusById);
router.patch("/:id", updateBusStatusById);

export default router;
