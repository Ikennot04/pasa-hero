import BusAssignment from "./bus_assignment.model.js";
import Bus from "../bus/bus.model.js";
import Driver from "../driver/driver.model.js";
import Route from "../route/route.model.js";

export const BusAssignmentService = {
  async createBusAssignment(busAssignmentData) {
    const { bus_id, driver_id, operator_user_id, route_id } = busAssignmentData;

    const [activeBusAssignment, activeDriverAssignment, activeOperatorAssignment] = await Promise.all([
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
      const error = new Error("This operator already has an active assignment.");
      error.statusCode = 409;
      throw error;
    }

    const busAssignment = await BusAssignment.create(busAssignmentData);

    return busAssignment;
  },
};
