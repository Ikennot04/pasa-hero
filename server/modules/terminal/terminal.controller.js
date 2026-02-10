import { TerminalService } from "./terminal.service.js";

export const getAllTerminals = async (req, res) => {
  try {
    const terminals = await TerminalService.getAllTerminals();
    res.status(200).json({ success: true, data: terminals });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};