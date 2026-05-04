import BusStatus from "./bus_status.model.js";
import Bus from "../bus/bus.model.js";
import mongoose from "mongoose";
import Terminal from "../terminal/terminal.model.js";
import TerminalLog from "../terminal_log/terminal_log.model.js";
import BusAssignment from "../bus_assignment/bus_assignment.model.js";
import Route from "../route/route.model.js";
import User from "../user/user.model.js";
import { NotificationService } from "../notification/notification.service.js";
import { getOccupancyStatus } from "./occupancy.util.js";

let cachedSystemSenderId = null;
async function getSystemSenderId() {
  if (cachedSystemSenderId) return cachedSystemSenderId;
  const admin = await User.findOne({ role: "super admin" })
    .select("_id")
    .lean();
  cachedSystemSenderId = admin ? String(admin._id) : null;
  return cachedSystemSenderId;
}

async function loadOccupancyNotificationContext(busIdStr) {
  const busObjectId = mongoose.Types.ObjectId.isValid(busIdStr)
    ? new mongoose.Types.ObjectId(busIdStr)
    : null;
  if (!busObjectId) {
    return { route: null, terminalId: null };
  }

  const assignment = await BusAssignment.findOne({
    bus_id: busObjectId,
    assignment_status: "active",
    assignment_result: "pending",
  })
    .sort({ updatedAt: -1 })
    .select("route_id")
    .lean();

  if (!assignment?.route_id) {
    return { route: null, terminalId: null };
  }

  const route = await Route.findById(assignment.route_id)
    .select("route_code route_name end_terminal_id")
    .lean();

  return {
    route,
    terminalId: route?.end_terminal_id ? String(route.end_terminal_id) : null,
  };
}

