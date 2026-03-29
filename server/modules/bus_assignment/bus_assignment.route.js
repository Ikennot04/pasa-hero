import express from "express";
import { createBusAssignment } from "./bus_assignment.controller.js";

const router = express.Router();

router.post("/", createBusAssignment);

export default router;
