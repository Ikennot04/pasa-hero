import Notification from "./notification.model.js";
import Route from "../route/route.model.js";
import Terminal from "../terminal/terminal.model.js";
import User from "../user/user.model.js";

const TERMINAL_STAFF_ROLES = ["terminal admin", "operator"];

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

  // GET ALL NOTIFICATIONS BY TERMINAL ====================================
  async getAllNotificationsByTerminalId(terminalId) {
    const terminal = await Terminal.findById(terminalId);
    if (!terminal) {
      throw new Error("Terminal not found");
    }

    const routeIdStrs = (
      await Route.find({
        $or: [
          { start_terminal_id: terminalId },
          { end_terminal_id: terminalId },
        ],
      })
        .select("_id")
        .lean()
    ).map((r) => String(r._id));

    const visibleFilter = {
      $or: [
        { terminal_id: terminalId },
        ...(routeIdStrs.length
          ? [{ route_id: { $in: routeIdStrs } }]
          : []),
      ],
    };

    const [notifications, visibleLean, staffUsers] = await Promise.all([
      populateNotificationRefs(
        Notification.find({ terminal_id: terminalId }).sort({ createdAt: -1 }),
      ),
      Notification.find(visibleFilter)
        .select("sender_id priority")
        .sort({ createdAt: -1 })
        .lean(),
      User.find({
        role: { $in: TERMINAL_STAFF_ROLES },
        assigned_terminal: terminal._id,
      })
        .select("_id")
        .lean(),
    ]);

    const staffIdSet = new Set(staffUsers.map((u) => String(u._id)));

    const visible_for_terminal = visibleLean.length;
    const from_terminal_staff = visibleLean.filter((n) =>
      staffIdSet.has(String(n.sender_id)),
    ).length;
    const high_priority = visibleLean.filter(
      (n) => n.priority === "high",
    ).length;

    return {
      notifications,
      counts: {
        visible_for_terminal,
        from_terminal_staff,
        high_priority,
      },
    };
  },

  // GET TODAY'S NOTIFICATIONS BY TERMINAL =================================
  async getTodaysNotificationsByTerminalId(terminalId) {
    const terminal = await Terminal.findById(terminalId);
    if (!terminal) {
      throw new Error("Terminal not found");
    }

    const { start, end } = getTodayRange();
    const query = Notification.find({
      terminal_id: terminalId,
      createdAt: { $gte: start, $lt: end },
    }).sort({ createdAt: -1 });

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
