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

export const getBusStatusById = async (req, res) => {
  try {
    const { id } = req.params;
    const status = await BusStatusService.getBusStatusById(id);
    res.status(200).json({ success: true, data: status });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

export const getBusStatusesByTerminalId = async (req, res) => {
  try {
    const { terminalId } = req.params;
    const { busStatuses, counts } =
      await BusStatusService.getBusStatusesByTerminalId(terminalId);

    res.status(200).json({
      success: true,
      counts,
      data: busStatuses,
    });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

export const updateBusStatusById = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const status = await BusStatusService.updateBusStatusById(id, updateData, {
      senderUserId: req.user?._id ?? null,
    });
    res.status(200).json({ success: true, data: status });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};
