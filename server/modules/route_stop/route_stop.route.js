import express from "express";
import { createRouteStop } from "./route_stop.controller.js";

const router = express.Router();

router.post("/", createRouteStop);

export default router;
