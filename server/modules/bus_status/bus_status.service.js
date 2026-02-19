import BusStatus from "./bus_status.model.js";
import Bus from "../bus/bus.model.js";

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
