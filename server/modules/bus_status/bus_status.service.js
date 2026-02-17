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
};
