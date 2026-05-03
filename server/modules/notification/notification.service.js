import Notification from "./notification.model.js";
import UserNotification from "../user_notification/user_notification.model.js";
import UserSubscription from "../user_subscription/user_subscription.model.js";
import Route from "../route/route.model.js";
import Terminal from "../terminal/terminal.model.js";
import User from "../user/user.model.js";

const TERMINAL_STAFF_ROLES = ["terminal admin", "operator"];

const TERMINAL_OPERATION_NOTIFICATION_TYPES = [
  "arrival_reported",
  "arrival_rejected",
  "departure_reported",
  "departure_rejected",
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

/**
 * Collect user_ids that should receive this notification based on
 * `UserSubscription` (route or bus) and optional terminal / system scope.
 */
async function resolveSubscriberUserIds(notification) {
  const userIds = new Set();
  const busId =
    notification.bus_id != null ? String(notification.bus_id) : null;
  const routeId =
    notification.route_id != null ? String(notification.route_id) : null;
  const terminalId =
    notification.terminal_id != null
      ? String(notification.terminal_id)
      : null;
  const scope = notification.scope || "";

  if (busId) {
    const ids = await UserSubscription.distinct("user_id", { bus_id: busId });
    for (const id of ids) {
      if (id) userIds.add(String(id));
    }
  }

  if (routeId) {
    const ids = await UserSubscription.distinct("user_id", {
      route_id: routeId,
    });
    for (const id of ids) {
      if (id) userIds.add(String(id));
    }
  }

  const expandTerminalRoutes =
    terminalId &&
    !busId &&
    (scope === "terminal" || scope === "system");

  if (expandTerminalRoutes) {
    const routes = await Route.find({
      $or: [
        { start_terminal_id: terminalId },
        { end_terminal_id: terminalId },
      ],
      is_deleted: { $ne: true },
    })
      .select("_id")
      .lean();
    const routeIds = routes.map((r) => String(r._id));
    if (routeIds.length) {
      const ids = await UserSubscription.distinct("user_id", {
        route_id: { $in: routeIds },
      });
      for (const id of ids) {
        if (id) userIds.add(String(id));
      }
    }
  }

  if (scope === "system" && !busId && !routeId && !terminalId) {
    const ids = await UserSubscription.distinct("user_id", {});
    for (const id of ids) {
      if (id) userIds.add(String(id));
    }
  }

  const senderId =
    notification.sender_id != null ? String(notification.sender_id) : null;
  if (senderId) userIds.delete(senderId);

  return [...userIds];
}

async function fanOutNotificationToSubscribers(notification) {
  const userIds = await resolveSubscriberUserIds(notification);
  if (!userIds.length) {
    return { delivered_count: 0 };
  }

  const nid = String(notification._id);
  const ops = userIds.map((user_id) => ({
    updateOne: {
      filter: { user_id, notification_id: nid },
      update: {
        $setOnInsert: {
          user_id,
          notification_id: nid,
          is_read: false,
        },
      },
      upsert: true,
    },
  }));

  await UserNotification.bulkWrite(ops, { ordered: false });
  return { delivered_count: userIds.length };
}

export const NotificationService = {
  // CREATE NOTIFICATION ===================================================
  async createNotification(payload) {
    const doc = await Notification.create(payload);
    try {
      await fanOutNotificationToSubscribers(doc);
    } catch (err) {
      await Notification.findByIdAndDelete(doc._id);
      throw err;
    }
    const populated = await populateNotificationRefs(
      Notification.findById(doc._id),
    );
    return populated;
  },

  // BULK DELETE NOTIFICATIONS + RELATED DATA ==============================
  async bulkDeleteNotificationsWithRelations(notificationIds) {
    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      const error = new Error("notification_ids must be a non-empty array");
      error.statusCode = 400;
      throw error;
    }

    const normalizedIds = [
      ...new Set(
        notificationIds
          .map((id) => String(id || "").trim())
          .filter((id) => Boolean(id)),
      ),
    ];

    if (!normalizedIds.length) {
      const error = new Error("notification_ids must contain valid IDs");
      error.statusCode = 400;
      throw error;
    }

    const notifications = await Notification.find({
      _id: { $in: normalizedIds },
    })
      .select("_id route_id bus_id")
      .lean();

    const foundNotificationIds = notifications.map((n) => String(n._id));
    const routeIds = [
      ...new Set(
        notifications
          .map((n) => (n.route_id ? String(n.route_id) : null))
          .filter((id) => Boolean(id)),
      ),
    ];
    const busIds = [
      ...new Set(
        notifications
          .map((n) => (n.bus_id ? String(n.bus_id) : null))
          .filter((id) => Boolean(id)),
      ),
    ];
    const subscriptionFilters = [
      ...(routeIds.length ? [{ route_id: { $in: routeIds } }] : []),
      ...(busIds.length ? [{ bus_id: { $in: busIds } }] : []),
    ];

    const [deletedUserNotifications, deletedUserSubscriptions, deletedNotifications] =
      await Promise.all([
        UserNotification.deleteMany({
          notification_id: { $in: foundNotificationIds },
        }),
        subscriptionFilters.length
          ? UserSubscription.deleteMany({ $or: subscriptionFilters })
          : Promise.resolve({ deletedCount: 0 }),
        Notification.deleteMany({ _id: { $in: foundNotificationIds } }),
      ]);

    return {
      requested_count: normalizedIds.length,
      deleted_notifications: deletedNotifications.deletedCount || 0,
      deleted_user_notifications: deletedUserNotifications.deletedCount || 0,
      deleted_user_subscriptions: deletedUserSubscriptions.deletedCount || 0,
      not_found_notification_ids: normalizedIds.filter(
        (id) => !foundNotificationIds.includes(id),
      ),
    };
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
        is_deleted: { $ne: true },
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

  // GET USER INBOX NOTIFICATIONS ==========================================
  async getInboxNotificationsByUserId(userId, options = {}) {
    if (!userId) {
      const error = new Error("user_id is required");
      error.statusCode = 400;
      throw error;
    }

    const unreadOnly = String(options.unreadOnly) === "true";
    const filter = { user_id: userId };
    if (unreadOnly) {
      filter.is_read = false;
    }

    const [inbox, totalCount, unreadCount] = await Promise.all([
      UserNotification.find(filter)
        .sort({ createdAt: -1 })
        .populate({
          path: "notification_id",
          populate: [
            { path: "sender_id", select: "f_name l_name" },
            { path: "bus_id", select: "bus_number plate_number" },
            { path: "route_id", select: "route_name route_code" },
            { path: "terminal_id", select: "terminal_name" },
          ],
        }),
      UserNotification.countDocuments({ user_id: userId }),
      UserNotification.countDocuments({ user_id: userId, is_read: false }),
    ]);

    return {
      inbox,
      counts: {
        total: totalCount,
        unread: unreadCount,
      },
    };
  },
};
