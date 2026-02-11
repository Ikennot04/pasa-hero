import { BusService } from "./bus.service.js";

export const getAllBuses = async (req, res) => {
  try {
    const buses = await BusService.getAllBuses();
    res.status(200).json({ success: true, data: buses });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};