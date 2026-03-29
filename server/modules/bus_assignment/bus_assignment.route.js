import express from "express";
import {
  createBusAssignment,
  deleteBusAssignmentById,
  getAllBusAssignments,
  getBusAssignmentById,
  updateBusAssignmentById,
} from "./bus_assignment.controller.js";

const router = express.Router();

router.get("/", getAllBusAssignments);
router.post("/", createBusAssignment);
router.get("/:id", getBusAssignmentById);
router.patch("/:id", updateBusAssignmentById);
router.delete("/:id", deleteBusAssignmentById);

export default router;
