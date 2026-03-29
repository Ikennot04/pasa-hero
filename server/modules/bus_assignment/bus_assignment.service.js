import BusAssignment from "./bus_assignment.model.js";

function populateBusAssignmentRefs(query) {
  return query
    .populate({
      path: "bus_id",
      select: "bus_number plate_number capacity status",
    })
    .populate({
      path: "driver_id",
      select: "f_name l_name",
    })
    .populate({
      path: "operator_user_id",
      select: "f_name l_name",
    })
    .populate({
      path: "route_id",
      select: "route_name route_code",
    })
    .populate({
      path: "latest_terminal_log_id",
      select: "terminal_id bus_id",
    });
}

export const BusAssignmentService = {
  // GET ALL BUS ASSIGNMENTS ===================================================================
  async getAllBusAssignments() {
    const assignments = await populateBusAssignmentRefs(
      BusAssignment.find(),
    ).sort({ createdAt: -1 });
    return assignments;
  },

  // GET BUS ASSIGNMENT BY ID ===================================================================
  async getBusAssignmentById(id) {
    const assignment = await populateBusAssignmentRefs(
      BusAssignment.findById(id),
    );
    if (!assignment) {
      const error = new Error("Bus assignment not found.");
      error.statusCode = 404;
      throw error;
    }
    return assignment;
  },

  // CREATE BUS ASSIGNMENT ===================================================================
  async createBusAssignment(busAssignmentData) {
    const { bus_id, driver_id, operator_user_id, route_id } = busAssignmentData;

    const [
      activeBusAssignment,
      activeDriverAssignment,
      activeOperatorAssignment,
    ] = await Promise.all([
      BusAssignment.findOne({
        bus_id,
        assignment_status: "active",
        assignment_result: "pending",
      }),
      BusAssignment.findOne({
        driver_id,
        assignment_status: "active",
        assignment_result: "pending",
      }),
      BusAssignment.findOne({
        operator_user_id,
        assignment_status: "active",
        assignment_result: "pending",
      }),
    ]);

    if (activeBusAssignment) {
      const error = new Error("This bus already has an active assignment.");
      error.statusCode = 409;
      throw error;
    }

    if (activeDriverAssignment) {
      const error = new Error("This driver already has an active assignment.");
      error.statusCode = 409;
      throw error;
    }

    if (activeOperatorAssignment) {
      const error = new Error(
        "This operator already has an active assignment.",
      );
      error.statusCode = 409;
      throw error;
    }

    const busAssignment = await BusAssignment.create(busAssignmentData);

    return busAssignment;
  },

  // UPDATE BUS ASSIGNMENT BY ID ===================================================================
  async updateBusAssignmentById(id, updateData) {
    const existing = await BusAssignment.findById(id);
    if (!existing) {
      const error = new Error("Bus assignment not found.");
      error.statusCode = 404;
      throw error;
    }

    const allowed = {};
    if (Object.prototype.hasOwnProperty.call(updateData, "assignment_status")) {
      allowed.assignment_status = updateData.assignment_status;
    }
    if (Object.prototype.hasOwnProperty.call(updateData, "assignment_result")) {
      allowed.assignment_result = updateData.assignment_result;
    }
    if (Object.prototype.hasOwnProperty.call(updateData, "latest_terminal_log_id")) {
      allowed.latest_terminal_log_id = updateData.latest_terminal_log_id;
    }

    if (Object.keys(allowed).length === 0) {
      const error = new Error(
        "No valid fields to update. Allowed: assignment_status, assignment_result, latest_terminal_log_id.",
      );
      error.statusCode = 400;
      throw error;
    }

    const updated = await populateBusAssignmentRefs(
      BusAssignment.findByIdAndUpdate(id, allowed, {
        new: true,
        runValidators: true,
      }),
    );
    return updated;
  },
};
