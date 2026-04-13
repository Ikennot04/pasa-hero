import mongoose from "mongoose";
import TerminalLog from "./terminal_log.model.js";
import BusAssignment from "../bus_assignment/bus_assignment.model.js";
import Terminal from "../terminal/terminal.model.js";

export const TerminalLogService = {
  // GET ALL TERMINAL LOGS =============================================================
  async getAllTerminalLogs() {
    const [terminalLogs, statusAgg] = await Promise.all([
      TerminalLog.find()
        .populate({
          path: "terminal_id",
          select: "terminal_name location_lat location_lng status",
        })
        .populate({
          path: "bus_id",
          select: "bus_number plate_number capacity status",
        })
        .populate({
          path: "reported_by",
          select: "f_name l_name email role status",
        })
        .populate({
          path: "confirmed_by",
          select: "f_name l_name email role status",
        })
        .sort({ createdAt: -1 }),
      TerminalLog.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    const byStatus = { pending: 0, confirmed: 0, rejected: 0 };
    for (const row of statusAgg) {
      if (row._id && Object.prototype.hasOwnProperty.call(byStatus, row._id)) {
        byStatus[row._id] = row.count;
      }
    }

    const counts = {
      totalEvents:
        byStatus.pending + byStatus.confirmed + byStatus.rejected,
      confirmed: byStatus.confirmed,
      pending: byStatus.pending,
      rejected: byStatus.rejected,
    };

    return { terminalLogs, counts };
  },

  // GET TERMINAL LOG BY ID ============================================================
  async getTerminalLogById(id) {
    const terminalLog = await TerminalLog.findById(id)
      .populate({
        path: "terminal_id",
        select: "terminal_name location_lat location_lng status",
      })
      .populate({
        path: "bus_id",
        select: "bus_number plate_number capacity status",
      })
      .populate({
        path: "reported_by",
        select: "f_name l_name email role status",
      })
      .populate({
        path: "confirmed_by",
        select: "f_name l_name email role status",
      });

    return terminalLog;
  },

  // GET TERMINAL LOGS BY TERMINAL ID ===================================================
  async getTerminalLogsByTerminalId(terminalId) {
    if (!mongoose.Types.ObjectId.isValid(terminalId)) {
      const err = new Error("Invalid terminal id.");
      err.statusCode = 400;
      throw err;
    }

    const terminal = await Terminal.findById(terminalId).select("_id");
    if (!terminal) {
      const err = new Error("Terminal not found.");
      err.statusCode = 404;
      throw err;
    }

    const terminalObjectId = new mongoose.Types.ObjectId(terminalId);

    const [terminalLogs, statusAgg] = await Promise.all([
      TerminalLog.find({ terminal_id: terminalId })
        .populate({
          path: "terminal_id",
          select: "terminal_name location_lat location_lng status",
        })
        .populate({
          path: "bus_id",
          select: "bus_number plate_number capacity status",
        })
        .populate({
          path: "reported_by",
          select: "f_name l_name email role status",
        })
        .populate({
          path: "confirmed_by",
          select: "f_name l_name email role status",
        })
        .sort({ createdAt: -1 }),
      TerminalLog.aggregate([
        { $match: { terminal_id: terminalObjectId } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    const byStatus = { pending: 0, confirmed: 0, rejected: 0 };
    for (const row of statusAgg) {
      if (row._id && Object.prototype.hasOwnProperty.call(byStatus, row._id)) {
        byStatus[row._id] = row.count;
      }
    }

    const counts = {
      totalEvents:
        byStatus.pending + byStatus.confirmed + byStatus.rejected,
      confirmed: byStatus.confirmed,
      pending: byStatus.pending,
      rejected: byStatus.rejected,
    };

    return { terminalLogs, counts };
  },

  // CREATE TERMINAL LOG ===============================================================
  async createTerminalLog(terminalLogData) {
    const terminalLog = await TerminalLog.create(terminalLogData);

    await BusAssignment.findByIdAndUpdate(terminalLog.bus_assignment_id, {
      latest_terminal_log_id: terminalLog._id,
    });

    return terminalLog;
  },

  // DELETE TERMINAL LOG BY ID ==========================================================
  async deleteTerminalLogById(id) {
    const terminalLog = await TerminalLog.findByIdAndDelete(id);
    return terminalLog;
  },
};
