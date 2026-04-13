import BusStatus from "./bus_status.model.js";
import Bus from "../bus/bus.model.js";
import mongoose from "mongoose";
import Terminal from "../terminal/terminal.model.js";
import TerminalLog from "../terminal_log/terminal_log.model.js";
import BusAssignment from "../bus_assignment/bus_assignment.model.js";

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

      let opsStatus = "scheduled";
      if (lastTerminalLog) {
        if (
          lastTerminalLog.status === "confirmed" &&
          lastTerminalLog.event_type === "departure"
        ) {
          opsStatus = "departed";
        } else if (
          lastTerminalLog.status === "confirmed" &&
          lastTerminalLog.event_type === "arrival"
        ) {
          opsStatus = "present";
        } else if (
          lastTerminalLog.status === "pending" &&
          lastTerminalLog.event_type === "arrival"
        ) {
          opsStatus = "arriving";
        }
      }

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
        ops_status: opsStatus,
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
  async updateBusStatusById(id, updateData) {
    const status = await BusStatus.findOne({
      _id: id,
      is_deleted: false,
    });
    if (!status) {
      const error = new Error("Bus status not found.");
      error.statusCode = 404;
      throw error;
    }

    const allowed = [
      "occupancy_count",
      "occupancy_status",
      "delay_minutes",
      "is_skipping_stops",
    ];
    const filtered = Object.fromEntries(
      Object.entries(updateData).filter(([k]) => allowed.includes(k))
    );

    const updated = await BusStatus.findByIdAndUpdate(
      id,
      { $set: filtered },
      { new: true, runValidators: true }
    );
    return updated;
  },
};
