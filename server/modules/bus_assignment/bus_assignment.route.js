import express from "express";
import { attachAuthUser } from "../../middlewear/auth.middleware.js";
import {
  createBusAssignment,
  deleteBusAssignmentById,
  getAllBusAssignments,
  getAvailableAssignmentResourcesByTerminalId,
  getBusAssignmentById,
  getMyBusAssignment,
  getPendingBusAssignmentsByOperatorUserId,
  updateBusAssignmentById,
} from "./bus_assignment.controller.js";

const router = express.Router();

router.get("/", getAllBusAssignments);
router.get("/available/terminal/:terminalId", getAvailableAssignmentResourcesByTerminalId);
router.get(
  "/pending/operator/:operatorUserId",
  getPendingBusAssignmentsByOperatorUserId,
);
router.get("/me", attachAuthUser, getMyBusAssignment);
router.post("/", attachAuthUser, createBusAssignment);
router.get("/:id", getBusAssignmentById);
router.patch("/:id", attachAuthUser, updateBusAssignmentById);
router.delete("/:id", attachAuthUser, deleteBusAssignmentById);

export default router;
