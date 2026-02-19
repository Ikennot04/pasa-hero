import express from "express";
import { createBusStatus, updateBusStatusById } from "./bus_status.controller.js";

const router = express.Router();

router.post("/", createBusStatus);
router.patch("/:id", updateBusStatusById);

export default router;
