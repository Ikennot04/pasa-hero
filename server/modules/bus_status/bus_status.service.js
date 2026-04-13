import BusStatus from "./bus_status.model.js";
import Bus from "../bus/bus.model.js";
import mongoose from "mongoose";
import Terminal from "../terminal/terminal.model.js";
import TerminalLog from "../terminal_log/terminal_log.model.js";

export const BusStatusService = {
  // CREATE BUS STATUS ===================================================================
  async createBusStatus(statusData) {
    const bus = await Bus.findOne({ _id: statusData.bus_id, is_deleted: false });
    if (!bus) {
      const error = new Error("Bus not found.");
      error.statusCode = 404;
      throw error;
    }

    const status = await BusStatus.create(statusData);
    return status;
  },

  // GET BUS STATUS BY ID =================================================================
  async getBusStatusById(id) {
    const status = await BusStatus.findOne({
      _id: id,
      is_deleted: false,
    });
    if (!status) {
      const error = new Error("Bus status not found.");
      error.statusCode = 404;
      throw error;
    }
    return status;
  },

  // GET ALL BUS STATUSES BY TERMINAL ID ==========================================================
  async getBusStatusesByTerminalId(terminalId) {
    if (!mongoose.Types.ObjectId.isValid(terminalId)) {
      const error = new Error("Invalid terminal id.");
      error.statusCode = 400;
      throw error;
    }

    const terminal = await Terminal.findById(terminalId).select(
      "_id terminal_name",
    );
    if (!terminal) {
      const error = new Error("Terminal not found.");
      error.statusCode = 404;
      throw error;
    }

    const busIds = await TerminalLog.distinct("bus_id", {
      terminal_id: terminalId,
    });

    if (busIds.length === 0) {
      return { terminal, busStatuses: [] };
    }

    const busStatuses = await BusStatus.find({
      bus_id: { $in: busIds.map((id) => String(id)) },
      is_deleted: false,
    }).sort({ updatedAt: -1 });

    return { terminal, busStatuses };
  },

  // UPDATE BUS STATUS BY ID =============================================================
  async updateBusStatusById(id, updateData) {
    const status = await BusStatus.findOne({
      _id: id,
      is_deleted: false,
    });
    if (!status) {
      const error = new Error("Bus status not found.");
      error.statusCode = 404;
      throw error;
    }

    const allowed = [
      "occupancy_count",
      "occupancy_status",
      "delay_minutes",
      "is_skipping_stops",
    ];
    const filtered = Object.fromEntries(
      Object.entries(updateData).filter(([k]) => allowed.includes(k))
    );

    const updated = await BusStatus.findByIdAndUpdate(
      id,
      { $set: filtered },
      { new: true, runValidators: true }
    );
    return updated;
  },
};
