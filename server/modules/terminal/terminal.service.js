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
};
