import { BusAssignmentService } from "./bus_assignment.service.js";

export const getAllBusAssignments = async (req, res) => {
  try {
    const assignments = await BusAssignmentService.getAllBusAssignments();
    res.status(200).json({ success: true, data: assignments });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getPendingBusAssignmentsByOperatorUserId = async (req, res) => {
  try {
    const { operatorUserId } = req.params;
    const assignments =
      await BusAssignmentService.getPendingBusAssignmentsByOperatorUserId(
        operatorUserId,
      );
    res.status(200).json({ success: true, data: assignments });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

export const getAvailableAssignmentResourcesByTerminalId = async (req, res) => {
  try {
    const { terminalId } = req.params;
    const resources =
      await BusAssignmentService.getAvailableAssignmentResourcesByTerminalId(
        terminalId,
      );
    res.status(200).json({ success: true, data: resources });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

export const getMyBusAssignment = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }
    if (req.user.role !== "operator") {
      return res.status(403).json({
        success: false,
        message: "Only operators can access this resource.",
      });
    }
    const assignment =
      await BusAssignmentService.getCurrentBusAssignmentForOperatorUserId(
        req.user._id,
      );
    res.status(200).json({ success: true, data: assignment });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

export const getBusAssignmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const assignment = await BusAssignmentService.getBusAssignmentById(id);
    res.status(200).json({ success: true, data: assignment });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

export const updateBusAssignmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const assignment = await BusAssignmentService.updateBusAssignmentById(
      id,
      updateData,
    );
    res.status(200).json({ success: true, data: assignment });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

export const createBusAssignment = async (req, res) => {
  try {
    const busAssignmentData = req.body;
    const busAssignment = await BusAssignmentService.createBusAssignment(
      busAssignmentData,
      { actorUserId: req.user?._id ?? null },
    );
    res.status(201).json({ success: true, data: busAssignment });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

export const deleteBusAssignmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const assignment = await BusAssignmentService.deleteBusAssignmentById(id, {
      actorUserId: req.user?._id ?? null,
    });
    res.status(200).json({ success: true, data: assignment });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};
