import Notification from "./notification.model.js";

const TERMINAL_OPERATION_NOTIFICATION_TYPES = [
  "arrival_reported",
  "arrival_confirmed",
  "departure_reported",
  "departure_confirmed",
];

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}

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

  // GET TODAY'S NOTIFICATIONS BY TERMINAL =================================
  async getTodaysNotificationsByTerminalId(terminalId) {
    const { start, end } = getTodayRange();
    const query = await Notification.find({
      terminal_id: terminalId,
      createdAt: { $gte: start, $lt: end },
    }).sort({ createdAt: -1 });

    if (query.length === 0) {
      throw new Error("No notifications found");
    }

    const [notifications, countsAgg] = await Promise.all([
      populateNotificationRefs(query),
      Notification.aggregate([
        {
          $match: {
            terminal_id: terminalId,
            createdAt: { $gte: start, $lt: end },
            notification_type: { $in: TERMINAL_OPERATION_NOTIFICATION_TYPES },
          },
        },
        { $group: { _id: "$notification_type", count: { $sum: 1 } } },
      ]),
    ]);

    const counts = TERMINAL_OPERATION_NOTIFICATION_TYPES.reduce((acc, type) => {
      acc[type] = 0;
      return acc;
    }, {});

    for (const row of countsAgg) {
      counts[row._id] = row.count;
    }

    return { notifications, counts };
  },
};
