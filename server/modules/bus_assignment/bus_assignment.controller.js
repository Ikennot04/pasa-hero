import { BusAssignmentService } from "./bus_assignment.service.js";

export const createBusAssignment = async (req, res) => {
  try {
    const busAssignmentData = req.body;
    const busAssignment =
      await BusAssignmentService.createBusAssignment(busAssignmentData);
    res.status(201).json({ success: true, data: busAssignment });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};
