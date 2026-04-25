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
          select: "terminal_name",
        })
        .populate({
          path: "bus_id",
          select: "bus_number",
        })
        .select(
          "_id terminal_id bus_id event_type status event_time confirmation_time"
        )
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

    const formattedTerminalLogs = terminalLogs.map((terminalLog) => ({
      _id: terminalLog._id,
      terminal_name: terminalLog.terminal_id?.terminal_name ?? null,
      bus_number: terminalLog.bus_id?.bus_number ?? null,
      event_type: terminalLog.event_type,
      status: terminalLog.status,
      event_time: terminalLog.event_time,
      confirmation_time: terminalLog.confirmation_time,
    }));

    return { terminalLogs: formattedTerminalLogs, counts };
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
        path: "bus_assignment_id",
        select: "scheduled_arrival_at route_id operator_user_id",
        populate: [
          { path: "route_id", select: "route_name route_code status" },
          {
            path: "operator_user_id",
            select: "f_name l_name email role status",
          },
        ],
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
          path: "bus_assignment_id",
          select: "scheduled_arrival_at route_id operator_user_id",
          populate: [
            { path: "route_id", select: "route_name route_code status" },
            {
              path: "operator_user_id",
              select: "f_name l_name email role status",
            },
          ],
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

  // CONFIRM TERMINAL LOG BY ID =========================================================
  async confirmTerminalLogById(id, payload = {}) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const err = new Error("Invalid terminal log id.");
      err.statusCode = 400;
      throw err;
    }

    const terminalLog = await TerminalLog.findById(id);
    if (!terminalLog) {
      const err = new Error("Terminal log not found.");
      err.statusCode = 404;
      throw err;
    }

    if (terminalLog.status === "rejected") {
      const err = new Error("Rejected terminal logs cannot be confirmed.");
      err.statusCode = 400;
      throw err;
    }

    if (terminalLog.status === "confirmed") {
      const err = new Error("Terminal log already confirmed.");
      err.statusCode = 400;
      throw err;
    }

    const updateData = {
      status: "confirmed",
      confirmation_time: new Date(),
    };

    if (payload.confirmed_by) {
      if (!mongoose.Types.ObjectId.isValid(payload.confirmed_by)) {
        const err = new Error("Invalid confirmed_by id.");
        err.statusCode = 400;
        throw err;
      }
      updateData.confirmed_by = payload.confirmed_by;
    }

    const updated = await TerminalLog.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )

    return updated;
  },

  // REJECT TERMINAL LOG BY ID =========================================================
  async rejectTerminalLogById(id, payload = {}) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const err = new Error("Invalid terminal log id.");
      err.statusCode = 400;
      throw err;
    }

    const terminalLog = await TerminalLog.findById(id);
    if (!terminalLog) {
      const err = new Error("Terminal log not found.");
      err.statusCode = 404;
      throw err;
    }

    if (!["arrival", "departure"].includes(terminalLog.event_type)) {
      const err = new Error("Only arrival or departure logs can be rejected.");
      err.statusCode = 400;
      throw err;
    }

    if (terminalLog.status === "confirmed") {
      const err = new Error("Confirmed terminal logs cannot be rejected.");
      err.statusCode = 400;
      throw err;
    }

    if (terminalLog.status === "rejected") {
      const err = new Error("Terminal log already rejected.");
      err.statusCode = 400;
      throw err;
    }

    const updateData = {
      status: "rejected",
      confirmation_time: new Date(),
    };

    if (payload.confirmed_by) {
      if (!mongoose.Types.ObjectId.isValid(payload.confirmed_by)) {
        const err = new Error("Invalid confirmed_by id.");
        err.statusCode = 400;
        throw err;
      }
      updateData.confirmed_by = payload.confirmed_by;
    }

    const updated = await TerminalLog.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    return updated;
  },

  // DELETE TERMINAL LOG BY ID ==========================================================
  async deleteTerminalLogById(id) {
    const terminalLog = await TerminalLog.findByIdAndDelete(id);
    return terminalLog;
  },
};
