import express from "express";
import { getAllRoutes, createRoute, getRouteById, updateRouteById } from "./route.controller.js";

const router = express.Router();

router.get('/', getAllRoutes);
router.post('/', createRoute);
router.get('/:id', getRouteById);
router.patch('/:id', updateRouteById);

export default router;