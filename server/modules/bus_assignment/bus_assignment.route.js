import express from "express";
import {
  createBusAssignment,
  getAllBusAssignments,
} from "./bus_assignment.controller.js";

const router = express.Router();

router.get("/", getAllBusAssignments);
router.post("/", createBusAssignment);

export default router;
