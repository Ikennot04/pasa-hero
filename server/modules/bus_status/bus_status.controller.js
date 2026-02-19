import { BusStatusService } from "./bus_status.service.js";

export const createBusStatus = async (req, res) => {
  try {
    const statusData = req.body;
    const status = await BusStatusService.createBusStatus(statusData);
    res.status(201).json({ success: true, data: status });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

export const updateBusStatusById = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const status = await BusStatusService.updateBusStatusById(id, updateData);
    res.status(200).json({ success: true, data: status });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};
