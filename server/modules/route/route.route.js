import express from "express";
import {
  getAllRoutes,
  getRoutesByTerminalId,
  createRoute,
  getRouteById,
  updateRouteById,
  softDeleteRouteById,
} from "./route.controller.js";

const router = express.Router();

router.get('/', getAllRoutes);
router.get('/terminal/:terminalId', getRoutesByTerminalId);
router.post('/', createRoute);
router.get('/:id', getRouteById);
router.patch('/:id', updateRouteById);
router.delete('/:id', softDeleteRouteById);

export default router;