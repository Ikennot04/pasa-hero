import express from "express";
import {
  createBusAssignment,
  getAllBusAssignments,
  getBusAssignmentById,
  updateBusAssignmentById,
} from "./bus_assignment.controller.js";

const router = express.Router();

router.get("/", getAllBusAssignments);
router.post("/", createBusAssignment);
router.get("/:id", getBusAssignmentById);
router.patch("/:id", updateBusAssignmentById);

export default router;
