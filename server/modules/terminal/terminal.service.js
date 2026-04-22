import mongoose from "mongoose";
import Terminal from "./terminal.model.js"; // Model
import Route from "../route/route.model.js";
import BusAssignment from "../bus_assignment/bus_assignment.model.js";
import TerminalLog from "../terminal_log/terminal_log.model.js";

function parseUtcDayBounds(dateStr) {
  let start;
  if (dateStr && typeof dateStr === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    start = new Date(`${dateStr}T00:00:00.000Z`);
  } else {
    const now = new Date();
    start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
  const endExclusive = new Date(start);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
  return { start, endExclusive };
}

function logConfirmOrEventTime(log) {
  return new Date(log.confirmation_time || log.event_time).getTime();
}

/**
 * Derive operational flags from all TerminalLog rows for one assignment at one terminal.
 */
function deriveFlagsFromLogs(logs) {
  const hasArrConf = logs.some((l) => l.event_type === "arrival" && l.status === "confirmed");
  const hasDepConf = logs.some((l) => l.event_type === "departure" && l.status === "confirmed");

  const arrivals = logs
    .filter((l) => l.event_type === "arrival")
    .sort((a, b) => new Date(b.event_time) - new Date(a.event_time));
  const deps = logs
    .filter((l) => l.event_type === "departure")
    .sort((a, b) => new Date(b.event_time) - new Date(a.event_time));
  const lastArr = arrivals[0];
  const lastDep = deps[0];

  const confirmed = logs
    .filter((l) => l.status === "confirmed")
    .sort((a, b) => logConfirmOrEventTime(b) - logConfirmOrEventTime(a));
  const lastConf = confirmed[0];

  const present = lastConf?.event_type === "arrival";

  const pendingArrival = Boolean(lastArr?.status === "pending" && !hasArrConf);
  const pendingDeparture = Boolean(hasArrConf && !hasDepConf && lastDep?.status === "pending");

  return { present, pendingArrival, pendingDeparture };
}

/**
 * Lifecycle label for a scheduled assignment at this terminal (from its terminal logs).
 */
function scheduledAssignmentStatus(assignmentLogs) {
  if (!assignmentLogs?.length) return "scheduled";
  const hasDepConf = assignmentLogs.some((l) => l.event_type === "departure" && l.status === "confirmed");
  if (hasDepConf) return "departed";
  const flags = deriveFlagsFromLogs(assignmentLogs);
  if (flags.present) return "present";
  if (flags.pendingArrival) return "arriving";
  return "scheduled";
}

export const TerminalService = {
  // GET ALL TERMINALS ===================================================================
  async getAllTerminals() {
    const terminals = await Terminal.find();
    return terminals;
  },
  // CREATE TERMINAL ===================================================================
  async createTerminal(terminalData) {
    const existingTerminal = await Terminal.findOne({ terminal_name: terminalData.terminal_name });
    if (existingTerminal) {
      throw new Error(`Terminal name "${terminalData.terminal_name}" already exists.`);
    }

    const nearTerminal = await Terminal.findOne({
      location_lat: { $gte: terminalData.location_lat - 0.0001, $lte: terminalData.location_lat + 0.0001 },
      location_lng: { $gte: terminalData.location_lng - 0.0001, $lte: terminalData.location_lng + 0.0001 },
    });
    if (nearTerminal) {
      throw new Error('A terminal is already registered at or very near this location.');
    }

    const terminal = await Terminal.create(terminalData);
    return terminal;
  },
  // GET TERMINAL BY ID ===================================================================
  async getTerminalById(terminalId) {
    const terminal = await Terminal.findById(terminalId);
    if (!terminal) {
      throw new Error('Terminal not found.');
    }
    return terminal;
  },
  // UPDATE TERMINAL BY ID ===================================================================
  async updateTerminalById(terminalId, updateData) {
    const terminal = await Terminal.findById(terminalId);
    if (!terminal) {
      throw new Error('Terminal not found.');
    }

    if (updateData.terminal_name && updateData.terminal_name !== terminal.terminal_name) {
      const existingTerminal = await Terminal.findOne({ terminal_name: updateData.terminal_name });
      if (existingTerminal) {
        throw new Error(`Terminal name "${updateData.terminal_name}" already exists.`);
      }
    }

    if ((updateData.location_lat != null || updateData.location_lng != null) && (updateData.location_lat !== terminal.location_lat || updateData.location_lng !== terminal.location_lng)) {
      const lat = updateData.location_lat ?? terminal.location_lat;
      const lng = updateData.location_lng ?? terminal.location_lng;
      const nearTerminal = await Terminal.findOne({
        _id: { $ne: terminalId },
        location_lat: { $gte: lat - 0.0001, $lte: lat + 0.0001 },
        location_lng: { $gte: lng - 0.0001, $lte: lng + 0.0001 },
      });
      if (nearTerminal) {
        throw new Error('A terminal is already registered at or very near this location.');
      }
    }

    const updated = await Terminal.findByIdAndUpdate(terminalId, updateData, { new: true });
    return updated;
  },

  /**
   * Metrics for a terminal: today's scheduled arrivals (by route end terminal + ETA),
   * current presence, departures confirmed on the selected UTC day, and pending confirmations.
   * @param {string} terminalId
   * @param {{ date?: string }} [options] date as YYYY-MM-DD (UTC); defaults to current UTC day
   */
  async getTerminalOperationalSummary(terminalId, options = {}) {
    if (!mongoose.Types.ObjectId.isValid(terminalId)) {
      const err = new Error("Invalid terminal id.");
      err.statusCode = 400;
      throw err;
    }

    const terminal = await Terminal.findById(terminalId);
    if (!terminal) {
      const err = new Error("Terminal not found.");
      err.statusCode = 404;
      throw err;
    }

    const { start, endExclusive } = parseUtcDayBounds(options.date);
    const terminalKey = String(terminalId);
    const terminalObjectId = new mongoose.Types.ObjectId(terminalId);

    // end_terminal_id is a String in the schema, but some docs may store ObjectId from older writes.
    const routesEndingHere = await Route.find({
      $or: [
        { end_terminal_id: terminalKey },
        { end_terminal_id: terminalId },
        { end_terminal_id: terminalObjectId },
      ],
    })
      .select("_id")
      .lean();
    const routeIds = routesEndingHere.map((r) => r._id);

    const totalScheduledArrivalsToday =
      routeIds.length === 0
        ? 0
        : await BusAssignment.countDocuments({
            route_id: { $in: routeIds },
            scheduled_arrival_at: { $gte: start, $lt: endExclusive },
          });

    const logs = await TerminalLog.find({ terminal_id: terminalObjectId }).lean();
    const byAssignment = new Map();
    for (const log of logs) {
      const key = String(log.bus_assignment_id);
      if (!byAssignment.has(key)) byAssignment.set(key, []);
      byAssignment.get(key).push(log);
    }

    let busesPresent = 0;
    let pendingArrivals = 0;
    let pendingDepartures = 0;
    let departedToday = 0;

    for (const [, assignmentLogs] of byAssignment) {
      const flags = deriveFlagsFromLogs(assignmentLogs);
      if (flags.present) busesPresent += 1;
      if (flags.pendingArrival) pendingArrivals += 1;
      if (flags.pendingDeparture) pendingDepartures += 1;

      const depConfs = assignmentLogs.filter(
        (l) => l.event_type === "departure" && l.status === "confirmed",
      );
      const leftToday = depConfs.some((l) => {
        const t = l.confirmation_time || l.event_time;
        const ms = new Date(t).getTime();
        return ms >= start.getTime() && ms < endExclusive.getTime();
      });
      if (leftToday) departedToday += 1;
    }

    const pendingConfirmations = pendingArrivals + pendingDepartures;

    return {
      terminal_id: terminal._id,
      date_utc: start.toISOString().slice(0, 10),
      total_scheduled_arrivals_today: totalScheduledArrivalsToday,
      buses_present: busesPresent,
      buses_departed_today: departedToday,
      pending_confirmations: pendingConfirmations,
      pending_arrivals: pendingArrivals,
      pending_departures: pendingDepartures,
    };
  },

  /**
   * Get pending arrival and departure confirmations for a terminal.
   * @param {string} terminalId
   */
  async getPendingConfirmationsByTerminalId(terminalId) {
    if (!mongoose.Types.ObjectId.isValid(terminalId)) {
      const err = new Error("Invalid terminal id.");
      err.statusCode = 400;
      throw err;
    }

    const terminal = await Terminal.findById(terminalId).select("_id");
    if (!terminal) {
      const err = new Error("Terminal not found.");
      err.statusCode = 404;
      throw err;
    }

    const pendingLogs = await TerminalLog.find({
      terminal_id: terminalId,
      status: "pending",
      event_type: { $in: ["arrival", "departure"] },
    })
      .populate({ path: "bus_id", select: "bus_number plate_number" })
      .populate({
        path: "bus_assignment_id",
        select: "_id route_id",
        populate: { path: "route_id", select: "route_name route_code" },
      })
      .sort({ event_time: -1 });

    const pending_arrivals = [];
    const pending_departures = [];

    for (const log of pendingLogs) {
      const payload = {
        terminal_log_id: log._id,
        bus_assignment_id: log.bus_assignment_id?._id || null,
        bus_id: log.bus_id?._id || null,
        bus_number: log.bus_id?.bus_number || null,
        plate_number: log.bus_id?.plate_number || null,
        route_id: log.bus_assignment_id?.route_id?._id || null,
        route_name: log.bus_assignment_id?.route_id?.route_name || null,
        route_code: log.bus_assignment_id?.route_id?.route_code || null,
        event_time: log.event_time,
        created_at: log.createdAt,
      };

      if (log.event_type === "arrival") pending_arrivals.push(payload);
      if (log.event_type === "departure") pending_departures.push(payload);
    }

    return {
      terminal_id: terminal._id,
      pending_confirmations: pending_arrivals.length + pending_departures.length,
      pending_arrivals,
      pending_departures,
    };
  },

  /**
   * Get bus operational lists for a terminal.
   * - buses_present: latest confirmed event for an assignment is arrival
   * - not_confirmed_departed_buses: pending departure exists after confirmed arrival, without confirmed departure yet
   * @param {string} terminalId
   */
  async getTerminalBusOperationalListByTerminalId(terminalId) {
    if (!mongoose.Types.ObjectId.isValid(terminalId)) {
      const err = new Error("Invalid terminal id.");
      err.statusCode = 400;
      throw err;
    }

    const terminal = await Terminal.findById(terminalId).select("_id");
    if (!terminal) {
      const err = new Error("Terminal not found.");
      err.statusCode = 404;
      throw err;
    }

    const logs = await TerminalLog.find({
      terminal_id: terminalId,
      event_type: { $in: ["arrival", "departure"] },
    })
      .populate({ path: "bus_id", select: "bus_number plate_number" })
      .populate({
        path: "bus_assignment_id",
        select: "_id route_id",
        populate: { path: "route_id", select: "route_name route_code" },
      })
      .lean();

    const byAssignment = new Map();
    for (const log of logs) {
      const assignmentId = log.bus_assignment_id?._id || log.bus_assignment_id;
      if (!assignmentId) continue;
      const key = String(assignmentId);
      if (!byAssignment.has(key)) byAssignment.set(key, []);
      byAssignment.get(key).push(log);
    }

    const buses_present = [];
    const not_confirmed_departed_buses = [];
    for (const [, assignmentLogs] of byAssignment) {
      const flags = deriveFlagsFromLogs(assignmentLogs);
      const latestConfirmedArrival = assignmentLogs
        .filter((l) => l.event_type === "arrival" && l.status === "confirmed")
        .sort((a, b) => logConfirmOrEventTime(b) - logConfirmOrEventTime(a))[0];

      if (flags.present) {
        const ref = latestConfirmedArrival || assignmentLogs[0];
        buses_present.push({
          bus_number: ref?.bus_id?.bus_number || null,
          route_name: ref?.bus_assignment_id?.route_id?.route_name || null,
          arrival_time: latestConfirmedArrival?.event_time || null,
          confirmed_at: latestConfirmedArrival?.confirmation_time || null,
        });
      }

      if (flags.pendingDeparture) {
        const latestPendingDeparture = assignmentLogs
          .filter((l) => l.event_type === "departure" && l.status === "pending")
          .sort((a, b) => new Date(b.event_time) - new Date(a.event_time))[0];

        const ref = latestPendingDeparture || latestConfirmedArrival || assignmentLogs[0];
        not_confirmed_departed_buses.push({
          bus_number: ref?.bus_id?.bus_number || null,
          route_name: ref?.bus_assignment_id?.route_id?.route_name || null,
          arrival_time: latestConfirmedArrival?.event_time || null,
          created_at: latestPendingDeparture?.createdAt || null,
        });
      }
    }

    buses_present.sort((a, b) => {
      const at = a.confirmed_at || a.arrival_time || 0;
      const bt = b.confirmed_at || b.arrival_time || 0;
      return new Date(bt).getTime() - new Date(at).getTime();
    });

    return {
      terminal_id: terminal._id,
      buses_present_count: buses_present.length,
      buses_present,
      not_confirmed_departed_buses_count: not_confirmed_departed_buses.length,
      not_confirmed_departed_buses,
    };
  },

  /**
   * Terminal management: today's scheduled arrivals for this terminal (by route end_terminal_id),
   * all pending arrival/departure terminal logs for this terminal, and aggregate counts.
   * @param {string} terminalId
   * @param {{ date?: string }} [options] date as YYYY-MM-DD (UTC); defaults to current UTC day
   */
  async getTerminalManagement(terminalId, options = {}) {
    if (!mongoose.Types.ObjectId.isValid(terminalId)) {
      const err = new Error("Invalid terminal id.");
      err.statusCode = 400;
      throw err;
    }

    const terminal = await Terminal.findById(terminalId);
    if (!terminal) {
      const err = new Error("Terminal not found.");
      err.statusCode = 404;
      throw err;
    }

    const { start, endExclusive } = parseUtcDayBounds(options.date);
    const terminalKey = String(terminalId);
    const terminalObjectId = new mongoose.Types.ObjectId(terminalId);

    const routesEndingHere = await Route.find({
      $or: [
        { end_terminal_id: terminalKey },
        { end_terminal_id: terminalId },
        { end_terminal_id: terminalObjectId },
      ],
    })
      .select("_id")
      .lean();
    const routeIds = routesEndingHere.map((r) => r._id);

    const fullName = (doc) =>
      doc && typeof doc === "object" && (doc.f_name != null || doc.l_name != null)
        ? `${doc.f_name || ""} ${doc.l_name || ""}`.trim() || null
        : null;

    const scheduledAssignmentsQuery =
      routeIds.length === 0
        ? Promise.resolve([])
        : BusAssignment.find({
            route_id: { $in: routeIds },
            scheduled_arrival_at: { $gte: start, $lt: endExclusive },
          })
            .populate({ path: "bus_id", select: "bus_number" })
            .populate({ path: "route_id", select: "route_name" })
            .populate({ path: "driver_id", select: "f_name l_name" })
            .populate({ path: "operator_user_id", select: "f_name l_name" })
            .sort({ scheduled_arrival_at: 1 })
            .lean();

    const terminalLogsQuery = TerminalLog.find({ terminal_id: terminalObjectId })
      .populate({ path: "bus_id", select: "bus_number" })
      .populate({
        path: "bus_assignment_id",
        select: "_id route_id",
        populate: { path: "route_id", select: "route_name" },
      })
      .populate({ path: "confirmed_by", select: "f_name l_name email" })
      .lean();

    const [scheduledQuery, logs] = await Promise.all([scheduledAssignmentsQuery, terminalLogsQuery]);

    const byAssignment = new Map();
    for (const log of logs) {
      const assignmentId = log.bus_assignment_id?._id || log.bus_assignment_id;
      if (!assignmentId) continue;
      const key = String(assignmentId);
      if (!byAssignment.has(key)) byAssignment.set(key, []);
      byAssignment.get(key).push(log);
    }

    const scheduled_buses_today = scheduledQuery.map((a) => {
      const assignmentLogs = byAssignment.get(String(a._id)) || [];
      return {
        bus_number: a.bus_id?.bus_number ?? null,
        route_name: a.route_id?.route_name ?? null,
        driver: fullName(a.driver_id),
        conductor: fullName(a.operator_user_id),
        scheduled_arrival_at: a.scheduled_arrival_at,
        status: scheduledAssignmentStatus(assignmentLogs),
      };
    });

    const logToPendingRow = (log) => {
      const ba = log.bus_assignment_id;
      const routeName =
        ba && typeof ba === "object" ? ba.route_id?.route_name ?? null : null;
      return {
        terminal_log_id: log._id,
        bus_number: log.bus_id?.bus_number ?? null,
        route_name: routeName,
        created_at: log.createdAt,
      };
    };

    const pending_arrival_confirmations = logs
      .filter((l) => l.event_type === "arrival" && l.status === "pending")
      .map(logToPendingRow)
      .sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );

    const pending_departure_confirmations = logs
      .filter((l) => l.event_type === "departure" && l.status === "pending")
      .map(logToPendingRow)
      .sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );

    let currently_present_at_terminal = 0;
    for (const [, assignmentLogs] of byAssignment) {
      const flags = deriveFlagsFromLogs(assignmentLogs);
      if (flags.present) currently_present_at_terminal += 1;
    }

    const confirmationHistory = logs
      .filter((l) => {
        if (l.status !== "confirmed" && l.status !== "rejected") return false;
        const t = l.confirmation_time;
        if (!t) return false;
        const ms = new Date(t).getTime();
        return ms >= start.getTime() && ms < endExclusive.getTime();
      })
      .map((l) => {
        const ba = l.bus_assignment_id;
        const routeName =
          ba && typeof ba === "object" ? ba.route_id?.route_name ?? null : null;
        const confUser = l.confirmed_by;
        const byName =
          confUser && typeof confUser === "object"
            ? fullName(confUser) || confUser.email || null
            : null;
        return {
          terminal_log_id: l._id,
          bus_number: l.bus_id?.bus_number ?? null,
          route_name: routeName,
          kind: l.event_type,
          action: l.status === "confirmed" ? "confirm" : "reject",
          at: l.confirmation_time,
          by: byName ?? "—",
        };
      })
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    return {
      terminal_id: terminal._id,
      date_utc: start.toISOString().slice(0, 10),
      counts: {
        scheduled_buses_today: scheduled_buses_today.length,
        pending_arrival_confirmations: pending_arrival_confirmations.length,
        pending_departure_confirmations: pending_departure_confirmations.length,
        currently_present_at_terminal: currently_present_at_terminal,
      },
      scheduled_buses_today,
      pending_arrival_confirmations,
      pending_departure_confirmations,
      confirmation_history: confirmationHistory,
    };
  },
};
