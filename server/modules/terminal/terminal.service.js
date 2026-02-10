import Terminal from "./terminal.model.js"; // Model

export const TerminalService = {
  // GET ALL TERMINALS ===================================================================
  async getAllTerminals() {
    const terminals = await Terminal.find();
    return terminals;
  },
};