async function emitOccupancyChangeNotification({
  previousOccupancyStatus,
  updatedDoc,
  bus,
  senderUserId,
}) {
  const senderId =
    (senderUserId && String(senderUserId)) || (await getSystemSenderId());
  if (!senderId) return;

  const ctx = await loadOccupancyNotificationContext(String(updatedDoc.bus_id));
  const route = ctx.route;
  const busLabel = bus?.bus_number || bus?.plate_number || "Bus";
  const routeLabel = route
    ? `Route ${route.route_code ?? ""}${route.route_name ? ` (${route.route_name})` : ""}`.trim()
    : "its assigned route";

  const cap = Number(bus?.capacity) || 0;
  const count = Number(updatedDoc.occupancy_count) || 0;
  const title = `${busLabel} — ${updatedDoc.occupancy_status}`;
  const message = `Operator updated occupancy for ${busLabel} on ${routeLabel}: ${count}/${cap || "—"} passengers (${updatedDoc.occupancy_status}; was ${previousOccupancyStatus}).`;

  await NotificationService.createNotification({
    sender_id: senderId,
    bus_id: String(updatedDoc.bus_id),
    route_id: route?._id ? String(route._id) : null,
    terminal_id: ctx.terminalId,
    title,
    message,
    notification_type: "occupancy_update",
    priority: updatedDoc.occupancy_status === "full" ? "high" : "medium",
    scope: "route",
  });
}

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

  // GET BUS STATUS BY ID =================================================================
  async getBusStatusById(id) {
    const status = await BusStatus.findOne({
      _id: id,
      is_deleted: false,
    });
    if (!status) {
      const error = new Error("Bus status not found.");
      error.statusCode = 404;
      throw error;
    }
    return status;
  },

  // GET ALL BUS STATUSES BY TERMINAL ID ==========================================================
  async getBusStatusesByTerminalId(terminalId) {
    if (!mongoose.Types.ObjectId.isValid(terminalId)) {
      const error = new Error("Invalid terminal id.");
      error.statusCode = 400;
      throw error;
    }

    const terminalExists = await Terminal.exists({ _id: terminalId });
    if (!terminalExists) {
      const error = new Error("Terminal not found.");
      error.statusCode = 404;
      throw error;
    }

    const busIds = await TerminalLog.distinct("bus_id", {
      terminal_id: terminalId,
    });

    if (busIds.length === 0) {
      return {
        busStatuses: [],
        counts: {
          activeBuses: 0,
          atTerminal: 0,
          enRouteOrQueue: 0,
          confirmations: 0,
        },
      };
    }

    const busStatuses = await BusStatus.find({
      bus_id: { $in: busIds.map((id) => String(id)) },
      is_deleted: false,
    }).sort({ updatedAt: -1 });

    const logs = await TerminalLog.find({
      terminal_id: terminalId,
      bus_id: { $in: busIds },
      status: { $in: ["pending", "confirmed"] },
    })
      .select("bus_id bus_assignment_id event_type status event_time")
      .sort({ event_time: -1, createdAt: -1 });

    const latestConfirmedByBus = new Map();
    const latestLogByBus = new Map();
    let confirmations = 0;

    for (const log of logs) {
      const busId = String(log.bus_id);
      if (!latestLogByBus.has(busId)) {
        latestLogByBus.set(busId, log);
      }

      if (log.status === "pending") {
        confirmations += 1;
        continue;
      }

      if (!latestConfirmedByBus.has(busId)) {
        latestConfirmedByBus.set(busId, log.event_type);
      }
    }

    const activeBuses = busStatuses.length;
    const atTerminal = busStatuses.reduce((count, status) => {
      return latestConfirmedByBus.get(String(status.bus_id)) === "arrival"
        ? count + 1
        : count;
    }, 0);

    const assignmentIds = Array.from(
      new Set(
        Array.from(latestLogByBus.values())
          .map((log) => log.bus_assignment_id)
          .filter(Boolean)
          .map((id) => String(id))
      )
    );

    const assignments = await BusAssignment.find({
      _id: { $in: assignmentIds },
    })
      .select("driver_id route_id")
      .populate("driver_id", "f_name l_name")
      .populate("route_id", "route_name route_code");

    const assignmentsById = new Map(
      assignments.map((assignment) => [String(assignment._id), assignment])
    );

    const buses = await Bus.find({
      _id: { $in: busStatuses.map((status) => status.bus_id) },
      is_deleted: false,
    }).select("bus_number plate_number status");

    const busesById = new Map(buses.map((bus) => [String(bus._id), bus]));

    const normalizedStatuses = busStatuses.map((status) => {
      const busId = String(status.bus_id);
      const bus = busesById.get(busId);
      const lastTerminalLog = latestLogByBus.get(busId) ?? null;
      const assignment = lastTerminalLog?.bus_assignment_id
        ? assignmentsById.get(String(lastTerminalLog.bus_assignment_id))
        : null;

      return {
        _id: status._id,
        bus_number: bus?.bus_number ?? null,
        plate_number: bus?.plate_number ?? null,
        route_name: assignment?.route_id?.route_name ?? null,
        route_code: assignment?.route_id?.route_code ?? null,
        driver: assignment?.driver_id
          ? `${assignment.driver_id.f_name} ${assignment.driver_id.l_name}`.trim()
          : null,
        bus_status: bus?.status ?? null,
        last_terminal_log: lastTerminalLog
          ? {
              event_type: lastTerminalLog.event_type,
              status: lastTerminalLog.status,
              event_time: lastTerminalLog.event_time,
            }
          : null,
        occupancy_status: status.occupancy_status,
      };
    });

    return {
      busStatuses: normalizedStatuses,
      counts: {
        active_buses: activeBuses,
        at_terminal:atTerminal,
        en_route_or_queue: Math.max(activeBuses - atTerminal, 0),
        confirmations,
      },
    };
  },

  // UPDATE BUS STATUS BY ID =============================================================
  async updateBusStatusById(id, updateData, options = {}) {
    const status = await BusStatus.findOne({
      _id: id,
      is_deleted: false,
    });
    if (!status) {
      const error = new Error("Bus status not found.");
      error.statusCode = 404;
      throw error;
    }

    const bus = await Bus.findOne({
      _id: status.bus_id,
      is_deleted: false,
    })
      .select("bus_number plate_number capacity")
      .lean();

    const capacity = Number(bus?.capacity) || 0;
    const merged = { ...updateData };

    if (Object.prototype.hasOwnProperty.call(merged, "occupancy_count")) {
      let count = Number(merged.occupancy_count);
      if (!Number.isFinite(count)) count = 0;
      merged.occupancy_count =
        capacity > 0
          ? Math.max(0, Math.min(capacity, count))
          : Math.max(0, count);
      merged.occupancy_status = getOccupancyStatus(
        merged.occupancy_count,
        capacity,
      );
    }

    const previousOccupancyStatus = status.occupancy_status;

    const updated = await BusStatus.findByIdAndUpdate(id, merged, {
      new: true,
      runValidators: true,
    });

    if (
      bus &&
      updated &&
      updated.occupancy_status !== previousOccupancyStatus
    ) {
      try {
        await emitOccupancyChangeNotification({
          previousOccupancyStatus,
          updatedDoc: updated,
          bus,
          senderUserId: options.senderUserId,
        });
      } catch (err) {
        console.error("Occupancy notification fan-out failed:", err.message);
      }
    }

    return updated;
  },
};
