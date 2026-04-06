import express from "express";
import {
  getAllTerminals,
  createTerminal,
  getTerminalById,
  updateTerminalById,
  getTerminalOperationalSummary,
} from "./terminal.controller.js";

const router = express.Router();

router.get('/', getAllTerminals);
router.post('/', createTerminal);
router.get('/:id/operational-summary', getTerminalOperationalSummary);
router.get('/:id', getTerminalById);
router.patch('/:id', updateTerminalById);

export default router;  