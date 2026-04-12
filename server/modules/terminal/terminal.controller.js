import { TerminalService } from "./terminal.service.js";

export const getTerminalOperationalSummary = async (req, res) => {
  try {
    const { id } = req.params;
    const date = typeof req.query.date === "string" ? req.query.date : undefined;
    const data = await TerminalService.getTerminalOperationalSummary(id, { date });
    res.status(200).json({ success: true, data });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

export const getPendingConfirmationsByTerminalId = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await TerminalService.getPendingConfirmationsByTerminalId(id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

export const getTerminalBusOperationalListByTerminalId = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await TerminalService.getTerminalBusOperationalListByTerminalId(id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

export const getTerminalManagement = async (req, res) => {
  try {
    const { id } = req.params;
    const date = typeof req.query.date === "string" ? req.query.date : undefined;
    const data = await TerminalService.getTerminalManagement(id, { date });
    res.status(200).json({ success: true, data });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

export const getAllTerminals = async (req, res) => {
  try {
    const terminals = await TerminalService.getAllTerminals();
    res.status(200).json({ success: true, data: terminals });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const createTerminal = async (req, res) => {
  try {
    const terminalData = req.body;
    const terminal = await TerminalService.createTerminal(terminalData);
    res.status(201).json({ success: true, data: terminal });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getTerminalById = async (req, res) => {
  try {
    const terminalId = req.params.id;
    const terminal = await TerminalService.getTerminalById(terminalId);
    res.status(200).json({ success: true, data: terminal });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateTerminalById = async (req, res) => {
  try {
    const terminalId = req.params.id;
    const updateData = req.body;
    const terminal = await TerminalService.updateTerminalById(terminalId, updateData);
    res.status(200).json({ success: true, data: terminal });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};