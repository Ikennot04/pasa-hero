import Bus from "./bus.model.js";

export const BusService = {
  // GET ALL BUSES ===================================================================
  async getAllBuses() {
    const buses = await Bus.find();
    return buses;
  },
};
