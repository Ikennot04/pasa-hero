import Notification from "./notification.model.js";

const TERMINAL_OPERATION_NOTIFICATION_TYPES = [
  "arrival_reported",
  "arrival_confirmed",
  "departure_reported",
  "departure_confirmed",
];

function populateNotificationRefs(query) {
  return query
    .populate({ path: "sender_id", select: "f_name l_name" })
    .populate({ path: "bus_id", select: "bus_number plate_number" })
    .populate({ path: "route_id", select: "route_name route_code" })
    .populate({ path: "terminal_id", select: "terminal_name" });
}

export const NotificationService = {
  // CREATE NOTIFICATION ===================================================
  async createNotification(payload) {
    const doc = await Notification.create(payload);
    const populated = await populateNotificationRefs(
      Notification.findById(doc._id),
    );
    return populated;
  },

  // GET ALL NOTIFICATIONS =================================================
  async getAllNotifications() {
    const query = Notification.find().sort({ createdAt: -1 });
    const populatedQuery = populateNotificationRefs(query);
    return populatedQuery;
  },

  // GET OPERATION NOTIFICATION COUNTS BY TERMINAL =========================
  async getOperationNotificationCountsByTerminal(terminalId) {
    if (!terminalId || String(terminalId).trim() === "") {
      const err = new Error("terminal_id is required");
      err.statusCode = 400;
      throw err;
    }
    const rows = await Notification.aggregate([
      {
        $match: {
          terminal_id: String(terminalId),
          notification_type: { $in: TERMINAL_OPERATION_NOTIFICATION_TYPES },
        },
      },
      { $group: { _id: "$notification_type", count: { $sum: 1 } } },
    ]);
    const counts = Object.fromEntries(
      TERMINAL_OPERATION_NOTIFICATION_TYPES.map((t) => [t, 0]),
    );
    for (const row of rows) {
      if (row._id && Object.prototype.hasOwnProperty.call(counts, row._id)) {
        counts[row._id] = row.count;
      }
    }
    return counts;
  },
};
