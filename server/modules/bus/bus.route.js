import express from "express";
import { getAllBuses, getBusById, createBus, updateBusById, deleteBusById } from "./bus.controller.js";

const router = express.Router();

router.get('/', getAllBuses);
router.get('/:id', getBusById);
router.post('/', createBus);
router.patch('/:id', updateBusById);
router.delete('/:id', deleteBusById);

export default router;