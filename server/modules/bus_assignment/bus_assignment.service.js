import mongoose from "mongoose";
import BusAssignment from "./bus_assignment.model.js";
import Bus from "../bus/bus.model.js";
import Driver from "../driver/driver.model.js";
import User from "../user/user.model.js";
import Route from "../route/route.model.js";
import { logSystemEvent } from "../../utils/systemLogger.js";

function fullName(doc) {
  if (!doc) return "";
  return `${doc.f_name ?? ""} ${doc.l_name ?? ""}`.trim();
}

async function describeBusAssignment(assignment) {
  if (!assignment) return "bus assignment";
  const [bus, route, operator, driver] = await Promise.all([
    assignment.bus_id
      ? Bus.findById(assignment.bus_id).select("bus_number plate_number").lean()
      : null,
    assignment.route_id
      ? Route.findById(assignment.route_id)
          .select("route_name route_code")
          .lean()
      : null,
    assignment.operator_user_id
      ? User.findById(assignment.operator_user_id)
          .select("f_name l_name")
          .lean()
      : null,
    assignment.driver_id
      ? Driver.findById(assignment.driver_id).select("f_name l_name").lean()
      : null,
  ]);
  const busLabel =
    bus?.bus_number || bus?.plate_number ? `bus ${bus.bus_number ?? bus.plate_number}` : "bus";
  const routeLabel = route
    ? `route ${route.route_name || route.route_code || ""}`.trim()
    : "route";
  const driverLabel = fullName(driver) ? `driver ${fullName(driver)}` : "driver";
  const operatorLabel = fullName(operator)
    ? `operator ${fullName(operator)}`
    : "operator";
  return `${busLabel} on ${routeLabel} (${driverLabel}, ${operatorLabel})`;
}

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
      select:
        "terminal_id bus_id event_type event_time status auto_detected confirmation_time",
      populate: { path: "terminal_id", select: "terminal_name" },
    });
}

function formatOperatorName(user) {
  if (!user || typeof user !== "object") return "—";
  const n = `${user.f_name ?? ""} ${user.l_name ?? ""}`.trim();
  return n || "—";
}

function mapLastTerminalLog(log) {
  if (!log || typeof log !== "object") return null;
  const term = log.terminal_id;
  const terminal_id =
    term && typeof term === "object"
      ? { _id: term._id, terminal_name: term.terminal_name ?? null }
      : log.terminal_id != null
        ? { _id: log.terminal_id }
        : null;
  return {
    _id: log._id,
    terminal_id,
    bus_id: log.bus_id ?? null,
    event_type: log.event_type ?? null,
    event_time: log.event_time ?? null,
    status: log.status ?? null,
    auto_detected: log.auto_detected ?? null,
    confirmation_time: log.confirmation_time ?? null,
  };
}

function refId(ref) {
  if (ref != null && typeof ref === "object" && ref._id != null) {
    return ref._id;
  }
  return ref ?? null;
}

/** Plain shape for GET /api/bus-assignments */
function toBusAssignmentListRow(doc) {
  const bus = doc.bus_id;
  const route = doc.route_id;
  const operator = doc.operator_user_id;
  const driver = doc.driver_id;

  return {
    _id: doc._id,
    operator_name: formatOperatorName(operator),
    bus_number:
      bus && typeof bus === "object" && bus.bus_number != null
        ? String(bus.bus_number)
        : "—",
    plate_number:
      bus && typeof bus === "object" && bus.plate_number != null
        ? String(bus.plate_number)
        : "—",
    driver_name: formatOperatorName(driver),
    route_name:
      route && typeof route === "object" && route.route_name != null
        ? String(route.route_name)
        : "—",
    status: doc.assignment_status === "inactive" ? "inactive" : "active",
    result:
      doc.assignment_result === "completed" ||
      doc.assignment_result === "cancelled"
        ? doc.assignment_result
        : "pending",
    last_terminal_log: mapLastTerminalLog(doc.latest_terminal_log_id),
    bus_id: refId(bus),
    driver_id: refId(doc.driver_id),
    route_id: refId(route),
    operator_user_id: refId(operator),
    createdAt: doc.createdAt ?? null,
    updatedAt: doc.updatedAt ?? null,
  };
}

function populateBusAssignmentListRefs(query) {
  return query
    .populate({
      path: "bus_id",
      select: "bus_number plate_number",
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
      select: "route_name",
    })
    .populate({
      path: "latest_terminal_log_id",
      select:
        "terminal_id bus_id event_type event_time status auto_detected confirmation_time",
      populate: { path: "terminal_id", select: "terminal_name" },
    });
}

