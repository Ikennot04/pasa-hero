import express from "express";
import { getAllBuses } from "./bus.controller.js";

const router = express.Router();

router.get('/', getAllBuses);

export default router;