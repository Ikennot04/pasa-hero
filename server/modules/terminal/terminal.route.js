import express from "express";
import {
  getAllTerminals,
  createTerminal,
  getTerminalById,
  updateTerminalById,
  getTerminalOperationalSummary,
  getPendingConfirmationsByTerminalId,
  getTerminalBusOperationalListByTerminalId,
  getTerminalManagement,
  getAllTerminalNames,
} from "./terminal.controller.js";

const router = express.Router();

router.get('/', getAllTerminals);
router.post('/', createTerminal);
router.get('/terminal-names', getAllTerminalNames);
router.get('/:id/operational-summary', getTerminalOperationalSummary);
router.get('/:id/terminal-management', getTerminalManagement);
router.get('/:id/pending-confirmations', getPendingConfirmationsByTerminalId);
router.get('/:id/buses-present', getTerminalBusOperationalListByTerminalId);
router.get('/:id', getTerminalById);
router.patch('/:id', updateTerminalById);

export default router;  