export const BusAssignmentService = {
  // GET AVAILABLE RESOURCES FOR NEW ASSIGNMENT ===============================================
  async getAvailableAssignmentResourcesByTerminalId(terminalId) {
    if (!terminalId) {
      const error = new Error("Terminal ID is required.");
      error.statusCode = 400;
      throw error;
    }

    const blockedAssignmentFilter = {
      assignment_status: { $in: ["active", "inactive"] },
      assignment_result: "pending",
    };

    const [blockedBusIdsRaw, blockedDriverIdsRaw, blockedOperatorIdsRaw] =
      await Promise.all([
      BusAssignment.distinct("bus_id", blockedAssignmentFilter),
      BusAssignment.distinct("driver_id", blockedAssignmentFilter),
      BusAssignment.distinct("operator_user_id", blockedAssignmentFilter),
      ]);

    const blockedBusIds = blockedBusIdsRaw.filter(Boolean);
    const blockedDriverIds = blockedDriverIdsRaw.filter(Boolean);
    const blockedOperatorIds = blockedOperatorIdsRaw.filter(Boolean);

    const [buses, drivers, operators, routes] = await Promise.all([
      Bus.find({
        _id: { $nin: blockedBusIds },
        is_deleted: { $ne: true },
        status: "active",
      })
        .select("bus_number")
        .sort({ bus_number: 1 })
        .lean(),
      Driver.find({
        _id: { $nin: blockedDriverIds },
        is_deleted: { $ne: true },
        status: "active",
      })
        .select("f_name l_name")
        .sort({ f_name: 1, l_name: 1 })
        .lean(),
      User.find({
        _id: { $nin: blockedOperatorIds },
        role: "operator",
        status: "active",
        assigned_terminal: terminalId,
      })
        .select("f_name l_name")
        .sort({ f_name: 1, l_name: 1 })
        .lean(),
      Route.find({
        route_type: "normal",
        is_deleted: { $ne: true },
        status: "active",
        $or: [{ start_terminal_id: terminalId }, { end_terminal_id: terminalId }],
      })
        .select("route_name route_code")
        .sort({ route_name: 1 })
        .lean(),
   
    ]);

    return { buses, drivers, operators, routes };
  },

  // GET PENDING ASSIGNMENTS BY OPERATOR USER ID ===============================================
  async getPendingBusAssignmentsByOperatorUserId(operatorUserId) {
    if (!operatorUserId) {
      const error = new Error("Operator user ID is required.");
      error.statusCode = 400;
      throw error;
    }
    if (!mongoose.Types.ObjectId.isValid(String(operatorUserId))) {
      const error = new Error("Invalid operator user ID.");
      error.statusCode = 400;
      throw error;
    }

    const assignments = await populateBusAssignmentListRefs(
      BusAssignment.find({
        operator_user_id: operatorUserId,
        assignment_result: "pending",
      }).select(
        "bus_id driver_id operator_user_id route_id assignment_status assignment_result latest_terminal_log_id createdAt updatedAt",
      ),
    )
      .sort({ createdAt: -1 })
      .lean();
    return assignments.map(toBusAssignmentListRow);
  },

  // GET ALL BUS ASSIGNMENTS ===================================================================
  async getAllBusAssignments() {
    const assignments = await populateBusAssignmentListRefs(
      BusAssignment.find().select(
        "bus_id driver_id operator_user_id route_id assignment_status assignment_result latest_terminal_log_id createdAt updatedAt",
      ),
    )
      .sort({ createdAt: -1 })
      .lean();
    return assignments.map(toBusAssignmentListRow);
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

  // GET CURRENT ASSIGNMENT FOR OPERATOR (JWT user) =============================================
  async getCurrentBusAssignmentForOperatorUserId(operatorUserId) {
    if (!operatorUserId) return null;
    const assignment = await populateBusAssignmentRefs(
      BusAssignment.findOne({
        operator_user_id: operatorUserId,
        assignment_status: "active",
        assignment_result: "pending",
      }),
    );
    return assignment ?? null;
  },

  // CREATE BUS ASSIGNMENT ===================================================================
  async createBusAssignment(busAssignmentData, options = {}) {
    const { actorUserId = null } = options;
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

    if (busAssignment && actorUserId) {
      const description = await describeBusAssignment(busAssignment);
      await logSystemEvent({
        userId: actorUserId,
        action: "Assign Bus",
        description: `Assigned ${description}.`,
      });
    }

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

  // DELETE BUS ASSIGNMENT BY ID ===================================================================
  async deleteBusAssignmentById(id, options = {}) {
    const { actorUserId = null } = options;
    const assignment = await BusAssignment.findById(id);
    if (!assignment) {
      const error = new Error("Bus assignment not found.");
      error.statusCode = 404;
      throw error;
    }

    let description;
    if (actorUserId) {
      description = await describeBusAssignment(assignment);
    }

    await BusAssignment.findByIdAndDelete(id);

    if (actorUserId) {
      await logSystemEvent({
        userId: actorUserId,
        action: "Remove Bus Assignment",
        description: `Removed assignment for ${description}.`,
      });
    }

    return assignment;
  },
};
